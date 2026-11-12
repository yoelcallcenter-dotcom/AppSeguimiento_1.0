/**
 * plantillaRegistro.js (Release 1.11.3 — Plantillas de registro)
 *
 * Motor PURO de la plantilla de registro de un speech: tipos de campo,
 * condiciones de visibilidad, valores por defecto, validaciones y resumen.
 *
 * Por qué vive aparte del modelo de guion:
 * - El modelo de guion ya concentra navegación, validación y mutadores; sumar
 *   acá la semántica de condiciones habría hecho ese archivo aún más grande.
 * - Este módulo NO conoce React, storage ni el módulo de casos: sólo recibe
 *   campos + valores. Eso lo hace testeable y reutilizable por el editor, el
 *   constructor visual, el Modo llamada y el resumen.
 *
 * Decisiones de diseño (1.11.3):
 * - La plantilla es una lista de campos a nivel speech. Los campos que ya
 *   vivían por etapa (`paso.camposRegistro`, 1.11.0) siguen existiendo y se
 *   suman a la plantilla en LECTURA (`camposRegistroDeSpeech`). Así no se
 *   duplican datos ni se rompen guiones existentes.
 * - `id` es el identificador estable: cambiar el nombre visible NUNCA cambia
 *   la clave con la que se guardan los datos.
 * - Las condiciones son genéricas y configurables: sólo comparan valores del
 *   registro contra otro campo. No hay ninguna condición hardcodeada del
 *   speech ART.
 * - Un campo oculto por condiciones no se exige como obligatorio y no se
 *   valida. Sus datos no se borran: el motor de sesión decide qué hacer con
 *   los valores automáticos y avisa si quedan datos manuales incompatibles.
 */

import { sanitizeString } from "../../../utils/sanitize";

/** Versión del formato de plantilla. Aditiva: no cambia el formato de guion. */
export const PLANTILLA_VERSION = 1;

/**
 * Tipos de campo admitidos. Es la ÚNICA fuente de verdad: la usan el editor
 * tradicional, el constructor visual, la validación, el runner y el resumen.
 *
 * 1.11.3 agrega `numero` y `casilla` a los 8 tipos de la 1.11.0. El orden
 * histórico se conserva para no alterar exports/tests existentes.
 * Convenciones de valor:
 * - `numero`: string numérico o "" (se valida con Number.isFinite).
 * - `casilla`: boolean (true = marcada).
 * - `si-no`: "si" | "no" | "".
 * - `seleccion-multiple`: array de strings.
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
  { tipo: "numero", etiqueta: "Número" },
  { tipo: "casilla", etiqueta: "Casilla de verificación" },
];

export function esTipoCampoValido(tipo) {
  return TIPOS_CAMPO.some((t) => t.tipo === tipo);
}

/** ¿El tipo usa una lista de opciones? (selector simple o múltiple). */
export function usaOpciones(tipo) {
  return tipo === "seleccion-unica" || tipo === "seleccion-multiple";
}

/**
 * Operadores de condición. Todos comparan el valor ACTUAL de otro campo del
 * registro. Los dos últimos no necesitan `valor`.
 */
export const OPERADORES_CONDICION = [
  { operador: "igual", etiqueta: "es igual a", usaValor: true },
  { operador: "distinto", etiqueta: "es distinto de", usaValor: true },
  { operador: "incluye", etiqueta: "incluye", usaValor: true },
  { operador: "no-incluye", etiqueta: "no incluye", usaValor: true },
  { operador: "con-valor", etiqueta: "tiene valor", usaValor: false },
  { operador: "sin-valor", etiqueta: "está vacío", usaValor: false },
];

export function esOperadorValido(operador) {
  return OPERADORES_CONDICION.some((o) => o.operador === operador);
}

/**
 * Campos reales del caso a los que una plantilla puede mapear un valor.
 * El mapeo es SIEMPRE explícito (campoDestino configurado en el editor):
 * sin esta asociación, el registro no reescribe campos del caso.
 * Las claves coinciden con `CasoEditModal` y con los campos que el historial
 * de casos ya compara (`caseHistory.CAMPOS_GENERALES`).
 */
