/**
 * catalogos.js
 * Resolución de catálogos configurables: Estados de Caso y Tipos de Ingreso.
 * Los catálogos viven en `config` (persistidos en localStorage y en backups);
 * esta capa garantiza que siempre exista un valor válido aunque el usuario no
 * los haya personalizado todavía.
 */

import {
  ESTADOS,
  TIPOS_INGRESO_SUGERIDOS,
  TEMPLATE_CATEGORIES_SUGERIDOS,
  DEFAULT_FICHA_FIELDS,
  FICHA_TARGET_OPCIONES,
} from "./constants";
import { normalizarTexto } from "./helpers";

/**
 * Devuelve la lista de estados configurada. Cada entrada: { v, accent, peso }.
 * Si `config.estados` está vacío o no es un array con elementos válidos,
 * se usa la lista por defecto.
 * Si faltan estados del default (por actualizaciones), se agregan al final
 * manteniendo los que el usuario ya tiene.
 */
export function getEstados(config) {
  const list = config?.estados;
  if (!Array.isArray(list) || list.length === 0) {
    return ESTADOS;
  }
  const existing = new Set(list.map((e) => e.v));
  const missing = ESTADOS.filter((e) => !existing.has(e.v));
  if (missing.length === 0) return list;
  return [...list, ...missing];
}

/**
 * Garantiza que un tipo de ingreso tenga siempre los campos nuevos (keywords,
 * keywordsPriority) aunque venga de una configuración de una versión anterior
 * (donde los tipos eran strings). Para tipos con el mismo nombre que los
 * defaults se heredan las palabras clave por defecto (puramente aditivo:
 * nunca se pierde configuración).
 */
function rehidratarTipoIngreso(t) {
  if (typeof t === "string") {
    const def = TIPOS_INGRESO_SUGERIDOS.find((d) => d.v === t);
    return {
      v: t,
      keywords: def?.keywords || [],
      keywordsPriority: def?.keywordsPriority ?? 3,
    };
  }
  const def = TIPOS_INGRESO_SUGERIDOS.find((d) => d.v === t?.v);
  const priority = Number(t?.keywordsPriority);
  return {
    ...t,
    v: t?.v || "",
    keywords: Array.isArray(t?.keywords)
      ? t.keywords
      : (def?.keywords || []),
    keywordsPriority:
      t?.keywordsPriority !== undefined &&
      t?.keywordsPriority !== null &&
      Number.isFinite(priority)
        ? priority
        : (def?.keywordsPriority ?? 3),
  };
}

/**
 * Devuelve la lista de tipos de ingreso configurada. Cada entrada:
 * { v, keywords, keywordsPriority }.
 * Si `config.tiposIngreso` está vacío o no es un array con elementos válidos,
 * se usa la lista por defecto.
 * Si faltan tipos del default (por actualizaciones), se agregan al final
 * manteniendo los que el usuario ya tiene.
 */
export function getTiposIngreso(config) {
  const list = config?.tiposIngreso;
  if (!Array.isArray(list) || list.length === 0) {
    return TIPOS_INGRESO_SUGERIDOS.map(rehidratarTipoIngreso);
  }
  const result = list.map(rehidratarTipoIngreso);
  const existing = new Set(result.map((t) => t.v).filter(Boolean));
  const missing = TIPOS_INGRESO_SUGERIDOS.filter((d) => !existing.has(d.v));
  if (missing.length === 0) return result;
  return [...result, ...missing];
}

/**
 * Devuelve la definición de un estado (v, accent, peso) o null si no existe.
 */
export function getEstadoInfo(config, estado) {
  if (!estado) return null;
  return getEstados(config).find((e) => e.v === estado) || null;
}

/**
 * Devuelve el color (accent) de un estado, con fallback.
 */
export function getEstadoAccent(config, estado) {
  return getEstadoInfo(config, estado)?.accent || "#6B7280";
}

/**
 * Devuelve el peso de un estado para corregir las estadísticas (default 1).
 */
export function getEstadoPeso(config, estado) {
  return Number(getEstadoInfo(config, estado)?.peso || 1) || 1;
}

/**
 * Calcula la sumatoria ponderada de un subconjunto de casos según el peso de
 * su estado. Se usa para corregir las estadísticas del dashboard.
 */
