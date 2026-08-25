/**
 * operatorFormat.js
 * Formateo de fechas para el módulo "Mi Espacio".
 */

export function formatearFechaLarga(isoStr) {
  if (!isoStr) return "—";
  const [y, m, d] = String(isoStr).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return String(isoStr);
  const date = new Date(y, m - 1, d);
  if (isNaN(date.getTime())) return String(isoStr);
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatearHora(timeStr) {
  if (!timeStr) return "—";
  return timeStr;
}