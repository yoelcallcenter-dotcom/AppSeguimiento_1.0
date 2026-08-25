/**
 * catalogos.js
 * Resolución de catálogos configurables: Estados de Caso y Tipos de Ingreso.
 * Los catálogos viven en `config` (persistidos en localStorage y en backups);
 * esta capa garantiza que siempre exista un valor válido aunque el usuario no
 * los haya personalizado todavía.
 */

import { ESTADOS, TIPOS_INGRESO_SUGERIDOS } from "./constants";

/**
 * Devuelve la lista de estados configurada. Cada entrada: { v, accent, peso }.
 * Si `config.estados` está vacío o no es un array con elementos válidos,
 * se usa la lista por defecto.
 */
export function getEstados(config) {
  const list = config?.estados;
  if (Array.isArray(list) && list.length > 0) {
    return list;
  }
  return ESTADOS;
}

/**
 * Devuelve la lista de tipos de ingreso configurada (array de strings).
 */
export function getTiposIngreso(config) {
  const list = config?.tiposIngreso;
  if (Array.isArray(list) && list.length > 0) {
    return list;
  }
  return TIPOS_INGRESO_SUGERIDOS;
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
