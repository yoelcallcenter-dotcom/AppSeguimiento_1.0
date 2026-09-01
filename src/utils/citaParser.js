/**
 * citaParser.js
 * Sistema de Citas (Release 1.5.0).
 *
 * Parsing determinista del campo CITA de un caso. El formato esperado es:
 *   DD/MM - (HH:MM a HH:MM)
 * Ejemplo:
 *   15/09 - (14:00 a 15:30)
 *
 * Se permiten variaciones razonables de espacios y separadores (guión simple,
 * guion largo, paréntesis opcionales) siempre que no cambien la interpretación.
 * No se interpretan textos ambiguos.
 *
 * Toda la lógica es local y determinista. Centraliza la regla de resolución del
 * año para que sea idéntica en creación, edición, importación y restauración.
 */

/** Regex del formato CITA. Grupos: día, mes, hhIni, mmIni, hhFin, mmFin. */
const CITA_REGEX = /^\s*(\d{1,2})\/(\d{1,2})\s*[-–]\s*\(?\s*(\d{1,2}):(\d{2})\s*[aA]\s+(\d{1,2}):(\d{2})\s*\)?\s*$/;

/**
 * ¿Días hacia el pasado a partir del cual una fecha DD/MM se considera
 * "significativamente en el pasado" y se desplaza al año siguiente?
 */
export const PAST_TOLERANCE_DAYS = 30;

/**
 * Intenta parsear un texto CITA.
 * @param {string} text
 * @returns {{ day: number, month: number, startTime: string, endTime: string } | null}
 */
export function parseCita(text) {
  if (!text || typeof text !== 'string') return null;
  const m = String(text).match(CITA_REGEX);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const startTime = `${String(parseInt(m[3], 10)).padStart(2, '0')}:${m[4]}`;
  const endTime = `${String(parseInt(m[5], 10)).padStart(2, '0')}:${m[6]}`;
  // Sanidad mínima: día/mes de calendario y horario coherente.
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  const sMin = hhmmToMinutes(startTime);
  const eMin = hhmmToMinutes(endTime);
  if (sMin === null || eMin === null || eMin <= sMin) return null;
  return { day, month, startTime, endTime };
}

/**
 * Devuelve true si el texto es un formato CITA válido.
 * @param {string} text
 * @returns {boolean}
 */
export function isValidCitaFormat(text) {
  return parseCita(text) !== null;
}

function hhmmToMinutes(hhmm) {
  const m = String(hhmm || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/**
 * Resuelve la fecha completa (YYYY-MM-DD) de una cita DD/MM, aplicando la regla
 * determinista del año. Usa preferentemente el año de referencia (usualmente el
 * año de creación del caso o el contexto temporal actual). Si la fecha resultante
 * quedó significativamente en el pasado respecto a `today` (referencia de hoy),
 * se desplaza al año siguiente para representar correctamente una cita futura.
 *
 * @param {{ day: number, month: number }|{day:number,month:number,startTime:string,endTime:string}} parsed
 *        resultado de parseCita() (solo usa day/month).
 * @param {string|Date} [referenceYearSource] fecha (o Date) cuyo año usar de base.
 * @param {Date} [today] referencia de "hoy" (para tests).
 * @returns {string|null} fecha ISO "YYYY-MM-DD" o null si no es válida.
 */
export function resolveCitaDate(parsed, referenceYearSource, today = new Date()) {
  if (!parsed || !parsed.day || !parsed.month) return null;
  let baseYear;
  if (referenceYearSource) {
    const d = new Date(referenceYearSource);
    if (!isNaN(d.getTime())) baseYear = d.getFullYear();
  }
  if (!baseYear) baseYear = today.getFullYear();

  let iso = buildISODate(baseYear, parsed.month, parsed.day);
  if (!iso) return null;

  // Si la fecha quedó significativamente en el pasado, usar el año siguiente.
  if (isSignificantlyPast(iso, today)) {
    iso = buildISODate(baseYear + 1, parsed.month, parsed.day);
  }
  return iso;
}

/**
 * Construye un ISO "YYYY-MM-DD" validando el día dentro del mes.
 * Devuelve null si el día no existe (ej: 31/02).
 */
export function buildISODate(year, month, day) {
  const d = new Date(year, month - 1, day);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return null;
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * ¿La fecha ISO está en el pasado por más de PAST_TOLERANCE_DAYS?
 */
function isSignificantlyPast(iso, today) {
  try {
    const [y, m, d] = iso.split('-').map(Number);
    const target = new Date(y, m - 1, d);
    const now = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const diffDays = Math.round((now - target) / 86400000);
    return diffDays > PAST_TOLERANCE_DAYS;
  } catch {
    return false;
  }
}

/**
 * Formatea una cita para mostrar: "15/09 - (14:00 a 15:30)".
 * @param {{ day:number, month:number, startTime:string, endTime:string }} parsed
 * @returns {string}
 */
export function formatCita(parsed) {
  if (!parsed) return '';
  return `${String(parsed.day).padStart(2, '0')}/${String(parsed.month).padStart(2, '0')} - (${parsed.startTime} a ${parsed.endTime})`;
}
