/** Service worker, instalación como app y estado de la conexión. */
import { useSyncExternalStore } from 'react';
import { aviso } from './avisos.js';
import { navegar } from './router.js';

// ------------------------------------------------------------------ service worker
export function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  // En "npm run dev" no se registra, para no guardar archivos de desarrollo.
  if (!import.meta.env.PROD) return;

  const habiaControlador = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').catch((e) => console.warn('Service worker no registrado:', e));

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (habiaControlador) {
      aviso('Hay una versión nueva de la app.', { accion: 'Actualizar', alTocar: () => location.reload(), ms: 15000 });
    }
  });

  // Al tocar una notificación con la app abierta, el service worker pide abrir el reporte.
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data?.tipo === 'abrir' && typeof e.data.ruta === 'string') navegar(e.data.ruta);
  });
}

// ------------------------------------------------------------------ instalación
let promptInstalar = null;
const oyentes = new Set();
const notificar = () => oyentes.forEach((f) => f());
const suscribir = (f) => {
  oyentes.add(f);
  return () => oyentes.delete(f);
};

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  promptInstalar = e;
  notificar();
});

window.addEventListener('appinstalled', () => {
  promptInstalar = null;
  notificar();
  aviso('¡Listo! La app quedó instalada.');
});

/** true cuando el navegador ofrece instalar la app. */
export function useInstalable() {
  return useSyncExternalStore(suscribir, () => promptInstalar !== null);
}

export async function instalar() {
  if (!promptInstalar) return;
  const p = promptInstalar;
  p.prompt();
  await p.userChoice.catch(() => null);
  promptInstalar = null;
  notificar();
}

// ------------------------------------------------------------------ conexión
const suscribirConexion = (f) => {
  window.addEventListener('online', f);
  window.addEventListener('offline', f);
  return () => {
    window.removeEventListener('online', f);
    window.removeEventListener('offline', f);
  };
};

export function useEnLinea() {
  return useSyncExternalStore(suscribirConexion, () => navigator.onLine);
}
