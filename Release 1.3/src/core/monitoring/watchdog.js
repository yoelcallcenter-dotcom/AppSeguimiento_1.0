import { reportError } from '../error/reportError';

const FREEZE_THRESHOLD_MS = 3000;
const CHECK_INTERVAL_MS = 1000;

let intervalId = null;
let visibilityHandler = null;
let focusHandler = null;

function isHidden() {
  return typeof document !== 'undefined' && document.hidden;
}

export function startWatchdog() {
  if (intervalId) return;

  let lastTick = Date.now();

  const resetBaseline = () => {
    lastTick = Date.now();
  };

  if (typeof document !== 'undefined') {
    visibilityHandler = () => {
      if (!document.hidden) resetBaseline();
    };
    document.addEventListener('visibilitychange', visibilityHandler);
  }
  if (typeof window !== 'undefined') {
    focusHandler = resetBaseline;
    window.addEventListener('focus', focusHandler);
  }

  intervalId = setInterval(() => {
    if (isHidden()) {
      resetBaseline();
      return;
    }

    const now = Date.now();
    const elapsed = now - lastTick;

    if (elapsed > FREEZE_THRESHOLD_MS) {
      reportError(
        { message: `UI freeze detected: ${elapsed}ms`, type: 'UI_FREEZE' },
        { elapsed, threshold: FREEZE_THRESHOLD_MS, silent: true }
      );
    }

    lastTick = now;
  }, CHECK_INTERVAL_MS);

  if (process.env.NODE_ENV === 'development') {
    console.log('[watchdog] UI freeze monitor started (threshold: 3s)');
  }
}

export function stopWatchdog() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  if (visibilityHandler && typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', visibilityHandler);
    visibilityHandler = null;
  }
  if (focusHandler && typeof window !== 'undefined') {
    window.removeEventListener('focus', focusHandler);
    focusHandler = null;
  }
}

