/**
 * filtrarQuickFilter
 * Lógica pura del "filtro rápido" (quickFilter) del dashboard y de la Pipeline
 * Bar. Única fuente de verdad para aplicar un quickFilter sobre una lista de
 * casos, extraída del bloque de App.jsx para poder testearla de forma aislada.
 *
 * Contrato del quickFilter:
 *  - null | { tipo: string, valor: string | string[] }
 *  - tipo "grupo": valor es un string entre ACTIVOS / CERRADOS / FIRMAS /
 *    PERDIDOS / SINRESPUESTA / SINREPORTE / SINASIGNACION (rótulos de métricas).
 *  - tipo "sinReporte": filtra casos sin historial de reportes.
 *  - cualquier otro tipo (ej. "estado", "aseguradora", "estudioJuridico",
 *    "provincia"): comparación por igualdad exacta (normalizada a mayúsculas y
 *    trim). Si valor es un array (multi-selección de estados en la Pipeline
 *    Bar), la coincidencia es OR sobre los valores.
 */

function norm(v) {
  return String(v).trim().toUpperCase();
}

/**
 * Normaliza el valor del quickFilter a un array de strings normalizados.
 * Acepta tanto un único string (legacy / dashboard) como un array.
 */
export function quickFilterValues(quickFilter) {
  if (!quickFilter || !quickFilter.tipo) return [];
  const v = quickFilter.valor;
  if (Array.isArray(v)) return v.map(norm).filter(Boolean);
  if (v === undefined || v === null) return [];
  return [norm(v)];
}

/**
 * Aplica el quickFilter sobre los casos.
 * `categories` (opcional): { lost?, success?, pending?, contact? } arrays de
 * estados pertenecientes a cada categoría (las categorías del dashboard).
 */
export function aplicarQuickFilter(casos, quickFilter, categories = {}) {
  if (!quickFilter || !quickFilter.tipo || !quickFilter.valor) return casos;

  const cats = {
    lost: categories.lost || [],
    success: categories.success || [],
    pending: categories.pending || [],
  };
  const values = quickFilterValues(quickFilter);
  if (values.length === 0) return casos;
  const isArray = Array.isArray(quickFilter.valor);
  const qv = values[0];
  let filtered = casos;

  if (quickFilter.tipo === "grupo") {
    switch (qv) {
      case "ACTIVOS":
        filtered = filtered.filter(
          (c) => !cats.lost.includes(c.estado) && !cats.success.includes(c.estado)
        );
        break;
      case "CERRADOS":
        filtered = filtered.filter(
          (c) => cats.lost.includes(c.estado) || cats.success.includes(c.estado)
        );
        break;
      case "FIRMAS":
        filtered = filtered.filter((c) => cats.success.includes(c.estado));
        break;
      case "PERDIDOS":
        filtered = filtered.filter((c) => cats.lost.includes(c.estado));
        break;
      case "SINRESPUESTA":
        filtered = filtered.filter((c) => cats.pending.includes(c.estado));
        break;
      case "SINREPORTE":
        filtered = filtered.filter(
          (c) => !c.reporteHistory || c.reporteHistory.length === 0
        );
        break;
      case "SINASIGNACION":
        filtered = filtered.filter((c) => !(c.estudioJuridico || "").trim());
        break;
      default:
        break;
    }
  } else if (quickFilter.tipo === "sinReporte") {
    filtered = filtered.filter(
      (c) => !c.reporteHistory || c.reporteHistory.length === 0
    );
  } else {
    filtered = filtered.filter((c) => {
      const cv = norm(c[quickFilter.tipo] || "");
      return isArray ? values.includes(cv) : cv === qv;
    });
  }

  return filtered;
}

/**
 * Devuelve los estados seleccionados (array) del quickFilter actual, o [].
 * Útil para la Pipeline Bar: valida multi-selección y single legacy.
 */
export function quickFilterEstados(quickFilter) {
  if (!quickFilter || quickFilter.tipo !== "estado") return [];
  if (Array.isArray(quickFilter.valor)) return quickFilter.valor;
  return quickFilter.valor ? [quickFilter.valor] : [];
}

export default aplicarQuickFilter;