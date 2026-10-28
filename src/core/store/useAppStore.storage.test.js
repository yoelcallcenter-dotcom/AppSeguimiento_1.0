import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import useAppStore from './useAppStore';
import { caseRepository } from '../cases/caseRepository';
import {
  leerHuellaDatos,
  hayPerdidaAlmacenamientoPendiente,
  __resetStorageHealthParaTest,
} from '../status/storageHealth';
import useSystemStatus from '../status/systemStatusStore';

/**
 * v1.10.6 — init() como verificador de integridad:
 *  - con DB sana escribe la huella y no alarma;
 *  - con bandera de una sesión anterior y MENOS datos → alarma de pérdida
 *    silenciosa (la evidencia no se pisa);
 *  - con fallo de lectura → registra storageLost (banner de emergencia);
 *  - con bandera pero conteos completos → libera y marca recuperación.
 */
describe('useAppStore.init · integridad de almacenamiento (1.10.6)', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetStorageHealthParaTest();
    useAppStore.setState({
      cases: [],
      casesLoaded: false,
      notes: [],
      notesLoaded: false,
      events: [],
      eventsLoaded: false,
      ui: { ...useAppStore.getState().ui, loading: false, toasts: [] },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('con DB sana: escribe la huella de conteos y no alarma', async () => {
    await useAppStore.getState().init();

    const huella = leerHuellaDatos();
    expect(huella).toBeTruthy();
    expect(typeof huella.notes).toBe('number');
    expect(typeof huella.events).toBe('number');
    expect(typeof huella.cases).toBe('number');
    expect(useSystemStatus.getState().dataAlarm).toBeNull();
    expect(useSystemStatus.getState().storageLost).toBe(false);
    expect(hayPerdidaAlmacenamientoPendiente()).toBe(false);
  });

  it('bandera previa + menos datos: alarma de pérdida silenciosa SIN pisar la evidencia', async () => {
    // Simula la sesión anterior: perdió la DB (bandera) y la huella decía
    // 3 casos / 5 notas / 2 eventos. La DB ahora responde vacía.
    localStorage.setItem(
      'app-data-fingerprint',
      JSON.stringify({ cases: 3, notes: 5, events: 2, ts: Date.now() })
    );
    localStorage.setItem('app-storage-lost', '1');

    await useAppStore.getState().init();

    const alarm = useSystemStatus.getState().dataAlarm;
    expect(alarm).toBeTruthy();
    expect(alarm.perdidas).toEqual(
      expect.arrayContaining([
        { tabla: 'cases', antes: 3, ahora: 0 },
        { tabla: 'notes', antes: 5, ahora: 0 },
        { tabla: 'events', antes: 2, ahora: 0 },
      ])
    );
    // La evidencia NO se pisó con los 0 del load (bandera activa).
    expect(leerHuellaDatos().notes).toBe(5);
    expect(hayPerdidaAlmacenamientoPendiente()).toBe(true);
  });

  it('fallo de lectura de la DB: registra storageLost (banner de emergencia)', async () => {
    const errPerdida = Object.assign(new Error('Data lost due to missing file'), {
      name: 'AbortError',
    });
    vi.spyOn(caseRepository, 'getAll').mockRejectedValue(errPerdida);

    await useAppStore.getState().init();

    expect(useSystemStatus.getState().storageLost).toBe(true);
    expect(hayPerdidaAlmacenamientoPendiente()).toBe(true);
    // Con lectura fallida no se evalúa alarma (no hay conteos confiables).
    expect(useSystemStatus.getState().dataAlarm).toBeNull();
  });

  it('bandera previa + conteos completos: recupera, libera la bandera y avisa', async () => {
    localStorage.setItem(
      'app-data-fingerprint',
      JSON.stringify({ cases: 0, notes: 0, events: 0, ts: Date.now() })
    );
    localStorage.setItem('app-storage-lost', '1');

    await useAppStore.getState().init();

    expect(hayPerdidaAlmacenamientoPendiente()).toBe(false);
    expect(useSystemStatus.getState().dataAlarm).toBeNull();
    expect(useSystemStatus.getState().storageLost).toBe(false);
  });
});
