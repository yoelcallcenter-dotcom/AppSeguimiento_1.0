/**
 * conversaciones.js  (1.9.6)
 * Modelo de datos de la feature "Conversación Sugerida" (Útiles → Textos).
 *
 * Qué cambió y por qué (release 1.9.6):
 * - Las categorías dejaron de estar hardcodeadas en ConversacionesSugeridasView:
 *   ahora se leen de `config.conversacionesCategorias` (catálogo editable desde
 *   Configuración → General → Conversación Sugerida). Sin la clave en config se
 *   usan las 4 categorías originales, por lo que instalaciones viejas no migran.
 * - Igual que en getTemplateCategories, una lista presente se usa tal cual: una
 *   lista vacía es legítima ("borré todas") y NO debe resucitar los defaults.
 * - Nuevas variables con llaves {NOMBRE_VARIABLE} configurables en
 *   `config.conversacionesVariables` (valor fijo por variable). La resolución
 *   al copiar antes era hardcodeada a {OPERADOR}; ahora resuelve todas las
 *   variables y deja literales las que no tienen valor (se muestran resaltadas
 *   en la vista previa para que el operador note que falta configurarlas).
 * - El acceso a localStorage (claves conversaciones_*) se centralizó acá para
 *   que la vista, el badge de UtilesView y Configuración usen la misma lógica
 *   de fallback: categorías originales → DEFAULT_PLANTILLAS; categorías nuevas
 *   → lista vacía (antes una categoría nueva heredaba plantillas ajenas).
 *
 * Riesgos conocidos: no cambia el formato de los datos persistidos (sigue siendo
 * `string[]` en claves `conversaciones_*`), por lo que backups, restore y reset
 * existentes siguen funcionando sin migración.
 */

import { DEFAULT_PLANTILLAS } from "./constants";
import { normalizarTexto } from "./helpers";
import { sanitizeString } from "./sanitize";

/** Categorías originales (1.9.5 y anteriores). El orden importa: es el de las pestañas. */
export const CATEGORIAS_CONVERSACION_DEFAULT = [
  "Accidente Laboral",
  "Enfermedad Profesional",
  "Accidente de Transito",
  "Referencia",
];

/** Variable reservada: su valor sale de `config.operador`, no se configura aparte. */
export const VARIABLE_OPERADOR = "OPERADOR";

/** Regex de variables: MAYÚSCULAS, guiones bajos y dígitos (1.9.6 permite {HORARIO2}). */
export const LLAVES_VARIABLES_REGEX = /\{([A-Z0-9_]+)\}/g;

/**
 * Categorías configuradas. `undefined` (config vieja) → defaults; un array
 * presente —aunque esté vacío— se respeta tal cual.
 */
export function getConversacionesCategorias(config) {
  const list = config?.conversacionesCategorias;
  return Array.isArray(list) ? list : CATEGORIAS_CONVERSACION_DEFAULT;
}

/** ¿La categoría existe entre las 4 originales? Define plantillas default y "Restaurar originales". */
export function esCategoriaDefault(nombre) {
  return CATEGORIAS_CONVERSACION_DEFAULT.includes(nombre);
}

/**
 * Clave de localStorage para una categoría (conserva el formato histórico
 * `conversaciones_<nombre con espacios a _>` para no romper backups viejos).
 */
export function claveCategoria(nombre) {
  return `conversaciones_${String(nombre ?? "").trim().replace(/\s+/g, "_")}`;
}

/**
 * Normaliza el nombre de una variable al formato que acepta el resolutor:
 * mayúsculas, espacios → "_", sin caracteres fuera de [A-Z0-9_].
 */
export function normalizarNombreVariable(raw) {
  return String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
}

/**
 * Variables configuradas (sin OPERADOR, que es reservada).
 * Rehidrata entradas corruptas y elimina duplicados conservando la primera.
 */
export function getConversacionesVariables(config) {
  const list = config?.conversacionesVariables;
  if (!Array.isArray(list)) return [];
  const vistas = new Set();
  const resultado = [];
  for (const item of list) {
    const nombre =
      typeof item === "string"
        ? normalizarNombreVariable(item)
        : normalizarNombreVariable(item?.nombre);
    const valor = typeof item?.valor === "string" ? item.valor : "";
    if (!nombre || nombre === VARIABLE_OPERADOR || vistas.has(nombre)) continue;
    vistas.add(nombre);
    resultado.push({ nombre, valor });
  }
  return resultado;
}

/**
 * Mapa nombre → valor para resolver. OPERADOR siempre está presente y sale de
 * `config.operador` (fallback "Operador", igual que en 1.9.5).
 * Las variables con valor vacío NO entran al mapa → quedan literales.
 */
export function mapaVariables(config) {
  const map = new Map();
  for (const v of getConversacionesVariables(config)) {
    if (v.valor) map.set(v.nombre, v.valor);
  }
  const operador = String(config?.operador ?? "").trim();
  map.set(VARIABLE_OPERADOR, operador || "Operador");
  return map;
}

/**
 * Reemplaza {VARIABLE} por su valor. Las variables sin valor configurado
 * quedan literales (decisión 1.9.6: cero sorpresas al copiar).
 */
