import { describe, it, expect, afterEach, vi } from 'vitest';
import casesDB from '../db/casesDB';
import appDB from '../db/appDB';
import { repararAlmacenamientoLocal } from './storageRepair';

/**
 * v1.10.8 — Reparación PROFUNDA del almacenamiento: indexedDB.deleteDatabase
 * de AppData + CasesDB (única vía de curar "Data lost due to missing file"
 * desde la app) + recarga. Se mockea `indexedDB.deleteDatabase` para no
 * tocar las bases reales del entorno de test (fake-indexeddb compartido).
 */

// Request falso de deleteDatabase: los handlers se disparan async como haría
// el navegador real.
const fireReq = (evento) => () => {
  const req = {
    onsuccess: null,
    onerror: null,
    onblocked: null,
    error: null,
  };
  setTimeout(() => {
    if (req[evento]) req[evento]({ target: req });
  }, 0);
  return req;
};

let spies = [];
afterEach(() => {
  spies.forEach((s) => s.mockRestore());
  spies = [];
  vi.restoreAllMocks();
});

describe('repararAlmacenamientoLocal (1.10.8)', () => {
  it('cierra conexiones, borra ambas bases y recarga (camino feliz)', async () => {
    const cerrarCases = vi.spyOn(casesDB, 'close');
    const cerrarApp = vi.spyOn(appDB, 'close');
    const borrar = vi
      .spyOn(indexedDB, 'deleteDatabase')
      .mockImplementation(fireReq('onsuccess'));
    const recargar = vi.fn();

    const r = await repararAlmacenamientoLocal({ recargar });

    expect(r).toEqual({ ok: true });
    expect(cerrarCases).toHaveBeenCalled();
    expect(cerrarApp).toHaveBeenCalled();
    expect(borrar).toHaveBeenCalledTimes(2);
    // Se borran EXACTAMENTE las bases de la app (no otras).
    const nombres = borrar.mock.calls.map((c) => c[0]).sort();
    expect(nombres).toEqual(['AppData', 'CasesDB']);
    expect(recargar).toHaveBeenCalledTimes(1);
  });

  it('bloqueada por otra pestaña: NO recarga y lo informa', async () => {
    vi.spyOn(casesDB, 'close');
    vi.spyOn(appDB, 'close');
    vi.spyOn(indexedDB, 'deleteDatabase').mockImplementation(fireReq('onblocked'));
    const recargar = vi.fn();

    const r = await repararAlmacenamientoLocal({ recargar, timeoutMs: 5 });

    expect(r.ok).toBe(false);
    expect(r.bloqueado).toBe(true);
    // Recargar con la base todavía rota/abierta sería un estado a peor.
    expect(recargar).not.toHaveBeenCalled();
  });

  it('error del navegador: resuelve con ok:false y el motivo (nunca cuelga)', async () => {
    vi.spyOn(casesDB, 'close');
    vi.spyOn(appDB, 'close');
    vi.spyOn(indexedDB, 'deleteDatabase').mockImplementation(() => {
      const req = { onsuccess: null, onerror: null, onblocked: null, error: null };
      setTimeout(() => {
        req.error = { message: 'Acceso denegado' };
        req.onerror({ target: req });
      }, 0);
      return req;
    });
    const recargar = vi.fn();

    const r = await repararAlmacenamientoLocal({ recargar });

    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Acceso denegado/);
    expect(recargar).not.toHaveBeenCalled();
  });

  it('deleteDatabase lanzando excepción sincrónica: también resuelve (best-effort)', async () => {
    vi.spyOn(casesDB, 'close');
    vi.spyOn(appDB, 'close');
    vi.spyOn(indexedDB, 'deleteDatabase').mockImplementation(() => {
      throw new Error('IndexedDB no disponible');
    });
    const recargar = vi.fn();

    const r = await repararAlmacenamientoLocal({ recargar });

    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/IndexedDB no disponible/);
    expect(recargar).not.toHaveBeenCalled();
  });
});
