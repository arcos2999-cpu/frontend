/** Formato de datos para mostrar: fechas, estados, prioridades y roles. */
import { api } from './api.js';

export const PRIORIDADES = ['baja', 'media', 'alta', 'urgente'];
export const ROLES = ['alumno', 'maestro', 'personal', 'admin'];

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "2026-10-25 18:30:00" -> "25 oct 2026, 18:30" */
export function fecha(servidor) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(servidor || '');
  if (!m) return servidor || '';
  return `${Number(m[3])} ${MESES[Number(m[2]) - 1]} ${m[1]}, ${m[4]}:${m[5]}`;
}

/** "2026-10-25 18:30:00" -> "hace 5 min", "hace 2 h", "hace 3 días" (y la fecha completa si pasó una semana). */
export function tiempoRelativo(servidor) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(servidor || '');
  if (!m) return servidor || '';
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6] || 0));
  const min = Math.floor((Date.now() - d.getTime()) / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const dias = Math.floor(h / 24);
  if (dias < 7) return `hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
  return fecha(servidor);
}

export function plural(n, uno, varios) {
  return `${n} ${n === 1 ? uno : varios}`;
}

const COLOR_ESTADO = {
  pendiente: '#757575',
  en_revision: '#1976D2',
  en_proceso: '#E65100',
  no_viable: '#C62828',
  solucionado: '#2E7D32',
  reabierto: '#7B1FA2',
};

export function colorEstado(clave) {
  return COLOR_ESTADO[clave] || '#757575';
}

export function prioridadLabel(p) {
  return { baja: 'Baja', alta: 'Alta', urgente: 'Urgente' }[p] || 'Media';
}

export function rolLabel(rol) {
  if (!rol) return '';
  return { admin: 'Administrador', maestro: 'Maestro', personal: 'Personal' }[rol] || 'Alumno';
}

export function colorRol(rol) {
  if (rol === 'admin') return '#7B1FA2';
  if (rol === 'alumno') return '#757575';
  return '#1976D2';
}

/**
 * El servidor arma la URL de cada foto con su "app.baseURL" (por ejemplo http://localhost:8080/),
 * que puede no ser alcanzable desde el teléfono. Se conserva la ruta de la foto pero se usa el
 * mismo servidor con el que la app ya se comunica.
 */
export function urlImagen(url) {
  if (!url) return url;
  try {
    const foto = new URL(url, api.base);
    return `${new URL(api.base).origin}${foto.pathname}${foto.search}`;
  } catch {
    return url;
  }
}

/** Línea de detalles: fecha, categoría y quién lo reportó. */
export function meta(r) {
  const partes = [fecha(r.fecha_hora)];
  if (r.categoria) partes.push(r.categoria);
  if (r.es_mio) {
    partes.push('Tuyo');
  } else if (r.autor) {
    partes.push(r.rol_usuario ? `${r.autor} (${rolLabel(r.rol_usuario)})` : r.autor);
  } else if (r.rol_usuario) {
    partes.push(`Reportado por: ${rolLabel(r.rol_usuario)}`);
  }
  return partes.filter(Boolean).join(' · ');
}
