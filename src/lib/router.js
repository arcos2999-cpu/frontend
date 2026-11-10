/**
 * Rutas con "#" (#/inicio, #/reporte/12, #/reportes?tab=1). Funcionan en cualquier servidor
 * sin configurar reescrituras y permiten abrir un reporte directo desde una notificación.
 */
import { useSyncExternalStore } from 'react';

let indice = 0; // posición dentro del historial de la app (para saber si "atrás" sale de la app)
let primeraVez = true;
let vuelta = 0; // aumenta en cada navegación: cada pantalla se monta de nuevo
let actual = null;
const oyentes = new Set();

function leer() {
  const crudo = location.hash.replace(/^#\/?/, '');
  const i = crudo.indexOf('?');
  const ruta = decodeURIComponent(i < 0 ? crudo : crudo.slice(0, i));
  const params = new URLSearchParams(i < 0 ? '' : crudo.slice(i + 1));
  return { ruta, params, vuelta };
}

function marcarHistorial() {
  const s = history.state;
  if (s && typeof s.i === 'number') {
    indice = s.i;
  } else {
    indice = primeraVez ? 0 : indice + 1;
    history.replaceState({ i: indice }, '');
  }
  primeraVez = false;
}

function cambio() {
  vuelta++;
  actual = leer();
  oyentes.forEach((f) => f());
}

window.addEventListener('hashchange', () => {
  marcarHistorial();
  cambio();
});
marcarHistorial();
actual = leer();

export function useRuta() {
  return useSyncExternalStore(
    (f) => {
      oyentes.add(f);
      return () => oyentes.delete(f);
    },
    () => actual,
  );
}

/** Va a una ruta. Con reemplazar=true no deja la pantalla actual en el historial. */
export function navegar(ruta, reemplazar = false) {
  const destino = '#/' + ruta.replace(/^#?\/?/, '');
  if (reemplazar) {
    history.replaceState({ i: indice }, '', destino);
    cambio();
  } else if (location.hash === destino) {
    cambio();
  } else {
    location.hash = destino;
  }
}

/** Regresa a la pantalla anterior, o al inicio si se entró directo a esta. */
export function volver() {
  if (indice > 0) {
    history.back();
  } else {
    navegar('inicio', true);
  }
}

/** Guarda filtros en la dirección sin volver a dibujar la pantalla (así "atrás" los conserva). */
export function guardarParams(params) {
  const ruta = actual?.ruta || '';
  const q = params.toString();
  history.replaceState(history.state, '', `#/${ruta}${q ? `?${q}` : ''}`);
}