export function sumarPeso(config, casos) {
  let total = 0;
  for (const c of casos || []) {
    total += getEstadoPeso(config, c?.estado);
  }
  return total;
}

/**
 * Devuelve la lista de categorías de plantillas configurada (array de strings).
 */
export function getTemplateCategories(config) {
  const list = config?.templateCategories;
  if (Array.isArray(list) && list.length > 0) {
    return list;
  }
  return TEMPLATE_CATEGORIES_SUGERIDOS;
}

const FICHA_TARGETS_VALIDOS = new Set(FICHA_TARGET_OPCIONES.map((o) => o.v));

/**
 * Garantiza que un campo de ficha tenga siempre id, label, keywords y un
 * target válido aunque venga de una configuración de una versión anterior.
 * Campos sin palabras clave o con destino "Ignorar" quedan inactivos.
 */
function rehidratarCampoFicha(campo, orden) {
  const keywords = Array.isArray(campo?.keywords)
    ? campo.keywords.filter((k) => typeof k === "string" && k.trim())
    : [];
  const id =
    typeof campo?.id === "string" && campo.id.trim()
      ? campo.id.trim()
      : `campo-${orden}`;
  return {
    id,
    label: typeof campo?.label === "string" ? campo.label : "",
    keywords,
    target:
      typeof campo?.target === "string" && FICHA_TARGETS_VALIDOS.has(campo.target)
        ? campo.target
        : "",
  };
}

/**
 * Devuelve la lista de campos de ficha configurada. Cada entrada:
 * { id, label, keywords, target }.
 * Si `config.fichaFields` está vacío o no es un array, se usa la lista por
 * defecto. Si faltan campos del default (por actualizaciones o borrados), se
 * agregan al final manteniendo los que el usuario ya tiene (aditivo).
 */
export function getFichaFields(config) {
  const list = config?.fichaFields;
  if (!Array.isArray(list) || list.length === 0) {
    return DEFAULT_FICHA_FIELDS;
  }
  const result = list.map(rehidratarCampoFicha);
  const existing = new Set(result.map((f) => f.id));
  const missing = DEFAULT_FICHA_FIELDS.filter((d) => !existing.has(d.id));
  if (missing.length === 0) return result;
  return [...result, ...missing];
}

/**
 * Detecta automáticamente el tipo de ingreso de un caso a partir de las
 * palabras clave configuradas por cada tipo. Proceso determinístico (sin IA):
 *  1. Se normaliza el texto pegado (minúsculas y sin acentos).
 *  2. Por cada tipo con palabras clave se buscan coincidencias por subcadena.
 *  3. Si múltiples tipos coinciden, gana el de menor keywordsPriority (1 es
 *     el de mayor prioridad); en empate, el primer tipo en la lista.
 * Devuelve { tipoIngreso, coincidencias } o { tipoIngreso: null,
 * coincidencias: [] } si no hay ninguna coincidencia.
 */
export function detectarTipoIngresoPorKeywords(texto, config) {
  const nt = normalizarTexto(texto || "");
  if (!nt) return { tipoIngreso: null, coincidencias: [] };

  const conKeywords = getTiposIngreso(config).filter(
    (t) => Array.isArray(t.keywords) && t.keywords.length > 0
  );
  if (conKeywords.length === 0) return { tipoIngreso: null, coincidencias: [] };

  const matches = [];
  for (const t of conKeywords) {
    for (const kw of t.keywords) {
      const nk = normalizarTexto(kw);
      if (nk && nt.includes(nk)) {
        matches.push({
          tipoIngreso: t.v,
          keyword: kw,
          prioridad:
            t.keywordsPriority !== undefined &&
            t.keywordsPriority !== null &&
            Number.isFinite(Number(t.keywordsPriority))
              ? Number(t.keywordsPriority)
              : 3,
        });
      }
    }
  }
  if (matches.length === 0) return { tipoIngreso: null, coincidencias: [] };

  matches.sort(
    (a, b) => a.prioridad - b.prioridad || a.tipoIngreso.localeCompare(b.tipoIngreso)
  );
  return {
    tipoIngreso: matches[0].tipoIngreso,
    coincidencias: matches.map((m) => m.keyword),
  };
}