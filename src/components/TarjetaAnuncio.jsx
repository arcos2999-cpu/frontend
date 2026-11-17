/**
 * Tarjeta de un anuncio del muro con sus acciones: me gusta, comentar, guardar y favorito.
 * Las marcas se guardan en el servidor, ligadas al usuario con sesión (no en el teléfono).
 * El cambio se ve al instante y se corrige si el servidor responde con un error.
 */
import { useState } from 'react';
import Icono from './Icono.jsx';
import { api } from '../lib/api.js';
import { aviso } from '../lib/avisos.js';
import { fecha, tiempoRelativo, urlImagen } from '../lib/formato.js';

const ACCIONES = [
  { tipo: 'like', campo: 'yo_like', etiqueta: 'Me gusta', icono: 'corazon', activo: 'corazonLleno', clase: 'a-like' },
  { tipo: 'guardar', campo: 'yo_guardado', etiqueta: 'Guardar', icono: 'guardar', activo: 'guardarLleno', clase: 'a-guardar' },
  { tipo: 'favorito', campo: 'yo_favorito', etiqueta: 'Favorito', icono: 'estrella', activo: 'estrellaLlena', clase: 'a-fav' },
];

function Reacciones({ a, alCambiar }) {
  const [ocupado, setOcupado] = useState(null);

  async function tocar(x) {
    if (ocupado) return;
    setOcupado(x.tipo);
    const antes = a[x.campo];
    const delta = x.tipo === 'like' ? { likes: Math.max(0, a.likes + (antes ? -1 : 1)) } : {};
    alCambiar({ [x.campo]: !antes, ...delta });
    try {
      const r = await api.reaccionar(a.id, x.tipo);
      alCambiar({ [x.campo]: r.activo, ...(x.tipo === 'like' ? { likes: r.total } : {}) });
    } catch (e) {
      alCambiar({ [x.campo]: antes, ...(x.tipo === 'like' ? { likes: a.likes } : {}) });
      if (!e.sesionCerrada) aviso(e.message);
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div className="anuncio-acciones">
      {ACCIONES.slice(0, 1).map((x) => (
        <button key={x.tipo} type="button" className={`anuncio-accion ${x.clase}${a[x.campo] ? ' activa' : ''}`}
          aria-pressed={a[x.campo]} aria-label={x.etiqueta} onClick={() => tocar(x)}>
          <Icono nombre={a[x.campo] ? x.activo : x.icono} />
          <span>{a.likes}</span>
        </button>
      ))}
      <a className="anuncio-accion" href={`#/anuncio/${a.id}`} aria-label="Comentarios">
        <Icono nombre="comentario" />
        <span>{a.comentarios}</span>
      </a>
      <span className="anuncio-espacio" />
      {ACCIONES.slice(1).map((x) => (
        <button key={x.tipo} type="button" className={`anuncio-accion ${x.clase}${a[x.campo] ? ' activa' : ''}`}
          aria-pressed={a[x.campo]} aria-label={x.etiqueta} onClick={() => tocar(x)}>
          <Icono nombre={a[x.campo] ? x.activo : x.icono} />
        </button>
      ))}
    </div>
  );
}

/**
 * @param {{a: object, alCambiar: (cambios: object) => void, detalle?: boolean, ultimo?: boolean}} props
 *   detalle: muestra el texto completo y no se abre al tocarla; ultimo: marca el tope de la pila de likes.
 */
export default function TarjetaAnuncio({ a, alCambiar, detalle = false, ultimo = false }) {
  const inicial = (a.autor || 'A').trim().charAt(0).toUpperCase();
  const cuerpo = (
    <>
      {a.imagen && <img className="anuncio-imagen" src={urlImagen(a.imagen)} alt="" loading="lazy" decoding="async" />}
      <h3 className="anuncio-titulo">{a.titulo}</h3>
      {(a.fecha_evento || a.lugar) && (
        <ul className="anuncio-datos">
          {a.fecha_evento && <li><Icono nombre="evento" />{fecha(a.fecha_evento)}</li>}
          {a.lugar && <li><Icono nombre="lugar" />{a.lugar}</li>}
        </ul>
      )}
      <p className={`anuncio-texto${detalle ? ' completo' : ''}`}>{a.texto}</p>
    </>
  );

  return (
    <article className={`tarjeta anuncio${ultimo ? ' tope' : ''}`}>
      <header className="anuncio-cabeza">
        <span className="anuncio-avatar" aria-hidden="true">{inicial}</span>
        <div>
          <div className="anuncio-autor">{a.autor}</div>
          <div className="anuncio-tiempo">{tiempoRelativo(a.fecha_hora)}</div>
        </div>
        {ultimo && <span className="anuncio-etiqueta">Último like</span>}
      </header>
      {detalle ? cuerpo : <a className="anuncio-enlace" href={`#/anuncio/${a.id}`}>{cuerpo}</a>}
      <Reacciones a={a} alCambiar={alCambiar} />
    </article>
  );
}
