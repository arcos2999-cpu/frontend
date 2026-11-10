/**
 * Raíz de la app: elige la pantalla según la ruta (#/...) y protege cada una por rol.
 *  publica: no requiere sesión (y si ya hay sesión, manda al inicio)
 *  admin:   solo administradores
 *  usuario: solo alumno, maestro y personal (el admin no crea reportes)
 */
import { useEffect } from 'react';
import { Avisos, SinConexion } from './components/Avisos.jsx';
import { aviso } from './lib/avisos.js';
import { sincronizarRol } from './lib/acciones.js';
import { navegar, useRuta } from './lib/router.js';
import { sesion, sesionVigente, useSesion } from './lib/sesion.js';

import Login from './paginas/Login.jsx';
import Registro from './paginas/Registro.jsx';
import Inicio from './paginas/Inicio.jsx';
import AdminInicio from './paginas/AdminInicio.jsx';
import Reportes from './paginas/Reportes.jsx';
import Detalle from './paginas/Detalle.jsx';
import Nuevo from './paginas/Nuevo.jsx';
import Usuarios from './paginas/Usuarios.jsx';
import Estadisticas from './paginas/Estadisticas.jsx';

const RUTAS = [
  { patron: /^login$/, pagina: () => Login, publica: true },
  { patron: /^registro$/, pagina: () => Registro, publica: true },
  { patron: /^(inicio)?$/, pagina: (esAdmin) => (esAdmin ? AdminInicio : Inicio) },
  { patron: /^reportes$/, pagina: () => Reportes },
  { patron: /^reporte\/(\d+)$/, pagina: () => Detalle },
  { patron: /^nuevo$/, pagina: () => Nuevo, usuario: true },
  { patron: /^usuarios$/, pagina: () => Usuarios, admin: true },
  { patron: /^estadisticas$/, pagina: () => Estadisticas, admin: true },
];

function resolver(ruta) {
  for (const r of RUTAS) {
    const m = r.patron.exec(ruta);
    if (m) return { def: r, m };
  }
  return { def: null, m: null };
}

export default function App() {
  const { ruta, params, vuelta } = useRuta();
  const datos = useSesion();
  const conSesion = sesionVigente(datos);
  const esAdmin = datos?.usuario?.rol === 'admin';
  const { def, m } = resolver(ruta);

  let redirigir = null;
  if (!def) redirigir = conSesion ? 'inicio' : 'login';
  else if (!conSesion && !def.publica) redirigir = 'login';
  else if (conSesion && def.publica) redirigir = 'inicio';
  else if (def.admin && !esAdmin) redirigir = 'inicio';
  else if (def.usuario && esAdmin) redirigir = 'inicio';

  useEffect(() => {
    if (!redirigir) return;
    if (redirigir === 'login' && datos) {
      // Había sesión guardada pero el token ya venció.
      aviso('Tu sesión venció. Inicia sesión de nuevo.');
      sesion.cerrarLocal();
    }
    navegar(redirigir, true);
  }, [redirigir, datos]);

  // Al volver a la app (cambio de pestaña o de aplicación) se revisa si cambió el rol.
  useEffect(() => {
    const alVolver = () => {
      if (document.visibilityState === 'visible') sincronizarRol();
    };
    document.addEventListener('visibilitychange', alVolver);
    return () => document.removeEventListener('visibilitychange', alVolver);
  }, []);

  // Aviso push recibido con la app abierta.
  useEffect(() => {
    const alPush = (e) => {
      const d = e.detail || {};
      const texto = [d.titulo, d.cuerpo].filter(Boolean).join(': ') || 'Hay novedades en tus reportes.';
      const id = Number(d.id_reporte);
      aviso(texto, id > 0 ? { accion: 'Ver', alTocar: () => navegar(`reporte/${id}`) } : {});
    };
    window.addEventListener('buzon:push', alPush);
    return () => window.removeEventListener('buzon:push', alPush);
  }, []);

  // Al cambiar de pantalla, empezar desde arriba.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [vuelta]);

  const Pagina = !redirigir && def ? def.pagina(esAdmin) : null;

  return (
    <>
      {Pagina && <Pagina key={vuelta} params={params} m={m} />}
      <Avisos />
      <SinConexion />
    </>
  );
}
