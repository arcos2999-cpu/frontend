/**
 * Formulario para publicar un anuncio (solo administrador). El autor y la fecha de publicación
 * los pone el servidor a partir de la sesión.
 */
import { useEffect, useRef, useState } from 'react';
import Barra from '../components/Barra.jsx';
import Icono from '../components/Icono.jsx';
import { api } from '../lib/api.js';
import { aviso } from '../lib/avisos.js';
import { useMontado } from '../lib/hooks.js';
import { comprimir } from '../lib/imagenes.js';
import { volver } from '../lib/router.js';

export default function NuevoAnuncio() {
  const [valores, setValores] = useState({ titulo: '', texto: '', lugar: '', fecha_evento: '' });
  const [errores, setErrores] = useState({});
  const [foto, setFoto] = useState(null); // {archivo: File, url: string}
  const [enviando, setEnviando] = useState(false);
  const archivoRef = useRef(null);
  const fotoRef = useRef(foto);
  fotoRef.current = foto;
  const montado = useMontado();

  useEffect(() => () => fotoRef.current && URL.revokeObjectURL(fotoRef.current.url), []);

  function cambiar(campo, valor) {
    setValores((v) => ({ ...v, [campo]: valor }));
    if (errores[campo]) setErrores((e) => ({ ...e, [campo]: '' }));
  }

  function elegirFoto(lista) {
    const archivo = [...lista][0];
    if (!archivo) return;
    if (foto) URL.revokeObjectURL(foto.url);
    setFoto({ archivo, url: URL.createObjectURL(archivo) });
  }

  function quitarFoto() {
    if (enviando || !foto) return;
    URL.revokeObjectURL(foto.url);
    setFoto(null);
  }

  async function enviar(e) {
    e.preventDefault();
    if (enviando) return;
    const titulo = valores.titulo.trim();
    const texto = valores.texto.trim();

    const errs = {};
    if (titulo.length < 3) errs.titulo = 'Escribe un título (mínimo 3 caracteres).';
    else if (texto.length < 5) errs.texto = 'Escribe el texto del anuncio (mínimo 5 caracteres).';
    setErrores(errs);
    if (Object.keys(errs).length) {
      document.getElementById(Object.keys(errs)[0])?.focus();
      return;
    }

    setEnviando(true);
    const datos = new FormData();
    datos.append('titulo', titulo);
    datos.append('texto', texto);
    if (valores.lugar.trim()) datos.append('lugar', valores.lugar.trim());
    if (valores.fecha_evento) datos.append('fecha_evento', valores.fecha_evento);
    if (foto) {
      const jpeg = await comprimir(foto.archivo);
      if (!jpeg) {
        setEnviando(false);
        aviso('No se pudo leer la imagen. Quítala e inténtalo de nuevo.');
        return;
      }
      datos.append('imagen', jpeg, 'anuncio.jpg');
    }

    try {
      await api.crearAnuncio(datos);
      if (!montado()) return;
      aviso('Anuncio publicado.');
      volver();
    } catch (err) {
      if (err.sesionCerrada || !montado()) return;
      setEnviando(false);
      setErrores(err.errores || {});
      aviso(err.message);
    }
  }

  const campo = (id) => ({
    id,
    name: id,
    value: valores[id],
    onChange: (e) => cambiar(id, e.target.value),
    'aria-invalid': errores[id] ? 'true' : 'false',
    'aria-describedby': `err-${id}`,
  });

  return (
    <>
      <Barra titulo="Nuevo anuncio" atras />
      <main className="vista">
        <form className="formulario" noValidate onSubmit={enviar}>
          <div className="campo">
            <label htmlFor="titulo">Título</label>
            <input className="entrada" maxLength={150} autoComplete="off" required {...campo('titulo')} />
            <span className="campo-error" id="err-titulo">{errores.titulo}</span>
          </div>
          <div className="campo">
            <label htmlFor="texto">Texto del anuncio</label>
            <textarea className="entrada" maxLength={3000} rows={6} required {...campo('texto')} />
            <span className="campo-error" id="err-texto">{errores.texto}</span>
          </div>
          <div className="campo">
            <label htmlFor="lugar">Lugar (opcional)</label>
            <input className="entrada" maxLength={200} autoComplete="off" {...campo('lugar')} />
            <span className="campo-error" id="err-lugar">{errores.lugar}</span>
          </div>
          <div className="campo">
            <label htmlFor="fecha_evento">Fecha y hora del evento (opcional)</label>
            <input className="entrada" type="datetime-local" {...campo('fecha_evento')} />
            <span className="campo-error" id="err-fecha_evento">{errores.fecha_evento}</span>
          </div>

          <div className="campo">
            <span className="campo-etiqueta">Imagen (opcional)</span>
            {foto && (
              <>
                <div className="fotos fotos-nuevas">
                  <button type="button" className="foto-btn" aria-label="Quitar imagen" onClick={quitarFoto}>
                    <img src={foto.url} alt="" />
                    <span className="foto-quitar"><Icono nombre="cerrar" /></span>
                  </button>
                </div>
                <span className="campo-ayuda">Toca la imagen para quitarla.</span>
              </>
            )}
            <div className="botonera-fila">
              <button type="button" className="btn btn-borde" disabled={enviando} onClick={() => archivoRef.current?.click()}>
                <Icono nombre="foto" />{foto ? 'Cambiar imagen' : 'Agregar imagen'}
              </button>
            </div>
            <input ref={archivoRef} type="file" accept="image/jpeg,image/png,image/webp,image/*" hidden
              onChange={(e) => {
                elegirFoto(e.target.files);
                e.target.value = '';
              }} />
          </div>

          <button type="submit" className="btn btn-lleno btn-ancho" disabled={enviando}>
            {enviando ? <><span className="spinner chico" aria-hidden="true" />Publicando…</> : 'Publicar anuncio'}
          </button>
        </form>
      </main>
    </>
  );
}
