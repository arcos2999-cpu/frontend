/** Lista de usuarios. Aquí el administrador asigna manualmente los roles (maestro, personal, admin). */
import { useState } from 'react';
import Barra from '../components/Barra.jsx';
import { Dialogo } from '../components/Dialogo.jsx';
import { Centinela, Vacio } from '../components/Varios.jsx';
import { api } from '../lib/api.js';
import { aviso } from '../lib/avisos.js';
import { ROLES, colorRol, plural, rolLabel } from '../lib/formato.js';
import { useListaPaginada, useRetrasado } from '../lib/hooks.js';
import { sesion } from '../lib/sesion.js';

const POR_PAGINA = 30;
const FILTROS = [
  ['', 'Todos los roles'],
  ['alumno', 'Alumnos'],
  ['maestro', 'Maestros'],
  ['personal', 'Personal'],
  ['admin', 'Administradores'],
];

export default function Usuarios() {
  const [texto, setTexto] = useState('');
  const [rol, setRol] = useState('');
  const consulta = useRetrasado(texto.trim());
  // Diálogo abierto: {tipo: 'opciones' | 'rol' | 'activo', usuario}
  const [dialogo, setDialogo] = useState(null);

  const lista = useListaPaginada(
    (pagina) => api.usuarios({ per_page: POR_PAGINA, page: pagina, q: consulta, rol }),
    `${consulta}|${rol}`,
  );

  function tocar(u) {
    if (u.id === sesion.id()) {
      aviso('No puedes modificar tu propia cuenta desde aquí.');
      return;
    }
    setDialogo({ tipo: 'opciones', usuario: u });
  }

  async function guardarRol(u, nuevoRol) {
    setDialogo(null);
    if (!nuevoRol || nuevoRol === u.rol) return;
    try {
      const nuevo = await api.cambiarRol(u.id, nuevoRol);
      lista.actualizarItem(nuevo);
      aviso(`Rol actualizado: ${rolLabel(nuevo.rol)}`);
    } catch (e) {
      if (!e.sesionCerrada) aviso(e.message);
    }
  }

  async function cambiarActivo(u, activar) {
    setDialogo(null);
    try {
      const nuevo = await api.cambiarActivo(u.id, activar);
      lista.actualizarItem(nuevo);
      aviso(activar ? 'Cuenta reactivada.' : 'Cuenta desactivada.');
    } catch (e) {
      if (!e.sesionCerrada) aviso(e.message);
    }
  }

  return (
    <>
      <Barra titulo="Usuarios y roles" atras acciones={[{ icono: 'recargar', etiqueta: 'Actualizar', alTocar: lista.recargar }]} />
      <main className="vista">
        <div className="filtros">
          <input className="entrada entrada-busqueda" id="buscar" type="search" placeholder="Buscar nombre o matrícula"
            aria-label="Buscar nombre o matrícula" autoComplete="off" value={texto} onChange={(e) => setTexto(e.target.value)} />
          <select className="entrada" id="rol" aria-label="Filtrar por rol" value={rol} onChange={(e) => setRol(e.target.value)}>
            {FILTROS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </div>

        <div id="lista" className="lista">
          {lista.items.map((u) => <FilaUsuario key={u.id} u={u} alTocar={() => tocar(u)} />)}
        </div>
        {lista.error && <Vacio>{lista.error}</Vacio>}
        {!lista.error && !lista.cargando && lista.items.length === 0 && <Vacio>No se encontraron usuarios.</Vacio>}
        <Centinela alVerse={lista.cargarMas} cargando={lista.cargando} />
      </main>

      {dialogo?.tipo === 'opciones' && (
        <DialogoOpciones
          u={dialogo.usuario}
          alCerrar={() => setDialogo(null)}
          alElegir={(tipo) => setDialogo({ tipo, usuario: dialogo.usuario })}
        />
      )}
      {dialogo?.tipo === 'rol' && (
        <DialogoRol u={dialogo.usuario} alCerrar={() => setDialogo(null)} alGuardar={(r) => guardarRol(dialogo.usuario, r)} />
      )}
      {dialogo?.tipo === 'activo' && (
        <DialogoActivo u={dialogo.usuario} alCerrar={() => setDialogo(null)}
          alConfirmar={() => cambiarActivo(dialogo.usuario, dialogo.usuario.activo === false)} />
      )}
    </>
  );
}

function FilaUsuario({ u, alTocar }) {
  const activo = u.activo !== false;
  return (
    <button type="button" className={`tarjeta usuario${activo ? '' : ' inactivo'}`} onClick={alTocar}>
      <div className="usuario-datos">
        <p className="usuario-nombre">{u.nombre}{u.id === sesion.id() ? ' (tú)' : ''}</p>
        <p className="usuario-linea">Matrícula {u.matricula}{u.carrera ? ` · ${u.carrera}` : ''}</p>
        <p className="usuario-linea">
          {plural(u.reportes ?? 0, 'reporte', 'reportes')}{activo ? '' : ' · CUENTA DESACTIVADA'}
        </p>
      </div>
      <span className="chip" style={{ background: colorRol(u.rol) }}>{rolLabel(u.rol)}</span>
    </button>
  );
}

function DialogoOpciones({ u, alCerrar, alElegir }) {
  const activo = u.activo !== false;
  return (
    <Dialogo titulo={u.nombre} alCerrar={alCerrar}
      botones={<button type="button" className="btn btn-texto" onClick={alCerrar}>Cancelar</button>}>
      <ul className="opciones">
        <li><button type="button" className="opcion" onClick={() => alElegir('rol')}>Cambiar rol</button></li>
        <li>
          <button type="button" className="opcion" onClick={() => alElegir('activo')}>
            {activo ? 'Desactivar cuenta' : 'Reactivar cuenta'}
          </button>
        </li>
      </ul>
    </Dialogo>
  );
}

function DialogoRol({ u, alCerrar, alGuardar }) {
  const [elegido, setElegido] = useState(u.rol);
  return (
    <Dialogo
      titulo={`Rol de ${u.nombre}`}
      alCerrar={alCerrar}
      botones={(
        <>
          <button type="button" className="btn btn-texto" onClick={alCerrar}>Cancelar</button>
          <button type="button" className="btn btn-lleno" onClick={() => alGuardar(elegido)}>Guardar</button>
        </>
      )}
    >
      <div className="opciones" role="radiogroup">
        {ROLES.map((r) => (
          <label className="opcion" key={r}>
            <input type="radio" name="rol" value={r} checked={elegido === r} onChange={() => setElegido(r)} />
            {rolLabel(r)}
          </label>
        ))}
      </div>
    </Dialogo>
  );
}

function DialogoActivo({ u, alCerrar, alConfirmar }) {
  const activar = u.activo === false;
  return (
    <Dialogo
      titulo={activar ? 'Reactivar cuenta' : 'Desactivar cuenta'}
      alCerrar={alCerrar}
      botones={(
        <>
          <button type="button" className="btn btn-texto" onClick={alCerrar}>Cancelar</button>
          <button type="button" className="btn btn-lleno" onClick={alConfirmar}>Confirmar</button>
        </>
      )}
    >
      <p>
        {activar
          ? `${u.nombre} podrá iniciar sesión de nuevo.`
          : `${u.nombre} ya no podrá iniciar sesión ni enviar reportes. Sus reportes se conservan.`}
      </p>
    </Dialogo>
  );
}
