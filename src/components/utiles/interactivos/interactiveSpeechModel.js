import { sanitizeString } from "../../../utils/sanitize";
import { buscarObjecion, llavesObjecion } from "./resolveObjeciones";
// Release 1.11.3: el motor de plantillas es la fuente única de tipos, valores
// y condiciones. El modelo re-exporta TIPOS_CAMPO para no romper a los
// consumidores históricos (SpeechEditor, tests, etc.).
import {
  TIPOS_CAMPO,
  esTipoCampoValido,
  normalizarPlantilla,
  normalizarCampoPlantilla,
  crearPlantilla,
  crearCampoPlantilla,
  normalizarValorCampo,
  erroresValorCampo,
  esCampoDestinoValido,
  esOperadorValido,
  normalizarCondiciones,
  valorVacio,
  visibilidadCampos,
} from "./plantillaRegistro";

export { TIPOS_CAMPO, esTipoCampoValido };

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
 * Tipos de campo de registro: la lista vive en `plantillaRegistro.js`
 * (fuente única desde 1.11.3). Se conserva el re-export de arriba para que
 * ningún consumidor existente tenga que cambiar sus imports.
 */

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

/**
 * Plantilla de registro a nivel speech (1.11.3). Un guion viejo no la trae:
 * se devuelve una plantilla vacía, SIN inventar campos ni ids. Es la misma
 * estructura que usan el editor, el runner y la validación.
 */
const PLANTILLA_VACIA = Object.freeze({
  version: 1,
  nombre: "Registro de la llamada",
  campos: Object.freeze([]),
});

function plantillaDe(speech) {
  return normalizarPlantilla(speech?.plantillaRegistro) || PLANTILLA_VACIA;
}

/**
 * Campos de registro efectivos del speech: primero los de la plantilla
 * (1.11.3) y después los que siguen viviendo por etapa (1.11.0). Se deduplica
 * por id para que un campo migrado a la plantilla no aparezca dos veces.
 *
 * Decisión: no se reescriben los datos del guion al leer. Un guion viejo
 * mantiene sus campos en las etapas y sigue funcionando igual; el editor
 * puede moverlos a la plantilla cuando el usuario quiera.
 */
export function camposRegistroDeSpeech(speech) {
  const vistos = new Set();
  const salida = [];
  const agregar = (campo) => {
    if (!campo || typeof campo.id !== "string" || !campo.id || vistos.has(campo.id)) return;
    vistos.add(campo.id);
    salida.push(campo);
  };
  const plantilla = plantillaDe(speech);
  [...plantilla.campos]
    .sort((a, b) => (Number(a?.orden) || 0) - (Number(b?.orden) || 0))
    .forEach(agregar);
  pasosDe(speech).forEach((raw) => {
    camposDe(pasoNormalizado(raw)).forEach(agregar);
  });
  return salida;
}

export function buscarCampoRegistro(speech, campoId) {
  return camposRegistroDeSpeech(speech).find((c) => c.id === campoId) || null;
}

