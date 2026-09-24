/**
 * miEspacioConfig.js
 * Configuración del centro de trabajo "Hoy" (Mi Espacio 2.0, v1.7.11).
 * Los 9 bloques del día se muestran en un orden configurable que se persiste
 * en operatorSettings.miEspacioOrder (sin stores paralelos).
 */

export const MI_ESPACIO_KEYS = [
  "hoy",
  "jornada",
  "proxima",
  "eventos",
  "pendientes",
  "productividad",
  "metas",
  "acciones",
  "accesos",
];

export const DEFAULT_MI_ESPACIO_ORDER = [...MI_ESPACIO_KEYS];

export const MI_ESPACIO_LABELS = {
  hoy: "Hoy / Bienvenida",
  jornada: "Mi Jornada",
  proxima: "Próxima actividad",
  eventos: "Próximos eventos",
  pendientes: "Pendientes",
  productividad: "Productividad",
  metas: "Metas",
  acciones: "Acciones rápidas",
  accesos: "Accesos personales",
};

const KNOWN = new Set(MI_ESPACIO_KEYS);

/**
 * Normaliza un orden de secciones persistido: conserva las claves válidas,
 * evita duplicados y agrega las secciones faltantes en su posición de default.
 * @param {string[]} [order]
 * @returns {string[]}
 */
export function getOrderedMiEspacioKeys(order) {
  const seen = new Set();
  const ordered = [];
  for (const key of Array.isArray(order) ? order : MI_ESPACIO_KEYS) {
    if (!KNOWN.has(key) || seen.has(key)) continue;
    seen.add(key);
    ordered.push(key);
  }
  for (const key of MI_ESPACIO_KEYS) {
    if (!seen.has(key)) ordered.push(key);
  }
  return ordered;
}