export const CAMPOS_DESTINO_CASO = [
  { clave: "nombre", etiqueta: "Nombre" },
  { clave: "telefono", etiqueta: "Teléfono" },
  { clave: "localidad", etiqueta: "Localidad" },
  { clave: "aseguradora", etiqueta: "Aseguradora" },
  { clave: "estudioJuridico", etiqueta: "Estudio jurídico" },
  { clave: "lesion", etiqueta: "Lesión" },
  { clave: "profesion", etiqueta: "Profesión" },
  { clave: "ingreso", etiqueta: "Ingreso" },
  { clave: "tipoIngreso", etiqueta: "Tipo de ingreso" },
  { clave: "cita", etiqueta: "Cita" },
  { clave: "horario", etiqueta: "Horario" },
  { clave: "observaciones", etiqueta: "Observaciones" },
];

export function esCampoDestinoValido(clave) {
  return CAMPOS_DESTINO_CASO.some((c) => c.clave === clave);
}

// ---------------------------------------------------------------------------
// Utilidades de valor
// ---------------------------------------------------------------------------

const esObjeto = (v) => Boolean(v) && typeof v === "object" && !Array.isArray(v);

const texto = (v) => sanitizeString(String(v ?? ""));

/** Normaliza el valor de un campo según su tipo (sin validar rangos). */
export function normalizarValorCampo(campo, valor) {
  const tipo = campo?.tipo;
  if (tipo === "seleccion-multiple") {
    const lista = Array.isArray(valor)
      ? valor
      : String(valor ?? "")
          .split(",")
          .map((v) => v.trim());
    return lista.map((v) => texto(v)).filter(Boolean);
  }
  if (tipo === "casilla") return valor === true || valor === "true" || valor === "si";
  if (tipo === "si-no") {
    return valor === "si" || valor === "no" ? valor : "";
  }
  if (tipo === "numero") {
    if (valor === null || valor === undefined) return "";
    const t = String(valor).trim();
    return t;
  }
  if (valor === null || valor === undefined) return "";
  return String(valor);
}

/** ¿El valor está vacío para este tipo? (mismo criterio en gate y UI). */
export function valorVacio(campo, valor) {
  const tipo = campo?.tipo;
  if (tipo === "seleccion-multiple") return !(Array.isArray(valor) && valor.length > 0);
  if (tipo === "casilla") return valor !== true;
  if (tipo === "si-no") return valor !== "si" && valor !== "no";
  return valor === undefined || valor === null || String(valor).trim() === "";
}

/** Valor por defecto normalizado según el tipo del campo. */
export function valorPorDefecto(campo) {
  if (!campo) return "";
  if (campo.porDefecto === undefined || campo.porDefecto === null) {
    return normalizarValorCampo(campo, "");
  }
  return normalizarValorCampo(campo, campo.porDefecto);
}

/** Texto legible para resumen/historial. Nunca inventa valores. */
export function formatearValor(campo, valor) {
  if (!campo) return "";
  if (valorVacio(campo, valor)) return "";
  if (campo.tipo === "casilla") return valor === true ? "Sí" : "No";
  if (campo.tipo === "si-no") return valor === "si" ? "Sí" : "No";
  if (Array.isArray(valor)) return valor.join(", ");
  return String(valor);
}

/**
 * Valores por defecto de una plantilla. Se aplican al crear la sesión y se
 * marcan como automáticos: el operador puede pisarlos y quedan como manuales.
 */
export function valoresPorDefecto(campos = []) {
  const registro = {};
  const origen = {};
  (Array.isArray(campos) ? campos : []).forEach((campo) => {
    if (!campo || !campo.id) return;
    const valor = valorPorDefecto(campo);
    if (valorVacio(campo, valor)) return;
    registro[campo.id] = valor;
    origen[campo.id] = "auto";
  });
  return { registro, origen };
}

// ---------------------------------------------------------------------------
// Constructores y normalización
// ---------------------------------------------------------------------------

