import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../error/reportError', () => ({
  reportError: vi.fn(),
}));

import { reportError } from '../error/reportError';
import { startWatchdog, stopWatchdog } from './watchdog';

function stubHidden(value) {
  let hidden = value;
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    get: () => hidden,
  });
  return {
    set: (v) => {
      hidden = v;
      document.dispatchEvent(new Event('visibilitychange'));
    },
  };
}

describe('watchdog', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    reportError.mockClear();
  });

  afterEach(() => {
    stopWatchdog();
    vi.useRealTimers();
  });

  it('reporta UI_FREEZE cuando el hilo principal queda bloqueado estando visible', async () => {
    stubHidden(false);
    startWatchdog();

    vi.setSystemTime(new Date(60000));
    await vi.advanceTimersByTimeAsync(1000);

    expect(reportError).toHaveBeenCalled();
    expect(reportError.mock.calls[0][0].type).toBe('UI_FREEZE');
  });

  it('NO reporta UI_FREEZE cuando la pestaña está oculta aunque el reloj avance (throttling en segundo plano)', async () => {
    const hidden = stubHidden(true);
    hidden.set(true);
    startWatchdog();

    vi.setSystemTime(new Date(60000));
    await vi.advanceTimersByTimeAsync(1000);

    expect(reportError).not.toHaveBeenCalled();
  });

  it('descarta el tiempo en segundo plano al volver al primer plano', async () => {
    const hidden = stubHidden(false);
    hidden.set(true);
    startWatchdog();

    vi.setSystemTime(new Date(60000));
    hidden.set(false);
    vi.setSystemTime(new Date(61000));
    await vi.advanceTimersByTimeAsync(1000);

    expect(reportError).not.toHaveBeenCalled();
  });

  it('marca el reporte como silent para no disparar notificaciones de usuario', async () => {
    stubHidden(false);
    startWatchdog();

    vi.setSystemTime(new Date(60000));
    await vi.advanceTimersByTimeAsync(1000);

    expect(reportError.mock.calls[0][1].silent).toBe(true);
  });
});
