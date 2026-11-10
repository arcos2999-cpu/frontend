/** Componentes pequeños: indicador de carga, carga continua y tarjeta para activar avisos push. */
import { useEffect, useRef, useState } from 'react';
import Icono from './Icono.jsx';
import { aviso } from '../lib/avisos.js';
import { push } from '../lib/push.js';

export function Cargando({ texto = 'Cargando…' }) {
  return (
    <div className="cargando-pantalla" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <p>{texto}</p>
    </div>
  );
}

export function Vacio({ children }) {
  return <p className="vacio">{children}</p>;
}

/** Llama a alVerse cuando el final de la lista se acerca a la pantalla (carga la siguiente página). */
export function Centinela({ alVerse, cargando }) {
  const ref = useRef(null);
  const obsRef = useRef(null);
  const alVerseRef = useRef(alVerse);
  alVerseRef.current = alVerse;

  useEffect(() => {
    const obs = new IntersectionObserver((entradas) => {
      if (entradas.some((e) => e.isIntersecting)) alVerseRef.current();
    }, { rootMargin: '400px 0px' });
    obs.observe(ref.current);
    obsRef.current = obs;
    return () => obs.disconnect();
  }, []);

  // Al terminar de cargar se vuelve a revisar: si la lista aún no llena la pantalla, pide más.
  useEffect(() => {
    if (cargando || !obsRef.current || !ref.current) return;
    obsRef.current.unobserve(ref.current);
    obsRef.current.observe(ref.current);
  }, [cargando]);

  return (
    <div ref={ref} className="cargando-lista">
      {cargando && <div className="spinner chico" aria-label="Cargando" />}
    </div>
  );
}

/** Invita a activar los avisos push (solo si Firebase está configurado y aún no se ha decidido). */
export function AvisoPush() {
  const [visible, setVisible] = useState(() => push.disponible() && push.permiso() === 'default');
  if (!visible) return null;

  async function activar() {
    const ok = await push.activar().catch(() => false);
    setVisible(false);
    aviso(ok ? 'Avisos activados.' : 'No se activaron los avisos. Puedes permitirlos desde la configuración del navegador.');
  }

  return (
    <div className="tarjeta tarjeta-aviso">
      <Icono nombre="campana" />
      <p>Activa los avisos para saber cuándo cambia el estado de tus reportes.</p>
      <button type="button" className="btn btn-lleno" onClick={activar}>Activar</button>
    </div>
  );
}
