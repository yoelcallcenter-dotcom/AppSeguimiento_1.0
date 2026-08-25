/**
 * operatorMetrics.js
 * Lógica pura y testeable del módulo "Mi Espacio" (v1.3.0).
 * Cálculos de días laborables efectivos, estado del día, metas,
 * ritmo, proyecciones, hitos y métricas semanales.
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

// ============================================================
// OBJETIVOS SEMANALES
// ============================================================
/**
 * Calcula el progreso semanal de un tipo dado (cases, reports, signed).
 * La semana se define como lunes a viernes (o según workingDays).
 */
export function getWeeklyGoalProgress(
  goals = {},
  cases = [],
  workingDays = [1, 2, 3, 4, 5],
  todayISO
) {
  const today = normalizeDate(todayISO) || isoFromDate(new Date());
  const weekly = goals.weekly || {};

  const now = dateFromISO(today);
  const dayOfWeek = now.getDay();

  // Encuentra el lunes de esta semana
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(monday.getDate() + mondayOffset);
  const mondayISO = isoFromDate(monday);

  // Encuentra el viernes de esta semana (o último día laborable)
  const friday = new Date(monday);
  friday.setDate(friday.getDate() + 4);
  const fridayISO = isoFromDate(friday);

  const countInRange = (field, fromISO, toISO) => {
    return cases.filter((c) => {
      const d = normalizeDate(c.fecha);
      if (!d) return false;
      if (d < fromISO || d > toISO) return false;
      if (field === "signed") return c.estado === "Firmo";
      if (field === "reports") {
        return (c.reporteHistory || []).some((r) => {
          const rd = normalizeDate(r.fecha);
          return rd && rd >= fromISO && rd <= toISO;
        });
      }
      return true;
    }).length;
  };

  const types = [
    { key: "cases", label: "Casos" },
    { key: "reports", label: "Reportes" },
    { key: "signed", label: "Firmas" },
  ];

  const result = { start: mondayISO, end: fridayISO, goals: [] };

  for (const t of types) {
    const goal = weekly[t.key] || {};
    if (!goal.enabled) {
      result.goals.push({
        key: t.key,
        label: t.label,
        enabled: false,
        current: 0,
        target: 0,
        percent: 0,
        remaining: 0,
        met: false,
        status: "disabled",
      });
      continue;
    }
    const target = Number(goal.target) || 0;
    const current = countInRange(t.key, mondayISO, fridayISO);
    const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
    const remaining = target > 0 ? Math.max(0, target - current) : 0;
    const met = target > 0 && current >= target;

    let status = "not-started";
    if (met) status = "exceeded";
    else if (percent >= 75) status = "near-completion";
    else if (percent > 0) status = "in-progress";

    result.goals.push({
      key: t.key,
      label: t.label,
      enabled: true,
      current,
      target,
      percent,
      remaining,
      met,
      status,
    });
  }

  return result;
}

// ============================================================
// RITMO Y PROYECCIÓN
// ============================================================
/**
 * Calcula el ritmo actual del día, la proyección de cierre y la
 * comparación con el promedio histórico.
 */
export function getDayPaceMetrics(
  goals = {},
  cases = [],
  profile = {},
  availability = {},
  year,
  month,
  todayISO
) {
  const today = normalizeDate(todayISO) || isoFromDate(new Date());
  const schedule = profile.workSchedule || { start: "09:00", end: "17:00" };
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = minutesOf(schedule.start);
  const endMinutes = minutesOf(schedule.end);

  // Tiempo transcurrido y restante en minutos
  let elapsedMinutes = 0;
  let remainingMinutes = 0;
  const crossMidnight = endMinutes < startMinutes;

  if (crossMidnight) {
    if (nowMinutes >= startMinutes) {
      elapsedMinutes = nowMinutes - startMinutes;
      remainingMinutes = 24 * 60 - elapsedMinutes - (24 * 60 - endMinutes);
    } else {
      elapsedMinutes = 24 * 60 - startMinutes + nowMinutes;
      remainingMinutes = endMinutes - nowMinutes;
    }
  } else {
    elapsedMinutes = Math.max(0, nowMinutes - startMinutes);
    remainingMinutes = Math.max(0, endMinutes - nowMinutes);
  }

  const totalMinutes = crossMidnight
    ? 24 * 60 - startMinutes + endMinutes
    : endMinutes - startMinutes;

  // Casos hoy
  const casesToday = countCasesOnDay(cases, today);
  const reportsToday = countReportsOnDay(cases, today);

  // Ritmo actual (casos por hora)
  const elapsedHours = Math.max(0.25, elapsedMinutes / 60);
  const casesPerHour = casesToday / elapsedHours;

  // Proyección de cierre
  const projectedCases = Math.round(casesPerHour * (elapsedHours + remainingMinutes / 60));

  // Promedio histórico: casos por día de los últimos 30 días hábiles
  const histStart = new Date(now);
  histStart.setDate(histStart.getDate() - 30);
  const histStartISO = isoFromDate(histStart);
  const histCases = cases.filter((c) => {
    const d = normalizeDate(c.fecha);
    return d && d >= histStartISO && d < today;
  });
  const histDays = new Set(histCases.map((c) => normalizeDate(c.fecha)));
  const avgCasesPerDay = histDays.size > 0
    ? Math.round((histCases.length / histDays.size) * 10) / 10
    : 0;

  // Comparación con promedio
  let paceComparison = "on-track";
  let paceMessage = "";
  if (avgCasesPerDay > 0) {
    const diff = casesPerHour * (totalMinutes / 60) - avgCasesPerDay;
    const pctDiff = Math.round((diff / avgCasesPerDay) * 100);
    if (pctDiff > 10) {
      paceComparison = "above-average";
      paceMessage = `+${pctDiff}% sobre tu promedio`;
    } else if (pctDiff < -10) {
      paceComparison = "below-average";
      paceMessage = `${pctDiff}% bajo tu promedio`;
    } else {
      paceMessage = "En línea con tu promedio";
    }
  }

  // Meta diaria para proyección
  const dailyGoal = goals.daily && goals.daily.cases && goals.daily.cases.enabled
    ? Number(goals.daily.cases.target) || 0
    : 0;

  const goalProgressPercent = dailyGoal > 0
    ? Math.min(100, Math.round((casesToday / dailyGoal) * 100))
    : 0;

  return {
    elapsedMinutes,
    remainingMinutes,
    totalMinutes,
    casesToday,
    reportsToday,
    casesPerHour: Math.round(casesPerHour * 10) / 10,
    projectedCases,
    avgCasesPerDay,
    paceComparison,
    paceMessage,
    dailyGoal,
    goalProgressPercent,
  };
}