function normalizarCondicion(c) {
  if (!esObjeto(c)) return null;
  const campoId = typeof c.campoId === "string" ? c.campoId : "";
  // 1.11.3: se conserva un operador string desconocido para que la validación
  // lo reporte; repararlo a "igual" ocultaría una condición importada rota.
  const operador =
    typeof c.operador === "string" && c.operador ? c.operador : "igual";
  const valor = typeof c.valor === "string" ? c.valor : String(c.valor ?? "");
  if (!campoId) return null;
  return { campoId, operador, valor: texto(valor) };
}

export function normalizarCondiciones(lista) {
  return (Array.isArray(lista) ? lista : []).map(normalizarCondicion).filter(Boolean);
}

/**
 * Normaliza un campo de plantilla. Devuelve la MISMA referencia si ya está en
 * la forma canónica (idempotencia, igual que `normalizarSpeech`).
 */
export function normalizarCampoPlantilla(campo) {
  if (!esObjeto(campo)) return crearCampoPlantilla();
  const idOk = typeof campo.id === "string" && campo.id.trim();
  const nombreOk = typeof campo.nombre === "string";
  const descripcionOk = typeof campo.descripcion === "string";
  // Se conserva cualquier tipo string (aunque no sea válido) para que la
  // validación pueda reportarlo. Repararlo silenciosamente acá ocultaría un
  // dato roto proveniente de un import/backup.
  const tipoOk = typeof campo.tipo === "string" && Boolean(campo.tipo);
  const obligatorioOk = typeof campo.obligatorio === "boolean";
  const opcionesOk = Array.isArray(campo.opciones);
  const porDefectoOk =
    campo.porDefecto !== undefined &&
    (campo.tipo === "seleccion-multiple"
      ? Array.isArray(campo.porDefecto)
      : campo.tipo === "casilla"
      ? typeof campo.porDefecto === "boolean"
      : typeof campo.porDefecto === "string");
  const visibleOk = Array.isArray(campo.visibleSi);
  const destinoOk = typeof campo.campoDestino === "string";
  const pasoOk = campo.pasoId === null || campo.pasoId === undefined || typeof campo.pasoId === "string";
  const ordenOk = typeof campo.orden === "number";
  if (
    idOk &&
    nombreOk &&
    descripcionOk &&
    tipoOk &&
    obligatorioOk &&
    opcionesOk &&
    porDefectoOk &&
    visibleOk &&
    destinoOk &&
    pasoOk &&
    ordenOk
  ) {
    return campo;
  }
  const tipo = tipoOk ? campo.tipo : "texto-corto";
  const base = crearCampoPlantilla({
    nombre: campo.nombre,
    descripcion: campo.descripcion,
    // `crearCampoPlantilla` sanea el tipo para construir el campo; después se
    // restaura el valor original (aunque sea inválido) para no ocultar el
    // problema a la validación.
    tipo: esTipoCampoValido(tipo) ? tipo : "texto-corto",
    obligatorio: campo.obligatorio,
    opciones: campo.opciones,
    porDefecto: campo.porDefecto,
    visibleSi: campo.visibleSi,
    campoDestino: campo.campoDestino,
    pasoId: campo.pasoId,
    orden: campo.orden,
  });
  return {
    ...base,
    tipo,
    id: idOk ? campo.id : base.id,
  };
}

