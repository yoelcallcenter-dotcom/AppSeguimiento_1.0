/**
 * useSesionLlamada.js (Release 1.11.2 — Modo llamada)
 *
 * Hook que conecta el motor puro `sesionLlamada.js` con React. Es la ÚNICA
 * fuente de estado de una llamada: lo usan `SpeechRunner` (Vista rápida y
 * vista previa del constructor) y `ModoLlamada` (pantalla nueva), así el
 * comportamiento de navegación/gates/finalización es idéntico en ambos.
 *
 * Por qué un hook y no duplicar lógica en cada pantalla: el runner de 1.11.0
 * mezclaba estado y JSX; extraerlo permite que las dos presentaciones
 * compartan reglas sin cambiar el DOM del runner existente (sus tests y la
 * vista previa 1.11.1 siguen pasando).
 *
 * Persistencia: `onCambio` solo se invoca cuando la sesión tuvo una
 * interacción real (`sesionTocada`). Abrir el Modo llamada y salir sin tocar
 * nada NO crea una llamada pendiente.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizarSpeech, validarSpeech, camposObligatoriosPendientes } from "../interactiveSpeechModel";
import {
  aplicarCambio as aplicarCambioPuro,
  analizarCambio as analizarCambioPuro,
  atras as atrasPuro,
  avanzar as avanzarPuro,
  claveAclaracion,
  crearSesion,
  elegirOpcion as elegirOpcionPuro,
  finalizarSesion,
  irAPaso as irAPasoPuro,
  limpiarBorrador as limpiarBorradorPuro,
  puedeAtras,
  registrarConsultada as registrarConsultadaPuro,
  reiniciarSesion,
  sesionTocada,
  setAclaracionSesion,
  setCampoRegistro,
  setNotasSesion,
  toggleCompletada as toggleCompletadaPuro,
} from "./sesionLlamada";

const pasosDe = (guion) => (Array.isArray(guion?.steps) ? guion.steps : []);

export function useSesionLlamada({ speech, sesionInicial = null, onCambio } = {}) {
  // Normalización defensiva: un guion v1 guardado se ejecuta igual; es
  // idempotente y no reescribe storage (mismo criterio que el runner 1.11.0).
  const guion = useMemo(() => normalizarSpeech(speech) || {}, [speech]);
  const steps = useMemo(() => pasosDe(guion), [guion]);
  const errores = useMemo(() => validarSpeech(guion), [guion]);

  const [sesion, setSesion] = useState(() => sesionInicial || crearSesion(guion));

  // Ref espejo: las acciones son síncronas y necesitan la sesión MÁS RECIENTE
  // sin depender del cierre de render (mismo patrón que useStorage).
  const sesionRef = useRef(sesion);
  sesionRef.current = sesion;

  const onCambioRef = useRef(onCambio);
  onCambioRef.current = onCambio;
  useEffect(() => {
    if (sesionTocada(sesion)) onCambioRef.current?.(sesion);
  }, [sesion]);

  // --- Derivados de la posición actual ------------------------------------
  const pasoIdx = steps.findIndex((s) => s && s.id === sesion.pasoId);
  const paso = pasoIdx >= 0 ? steps[pasoIdx] : null;
  const preguntas = useMemo(
    () => (paso && Array.isArray(paso.preguntas) ? paso.preguntas : []),
    [paso]
  );
  const pregunta = preguntas[sesion.preguntaIdx] || null;
  const opciones = useMemo(
    () => (pregunta && Array.isArray(pregunta.opciones) ? pregunta.opciones : []),
    [pregunta]
  );
  const campos = useMemo(
    () => (paso && Array.isArray(paso.camposRegistro) ? paso.camposRegistro : []),
    [paso]
  );
  const estadosFinales = useMemo(
    () => (Array.isArray(guion.estadosFinales) ? guion.estadosFinales : []),
    [guion]
  );

  const pendiente = useMemo(
    () => opciones.find((o) => o && o.id === sesion.borradorOpcionId) || null,
    [opciones, sesion.borradorOpcionId]
  );

  // Aclaración de la opción en borrador (la clave es estable al navegar).
  const clavePend = pendiente
    ? claveAclaracion(sesion.pasoId, sesion.preguntaIdx, pendiente.id)
    : "";
  const textoAclaracion = clavePend ? sesion.aclaraciones[clavePend] || "" : "";
  const bloqueoAclaracion =
    Boolean(pendiente?.requiereAclaracion) && !textoAclaracion.trim();

  // `historial` conserva el contrato del runner (solo necesita longitud):
  // posiciones anteriores a la actual; en la pantalla de fin incluye la última
  // posición real para que "Atrás" siga habilitado.
  const historial = useMemo(() => {
    const hasta = sesion.indice + (sesion.enFin ? 1 : 0);
    return (sesion.camino || []).slice(0, Math.max(0, hasta));
  }, [sesion.camino, sesion.indice, sesion.enFin]);

  const completadas = useMemo(
    () => new Set(Array.isArray(sesion.completadas) ? sesion.completadas : []),
    [sesion.completadas]
  );

  const estadoFinalNombre = useMemo(() => {
    const estado = estadosFinales.find((e) => e && e.id === sesion.estadoFinalId);
    return estado?.nombre || "";
  }, [estadosFinales, sesion.estadoFinalId]);

  const pendientes = useMemo(
    () =>
      paso
        ? camposObligatoriosPendientes(guion, paso.id, sesion.registro)
        : [],
    [guion, paso, sesion.registro]
  );

  // --- Acciones -----------------------------------------------------------
  const reemplazar = useCallback((resultado) => {
    const nueva = resultado?.sesion || resultado;
    if (nueva) setSesion(nueva);
    return resultado?.evento || null;
  }, []);

  const avanzar = useCallback(
    () => reemplazar(avanzarPuro(sesionRef.current, guion)),
    [guion, reemplazar]
  );

  const atras = useCallback(() => {
    setSesion((prev) => atrasPuro(prev));
  }, []);

  const irA = useCallback(
    (stepId) => {
      setSesion((prev) => irAPasoPuro(prev, guion, stepId));
    },
    [guion]
  );

  const reiniciar = useCallback(() => {
    setSesion((prev) => reiniciarSesion(prev, guion));
  }, [guion]);

  const elegir = useCallback((opcionId) => {
    setSesion((prev) => elegirOpcionPuro(prev, opcionId));
  }, []);

  const cambiar = useCallback(() => {
    setSesion((prev) => limpiarBorradorPuro(prev));
  }, []);

  const toggleCompletada = useCallback(() => {
    setSesion((prev) =>
      toggleCompletadaPuro(prev, prev.enFin ? null : prev.pasoId)
    );
  }, []);

  const setCampo = useCallback((campoId, valor) => {
    setSesion((prev) => setCampoRegistro(prev, campoId, valor));
  }, []);

  const setAclaracion = useCallback((clave, texto) => {
    setSesion((prev) => setAclaracionSesion(prev, clave, texto));
  }, []);

  const setNotas = useCallback((notas) => {
    setSesion((prev) => setNotasSesion(prev, notas));
  }, []);

  const registrarConsultada = useCallback((id) => {
    setSesion((prev) => registrarConsultadaPuro(prev, id));
  }, []);

  const finalizar = useCallback(
    (estadoFinalId) => {
      setSesion((prev) => finalizarSesion(prev, guion, estadoFinalId));
    },
    [guion]
  );

  const analizarCambio = useCallback(
    (clave, opcionId) => analizarCambioPuro(sesionRef.current, guion, clave, opcionId),
    [guion]
  );

  const aplicarCambio = useCallback(
    (clave, opcionId) =>
      reemplazar(aplicarCambioPuro(sesionRef.current, guion, clave, opcionId)),
    [guion, reemplazar]
  );

  return {
    // Datos del guion
    guion,
    steps,
    errores,
    // Posición y contenido
    paso,
    pasoIdx,
    preguntas,
    pregunta,
    opciones,
    campos,
    estadosFinales,
    pendiente,
    pendientes,
    clavePend,
    textoAclaracion,
    bloqueoAclaracion,
    // Sesión
    sesion,
    pos: { stepId: sesion.enFin ? null : sesion.pasoId, preguntaIdx: sesion.preguntaIdx },
    historial,
    // Camino completo (posiciones visitadas) e índice actual. El Modo llamada
    // los usa para el breadcrumb del recorrido real; la Vista rápida no los
    // necesita, pero compartirlos no cambia su comportamiento.
    camino: sesion.camino,
    indice: sesion.indice,
    puedeAtras: puedeAtras(sesion),
    // ¿Hubo interacción real? El diálogo de salida lo usa para no hablar de
    // "datos cargados" cuando solo se abrió la pantalla y no se tocó nada.
    tocada: sesionTocada(sesion),
    enFin: sesion.enFin,
    respuestas: sesion.respuestas,
    registro: sesion.registro,
    aclaraciones: sesion.aclaraciones,
    completadas,
    consultadas: sesion.consultadas,
    notas: sesion.notas,
    finalizada: sesion.finalizada,
    estadoFinalId: sesion.estadoFinalId,
    estadoFinalNombre,
    // Acciones
    avanzar,
    atras,
    irA,
    reiniciar,
    elegir,
    cambiar,
    toggleCompletada,
    setCampo,
    setAclaracion,
    setNotas,
    registrarConsultada,
    finalizar,
    analizarCambio,
    aplicarCambio,
  };
}

export default useSesionLlamada;
