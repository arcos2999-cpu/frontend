/**
 * "Mi actividad": historial del usuario con sesión (likes, guardados, favoritos y comentarios).
 * Es una pila: la acción más reciente aparece arriba.
 */
import Barra from '../components/Barra.jsx';
import { Centinela, Vacio } from '../components/Varios.jsx';
import { api } from '../lib/api.js';
import { useListaPaginada } from '../lib/hooks.js';
import { tiempoRelativo } from '../lib/formato.js';

const ETIQUETAS = {
  like: ['Me gusta', 'Quitaste tu me gusta'],
  guardar: ['Guardado', 'Quitaste de guardados'],
  favorito: ['Favorito', 'Quitaste de favoritos'],
  comentario: ['Comentario', 'Comentario'],
};

export default function Actividad() {
  const lista = useListaPaginada((pagina) => api.actividad({ per_page: 20, page: pagina }), 'actividad');

  return (
    <>
      <Barra titulo="Mi actividad" atras acciones={[{ icono: 'recargar', etiqueta: 'Actualizar', alTocar: lista.recargar }]} />
      <main className="vista">
        <p className="nota">Tus últimas acciones en el muro. Lo más reciente aparece arriba.</p>
        <div className="lista" aria-live="polite">
          {lista.items.map((a, i) => {
            const [activo, quitado] = ETIQUETAS[a.tipo] || [a.tipo, a.tipo];
            const contenido = (
              <>
                <span className={`actividad-tag tag-${a.tipo}${a.quitar ? ' quitado' : ''}`}>{a.quitar ? quitado : activo}</span>
                <span className="actividad-titulo">{a.titulo}</span>
                <span className="actividad-tiempo">{i === 0 ? 'Más reciente · ' : ''}{tiempoRelativo(a.fecha_hora)}</span>
              </>
            );
            return a.id_anuncio
              ? <a key={a.id} className="tarjeta actividad" href={`#/anuncio/${a.id_anuncio}`}>{contenido}</a>
              : <div key={a.id} className="tarjeta actividad">{contenido}</div>;
          })}
        </div>
        {lista.error && <Vacio>{lista.error}</Vacio>}
        {!lista.error && !lista.cargando && lista.items.length === 0 && <Vacio>Aún no hay actividad.</Vacio>}
        <Centinela alVerse={lista.cargarMas} cargando={lista.cargando} />
      </main>
    </>
  );
}
