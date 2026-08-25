/**
 * dateFilters.js
 * Utilidades para filtrado de fechas
 * Formato estándar: YYYY-MM-DD (ISO 8601)
 */

/**
 * Valida que una fecha compuesta sea real (rechaza 31/02, 30/02, etc.)
 */
function esFechaValida(yyyy, mm, dd) {
  if (!(yyyy >= 1900 && yyyy <= 2100)) return false;
  const d = new Date(yyyy, mm - 1, dd);
  return d.getFullYear() === yyyy && d.getMonth() === mm - 1 && d.getDate() === dd;
}

function iso(yyyy, mm, dd) {
  return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

/**
 * Normaliza una fecha a formato ISO (YYYY-MM-DD).
 * Soporta ISO, DD/MM/YYYY y DD/MM (formato argentino, día primero).
 * Sin el soporte explícito de DD/MM, `new Date("07/08")` produce julio de 2001
 * y `new Date("15/07/2026")` es inválido (intercambio de mes/día por el formato US).
 */
export function normalizeDate(dateInput) {
  if (!dateInput) return null;

  // Si ya es string ISO (YYYY-MM-DD o datetime ISO)
  if (typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
    return dateInput.slice(0, 10);
  }

  if (typeof dateInput === "string") {
    const s = dateInput.trim();

    // DD/MM/YYYY (día primero)
    let m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    if (m) {
      const dd = Number(m[1]);
      const mm = Number(m[2]);
      const yyyy = Number(m[3]);
      if (esFechaValida(yyyy, mm, dd)) return iso(yyyy, mm, dd);
    }

    // DD/MM sin año: usa el año actual; si caería >30 días en el futuro
    // (p. ej. "15/12" en enero), pertenece al año anterior.
    m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})$/);
    if (m) {
      const dd = Number(m[1]);
      const mm = Number(m[2]);
      if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) {
        const today = new Date();
        let yyyy = today.getFullYear();
        const candidate = new Date(yyyy, mm - 1, dd);
        if (Math.round((candidate - today) / (1000 * 60 * 60 * 24)) > 30) yyyy -= 1;
        if (esFechaValida(yyyy, mm, dd)) return iso(yyyy, mm, dd);
      }
    }

    // YYYY/MM/DD (año primero, con separador /)
    m = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
    if (m) {
      const yyyy = Number(m[1]);
      const mm = Number(m[2]);
      const dd = Number(m[3]);
      if (esFechaValida(yyyy, mm, dd)) return iso(yyyy, mm, dd);
    }
  }

  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

/**
 * Verifica si dos fechas son del mismo mes/año
 */
export function isSameMonth(dateStr, month, year) {
  const normalized = normalizeDate(dateStr);
  if (!normalized) return false;

  const [y, m] = normalized.split("-").map(Number);
  return y === year && m === month + 1;
}

/**
 * Filtra un array por mes/año
 */
export function filterByMonth(dataArray, dateField, month, year) {
  if (!dataArray || !Array.isArray(dataArray) || dataArray.length === 0) {
    return [];
  }

  return dataArray.filter((item) => {
    const dateValue = item[dateField];
    if (!dateValue) return false;
    return isSameMonth(dateValue, month, year);
  });
}

/**
 * Obtiene el mes actual (0-11)
 */
export function getCurrentMonth() {
  return new Date().getMonth();
}

/**
 * Obtiene el año actual
 */
export function getCurrentYear() {
  return new Date().getFullYear();
}

/**
 * Genera un string de mes para mostrar (Enero 2024)
 */
export function getMonthLabel(month, year) {
  const months = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  return `${months[month]} ${year}`;
}

/**
 * Obtiene los meses disponibles en los datos
 */
export function getAvailableMonths(dataArray, dateField) {
  if (!dataArray || !Array.isArray(dataArray)) return [];

  const monthsSet = new Set();
  dataArray.forEach((item) => {
    const dateValue = item[dateField];
    if (dateValue) {
      const normalized = normalizeDate(dateValue);
      if (normalized) {
        monthsSet.add(normalized.slice(0, 7)); // YYYY-MM
      }
    }
  });

  return Array.from(monthsSet).sort().reverse();
}

/**
 * Obtiene el mes y año de un string YYYY-MM
 */
export function parseMonthYear(monthYear) {
  if (!monthYear) return null;
  const [year, month] = monthYear.split("-").map(Number);
  return { year, month: month - 1 };
}

/**
 * Normaliza la fecha de un reporte (DD/MM/YYYY, DD/MM, ISO o Date) a ISO
 * (YYYY-MM-DD). Devuelve null si el caso no tiene reportes o la fecha es inválida.
 */
export function fechaUltimoReporte(caso) {
  const reports = caso?.reporteHistory;
  if (!Array.isArray(reports) || reports.length === 0) return null;
  const last = reports[reports.length - 1];
  if (!last?.fecha) return null;
  return normalizeDate(last.fecha);
}

/**
 * Un caso "pertenece" a un mes si su fecha de creación o la fecha de su último
 * reporte caen en ese mes.
 */
export function casoEnMes(caso, month, year) {
  if (isSameMonth(caso?.fecha, month, year)) return true;
  const reporte = fechaUltimoReporte(caso);
  return !!reporte && isSameMonth(reporte, month, year);
}

/**
 * True cuando el caso pertenece al mes SOLO por su último reporte (no por la
 * fecha de creación). Se usa para la distinción visual en tablero y reportes.
 */
export function casoVieneDeReporte(caso, month, year) {
  if (isSameMonth(caso?.fecha, month, year)) return false;
  const reporte = fechaUltimoReporte(caso);
  return !!reporte && isSameMonth(reporte, month, year);
}

/**
 * Obtiene los meses disponibles considerando la fecha de creación y la fecha
 * del último reporte de cada caso.
 */
export function getAvailableMonthsConReportes(dataArray) {
  if (!dataArray || !Array.isArray(dataArray)) return [];
  const monthsSet = new Set();
  dataArray.forEach((item) => {
    const creacion = normalizeDate(item?.fecha);
    if (creacion) monthsSet.add(creacion.slice(0, 7));
    const reporte = fechaUltimoReporte(item);
    if (reporte) monthsSet.add(reporte.slice(0, 7));
  });
  return Array.from(monthsSet).sort().reverse();
}
