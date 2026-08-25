/**
 * productivityStore.js
 * Gestión de memoria operativa, objetivos diarios y micro-analítica personal.
 */

import { normalizeDate } from "../../utils/dateFilters";
import { getOperatorGoals } from "../operator/operatorStore";

const MEMORY_KEY = "userContextMemory";
const GOALS_KEY = "userGoals";
const SETTINGS_KEY = "userProductivitySettings";
const CASES_KEY = "app_casos-art-tracker";

const DEFAULT_SETTINGS = {
  memoryEnabled: true,
  suggestionsEnabled: true,
  goalsEnabled: true,
  analyticsEnabled: true,
  interactionsEnabled: true,
  compactMode: false,
  caseTarget: 5,
};

export function getProductivitySettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveProductivitySettings(patch) {
  try {
    const current = getProductivitySettings();
    const updated = { ...current, ...patch };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// ============================================================
// MEMORIA OPERATIVA (userContextMemory)
// ============================================================
export function getContextMemory() {
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    return raw ? JSON.parse(raw) : { lastCases: [], lastFilters: {}, lastView: 'dashboard', lastInteractedId: null };
  } catch {
    return { lastCases: [], lastFilters: {}, lastView: 'dashboard', lastInteractedId: null };
  }
}

export function saveContextMemory(patch) {
  try {
    const settings = getProductivitySettings();
    if (!settings.memoryEnabled) return;
    const current = getContextMemory();
    const updated = { ...current, ...patch };
    localStorage.setItem(MEMORY_KEY, JSON.stringify(updated));
  } catch {
    /* ignore */
  }
}

export function pushLastCase(caso) {
  if (!caso || !caso.id) return;
  const mem = getContextMemory();
  const list = [caso, ...(mem.lastCases || []).filter(c => c.id !== caso.id)].slice(0, 10);
  saveContextMemory({ lastCases: list, lastInteractedId: caso.id });
}

// ============================================================
// UTILIDADES DE FECHAS LOCALES
// ============================================================
function isoToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isoFromDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ============================================================
// LECTURA DE CASOS (para metas diarias)
// ============================================================
function readCases() {
  try {
    const raw = localStorage.getItem(CASES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function countCasesOnDay(cases, isoDate) {
  return cases.filter((c) => normalizeDate(c.fecha) === isoDate).length;
}

/**
 * Busca el día hábil anterior con casos cargados, ignorando fines de semana
 * y días sin casos. Devuelve { iso, count }.
 */
function previousBusinessDayWithCases(cases, fromISO) {
  const date = new Date(fromISO);
  for (let i = 0; i < 30; i++) {
    date.setDate(date.getDate() - 1);
    const day = date.getDay();
    if (day === 0 || day === 6) continue; // sábado / domingo
    const iso = isoFromDate(date);
    const count = countCasesOnDay(cases, iso);
    if (count > 0) return { iso, count };
  }
  return { iso: null, count: 0 };
}

/**
 * Cuenta cuántos de los casos del día hábil anterior ya tienen un reporte
 * cargado hoy (fecha del reporte igual a la fecha de hoy).
 */
function countPrevDayReportsToday(cases, prevDayISO) {
  const todayISO = isoToday();
  return cases.filter((c) => {
    if (normalizeDate(c.fecha) !== prevDayISO) return false;
    return (c.reporteHistory || []).some((r) => normalizeDate(r.fecha) === todayISO);
  }).length;
}

// ============================================================
// OBJETIVOS PERSONALES Y MICRO-ANALÍTICA (userGoals)
// ============================================================
export function getGoalsState(dayISO) {
  const today = isoToday();
  const isoDate = dayISO || today;
  const cases = readCases();
  const prevDay = previousBusinessDayWithCases(cases, isoDate);
  const operatorGoals = getOperatorGoals();
  const caseTarget =
    operatorGoals.daily && operatorGoals.daily.cases && operatorGoals.daily.cases.enabled
      ? Number(operatorGoals.daily.cases.target) || 5
      : getProductivitySettings().caseTarget != null
        ? Number(getProductivitySettings().caseTarget) || 5
        : 5;

  const computed = {
    date: isoDate,
    dailyTarget: caseTarget,
    reportsTarget: prevDay.count,
    prevDayISO: prevDay.iso,
    casesLoadedToday: countCasesOnDay(cases, isoDate),
    reportsDoneToday: prevDay.iso ? countPrevDayReportsToday(cases, prevDay.iso) : 0,
    casesMovedToday: 0,
    stateChangesToday: 0,
    timePerState: {},
  };

  try {
    const raw = localStorage.getItem(GOALS_KEY);
    const data = raw ? JSON.parse(raw) : {};
    if (data.date === today && (!dayISO || dayISO === today)) {
      return {
        ...computed,
        dailyTarget: data.dailyTarget != null ? data.dailyTarget : caseTarget,
        casesMovedToday: data.casesMovedToday || 0,
        stateChangesToday: data.stateChangesToday || 0,
        timePerState: data.timePerState || {},
      };
    }
    return computed;
  } catch {
    return computed;
  }
}

export function recordGoalAction(actionType) {
  const settings = getProductivitySettings();
  if (!settings.goalsEnabled && !settings.analyticsEnabled) return;

  const current = getGoalsState();
  if (actionType === 'CASE_MOVED') {
    current.casesMovedToday = (current.casesMovedToday || 0) + 1;
    current.stateChangesToday = (current.stateChangesToday || 0) + 1;
  } else if (actionType === 'STATE_CHANGE') {
    current.stateChangesToday = (current.stateChangesToday || 0) + 1;
  }

  try {
    localStorage.setItem(GOALS_KEY, JSON.stringify(current));
  } catch {
    /* ignore */
  }
}

export function setDailyTarget(target) {
  const num = Number(target);
  const settings = saveProductivitySettings({ caseTarget: num > 0 ? num : 5 });
  const current = getGoalsState();
  current.dailyTarget = settings.caseTarget;
  try {
    localStorage.setItem(GOALS_KEY, JSON.stringify(current));
  } catch {
    /* ignore */
  }
}