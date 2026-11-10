/** Hooks reutilizables. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { aviso } from './avisos.js';

/** Devuelve una función que dice si el componente sigue en pantalla (para no navegar tarde). */
export function useMontado() {
  const montado = useRef(false);
  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);
  return useCallback(() => montado.current, []);
}

/** Valor que se actualiza solo cuando el usuario deja de escribir. */
export function useRetrasado(valor, ms = 450) {
  const [retrasado, setRetrasado] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setRetrasado(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return retrasado;
}

/**
 * Lista paginada con carga continua.
 * @param {(pagina: number) => Promise<{data: any[], meta: {total_pages: number}}>} cargar
 * @param {string} clave al cambiar (por ejemplo, los filtros), se vuelve a empezar desde la página 1
 */
export function useListaPaginada(cargar, clave) {
  const cargarRef = useRef(cargar);
  cargarRef.current = cargar;
  const generacion = useRef(0);
  const ocupado = useRef(false);
  const [estado, setEstado] = useState({ items: [], pagina: 0, totalPaginas: 1, cargando: true, error: null });
  const estadoRef = useRef(estado);
  estadoRef.current = estado;
  const [reinicio, setReinicio] = useState(0);

  const pedir = useCallback(async (numero) => {
    const gen = generacion.current;
    ocupado.current = true;
    setEstado((s) => ({ ...s, cargando: true }));
    try {
      const r = await cargarRef.current(numero);
      if (gen !== generacion.current) return; // respuesta de una búsqueda anterior
      const nuevos = r.data || [];
      setEstado((s) => ({
        items: numero === 1 ? nuevos : [...s.items, ...nuevos],
        pagina: numero,
        totalPaginas: r.meta?.total_pages || 1,
        cargando: false,
        error: null,
      }));
    } catch (e) {
      if (gen !== generacion.current || e.sesionCerrada) return;
      if (numero === 1) {
        setEstado({ items: [], pagina: 0, totalPaginas: 1, cargando: false, error: e.message });
      } else {
        aviso(e.message);
        setEstado((s) => ({ ...s, cargando: false }));
      }
    } finally {
      if (gen === generacion.current) ocupado.current = false;
    }
  }, []);

  useEffect(() => {
    generacion.current++;
    ocupado.current = false;
    pedir(1);
  }, [clave, reinicio, pedir]);

  const cargarMas = useCallback(() => {
    const s = estadoRef.current;
    if (!ocupado.current && s.pagina > 0 && s.pagina < s.totalPaginas) pedir(s.pagina + 1);
  }, [pedir]);

  const recargar = useCallback(() => setReinicio((n) => n + 1), []);

  /** Reemplaza un elemento ya mostrado (después de editarlo). */
  const actualizarItem = useCallback((nuevo) => {
    setEstado((s) => ({ ...s, items: s.items.map((x) => (x.id === nuevo.id ? { ...x, ...nuevo } : x)) }));
  }, []);

  return { ...estado, cargarMas, recargar, actualizarItem };
}
