/** Resumen para la administración: totales, por estado, por categoría y lugares con más reportes. */
import { useCallback, useEffect, useState } from 'react';
import Barra from '../components/Barra.jsx';
import { Cargando, Vacio } from '../components/Varios.jsx';
import { api } from '../lib/api.js';

export default function Estadisticas() {
  const [e, setE] = useState(null);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      setE(await api.estadisticas());
      setError('');
    } catch (err) {
      if (!err.sesionCerrada) setError(err.message);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  let contenido;
  if (error) {
    contenido = <Vacio>{error}</Vacio>;
  } else if (!e) {
    contenido = <Cargando />;
  } else {
    const total = e.total || 0;
    const tiempo = e.horas_promedio_resolucion == null ? 'sin datos todavía' : formatoHoras(e.horas_promedio_resolucion);
    contenido = (
      <>
        <h2 className="seccion-titulo" style={{ marginTop: 4 }}>Resumen</h2>
        <div className="cifras">
          <Cifra numero={total} texto="En total" />
          <Cifra numero={e.activos || 0} texto="Activos" />
          <Cifra numero={e.cerrados || 0} texto="Cerrados" />
        </div>
        <p className="texto-sec">Tiempo promedio de resolución: <strong>{tiempo}</strong></p>

        <h2 className="seccion-titulo">Por estado</h2>
        <Grupo filas={(e.por_estado || []).map((x) => ({ nombre: x.etiqueta, total: x.total }))} total={total} />

        <h2 className="seccion-titulo">Por categoría</h2>
        <Grupo filas={e.por_categoria} total={total} />

        <h2 className="seccion-titulo">Lugares con más reportes</h2>
        <Grupo filas={e.ubicaciones_con_mas_reportes} total={total} />
      </>
    );
  }

  return (
    <>
      <Barra titulo="Estadísticas" atras acciones={[{ icono: 'recargar', etiqueta: 'Actualizar', alTocar: cargar }]} />
      <main className="vista">{contenido}</main>
    </>
  );
}

function Cifra({ numero, texto }) {
  return (
    <div className="tarjeta cifra">
      <span className="cifra-num">{numero}</span>
      <span className="cifra-txt">{texto}</span>
    </div>
  );
}

function Grupo({ filas, total }) {
  if (!filas || !filas.length) {
    return <div className="tarjeta"><p className="texto-sec" style={{ margin: 0 }}>Sin datos todavía.</p></div>;
  }
  return (
    <div className="tarjeta">
      {filas.map((f) => {
        const pct = total > 0 ? Math.round((f.total / total) * 100) : 0;
        return (
          <div className="fila-est" key={f.nombre}>
            <div className="fila-est-linea"><span>{f.nombre}</span><span>{f.total}</span></div>
            <div className="barra-prog" role="img" aria-label={`${pct}% del total`}><i style={{ width: `${pct}%` }} /></div>
          </div>
        );
      })}
    </div>
  );
}

function formatoHoras(horas) {
  return horas < 48 ? `${horas.toFixed(1)} horas` : `${(horas / 24).toFixed(1)} días`;
}