/** Datos de la plantilla (nombre/version/campos) ya normalizados. */
export function plantillaRegistroDeSpeech(speech) {
  return plantillaDe(speech);
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

/**
 * Campo de registro. Desde 1.11.3 acepta la configuración ampliada de la
 * plantilla (descripción, valor predeterminado, condición de visibilidad,
 * mapeo explícito a un campo del caso y etapa sugerida). Los guiones viejos
 * siguen creando campos con la forma mínima de 1.11.0.
 */
export function crearCampoRegistro({
  nombre = "",
  tipo = "texto-corto",
  obligatorio = false,
  opciones = [],
  descripcion = "",
  porDefecto = "",
  visibleSi = [],
  campoDestino = "",
  pasoId = null,
} = {}) {
  const campo = crearCampoPlantilla({
    nombre,
    descripcion,
    tipo,
    obligatorio,
    opciones,
    porDefecto,
    visibleSi,
    campoDestino,
    pasoId,
  });
  return campo;
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
    // --- v3 (1.11.3) ---
    // Plantilla de registro a nivel speech. Nace vacía para no alterar el
    // comportamiento de los guiones nuevos: el registro por etapa sigue
    // funcionando igual y la plantilla se completa desde el editor.
    plantillaRegistro: crearPlantilla(),
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

/**
 * Normaliza un campo de registro (de etapa o de plantilla): desde 1.11.3 la
 * forma canónica incluye descripción, valor por defecto, condiciones y mapeo
 * al caso. Los campos viejos se completan sin perder lo que ya tenían.
 */
function normalizarCampo(c) {
  if (!esObjeto(c)) return crearCampoRegistro();
  return normalizarCampoPlantilla(c);
}

/**
 * Campos de una etapa, con `pasoId` como pista de agrupación para el panel de
 * registro. No mueve datos ni cambia ids: sólo completa la referencia.
 */
function normalizarCamposDePaso(campos, pasoId) {
  if (!Array.isArray(campos)) return [];
  let cambio = false;
  const salida = campos.map((c) => {
    const norm = normalizarCampo(c);
    const conPaso = norm.pasoId ? norm : { ...norm, pasoId };
    if (conPaso !== c) cambio = true;
    return conPaso;
  });
  return cambio ? salida : campos;
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
  const camposNorm = normalizarCamposDePaso(
    camposOk ? resultado.camposRegistro : [],
    resultado.id
  );
  if (!objetivoOk || !camposOk || camposNorm !== resultado.camposRegistro) {
    resultado = {
      ...resultado,
      objetivo: objetivoOk ? resultado.objetivo : "",
      camposRegistro: camposNorm,
    };
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
  // 1.11.3: la plantilla de registro es opcional en guiones viejos, pero una
  // vez normalizada debe quedar en forma canónica (idempotencia).
  const plantilla = normalizarPlantilla(speech.plantillaRegistro);
  if (!plantilla || plantilla !== speech.plantillaRegistro) return false;
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
    // 1.11.3: se agrega la plantilla vacía a los guiones viejos. No se mueven
    // los campos existentes: se suman en lectura (camposRegistroDeSpeech).
    plantillaRegistro: normalizarPlantilla(speech.plantillaRegistro) || crearPlantilla(),
    steps,
  };
}

// ---------------------------------------------------------------------------
// Layout del constructor visual (Release 1.11.1)
// ---------------------------------------------------------------------------

/**
 * Posiciones de los nodos del constructor visual.
 *
 * Por qué vive en el speech y no en un store aparte: el constructor es una
 * vista del MISMO guion (§6 de la release), así que las posiciones viajan con
 * el export/backup y no se pierden al recargar. Es una propiedad OPCIONAL y
 * puramente cosmética:
 * - Los guiones existentes no la traen y se auto-organizan al abrirlos.
 * - No se sube FORMATO_VERSION: un archivo nuevo importado en 1.11.0 sigue
 *   siendo válido (la versión anterior ignora la clave).
 * - Nunca se usa para resolver el recorrido (eso lo hace el modelo real).
 *
 * Forma:
 *   layout: {
 *     version: 1,
 *     nodos: { "inicio": {x,y}, "etapa:<id>": {x,y}, ... },
 *     vista?: { x, y, zoom }   // opcional; el constructor la maneja en sesión
 *   }
 */
export const LAYOUT_VERSION = 1;

const numeroFinito = (n) => typeof n === "number" && Number.isFinite(n);

/**
 * Sanea un layout externo (import/backup) sin explotar con basura. Devuelve
 * null si no hay nada aprovechable para que el llamador pueda descartarlo.
 */
export function normalizarLayout(layout) {
  if (!esObjeto(layout)) return null;
  const nodos = {};
  Object.keys(esObjeto(layout.nodos) ? layout.nodos : {}).forEach((clave) => {
    const p = layout.nodos[clave];
    if (!esObjeto(p) || !numeroFinito(p.x) || !numeroFinito(p.y)) return;
    // Redondeo: evita decimales largos acumulados por el zoom en el JSON.
    nodos[clave] = { x: Math.round(p.x), y: Math.round(p.y) };
  });
  const resultado = { version: LAYOUT_VERSION, nodos };
  if (esObjeto(layout.vista)) {
    resultado.vista = {
      x: numeroFinito(layout.vista.x) ? layout.vista.x : 0,
      y: numeroFinito(layout.vista.y) ? layout.vista.y : 0,
      zoom: numeroFinito(layout.vista.zoom)
        ? Math.min(2, Math.max(0.25, layout.vista.zoom))
        : 1,
    };
  }
  return resultado;
}

/**
 * Guarda el layout con el mismo contrato que el resto de mutadores: devuelve
 * un speech nuevo y bumpea versión/fecha (es un cambio persistido del guion).
 */
export function actualizarLayout(speech, layout) {
  const normal = normalizarLayout(layout);
  if (!normal) return speech;
  return conCambio({ ...speech, layout: normal });
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

/**
 * Duplica una pregunta dentro de su etapa (Release 1.11.1, constructor
 * visual). Conserva texto, obligatoriedad y TODAS las propiedades de sus
 * opciones (respuesta sugerida, acción, destino, registro…); solo cambia los
 * ids para que no colisionen. El destino externo (targetStepId) se mantiene a
 * propósito: la copia sigue apuntando a la misma etapa.
 */
export function duplicarPregunta(speech, stepId, preguntaId) {
  const actual = pasosDe(speech).find((s) => s.id === stepId);
  if (!actual) return speech;
  const preguntas = preguntasDe(pasoNormalizado(actual));
  const idx = preguntas.findIndex((pr) => pr.id === preguntaId);
  if (idx === -1) return speech;
  const original = preguntas[idx];
  const copia = {
    ...original,
    id: nuevoId(),
    opciones: opcionesDe(original).map((op) => ({ ...op, id: nuevoId() })),
  };
  const nuevas = [...preguntas];
  nuevas.splice(idx + 1, 0, copia);
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
// Campos de registro por etapa (§3) y plantilla a nivel speech (1.11.3)
// ---------------------------------------------------------------------------

/**
 * Aplica sólo las claves presentes en `cambios` a un campo de registro. Es
 * compartido por los campos de etapa y los de la plantilla para que editar un
 * campo se comporte igual en los dos lugares (sin dos implementaciones).
 */
function aplicarCambiosCampo(campo, cambios = {}) {
  const siguiente = { ...campo };
  if (cambios.nombre !== undefined) {
    siguiente.nombre = sanitizeString(String(cambios.nombre).trim());
  }
  if (cambios.descripcion !== undefined) {
    siguiente.descripcion = sanitizeString(String(cambios.descripcion));
  }
  if (cambios.tipo !== undefined && esTipoCampoValido(cambios.tipo)) {
    // Las opciones se conservan aunque el tipo nuevo no las use: volver a un
    // tipo de selección no obliga a reescribirlas.
    siguiente.tipo = cambios.tipo;
  }
  if (cambios.obligatorio !== undefined) siguiente.obligatorio = Boolean(cambios.obligatorio);
  if (cambios.opciones !== undefined) {
    siguiente.opciones = (Array.isArray(cambios.opciones) ? cambios.opciones : [])
      .map((o) => sanitizeString(String(o ?? "").trim()))
      .filter(Boolean);
  }
  if (cambios.visibleSi !== undefined) {
    siguiente.visibleSi = normalizarCondiciones(cambios.visibleSi);
  }
  if (cambios.campoDestino !== undefined) {
    siguiente.campoDestino = esCampoDestinoValido(cambios.campoDestino)
      ? cambios.campoDestino
      : "";
  }
  if (cambios.pasoId !== undefined) {
    siguiente.pasoId =
      typeof cambios.pasoId === "string" && cambios.pasoId ? cambios.pasoId : null;
  }
  if (cambios.orden !== undefined && Number.isFinite(Number(cambios.orden))) {
    siguiente.orden = Number(cambios.orden);
  }
  if (cambios.porDefecto !== undefined) {
    siguiente.porDefecto = normalizarValorCampo(siguiente, cambios.porDefecto);
  }
  return siguiente;
}

/**
 * Quita TODAS las referencias a un campo que se elimina: asignaciones de
 * opciones (en cualquier etapa, no solo la dueña) y condiciones de
 * visibilidad de otros campos (plantilla o etapa). Sin esto, borrar un campo
 * dejaba condiciones/asociaciones huérfanas que bloqueaban la validación.
 */
function purgarReferenciasCampo(speech, campoId) {
  const purgarCondiciones = (campo) => {
    if (!Array.isArray(campo?.visibleSi)) return campo;
    if (!campo.visibleSi.some((c) => c?.campoId === campoId)) return campo;
    return {
      ...campo,
      visibleSi: campo.visibleSi.filter((c) => c?.campoId !== campoId),
    };
  };
  const steps = pasosDe(speech).map((raw) => {
    const paso = pasoNormalizado(raw);
    return {
      ...paso,
      camposRegistro: camposDe(paso).map(purgarCondiciones),
      preguntas: preguntasDe(paso).map((pr) => ({
        ...pr,
        opciones: opcionesDe(pr).map((op) => {
          const asignaciones = Array.isArray(op.asignaciones) ? op.asignaciones : [];
          return asignaciones.some((a) => a?.campoId === campoId)
            ? { ...op, asignaciones: asignaciones.filter((a) => a?.campoId !== campoId) }
            : op;
        }),
      })),
    };
  });
  const plantilla = plantillaDe(speech);
  return {
    steps,
    plantilla: { ...plantilla, campos: plantilla.campos.map(purgarCondiciones) },
  };
}

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
      camposRegistro: camposDe(paso).map((c) =>
        c.id !== campoId ? c : aplicarCambiosCampo(c, cambios)
      ),
    })),
  });
}

