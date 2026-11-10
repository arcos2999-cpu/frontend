/**
 * Sesión del usuario guardada en el navegador.
 *
 * Solo se guardan el token (JWT) y los datos públicos del usuario. El token lo emite el
 * servidor y dura 7 días; el rol se vuelve a consultar en cada petición, así que cambiar
 * estos datos en el navegador no da permisos extra.
 */
import { useSyncExternalStore } from 'react';
import { aviso } from './avisos.js';

export const CLAVE_SESION = 'buzon.sesion';

let datos = leer();
const oyentes = new Set();

function leer() {
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE_SESION) || 'null');
    return d && d.token && d.usuario ? d : null;
  } catch {
    return null;
  }
}

function escribir() {
  try {
    if (datos) {
      localStorage.setItem(CLAVE_SESION, JSON.stringify(datos));
    } else {
      localStorage.removeItem(CLAVE_SESION);
    }
  } catch {
    // Almacenamiento bloqueado (modo privado estricto): la sesión dura mientras la pestaña esté abierta.
  }
}

function notificar() {
  oyentes.forEach((f) => f());
}

/** Fecha de vencimiento del JWT (milisegundos) o 0 si no se puede leer. */
function vencimiento(token) {
  try {
    const parte = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(parte.padEnd(parte.length + ((4 - (parte.length % 4)) % 4), '=')));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

export function sesionVigente(d) {
  if (!d) return false;
  const vence = vencimiento(d.token);
  return vence === 0 || vence > Date.now();
}

export const sesion = {
  datos: () => datos,
  activa: () => sesionVigente(datos),
  token: () => datos?.token ?? null,
  usuario: () => datos?.usuario ?? null,
  id: () => datos?.usuario?.id ?? 0,
  rol: () => datos?.usuario?.rol ?? '',
  esAdmin: () => datos?.usuario?.rol === 'admin',

  guardar(token, usuario) {
    datos = { token, usuario };
    escribir();
    notificar();
  },

  /** Actualiza los datos del usuario (por ejemplo, si el admin le cambió el rol). */
  actualizar(usuario) {
    if (!datos || !usuario) return;
    datos = { ...datos, usuario };
    escribir();
    notificar();
  },

  /**
   * Cierra la sesión en este navegador. La app vuelve sola a la pantalla de inicio de sesión.
   * @param {string} [mensaje] aviso para el usuario
   */
  cerrarLocal(mensaje) {
    datos = null;
    escribir();
    window.dispatchEvent(new CustomEvent('buzon:sesion-cerrada'));
    if (mensaje) aviso(mensaje);
    notificar();
  },

  suscribir(f) {
    oyentes.add(f);
    return () => oyentes.delete(f);
  },
};

// Otra pestaña inició o cerró sesión.
window.addEventListener('storage', (e) => {
  if (e.key !== CLAVE_SESION) return;
  datos = leer();
  window.dispatchEvent(new CustomEvent('buzon:sesion-cerrada'));
  notificar();
});

/** Datos de la sesión como estado de React: el componente se vuelve a dibujar cuando cambian. */
export function useSesion() {
  return useSyncExternalStore(sesion.suscribir, sesion.datos);
}