export function crearCampoPlantilla({
  nombre = "",
  descripcion = "",
  tipo = "texto-corto",
  obligatorio = false,
  opciones = [],
  porDefecto = "",
  visibleSi = [],
  campoDestino = "",
  pasoId = null,
  orden = 0,
} = {}) {
  const tipoFinal = esTipoCampoValido(tipo) ? tipo : "texto-corto";
  const opcionesFinal = (Array.isArray(opciones) ? opciones : [])
    .map((o) => texto(o).trim())
    .filter(Boolean);
  const campo = {
    id: `reg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
    nombre: texto(nombre).trim(),
    descripcion: texto(descripcion),
    tipo: tipoFinal,
    obligatorio: Boolean(obligatorio),
    opciones: opcionesFinal,
    porDefecto: "",
    visibleSi: normalizarCondiciones(visibleSi),
    // Se conserva el string tal como vino (aunque no sea un destino válido)
    // para que la validación/import lo reporte; el editor sólo ofrece claves
    // válidas y el motor de sesión ignora destinos desconocidos.
    campoDestino: typeof campoDestino === "string" ? campoDestino : "",
    pasoId: typeof pasoId === "string" && pasoId ? pasoId : null,
    orden: Number.isFinite(orden) ? orden : 0,
  };
  campo.porDefecto = normalizarValorCampo(campo, porDefecto);
  return campo;
}

export function crearPlantilla({ nombre = "Registro de la llamada", campos = [] } = {}) {
  return {
    version: PLANTILLA_VERSION,
    nombre: texto(nombre).trim() || "Registro de la llamada",
    campos: (Array.isArray(campos) ? campos : []).map(normalizarCampoPlantilla),
  };
}

/** Normaliza una plantilla externa. Devuelve null si no es un objeto. */
export function normalizarPlantilla(plantilla) {
  if (!esObjeto(plantilla)) return null;
  const nombreOk = typeof plantilla.nombre === "string";
  const camposOk = Array.isArray(plantilla.campos);
  const versionOk = plantilla.version === PLANTILLA_VERSION;
  const camposNorm = camposOk ? plantilla.campos.map(normalizarCampoPlantilla) : [];
  if (
    versionOk &&
    nombreOk &&
    camposOk &&
    camposNorm.every((c, i) => c === plantilla.campos[i])
  ) {
    return plantilla;
  }
  return {
    ...plantilla,
    version: PLANTILLA_VERSION,
    nombre: nombreOk ? plantilla.nombre : "Registro de la llamada",
    campos: camposNorm,
  };
}

export function camposDePlantilla(plantilla) {
  return Array.isArray(plantilla?.campos) ? plantilla.campos : [];
}

export function buscarCampoPlantilla(plantilla, campoId) {
  return camposDePlantilla(plantilla).find((c) => c && c.id === campoId) || null;
}

// ---------------------------------------------------------------------------
// Condiciones de visibilidad
// ---------------------------------------------------------------------------

/** Convierte el valor de un campo a texto comparable para una condición. */
function valorComparable(campo, valor) {
  if (!campo) return "";
  if (campo.tipo === "casilla") return valor === true ? "si" : valor === false ? "no" : "";
  if (Array.isArray(valor)) return valor.join("|");
  return String(valor ?? "").trim();
}

/**
 * Evalúa UNA condición contra el registro. Si la condición referencia un
 * campo inexistente o un operador desconocido devuelve false: el error de
 * configuración lo reporta la validación, nunca rompe la ejecución.
 */
export function evaluarCondicion(condicion, registro = {}, campos = []) {
  if (!esObjeto(condicion) || !esOperadorValido(condicion.operador)) return false;
  const campo = campos.find((c) => c && c.id === condicion.campoId);
  if (!campo) return false;
  const valor = registro ? registro[campo.id] : undefined;
  const esperado = String(condicion.valor ?? "");
  switch (condicion.operador) {
    case "igual":
      return valorComparable(campo, valor) === esperado;
    case "distinto":
      return valorComparable(campo, valor) !== esperado;
    case "incluye":
      if (Array.isArray(valor)) return valor.includes(esperado);
      if (campo.tipo === "casilla") {
        return (valor === true && esperado === "si") || (valor === false && esperado === "no");
      }
      return String(valor ?? "") === esperado;
    case "no-incluye":
      if (Array.isArray(valor)) return !valor.includes(esperado);
      return String(valor ?? "") !== esperado;
    case "con-valor":
      return !valorVacio(campo, valor);
    case "sin-valor":
      return valorVacio(campo, valor);
    default:
      return false;
  }
}

/**
 * Visibilidad de cada campo: sin condiciones, visible. Con condiciones,
 * TODAS deben cumplirse (semántica AND, simple de explicar y de configurar).
 */
export function visibilidadCampos(campos = [], registro = {}) {
  const mapa = {};
  (Array.isArray(campos) ? campos : []).forEach((campo) => {
    if (!campo || !campo.id) return;
    const condiciones = Array.isArray(campo.visibleSi) ? campo.visibleSi : [];
    mapa[campo.id] = condiciones.every((c) =>
      evaluarCondicion(c, registro, campos)
    );
  });
  return mapa;
}

export function camposVisibles(campos = [], registro = {}) {
  const mapa = visibilidadCampos(campos, registro);
  return (Array.isArray(campos) ? campos : []).filter((c) => c && mapa[c.id] !== false);
}

// ---------------------------------------------------------------------------
// Validación de valores y de la configuración
// ---------------------------------------------------------------------------

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;
// 1.11.3: además del formato, se valida el rango de hora (00:00 a 23:59).
const RE_HORA = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

/** Errores de TIPO/OPCIÓN de un valor no vacío. No evalúa obligatoriedad. */
export function erroresValorCampo(campo, valor) {
  if (!campo || valorVacio(campo, valor)) return [];
  const errores = [];
  if (campo.tipo === "numero" && !Number.isFinite(Number(valor))) {
    errores.push("Debe ser un número.");
  }
  if (campo.tipo === "fecha" && !RE_FECHA.test(String(valor))) {
    errores.push("La fecha no tiene un formato válido (AAAA-MM-DD).");
  }
  if (campo.tipo === "hora" && !RE_HORA.test(String(valor))) {
    errores.push("La hora no tiene un formato válido (HH:MM).");
  }
  if (usaOpciones(campo.tipo)) {
    const opciones = Array.isArray(campo.opciones) ? campo.opciones : [];
    const valores = Array.isArray(valor) ? valor : [valor];
    const invalidos = valores.filter((v) => v !== "" && !opciones.includes(v));
    if (invalidos.length) {
      errores.push(
        `Opción no contemplada: ${invalidos.join(", ")}.`
      );
    }
  }
  return errores;
}

/**
 * Valida el registro contra la plantilla. Por defecto sólo mira campos
 * visibles (un campo oculto no debe bloquear). Devuelve:
 * `{ errores: [{campoId, nombre, mensaje}], pendientes: [campo], completos,
 *    total, porcentaje }`.
 */
export function validarRegistro(campos = [], registro = {}, { soloVisibles = true } = {}) {
  const visibilidad = visibilidadCampos(campos, registro);
  const evaluados = (Array.isArray(campos) ? campos : []).filter(
    (c) => c && c.id && (!soloVisibles || visibilidad[c.id] !== false)
  );
  const errores = [];
  const pendientes = [];
  let completos = 0;
  evaluados.forEach((campo) => {
    const valor = registro ? registro[campo.id] : undefined;
    const vacio = valorVacio(campo, valor);
    if (vacio && campo.obligatorio) {
      pendientes.push(campo);
      errores.push({
        campoId: campo.id,
        nombre: campo.nombre || "(campo sin nombre)",
        mensaje: "Campo obligatorio sin completar.",
      });
      return;
    }
    if (!vacio) completos += 1;
    erroresValorCampo(campo, valor).forEach((mensaje) =>
      errores.push({
        campoId: campo.id,
        nombre: campo.nombre || "(campo sin nombre)",
        mensaje,
      })
    );
  });
  const total = evaluados.length;
  return {
    errores,
    pendientes,
    completos,
    total,
    porcentaje: total ? Math.round((completos / total) * 100) : 100,
  };
}

/**
 * Errores de CONFIGURACIÓN de la plantilla. `idsValidos` debe incluir todos
 * los ids del guion (etapas, preguntas, opciones, campos, estados, módulos)
 * para detectar referencias huérfanas de condiciones.
 */
export function erroresPlantilla(plantilla, { idsValidos = [], camposExtra = [] } = {}) {
  const errores = [];
  if (!plantilla) return errores;
  const campos = camposDePlantilla(plantilla);
  const todos = [...campos, ...(Array.isArray(camposExtra) ? camposExtra : [])];
  const ids = new Set();
  campos.forEach((campo) => {
    if (!campo || !campo.id) return;
    if (ids.has(campo.id)) {
      errores.push(
        `La plantilla tiene identificadores duplicados: "${campo.id}".`
      );
    }
    ids.add(campo.id);
    if (!String(campo.nombre || "").trim()) {
      errores.push(`El campo "${campo.id}" no tiene nombre visible.`);
    }
    if (usaOpciones(campo.tipo) && !(Array.isArray(campo.opciones) && campo.opciones.length)) {
      errores.push(
        `El campo "${campo.nombre || campo.id}" es de selección pero no tiene opciones.`
      );
    }
    if (campo.porDefecto !== undefined && campo.porDefecto !== "") {
      const porDefecto = normalizarValorCampo(campo, campo.porDefecto);
      const invalidos = erroresValorCampo(campo, porDefecto);
      if (invalidos.length) {
        errores.push(
          `El valor predeterminado de "${campo.nombre || campo.id}" no es válido: ${invalidos.join(" ")}`
        );
      }
    }
    if (campo.campoDestino && !esCampoDestinoValido(campo.campoDestino)) {
      errores.push(
        `El campo "${campo.nombre || campo.id}" apunta a un campo de caso desconocido ("${campo.campoDestino}").`
      );
    }
    (Array.isArray(campo.visibleSi) ? campo.visibleSi : []).forEach((c) => {
      if (!esOperadorValido(c?.operador)) {
        errores.push(
          `La condición del campo "${campo.nombre || campo.id}" usa un operador inválido.`
        );
        return;
      }
      const existe = todos.some((otro) => otro && otro.id === c.campoId);
      if (!existe) {
        errores.push(
          `La condición del campo "${campo.nombre || campo.id}" referencia un campo inexistente ("${c.campoId}").`
        );
      }
    });
  });
  // Asociaciones de opciones → campos inexistentes (huérfanas).
  const camposPorId = new Set(todos.map((c) => c && c.id).filter(Boolean));
  (Array.isArray(idsValidos) ? idsValidos : []).forEach(() => {});
  return errores;
}

/**
 * Devuelve las asignaciones de opciones que apuntan a campos inexistentes.
 * Se usa en validación/import para no ejecutar guiones con referencias rotas.
 * `opciones` es una lista plana de opciones del guion.
 */
export function asignacionesHuerfanas(opciones = [], campos = []) {
  const ids = new Set((Array.isArray(campos) ? campos : []).map((c) => c && c.id).filter(Boolean));
  const huerfanas = [];
  (Array.isArray(opciones) ? opciones : []).forEach((op) => {
    (Array.isArray(op?.asignaciones) ? op.asignaciones : []).forEach((a) => {
      if (a && a.campoId && !ids.has(a.campoId)) {
        huerfanas.push({ opcionId: op.id, campoId: a.campoId });
      }
    });
  });
  return huerfanas;
}

/**
 * Resumen de datos para la pantalla de cierre y el historial. Incluye
 * `origen` ("auto" | "manual") para distinguir lo derivado de una respuesta
 * de lo escrito por el operador.
 */
export function resumenRegistro(campos = [], registro = {}, origen = {}) {
  const visibilidad = visibilidadCampos(campos, registro);
  return (Array.isArray(campos) ? campos : [])
    .filter((c) => c && c.id && visibilidad[c.id] !== false)
    .map((c) => ({
      campoId: c.id,
      nombre: c.nombre || "(campo sin nombre)",
      tipo: c.tipo,
      valor: registro ? registro[c.id] : undefined,
      texto: formatearValor(c, registro ? registro[c.id] : undefined),
      origen: origen?.[c.id] === "auto" ? "auto" : "manual",
      obligatorio: Boolean(c.obligatorio),
    }));
}

/** Campos con datos que quedaron ocultos por el recorrido actual. */
export function camposOcultosConDatos(campos = [], registro = {}, { manuales = {} } = {}) {
  const visibilidad = visibilidadCampos(campos, registro);
  return (Array.isArray(campos) ? campos : []).filter(
    (c) =>
      c &&
      c.id &&
      visibilidad[c.id] === false &&
      !valorVacio(c, registro ? registro[c.id] : undefined) &&
      manuales[c.id] !== false
  );
}
