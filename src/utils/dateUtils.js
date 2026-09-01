import { MESES } from "./constants";

export function hoyDDMM() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1
  ).padStart(2, "0")}`;
}

export function hoyISO() {
  return toLocalDateStr(new Date());
}

export function mesLabel(yyyyMM) {
  const [y, m] = (yyyyMM || "").split("-");
  if (!y || !m) return yyyyMM;
  return `${MESES[parseInt(m, 10) - 1] || m} ${y}`;
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function formatearFecha(fecha, formato = "DD/MM/YYYY") {
  if (!fecha) return "";
  // Fecha solo-día (YYYY-MM-DD): se formatea por partes porque new Date()
  // la interpreta como UTC medianoche y los getters locales mostraban el
  // día anterior en zonas UTC-negativas (ej: Argentina UTC-3).
  const soloDia = String(fecha).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s]|$)/);
  let dia, mes, año;
  if (soloDia) {
    [, año, mes, dia] = soloDia;
  } else {
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return fecha;
    dia = String(d.getDate()).padStart(2, "0");
    mes = String(d.getMonth() + 1).padStart(2, "0");
    año = d.getFullYear();
  }

  switch (formato) {
    case "DD/MM":
      return `${dia}/${mes}`;
    case "DD/MM/YYYY":
      return `${dia}/${mes}/${año}`;
    case "YYYY-MM-DD":
      return `${año}-${mes}-${dia}`;
    case "MM/DD":
      return `${mes}/${dia}`;
    default:
      return `${dia}/${mes}/${año}`;
  }
}

/**
 * Convierte un Date a string YYYY-MM-DD usando hora LOCAL, no UTC.
 * Esto corrige el bug donde toISOString() en Argentina (UTC-3) devolvía
 * el día siguiente para horas entre medianoche y las 3 AM.
 */
export function toLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
