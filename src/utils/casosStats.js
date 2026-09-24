/**
 * casosStats
 * Estadísticas de distribución de casos por estado. Única fuente de verdad
 * para los conteos usados por la Pipeline Bar (segmentos y leyenda), evitando
 * el cómputo duplicado inline.
 */

/**
 * Devuelve un mapa { estado: cantidad } sobre los casos dados.
 */
export function contarCasosPorEstado(casos) {
  const counts = {};
  for (const c of casos || []) {
    const key = c.estado || "Sin estado";
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

export default contarCasosPorEstado;