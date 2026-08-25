import { reportError } from '../../core/error/reportError';
import useAppStore from '../../core/store/useAppStore';
import { runRules } from '../rules/rulesEngine';

const CHECK_INTERVAL = 60000;
let intervalId = null;

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
      store.addToast(
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
      store.addToast(`${incomplete.length} caso(s) con datos incompletos`, 'info', 4000);
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
        store.addToast(`Error repetido (${count}x): ${key}`, 'error', 5000);
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
};
