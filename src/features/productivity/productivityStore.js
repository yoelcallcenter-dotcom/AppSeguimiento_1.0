/**
 * productivityStore.js
 * Gestión de memoria operativa, objetivos diarios y micro-analítica personal.
 * v1.3.0 - Integrado con Mi Jornada.
 */

import { normalizeDate } from "../../utils/dateFilters";
// v1.9.6 (fix metas unificadas): la fuente canónica de metas es
// userOperatorGoals (Mi Espacio); setDailyTarget escribe vía saveOperatorGoals
// (que además espeja userProductivitySettings/userGoals y notifica suscriptores).
import { getOperatorGoals, saveOperatorGoals } from "../operator/operatorStore";
// Contador canónico de reportes por día: es el mismo que usa
// getDailyGoalProgress (Mi Espacio), garantizando numeradores idénticos.
import { countReportsOnDay } from "../operator/operatorMetrics";

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

// v1.9.6: se eliminó isoFromDate() (quedó sin uso junto con
// previousBusinessDayWithCases al unificar la meta de reportes).

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

// v1.9.6 (fix metas unificadas): se eliminaron previousBusinessDayWithCases()
// y countPrevDayReportsToday(). La meta de reportes del Dashboard se calculaba
// sola (reportes de los casos del día hábil anterior / cantidad de esos casos)
// mientras Mi Espacio usa la meta editable daily.reports.target con el contador
// countReportsOnDay → mostraban números distintos. Ahora ambos usan la misma
// meta y el mismo contador; ver getGoalsState().

// ============================================================
// OBJETIVOS PERSONALES Y MICRO-ANALÍTICA (userGoals)
// ============================================================
export function getGoalsState(dayISO) {
  const today = isoToday();
  const isoDate = dayISO || today;
  const cases = readCases();
  const operatorGoals = getOperatorGoals();
  const caseTarget =
    operatorGoals.daily && operatorGoals.daily.cases && operatorGoals.daily.cases.enabled
      ? Number(operatorGoals.daily.cases.target) || 5
      : getProductivitySettings().caseTarget != null
        ? Number(getProductivitySettings().caseTarget) || 5
        : 5;

  // Metas de reportes UNIFICADAS con Mi Espacio: target editable de
  // userOperatorGoals.daily.reports y numerador countReportsOnDay (igual que
  // getDailyGoalProgress). Si la meta está deshabilitada, target 0.
  const reportsGoal = (operatorGoals.daily && operatorGoals.daily.reports) || {};
  const reportsEnabled = Boolean(reportsGoal.enabled);
  const reportsTarget = reportsEnabled ? Number(reportsGoal.target) || 0 : 0;

  const computed = {
    date: isoDate,
    dailyTarget: caseTarget,
    reportsEnabled,
    reportsTarget,
    casesLoadedToday: countCasesOnDay(cases, isoDate),
    reportsDoneToday: reportsEnabled ? countReportsOnDay(cases, isoDate) : 0,
    casesMovedToday: 0,
    stateChangesToday: 0,
    timePerState: {},
  };

  try {
    const raw = localStorage.getItem(GOALS_KEY);
    const data = raw ? JSON.parse(raw) : {};
    if (data.date === today && (!dayISO || dayISO === today)) {
      // v1.9.6: ya NO se toma dailyTarget de este snapshot legado (podía
      // divergir de userOperatorGoals); solo conserva los contadores de
      // micro-analítica. dailyTarget viene siempre de getGoalsState().
      return {
        ...computed,
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
  const t = num > 0 ? num : 5;
  // v1.9.6 (fix metas unificadas): ANTES se escribían solo
  // userProductivitySettings.caseTarget y userGoals.dailyTarget (claves legacy)
  // sin tocar userOperatorGoals → el valor mostrado por Mi Espacio y por el
  // Dashboard dependía de qué clave leía cada vista. Ahora la escritura va por
  // saveOperatorGoals (fuente canónica); ese guardado espeja las claves legacy
  // (syncCaseTargetToLegacy) y notifica a los suscriptores para refrescar el
  // resto de la app en la misma pestaña. Al guardar una meta explícitamente,
  // la meta diaria de casos queda habilitada.
  const current = getOperatorGoals();
  saveOperatorGoals({
    daily: {
      ...current.daily,
      cases: { ...current.daily.cases, enabled: true, target: t },
    },
  });
}