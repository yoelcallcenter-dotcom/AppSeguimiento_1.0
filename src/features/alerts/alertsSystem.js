import { reportError } from '../../core/error/reportError';
import useAppStore from '../../core/store/useAppStore';
// v1.10.0 (feature D): runRules se ejecuta ahora de verdad desde
// runCaseRules (antes era un import muerto).
import { runRules } from '../rules/rulesEngine';

const CHECK_INTERVAL = 60000;
let intervalId = null;

// ============================================================
// DEDUP DE TOASTS (1.10.0 · feature D)
// El sistema corre cada 60 s: sin dedup, la misma condición sonaba cada
// minuto ("caso sin teléfono" o "evento próximo" repetidos indefinidamente).
// Una clave solo vuelve a notificar pasada la ventana.
// ============================================================
const DEDUP_WINDOW = 10 * 60 * 1000;
const lastToastAt = new Map();

function dedupToast(key, message, severity = 'info', duration = 4000) {
  const now = Date.now();
  const last = lastToastAt.get(key) || 0;
  if (now - last < DEDUP_WINDOW) return false;
  lastToastAt.set(key, now);
  try {
    useAppStore.getState().addToast(message, severity, duration);
  } catch (err) {
    reportError({ type: 'alert', message: 'dedupToast failed', context: err });
  }
  return true;
}

async function checkUpcomingEvents() {
  try {
    const store = useAppStore.getState();
    const events = store.events || [];
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const upcoming = events.filter((e) => {
      if (!e.startDate) return false;
      const d = new Date(e.startDate);
      return d > now && d <= in24h && e.status !== 'completed' && e.status !== 'cancelled';
    });

    upcoming.forEach((evt) => {
      const timeLeft = new Date(evt.startDate) - now;
      const hoursLeft = Math.round(timeLeft / (1000 * 60 * 60));
      // 1.10.0 (D): un evento solo avisa una vez por ventana (antes cada 60 s).
      dedupToast(
        `evento:${evt.id}`,
        `Evento proximo: "${evt.title}" en ${hoursLeft}h`,
        'warning',
        5000
      );
    });

    return upcoming;
  } catch (err) {
    reportError({ type: 'alert', message: 'Error checking upcoming events', context: err });
    return [];
  }
}

async function checkIncompleteData() {
  try {
    const store = useAppStore.getState();
    const cases = store.cases || [];
    const incomplete = cases.filter((c) => {
      const missing = [];
      if (!c.nombre || !c.nombre.trim()) missing.push('nombre');
      if (!c.telefono || !c.telefono.trim()) missing.push('telefono');
      return missing.length > 0;
    });

    if (incomplete.length > 0) {
      // 1.10.0 (D): clave por cantidad — suena de nuevo si el total cambia,
      // pero no repite el mismo aviso en cada tick de 60 s.
      dedupToast(
        `incompleta:${incomplete.length}`,
        `${incomplete.length} caso(s) con datos incompletos`,
        'info',
        4000
      );
    }

    return incomplete;
  } catch (err) {
    reportError({ type: 'alert', message: 'Error checking incomplete data', context: err });
    return [];
  }
}

async function checkRepeatedErrors() {
  try {
    const store = useAppStore.getState();
    const log = store.errorLog || [];
    const recent = log.filter((e) => {
      const age = Date.now() - new Date(e.timestamp || 0).getTime();
      return age < 3600000;
    });

    const counts = {};
    recent.forEach((e) => {
      const key = `${e.type}:${e.message}`;
      counts[key] = (counts[key] || 0) + 1;
    });

    Object.entries(counts).forEach(([key, count]) => {
      if (count >= 3) {
        // 1.10.0 (D): por error, no por tick (evita repetir el mismo error 60x).
        dedupToast(
          `error:${key}`,
          `Error repetido (${count}x): ${key}`,
          'error',
          5000
        );
      }
    });

    return counts;
  } catch (err) {
    reportError({ type: 'alert', message: 'Error checking repeated errors', context: err });
    return {};
  }
}

async function checkAlerts() {
  try {
    const results = await Promise.allSettled([
      checkUpcomingEvents(),
      checkIncompleteData(),
      checkRepeatedErrors(),
    ]);
    return results;
  } catch (err) {
    reportError({ type: 'alert', message: 'Alert check failed', context: err });
    return [];
  }
}

function triggerAlert({ type, message, severity = 'info', duration = 4000 }) {
  try {
    const store = useAppStore.getState();
    store.addToast(message, severity === 'error' ? 'error' : severity === 'warning' ? 'warning' : 'info', duration);
    store.logError({ type, message, context: 'triggerAlert' });
  } catch (err) {
    reportError({ type: 'alert', message: 'Error triggering alert', context: err });
  }
}

/**
 * runCaseRules (v1.10.0 · feature D)
 * Único cableado del motor de reglas con los cambios de estado de casos.
 * Se llama desde App.jsx en los puntos de transición (alta, edición con cambio
 * de estado, cambiarEstado y reporte rápido) con el caso nuevo y el previo.
 * - `prev` llega en el context para que las reglas distingan la transición
 *   (ej. case-estado-nuevo-create-event) de un estado permanente.
 * - Es fire-and-forget: los errores no frenan el guardado del caso.
 */
function runCaseRules(entity, prev = null) {
  if (!entity) return Promise.resolve([]);
  try {
    const pending = runRules(entity, { prev });
    if (pending && typeof pending.catch === 'function') {
      pending.catch((err) =>
        reportError({ type: 'rule', message: 'runCaseRules failed', context: err })
      );
      // Las reglas que devuelven { action: 'alert' } se materializan como
      // toast con dedup (clave por regla + entidad): una regla "sin teléfono"
      // avisa una sola vez por ventana en lugar de en cada transición.
      pending.then((results = []) => {
        results.forEach((r) => {
          const res = r?.result;
          if (res && res.action === 'alert') {
            dedupToast(
              `rule:${r.rule}:${entity.id}`,
              res.message || `Regla "${r.rule}" detectada`,
              res.severity === 'error' ? 'error' : res.severity === 'warning' ? 'warning' : 'info',
              5000
            );
          }
        });
      });
    }
    return pending;
  } catch (err) {
    reportError({ type: 'rule', message: 'runCaseRules failed', context: err });
    return Promise.resolve([]);
  }
}

function startAlertSystem() {
  if (intervalId) return;
  checkAlerts();
  intervalId = setInterval(checkAlerts, CHECK_INTERVAL);
}

function stopAlertSystem() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function isAlertSystemRunning() {
  return intervalId !== null;
}

export {
  checkAlerts,
  triggerAlert,
  startAlertSystem,
  stopAlertSystem,
  isAlertSystemRunning,
  checkUpcomingEvents,
  checkIncompleteData,
  checkRepeatedErrors,
  // 1.10.0 (feature D):
  runCaseRules,
  // expuesto para tests del dedup:
  dedupToast,
};
