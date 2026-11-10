/** Piezas para mostrar reportes: chip de estado, prioridad y tarjeta para las listas. */
import { colorEstado, meta, plural, prioridadLabel, urlImagen } from '../lib/formato.js';

export function ChipEstado({ clave, etiqueta }) {
  return <span className="chip" style={{ background: colorEstado(clave) }}>{etiqueta}</span>;
}

export function Prioridad({ valor }) {
  const clase = valor === 'urgente' || valor === 'alta' ? ` ${valor}` : '';
  return <span className={`prioridad${clase}`}>Prioridad: {prioridadLabel(valor)}</span>;
}

export function TarjetaReporte({ r }) {
  return (
    <a className="tarjeta reporte" href={`#/reporte/${Number(r.id)}`}>
      {r.imagenes?.length > 0 && (
        <img className="reporte-foto" src={urlImagen(r.imagenes[0])} alt="" loading="lazy" decoding="async" />
      )}
      <div className="reporte-cuerpo">
        <div className="reporte-cabeza">
          <h3 className="reporte-titulo">{r.nombre}</h3>
          <ChipEstado clave={r.estado_clave} etiqueta={r.estado} />
        </div>
        <p className="reporte-linea">Ubicación: {r.ubicacion}</p>
        <p className="reporte-linea">{meta(r)}</p>
        <div className="reporte-pie">
          <Prioridad valor={r.prioridad} />
          {r.apoyos > 0 && <span className="apoyos">{plural(r.apoyos, 'apoyo', 'apoyos')}</span>}
        </div>
      </div>
    </a>
  );
}

export function ListaReportes({ reportes }) {
  return (
    <div className="lista">
      {reportes.map((r) => <TarjetaReporte key={r.id} r={r} />)}
    </div>
  );
}
