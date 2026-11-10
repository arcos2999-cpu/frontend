/**
 * Detalle de un reporte con su historial de anotaciones.
 *  - Cualquier usuario: ve el avance y puede apoyar con "Yo también".
 *  - Autor: cuando se cierra, puede confirmar la solución o reabrir.
 *  - Admin: cambia estado y prioridad y agrega una anotación.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import Barra from '../components/Barra.jsx';
import { Dialogo, Visor } from '../components/Dialogo.jsx';
import { ChipEstado, Prioridad } from '../components/Reporte.jsx';
import { Cargando, Vacio } from '../components/Varios.jsx';
import { api } from '../lib/api.js';
import { aviso } from '../lib/avisos.js';
import { PRIORIDADES, fecha, meta, prioridadLabel, urlImagen } from '../lib/formato.js';
import { useMontado } from '../lib/hooks.js';
import { sesion } from '../lib/sesion.js';

export default function Detalle({ m }) {
  const id = Number(m[1]);
  const esAdmin = sesion.esAdmin();
  const [reporte, setReporte] = useState(null);
  const [error, setError] = useState('');
  const [estados, setEstados] = useState(null);
  const [version, setVersion] = useState(0); // cambia en cada actualización: limpia el panel del admin
  const [foto, setFoto] = useState(null);

  const reporteRef = useRef(null);
  reporteRef.current = reporte;

  const mostrar = useCallback((r) => {
    setReporte(r);
    setVersion((v) => v + 1);
  }, []);

  const cargar = useCallback(async () => {
    if (esAdmin) {
      // El admin necesita la lista de estados para el selector.
      try {
        const c = await api.catalogos();
        setEstados(c.estados || []);
      } catch (e) {
        if (!e.sesionCerrada) aviso(e.message);
      }
    }
    try {
      mostrar(await api.reporte(id));
      setError('');
    } catch (e) {
      if (e.sesionCerrada) return;
      if (reporteRef.current) aviso(e.message);
      else setError(e.message);
    }
  }, [esAdmin, id, mostrar]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const barra = <Barra titulo="Detalle del reporte" atras acciones={[{ icono: 'recargar', etiqueta: 'Actualizar', alTocar: cargar }]} />;

  if (!reporte) {
    return (
      <>
        {barra}
        <main className="vista">{error ? <Vacio>{error}</Vacio> : <Cargando />}</main>
      </>
    );
  }

  const r = reporte;
  const fotos = (r.imagenes || []).map(urlImagen);

  return (
    <>
      {barra}
      <main className="vista">
        <article className="tarjeta">
          <h2 className="detalle-titulo">{r.nombre}</h2>
          <div className="detalle-chips">
            <ChipEstado clave={r.estado_clave} etiqueta={r.estado} />
            <Prioridad valor={r.prioridad} />
          </div>
          <p className="reporte-linea">{meta(r)}</p>
          <p className="reporte-linea">Ubicación: {r.ubicacion}</p>
          {fotos.length > 0 && (
            <div className="fotos fotos-detalle bloque">
              {fotos.map((u, i) => (
                <button key={u} type="button" className="foto-btn" aria-label={`Ver foto ${i + 1}`} onClick={() => setFoto(u)}>
                  <img src={u} alt={`Foto ${i + 1} del reporte`} loading="lazy" />
                </button>
              ))}
            </div>
          )}
          <p className="detalle-descripcion">{r.descripcion}</p>
          <Apoyo reporte={r} alCambiar={(a) => setReporte((x) => ({ ...x, ...a }))} />
        </article>

        <PanelAutor reporte={r} alActualizar={mostrar} />
        {esAdmin && <PanelAdmin key={version} reporte={r} estados={estados} alActualizar={mostrar} />}

        <h2 className="seccion-titulo">Historial</h2>
        <Historial anotaciones={r.anotaciones} />
      </main>
      {foto && <Visor url={foto} alCerrar={() => setFoto(null)} />}
    </>
  );
}

// ------------------------------------------------------------------ apoyo ("Yo también")
function Apoyo({ reporte: r, alCambiar }) {
  const [ocupado, setOcupado] = useState(false);
  const puedeApoyar = !r.es_mio && !r.es_final && !sesion.esAdmin();

  async function apoyar() {
    setOcupado(true);
    try {
      const a = await api.apoyar(r.id);
      alCambiar({ apoyos: a.apoyos, yo_apoye: a.yo_apoye });
    } catch (e) {
      if (!e.sesionCerrada) aviso(e.message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div id="zona-apoyo">
      {r.apoyos > 0 && (
        <p className="apoyo-texto">
          {r.apoyos === 1 ? '1 persona más tiene este mismo problema' : `${r.apoyos} personas más tienen este mismo problema`}
        </p>
      )}
      {puedeApoyar && (
        <div className="botonera-fila">
          <button type="button" id="btn-apoyo" className={`btn ${r.yo_apoye ? 'btn-borde' : 'btn-tonal'}`}
            disabled={ocupado} onClick={apoyar}>
            {r.yo_apoye ? 'Quitar mi apoyo' : 'Yo también tengo este problema'}
          </button>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ autor: confirmar / reabrir
function PanelAutor({ reporte: r, alActualizar }) {
  const [ocupado, setOcupado] = useState(false);
  const [reabriendo, setReabriendo] = useState(false);
  const montado = useMontado();

  if (!(r.es_mio && r.es_final)) return null;

  let texto;
  let confirmar = false;
  let textoReabrir = 'Reabrir reporte';
  let reabrir = true;
  if (r.estado_clave === 'solucionado') {
    if (r.confirmado) {
      texto = 'Confirmaste que el problema quedó solucionado. ¡Gracias!';
      reabrir = false;
    } else {
      texto = 'La administración marcó este reporte como solucionado. ¿Quedó resuelto?';
      confirmar = true;
      textoReabrir = 'Sigue sin resolverse (reabrir)';
    }
  } else {
    texto = 'La administración indicó que no es posible solucionarlo. Si no estás de acuerdo, puedes reabrirlo explicando por qué.';
  }

  async function confirmarSolucion() {
    setOcupado(true);
    try {
      const nuevo = await api.confirmar(r.id);
      aviso('¡Gracias por confirmar!');
      alActualizar(nuevo);
    } catch (e) {
      if (!e.sesionCerrada) aviso(e.message);
    } finally {
      if (montado()) setOcupado(false);
    }
  }

  return (
    <section className="tarjeta bloque" id="panel-usuario">
      <p className="aviso-usuario">{texto}</p>
      <div className="botonera-fila">
        {confirmar && (
          <button type="button" className="btn btn-lleno" id="btn-confirmar" disabled={ocupado} onClick={confirmarSolucion}>
            Sí, quedó solucionado
          </button>
        )}
        {reabrir && (
          <button type="button" className="btn btn-borde" id="btn-reabrir" disabled={ocupado} onClick={() => setReabriendo(true)}>
            {textoReabrir}
          </button>
        )}
      </div>
      {reabriendo && (
        <DialogoReabrir
          id={r.id}
          alCerrar={() => setReabriendo(false)}
          alReabrir={(nuevo) => {
            setReabriendo(false);
            aviso('Reporte reabierto. La administración lo revisará de nuevo.');
            alActualizar(nuevo);
          }}
        />
      )}
    </section>
  );
}

function DialogoReabrir({ id, alCerrar, alReabrir }) {
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    const texto = motivo.trim();
    if (texto.length < 5) {
      setError('Escribe el motivo (mínimo 5 caracteres).');
      return;
    }
    setEnviando(true);
    try {
      alReabrir(await api.reabrir(id, texto));
    } catch (e) {
      setEnviando(false);
      if (!e.sesionCerrada) setError(e.message);
    }
  }

  return (
    <Dialogo
      titulo="Reabrir reporte"
      alCerrar={alCerrar}
      botones={(
        <>
          <button type="button" className="btn btn-texto" onClick={alCerrar}>Cancelar</button>
          <button type="button" className="btn btn-lleno" disabled={enviando} onClick={enviar}>Reabrir</button>
        </>
      )}
    >
      <div className="campo">
        <label htmlFor="motivo">¿Qué sigue sin resolverse?</label>
        <textarea className="entrada" id="motivo" maxLength={1000} rows={3} autoFocus value={motivo}
          onChange={(e) => {
            setMotivo(e.target.value);
            setError('');
          }} />
        <span className="campo-error" id="motivo-error">{error}</span>
      </div>
    </Dialogo>
  );
}

// ------------------------------------------------------------------ admin: gestionar
function PanelAdmin({ reporte: r, estados, alActualizar }) {
  const [idEstado, setIdEstado] = useState(r.id_estado);
  const [prioridad, setPrioridad] = useState(r.prioridad);
  const [anotacion, setAnotacion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const montado = useMontado();
  const hayEstados = estados && estados.length > 0;

  async function guardar() {
    setGuardando(true);
    try {
      const nuevo = await api.cambiarEstado(r.id, { id_estado: Number(idEstado), prioridad, comentario: anotacion.trim() });
      aviso('Cambios guardados.');
      alActualizar(nuevo); // cambia la "key" del panel: se limpia la anotación
    } catch (e) {
      if (!e.sesionCerrada) aviso(e.message);
      if (montado()) setGuardando(false);
    }
  }

  return (
    <section className="tarjeta bloque panel-admin" id="panel-admin">
      <h3>Gestionar reporte</h3>
      {estados && !hayEstados && (
        <p className="nota">No se pudo cargar la lista de estados. Toca actualizar para intentarlo de nuevo.</p>
      )}
      <div className="rejilla-2">
        <div className="campo">
          <label htmlFor="sel-estado">Estado</label>
          <select className="entrada" id="sel-estado" disabled={!hayEstados} value={idEstado}
            onChange={(e) => setIdEstado(Number(e.target.value))}>
            {(estados || []).map((e) => <option key={e.id} value={e.id}>{e.etiqueta}</option>)}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="sel-prioridad">Prioridad</label>
          <select className="entrada" id="sel-prioridad" value={prioridad} onChange={(e) => setPrioridad(e.target.value)}>
            {PRIORIDADES.map((p) => <option key={p} value={p}>{prioridadLabel(p)}</option>)}
          </select>
        </div>
      </div>
      <div className="campo">
        <label htmlFor="anotacion">Anotación (la verá quien reportó)</label>
        <textarea className="entrada" id="anotacion" maxLength={1000} rows={3} value={anotacion}
          onChange={(e) => setAnotacion(e.target.value)} />
        <span className="campo-ayuda">Obligatoria si eliges “No es posible solucionarlo”.</span>
      </div>
      <button type="button" className="btn btn-lleno" id="btn-guardar" disabled={!hayEstados || guardando} onClick={guardar}>
        {guardando ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </section>
  );
}

// ------------------------------------------------------------------ historial
function Historial({ anotaciones }) {
  if (!anotaciones || !anotaciones.length) return <p className="texto-sec">Aún no hay anotaciones.</p>;
  return (
    <div className="historial">
      {anotaciones.map((a) => (
        <div className="tarjeta anotacion" key={a.id}>
          <div className="anotacion-cabeza">{a.autor} · {fecha(a.fecha_hora)}</div>
          {a.cambio_estado && <p className="anotacion-cambio">Estado: de {a.estado_anterior} a {a.estado_nuevo}</p>}
          {a.comentario && <p className="anotacion-comentario">{a.comentario}</p>}
        </div>
      ))}
    </div>
  );
}
