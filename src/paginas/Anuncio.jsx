/**
 * Detalle de un anuncio: texto completo, acciones y comentarios.
 *  - Cualquier usuario: da like, guarda, marca favorito y comenta.
 *  - Autor del comentario o administrador: puede borrar un comentario.
 *  - Administrador: puede eliminar el anuncio.
 */
import { useCallback, useEffect, useState } from 'react';
import Barra from '../components/Barra.jsx';
import { Dialogo } from '../components/Dialogo.jsx';
import Icono from '../components/Icono.jsx';
import TarjetaAnuncio from '../components/TarjetaAnuncio.jsx';
import { Cargando, Vacio } from '../components/Varios.jsx';
import { api } from '../lib/api.js';
import { aviso } from '../lib/avisos.js';
import { rolLabel, tiempoRelativo } from '../lib/formato.js';
import { volver } from '../lib/router.js';
import { sesion } from '../lib/sesion.js';

export default function Anuncio({ m }) {
  const id = Number(m[1]);
  const [anuncio, setAnuncio] = useState(null);
  const [comentarios, setComentarios] = useState([]);
  const [error, setError] = useState('');
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const esAdmin = sesion.esAdmin();

  const cargar = useCallback(async () => {
    try {
      const [a, c] = await Promise.all([api.anuncio(id), api.comentarios(id)]);
      setAnuncio(a);
      setComentarios(c.data || []);
      setError('');
    } catch (e) {
      if (!e.sesionCerrada) setError(e.message);
    }
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function enviar(e) {
    e.preventDefault();
    const limpio = texto.trim();
    if (!limpio || enviando) return;
    setEnviando(true);
    try {
      const nuevo = await api.comentar(id, limpio);
      setComentarios((c) => [nuevo, ...c]);
      setAnuncio((a) => ({ ...a, comentarios: a.comentarios + 1 }));
      setTexto('');
    } catch (err) {
      if (!err.sesionCerrada) aviso(err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function borrarComentario(c) {
    try {
      await api.borrarComentario(c.id);
      setComentarios((lista) => lista.filter((x) => x.id !== c.id));
      setAnuncio((a) => ({ ...a, comentarios: Math.max(0, a.comentarios - 1) }));
    } catch (err) {
      if (!err.sesionCerrada) aviso(err.message);
    }
  }

  async function eliminarAnuncio() {
    try {
      await api.borrarAnuncio(id);
      aviso('Anuncio eliminado.');
      volver();
    } catch (err) {
      setConfirmando(false);
      if (!err.sesionCerrada) aviso(err.message);
    }
  }

  return (
    <>
      <Barra titulo="Anuncio" atras
        acciones={esAdmin ? [{ icono: 'borrar', etiqueta: 'Eliminar anuncio', alTocar: () => setConfirmando(true) }] : []} />
      <main className="vista">
        {error ? <Vacio>{error}</Vacio>
          : !anuncio ? <Cargando />
            : (
              <>
                <TarjetaAnuncio a={anuncio} detalle alCambiar={(c) => setAnuncio((a) => ({ ...a, ...c }))} />

                <h2 className="seccion-titulo">Comentarios ({anuncio.comentarios})</h2>
                <form className="comentar" onSubmit={enviar}>
                  <input className="entrada" type="text" maxLength={300} placeholder="Escribe un comentario…"
                    aria-label="Escribe un comentario" autoComplete="off" value={texto}
                    onChange={(e) => setTexto(e.target.value)} />
                  <button type="submit" className="btn btn-lleno" disabled={enviando || !texto.trim()} aria-label="Enviar comentario">
                    <Icono nombre="enviar" />
                  </button>
                </form>

                <div className="lista">
                  {comentarios.map((c) => (
                    <div className="tarjeta comentario" key={c.id}>
                      <div className="comentario-cabeza">
                        <strong>{c.autor}</strong>
                        {c.rol !== 'alumno' && <span className="comentario-rol">{rolLabel(c.rol)}</span>}
                        <span className="comentario-tiempo">{tiempoRelativo(c.fecha_hora)}</span>
                        {(c.es_mio || esAdmin) && (
                          <button type="button" className="icono-btn comentario-borrar" aria-label="Borrar comentario"
                            onClick={() => borrarComentario(c)}>
                            <Icono nombre="borrar" />
                          </button>
                        )}
                      </div>
                      <p className="comentario-texto">{c.texto}</p>
                    </div>
                  ))}
                </div>
                {comentarios.length === 0 && <Vacio>Aún no hay comentarios. ¡Escribe el primero!</Vacio>}
              </>
            )}
      </main>
      {confirmando && (
        <Dialogo
          titulo="Eliminar anuncio"
          alCerrar={() => setConfirmando(false)}
          botones={(
            <>
              <button type="button" className="btn btn-texto" onClick={() => setConfirmando(false)}>Cancelar</button>
              <button type="button" className="btn btn-peligro" onClick={eliminarAnuncio}>Eliminar</button>
            </>
          )}
        >
          <p>Se borrará el anuncio con sus comentarios y marcas. Esta acción no se puede deshacer.</p>
        </Dialogo>
      )}
    </>
  );
}
