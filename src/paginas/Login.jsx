/** Inicio de sesión con matrícula y contraseña. */
import { useState } from 'react';
import { api } from '../lib/api.js';
import { aviso } from '../lib/avisos.js';
import { push } from '../lib/push.js';
import { sesion } from '../lib/sesion.js';
import { navegar } from '../lib/router.js';
import { useMontado } from '../lib/hooks.js';

export default function Login() {
  const [matricula, setMatricula] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const montado = useMontado();

  async function entrar(e) {
    e.preventDefault();
    setError('');
    if (!matricula.trim() || !password) {
      setError('Escribe tu matrícula y contraseña.');
      return;
    }
    setEnviando(true);
    try {
      const r = await api.login({ matricula: matricula.trim(), password });
      sesion.guardar(r.token, r.usuario);
      push.sincronizar();
      navegar('inicio', true);
    } catch (err) {
      if (!montado()) return;
      setError(err.message);
      if (err.status === 0) aviso(err.message);
      setEnviando(false);
    }
  }

  return (
    <main className="vista">
      <section className="acceso formulario">
        <img className="acceso-logo" src="icons/icon-192.png" alt="" />
        <h2>Buzón BUAP SJC</h2>
        <p className="subtitulo">Quejas y sugerencias de la comunidad</p>
        <form className="tarjeta" noValidate onSubmit={entrar}>
          <div className="campo">
            <label htmlFor="matricula">Matrícula</label>
            <input className="entrada" id="matricula" type="text" autoComplete="username" inputMode="numeric"
              autoCapitalize="off" spellCheck={false} value={matricula}
              onChange={(e) => setMatricula(e.target.value)} required />
          </div>
          <div className="campo">
            <label htmlFor="password">Contraseña</label>
            <input className="entrada" id="password" type="password" autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <p className="campo-error" id="error" role="alert">{error}</p>
          <button className="btn btn-lleno btn-ancho" type="submit" disabled={enviando}>
            {enviando ? 'Entrando…' : 'Iniciar sesión'}
          </button>
          <div className="botonera">
            <a className="btn btn-texto" href="#/registro">¿No tienes cuenta? Regístrate</a>
          </div>
        </form>
      </section>
    </main>
  );
}
