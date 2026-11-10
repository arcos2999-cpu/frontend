/** Diálogos modales con el elemento <dialog> del navegador. Se abren al montarse. */
import { useEffect, useRef } from 'react';
import Icono from './Icono.jsx';

/**
 * @param {{titulo?: string, children?: any, botones?: any, alCerrar: Function}} props
 *        alCerrar se llama al cerrar con Escape o tocando fuera del diálogo.
 */
export function Dialogo({ titulo, children, botones, alCerrar }) {
  const ref = useRef(null);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => {
      if (d?.open) d.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className="dialogo"
      onCancel={(e) => {
        e.preventDefault();
        alCerrar();
      }}
      onClick={(e) => {
        if (e.target === ref.current) alCerrar();
      }}
    >
      <div className="dialogo-cuerpo">
        {titulo && <h2>{titulo}</h2>}
        {children}
      </div>
      {botones && <div className="dialogo-botones">{botones}</div>}
    </dialog>
  );
}

/** Visor de una foto a pantalla completa. */
export function Visor({ url, alCerrar }) {
  const ref = useRef(null);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => {
      if (d?.open) d.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className="visor"
      onCancel={(e) => {
        e.preventDefault();
        alCerrar();
      }}
      onClick={(e) => {
        if (e.target === ref.current || e.target.tagName === 'IMG') alCerrar();
      }}
    >
      <img src={url} alt="Foto del reporte" />
      <button type="button" className="icono-btn" aria-label="Cerrar" onClick={alCerrar}>
        <Icono nombre="cerrar" />
      </button>
      <a href={url} target="_blank" rel="noopener noreferrer">Abrir original</a>
    </dialog>
  );
}
