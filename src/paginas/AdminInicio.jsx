/**
 * Inicio del administrador: accesos en baldosas de color y los 3 reportes ACTIVOS más urgentes.
 */
import { useCallback, useEffect, useState } from 'react';
import Barra from '../components/Barra.jsx';
import Icono from '../components/Icono.jsx';
import { ListaReportes } from '../components/Reporte.jsx';
import { AvisoPush, Cargando, Vacio } from '../components/Varios.jsx';
import { api } from '../lib/api.js';
import { cerrarSesion, sincronizarRol } from '../lib/acciones.js';
import { useSesion } from '../lib/sesion.js';

export default function AdminInicio() {
  const usuario = useSesion()?.usuario;
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      const r = await api.reportes({ scope: 'activos', orden: 'prioridad', limit: 3 });
      setDatos({ reportes: r.data || [], total: r.meta?.total ?? 0 });
      setError('');
    } catch (e) {
      if (!e.sesionCerrada) setError(e.message);
    }
  }, []);

  useEffect(() => {
    cargar();
    sincronizarRol();
  }, [cargar]);

  let resumen = ' ';
  if (datos) {
    resumen = datos.total === 0
      ? 'Sin reportes activos'
      : `${datos.total} ${datos.total === 1 ? 'reporte activo' : 'reportes activos'} · mostrando los 3 más urgentes`;
  }

  return (
    <>
      <Barra
        titulo="Administración"
        acciones={[
          { icono: 'recargar', etiqueta: 'Actualizar', alTocar: cargar },
          { icono: 'salir', etiqueta: 'Cerrar sesión', alTocar: cerrarSesion },
        ]}
      />
      <main className="vista">
        <p className="saludo">Hola, {usuario?.nombre}</p>
        <p className="subtitulo" id="resumen">{resumen}</p>
        <AvisoPush />

        <div className="menu">
          <a className="baldosa b-azul" href="#/reportes?tab=0"><Icono nombre="lista" />Reportes activos</a>
          <a className="baldosa b-morado" href="#/reportes?tab=1"><Icono nombre="archivo" />Reportes cerrados</a>
          <a className="baldosa b-amarillo" href="#/usuarios"><Icono nombre="usuarios" />Usuarios y roles</a>
          <a className="baldosa b-coral" href="#/estadisticas"><Icono nombre="grafica" />Estadísticas</a>
        </div>

        <h2 className="seccion-titulo">Problemas activos más urgentes</h2>
        <div id="recientes">
          {error ? <Vacio>{error}</Vacio>
            : datos === null ? <Cargando />
              : datos.reportes.length ? <ListaReportes reportes={datos.reportes} />
                : <Vacio>No hay reportes activos. ¡Todo al día!</Vacio>}
        </div>
      </main>
    </>
  );
}