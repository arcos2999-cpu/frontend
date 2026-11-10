/** Avisos breves (toast) que se pueden lanzar desde cualquier parte de la app. */
import { useSyncExternalStore } from 'react';

let lista = [];
let siguiente = 1;
const oyentes = new Set();

function cambiar(nueva) {
  lista = nueva;
  oyentes.forEach((f) => f());
}

/**
 * @param {string} texto
 * @param {{accion?: string, alTocar?: Function, ms?: number}} [opciones]
 */
export function aviso(texto, opciones = {}) {
  if (!texto) return;
  const id = siguiente++;
  cambiar([...lista, { id, texto, ...opciones }].slice(-3));
  setTimeout(() => quitarAviso(id), opciones.ms || (texto.length > 60 ? 5500 : 3800));
}

export function quitarAviso(id) {
  if (lista.some((a) => a.id === id)) cambiar(lista.filter((a) => a.id !== id));
}

export function useAvisos() {
  return useSyncExternalStore(
    (f) => {
      oyentes.add(f);
      return () => oyentes.delete(f);
    },
    () => lista,
  );
}
