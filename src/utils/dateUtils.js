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

/**
 * 1.10.3 (rediseño modales de evento): etiqueta corta de una fecha ISO
 * "YYYY-MM-DD" para previews ("19 oct"). Se parsea el string a partes (como
 * formatearFecha) porque new Date sobre un solo-día lo interpreta en UTC y
 * en Argentina mostraba el día anterior.
 */
export function fechaCortaLabel(iso) {
  if (!iso) return "";
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(iso);
  const mes = (MESES[parseInt(m[2], 10) - 1] || m[2]).slice(0, 3).toLowerCase();
  return `${parseInt(m[3], 10)} ${mes}`;
}

/**
 * 1.10.3: diferencia en días enteros entre una fecha ISO y hoy (hora local).
 * 0 = hoy, negativo = en el pasado, null si no es parseable.
 */
export function diasDesdeHoy(iso) {
  if (!iso) return null;
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const target = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86400000);
}

/**
 * 1.10.3: "Hoy" / "Mañana" / "Ayer" / "En N días" / "Hace N días".
 * Alimenta el preview en vivo de los modales de evento.
 */
export function fechaRelativaLabel(iso) {
  const d = diasDesdeHoy(iso);
  if (d === null) return "";
  if (d === 0) return "Hoy";
  if (d === 1) return "Mañana";
  if (d === -1) return "Ayer";
  if (d > 1) return `En ${d} días`;
  return `Hace ${-d} días`;
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
