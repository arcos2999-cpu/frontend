/**
 * Lista completa de reportes con búsqueda, filtro por estado y carga continua al bajar.
 *  - Alumno / maestro / personal: pestañas "Mis reportes" y "Comunidad".
 *  - Admin: pestañas "Activos" (ordenados por prioridad) y "Cerrados".
 * Los filtros quedan en la dirección (#/reportes?tab=1&q=...), así "atrás" los conserva.
 */
import { useEffect, useState } from 'react';
import Barra from '../components/Barra.jsx';
import { ListaReportes } from '../components/Reporte.jsx';
import { Centinela, Vacio } from '../components/Varios.jsx';
import { api } from '../lib/api.js';
import { useListaPaginada, useRetrasado } from '../lib/hooks.js';
import { guardarParams } from '../lib/router.js';
import { sesion } from '../lib/sesion.js';

const POR_PAGINA = 20;

const PESTANAS_ADMIN = [
  { titulo: 'Activos', scope: 'activos', orden: 'prioridad' },
  { titulo: 'Cerrados', scope: 'cerrados', orden: 'reciente' },
];
const PESTANAS_USUARIO = [
  { titulo: 'Mis reportes', scope: 'mios', orden: 'reciente' },
  { titulo: 'Comunidad', scope: 'comunidad', orden: 'reciente' },
];

export default function Reportes({ params }) {
  const pestanas = sesion.esAdmin() ? PESTANAS_ADMIN : PESTANAS_USUARIO;
  const [tab, setTab] = useState(() => Math.max(0, Math.min(pestanas.length - 1, Number(params.get('tab')) || 0)));
  const [texto, setTexto] = useState(() => params.get('q') || '');
  const [estado, setEstado] = useState(() => Number(params.get('estado')) || 0);
  const [estados, setEstados] = useState([]);
  const consulta = useRetrasado(texto.trim());

  const p = pestanas[tab];
  const lista = useListaPaginada(
    (pagina) => api.reportes({ scope: p.scope, orden: p.orden, per_page: POR_PAGINA, page: pagina, q: consulta, estado }),
    `${tab}|${consulta}|${estado}`,
  );

  // Catálogo de estados para el filtro (sin él se puede listar igual).
  useEffect(() => {
    api.catalogos().then((c) => setEstados(c.estados || [])).catch(() => {});
  }, []);

  // Los filtros se guardan en la dirección.
  useEffect(() => {
    const q = new URLSearchParams();
    q.set('tab', String(tab));
    if (consulta) q.set('q', consulta);
    if (estado) q.set('estado', String(estado));
    guardarParams(q);
  }, [tab, consulta, estado]);

  // Solo los estados que tienen sentido en la pestaña actual.
  const opciones = estados.filter((e) => (p.scope === 'cerrados' ? e.es_final : p.scope === 'activos' ? !e.es_final : true));

  function cambiarPestana(i) {
    if (i === tab) return;
    setTab(i);
    setEstado(0);
  }

  function textoVacio() {
    if (consulta || estado) return 'No se encontraron reportes con esos filtros.';
    if (p.scope === 'mios') return 'Aún no has enviado ningún reporte.';
    if (p.scope === 'activos') return 'No hay reportes activos. ¡Todo al día!';
    if (p.scope === 'cerrados') return 'Todavía no hay reportes cerrados.';
    return 'Todavía no hay reportes.';
  }

  return (
    <>
      <Barra titulo="Reportes" atras acciones={[{ icono: 'recargar', etiqueta: 'Actualizar', alTocar: lista.recargar }]} />
      <main className="vista">
        <div className="pestanas" role="tablist">
          {pestanas.map((x, i) => (
            <button key={x.scope} type="button" className="pestana" role="tab" aria-selected={i === tab}
              onClick={() => cambiarPestana(i)}>
              {x.titulo}
            </button>
          ))}
        </div>
        <div className="filtros">
          <input className="entrada entrada-busqueda" id="buscar" type="search" placeholder="Buscar"
            aria-label="Buscar reportes" autoComplete="off" value={texto} onChange={(e) => setTexto(e.target.value)} />
          <select className="entrada" id="estado" aria-label="Filtrar por estado" value={estado}
            onChange={(e) => setEstado(Number(e.target.value) || 0)}>
            <option value={0}>Todos los estados</option>
            {opciones.map((e) => <option key={e.id} value={e.id}>{e.etiqueta}</option>)}
          </select>
        </div>

        <div id="lista" aria-live="polite">
          <ListaReportes reportes={lista.items} />
        </div>
        {lista.error && <Vacio>{lista.error}</Vacio>}
        {!lista.error && !lista.cargando && lista.items.length === 0 && <Vacio>{textoVacio()}</Vacio>}
        <Centinela alVerse={lista.cargarMas} cargando={lista.cargando} />
      </main>
    </>
  );
}
