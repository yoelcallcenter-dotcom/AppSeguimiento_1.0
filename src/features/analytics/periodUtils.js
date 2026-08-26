/**
 * periodUtils.js
 * Selección de períodos para la capa de Insights (Release 1.3.2).
 * Cada período define un rango [startISO..endISO] (fechas locales, inclusive)
 * y su rango anterior equivalente (misma cantidad de días), para que las
 * comparativas siempre comparen períodos de igual tamaño.
 */

import { normalizeDate } from "../../utils/dateFilters";

export const PERIODOS = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'semana', label: 'Esta semana' },
  { id: 'mes', label: 'Este mes' },
  { id: '7d', label: 'Últimos 7 días' },
  { id: '30d', label: 'Últimos 30 días' },
  { id: '90d', label: 'Últimos 90 días' },
];

export const PERIODO_DEFAULT = '30d';

const DAY_MS = 1000 * 60 * 60 * 24;

function isoDe(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

function dateDe(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Cantidad de días que abarca un rango inclusive. */
export function diasEnRango(rango) {
  return Math.round((dateDe(rango.endISO) - dateDe(rango.startISO)) / DAY_MS) + 1;
}

/**
 * Devuelve el rango del período solicitado.
 * "semana" y "mes" son acumulados hasta hoy (week-to-date / month-to-date).
 */
export function getPeriodRange(id, today = new Date()) {
  const hoy = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endISO = isoDe(hoy);

  switch (id) {
    case 'hoy':
      return { id, label: 'Hoy', startISO: endISO, endISO };

    case 'semana': {
      // Semana desde el lunes (o domingo si la semana arranca ese día).
      const dow = hoy.getDay();
      const offsetLunes = dow === 0 ? -6 : 1 - dow;
      const lunes = new Date(hoy);
      lunes.setDate(lunes.getDate() + offsetLunes);
      return { id, label: 'Esta semana', startISO: isoDe(lunes), endISO };
    }

    case 'mes': {
      const primero = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      return { id, label: 'Este mes', startISO: isoDe(primero), endISO };
    }

    case '7d':
    case '30d':
    case '90d': {
      const n = Number(id.replace('d', ''));
      const inicio = new Date(hoy);
      inicio.setDate(inicio.getDate() - (n - 1));
      return { id, label: `Últimos ${n} días`, startISO: isoDe(inicio), endISO };
    }

    default:
      return getPeriodRange(PERIODO_DEFAULT, today);
  }
}

/**
 * Rango anterior equivalente: termina el día previo al inicio del rango dado
 * y tiene exactamente la misma cantidad de días.
 */
export function rangoAnteriorEquivalente(rango) {
  const dias = diasEnRango(rango);
  const fin = dateDe(rango.startISO);
  fin.setDate(fin.getDate() - 1);
  const inicio = new Date(fin);
  inicio.setDate(inicio.getDate() - (dias - 1));
  return { id: rango.id, label: rango.label, startISO: isoDe(inicio), endISO: isoDe(fin) };
}

/** true si la fecha ISO (o convertible) está dentro del rango inclusive. */
export function enRango(fecha, rango) {
  const iso = normalizeDate(fecha);
  if (!iso) return false;
  return iso >= rango.startISO && iso <= rango.endISO;
}

/**
 * Filtra los casos por fecha de creación dentro del rango.
 * @param {Array} casos
 * @param {object} rango {startISO, endISO}
 */
export function casosEnRango(casos, rango) {
  if (!Array.isArray(casos)) return [];
  return casos.filter((c) => enRango(c.fecha, rango));
}

/**
 * Días hábiles (según workingDays) transcurridos dentro del rango.
 * Se usa como denominador del promedio diario.
 */
export function diasHabilesEnRango(rango, workingDays = [1, 2, 3, 4, 5]) {
  const wd = new Set(workingDays.length > 0 ? workingDays : [1, 2, 3, 4, 5]);
  let count = 0;
  const cursor = dateDe(rango.startISO);
  const fin = dateDe(rango.endISO);
  while (cursor <= fin) {
    if (wd.has(cursor.getDay())) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}
