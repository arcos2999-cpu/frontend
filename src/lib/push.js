/**
 * Notificaciones push con Firebase Cloud Messaging (opcional).
 * Solo se activan si config.js trae los datos de "firebase"; sin ellos la app funciona igual.
 */
import { api } from './api.js';

const cfg = window.BUZON_CONFIG?.firebase || null;
const VERSION_SDK = '10.14.1';
const CLAVE_TOKEN = 'buzon.fcm';

let cargado = null;

function script(src) {
  return new Promise((resolver, rechazar) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolver;
    s.onerror = () => rechazar(new Error('No se pudo cargar ' + src));
    document.head.appendChild(s);
  });
}

function cargarFirebase() {
  if (!cargado) {
    cargado = (async () => {
      await script(`https://www.gstatic.com/firebasejs/${VERSION_SDK}/firebase-app-compat.js`);
      await script(`https://www.gstatic.com/firebasejs/${VERSION_SDK}/firebase-messaging-compat.js`);
      const { vapidKey, ...opciones } = cfg;
      if (!window.firebase.apps.length) window.firebase.initializeApp(opciones);
      const messaging = window.firebase.messaging();
      // Con la app abierta, el aviso llega aquí (y no como notificación del sistema).
      messaging.onMessage((payload) => {
        window.dispatchEvent(new CustomEvent('buzon:push', { detail: payload.data || {} }));
      });
      return messaging;
    })().catch((e) => {
      cargado = null;
      throw e;
    });
  }
  return cargado;
}

async function registrarToken() {
  const messaging = await cargarFirebase();
  const registro = await navigator.serviceWorker.ready;
  const token = await messaging.getToken({ vapidKey: cfg.vapidKey, serviceWorkerRegistration: registro });
  if (!token) return false;
  await api.registrarDispositivo(token);
  localStorage.setItem(CLAVE_TOKEN, token);
  return true;
}

export const push = {
  /** ¿Este navegador y esta instalación pueden recibir avisos? */
  disponible() {
    return !!cfg && 'serviceWorker' in navigator && 'Notification' in window && 'PushManager' in window
      && window.isSecureContext;
  },

  /** 'default' (no ha decidido), 'granted' o 'denied'. */
  permiso() {
    return 'Notification' in window ? Notification.permission : 'denied';
  },

  /** Pide permiso (debe llamarse al tocar un botón) y registra el dispositivo. */
  async activar() {
    if (!this.disponible()) return false;
    const p = await Notification.requestPermission();
    if (p !== 'granted') return false;
    return registrarToken();
  },

  /** Al abrir la app con sesión: si ya había permiso, vuelve a registrar el token (puede cambiar). */
  async sincronizar() {
    if (!this.disponible() || this.permiso() !== 'granted') return;
    try {
      await registrarToken();
    } catch (e) {
      console.warn('Push no disponible:', e);
    }
  },

  /** Al cerrar sesión: el servidor deja de enviar avisos a este navegador. */
  async baja() {
    const token = localStorage.getItem(CLAVE_TOKEN);
    if (!token) return;
    localStorage.removeItem(CLAVE_TOKEN);
    try {
      await api.bajaDispositivo(token);
    } catch {
      // Sin conexión: el servidor borrará el token cuando Firebase lo marque como inválido.
    }
    try {
      if (cargado) await (await cargado).deleteToken();
    } catch {
      // sin importancia
    }
  },
};