export function resolverConversacion(texto, config) {
  const map = mapaVariables(config);
  return String(texto ?? "").replace(LLAVES_VARIABLES_REGEX, (match, nombre) =>
    map.has(nombre) ? map.get(nombre) : match
  );
}

/**
 * Descompone un texto en partes para la vista previa:
 * [{tipo:"texto", valor}] | [{tipo:"variable", nombre, valor|null, resuelta}]
 * `valor === null` significa "sin valor configurado" (se resalta en alerta).
 */
export function parsearVariables(texto, config) {
  const map = mapaVariables(config);
  const partes = [];
  const original = String(texto ?? "");
  const regex = new RegExp(LLAVES_VARIABLES_REGEX.source, "g");
  let ultimo = 0;
  let m;
  while ((m = regex.exec(original)) !== null) {
    if (m.index > ultimo) {
      partes.push({ tipo: "texto", valor: original.slice(ultimo, m.index) });
    }
    const resuelta = map.has(m[1]);
    partes.push({
      tipo: "variable",
      nombre: m[1],
      valor: resuelta ? map.get(m[1]) : null,
      resuelta,
    });
    ultimo = m.index + m[0].length;
  }
  if (ultimo < original.length) {
    partes.push({ tipo: "texto", valor: original.slice(ultimo) });
  }
  return partes;
}

/** Distintos nombres de variables usadas en un texto (para diagnósticos/contador). */
export function llavesUsadas(texto) {
  const regex = new RegExp(LLAVES_VARIABLES_REGEX.source, "g");
  const encontradas = new Set();
  let m;
  while ((m = regex.exec(String(texto ?? ""))) !== null) encontradas.add(m[1]);
  return [...encontradas];
}

/**
 * Lectura de mensajes de una categoría con fallback correcto.
 * No escribe en storage (igual que 1.9.5): solo devuelve los defaults.
 */
export function leerMensajes(categoria, config) {
  try {
    const raw = localStorage.getItem(claveCategoria(categoria));
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr;
    }
  } catch {
    // JSON corrupto: cae al fallback de abajo.
  }
  return esCategoriaDefault(categoria) ? [...DEFAULT_PLANTILLAS] : [];
}

/** Escritura saneada de mensajes. Devuelve la lista ya saneada. */
export function guardarMensajes(categoria, mensajes) {
  const saneados = (Array.isArray(mensajes) ? mensajes : []).map((m) =>
    sanitizeString(String(m ?? ""))
  );
  localStorage.setItem(claveCategoria(categoria), JSON.stringify(saneados));
  return saneados;
}

/** Conteo de mensajes (badge de UtilesView). */
export function contarMensajes(categoria, config) {
  return leerMensajes(categoria, config).length;
}

/** Total de mensajes de todas las categorías configuradas (badge). */
export function contarMensajesConversacion(config) {
  return getConversacionesCategorias(config).reduce(
    (total, cat) => total + contarMensajes(cat, config),
    0
  );
}

/**
 * Renombra la clave de localStorage de una categoría (para que los mensajes
 * sigan visibles tras el rename en Configuración).
 * Devuelve false si la clave destino ya existe (nunca pisar datos).
 */
export function renombrarCategoria(viejo, nuevo) {
  const origen = claveCategoria(viejo);
  const destino = claveCategoria(nuevo);
  if (origen === destino) return true;
  if (localStorage.getItem(destino) !== null) return false;
  const actual = localStorage.getItem(origen);
  if (actual !== null) {
    localStorage.setItem(destino, actual);
    localStorage.removeItem(origen);
  }
  return true;
}

/** Borra los mensajes de una categoría (baja desde Configuración). */
export function eliminarMensajes(categoria) {
  localStorage.removeItem(claveCategoria(categoria));
}

/** Primer error de validación de nombre de categoría, o null si es válido. */
export function errorNombreCategoria(nombre, existentes) {
  const limpio = String(nombre ?? "").trim();
  if (!limpio) return "Indicá el nombre de la categoría";
  const normalizado = normalizarTexto(limpio);
  if (existentes.some((c) => normalizarTexto(c) === normalizado)) {
    return "Ya existe una categoría con ese nombre";
  }
  const claveYaUsada = existentes.some((c) => claveCategoria(c) === claveCategoria(limpio));
  if (claveYaUsada) return "Ese nombre genera una clave duplicada";
  return null;
}

/**
 * Primer error de validación de nombre de variable, o null si es válido.
 * `existente` = nombre en edición (para renombrar sin chocar consigo mismo).
 */
export function errorNombreVariable(nombre, otras, existente = null) {
  const limpio = normalizarNombreVariable(nombre);
  if (!limpio) return "Usá solo letras, números y guiones bajos";
  if (limpio === VARIABLE_OPERADOR) return "OPERADOR es reservada (sale del campo Operador)";
  if (
    otras.some(
      (v) => normalizarNombreVariable(v) === limpio && v !== existente
    )
  ) {
    return "Ya existe una variable con ese nombre";
  }
  return null;
}
