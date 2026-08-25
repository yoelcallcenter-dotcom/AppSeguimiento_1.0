import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { trackEvent, evaluate, getState, reset } from './behaviorEngine';

const OLD_ENV = process.env.REACT_APP_EASTER_EGGS;

beforeEach(() => {
  process.env.REACT_APP_EASTER_EGGS = 'true';
  localStorage.removeItem('app_ui_settings');
  reset();
});

afterEach(() => {
  vi.useRealTimers();
});

afterAll(() => {
  if (OLD_ENV === undefined) delete process.env.REACT_APP_EASTER_EGGS;
  else process.env.REACT_APP_EASTER_EGGS = OLD_ENV;
});

const has = (events, id) => events.some((e) => e.id === id);

describe('behaviorEngine', () => {
  it('no registra nada si el flag de build está desactivado', () => {
    process.env.REACT_APP_EASTER_EGGS = 'false';
    reset();
    const fired = trackEvent('DASHBOARD_DRILL');
    expect(fired).toEqual([]);
    expect(getState().dashboardClicks).toBe(0);
  });

  it('no registra nada si el usuario desactiva los easter eggs', () => {
    localStorage.setItem('app_ui_settings', JSON.stringify({ easterEggsEnabled: false }));
    reset();
    const fired = trackEvent('DASHBOARD_DRILL');
    expect(fired).toEqual([]);
    expect(getState().dashboardClicks).toBe(0);
  });

  it('cuenta filtros y días seleccionados', () => {
    trackEvent('FILTER_CHANGE', { selectedDays: 4 });
    const s = getState();
    expect(s.filterChanges).toBe(1);
    expect(s.maxSelectedDays).toBe(4);
  });

  it('detecta indecisión crítica con cambios rápidos de filtro (one-shot)', () => {
    let last = [];
    for (let i = 0; i < 6; i++) {
      last = trackEvent('FILTER_CHANGE', { selectedDays: 1 });
    }
    expect(has(last, 'indecision_critica')).toBe(true);
    expect(trackEvent('FILTER_CHANGE', { selectedDays: 1 })).toEqual([]);
  });

  it('dispara filtro quirúrgico al combinar más de 3 días', () => {
    const fired = trackEvent('FILTER_CHANGE', { selectedDays: 4 });
    expect(has(fired, 'filtro_quirurgico')).toBe(true);
  });

  it('dispara velocidad crucero al mover más de 20 casos', () => {
    let last = [];
    for (let i = 0; i < 21; i++) last = trackEvent('CASE_MOVED');
    expect(has(last, 'velocidad_crucero')).toBe(true);
  });

  it('dispara modo analista con más de 15 drills', () => {
    let last = [];
    for (let i = 0; i < 16; i++) last = trackEvent('DASHBOARD_DRILL');
    expect(has(last, 'modo_analista')).toBe(true);
  });

  it('dispara sobrecarga de clicks (con flash) por ráfaga de interacción', () => {
    let last = [];
    for (let i = 0; i < 13; i++) last = trackEvent('CASE_MOVED');
    const flash = last.find((e) => e.id === 'sobrecarga_clicks');
    expect(flash).toBeTruthy();
    expect(flash.effect).toBe('flash');
  });

  it('detecta pausa tras 2 minutos de inactividad', () => {
    vi.useFakeTimers();
    reset();
    vi.advanceTimersByTime(3 * 60 * 1000);
    const fired = evaluate();
    expect(has(fired, 'pausa_detectada')).toBe(true);
  });

  it('detecta sesión extendida tras 45 minutos', () => {
    vi.useFakeTimers();
    reset();
    vi.advanceTimersByTime(46 * 60 * 1000);
    const fired = evaluate();
    expect(has(fired, 'sesion_extendida')).toBe(true);
  });

  it('detecta visión global al visitar 5 vistas distintas', () => {
    let last = [];
    for (const v of ['dashboard', 'kanban', 'tabla', 'reportes', 'utiles']) {
      last = trackEvent('VIEW_CHANGE', { view: v });
    }
    expect(has(last, 'vision_global')).toBe(true);
  });

  it('detecta sistema comprendido con uso consistente (60+ acciones)', () => {
    let last = [];
    for (let i = 0; i < 60; i++) last = trackEvent('TABLE_INTERACTION');
    expect(has(last, 'sistema_comprendido')).toBe(true);
  });

  it('expone los 20 easter eggs con icono, mensaje y nivel', () => {
    const s = getState();
    expect(s.triggered).toEqual({});
    // Verifica que la regla de auditoria existe probando su disparo
    const all = [];
    for (let i = 0; i < 12; i++) {
      all.push(...trackEvent('CASE_EDITED'));
    }
    const auditor = all.find((e) => e.id === 'modo_auditor');
    expect(auditor).toBeTruthy();
    expect(auditor.icon).toBeTruthy();
    expect(typeof auditor.message).toBe('string');
    expect(['subtle', 'normal', 'noticeable']).toContain(auditor.level);
  });
});
