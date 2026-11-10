/** Avisos breves en la parte inferior y franja de "Sin conexión". */
import { quitarAviso, useAvisos } from '../lib/avisos.js';
import { useEnLinea } from '../lib/pwa.js';

export function Avisos() {
  const avisos = useAvisos();
  return (
    <div className="avisos" role="status" aria-live="polite">
      {avisos.map((a) => (
        <div className="aviso" key={a.id}>
          <span>{a.texto}</span>
          {a.accion && (
            <button
              type="button"
              onClick={() => {
                quitarAviso(a.id);
                a.alTocar?.();
              }}
            >
              {a.accion}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export function SinConexion() {
  const enLinea = useEnLinea();
  if (enLinea) return null;
  return <div className="sin-conexion">Sin conexión a internet</div>;
}
