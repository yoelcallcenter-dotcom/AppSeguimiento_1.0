import {
  HelpCircle, Filter, Zap, TrendingUp, Gauge, Clock, Hourglass, Compass,
  Columns, Crosshair, Settings, Search, HeartPulse, SlidersHorizontal, Navigation,
  Ruler, ClipboardCheck, RefreshCw, Globe, Brain,
} from 'lucide-react';
import { fireEgg } from './easterEggs';
import { isEasterEggsEnabled } from './uiSettings';

const STORAGE_KEY = 'app_easter_egg_behavior';

const RAPID_WINDOW_MS = 6000;
const RAPID_THRESHOLD = 5;
const HYPER_WINDOW_MS = 10000;
const HYPER_THRESHOLD = 12;
const BURST_WINDOW_MS = 30000;
const BURST_THRESHOLD = 15;
const AUTO_WINDOW_MS = 60000;
const AUTO_MOVES = 5;
const IDLE_THRESHOLD_MS = 2 * 60 * 1000;
const SESSION_LONG_MS = 45 * 60 * 1000;

function defaultState() {
  const now = Date.now();
  return {
    sessionStart: now,
    lastAction: now,
    filterChanges: 0,
    rapidFilterChanges: 0,
    maxSelectedDays: 0,
    casesCreated: 0,
    casesMoved: 0,
    casesEdited: 0,
    dashboardClicks: 0,
    tableInteractions: 0,
    viewChanges: 0,
    visitedViews: [],
    totalActions: 0,
    idleMs: 0,
    lastFilterChange: 0,
    recentActions: [],
    recentMoves: [],
    triggered: {},
  };
}

let state = defaultState();

function load() {
  if (!isEnabled()) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      state = {
        ...defaultState(),
        ...JSON.parse(raw),
        recentActions: [],
        recentMoves: [],
      };
    }
  } catch {
    /* estado por defecto */
  }
}

