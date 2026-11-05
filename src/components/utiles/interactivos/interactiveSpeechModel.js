import { sanitizeString } from "../../../utils/sanitize";
import { buscarObjecion, llavesObjecion } from "./resolveObjeciones";

/**
 * interactiveSpeechModel.js
 * Modelo determinístico del Asistente Interactivo de Llamadas (antes
 * "Speechs Interactivos"): guion → etapas (steps) → preguntas → opciones con
 * ramificaciones (targetStepId). Funciones puras: todas devuelven un speech
 * nuevo (inmutable) para encajar con setState de useStorage.
 *
 * v2 (Release 1.11.0) — cambios y por qué:
 * - Nivel nuevo "preguntas[]" dentro de cada etapa: el guion de referencia
 *   (Guion_interactivo_AppSeguimiento_ART.md) tiene etapas con varias
 *   preguntas, cada una con sus propias opciones. Las opciones de la etapa
 *   (v1) se presentan como una "pregunta implícita" al migrar.
 * - Opciones ampliadas: respuestaSugerida, accion, datosARegistrar,
 *   asignaciones, requiereAclaracion, finalizaLlamada/estadoFinalId,
 *   moduloId (§2.2/§2.3 del spec).
 * - Etapa ampliada: objetivo + camposRegistro[] con 8 tipos (§3).
 * - Guion ampliado: archivado, estadosFinales[], reglas[] (contenido
 *   editable, nunca codificado en el motor §8) y modulos[] (registro
 *   extensible de módulos transversales §2.4).
 * - normalizarSpeech(): migración v1→v2 IDEMPOTENTE y NO destructiva. Los
 *   guiones guardados en storage no se reescriben solos; solo se normalizan
 *   en los puntos de entrada (App, IO, mutadores) y lo editado se persiste ya
 *   en v2. Riesgo: si un punto de entrada no normaliza, un mutador podría
 *   leer "opciones" v1 como pregunta implícita — por eso TODOS los mutadores
 *   pasan cada etapa por pasoNormalizado() antes de tocar nada.
 * - Navegación: sin destino ya NO es un error (avance lineal, §2.2); el
 *   destino solo se valida cuando existe (§4.2 "cuando requieran navegación").
 */

export function nuevoId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Tipos de campo de registro admitidos (§3). Es la única fuente de verdad:
 * la usa el editor (select de tipos), la validación y el runner.
 * "si-no" se almacena como los strings "si" | "no" | "" (vacío = sin responder).
 */
export const TIPOS_CAMPO = [
  { tipo: "texto-corto", etiqueta: "Texto corto" },
  { tipo: "texto-largo", etiqueta: "Texto largo" },
  { tipo: "seleccion-unica", etiqueta: "Selección única" },
  { tipo: "seleccion-multiple", etiqueta: "Selección múltiple" },
  { tipo: "si-no", etiqueta: "Sí / No" },
  { tipo: "fecha", etiqueta: "Fecha" },
  { tipo: "hora", etiqueta: "Hora" },
  { tipo: "observaciones", etiqueta: "Observaciones" },
];

export function esTipoCampoValido(tipo) {
  return TIPOS_CAMPO.some((t) => t.tipo === tipo);
}

// ---------------------------------------------------------------------------
// Lectores defensivos: nunca explotan con datos incompletos (1.9.3) y
// toleran tanto la forma v1 (opciones sueltas en la etapa) como la v2.
// ---------------------------------------------------------------------------

