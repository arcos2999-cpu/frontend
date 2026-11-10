/**
 * Formulario para enviar un reporte. Los campos automáticos (usuario, rol, fecha y hora)
 * NO se envían: los pone el servidor a partir de la sesión.
 */
import { useEffect, useRef, useState } from 'react';
import Barra from '../components/Barra.jsx';
import Icono from '../components/Icono.jsx';
import { api } from '../lib/api.js';
import { aviso } from '../lib/avisos.js';
import { useMontado } from '../lib/hooks.js';
import { comprimir } from '../lib/imagenes.js';
import { volver } from '../lib/router.js';

const MAX_FOTOS = 3;

export default function Nuevo() {
  const [valores, setValores] = useState({ nombre: '', descripcion: '', ubicacion: '', id_categoria: '' });
  const [errores, setErrores] = useState({});
  const [fotos, setFotos] = useState([]); // [{archivo: File, url: string}]
  const [catalogos, setCatalogos] = useState({ categorias: [], ubicaciones: [] });
  const [enviando, setEnviando] = useState(false);
  const archivoRef = useRef(null);
  const fotosRef = useRef(fotos);
  fotosRef.current = fotos;
  const montado = useMontado();

  // Categorías y sugerencias de ubicación (sin ellas se puede reportar igual).
  useEffect(() => {
    api.catalogos()
      .then((c) => setCatalogos({ categorias: c.categorias || [], ubicaciones: c.ubicaciones || [] }))
      .catch(() => {});
  }, []);

  // Al salir de la pantalla se liberan las vistas previas de las fotos.
  useEffect(() => () => fotosRef.current.forEach((f) => URL.revokeObjectURL(f.url)), []);

  function cambiar(campo, valor) {
    setValores((v) => ({ ...v, [campo]: valor }));
    if (errores[campo]) setErrores((e) => ({ ...e, [campo]: '' }));
  }

  function agregarFotos(lista) {
    const elegidas = [...lista].filter((f) => f.type.startsWith('image/') || f.type === '');
    const lugares = MAX_FOTOS - fotos.length;
    if (elegidas.length > lugares) aviso(`Solo se pueden adjuntar ${MAX_FOTOS} fotos.`);
    const nuevas = elegidas.slice(0, Math.max(0, lugares)).map((archivo) => ({ archivo, url: URL.createObjectURL(archivo) }));
    setFotos((f) => [...f, ...nuevas]);
  }

  function quitarFoto(i) {
    if (enviando) return;
    URL.revokeObjectURL(fotos[i].url);
    setFotos((f) => f.filter((_, j) => j !== i));
  }

  async function enviar(e) {
    e.preventDefault();
    if (enviando) return;
    const nombre = valores.nombre.trim();
    const descripcion = valores.descripcion.trim();
    const ubicacion = valores.ubicacion.trim();

    const errs = {};
    if (nombre.length < 3) errs.nombre = 'Escribe un título (mínimo 3 caracteres).';
    else if (descripcion.length < 10) errs.descripcion = 'Describe el problema (mínimo 10 caracteres).';
    else if (ubicacion.length < 2) errs.ubicacion = 'Indica dónde está el problema.';
    setErrores(errs);
    if (Object.keys(errs).length) {
      document.getElementById(Object.keys(errs)[0])?.focus();
      return;
    }

    setEnviando(true);
    const datos = new FormData();
    datos.append('nombre', nombre);
    datos.append('descripcion', descripcion);
    datos.append('ubicacion', ubicacion);
    if (valores.id_categoria) datos.append('id_categoria', valores.id_categoria);

    // Reducir las fotos antes de subirlas (el servidor acepta máx. 3 MB por imagen).
    for (let i = 0; i < fotos.length; i++) {
      const jpeg = await comprimir(fotos[i].archivo);
      if (!jpeg) {
        setEnviando(false);
        aviso('No se pudo leer una de las fotos. Quítala e inténtalo de nuevo.');
        return;
      }
      datos.append('imagenes[]', jpeg, `foto${i + 1}.jpg`);
    }

    try {
      await api.crearReporte(datos);
      if (!montado()) return;
      aviso('¡Reporte enviado! Te avisaremos cuando cambie su estado.');
      volver();
    } catch (err) {
      if (err.sesionCerrada || !montado()) return;
      setEnviando(false);
      setErrores(err.errores || {});
      aviso(err.message);
    }
  }

  const campo = (id) => ({
    id,
    name: id,
    value: valores[id],
    onChange: (e) => cambiar(id, e.target.value),
    'aria-invalid': errores[id] ? 'true' : 'false',
    'aria-describedby': `err-${id}`,
  });

  return (
    <>
      <Barra titulo="Nuevo reporte" atras />
      <main className="vista">
        <form className="formulario" noValidate onSubmit={enviar}>
          <div className="campo">
            <label htmlFor="nombre">Título del problema</label>
            <input className="entrada" maxLength={150} autoComplete="off" required {...campo('nombre')} />
            <span className="campo-error" id="err-nombre">{errores.nombre}</span>
          </div>
          <div className="campo">
            <label htmlFor="descripcion">Descripción (qué pasa, desde cuándo…)</label>
            <textarea className="entrada" maxLength={2000} rows={5} required {...campo('descripcion')} />
            <span className="campo-error" id="err-descripcion">{errores.descripcion}</span>
          </div>
          <div className="campo">
            <label htmlFor="ubicacion">Ubicación (ej. Edificio A, baños)</label>
            <input className="entrada" maxLength={200} list="lista-ubicaciones" autoComplete="off" required {...campo('ubicacion')} />
            <datalist id="lista-ubicaciones">
              {catalogos.ubicaciones.map((u) => <option key={u.id} value={u.nombre} />)}
            </datalist>
            <span className="campo-ayuda">Elige una sugerencia o escribe el lugar.</span>
            <span className="campo-error" id="err-ubicacion">{errores.ubicacion}</span>
          </div>
          <div className="campo">
            <label htmlFor="categoria">Categoría</label>
            <select className="entrada" id="categoria" value={valores.id_categoria}
              onChange={(e) => cambiar('id_categoria', e.target.value)}>
              <option value="">Sin categoría</option>
              {catalogos.categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>

          <div className="campo">
            <span className="campo-etiqueta">Fotos (opcional, máx. {MAX_FOTOS})</span>
            {fotos.length > 0 && (
              <>
                <div className="fotos fotos-nuevas" id="fotos">
                  {fotos.map((f, i) => (
                    <button key={f.url} type="button" className="foto-btn" aria-label={`Quitar foto ${i + 1}`}
                      onClick={() => quitarFoto(i)}>
                      <img src={f.url} alt="" />
                      <span className="foto-quitar"><Icono nombre="cerrar" /></span>
                    </button>
                  ))}
                </div>
                <span className="campo-ayuda">Toca una foto para quitarla.</span>
              </>
            )}
            <div className="botonera-fila">
              <button type="button" className="btn btn-borde" id="btn-fotos"
                disabled={enviando || fotos.length >= MAX_FOTOS} onClick={() => archivoRef.current?.click()}>
                <Icono nombre="foto" />Agregar fotos
              </button>
            </div>
            <input ref={archivoRef} type="file" id="archivo" accept="image/jpeg,image/png,image/webp,image/*" multiple hidden
              onChange={(e) => {
                agregarFotos(e.target.files);
                e.target.value = '';
              }} />
          </div>

          <p className="nota">
            Tu nombre lo verán solo tú y la administración. El resto de la comunidad verá el reporte sin tu nombre.
          </p>

          <button type="submit" className="btn btn-lleno btn-ancho" id="btn-enviar" disabled={enviando}>
            {enviando ? <><span className="spinner chico" aria-hidden="true" />Enviando…</> : 'Enviar reporte'}
          </button>
        </form>
      </main>
    </>
  );
}
