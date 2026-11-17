/**
 * Cola de reportes sin conexión.
 *
 * Si al enviar un reporte no hay internet, el reporte (texto y fotos) se guarda en el
 * teléfono con IndexedDB. Cuando vuelve la conexión, o cuando se abre la app con sesión
 * iniciada, los reportes pendientes se envían solos.
 *
 * Se usa IndexedDB y no localStorage porque localStorage solo guarda texto y tiene un
 * límite de ~5 MB, así que no alcanza para las fotos.
 */
import { api, ApiError } from './api.js';
import { aviso } from './avisos.js';
import { sesion } from './sesion.js';

const BD = 'buzon-cola';
const ALMACEN = 'reportes';

function abrir() {
  return new Promise((resolver, rechazar) => {
    if (!('indexedDB' in window)) {
      rechazar(new Error('IndexedDB no disponible'));
      return;
    }
    const peticion = indexedDB.open(BD, 1);
    peticion.onupgradeneeded = () => {
      peticion.result.createObjectStore(ALMACEN, { keyPath: 'id', autoIncrement: true });
    };
    peticion.onsuccess = () => resolver(peticion.result);
    peticion.onerror = () => rechazar(peticion.error);
  });
}

/** Ejecuta una operación sobre el almacén y devuelve su resultado. */
async function operar(modo, accion) {
  const bd = await abrir();
  return new Promise((resolver, rechazar) => {
    const tx = bd.transaction(ALMACEN, modo);
    let resultado;
    const peticion = accion(tx.objectStore(ALMACEN));
    if (peticion) peticion.onsuccess = () => { resultado = peticion.result; };
    tx.oncomplete = () => {
      bd.close();
      resolver(resultado);
    };
    tx.onerror = tx.onabort = () => {
      bd.close();
      rechazar(tx.error);
    };
  });
}

/** Reportes pendientes de la cuenta que tiene la sesión abierta. */
async function pendientesDelUsuario() {
  const todos = (await operar('readonly', (a) => a.getAll())) || [];
  return todos.filter((r) => r.usuario === sesion.id());
}

/**
 * Guarda un reporte para enviarlo después.
 * @param {{nombre: string, descripcion: string, ubicacion: string, id_categoria?: string, fotos: Blob[]}} reporte
 * @returns {Promise<boolean>} true si quedó guardado
 */
export async function guardarPendiente(reporte) {
  try {
    await operar('readwrite', (a) => a.add({
      usuario: sesion.id(),
      nombre: reporte.nombre,
      descripcion: reporte.descripcion,
      ubicacion: reporte.ubicacion,
      id_categoria: reporte.id_categoria || '',
      fotos: reporte.fotos || [],
      fecha: new Date().toISOString(),
    }));
    return true;
  } catch {
    // Almacenamiento bloqueado o lleno: el formulario muestra el error normal.
    return false;
  }
}

let enCurso = false;

/**
 * Envía los reportes pendientes. Un reporte solo se borra del teléfono cuando el servidor
 * lo recibió; si falla por conexión o por el servidor, se queda para el próximo intento.
 */
export async function sincronizar() {
  if (enCurso || !sesion.activa() || !navigator.onLine) return;
  enCurso = true;
  let enviados = 0;
  let descartados = 0;

  try {
    const lista = await pendientesDelUsuario();
    for (const r of lista) {
      const datos = new FormData();
      datos.append('nombre', r.nombre);
      datos.append('descripcion', r.descripcion);
      datos.append('ubicacion', r.ubicacion);
      if (r.id_categoria) datos.append('id_categoria', r.id_categoria);
      (r.fotos || []).forEach((foto, i) => datos.append('imagenes[]', foto, `foto${i + 1}.jpg`));

      try {
        await api.crearReporte(datos);
      } catch (err) {
        if (!(err instanceof ApiError)) throw err;
        // Sin conexión, sesión vencida o problema del servidor: se reintenta después.
        if (err.sesionCerrada || err.status === 0 || err.status === 429 || err.status >= 500) break;
        // El servidor lo rechazó (4xx): reintentar no sirve, se descarta.
        await operar('readwrite', (a) => a.delete(r.id));
        descartados++;
        continue;
      }
      await operar('readwrite', (a) => a.delete(r.id));
      enviados++;
    }
  } catch {
    // Error de almacenamiento: lo que quede pendiente se intentará en la próxima vez.
  } finally {
    enCurso = false;
  }

  if (enviados) {
    aviso(enviados === 1
      ? 'Se envió tu reporte que estaba pendiente.'
      : `Se enviaron ${enviados} reportes que estaban pendientes.`);
  }
  if (descartados) {
    aviso(descartados === 1
      ? 'Un reporte pendiente no pudo enviarse porque el servidor lo rechazó.'
      : `${descartados} reportes pendientes no pudieron enviarse porque el servidor los rechazó.`);
  }
}

/** Activa el envío automático: al volver el internet, al iniciar sesión y al abrir la app. */
export function iniciarCola() {
  window.addEventListener('online', sincronizar);
  sesion.suscribir(sincronizar);
  sincronizar();
}
