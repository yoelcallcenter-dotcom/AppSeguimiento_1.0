import { useCallback, useEffect, useRef, useState } from "react";

/**
 * historialSpeech.js (Release 1.11.1 — Constructor visual de flujos)
 *
 * Historial de deshacer/rehacer LOCAL a la sesión del constructor. Por qué
 * local y no global: el constructor es una vista más del mismo guion, y el
 * editor tradicional no tiene historial propio. Mezclar pasos de ambas vistas
 * produciría "deshacer" que revierte cambios que el usuario no ve.
 *
 * Decisiones:
 * - Snapshots inmutables del speech (el modelo ya devuelve objetos nuevos).
 * - COALESCENCIA por clave: teclear en un campo genera un solo paso de
 *   historial. La clave la arma el panel (`campo:<nodo>:<propiedad>`), así
 *   que pasar de un campo a otro sí crea un paso nuevo.
 * - Límite de 60 pasos para no retener guiones gigantes (el ART tiene ~31
 *   nodos y el texto es acotado, pero el límite evita crecer sin control).
 * - Nunca persiste ni toca storage: al deshacer se llama a `onChange`, que es
 *   el mismo camino de guardado automático del editor.
 */

export const MAX_ENTRADAS_HISTORIAL = 60;

/** Estado inicial: una sola entrada (el guion tal como se abrió). */
export function crearHistorial(speech) {
  return { entradas: [{ speech, clave: null }], indice: 0 };
}

/**
 * Registra un cambio. Si `clave` coincide con la del paso actual, REEMPLAZA el
 * snapshot (tecleo continuo); si no, agrega un paso nuevo y descarta el
 * "futuro" (rehacer). Devuelve siempre un historial nuevo o el mismo si no hay
 * nada que registrar.
 */
export function registrarCambio(historial, speech, clave = null) {
  if (!historial || !Array.isArray(historial.entradas) || !historial.entradas.length) {
    return crearHistorial(speech);
  }
  const actual = historial.entradas[historial.indice];
  if (!actual) return crearHistorial(speech);
  if (actual.speech === speech) return historial;

  // Coalescencia: un solo paso por ráfaga de tecleo en el mismo campo.
  if (clave && actual.clave === clave) {
    const entradas = historial.entradas.slice(0, historial.indice + 1);
    entradas[historial.indice] = { speech, clave };
    return { entradas, indice: entradas.length - 1 };
  }

  const entradas = historial.entradas.slice(0, historial.indice + 1);
  entradas.push({ speech, clave: clave || null });
  while (entradas.length > MAX_ENTRADAS_HISTORIAL) entradas.shift();
  return { entradas, indice: entradas.length - 1 };
}

export function puedeDeshacer(historial) {
  return Boolean(historial && historial.indice > 0);
}

export function puedeRehacer(historial) {
  return Boolean(
    historial &&
      Array.isArray(historial.entradas) &&
      historial.indice < historial.entradas.length - 1
  );
}

/**
 * Hook de sesión. Mantiene los snapshots y expone `aplicar`, `deshacer` y
 * `rehacer`. `aplicar` actualiza el historial ANTES de llamar a `onChange`
 * para que el padre reciba el mismo objeto que quedó en el historial.
 *
 * Sincronización con el padre: si el speech cambia por fuera del constructor
 * (por ejemplo el nombre editado en la cabecera del editor), se agrega como
 * paso externo. La comparación por identidad funciona porque el modelo y
 * `InteractivosView` pasan el MISMO objeto, no una copia.
 */
export function useHistorialSpeech(speech, onCambio) {
  const [historial, setHistorial] = useState(() => crearHistorial(speech));
  const speechRef = useRef(speech);
  const onCambioRef = useRef(onCambio);
  const montadoRef = useRef(false);

  useEffect(() => {
    onCambioRef.current = onCambio;
  }, [onCambio]);

  useEffect(() => {
    if (!montadoRef.current) {
      montadoRef.current = true;
      return;
    }
    if (speech === speechRef.current) return;
    speechRef.current = speech;
    setHistorial((h) => registrarCambio(h, speech, null));
  }, [speech]);

  const aplicar = useCallback((nuevo, opciones = {}) => {
    if (!nuevo || nuevo === speechRef.current) return;
    speechRef.current = nuevo;
    // Release 1.11.1: los cambios sin coalescencia se llaman con `null`
    // (`aplicar(nuevo, null)`); leer `opciones.clave` directamente rompía el
    // constructor al conectar/eliminar/crear. El default solo cubre undefined.
    const clave = opciones && opciones.clave ? opciones.clave : null;
    setHistorial((h) => registrarCambio(h, nuevo, clave));
    if (onCambioRef.current) onCambioRef.current(nuevo);
  }, []);

  const deshacer = useCallback(() => {
    if (!puedeDeshacer(historial)) return;
    const destino = historial.entradas[historial.indice - 1];
    speechRef.current = destino.speech;
    setHistorial({ ...historial, indice: historial.indice - 1 });
    if (onCambioRef.current) onCambioRef.current(destino.speech);
  }, [historial]);

  const rehacer = useCallback(() => {
    if (!puedeRehacer(historial)) return;
    const destino = historial.entradas[historial.indice + 1];
    speechRef.current = destino.speech;
    setHistorial({ ...historial, indice: historial.indice + 1 });
    if (onCambioRef.current) onCambioRef.current(destino.speech);
  }, [historial]);

  return {
    historial,
    aplicar,
    deshacer,
    rehacer,
    puedeDeshacer: puedeDeshacer(historial),
    puedeRehacer: puedeRehacer(historial),
  };
}
