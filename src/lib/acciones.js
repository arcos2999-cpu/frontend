/** Acciones de sesión compartidas por varias pantallas. */
import { api } from './api.js';
import { aviso } from './avisos.js';
import { push } from './push.js';
import { rolLabel } from './formato.js';
import { sesion } from './sesion.js';

/**
 * Pregunta al servidor el rol actual. Si el administrador cambió el rol de esta cuenta,
 * la app muestra el inicio que le corresponde sin pedir otra vez el inicio de sesión.
 * Si la cuenta fue desactivada, el servidor responde 401 y se cierra la sesión.
 */
export async function sincronizarRol() {
  if (!sesion.activa()) return;
  const antes = sesion.rol();
  try {
    const r = await api.yo();
    if (!r?.usuario || !sesion.activa()) return;
    sesion.actualizar(r.usuario);
    if (r.usuario.rol !== antes) aviso(`Tu rol ahora es: ${rolLabel(r.usuario.rol)}.`);
  } catch {
    // Sin conexión: se intentará en la próxima visita.
  }
}

/** Cierra la sesión: primero da de baja el aviso push (necesita el token) y luego limpia. */
export async function cerrarSesion() {
  await push.baja();
  sesion.cerrarLocal();
}