let saveTimeout = null;
function save() {
  if (!isEnabled()) return;
  if (saveTimeout) return;
  saveTimeout = setTimeout(() => {
    saveTimeout = null;
    try {
      const { recentActions, recentMoves, ...toSave } = state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch {
      /* storage no disponible */
    }
  }, 1000);
}

function isEnabled() {
  return process.env.REACT_APP_EASTER_EGGS === 'true' && isEasterEggsEnabled();
}

function actionsInWindow(ms) {
  const cutoff = Date.now() - ms;
  return state.recentActions.filter((t) => t >= cutoff).length;
}

function movesInWindow(ms) {
  const cutoff = Date.now() - ms;
  return state.recentMoves.filter((t) => t >= cutoff).length;
}

const RULES = [
  {
    id: 'indecision_critica',
    icon: HelpCircle,
    level: 'subtle',
    message: 'Patrón de cambios inestable detectado',
    check: () => state.rapidFilterChanges > RAPID_THRESHOLD,
  },
  {
    id: 'filtro_quirurgico',
    icon: Filter,
    level: 'subtle',
    message: 'Nivel de filtrado avanzado',
    check: () => state.maxSelectedDays > 3,
  },
  {
    id: 'velocidad_crucero',
    icon: Zap,
    level: 'subtle',
    message: 'Ritmo operativo elevado',
    check: () => state.casesMoved > 20,
  },
  {
    id: 'modo_analista',
    icon: TrendingUp,
    level: 'normal',
    message: 'Exploración de métricas intensiva',
    check: () => state.dashboardClicks > 15,
  },
  {
    id: 'sobrecarga_clicks',
    icon: Gauge,
    level: 'noticeable',
    message: 'Frecuencia de interacción superior a lo normal',
    effect: 'flash',
    check: () => actionsInWindow(HYPER_WINDOW_MS) > HYPER_THRESHOLD,
  },
  {
    id: 'pausa_detectada',
    icon: Clock,
    level: 'subtle',
    message: 'Periodo de inactividad registrado',
    check: () => state.idleMs > IDLE_THRESHOLD_MS,
  },
  {
    id: 'sesion_extendida',
    icon: Hourglass,
    level: 'normal',
    message: 'Uso prolongado del sistema',
    check: () => Date.now() - state.sessionStart > SESSION_LONG_MS,
  },
  {
    id: 'explorador_filtros',
    icon: Compass,
    level: 'normal',
    message: 'Navegación basada en filtros',
    check: () => state.filterChanges > 10,
  },
  {
    id: 'kanban_master',
    icon: Columns,
    level: 'normal',
    message: 'Dominio del tablero detectado',
    check: () => state.casesMoved > 40,
  },
  {
    id: 'toque_preciso',
    icon: Crosshair,
    level: 'noticeable',
    message: 'Interacciones altamente focalizadas',
    check: () => state.dashboardClicks > 30,
  },
  {
    id: 'modo_automatico',
    icon: Settings,
    level: 'normal',
    message: 'Patrón repetitivo identificado',
    check: () => movesInWindow(AUTO_WINDOW_MS) >= AUTO_MOVES,
  },
  {
    id: 'revision_intensiva',
    icon: Search,
    level: 'normal',
    message: 'Análisis detallado en curso',
    check: () => state.tableInteractions > 25,
  },
  {
    id: 'pulso_acelerado',
    icon: HeartPulse,
    level: 'noticeable',
    message: 'Alta actividad en corto periodo',
    check: () => actionsInWindow(BURST_WINDOW_MS) >= BURST_THRESHOLD,
  },
  {
    id: 'control_total',
    icon: SlidersHorizontal,
    level: 'noticeable',
    message: 'Uso avanzado de controles',
    check: () => state.filterChanges > 25,
  },
  {
    id: 'ruta_conocida',
    icon: Navigation,
    level: 'subtle',
    message: 'Navegación repetitiva detectada',
    effect: 'glow',
    effectTarget: '.app-header',
    check: () => state.viewChanges > 15,
  },
  {
    id: 'precision_milimetrica',
    icon: Ruler,
    level: 'noticeable',
    message: 'Interacción extremadamente precisa',
    check: () => state.maxSelectedDays >= 5,
  },
  {
    id: 'modo_auditor',
    icon: ClipboardCheck,
    level: 'noticeable',
    message: 'Validación constante de datos',
    check: () => state.casesEdited > 10,
  },
  {
    id: 'flujo_continuo',
    icon: RefreshCw,
    level: 'noticeable',
    message: 'Actividad sostenida sin pausas',
    check: () => state.totalActions > 40 && state.idleMs < 60000,
  },
  {
    id: 'vision_global',
    icon: Globe,
    level: 'noticeable',
    message: 'Uso amplio de vistas y métricas',
    effect: 'highlight',
    effectTarget: '#root',
    check: () => new Set(state.visitedViews).size >= 5,
  },
  {
    id: 'sistema_comprendido',
    icon: Brain,
    level: 'noticeable',
    message: 'Patrón de uso consistente detectado',
    effect: 'pulse',
    effectTarget: '#root',
    check: () => state.totalActions >= 60,
  },
];

/**
 * Evalúa las reglas y dispara (una sola vez por regla por sesión) los easter
 * eggs que correspondan. Devuelve los eggs disparados.
 */
function evaluate() {
  if (!isEnabled()) return [];
  state.idleMs = Date.now() - state.lastAction;
  const fired = [];
  for (const rule of RULES) {
    if (state.triggered[rule.id]) continue;
    if (rule.check()) {
      state.triggered[rule.id] = true;
      fired.push(rule);
    }
  }
  if (fired.length) save();
  fired.forEach(fireEgg);
  return fired;
}

function pushWindowed(arr, ts, max) {
  arr.push(ts);
  const cutoff = ts - HYPER_WINDOW_MS;
  const filtered = arr.filter((t) => t >= cutoff);
  return filtered.length > max ? filtered.slice(-max) : filtered;
}

/**
 * Registra una acción real del usuario y reevalúa las reglas.
 * Tipos:
 *  - FILTER_CHANGE      (payload: { selectedDays: número })
 *  - CASE_CREATED | CASE_MOVED | CASE_EDITED
 *  - DASHBOARD_DRILL | TABLE_INTERACTION
 *  - VIEW_CHANGE        (payload: { view: string })
 */
function trackEvent(type, payload = {}) {
  if (!isEnabled()) return [];
  const now = Date.now();
  state.lastAction = now;

  switch (type) {
    case 'FILTER_CHANGE':
      state.filterChanges += 1;
      state.rapidFilterChanges =
        now - state.lastFilterChange <= RAPID_WINDOW_MS
          ? state.rapidFilterChanges + 1
          : 1;
      state.lastFilterChange = now;
      if (typeof payload.selectedDays === 'number' && payload.selectedDays > state.maxSelectedDays) {
        state.maxSelectedDays = payload.selectedDays;
      }
      break;
    case 'CASE_CREATED':
      state.casesCreated += 1;
      break;
    case 'CASE_MOVED':
      state.casesMoved += 1;
      state.recentMoves = pushWindowed(state.recentMoves, now, 30);
      break;
    case 'CASE_EDITED':
      state.casesEdited += 1;
      break;
    case 'DASHBOARD_DRILL':
      state.dashboardClicks += 1;
      break;
    case 'TABLE_INTERACTION':
      state.tableInteractions += 1;
      break;
    case 'VIEW_CHANGE':
      state.viewChanges += 1;
      if (payload.view && !state.visitedViews.includes(payload.view)) {
        state.visitedViews = [...state.visitedViews, payload.view];
      }
      break;
    default:
      break;
  }

  state.totalActions += 1;
  state.recentActions = pushWindowed(state.recentActions, now, 60);

  save();
  return evaluate();
}

/** Devuelve una copia del estado interno (diagnóstico / tests). */
function getState() {
  return { ...state };
}

/** Reinicia el estado de comportamiento de la sesión. */
function reset() {
  state = defaultState();
  save();
}

load();

export { trackEvent, evaluate, getState, reset };