function esObjeto(v) {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

function pasosDe(speech) {
  return Array.isArray(speech?.steps) ? speech.steps : [];
}

function preguntasDe(paso) {
  return Array.isArray(paso?.preguntas) ? paso.preguntas : [];
}

function opcionesDe(pregunta) {
  return Array.isArray(pregunta?.opciones) ? pregunta.opciones : [];
}

function camposDe(paso) {
  return Array.isArray(paso?.camposRegistro) ? paso.camposRegistro : [];
}

function estadosDe(speech) {
  return Array.isArray(speech?.estadosFinales) ? speech.estadosFinales : [];
}

function modulosDe(speech) {
  return Array.isArray(speech?.modulos) ? speech.modulos : [];
}

function reglasDe(speech) {
  return Array.isArray(speech?.reglas) ? speech.reglas : [];
}

/**
 * Módulo transversal por defecto: Objeciones frecuentes (§2.4). Id
 * determinista para que normalizarSea idempotente; duplicarSpeech lo
 * regenera. Solo se agrega si "modulos" falta (v1) o es un guion nuevo:
 * si el usuario elimina el módulo (modulos: []) no vuelve a aparecer.
 */
function crearModuloObjeciones() {
  return { id: "mod-objeciones", tipo: "objeciones", titulo: "Objeciones frecuentes" };
}

// ---------------------------------------------------------------------------
// Constructores
// ---------------------------------------------------------------------------

export function crearPaso(titulo = "", contenido = "") {
  return {
    id: nuevoId(),
    titulo: sanitizeString(String(titulo ?? "").trim()),
    contenido: sanitizeString(String(contenido ?? "")),
    objetivo: "",
    orden: 0,
    // v2: las opciones viven dentro de cada pregunta; una etapa sin preguntas
    // es un "slide" de speech donde solo aplica Siguiente.
    preguntas: [],
    camposRegistro: [],
  };
}

export function crearPregunta(texto = "") {
  return {
    id: nuevoId(),
    texto: sanitizeString(String(texto ?? "")),
    obligatoria: false,
    opciones: [],
  };
}

export function crearOpcion(texto, targetStepId = null) {
  return {
    id: nuevoId(),
    texto: sanitizeString(String(texto ?? "").trim()),
    targetStepId: targetStepId || null,
    orden: 0,
    // --- v2 (1.11.0): ramificación + guía para el operador ---
    respuestaSugerida: "", // qué decirle al trabajador (§2.3)
    accion: "", // qué debe hacer el operador
    datosARegistrar: "", // texto guía de registro (§2.2)
    asignaciones: [], // auto-relleno de campos de la etapa: [{campoId, valor}]
    requiereAclaracion: false, // exige input antes de continuar (§2.2)
    finalizaLlamada: false, // cierra la llamada desde esta opción (§2.5)
    estadoFinalId: null, // estado precargado al finalizar (opcional)
    moduloId: null, // módulo transversal a abrir con esta opción (opcional)
  };
}

export function crearCampoRegistro({ nombre = "", tipo = "texto-corto", obligatorio = false, opciones = [] } = {}) {
  return {
    id: nuevoId(),
    nombre: sanitizeString(String(nombre ?? "").trim()),
    tipo: esTipoCampoValido(tipo) ? tipo : "texto-corto",
    obligatorio: Boolean(obligatorio),
    // Solo los tipos de selección lo usan: lista de valores posibles.
    opciones: (Array.isArray(opciones) ? opciones : [])
      .map((o) => sanitizeString(String(o ?? "").trim()))
      .filter(Boolean),
  };
}

export function crearEstadoFinal(nombre = "") {
  return { id: nuevoId(), nombre: sanitizeString(String(nombre ?? "").trim()) };
}

export function crearModulo({ tipo = "objeciones", titulo = "" } = {}) {
  return {
    id: nuevoId(),
    tipo, // hoy solo "objeciones"; el registro es extensible (§2.4)
    titulo: sanitizeString(String(titulo ?? "").trim()) || "Módulo",
  };
}

export function crearSpeechInteractivo({ nombre, descripcion = "" }) {
  const ahora = new Date().toISOString();
  const inicio = crearPaso("", "");
  return {
    id: nuevoId(),
    nombre: sanitizeString(String(nombre ?? "").trim()),
    descripcion: sanitizeString(String(descripcion ?? "").trim()),
    fechaCreacion: ahora,
    fechaModificacion: ahora,
    version: 1,
    startStepId: inicio.id,
    steps: [inicio],
    // --- v2 (1.11.0) ---
    archivado: false,
    estadosFinales: [], // se cargan por guion (§2.5); vacío = sin catálogo
    reglas: [], // reglas operativas como contenido editable (§8)
    modulos: [crearModuloObjeciones()], // objeciones disponibles por defecto
  };
}

// ---------------------------------------------------------------------------
// Normalización v1 → v2 (idempotente, no destructiva)
// ---------------------------------------------------------------------------

/**
 * Llena los campos nuevos de una opción sin tocar los existentes (id,
 * texto, targetStepId, orden). Devuelve la MISMA referencia si ya está en v2
 * para que normalizarSpeech pueda ser identity-preserving.
 */
function normalizarOpcion(op) {
  if (!esObjeto(op)) return crearOpcion("");
  const idOk = typeof op.id === "string" && op.id.trim();
  const textoOk = typeof op.texto === "string";
  const targetOk = op.targetStepId === null || op.targetStepId === undefined || typeof op.targetStepId === "string";
  const yaV2 =
    idOk &&
    textoOk &&
    targetOk &&
    typeof op.respuestaSugerida === "string" &&
    typeof op.accion === "string" &&
    typeof op.datosARegistrar === "string" &&
    typeof op.requiereAclaracion === "boolean" &&
    typeof op.finalizaLlamada === "boolean" &&
    Array.isArray(op.asignaciones) &&
    "estadoFinalId" in op &&
    "moduloId" in op;
  if (yaV2) return op;
  return {
    ...op,
    id: idOk ? op.id : nuevoId(), // id faltante: se genera una vez y queda fijo
    texto: textoOk ? op.texto : "",
    targetStepId: typeof op.targetStepId === "string" && op.targetStepId ? op.targetStepId : null,
    respuestaSugerida: typeof op.respuestaSugerida === "string" ? op.respuestaSugerida : "",
    accion: typeof op.accion === "string" ? op.accion : "",
    datosARegistrar: typeof op.datosARegistrar === "string" ? op.datosARegistrar : "",
    asignaciones: Array.isArray(op.asignaciones)
      ? op.asignaciones.filter((a) => esObjeto(a) && typeof a.campoId === "string")
      : [],
    requiereAclaracion: Boolean(op.requiereAclaracion),
    finalizaLlamada: Boolean(op.finalizaLlamada),
    estadoFinalId: typeof op.estadoFinalId === "string" && op.estadoFinalId ? op.estadoFinalId : null,
    moduloId: typeof op.moduloId === "string" && op.moduloId ? op.moduloId : null,
  };
}

function normalizarPregunta(pr) {
  if (!esObjeto(pr)) return crearPregunta(); // registro corrupto irreparable
  const ops = Array.isArray(pr.opciones) ? pr.opciones : [];
  const opsNorm = ops.map(normalizarOpcion);
  const idOk = typeof pr.id === "string" && pr.id.trim();
  const textoOk = typeof pr.texto === "string";
  const obligOk = typeof pr.obligatoria === "boolean";
  const opsOk = Array.isArray(pr.opciones) && opsNorm.every((o, i) => o === ops[i]);
  if (idOk && textoOk && obligOk && opsOk) return pr;
  return {
    ...pr,
    id: idOk ? pr.id : nuevoId(),
    texto: textoOk ? pr.texto : "",
    obligatoria: obligOk ? pr.obligatoria : false,
    opciones: opsNorm,
  };
}

function normalizarCampo(c) {
  if (!esObjeto(c)) return crearCampoRegistro();
  const idOk = typeof c.id === "string" && c.id.trim();
  const nombreOk = typeof c.nombre === "string";
  const tipoOk = typeof c.tipo === "string";
  const obligOk = typeof c.obligatorio === "boolean";
  const opsOk = Array.isArray(c.opciones);
  if (idOk && nombreOk && tipoOk && obligOk && opsOk) return c;
  return {
    ...c,
    id: idOk ? c.id : nuevoId(),
    nombre: nombreOk ? c.nombre : "",
    tipo: tipoOk ? c.tipo : "texto-corto",
    obligatorio: obligOk ? c.obligatorio : false,
    opciones: opsOk ? c.opciones : [],
  };
}

/**
 * Pregunta implícita para migrar una etapa v1: las opciones que vivían
 * directo en la etapa pasan a una única pregunta sin texto (el speech de la
 * etapa ya era el disparador). Id DETERMINISTA por etapa para que migrar dos
 * veces el mismo guion produzca el mismo resultado (test de idempotencia).
 */
function preguntaImplicita(opcionesV1, pasoId) {
  return {
    id: typeof pasoId === "string" && pasoId ? `preg-${pasoId}` : nuevoId(),
    texto: "",
    obligatoria: false,
    opciones: (Array.isArray(opcionesV1) ? opcionesV1 : []).map(normalizarOpcion),
  };
}

/**
 * Normaliza una etapa a forma v2. Siempre es seguro aplicarla: conserva
 * todos los datos (las opciones v1 se envuelven, no se borran) y devuelve la
 * misma referencia cuando la etapa ya está en v2.
 */
function pasoNormalizado(paso) {
  if (!esObjeto(paso)) return paso;
  let resultado = paso;

  if (!Array.isArray(resultado.preguntas)) {
    // Forma v1 (u objeto incompleto): se envuelve en una pregunta implícita.
    const tieneOpcionesV1 = "opciones" in resultado;
    const opcionesV1 = resultado.opciones;
    const { opciones: _opciones, ...resto } = resultado;
    resultado = tieneOpcionesV1
      ? { ...resto, preguntas: [preguntaImplicita(opcionesV1, resultado.id)] }
      : { ...resto, preguntas: [] };
  } else if ("opciones" in resultado) {
    // Estado inconsistente (ambas claves): manda "preguntas" (ya normalizado
    // en pasadas anteriores); "opciones" es un espejo obsoleto de v1.
    const { opciones: _opciones, ...resto } = resultado;
    resultado = resto;
  }

  const objetivoOk = typeof resultado.objetivo === "string";
  const camposOk = Array.isArray(resultado.camposRegistro);
  if (!objetivoOk || !camposOk) {
    resultado = {
      ...resultado,
      objetivo: objetivoOk ? resultado.objetivo : "",
      camposRegistro: camposOk ? resultado.camposRegistro.map(normalizarCampo) : [],
    };
  } else if (resultado.camposRegistro.some((c, i) => normalizarCampo(c) !== resultado.camposRegistro[i])) {
    resultado = { ...resultado, camposRegistro: resultado.camposRegistro.map(normalizarCampo) };
  }

  const preguntas = preguntasDe(resultado);
  const preguntasNorm = preguntas.map(normalizarPregunta);
  if (preguntasNorm.some((pr, i) => pr !== preguntas[i])) {
    resultado = { ...resultado, preguntas: preguntasNorm };
  }
  return resultado;
}

function normalizarModulo(m) {
  if (!esObjeto(m)) return null; // basura: se descarta (irreparable)
  const idOk = typeof m.id === "string" && m.id.trim();
  const tipoOk = typeof m.tipo === "string" && m.tipo.trim();
  const tituloOk = typeof m.titulo === "string";
  if (idOk && tipoOk && tituloOk) return m;
  return { ...m, id: idOk ? m.id : nuevoId(), tipo: tipoOk ? m.tipo : "objeciones", titulo: tituloOk ? m.titulo : "" };
}

function normalizarEstado(e) {
  if (!esObjeto(e)) return null;
  const idOk = typeof e.id === "string" && e.id.trim();
  const nombreOk = typeof e.nombre === "string";
  if (idOk && nombreOk) return e;
  return { ...e, id: idOk ? e.id : nuevoId(), nombre: nombreOk ? e.nombre : "" };
}

/** ¿El guion ya está 100% en v2? Chequeo profundo pero barato (listas chicas). */
function estaNormalizado(speech) {
  if (typeof speech.archivado !== "boolean") return false;
  if (!Array.isArray(speech.estadosFinales) || !Array.isArray(speech.reglas) || !Array.isArray(speech.modulos)) {
    return false;
  }
  if (speech.estadosFinales.some((e) => normalizarEstado(e) !== e)) return false;
  if (speech.modulos.some((m) => normalizarModulo(m) !== m)) return false;
  if (!Array.isArray(speech.steps)) return true; // sin steps no hay más que normalizar
  return speech.steps.every((paso) => {
    if (!esObjeto(paso)) return false;
    if (!Array.isArray(paso.preguntas)) return false;
    if ("opciones" in paso) return false;
    if (typeof paso.objetivo !== "string" || !Array.isArray(paso.camposRegistro)) return false;
    if (paso.camposRegistro.some((c, i) => normalizarCampo(c) !== paso.camposRegistro[i])) return false;
    // normalizarPregunta ya compara sus opciones anidadas por referencia.
    return paso.preguntas.every((pr) => normalizarPregunta(pr) === pr);
  });
}

/**
 * Punto de entrada único de la migración v1→v2. Idempotente (dos
 * normalizaciones seguidas devuelven el mismo objeto) y preservadora de
 * referencias: si ya está en v2 devuelve el MISMO objeto.
 */
export function normalizarSpeech(speech) {
  if (!esObjeto(speech)) return speech;
  if (estaNormalizado(speech)) return speech;

  const steps = Array.isArray(speech.steps)
    ? reindexar(speech.steps)
    : speech.steps; // si steps es corrupto, se deja intacto (lo flaggea validar*)
  const estados = Array.isArray(speech.estadosFinales)
    ? speech.estadosFinales.map(normalizarEstado).filter(Boolean)
    : [];
  const modulos = Array.isArray(speech.modulos)
    ? speech.modulos.map(normalizarModulo).filter(Boolean)
    : [crearModuloObjeciones()];
  const reglas = Array.isArray(speech.reglas) ? speech.reglas.filter((r) => typeof r === "string") : [];

  return {
    ...speech,
    archivado: typeof speech.archivado === "boolean" ? speech.archivado : false,
    estadosFinales: estados,
    reglas,
    modulos,
    steps,
  };
}

// ---------------------------------------------------------------------------
// Utilidades internas de mutación
// ---------------------------------------------------------------------------

function conCambio(speech) {
  return {
    ...speech,
    fechaModificacion: new Date().toISOString(),
    version: (speech.version || 0) + 1,
  };
}

/**
 * Reindexa orden de etapas y de opciones (dentro de cada pregunta) y, de
 * paso, normaliza cada etapa a v2: cualquier edición deja el guion en forma
 * nueva sin tocar los datos existentes.
 */
function reindexar(steps) {
  return steps.map((paso, i) => {
    const p = pasoNormalizado(paso);
    return {
      ...p,
      orden: i,
      preguntas: preguntasDe(p).map((pr) => ({
        ...pr,
        opciones: opcionesDe(pr).map((op, j) => ({ ...op, orden: j })),
      })),
    };
  });
}

/** Aplica fn solo a la etapa indicada (ya normalizada) y reindexa. */
function mapPaso(speech, stepId, fn) {
  return reindexar(pasosDe(speech).map((paso) => (paso.id !== stepId ? paso : fn(pasoNormalizado(paso)))));
}

/** Recorre TODAS las opciones de la etapa (viven en sus preguntas). */
function mapOpcionEnPaso(paso, opcionId, fn) {
  let huboCambio = false;
  const preguntas = preguntasDe(paso).map((pr) => {
    const ops = opcionesDe(pr);
    const idx = ops.findIndex((op) => op.id === opcionId);
    if (idx === -1) return pr;
    huboCambio = true;
    const nuevas = [...ops];
    nuevas[idx] = fn(nuevas[idx]);
    return { ...pr, opciones: nuevas };
  });
  return huboCambio ? { ...paso, preguntas } : paso;
}

function normalizarAsignaciones(lista) {
  return (Array.isArray(lista) ? lista : [])
    .filter((a) => esObjeto(a) && typeof a.campoId === "string" && a.campoId)
    .map((a) => ({
      campoId: a.campoId,
      valor: sanitizeString(String(a.valor ?? "")),
    }));
}

// ---------------------------------------------------------------------------
// Información general del guion
// ---------------------------------------------------------------------------

export function actualizarInfo(speech, { nombre, descripcion }) {
  return conCambio({
    ...speech,
    nombre: sanitizeString(String(nombre ?? speech.nombre ?? "").trim()),
    descripcion: sanitizeString(String(descripcion ?? speech.descripcion ?? "").trim()),
  });
}

/** Archivar/desarchivar (§6.1): el guion archivado queda fuera del flujo activo. */
export function setArchivado(speech, archivado) {
  if (Boolean(speech?.archivado) === Boolean(archivado)) return speech;
  return conCambio({ ...speech, archivado: Boolean(archivado) });
}

/**
 * Reglas operativas (§8): contenido editable del guion, NUNCA codificado en
 * el motor. Se guardan como líneas de texto.
 */
export function actualizarReglas(speech, reglas) {
  const lista = (Array.isArray(reglas) ? reglas : [])
    .filter((r) => typeof r === "string")
    .map((r) => sanitizeString(r));
  return conCambio({ ...speech, reglas: lista });
}

// ---------------------------------------------------------------------------
// Etapas (steps)
// ---------------------------------------------------------------------------

export function agregarPaso(speech) {
  const paso = crearPaso("", "");
  return conCambio({
    ...speech,
    steps: reindexar([...pasosDe(speech), paso]),
    startStepId: speech.startStepId || paso.id,
  });
}

export function duplicarPaso(speech, stepId) {
  const pasos = pasosDe(speech);
  const idx = pasos.findIndex((s) => s.id === stepId);
  if (idx === -1) return speech;
  const original = pasoNormalizado(pasos[idx]);
  // IDs nuevos en preguntas, opciones y campos; las asignaciones de las
  // opciones clonadas se re-apuntan a los campos clonados de ESTA etapa.
  const mapaCampos = new Map();
  const campos = camposDe(original).map((c) => {
    const idNuevo = nuevoId();
    mapaCampos.set(c.id, idNuevo);
    return { ...c, id: idNuevo };
  });
  const copia = {
    ...original,
    id: nuevoId(),
    titulo: original.titulo ? `${original.titulo} (copia)` : "",
    camposRegistro: campos,
    preguntas: preguntasDe(original).map((pr) => ({
      ...pr,
      id: nuevoId(),
      opciones: opcionesDe(pr).map((op) => ({
        ...op,
        id: nuevoId(),
        asignaciones: (Array.isArray(op.asignaciones) ? op.asignaciones : []).map((a) =>
          mapaCampos.has(a.campoId) ? { ...a, campoId: mapaCampos.get(a.campoId) } : a
        ),
      })),
    })),
  };
  const steps = [...pasos];
  steps.splice(idx + 1, 0, copia);
  return conCambio({ ...speech, steps: reindexar(steps) });
}

export function eliminarPaso(speech, stepId, destinoReemplazo = null) {
  const pasos = pasosDe(speech);
  const valido =
    destinoReemplazo &&
    destinoReemplazo !== stepId &&
    pasos.some((s) => s.id === destinoReemplazo)
      ? destinoReemplazo
      : null;
  const steps = pasos
    .filter((s) => s.id !== stepId)
    .map((paso) => {
      const p = pasoNormalizado(paso);
      return {
        ...p,
        preguntas: preguntasDe(p).map((pr) => ({
          ...pr,
          opciones: opcionesDe(pr).map((op) =>
            op.targetStepId === stepId ? { ...op, targetStepId: valido } : op
          ),
        })),
      };
    });
  const startStepId =
    speech.startStepId === stepId
      ? steps.length
        ? steps[0].id
        : null
      : speech.startStepId;
  return conCambio({ ...speech, steps: reindexar(steps), startStepId });
}

export function referenciasA(speech, stepId) {
  const refs = [];
  pasosDe(speech).forEach((paso) => {
    if (paso.id === stepId) return;
    preguntasDe(pasoNormalizado(paso)).forEach((pr) => {
      opcionesDe(pr).forEach((op) => {
        if (op.targetStepId === stepId) refs.push({ stepId: paso.id, opcionId: op.id });
      });
    });
  });
  return refs;
}

export function moverPaso(speech, stepId, delta) {
  const pasos = pasosDe(speech);
  const idx = pasos.findIndex((s) => s.id === stepId);
  const destino = idx + delta;
  if (idx === -1 || destino < 0 || destino >= pasos.length) return speech;
  const steps = [...pasos];
  const [movido] = steps.splice(idx, 1);
  steps.splice(destino, 0, movido);
  return conCambio({ ...speech, steps: reindexar(steps) });
}

export function actualizarPaso(speech, stepId, cambios = {}) {
  return conCambio({
    ...speech,
    steps: mapPaso(speech, stepId, (paso) => ({
      ...paso,
      titulo:
        cambios.titulo !== undefined
          ? sanitizeString(String(cambios.titulo).trim())
          : paso.titulo,
      contenido:
        cambios.contenido !== undefined
          ? sanitizeString(String(cambios.contenido))
          : paso.contenido,
      objetivo:
        cambios.objetivo !== undefined
          ? sanitizeString(String(cambios.objetivo))
          : paso.objetivo,
    })),
  });
}

export function marcarInicio(speech, stepId) {
  if (!pasosDe(speech).some((s) => s.id === stepId)) return speech;
  return conCambio({ ...speech, startStepId: stepId });
}

// ---------------------------------------------------------------------------
// Preguntas (nivel nuevo en 1.11.0)
// ---------------------------------------------------------------------------

export function agregarPregunta(speech, stepId, texto = "") {
  return conCambio({
    ...speech,
    steps: mapPaso(speech, stepId, (paso) => ({
      ...paso,
      preguntas: [...preguntasDe(paso), crearPregunta(texto)],
    })),
  });
}

export function actualizarPregunta(speech, stepId, preguntaId, cambios = {}) {
  return conCambio({
    ...speech,
    steps: mapPaso(speech, stepId, (paso) => ({
      ...paso,
      preguntas: preguntasDe(paso).map((pr) =>
        pr.id !== preguntaId
          ? pr
          : {
              ...pr,
              texto: cambios.texto !== undefined ? sanitizeString(String(cambios.texto)) : pr.texto,
              obligatoria:
                cambios.obligatoria !== undefined ? Boolean(cambios.obligatoria) : pr.obligatoria,
            }
      ),
    })),
  });
}

/**
 * Eliminar una pregunta elimina también sus opciones (viven dentro). Sin
 * referencias externas hacia preguntas, así que es seguro.
 */
export function eliminarPregunta(speech, stepId, preguntaId) {
  const actual = pasosDe(speech).find((s) => s.id === stepId);
  if (!actual || !preguntasDe(actual).some((pr) => pr.id === preguntaId)) return speech;
  return conCambio({
    ...speech,
    steps: mapPaso(speech, stepId, (paso) => ({
      ...paso,
      preguntas: preguntasDe(paso).filter((pr) => pr.id !== preguntaId),
    })),
  });
}

export function moverPregunta(speech, stepId, preguntaId, delta) {
  const actual = pasosDe(speech).find((s) => s.id === stepId);
  if (!actual) return speech;
  const preguntas = preguntasDe(actual);
  const idx = preguntas.findIndex((pr) => pr.id === preguntaId);
  const destino = idx + delta;
  if (idx === -1 || destino < 0 || destino >= preguntas.length) return speech;
  const nuevas = [...preguntas];
  const [movida] = nuevas.splice(idx, 1);
  nuevas.splice(destino, 0, movida);
  return conCambio({
    ...speech,
    steps: mapPaso(speech, stepId, (paso) => ({ ...paso, preguntas: nuevas })),
  });
}

// ---------------------------------------------------------------------------
// Opciones (viven en las preguntas)
// ---------------------------------------------------------------------------

/**
 * Agrega una opción. Sin preguntaId se usa la primera; si la etapa no tiene
 * preguntas se crea la primera (así sigue funcionando el flujo v1 de
 * "agregar opción" y el paso queda con una pregunta implícita).
 */
export function agregarOpcion(speech, stepId, texto = "", preguntaId = null) {
  return conCambio({
    ...speech,
    steps: mapPaso(speech, stepId, (paso) => {
      const preguntas = preguntasDe(paso);
      if (!preguntas.length) {
        return { ...paso, preguntas: [{ ...crearPregunta(), opciones: [crearOpcion(texto)] }] };
      }
      const idx = preguntaId ? preguntas.findIndex((pr) => pr.id === preguntaId) : 0;
      if (idx === -1) return paso;
      return {
        ...paso,
        preguntas: preguntas.map((pr, k) =>
          k !== idx ? pr : { ...pr, opciones: [...opcionesDe(pr), crearOpcion(texto)] }
        ),
      };
    }),
  });
}

/**
 * Actualiza una opción por id (se busca en todas las preguntas de la etapa).
 * Acepta los campos v1 (texto, targetStepId) y los nuevos de 1.11.0.
 */
export function actualizarOpcion(speech, stepId, opcionId, cambios = {}) {
  return conCambio({
    ...speech,
    steps: mapPaso(speech, stepId, (paso) =>
      mapOpcionEnPaso(paso, opcionId, (op) => ({
        ...op,
        texto:
          cambios.texto !== undefined ? sanitizeString(String(cambios.texto).trim()) : op.texto,
        targetStepId:
          cambios.targetStepId !== undefined ? cambios.targetStepId || null : op.targetStepId,
        respuestaSugerida:
          cambios.respuestaSugerida !== undefined
            ? sanitizeString(String(cambios.respuestaSugerida))
            : op.respuestaSugerida,
        accion: cambios.accion !== undefined ? sanitizeString(String(cambios.accion)) : op.accion,
        datosARegistrar:
          cambios.datosARegistrar !== undefined
            ? sanitizeString(String(cambios.datosARegistrar))
            : op.datosARegistrar,
        asignaciones:
          cambios.asignaciones !== undefined
            ? normalizarAsignaciones(cambios.asignaciones)
            : op.asignaciones,
        requiereAclaracion:
          cambios.requiereAclaracion !== undefined
            ? Boolean(cambios.requiereAclaracion)
            : op.requiereAclaracion,
        finalizaLlamada:
          cambios.finalizaLlamada !== undefined ? Boolean(cambios.finalizaLlamada) : op.finalizaLlamada,
        estadoFinalId:
          cambios.estadoFinalId !== undefined ? cambios.estadoFinalId || null : op.estadoFinalId,
        moduloId: cambios.moduloId !== undefined ? cambios.moduloId || null : op.moduloId,
      }))
    ),
  });
}

export function eliminarOpcion(speech, stepId, opcionId) {
  const actual = pasosDe(speech).find((s) => s.id === stepId);
  if (!actual) return speech;
  const existe = preguntasDe(pasoNormalizado(actual)).some((pr) =>
    opcionesDe(pr).some((op) => op.id === opcionId)
  );
  if (!existe) return speech;
  return conCambio({
    ...speech,
    steps: mapPaso(speech, stepId, (paso) => ({
      ...paso,
      preguntas: preguntasDe(paso).map((pr) => ({
        ...pr,
        opciones: opcionesDe(pr).filter((op) => op.id !== opcionId),
      })),
    })),
  });
}

export function moverOpcion(speech, stepId, opcionId, delta) {
  const actual = pasosDe(speech).find((s) => s.id === stepId);
  if (!actual) return speech;
  let huboCambio = false;
  const preguntas = preguntasDe(pasoNormalizado(actual)).map((pr) => {
    const ops = opcionesDe(pr);
    const pos = ops.findIndex((op) => op.id === opcionId);
    if (pos === -1) return pr;
    const destino = pos + delta;
    if (destino < 0 || destino >= ops.length) return pr;
    huboCambio = true;
    const nuevas = [...ops];
    const [movida] = nuevas.splice(pos, 1);
    nuevas.splice(destino, 0, movida);
    return { ...pr, opciones: nuevas };
  });
  if (!huboCambio) return speech;
  return conCambio({
    ...speech,
    steps: reindexar(
      pasosDe(speech).map((p) => (p.id !== stepId ? p : { ...pasoNormalizado(p), preguntas }))
    ),
  });
}

export function duplicarOpcion(speech, stepId, opcionId) {
  const actual = pasosDe(speech).find((s) => s.id === stepId);
  if (!actual) return speech;
  let huboCambio = false;
  const preguntas = preguntasDe(pasoNormalizado(actual)).map((pr) => {
    const ops = opcionesDe(pr);
    const pos = ops.findIndex((op) => op.id === opcionId);
    if (pos === -1) return pr;
    huboCambio = true;
    const nuevas = [...ops];
    nuevas.splice(pos + 1, 0, { ...ops[pos], id: nuevoId() });
    return { ...pr, opciones: nuevas };
  });
  if (!huboCambio) return speech;
  return conCambio({
    ...speech,
    steps: reindexar(
      pasosDe(speech).map((p) => (p.id !== stepId ? p : { ...pasoNormalizado(p), preguntas }))
    ),
  });
}

export function crearPasoConectado(speech, stepIdOrigen, opcionId) {
  const origen = pasosDe(speech).find((s) => s.id === stepIdOrigen);
  if (!origen) return speech;
  const existe = preguntasDe(pasoNormalizado(origen)).some((pr) =>
    opcionesDe(pr).some((op) => op.id === opcionId)
  );
  if (!existe) return speech;
  const nuevo = crearPaso("", "");
  const steps = pasosDe(speech).map((paso) => {
    if (paso.id !== stepIdOrigen) return paso;
    const p = pasoNormalizado(paso);
    return {
      ...p,
      preguntas: preguntasDe(p).map((pr) => ({
        ...pr,
        opciones: opcionesDe(pr).map((op) =>
          op.id !== opcionId ? op : { ...op, targetStepId: nuevo.id }
        ),
      })),
    };
  });
  return conCambio({ ...speech, steps: reindexar([...steps, nuevo]) });
}

// ---------------------------------------------------------------------------
// Campos de registro por etapa (§3)
// ---------------------------------------------------------------------------

export function agregarCampo(speech, stepId, datos = {}) {
  return conCambio({
    ...speech,
    steps: mapPaso(speech, stepId, (paso) => ({
      ...paso,
      camposRegistro: [...camposDe(paso), crearCampoRegistro(datos)],
    })),
  });
}

export function actualizarCampo(speech, stepId, campoId, cambios = {}) {
  return conCambio({
    ...speech,
    steps: mapPaso(speech, stepId, (paso) => ({
      ...paso,
      camposRegistro: camposDe(paso).map((c) => {
        if (c.id !== campoId) return c;
        const siguiente = { ...c };
        if (cambios.nombre !== undefined) siguiente.nombre = sanitizeString(String(cambios.nombre).trim());
        if (cambios.tipo !== undefined && esTipoCampoValido(cambios.tipo)) {
          siguiente.tipo = cambios.tipo;
          // Al cambiar a un tipo sin lista, las opciones dejan de aplicarse
          // pero se conservan (no destructivo: si vuelve a selección siguen).
        }
        if (cambios.obligatorio !== undefined) siguiente.obligatorio = Boolean(cambios.obligatorio);
        if (cambios.opciones !== undefined) {
          siguiente.opciones = (Array.isArray(cambios.opciones) ? cambios.opciones : [])
            .map((o) => sanitizeString(String(o ?? "").trim()))
            .filter(Boolean);
        }
        return siguiente;
      }),
    })),
  });
}

/**
 * Eliminar un campo además purga las asignaciones de las opciones de la
 * etapa que lo referenciaban (evita referencias rotas al validar).
 */
export function eliminarCampo(speech, stepId, campoId) {
  const actual = pasosDe(speech).find((s) => s.id === stepId);
  if (!actual || !camposDe(actual).some((c) => c.id === campoId)) return speech;
  return conCambio({
    ...speech,
    steps: mapPaso(speech, stepId, (paso) => ({
      ...paso,
      camposRegistro: camposDe(paso).filter((c) => c.id !== campoId),
      preguntas: preguntasDe(paso).map((pr) => ({
        ...pr,
        opciones: opcionesDe(pr).map((op) =>
          Array.isArray(op.asignaciones) && op.asignaciones.some((a) => a.campoId === campoId)
            ? { ...op, asignaciones: op.asignaciones.filter((a) => a.campoId !== campoId) }
            : op
        ),
      })),
    })),
  });
}

export function moverCampo(speech, stepId, campoId, delta) {
  const actual = pasosDe(speech).find((s) => s.id === stepId);
  if (!actual) return speech;
  const campos = camposDe(actual);
  const idx = campos.findIndex((c) => c.id === campoId);
  const destino = idx + delta;
  if (idx === -1 || destino < 0 || destino >= campos.length) return speech;
  const nuevos = [...campos];
  const [movido] = nuevos.splice(idx, 1);
  nuevos.splice(destino, 0, movido);
  return conCambio({
    ...speech,
    steps: mapPaso(speech, stepId, (paso) => ({ ...paso, camposRegistro: nuevos })),
  });
}

// ---------------------------------------------------------------------------
// Estados finales (§2.5) — catálogo configurable por guion
// ---------------------------------------------------------------------------

export function agregarEstadoFinal(speech, nombre = "") {
  return conCambio({ ...speech, estadosFinales: [...estadosDe(speech), crearEstadoFinal(nombre)] });
}

export function actualizarEstadoFinal(speech, estadoId, cambios = {}) {
  const existe = estadosDe(speech).some((e) => e.id === estadoId);
  if (!existe) return speech;
  return conCambio({
    ...speech,
    estadosFinales: estadosDe(speech).map((e) =>
      e.id !== estadoId
        ? e
        : {
            ...e,
            nombre:
              cambios.nombre !== undefined
                ? sanitizeString(String(cambios.nombre).trim())
                : e.nombre,
          }
    ),
  });
}

/**
 * Eliminar un estado además limpia las opciones que lo precargaban
 * (estadoFinalId → null) para no dejar referencias rotas.
 */
export function eliminarEstadoFinal(speech, estadoId) {
  if (!estadosDe(speech).some((e) => e.id === estadoId)) return speech;
  const steps = pasosDe(speech).map((paso) => {
    const p = pasoNormalizado(paso);
    return {
      ...p,
      preguntas: preguntasDe(p).map((pr) => ({
        ...pr,
        opciones: opcionesDe(pr).map((op) =>
          op.estadoFinalId === estadoId ? { ...op, estadoFinalId: null } : op
        ),
      })),
    };
  });
  return conCambio({
    ...speech,
    estadosFinales: estadosDe(speech).filter((e) => e.id !== estadoId),
    steps: reindexar(steps),
  });
}

// ---------------------------------------------------------------------------
// Módulos transversales (§2.4) — registro extensible
// ---------------------------------------------------------------------------

export function agregarModulo(speech, datos = {}) {
  return conCambio({ ...speech, modulos: [...modulosDe(speech), crearModulo(datos)] });
}

export function actualizarModulo(speech, moduloId, cambios = {}) {
  if (!modulosDe(speech).some((m) => m.id === moduloId)) return speech;
  return conCambio({
    ...speech,
    modulos: modulosDe(speech).map((m) =>
      m.id !== moduloId
        ? m
        : { ...m, titulo: cambios.titulo !== undefined ? sanitizeString(String(cambios.titulo).trim()) : m.titulo }
    ),
  });
}

/** Eliminar un módulo limpia las opciones que lo abrían (moduloId → null). */
export function eliminarModulo(speech, moduloId) {
  if (!modulosDe(speech).some((m) => m.id === moduloId)) return speech;
  const steps = pasosDe(speech).map((paso) => {
    const p = pasoNormalizado(paso);
    return {
      ...p,
      preguntas: preguntasDe(p).map((pr) => ({
        ...pr,
        opciones: opcionesDe(pr).map((op) =>
          op.moduloId === moduloId ? { ...op, moduloId: null } : op
        ),
      })),
    };
  });
  return conCambio({
    ...speech,
    modulos: modulosDe(speech).filter((m) => m.id !== moduloId),
    steps: reindexar(steps),
  });
}

// ---------------------------------------------------------------------------
// Duplicar guion (§5.3: ids nuevos + referencias re-apuntadas)
// ---------------------------------------------------------------------------

export function duplicarSpeech(speech) {
  const ahora = new Date().toISOString();
  const mapaSteps = new Map();
  const mapaCampos = new Map();
  const mapaEstados = new Map();
  const mapaModulos = new Map();

  const steps = pasosDe(speech).map((raw) => {
    const paso = pasoNormalizado(raw);
    const idStepNuevo = nuevoId();
    mapaSteps.set(paso.id, idStepNuevo);
    const campos = camposDe(paso).map((c) => {
      const idNuevo = nuevoId();
      mapaCampos.set(c.id, idNuevo);
      return { ...c, id: idNuevo };
    });
    return {
      ...paso,
      id: idStepNuevo,
      camposRegistro: campos,
      preguntas: preguntasDe(paso).map((pr) => ({
        ...pr,
        id: nuevoId(),
        opciones: opcionesDe(pr).map((op) => ({ ...op, id: nuevoId() })),
      })),
    };
  });

  const stepsFinales = steps.map((paso) => ({
    ...paso,
    preguntas: preguntasDe(paso).map((pr) => ({
      ...pr,
      opciones: opcionesDe(pr).map((op) => ({
        ...op,
        targetStepId: mapaSteps.has(op.targetStepId) ? mapaSteps.get(op.targetStepId) : op.targetStepId,
        asignaciones: (Array.isArray(op.asignaciones) ? op.asignaciones : []).map((a) =>
          mapaCampos.has(a.campoId) ? { ...a, campoId: mapaCampos.get(a.campoId) } : a
        ),
      })),
    })),
  }));

  const estadosFinales = estadosDe(speech).map((e) => {
    const idNuevo = nuevoId();
    mapaEstados.set(e.id, idNuevo);
    return { ...e, id: idNuevo };
  });
  const modulos = modulosDe(speech).map((m) => {
    const idNuevo = nuevoId();
    mapaModulos.set(m.id, idNuevo);
    return { ...m, id: idNuevo };
  });

  // Re-apuntar estados y módulos referenciados por opciones de la copia.
  const stepsConRefs = stepsFinales.map((paso) => ({
    ...paso,
    preguntas: preguntasDe(paso).map((pr) => ({
      ...pr,
      opciones: opcionesDe(pr).map((op) => ({
        ...op,
        estadoFinalId: mapaEstados.has(op.estadoFinalId) ? mapaEstados.get(op.estadoFinalId) : op.estadoFinalId,
        moduloId: mapaModulos.has(op.moduloId) ? mapaModulos.get(op.moduloId) : op.moduloId,
      })),
    })),
  }));

  return {
    ...speech,
    id: nuevoId(),
    nombre: `${speech.nombre || ""} (copia)`.trim(),
    fechaCreacion: ahora,
    fechaModificacion: ahora,
    version: 1,
    // Una copia siempre nace activa, aunque el original esté archivado.
    archivado: false,
    startStepId: mapaSteps.has(speech.startStepId) ? mapaSteps.get(speech.startStepId) : speech.startStepId,
    steps: stepsConRefs,
    estadosFinales,
    modulos,
    // reglas[] es texto puro: se copia tal cual (mismo contenido, sin ids).
    reglas: reglasDe(speech).slice(),
  };
}

// ---------------------------------------------------------------------------
// Alcanzabilidad y advertencias
// ---------------------------------------------------------------------------

/**
 * Etapas alcanzables desde el INICIO siguiendo las aristas de ramificación
 * (targetStepId) Y el avance lineal (botón Siguiente lleva a la etapa
 * siguiente por orden). Sin la arista lineal, los guiones que avanzan en
 * línea sin destinos explícitos generaban huérfanos falsos (1.11.0).
 */
export function pasosAlcanzables(speech) {
  const alcanzables = new Set();
  const steps = Array.isArray(speech.steps) ? speech.steps : [];
  const inicio = steps.findIndex((s) => s.id === speech.startStepId);
  if (inicio === -1) return alcanzables;
  const cola = [inicio];
  while (cola.length) {
    const i = cola.pop();
    if (alcanzables.has(i)) continue;
    alcanzables.add(i);
    preguntasDe(pasoNormalizado(steps[i])).forEach((pr) => {
      opcionesDe(pr).forEach((op) => {
        const j = steps.findIndex((s) => s.id === op.targetStepId);
        if (j !== -1) cola.push(j);
      });
    });
    if (i + 1 < steps.length) cola.push(i + 1); // avance lineal
  }
  return new Set([...alcanzables].map((i) => steps[i].id));
}

export function advertenciasSpeech(speech, objeciones) {
  const advertencias = [];
  const steps = Array.isArray(speech.steps) ? speech.steps : [];
  if (!steps.length) return advertencias;
  if (Array.isArray(objeciones)) {
    const vistas = new Set();
    // Las llaves {OBJECION:id} pueden aparecer en el speech de la etapa, en
    // el texto de la pregunta, en la respuesta sugerida o en las reglas.
    const textos = reglasDe(speech).slice();
    steps.forEach((paso) => {
      const p = pasoNormalizado(paso);
      if (p.contenido) textos.push(p.contenido);
      preguntasDe(p).forEach((pr) => {
        if (pr.texto) textos.push(pr.texto);
        opcionesDe(pr).forEach((op) => {
          if (op.respuestaSugerida) textos.push(op.respuestaSugerida);
        });
      });
    });
    textos.forEach((texto) => {
      llavesObjecion(texto).forEach((ref) => {
        const clave = ref.toLowerCase();
        if (vistas.has(clave)) return;
        vistas.add(clave);
        if (!buscarObjecion(ref, objeciones)) {
          advertencias.push(
            `La llave {OBJECION:${ref}} no corresponde a ninguna objeción cargada.`
          );
        }
      });
    });
  }
  const alcanzables = pasosAlcanzables(speech);
  if (!steps.some((s) => s.id === speech.startStepId)) return advertencias;
  steps.forEach((paso, i) => {
    if (!alcanzables.has(paso.id)) {
      advertencias.push(
        `El paso ${i + 1} ("${paso.titulo || "sin título"}") no está conectado desde el inicio (huérfano).`
      );
    }
  });
  return advertencias;
}

// ---------------------------------------------------------------------------
// Motor de navegación puro (independiente de la UI, §2.1/§2.2/§9)
// ---------------------------------------------------------------------------

/**
 * Calcula la próxima posición del recorrido dada la actual y la opción
 * elegida (null = avance lineal con "Siguiente").
 *
 * Reglas:
 * 1) La opción tiene targetStepId válido → salta a esa etapa (primera pregunta).
 * 2) Sin destino → siguiente pregunta de la MISMA etapa.
 * 3) Era la última pregunta → siguiente etapa por orden.
 * 4) No hay más → { fin: true }.
 *
 * "finalizaLlamada" y "requiereAclaracion" NO se resuelven acá: los evalúa
 * la UI antes de llamar al motor (son decisiones del operador, no del grafo).
 * Un targetStepId roto cae al avance lineal (la validación lo reporta).
 */
export function resolverDestino(speech, stepId, preguntaIdx, opcion) {
  const steps = Array.isArray(speech?.steps) ? speech.steps : [];
  if (opcion && typeof opcion.targetStepId === "string" && opcion.targetStepId) {
    if (steps.some((s) => s.id === opcion.targetStepId)) {
      return { stepId: opcion.targetStepId, preguntaIdx: 0, fin: false };
    }
  }
  const i = steps.findIndex((s) => s.id === stepId);
  if (i === -1) return { stepId: null, preguntaIdx: 0, fin: true };
  const preguntas = preguntasDe(pasoNormalizado(steps[i]));
  const idx = Number.isInteger(preguntaIdx) ? preguntaIdx : 0;
  if (idx + 1 < preguntas.length) return { stepId, preguntaIdx: idx + 1, fin: false };
  if (i + 1 < steps.length) return { stepId: steps[i + 1].id, preguntaIdx: 0, fin: false };
  return { stepId: null, preguntaIdx: 0, fin: true };
}

/**
 * Campos obligatorios de la etapa que aún no tienen valor en el registro de
 * la llamada. El runner usa esto para exigirlos antes de avanzar; los
 * opcionales NUNCA bloquean (§2.1 "continuar sin completar campos
 * opcionales"). "si-no" cuenta como respondido con "si" o "no".
 */
export function camposObligatoriosPendientes(speech, stepId, registro = {}) {
  const steps = Array.isArray(speech?.steps) ? speech.steps : [];
  const paso = steps.find((s) => s.id === stepId);
  if (!paso) return [];
  return camposDe(pasoNormalizado(paso))
    .filter((c) => c && c.obligatorio)
    .filter((c) => {
      const v = registro ? registro[c.id] : undefined;
      if (c.tipo === "seleccion-multiple") return !(Array.isArray(v) && v.length > 0);
      if (c.tipo === "si-no") return v !== "si" && v !== "no";
      return v === undefined || v === null || String(v).trim() === "";
    })
    .map((c) => String(c.nombre || "").trim() || "(campo sin nombre)");
}

// ---------------------------------------------------------------------------
// Validación
// ---------------------------------------------------------------------------

/**
 * Validación de activación/uso (§4.2). Permite borradores incompletos en el
 * editor, pero lista todo lo que impide usar el guion. Cambios 1.11.0:
 * - Un destino YA NO es obligatorio (avance lineal §2.2); solo se valida
 *   cuando existe y apunta a algo que no está.
 * - Nuevos chequeos: tipos de campo, nombres de campo, selecciones sin
 *   opciones, referencias a estados/módulos inexistentes y asignaciones
 *   apuntando a campos ajenos.
 */
export function validarSpeech(speech) {
  if (!speech || typeof speech !== "object") return ["El speech está vacío o es inválido."];
  const errores = [];
  if (!speech.nombre || !String(speech.nombre).trim()) {
    errores.push("El speech no tiene nombre.");
  }
  const steps = Array.isArray(speech.steps) ? speech.steps : [];
  if (!steps.length) {
    errores.push("El speech no tiene ningún paso.");
  } else if (!speech.startStepId || !steps.some((s) => s.id === speech.startStepId)) {
    errores.push("No existe el paso inicial (INICIO).");
  }

  // IDs únicos en TODO el árbol: etapas, preguntas, opciones, campos,
  // estados y módulos (§4.2 "que no haya identificadores duplicados").
  const ids = [];
  steps.forEach((paso) => {
    if (!esObjeto(paso)) return;
    ids.push(paso.id);
    preguntasDe(paso).forEach((pr) => {
      ids.push(pr.id);
      opcionesDe(pr).forEach((op) => ids.push(op.id));
    });
    camposDe(paso).forEach((c) => ids.push(c.id));
  });
  estadosDe(speech).forEach((e) => ids.push(e.id));
  modulosDe(speech).forEach((m) => ids.push(m.id));
  const vistos = new Set();
  const duplicados = new Set();
  ids.forEach((id) => {
    if (typeof id !== "string" || !id) return; // ids rotos los reporta validarEstructura
    if (vistos.has(id)) duplicados.add(id);
    vistos.add(id);
  });
  if (duplicados.size) {
    errores.push(`IDs duplicados: ${[...duplicados].join(", ")}.`);
  }

  const idsEstados = new Set(estadosDe(speech).map((e) => e.id));
  const idsModulos = new Set(modulosDe(speech).map((m) => m.id));

  steps.forEach((paso, i) => {
    if (!esObjeto(paso)) return;
    const etiquetaPaso = `paso ${i + 1}`;
    const p = pasoNormalizado(paso);

    // Campos de registro de la etapa (§3/§4.2)
    camposDe(p).forEach((c, k) => {
      const nombre = String(c?.nombre || "").trim();
      const etiquetaCampo = nombre || `campo ${k + 1}`;
      if (!nombre) {
        errores.push(`Un campo del ${etiquetaPaso} no tiene nombre.`);
      }
      if (!esTipoCampoValido(c?.tipo)) {
        errores.push(`El campo "${etiquetaCampo}" del ${etiquetaPaso} tiene un tipo inválido.`);
      }
      if (
        (c?.tipo === "seleccion-unica" || c?.tipo === "seleccion-multiple") &&
        !(Array.isArray(c?.opciones) && c.opciones.filter(Boolean).length)
      ) {
        errores.push(`El campo "${etiquetaCampo}" del ${etiquetaPaso} (selección) no tiene opciones.`);
      }
    });

    preguntasDe(p).forEach((pr) => {
      opcionesDe(pr).forEach((op) => {
        const etiqueta = `La opción "${op.texto || "(sin texto)"}" del ${etiquetaPaso}`;
        if (!op.texto || !String(op.texto).trim()) {
          errores.push(`Una opción del ${etiquetaPaso} no tiene texto.`);
        }
        // Destino: solo se valida cuando existe (§4.2 "cuando requieran
        // navegación"); sin destino la opción avanza en línea.
        if (op.targetStepId !== null && op.targetStepId !== undefined && typeof op.targetStepId !== "string") {
          errores.push(`${etiqueta} tiene destino inválido.`);
        } else if (op.targetStepId && !steps.some((s) => s.id === op.targetStepId)) {
          errores.push(`${etiqueta} apunta a un paso que no existe.`);
        }
        if (op.estadoFinalId && !idsEstados.has(op.estadoFinalId)) {
          errores.push(`${etiqueta} apunta a un estado final que no existe.`);
        }
        if (op.moduloId && !idsModulos.has(op.moduloId)) {
          errores.push(`${etiqueta} apunta a un módulo que no existe.`);
        }
        (Array.isArray(op.asignaciones) ? op.asignaciones : []).forEach((a) => {
          if (!a || typeof a.campoId !== "string" || !camposDe(p).some((c) => c.id === a.campoId)) {
            errores.push(`${etiqueta} tiene un dato de registro sin campo válido.`);
          }
        });
      });
    });
  });

  return errores;
}

/**
 * Validación de ESTRUCTURA para archivos importados (§5.2). Más estricta
 * que validarSpeech: exige ids, listas y tipos del formato. Acepta tanto la
 * forma v2 (preguntas) como una v1 sin migrar (opciones sueltas en la etapa)
 * para no rechazar exportaciones antiguas que aún son reparables.
 */
export function validarEstructuraSpeech(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return ["No es un speech válido."];
  }
  const errores = [];
  if (typeof obj.id !== "string" || !obj.id.trim()) errores.push("Falta el id.");
  if (typeof obj.nombre !== "string" || !obj.nombre.trim()) errores.push("Falta el nombre.");
  if (!Array.isArray(obj.steps)) {
    errores.push("Falta la lista de pasos (steps).");
    return errores;
  }
  if (typeof obj.startStepId !== "string" || !obj.startStepId) {
    errores.push("Falta el paso inicial (startStepId).");
  } else if (!obj.steps.some((s) => s && s.id === obj.startStepId)) {
    errores.push("El paso inicial (startStepId) no corresponde a ningún paso.");
  }

  // Campos opcionales de v2: si vienen, deben traer la forma correcta.
  if ("estadosFinales" in obj && !Array.isArray(obj.estadosFinales)) {
    errores.push("estadosFinales debe ser una lista.");
  }
  if ("reglas" in obj && !Array.isArray(obj.reglas)) {
    errores.push("reglas debe ser una lista.");
  }
  if ("modulos" in obj && !Array.isArray(obj.modulos)) {
    errores.push("modulos debe ser una lista.");
  }

  const ids = new Set();
  const duplicados = new Set();
  const anotar = (id) => {
    if (ids.has(id)) duplicados.add(id);
    ids.add(id);
  };

  obj.steps.forEach((paso, i) => {
    if (!paso || typeof paso !== "object" || typeof paso.id !== "string" || !paso.id) {
      errores.push(`El paso ${i + 1} no tiene id válido.`);
      return;
    }
    anotar(paso.id);

    const esV2 = Array.isArray(paso.preguntas);
    const opcionesV1 = Array.isArray(paso.opciones);
    if (!esV2 && !opcionesV1) {
      errores.push(`El paso ${i + 1} no tiene lista de preguntas.`);
      return;
    }
    if ("camposRegistro" in paso && !Array.isArray(paso.camposRegistro)) {
      errores.push(`El paso ${i + 1} tiene camposRegistro inválido.`);
      return;
    }

    const validarOpcion = (op, contexto) => {
      if (!op || typeof op !== "object" || typeof op.id !== "string" || !op.id) {
        errores.push(`${contexto} no tiene id válido.`);
        return;
      }
      anotar(op.id);
      if (typeof op.texto !== "string") {
        errores.push(`${contexto} tiene texto inválido.`);
      }
      if (op.targetStepId !== null && typeof op.targetStepId !== "string") {
        errores.push(`${contexto} tiene destino inválido.`);
      } else if (op.targetStepId && !obj.steps.some((s) => s && s.id === op.targetStepId)) {
        errores.push(`${contexto} apunta a un paso que no existe.`);
      }
    };

    if (esV2) {
      paso.preguntas.forEach((pr, j) => {
        if (!pr || typeof pr !== "object" || typeof pr.id !== "string" || !pr.id) {
          errores.push(`La pregunta ${j + 1} del paso ${i + 1} no tiene id válido.`);
          return;
        }
        anotar(pr.id);
        if (!Array.isArray(pr.opciones)) {
          errores.push(`La pregunta ${j + 1} del paso ${i + 1} no tiene lista de opciones.`);
          return;
        }
        pr.opciones.forEach((op, k) => {
          validarOpcion(op, `La opción ${k + 1} de la pregunta ${j + 1} del paso ${i + 1}`);
        });
      });
    } else {
      paso.opciones.forEach((op, j) => {
        validarOpcion(op, `La opción ${j + 1} del paso ${i + 1}`);
      });
    }

    (Array.isArray(paso.camposRegistro) ? paso.camposRegistro : []).forEach((c, j) => {
      if (!c || typeof c !== "object" || typeof c.id !== "string" || !c.id) {
        errores.push(`El campo ${j + 1} del paso ${i + 1} no tiene id válido.`);
        return;
      }
      anotar(c.id);
      if (typeof c.nombre !== "string") {
        errores.push(`El campo ${j + 1} del paso ${i + 1} tiene nombre inválido.`);
      }
      if (typeof c.tipo !== "string" || !esTipoCampoValido(c.tipo)) {
        errores.push(`El campo ${j + 1} del paso ${i + 1} tiene tipo inválido.`);
      }
    });
  });

  (Array.isArray(obj.estadosFinales) ? obj.estadosFinales : []).forEach((e, i) => {
    if (!e || typeof e !== "object" || typeof e.id !== "string" || !e.id || typeof e.nombre !== "string") {
      errores.push(`El estado final ${i + 1} es inválido.`);
      return;
    }
    anotar(e.id);
  });
  (Array.isArray(obj.modulos) ? obj.modulos : []).forEach((m, i) => {
    if (!m || typeof m !== "object" || typeof m.id !== "string" || !m.id || typeof m.tipo !== "string") {
      errores.push(`El módulo ${i + 1} es inválido.`);
      return;
    }
    anotar(m.id);
  });

  if (duplicados.size) {
    errores.push(`IDs duplicados: ${[...duplicados].join(", ")}.`);
  }
  return errores;
}
