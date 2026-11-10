/** Barra superior: título, botón de regresar y acciones (más "Instalar app" cuando se puede). */
import { useEffect } from 'react';
import Icono from './Icono.jsx';
import { volver } from '../lib/router.js';
import { instalar, useInstalable } from '../lib/pwa.js';

/**
 * @param {{titulo: string, atras?: boolean,
 *          acciones?: Array<{icono: string, etiqueta: string, alTocar: Function}>}} props
 */
export default function Barra({ titulo, atras = false, acciones = [] }) {
  const instalable = useInstalable();
  const todas = instalable
    ? [{ icono: 'instalar', etiqueta: 'Instalar app', alTocar: instalar }, ...acciones]
    : acciones;

  useEffect(() => {
    document.title = titulo === 'Buzón BUAP SJC' ? titulo : `${titulo} · Buzón BUAP SJC`;
  }, [titulo]);

  return (
    <header className="barra">
      {atras && (
        <button className="icono-btn" id="barra-atras" type="button" aria-label="Regresar" onClick={volver}>
          <Icono nombre="atras" />
        </button>
      )}
      <h1 className="barra-titulo" id="barra-titulo">{titulo}</h1>
      <div className="barra-acciones">
        {todas.map((a) => (
          <button key={a.etiqueta} className="icono-btn" type="button" title={a.etiqueta}
            aria-label={a.etiqueta} onClick={a.alTocar}>
            <Icono nombre={a.icono} />
          </button>
        ))}
      </div>
    </header>
  );
}