/**
 * Eliminar un campo de una etapa purga TODAS sus referencias: asignaciones de
 * cualquier etapa y condiciones de visibilidad de cualquier campo. Desde
 * 1.11.3 las asignaciones pueden apuntar a campos de la plantilla, por eso la
 * purga ya no se limita a la etapa dueña.
 */
export function eliminarCampo(speech, stepId, campoId) {
  const actual = pasosDe(speech).find((s) => s.id === stepId);
  if (!actual || !camposDe(actual).some((c) => c.id === campoId)) return speech;
  const purgado = purgarReferenciasCampo(speech, campoId);
  return conCambio({
    ...speech,
    plantillaRegistro: purgado.plantilla,
    steps: purgado.steps.map((paso) =>
      paso.id !== stepId
        ? paso
        : { ...paso, camposRegistro: camposDe(paso).filter((c) => c.id !== campoId) }
    ),
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
// Plantilla de registro a nivel speech (Release 1.11.3)
// ---------------------------------------------------------------------------

/** Cambia metadatos de la plantilla (hoy sólo el nombre visible). */
export function actualizarPlantillaRegistro(speech, cambios = {}) {
  const plantilla = plantillaDe(speech);
  const siguiente = { ...plantilla };
  if (cambios.nombre !== undefined) {
    const nombre = sanitizeString(String(cambios.nombre).trim());
    siguiente.nombre = nombre || plantilla.nombre;
  }
  return conCambio({ ...speech, plantillaRegistro: siguiente });
}

/**
 * Agrega un campo a la plantilla. `pasoId` es opcional: null = campo global
 * del registro; con id = se muestra/gestiona junto a esa etapa.
 */
export function agregarCampoPlantilla(speech, datos = {}) {
  const plantilla = plantillaDe(speech);
  const orden = Number.isFinite(Number(datos.orden))
    ? Number(datos.orden)
    : plantilla.campos.length;
  const campo = crearCampoPlantilla({ ...datos, orden });
  return conCambio({
    ...speech,
    plantillaRegistro: { ...plantilla, campos: [...plantilla.campos, campo] },
  });
}

export function actualizarCampoPlantilla(speech, campoId, cambios = {}) {
  const plantilla = plantillaDe(speech);
  if (!plantilla.campos.some((c) => c.id === campoId)) return speech;
  return conCambio({
    ...speech,
    plantillaRegistro: {
      ...plantilla,
      campos: plantilla.campos.map((c) =>
        c.id !== campoId ? c : aplicarCambiosCampo(c, cambios)
      ),
    },
  });
}

/**
 * Elimina un campo de la plantilla y purga sus referencias (asignaciones y
 * condiciones). La advertencia al usuario la muestra el editor ANTES de
 * llamar acá; el modelo solo ejecuta la baja consistente.
 */
export function eliminarCampoPlantilla(speech, campoId) {
  const plantilla = plantillaDe(speech);
  if (!plantilla.campos.some((c) => c.id === campoId)) return speech;
  const purgado = purgarReferenciasCampo(speech, campoId);
  return conCambio({
    ...speech,
    plantillaRegistro: {
      ...purgado.plantilla,
      campos: purgado.plantilla.campos.filter((c) => c.id !== campoId),
    },
    steps: purgado.steps,
  });
}

/** Reordena la plantilla (delta -1/+1) recalculando `orden` correlativo. */
export function moverCampoPlantilla(speech, campoId, delta) {
  const plantilla = plantillaDe(speech);
  const ordenados = [...plantilla.campos].sort(
    (a, b) => (Number(a?.orden) || 0) - (Number(b?.orden) || 0)
  );
  const idx = ordenados.findIndex((c) => c.id === campoId);
  const destino = idx + delta;
  if (idx === -1 || destino < 0 || destino >= ordenados.length) return speech;
  const [movido] = ordenados.splice(idx, 1);
  ordenados.splice(destino, 0, movido);
  const campos = ordenados.map((c, i) => (c.orden === i ? c : { ...c, orden: i }));
  return conCambio({
    ...speech,
    plantillaRegistro: { ...plantilla, campos },
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

  // 1.11.3: la plantilla se duplica con ids nuevos y se suma al mismo mapa
  // que los campos de etapa, así las asignaciones y condiciones de la copia
  // apuntan a la copia y no al guion original.
  const plantilla = plantillaDe(speech);
  const camposPlantilla = plantilla.campos.map((c) => {
    const idNuevo = nuevoId();
    mapaCampos.set(c.id, idNuevo);
    return { ...c, id: idNuevo };
  });
  const remapearCondiciones = (campo) => ({
    ...campo,
    visibleSi: (Array.isArray(campo.visibleSi) ? campo.visibleSi : []).map((c) =>
      mapaCampos.has(c.campoId) ? { ...c, campoId: mapaCampos.get(c.campoId) } : c
    ),
  });
  const camposPlantillaFinales = camposPlantilla.map((c) =>
    remapearCondiciones({
      ...c,
      pasoId: c.pasoId && mapaSteps.has(c.pasoId) ? mapaSteps.get(c.pasoId) : c.pasoId,
    })
  );

  const stepsFinales = steps.map((paso) => ({
    ...paso,
    camposRegistro: camposDe(paso).map((c) =>
      remapearCondiciones({
        ...c,
        pasoId: c.pasoId && mapaSteps.has(c.pasoId) ? mapaSteps.get(c.pasoId) : c.pasoId,
      })
    ),
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

  // Release 1.11.1: la copia NO hereda el layout del constructor visual.
  // Los ids de etapas/preguntas cambian, así que las posiciones viejas serían
  // claves huérfanas; al abrir la copia se auto-organiza. El resto del guion
  // se copia igual que siempre.
  const { layout: _layoutIgnorado, ...restoSinLayout } = speech;

  return {
    ...restoSinLayout,
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
    // 1.11.3: plantilla copiada con ids nuevos y referencias re-apuntadas.
    plantillaRegistro: { ...plantilla, campos: camposPlantillaFinales },
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

/**
 * Diagnósticos ESTRUCTURADOS del guion (Release 1.11.1, constructor visual).
 *
 * Por qué existe: `validarSpeech`/`advertenciasSpeech` devolvían strings y el
 * lienzo necesita saber a qué nodo pertenece cada problema para poder
 * seleccionarlo. Esta función conserva EXACTAMENTE los mensajes y el orden de
 * la 1.11.0 (los tests existentes son el contrato) y agrega la ubicación:
 * `nodoKey`, `stepId`, `preguntaId`, `opcionId`, `campoId`, `estadoFinalId`.
 *
 * Severidades:
 * - "error": impide ejecutar el speech (no impide guardar el borrador).
 * - "advertencia": no bloquea; ayuda a detectar recorridos incompletos.
 *
 * Opciones internas (para no duplicar lógica ni ruido):
 * - `incluirAdvertencias: false` → solo errores (lo usa validarSpeech).
 * - `extendidas: false` → solo las advertencias históricas (las usa el editor
 *   tradicional en el checklist de siempre). Las advertencias nuevas del
 *   constructor (sin preguntas, sin respuestas, sin finalización, estados sin
 *   uso) solo se muestran dentro del constructor visual.
 */
export function diagnosticosSpeech(speech, objeciones, opciones = {}) {
  const { incluirAdvertencias = true, extendidas = true } = opciones;
  const diagnosticos = [];
  const agregar = (severidad, mensaje, ubicacion = {}) => {
    diagnosticos.push({
      id: `diag-${diagnosticos.length + 1}`,
      severidad,
      mensaje,
      nodoKey: ubicacion.nodoKey || null,
      stepId: ubicacion.stepId || null,
      preguntaId: ubicacion.preguntaId || null,
      opcionId: ubicacion.opcionId || null,
      campoId: ubicacion.campoId || null,
      estadoFinalId: ubicacion.estadoFinalId || null,
      moduloId: ubicacion.moduloId || null,
    });
  };
  const error = (mensaje, ubicacion) => agregar("error", mensaje, ubicacion);
  const advertencia = (mensaje, ubicacion) => agregar("advertencia", mensaje, ubicacion);

  if (!speech || typeof speech !== "object") {
    error("El speech está vacío o es inválido.", { nodoKey: "inicio" });
    return diagnosticos;
  }
  if (!speech.nombre || !String(speech.nombre).trim()) {
    error("El speech no tiene nombre.", { nodoKey: "inicio" });
  }
  const steps = pasosDe(speech);
  const plantilla = plantillaDe(speech);
  const camposPlantilla = plantilla.campos;
  if (!steps.length) {
    error("El speech no tiene ningún paso.", { nodoKey: "inicio" });
  } else if (!speech.startStepId || !steps.some((s) => s.id === speech.startStepId)) {
    error("No existe el paso inicial (INICIO).", { nodoKey: "inicio" });
  }

  // IDs únicos en TODO el árbol: etapas, preguntas, opciones, campos (etapa
  // y plantilla), estados y módulos.
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
  camposPlantilla.forEach((c) => ids.push(c.id));
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
    error(`IDs duplicados: ${[...duplicados].join(", ")}.`);
  }

  const idsEstados = new Set(estadosDe(speech).map((e) => e.id));
  const idsModulos = new Set(modulosDe(speech).map((m) => m.id));

  // Todos los campos (plantilla + etapas) para validar condiciones y
  // asignaciones sin importar dónde viva el campo referenciado.
  const idsCampos = new Set(
    [
      ...camposPlantilla,
      ...steps.flatMap((paso) =>
        esObjeto(paso) ? camposDe(pasoNormalizado(paso)) : []
      ),
    ]
      .map((c) => c?.id)
      .filter((id) => typeof id === "string" && id)
  );

  /**
   * Validación común de un campo de registro. `sufijo` mantiene los mensajes
   * históricos de los campos de etapa y permite hablar de "la plantilla" para
   * los campos nuevos. No borra ni corrige nada: sólo reporta.
   */
  const validarCampoRegistro = (c, { sufijo, ubicacion }) => {
    const nombre = String(c?.nombre || "").trim();
    const etiquetaCampo = nombre || "campo sin nombre";
    if (!nombre) {
      error(`Un campo ${sufijo} no tiene nombre.`, ubicacion);
    }
    if (!esTipoCampoValido(c?.tipo)) {
      error(`El campo "${etiquetaCampo}" ${sufijo} tiene un tipo inválido.`, ubicacion);
    }
    if (
      (c?.tipo === "seleccion-unica" || c?.tipo === "seleccion-multiple") &&
      !(Array.isArray(c?.opciones) && c.opciones.filter(Boolean).length)
    ) {
      error(`El campo "${etiquetaCampo}" ${sufijo} (selección) no tiene opciones.`, ubicacion);
    }
    if (c?.campoDestino && !esCampoDestinoValido(c.campoDestino)) {
      error(`El campo "${etiquetaCampo}" ${sufijo} apunta a un campo de caso desconocido.`, ubicacion);
    }
    if (c?.porDefecto !== undefined && c.porDefecto !== "") {
      erroresValorCampo(c, normalizarValorCampo(c, c.porDefecto)).forEach((mensaje) => {
        error(
          `El valor predeterminado del campo "${etiquetaCampo}" ${sufijo} no es válido: ${mensaje}`,
          ubicacion
        );
      });
    }
    (Array.isArray(c?.visibleSi) ? c.visibleSi : []).forEach((cond) => {
      if (!esOperadorValido(cond?.operador)) {
        error(`La condición del campo "${etiquetaCampo}" ${sufijo} usa un operador inválido.`, ubicacion);
        return;
      }
      if (!idsCampos.has(cond?.campoId)) {
        error(
          `La condición del campo "${etiquetaCampo}" ${sufijo} referencia un campo que no existe.`,
          ubicacion
        );
      }
    });
  };

  // Plantilla de registro (1.11.3).
  camposPlantilla.forEach((c, k) => {
    const ubicacion = {
      nodoKey: `plantilla:${c?.id || k}`,
      stepId: c?.pasoId || null,
      campoId: c?.id || null,
    };
    validarCampoRegistro(c, { sufijo: "de la plantilla", ubicacion });
  });

  steps.forEach((paso, i) => {
    if (!esObjeto(paso)) return;
    const etiquetaPaso = `paso ${i + 1}`;
    const nodoEtapa = `etapa:${paso.id}`;
    const p = pasoNormalizado(paso);

    // Campos de registro de la etapa (§3/§4.2)
    camposDe(p).forEach((c) => {
      const ubicacion = { nodoKey: nodoEtapa, stepId: paso.id, campoId: c?.id || null };
      validarCampoRegistro(c, { sufijo: `del ${etiquetaPaso}`, ubicacion });
    });

    preguntasDe(p).forEach((pr) => {
      const nodoPregunta = `pregunta:${pr.id}`;
      opcionesDe(pr).forEach((op) => {
        const etiqueta = `La opción "${op.texto || "(sin texto)"}" del ${etiquetaPaso}`;
        const ubicacion = {
          nodoKey: nodoPregunta,
          stepId: paso.id,
          preguntaId: pr.id,
          opcionId: op.id,
        };
        if (!op.texto || !String(op.texto).trim()) {
          error(`Una opción del ${etiquetaPaso} no tiene texto.`, ubicacion);
        }
        // Destino: solo se valida cuando existe (§4.2 "cuando requieran
        // navegación"); sin destino la opción avanza en línea.
        if (
          op.targetStepId !== null &&
          op.targetStepId !== undefined &&
          typeof op.targetStepId !== "string"
        ) {
          error(`${etiqueta} tiene destino inválido.`, ubicacion);
        } else if (op.targetStepId && !steps.some((s) => s.id === op.targetStepId)) {
          error(`${etiqueta} apunta a un paso que no existe.`, ubicacion);
        }
        if (op.estadoFinalId && !idsEstados.has(op.estadoFinalId)) {
          error(`${etiqueta} apunta a un estado final que no existe.`, ubicacion);
        }
        if (op.moduloId && !idsModulos.has(op.moduloId)) {
          error(`${etiqueta} apunta a un módulo que no existe.`, ubicacion);
        }
        (Array.isArray(op.asignaciones) ? op.asignaciones : []).forEach((a) => {
          // 1.11.3: el campo asignado puede vivir en la plantilla o en
          // cualquier etapa, no sólo en la etapa dueña de la opción.
          if (!a || typeof a.campoId !== "string" || !idsCampos.has(a.campoId)) {
            error(`${etiqueta} tiene un dato de registro sin campo válido.`, ubicacion);
          }
        });
      });
    });
  });

  if (!incluirAdvertencias) return diagnosticos;

  // --- Advertencias históricas (idénticas a 1.11.0) ----------------------
  if (Array.isArray(objeciones)) {
    const vistas = new Set();
    // Las llaves {OBJECION:id} pueden aparecer en el speech de la etapa, en
    // el texto de la pregunta, en la respuesta sugerida o en las reglas.
    const textos = reglasDe(speech).map((texto) => ({ texto, ubicacion: {} }));
    steps.forEach((paso) => {
      const p = pasoNormalizado(paso);
      const ubicacionEtapa = { nodoKey: `etapa:${paso?.id}`, stepId: paso?.id };
      if (p.contenido) textos.push({ texto: p.contenido, ubicacion: ubicacionEtapa });
      preguntasDe(p).forEach((pr) => {
        const ubicacionPregunta = {
          nodoKey: `pregunta:${pr.id}`,
          stepId: paso?.id,
          preguntaId: pr.id,
        };
        if (pr.texto) textos.push({ texto: pr.texto, ubicacion: ubicacionPregunta });
        opcionesDe(pr).forEach((op) => {
          if (op.respuestaSugerida) {
            textos.push({
              texto: op.respuestaSugerida,
              ubicacion: { ...ubicacionPregunta, opcionId: op.id },
            });
          }
        });
      });
    });
    textos.forEach(({ texto, ubicacion }) => {
      llavesObjecion(texto).forEach((ref) => {
        const clave = ref.toLowerCase();
        if (vistas.has(clave)) return;
        vistas.add(clave);
        if (!buscarObjecion(ref, objeciones)) {
          advertencia(
            `La llave {OBJECION:${ref}} no corresponde a ninguna objeción cargada.`,
            ubicacion
          );
        }
      });
    });
  }
  const alcanzables = pasosAlcanzables(speech);
  if (steps.some((s) => s.id === speech.startStepId)) {
    steps.forEach((paso, i) => {
      if (!alcanzables.has(paso.id)) {
        advertencia(
          `El paso ${i + 1} ("${paso.titulo || "sin título"}") no está conectado desde el inicio (huérfano).`,
          { nodoKey: `etapa:${paso.id}`, stepId: paso.id }
        );
      }
    });
  }

  if (!extendidas) return diagnosticos;

  // --- Advertencias del constructor visual (1.11.1) ----------------------
  // No bloquean: un borrador puede tener preguntas sin respuestas o etapas
  // "slide". Se muestran en el panel del constructor para guiar la edición.
  let hayFinalizacion = estadosDe(speech).length > 0;
  const estadosUsados = new Set();
  steps.forEach((paso) => {
    preguntasDe(pasoNormalizado(paso)).forEach((pr) => {
      opcionesDe(pr).forEach((op) => {
        if (op.finalizaLlamada) {
          hayFinalizacion = true;
          if (op.estadoFinalId) estadosUsados.add(op.estadoFinalId);
        }
      });
    });
  });
  if (steps.length && !hayFinalizacion) {
    advertencia(
      "El guion no tiene estados finales ni respuestas que finalicen la llamada: los recorridos terminan sin un resultado configurado.",
      { nodoKey: "fin" }
    );
  }
  estadosDe(speech).forEach((e) => {
    if (!estadosUsados.has(e.id)) {
      advertencia(
        `El estado final "${e.nombre || "sin nombre"}" no se usa en ninguna respuesta que finalice la llamada.`,
        { nodoKey: `fin:${e.id}`, estadoFinalId: e.id }
      );
    }
  });
  steps.forEach((paso, i) => {
    const preguntas = preguntasDe(pasoNormalizado(paso));
    const etiquetaPaso = `paso ${i + 1}`;
    if (!preguntas.length) {
      advertencia(
        `El ${etiquetaPaso} ("${paso.titulo || "sin título"}") no tiene preguntas: el recorrido avanza automáticamente.`,
        { nodoKey: `etapa:${paso.id}`, stepId: paso.id }
      );
      return;
    }
    preguntas.forEach((pr) => {
      if (!opcionesDe(pr).length) {
        advertencia(
          `La pregunta "${pr.texto || "sin texto"}" del ${etiquetaPaso} no tiene respuestas: el operador verá "Siguiente".`,
          { nodoKey: `pregunta:${pr.id}`, stepId: paso.id, preguntaId: pr.id }
        );
      }
    });
  });

  return diagnosticos;
}

/**
 * Compatibilidad 1.11.0: misms array de strings de advertencias, en el mismo
 * orden. Las advertencias nuevas del constructor quedan fuera a propósito
 * para no alterar el checklist del editor tradicional ni sus tests.
 */
export function advertenciasSpeech(speech, objeciones) {
  return diagnosticosSpeech(speech, objeciones, { extendidas: false })
    .filter((d) => d.severidad === "advertencia")
    .map((d) => d.mensaje);
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
  const paso = pasosDe(speech).find((s) => s.id === stepId);
  if (!paso) return [];
  const campos = camposRegistroDeSpeech(speech);
  const visibilidad = visibilidadCampos(campos, registro);
  return campos
    .filter(
      (c) =>
        c &&
        c.obligatorio &&
        visibilidad[c.id] !== false &&
        // Sólo bloquean los campos de ESTA etapa. Los globales de la
        // plantilla se validan al confirmar el registro, no en cada avance.
        (c.pasoId === stepId ||
          (!c.pasoId && camposDe(pasoNormalizado(paso)).some((x) => x.id === c.id)))
    )
    .filter((c) => valorVacio(c, registro ? registro[c.id] : undefined))
    .map((c) => String(c.nombre || "").trim() || "(campo sin nombre)");
}

// ---------------------------------------------------------------------------
// Validación
// ---------------------------------------------------------------------------

/**
 * Validación de activación/uso (§4.2). Permite borradores incompletos en el
 * editor, pero lista todo lo que impide usar el guion.
 *
 * 1.11.1: el cuerpo se movió a `diagnosticosSpeech` (misma lógica + ubicación
 * por nodo para el constructor visual). Se conservan los mensajes y el orden
 * de 1.11.0: un destino NO es obligatorio (avance lineal §2.2), solo se valida
 * cuando existe y apunta a algo que no está.
 */
export function validarSpeech(speech) {
  // Release 1.11.1: la validación real vive en diagnosticosSpeech (con
  // ubicación por nodo). Este envoltorio conserva el contrato público de
  // 1.11.0: un array de strings con los mismos mensajes y orden.
  return diagnosticosSpeech(speech, undefined, {
    incluirAdvertencias: false,
    extendidas: false,
  })
    .filter((d) => d.severidad === "error")
    .map((d) => d.mensaje);
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
  // Release 1.11.1: el layout del constructor visual es opcional (los guiones
  // viejos no lo traen). Si viene, debe ser un objeto; su contenido se sanea
  // con normalizarLayout al importar, sin rechazar el archivo por posiciones
  // raras (son cosméticas, nunca afectan la ejecución).
  if ("layout" in obj && obj.layout !== null && (typeof obj.layout !== "object" || Array.isArray(obj.layout))) {
    errores.push("layout debe ser un objeto.");
  }
  // Release 1.11.3: la plantilla de registro es opcional en archivos viejos.
  // Si viene, debe traer la forma mínima para poder importarla sin ambigüedad.
  if ("plantillaRegistro" in obj) {
    const plantilla = obj.plantillaRegistro;
    if (!plantilla || typeof plantilla !== "object" || Array.isArray(plantilla)) {
      errores.push("plantillaRegistro debe ser un objeto.");
    } else if (!Array.isArray(plantilla.campos)) {
      errores.push("plantillaRegistro.campos debe ser una lista.");
    }
  }

  const ids = new Set();
  const camposEstructura = [];
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
      camposEstructura.push(c);
    });
  });

  // Plantilla de registro (opcional, 1.11.3). Se valida después de los pasos
  // para poder detectar ids duplicados contra todo el guion.
  const camposPlantilla =
    obj.plantillaRegistro && Array.isArray(obj.plantillaRegistro.campos)
      ? obj.plantillaRegistro.campos
      : [];
  camposPlantilla.forEach((c, j) => {
    if (!c || typeof c !== "object" || typeof c.id !== "string" || !c.id) {
      errores.push(`El campo ${j + 1} de la plantilla no tiene id válido.`);
      return;
    }
    anotar(c.id);
    if (typeof c.nombre !== "string") {
      errores.push(`El campo ${j + 1} de la plantilla tiene nombre inválido.`);
    }
    if (typeof c.tipo !== "string" || !esTipoCampoValido(c.tipo)) {
      errores.push(`El campo ${j + 1} de la plantilla tiene tipo inválido.`);
    }
    if ("visibleSi" in c && !Array.isArray(c.visibleSi)) {
      errores.push(`El campo ${j + 1} de la plantilla tiene visibleSi inválido.`);
    }
    camposEstructura.push(c);
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

  // Condiciones y mapeos: se validan al final, cuando ya se conocen todos los
  // ids de campos (plantilla + etapas). Una condición rota no debe importarse.
  const idsCampos = new Set(camposEstructura.map((c) => c.id).filter(Boolean));
  camposEstructura.forEach((c, j) => {
    if (c.campoDestino && !esCampoDestinoValido(c.campoDestino)) {
      errores.push(`El campo "${c.nombre || j + 1}" apunta a un campo de caso desconocido.`);
    }
    (Array.isArray(c.visibleSi) ? c.visibleSi : []).forEach((cond) => {
      if (!esOperadorValido(cond?.operador)) {
        errores.push(`El campo "${c.nombre || j + 1}" tiene una condición con operador inválido.`);
      } else if (!idsCampos.has(cond?.campoId)) {
        errores.push(
          `El campo "${c.nombre || j + 1}" tiene una condición que referencia un campo inexistente.`
        );
      }
    });
  });

  if (duplicados.size) {
    errores.push(`IDs duplicados: ${[...duplicados].join(", ")}.`);
  }
  return errores;
}
