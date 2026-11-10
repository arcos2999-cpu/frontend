/** Inicio de alumnos, maestros y personal: accesos en baldosas de color y 3 reportes recientes. */
import { useCallback, useEffect, useState } from 'react';
import Barra from '../components/Barra.jsx';
import Icono from '../components/Icono.jsx';
import { ListaReportes } from '../components/Reporte.jsx';
import { AvisoPush, Cargando, Vacio } from '../components/Varios.jsx';
import { api } from '../lib/api.js';
import { cerrarSesion, sincronizarRol } from '../lib/acciones.js';
import { rolLabel } from '../lib/formato.js';
import { useSesion } from '../lib/sesion.js';

export default function Inicio() {
  const usuario = useSesion()?.usuario;
  const [reportes, setReportes] = useState(null);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      const r = await api.reportes({ scope: 'mios', limit: 3 });
      setReportes(r.data || []);
      setError('');
    } catch (e) {
      if (!e.sesionCerrada) setError(e.message);
    }
  }, []);

  useEffect(() => {
    cargar();
    sincronizarRol();
  }, [cargar]);

  return (
    <>
      <Barra
        titulo="Buzón BUAP SJC"
        acciones={[
          { icono: 'recargar', etiqueta: 'Actualizar', alTocar: cargar },
          { icono: 'salir', etiqueta: 'Cerrar sesión', alTocar: cerrarSesion },
        ]}
      />
      <main className="vista">
        <p className="saludo">Hola, {usuario?.nombre}</p>
        <p className="subtitulo">{rolLabel(usuario?.rol)}</p>
        <AvisoPush />

        <div className="menu">
          <a className="baldosa b-azul" href="#/reportes?tab=0"><Icono nombre="lista" />Mis reportes</a>
          <a className="baldosa b-morado" href="#/reportes?tab=1"><Icono nombre="comunidad" />Reportes de la comunidad</a>
        </div>

        <h2 className="seccion-titulo">Tus 3 reportes más recientes</h2>
        <div id="recientes">
          {error ? <Vacio>{error}</Vacio>
            : reportes === null ? <Cargando />
              : reportes.length ? <ListaReportes reportes={reportes} />
                : <Vacio>Aún no has enviado ningún reporte.<br />Toca “Nuevo reporte” para empezar.</Vacio>}
        </div>
        <a className="fab" href="#/nuevo"><Icono nombre="mas" />Nuevo reporte</a>
      </main>
    </>
  );
}
