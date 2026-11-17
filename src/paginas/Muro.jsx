/**
 * Muro institucional (pantalla principal): anuncios que publica la administración.
 *  - Pestañas: Todos · Likes (pila: lo último arriba) · Guardados · Favoritos.
 *  - Cada usuario ve SUS marcas; se guardan en el servidor ligadas a su sesión.
 *  - Solo el administrador ve el botón para publicar.
 */
import { useEffect, useState } from 'react';
import Barra from '../components/Barra.jsx';
import Icono from '../components/Icono.jsx';
import NavInferior from '../components/NavInferior.jsx';
import TarjetaAnuncio from '../components/TarjetaAnuncio.jsx';
import { Centinela, Vacio } from '../components/Varios.jsx';
import { api } from '../lib/api.js';
import { cerrarSesion, sincronizarRol } from '../lib/acciones.js';
import { useListaPaginada, useRetrasado } from '../lib/hooks.js';
import { guardarParams, navegar } from '../lib/router.js';
import { sesion } from '../lib/sesion.js';

const POR_PAGINA = 10;
const PESTANAS = [
  { titulo: 'Todos', scope: 'todos', vacio: 'Todavía no hay anuncios.' },
  { titulo: 'Likes', scope: 'likes', vacio: 'Aún no das like a ningún anuncio.' },
  { titulo: 'Guardados', scope: 'guardados', vacio: 'Aún no guardas ningún anuncio.' },
  { titulo: 'Favoritos', scope: 'favoritos', vacio: 'Aún no tienes favoritos. Toca la estrella en un anuncio.' },
];

export default function Muro({ params }) {
  const [tab, setTab] = useState(() => Math.max(0, Math.min(PESTANAS.length - 1, Number(params.get('tab')) || 0)));
  const [texto, setTexto] = useState(() => params.get('q') || '');
  const consulta = useRetrasado(texto.trim());
  const p = PESTANAS[tab];

  const lista = useListaPaginada(
    (pagina) => api.anuncios({ scope: p.scope, q: consulta, per_page: POR_PAGINA, page: pagina }),
    `${tab}|${consulta}`,
  );

  useEffect(() => {
    sincronizarRol();
  }, []);

  useEffect(() => {
    const q = new URLSearchParams();
    if (tab) q.set('tab', String(tab));
    if (consulta) q.set('q', consulta);
    guardarParams(q);
  }, [tab, consulta]);

  return (
    <>
      <Barra
        titulo="Buzón BUAP SJC"
        acciones={[
          { icono: 'historial', etiqueta: 'Mi actividad', alTocar: () => navegar('actividad') },
          { icono: 'recargar', etiqueta: 'Actualizar', alTocar: lista.recargar },
          { icono: 'salir', etiqueta: 'Cerrar sesión', alTocar: cerrarSesion },
        ]}
      />
      <main className="vista con-nav">
        <div className="pestanas" role="tablist">
          {PESTANAS.map((x, i) => (
            <button key={x.scope} type="button" className="pestana" role="tab" aria-selected={i === tab}
              onClick={() => setTab(i)}>
              {x.titulo}
            </button>
          ))}
        </div>
        <div className="filtros">
          <input className="entrada entrada-busqueda" type="search" placeholder="Buscar anuncios"
            aria-label="Buscar anuncios" autoComplete="off" value={texto} onChange={(e) => setTexto(e.target.value)} />
        </div>
        {p.scope === 'likes' && lista.items.length > 0 && (
          <p className="nota">Tu pila de likes: lo último que marcaste aparece arriba.</p>
        )}

        <div className="lista" aria-live="polite">
          {lista.items.map((a, i) => (
            <TarjetaAnuncio key={a.id} a={a} ultimo={p.scope === 'likes' && i === 0}
              alCambiar={(c) => lista.actualizarItem({ id: a.id, ...c })} />
          ))}
        </div>
        {lista.error && <Vacio>{lista.error}</Vacio>}
        {!lista.error && !lista.cargando && lista.items.length === 0 && (
          <Vacio>{consulta ? 'No se encontraron anuncios con esa búsqueda.' : p.vacio}</Vacio>
        )}
        <Centinela alVerse={lista.cargarMas} cargando={lista.cargando} />

        {sesion.esAdmin() && (
          <a className="fab fab-nav" href="#/anuncios/nuevo"><Icono nombre="mas" />Nuevo anuncio</a>
        )}
      </main>
      <NavInferior activo="anuncios" />
    </>
  );
}