// ============================================================
// PRÓXIMO HITO
// ============================================================
/**
 * Determina el próximo hito más relevante para el usuario.
 */
export function getNextMilestone(
  goals = {},
  cases = [],
  profile = {},
  availability = {},
  year,
  month,
  todayISO
) {
  const today = normalizeDate(todayISO) || isoFromDate(new Date());
  const dailyGoal = goals.daily && goals.daily.cases && goals.daily.cases.enabled
    ? Number(goals.daily.cases.target) || 0
    : 0;
  const weekly = goals.weekly || {};
  const weeklyCases = weekly.cases || {};
  const casesToday = countCasesOnDay(cases, today);

  const milestones = [];

  // Hito diario: completar meta
  if (dailyGoal > 0 && casesToday < dailyGoal) {
    const remaining = dailyGoal - casesToday;
    milestones.push({
      id: "daily-goal",
      type: remaining <= 2 ? "urgent" : "info",
      text: `Faltan ${remaining} caso${remaining !== 1 ? "s" : ""} para completar tu objetivo diario`,
      priority: remaining <= 2 ? 1 : 3,
    });
  }

  // Hito diario: superar mejor día reciente
  if (casesToday > 0) {
    const recentDays = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = isoFromDate(d);
      const count = countCasesOnDay(cases, iso);
      if (count > 0) recentDays.push(count);
    }
    if (recentDays.length > 0) {
      const bestRecent = Math.max(...recentDays);
      if (casesToday === bestRecent) {
        milestones.push({
          id: "beat-record",
          type: "achievement",
          text: `Estás igualando tu mejor día de la semana (${bestRecent} casos)`,
          priority: 2,
        });
      } else if (casesToday === bestRecent - 1) {
        milestones.push({
          id: "near-record",
          type: "info",
          text: `Falta 1 caso para igualar tu mejor día de la semana (${bestRecent} casos)`,
          priority: 2,
        });
      }
    }
  }

  // Hito semanal
  if (weeklyCases.enabled && weeklyCases.target) {
    const weeklyGoalNum = Number(weeklyCases.target) || 0;
    if (weeklyGoalNum > 0) {
      const weeklyProgress = getWeeklyGoalProgress(goals, cases, profile.workingDays, today);
      const weeklyGoal = weeklyProgress.goals.find((g) => g.key === "cases");
      if (weeklyGoal && !weeklyGoal.met && weeklyGoal.remaining > 0) {
        const pct = weeklyGoal.percent;
        if (pct >= 75 && pct < 100) {
          milestones.push({
            id: "weekly-near",
            type: "info",
            text: `Estás al ${pct}% de tu objetivo semanal (${weeklyGoal.remaining} casos restantes)`,
            priority: 2,
          });
        } else if (pct < 75) {
          milestones.push({
            id: "weekly-progress",
            type: "info",
            text: `Objetivo semanal: ${weeklyGoal.current}/${weeklyGoal.target} casos (${pct}%)`,
            priority: 4,
          });
        }
      }
    }
  }

  // Hito porcentaje (25%, 50%, 75%)
  if (dailyGoal > 0 && casesToday > 0) {
    const pct = Math.round((casesToday / dailyGoal) * 100);
    const thresholds = [25, 50, 75];
    for (const t of thresholds) {
      if (pct >= t && pct < t + 10) {
        milestones.push({
          id: `pct-${t}`,
          type: "info",
          text: `Estás al ${pct}% de tu objetivo diario`,
          priority: 5,
        });
        break;
      }
    }
  }

  // Si no hay hitos, devolver mensaje genérico
  if (milestones.length === 0) {
    if (dailyGoal > 0 && casesToday >= dailyGoal) {
      return {
        id: "goal-completed",
        type: "success",
        text: "Objetivo diario completado",
      };
    }
    return {
      id: "no-milestone",
      type: "neutral",
      text: casesToday > 0
        ? `${casesToday} caso${casesToday !== 1 ? "s" : ""} procesado${casesToday !== 1 ? "s" : ""} hoy`
        : "Comenzá tu jornada procesando casos",
    };
  }

  // Devolver el hito de mayor prioridad (menor número)
  milestones.sort((a, b) => a.priority - b.priority);
  return milestones[0];
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