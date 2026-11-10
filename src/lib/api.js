/**
 * Cliente de la API REST /api/v1 del Buzón BUAP SJC (backend en CodeIgniter 4).
 * Formato de errores del servidor: {"error": "mensaje", "errores": {"campo": "mensaje"}}
 */
import { sesion } from './sesion.js';

const BASE = new URL(window.BUZON_CONFIG?.apiUrl || '../api/v1/', location.href).href.replace(/\/?$/, '/');

export const SIN_CONEXION = 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.';

export class ApiError extends Error {
  constructor(mensaje, status = 0, errores = null) {
    super(mensaje);
    this.status = status;
    this.errores = errores || {};
    this.sesionCerrada = false;
  }
}

function mensajePorCodigo(status) {
  if (status === 403) return 'No tienes permiso para realizar esta acción.';
  if (status === 404) return 'No se encontró lo que buscabas.';
  if (status === 413) return 'Los archivos son demasiado grandes.';
  if (status === 429) return 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.';
  if (status >= 500) return 'El servidor tuvo un problema. Inténtalo de nuevo en un momento.';
  return `Ocurrió un error (código ${status}).`;
}

async function pedir(metodo, ruta, { query, json, form } = {}) {
  const url = new URL(ruta, BASE);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '' && v !== 0) url.searchParams.set(k, String(v));
    }
  }

  const headers = { Accept: 'application/json' };
  const token = sesion.token();
  if (token) headers.Authorization = `Bearer ${token}`;

  let body;
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  } else if (form !== undefined) {
    body = form; // FormData: el navegador pone el boundary del multipart
  }

  let resp;
  try {
    resp = await fetch(url, { method: metodo, headers, body, cache: 'no-store' });
  } catch {
    throw new ApiError(SIN_CONEXION, 0);
  }

  let datos = null;
  try {
    datos = await resp.json();
  } catch {
    datos = null;
  }

  if (resp.ok) return datos ?? {};

  // 401 con sesión iniciada: el token venció o la cuenta fue desactivada.
  if (resp.status === 401 && token) {
    sesion.cerrarLocal(datos?.error === 'La cuenta no existe o está desactivada.'
      ? 'Tu cuenta fue desactivada. Contacta a la administración.'
      : 'Tu sesión venció. Inicia sesión de nuevo.');
    const e = new ApiError(datos?.error || 'Sesión requerida.', 401);
    e.sesionCerrada = true;
    throw e;
  }

  throw new ApiError(datos?.error || mensajePorCodigo(resp.status), resp.status, datos?.errores);
}

let catalogosPromesa = null;
window.addEventListener('buzon:sesion-cerrada', () => {
  catalogosPromesa = null;
});

export const api = {
  // ---- cuenta
  registro: (d) => pedir('POST', 'auth/register', { json: d }),
  login: (d) => pedir('POST', 'auth/login', { json: d }),
  yo: () => pedir('GET', 'auth/me'),

  // ---- catálogos (se guardan en memoria mientras la app está abierta)
  catalogos() {
    if (!catalogosPromesa) {
      catalogosPromesa = pedir('GET', 'catalogos').catch((e) => {
        catalogosPromesa = null;
        throw e;
      });
    }
    return catalogosPromesa;
  },

  // ---- reportes
  reportes: (q) => pedir('GET', 'reportes', { query: q }),
  reporte: (id) => pedir('GET', `reportes/${encodeURIComponent(id)}`),
  crearReporte: (formData) => pedir('POST', 'reportes', { form: formData }),
  apoyar: (id) => pedir('POST', `reportes/${id}/apoyo`),
  confirmar: (id) => pedir('POST', `reportes/${id}/confirmar`),
  reabrir: (id, comentario) => pedir('POST', `reportes/${id}/reabrir`, { json: { comentario } }),
  cambiarEstado: (id, cuerpo) => pedir('PATCH', `reportes/${id}/estado`, { json: cuerpo }),

  // ---- administración
  usuarios: (q) => pedir('GET', 'usuarios', { query: q }),
  cambiarRol: (id, rol) => pedir('PATCH', `usuarios/${id}/rol`, { json: { rol } }),
  cambiarActivo: (id, activo) => pedir('PATCH', `usuarios/${id}/activo`, { json: { activo } }),
  estadisticas: () => pedir('GET', 'estadisticas'),

  // ---- notificaciones push
  registrarDispositivo: (token) => pedir('POST', 'dispositivos', { json: { fcm_token: token } }),
  bajaDispositivo: (token) => pedir('POST', 'dispositivos/baja', { json: { fcm_token: token } }),

  /** Dirección de la API (para corregir las URL de las fotos). */
  base: BASE,
};
