/** Registro de cuenta nueva. El rol siempre empieza como alumno (lo decide el servidor). */
import { useState } from 'react';
import { api } from '../lib/api.js';
import { sesion } from '../lib/sesion.js';
import { navegar } from '../lib/router.js';
import { useMontado } from '../lib/hooks.js';

const CARRERAS = ['ISTII', 'IAA', 'IPGI'];

const CAMPOS = [
  { id: 'nombre', etiqueta: 'Nombre completo', tipo: 'text', auto: 'name' },
  { id: 'matricula', etiqueta: 'Matrícula', tipo: 'text', auto: 'username', numerico: true },
  { id: 'carrera', etiqueta: 'Carrera', lista: CARRERAS },
  { id: 'password', etiqueta: 'Contraseña (mínimo 8 caracteres)', tipo: 'password', auto: 'new-password' },
  { id: 'password2', etiqueta: 'Repite la contraseña', tipo: 'password', auto: 'new-password' },
];

export default function Registro() {
  const [valores, setValores] = useState({ nombre: '', matricula: '', carrera: '', password: '', password2: '' });
  const [errores, setErrores] = useState({});
  const [general, setGeneral] = useState('');
  const [enviando, setEnviando] = useState(false);
  const montado = useMontado();

  function cambiar(campo, valor) {
    setValores((v) => ({ ...v, [campo]: valor }));
    if (errores[campo]) setErrores((e) => ({ ...e, [campo]: '' }));
  }

  async function crear(e) {
    e.preventDefault();
    setGeneral('');
    const d = {
      nombre: valores.nombre.trim(),
      matricula: valores.matricula.replace(/[\s-]+/g, ''),
      carrera: valores.carrera,
      password: valores.password,
    };
    const errs = {};
    if (d.nombre.length < 3) errs.nombre = 'Escribe tu nombre completo (mínimo 3 caracteres).';
    if (!/^[0-9]{6,12}$/.test(d.matricula)) errs.matricula = 'Escribe tu matrícula (solo números).';
    if (!CARRERAS.includes(d.carrera)) errs.carrera = 'Elige tu carrera.';
    if (d.password.length < 8) errs.password = 'La contraseña debe tener al menos 8 caracteres.';
    if (d.password !== valores.password2) errs.password2 = 'Las contraseñas no coinciden.';
    setErrores(errs);
    if (Object.keys(errs).length) {
      document.getElementById(Object.keys(errs)[0])?.focus();
      return;
    }

    setEnviando(true);
    try {
      const r = await api.registro(d);
      sesion.guardar(r.token, r.usuario);
      navegar('inicio', true);
    } catch (err) {
      if (!montado()) return;
      const porCampo = err.errores || {};
      setErrores(porCampo);
      // Si el mensaje general ya aparece junto a un campo, no se repite.
      if (!Object.entries(porCampo).some(([c, m]) => c in valores && m === err.message)) setGeneral(err.message);
      setEnviando(false);
    }
  }

  return (
    <main className="vista">
      <section className="acceso formulario">
        <img className="acceso-logo" src="icons/icon-192.png" alt="" />
        <h2>Crear cuenta</h2>
        <p className="subtitulo">Buzón BUAP SJC</p>
        <form className="tarjeta" noValidate onSubmit={crear}>
          <p className="nota">
            Tu cuenta se crea como Alumno. Si eres maestro o personal, la administración cambiará tu rol después.
          </p>
          {CAMPOS.map((c) => (
            <div className="campo" key={c.id}>
              <label htmlFor={c.id}>{c.etiqueta}</label>
              {c.lista ? (
                <select className="entrada" id={c.id} name={c.id} required
                  aria-invalid={errores[c.id] ? 'true' : 'false'} aria-describedby={`err-${c.id}`}
                  value={valores[c.id]} onChange={(e) => cambiar(c.id, e.target.value)}>
                  <option value="" disabled>Elige tu carrera</option>
                  {c.lista.map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              ) : (
                <input className="entrada" id={c.id} name={c.id} type={c.tipo} autoComplete={c.auto}
                  inputMode={c.numerico ? 'numeric' : undefined} spellCheck={c.numerico ? false : undefined} required
                  aria-invalid={errores[c.id] ? 'true' : 'false'} aria-describedby={`err-${c.id}`}
                  value={valores[c.id]} onChange={(e) => cambiar(c.id, e.target.value)} />
              )}
              <span className="campo-error" id={`err-${c.id}`}>{errores[c.id]}</span>
            </div>
          ))}
          <p className="campo-error" id="error" role="alert">{general}</p>
          <button className="btn btn-lleno btn-ancho" type="submit" disabled={enviando}>
            {enviando ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
          <div className="botonera">
            <a className="btn btn-texto" href="#/login">¿Ya tienes cuenta? Inicia sesión</a>
          </div>
        </form>
      </section>
    </main>
  );
}
