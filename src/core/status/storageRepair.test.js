import { describe, it, expect, afterEach, vi } from 'vitest';
import casesDB from '../db/casesDB';
import appDB from '../db/appDB';
// v1.10.9: tercera base (log de errores) incluida en la reparación.
import diagnosticsDB from '../db/indexedDB';
import { repararAlmacenamientoLocal } from './storageRepair';

/**
 * v1.10.8 — Reparación PROFUNDA del almacenamiento: indexedDB.deleteDatabase
 * (única vía de curar "Data lost due to missing file" desde la app) + recarga.
 * v1.10.9: son las TRES bases (AppData + CasesDB + AppDiagnostics) y se deja
 * una marca en localStorage para diagnosticar tras la recarga si las lecturas
 * siguen fallando. Se mockea `indexedDB.deleteDatabase` para no tocar las
 * bases reales del entorno de test (fake-indexeddb compartido).
 */

/** Clave de la marca de reparación (debe coincidir con storageHealth). */
const CLAVE_REPARACION = 'app-repair-pending';

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
  // v1.10.9: no dejar la marca de reparación para otros tests/archivos.
  try { localStorage.removeItem(CLAVE_REPARACION); } catch { /* n/a */ }
});

describe('repararAlmacenamientoLocal (1.10.8)', () => {
  it('cierra las tres conexiones, borra las tres bases y recarga (camino feliz)', async () => {
    const cerrarCases = vi.spyOn(casesDB, 'close');
    const cerrarApp = vi.spyOn(appDB, 'close');
    // v1.10.9: AppDiagnostics (log de errores) también.
    const cerrarDiag = vi.spyOn(diagnosticsDB, 'close');
    const borrar = vi
      .spyOn(indexedDB, 'deleteDatabase')
      .mockImplementation(fireReq('onsuccess'));
    const recargar = vi.fn();

    const r = await repararAlmacenamientoLocal({ recargar });

    expect(r).toEqual({ ok: true });
    expect(cerrarCases).toHaveBeenCalled();
    expect(cerrarApp).toHaveBeenCalled();
    expect(cerrarDiag).toHaveBeenCalled();
    expect(borrar).toHaveBeenCalledTimes(3);
    // Se borran EXACTAMENTE las bases de la app (no otras).
    const nombres = borrar.mock.calls.map((c) => c[0]).sort();
    expect(nombres).toEqual(['AppData', 'AppDiagnostics', 'CasesDB']);
    expect(recargar).toHaveBeenCalledTimes(1);
    // v1.10.9: la marca queda puesta para el diagnóstico post-recarga
    // (la consume storageHealth si las lecturas siguen fallando).
    expect(localStorage.getItem(CLAVE_REPARACION)).toBeTruthy();
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
    // v1.10.9: sin reparación real no debe quedar la marca de post-reparación
    // (induciría diagnósticos falsos en errores posteriores).
    expect(localStorage.getItem(CLAVE_REPARACION)).toBeNull();
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
