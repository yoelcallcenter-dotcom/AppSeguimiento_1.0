/**
 * filtrarQuickFilter
 * Lógica pura del "filtro rápido" (quickFilter) del dashboard y de la Pipeline
 * Bar. Única fuente de verdad para aplicar un quickFilter sobre una lista de
 * casos, extraída del bloque de App.jsx para poder testearla de forma aislada.
 *
 * Contrato del quickFilter:
 *  - null | { tipo: string, valor: string | string[] }
 *  - tipo "grupo": valor es un string entre ACTIVOS / CERRADOS / FIRMAS /
 *    PERDIDOS / PENDIENTES / SINRESPUESTA / SINREPORTE / SINASIGNACION
 *    (rótulos de métricas).
 *  - tipo "sinReporte": filtra casos sin historial de reportes.
 *  - cualquier otro tipo (ej. "estado", "aseguradora", "estudioJuridico",
 *    "provincia"): comparación por igualdad exacta (normalizada a mayúsculas y
 *    trim). Si valor es un array (multi-selección de estados en la Pipeline
 *    Bar), la coincidencia es OR sobre los valores.
 */

// v1.9.7 (fix B1): para aplicarBusquedaFiltro (filtro "hoy" normalizado).
import { normalizeDate } from "./dateFilters";
import { hoyISO } from "./dateUtils";

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
    contact: categories.contact || [],
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
      case "PENDIENTES":
        filtered = filtered.filter((c) => cats.contact.includes(c.estado));
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

const GRUPO_LABELS = {
  ACTIVOS: "Activos",
  CERRADOS: "Cerrados",
  FIRMAS: "Firmas",
  PERDIDOS: "Perdidos",
  PENDIENTES: "Pendientes",
  SINRESPUESTA: "Sin respuesta",
  SINREPORTE: "Sin reporte",
  SINASIGNACION: "Sin asignación",
};

const TIPO_LABELS = {
  estado: "Estado",
  aseguradora: "Aseguradora",
  localidad: "Localidad",
  estudioJuridico: "Estudio",
  provincia: "Provincia",
  tipo: "Tipo",
  tipoIngreso: "Tipo de ingreso",
  origen: "Origen",
};

function formatValores(valores) {
  if (valores.length <= 3) return valores.join(", ");
  return `${valores.slice(0, 3).join(", ")} (+${valores.length - 3})`;
}

/**
 * Rótulo de chip para el header (mismo formato "Etiqueta: valor" que los
 * chips de `filtroGlobal`). Devuelve `null` si no hay filtro rápido.
 */
export function quickFilterChip(quickFilter) {
  if (!quickFilter || !quickFilter.tipo) return null;
  const { tipo, valor } = quickFilter;
  if (valor === undefined || valor === null || valor === "") return null;

  if (tipo === "sinReporte") {
    return { key: "quick:sinReporte", label: "Sin reporte", valor: "" };
  }

  if (tipo === "grupo") {
    const grupo = String(valor).trim().toUpperCase();
    return {
      key: "quick:grupo",
      label: "Grupo",
      valor: GRUPO_LABELS[grupo] || grupo,
    };
  }

  const valores = (Array.isArray(valor) ? valor : [valor])
    .map((v) => String(v).trim())
    .filter(Boolean);
  if (valores.length === 0) return null;

  const label =
    TIPO_LABELS[tipo] || tipo.charAt(0).toUpperCase() + tipo.slice(1);
  return { key: `quick:${tipo}`, label, valor: formatValores(valores) };
}

/**
 * Acciones rápidas del dashboard ⇄ filtro rápido (`tipo: "grupo"`).
 * Compartidas por "Acciones rápidas", el drill de métricas y los chips del
 * header, para que todos filtren con el mismo mecanismo.
 */
export const ACCIONES_RAPIDAS = {
  pendientes: { tipo: "grupo", valor: "pendientes" },
  firmas: { tipo: "grupo", valor: "firmas" },
  perdidos: { tipo: "grupo", valor: "perdidos" },
  sinReporte: { tipo: "grupo", valor: "sinreporte" },
};

export function accionToQuickFilter(accion) {
  return ACCIONES_RAPIDAS[accion] || null;
}

/** Id de la acción rápida equivalente, o null si no corresponde a ninguna. */
export function quickFilterToAccion(quickFilter) {
  if (!quickFilter || quickFilter.tipo !== "grupo") return null;
  const valor = String(quickFilter.valor || "").trim().toUpperCase();
  const hit = Object.entries(ACCIONES_RAPIDAS).find(
    ([, f]) => f.valor.toUpperCase() === valor
  );
  return hit ? hit[0] : null;
}

/**
 * Filtro de búsqueda persistente (`config.busquedaFiltro`), extraído de
 * App.jsx con el mismo criterio que aplicarQuickFilter: lógica pura testeable.
 *
 * v1.9.7 (fix B1): el branch "hoy" comparaba `c.fecha.slice(0,10)` con la fecha
 * en UTC de toISOString(). Dos bugs: (1) una fecha legada DD/MM/YYYY nunca
 * coincidía → la lista quedaba vacía; (2) en UTC-3, entre 21:00 y medianoche
 * "hoy" ya era mañana. Ahora: normalizeDate admite ambos formatos y `hoy`
 * (por defecto hoyISO()) es el día en hora local. El parámetro `hoy` permite
 * testear con fechas fijas.
 *
 * @param {Array} casos
 * @param {string} filtro "todos" | "activos" | "pendientes" | "hoy"
 * @param {object} categories { lost, contact } categorías de estados
 * @param {string} hoy YYYY-MM-DD en hora local (default: hoyISO())
 */
export function aplicarBusquedaFiltro(
  casos,
  filtro = "todos",
  categories = {},
  hoy = hoyISO()
) {
  if (filtro === "activos") {
    const lost = categories.lost || [];
    return casos.filter((c) => !lost.includes(c.estado));
  }
  if (filtro === "pendientes") {
    const contact = categories.contact || [];
    return casos.filter((c) => contact.includes(c.estado));
  }
  if (filtro === "hoy") {
    return casos.filter((c) => normalizeDate(c.fecha) === hoy);
  }
  return casos;
}

export default aplicarQuickFilter;