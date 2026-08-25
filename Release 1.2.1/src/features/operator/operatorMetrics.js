/**
 * operatorMetrics.js
 * Lógica pura y testeable del módulo "Mi Espacio" (v1.2.0).
 * Cálculos de días laborables efectivos, estado del día, metas y ritmo requerido.
 * No depende de React ni de la UI.
 */

import { normalizeDate } from "../../utils/dateFilters";
import { DAY_STATES } from "./operatorDefaults";

// ============================================================
// UTILIDADES DE FECHAS
// ============================================================
function isoFromDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function dateFromISO(isoStr) {
  const [y, m, d] = isoStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function isWeekend(isoStr) {
  const d = dateFromISO(isoStr);
  const day = d.getDay();
  return day === 0 || day === 6;
}

export function isWorkingDay(isoStr, workingDays = [1, 2, 3, 4, 5]) {
  if (!isoStr) return false;
  const d = dateFromISO(isoStr);
  return workingDays.includes(d.getDay());
}

// ============================================================
// DISPONIBILIDAD
// ============================================================
export function normalizeRange(start, end) {
  const s = normalizeDate(start);
  const e = normalizeDate(end) || s;
  return { start: s, end: e >= s ? e : s };
}

export function isInRange(isoStr, start, end) {
  const d = normalizeDate(isoStr);
  const s = normalizeDate(start);
  const e = normalizeDate(end);
  if (!s) return false;
  if (!e || e < s) return d === s;
  return d >= s && d <= e;
}

export function getAvailabilityOn(availability = {}, isoStr) {
  const a = {
    vacations: [],
    holidays: [],
    absences: [],
    customDaysOff: [],
    ...availability,
  };
  const day = normalizeDate(isoStr);
  const result = { vacation: null, holiday: null, absence: null, dayOff: null };

  for (const v of a.vacations || []) {
    if (isInRange(day, v.start, v.end)) result.vacation = v;
  }
  for (const h of a.holidays || []) {
    if (normalizeDate(h.date) === day) result.holiday = h;
  }
  for (const ab of a.absences || []) {
    if (normalizeDate(ab.date) === day) result.absence = ab;
  }
  for (const d of a.customDaysOff || []) {
    if (normalizeDate(d.date) === day) result.dayOff = d;
  }
  return result;
}

export function isUnavailableOn(availability = {}, isoStr) {
  const dayState = getAvailabilityOn(availability, isoStr);
  return Boolean(
    dayState.vacation || dayState.holiday || dayState.absence || dayState.dayOff
  );
}

// ============================================================
// DÍAS LABORABLES EFECTIVOS
// ============================================================
export function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Días laborables programados: días de la semana habituales del operador.
 */
export function getScheduledWorkDays(year, month, workingDays = [1, 2, 3, 4, 5]) {
  const total = daysInMonth(year, month);
  const days = [];
  for (let d = 1; d <= total; d++) {
    const iso = isoFromDate(new Date(year, month, d));
    if (isWorkingDay(iso, workingDays)) days.push(iso);
  }
  return days;
}

/**
 * Días laborables efectivos = días laborables programados
 * menos vacaciones, feriados, inasistencias y días no laborables personalizados.
 */
export function getEffectiveWorkDays(
  availability = {},
  year,
  month,
  workingDays = [1, 2, 3, 4, 5]
) {
  const scheduled = getScheduledWorkDays(year, month, workingDays);
  const effective = scheduled.filter((iso) => !isUnavailableOn(availability, iso));

  const summary = {
    scheduled: scheduled.length,
    effective: effective.length,
    vacations: 0,
    holidays: 0,
    absences: 0,
    dayOffs: 0,
  };

  for (const iso of scheduled) {
    const state = getAvailabilityOn(availability, iso);
    if (state.vacation) summary.vacations += 1;
    if (state.holiday) summary.holidays += 1;
    if (state.absence) summary.absences += 1;
    if (state.dayOff) summary.dayOffs += 1;
  }

  return summary;
}

/**
 * Días efectivos restantes en el mes (desde hoy, inclusive si hoy es efectivo).
 */
export function getRemainingEffectiveDays(
  availability = {},
  year,
  month,
  workingDays = [1, 2, 3, 4, 5],
  todayISO
) {
  const today = normalizeDate(todayISO) || isoFromDate(new Date());
  const scheduled = getScheduledWorkDays(year, month, workingDays);
  return scheduled.filter(
    (iso) => iso >= today && !isUnavailableOn(availability, iso)
  ).length;
}

// ============================================================
// ESTADO DEL DÍA
// ============================================================
export function getDayState(
  profile = {},
  availability = {},
  todayISO,
  goals = {},
  cases = []
) {
  const day = normalizeDate(todayISO) || isoFromDate(new Date());
  const dayState = getAvailabilityOn(availability, day);
  if (dayState.vacation) return { key: DAY_STATES.VACATION, label: "Vacaciones" };
  if (dayState.holiday) return { key: DAY_STATES.HOLIDAY, label: "Feriado" };
  if (dayState.absence) return { key: DAY_STATES.ABSENCE, label: "Inasistencia" };
  if (dayState.dayOff) return { key: DAY_STATES.DAY_OFF, label: "Día no laborable" };

  const workingDays = profile.workingDays || [1, 2, 3, 4, 5];
  if (!isWorkingDay(day, workingDays)) {
    return { key: DAY_STATES.DAY_OFF, label: "Día no laborable" };
  }

  const schedule = profile.workSchedule || { start: "09:00", end: "17:00" };
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = minutesOf(schedule.start);
  const endMinutes = minutesOf(schedule.end);
  const crossMidnight = endMinutes < startMinutes;

  // Jornada que cruza medianoche (ej. 22:00 - 06:00)
  if (crossMidnight) {
    const inSpan = nowMinutes >= startMinutes || nowMinutes < endMinutes;
    if (!inSpan) return { key: DAY_STATES.NOT_STARTED, label: "Jornada no iniciada" };
    const target = dailyTargetOf(goals);
    const current = cases.length;
    if (target > 0 && current >= target) return { key: DAY_STATES.GOAL_MET, label: "Meta cumplida" };
    return { key: DAY_STATES.IN_WORKDAY, label: "En jornada" };
  }

  if (nowMinutes < startMinutes) {
    return { key: DAY_STATES.NOT_STARTED, label: "Jornada no iniciada" };
  }
  if (nowMinutes >= endMinutes) {
    return { key: DAY_STATES.ENDED, label: "Jornada finalizada" };
  }
  const target = dailyTargetOf(goals);
  const current = cases.length;
  if (target > 0 && current >= target) return { key: DAY_STATES.GOAL_MET, label: "Meta cumplida" };
  return { key: DAY_STATES.IN_WORKDAY, label: "En jornada" };
}

function minutesOf(timeStr) {
  if (!timeStr) return 0;
  const parts = String(timeStr).split(":");
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

function dailyTargetOf(goals = {}) {
  const cases = goals.daily && goals.daily.cases;
  return cases && cases.enabled ? Number(cases.target) || 0 : 0;
}

// ============================================================
// PROGRESO DE METAS
// ============================================================
export function countCasesOnDay(cases, isoDate) {
  return cases.filter((c) => normalizeDate(c.fecha) === isoDate).length;
}

export function countCasesInMonth(cases, year, month) {
  return cases.filter((c) => {
    const d = normalizeDate(c.fecha);
    if (!d) return false;
    const parts = d.split("-").map(Number);
    return parts[0] === year && parts[1] === month + 1;
  }).length;
}

export function countReportsOnDay(cases, isoDate) {
  return cases.filter((c) =>
    (c.reporteHistory || []).some((r) => normalizeDate(r.fecha) === isoDate)
  ).length;
}

export function countReportsInMonth(cases, year, month) {
  return cases.reduce((acc, c) => {
    const count = (c.reporteHistory || []).filter((r) => {
      const d = normalizeDate(r.fecha);
      if (!d) return false;
      const parts = d.split("-").map(Number);
      return parts[0] === year && parts[1] === month + 1;
    }).length;
    return acc + count;
  }, 0);
}

export function countSignedInMonth(cases, year, month) {
  return cases.filter((c) => {
    if (c.estado !== "Firmo") return false;
    const d = normalizeDate(c.fecha);
    if (!d) return false;
    const parts = d.split("-").map(Number);
    return parts[0] === year && parts[1] === month + 1;
  }).length;
}

/**
 * Progreso diario de casos y reportes.
 */
export function getDailyGoalProgress(goals = {}, cases = [], todayISO) {
  const today = normalizeDate(todayISO) || isoFromDate(new Date());
  const daily = goals.daily || {};
  const casesGoal = daily.cases || {};
  const reportsGoal = daily.reports || {};

  const casesCurrent = casesGoal.enabled ? countCasesOnDay(cases, today) : 0;
  const reportsCurrent = reportsGoal.enabled ? countReportsOnDay(cases, today) : 0;

  const casesTarget = casesGoal.enabled ? Number(casesGoal.target) || 0 : 0;
  const reportsTarget = reportsGoal.enabled ? Number(reportsGoal.target) || 0 : 0;

  return {
    date: today,
    cases: {
      enabled: Boolean(casesGoal.enabled),
      current: casesCurrent,
      target: casesTarget,
      percent: casesTarget > 0 ? Math.min(100, Math.round((casesCurrent / casesTarget) * 100)) : 0,
      met: casesTarget > 0 && casesCurrent >= casesTarget,
    },
    reports: {
      enabled: Boolean(reportsGoal.enabled),
      current: reportsCurrent,
      target: reportsTarget,
      percent: reportsTarget > 0 ? Math.min(100, Math.round((reportsCurrent / reportsTarget) * 100)) : 0,
      met: reportsTarget > 0 && reportsCurrent >= reportsTarget,
    },
  };
}

/**
 * Progreso mensual de casos y reportes.
 */
export function getMonthlyGoalProgress(goals = {}, cases = [], year, month) {
  const monthly = goals.monthly || {};
  const casesGoal = monthly.cases || {};
  const reportsGoal = monthly.reports || {};
  const signedGoal = monthly.signed || {};

  const casesCurrent = casesGoal.enabled ? countCasesInMonth(cases, year, month) : 0;
  const reportsCurrent = reportsGoal.enabled ? countReportsInMonth(cases, year, month) : 0;
  const signedCurrent = signedGoal.enabled ? countSignedInMonth(cases, year, month) : 0;

  const casesTarget = casesGoal.enabled ? Number(casesGoal.target) || 0 : 0;
  const reportsTarget = reportsGoal.enabled ? Number(reportsGoal.target) || 0 : 0;
  const signedTarget = signedGoal.enabled ? Number(signedGoal.target) || 0 : 0;

  const pct = (cur, target) => (target > 0 ? Math.min(100, Math.round((cur / target) * 100)) : 0);

  return {
    cases: {
      enabled: Boolean(casesGoal.enabled),
      current: casesCurrent,
      target: casesTarget,
      percent: pct(casesCurrent, casesTarget),
      remaining: casesTarget > 0 ? Math.max(0, casesTarget - casesCurrent) : 0,
      met: casesTarget > 0 && casesCurrent >= casesTarget,
    },
    reports: {
      enabled: Boolean(reportsGoal.enabled),
      current: reportsCurrent,
      target: reportsTarget,
      percent: pct(reportsCurrent, reportsTarget),
      remaining: reportsTarget > 0 ? Math.max(0, reportsTarget - reportsCurrent) : 0,
      met: reportsTarget > 0 && reportsCurrent >= reportsTarget,
    },
    signed: {
      enabled: Boolean(signedGoal.enabled),
      current: signedCurrent,
      target: signedTarget,
      percent: pct(signedCurrent, signedTarget),
      remaining: signedTarget > 0 ? Math.max(0, signedTarget - signedCurrent) : 0,
      met: signedTarget > 0 && signedCurrent >= signedTarget,
    },
  };
}

// ============================================================
// RITMO REQUERIDO
// ============================================================
/**
 * Ritmo diario necesario para alcanzar la meta mensual con los días
 * efectivos restantes. Devuelve null si la meta está desactivada o no quedan días.
 */
export function getRequiredDailyPace(
  goals = {},
  cases = [],
  year,
  month,
  availability = {},
  workingDays = [1, 2, 3, 4, 5],
  todayISO
) {
  const progress = getMonthlyGoalProgress(goals, cases, year, month);
  const casesGoal = progress.cases;
  const reportsGoal = progress.reports;
  const remainingDays = getRemainingEffectiveDays(availability, year, month, workingDays, todayISO);

  const result = {
    cases: null,
    reports: null,
    remainingDays,
  };

  if (casesGoal.enabled && casesGoal.target > 0 && casesGoal.remaining > 0) {
    result.cases =
      remainingDays > 0
        ? Math.round((casesGoal.remaining / remainingDays) * 100) / 100
        : null;
  }

  if (reportsGoal.enabled && reportsGoal.target > 0 && reportsGoal.remaining > 0) {
    result.reports =
      remainingDays > 0
        ? Math.round((reportsGoal.remaining / remainingDays) * 100) / 100
        : null;
  }

  return result;
}

// ============================================================
// RESUMEN DE DISPONIBILIDAD DEL MES
// ============================================================
export function getAvailabilitySummary(availability = {}, year, month) {
  const a = {
    vacations: [],
    holidays: [],
    absences: [],
    customDaysOff: [],
    ...availability,
  };
  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;

  const inMonth = (d) => {
    const iso = normalizeDate(d);
    return iso && iso.startsWith(monthPrefix);
  };

  const vacations = (a.vacations || []).filter((v) => inMonth(v.start) || inMonth(v.end));
  const holidays = (a.holidays || []).filter((h) => inMonth(h.date));
  const absences = (a.absences || []).filter((ab) => inMonth(ab.date));
  const dayOffs = (a.customDaysOff || []).filter((d) => inMonth(d.date));

  return {
    vacations,
    holidays,
    absences,
    dayOffs,
    totalDays: vacations.length + holidays.length + absences.length + dayOffs.length,
  };
}

/**
 * Sobre un mes, calcula casos/reportes por día efectivo (productividad ajustada).
 */
export function getPerEffectiveDayMetrics(
  cases = [],
  availability = {},
  year,
  month,
  workingDays = [1, 2, 3, 4, 5]
) {
  const eff = getEffectiveWorkDays(availability, year, month, workingDays);
  const casesCount = countCasesInMonth(cases, year, month);
  const reportsCount = countReportsInMonth(cases, year, month);
  return {
    ...eff,
    casesPerDay: eff.effective > 0 ? Math.round((casesCount / eff.effective) * 10) / 10 : 0,
    reportsPerDay: eff.effective > 0 ? Math.round((reportsCount / eff.effective) * 10) / 10 : 0,
  };
}

/**
 * Sugerencias personales simples basadas en el contexto del operador.
 */
export function buildPersonalSuggestions({
  goals = {},
  cases = [],
  availability = {},
  profile = {},
  year,
  month,
  todayISO,
  settings = {},
} = {}) {
  const suggestions = [];
  if (settings.personalSuggestions === false) return suggestions;

  const dayState = getDayState(profile, availability, todayISO, goals, cases);
  const daily = getDailyGoalProgress(goals, cases, todayISO);
  const monthly = getMonthlyGoalProgress(goals, cases, year, month);
  const pace = getRequiredDailyPace(goals, cases, year, month, availability, profile.workingDays, todayISO);

  if (
    dayState.key === DAY_STATES.GOAL_MET
  ) {
    suggestions.push({ id: "meta-diaria", type: "success", text: "Meta diaria de casos completada." });
  } else if (
    dayState.key === DAY_STATES.IN_WORKDAY &&
    daily.cases.enabled &&
    !daily.cases.met &&
    daily.cases.remaining === undefined
  ) {
    const faltan = daily.cases.target - daily.cases.current;
    if (faltan > 0) {
      suggestions.push({
        id: "meta-cercana",
        type: "info",
        text: `Te faltan ${faltan} caso${faltan !== 1 ? "s" : ""} para completar tu meta diaria.`,
      });
    }
  }

  if (
    dayState.key === DAY_STATES.IN_WORKDAY &&
    profile.workSchedule &&
    profile.workSchedule.end
  ) {
    const now = new Date();
    const endMin = minutesOf(profile.workSchedule.end);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const diff = endMin - nowMin;
    if (diff > 0 && diff <= 45) {
      suggestions.push({
        id: "fin-jornada",
        type: "warning",
        text: `Tu jornada habitual termina en aproximadamente ${diff} minutos.`,
      });
    }
  }

  const upcoming = getUpcomingVacations(availability, todayISO);
  if (upcoming && upcoming.in === 1) {
    suggestions.push({
      id: "vacaciones-manana",
      type: "info",
      text: "Tu período de vacaciones comienza mañana.",
    });
  } else if (upcoming && upcoming.in > 1) {
    suggestions.push({
      id: "vacaciones-proximas",
      type: "info",
      text: `Tus vacaciones comienzan en ${upcoming.in} días.`,
    });
  }

  if (monthly.cases.enabled && pace && pace.cases != null) {
    const currentRate = countCasesInMonth(cases, year, month) / Math.max(1, getEffectiveWorkDays(availability, year, month, profile.workingDays).effective);
    if (currentRate < pace.cases && pace.remainingDays > 0) {
      const extra = Math.ceil(pace.cases - currentRate);
      suggestions.push({
        id: "ritmo-mensual",
        type: "warning",
        text: `Para alcanzar tu objetivo mensual necesitás procesar aproximadamente ${extra} caso${extra !== 1 ? "s" : ""} más por día.`,
      });
    }
  }

  return suggestions.slice(0, 4);
}

function getUpcomingVacations(availability = {}, todayISO) {
  const today = normalizeDate(todayISO) || isoFromDate(new Date());
  const vacations = availability.vacations || [];
  let closest = null;
  for (const v of vacations) {
    const start = normalizeDate(v.start);
    if (!start) continue;
    const daysUntil = Math.round((dateFromISO(start) - dateFromISO(today)) / 86400000);
    if (daysUntil >= 0 && (closest === null || daysUntil < closest.in)) {
      closest = { in: daysUntil, v };
    }
  }
  return closest;
}