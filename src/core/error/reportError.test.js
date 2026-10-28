import { describe, it, expect, beforeEach } from 'vitest';
import { reportError, getErrors, clearErrors } from './reportError';
import useSystemStatus from '../status/systemStatusStore';
import {
  hayPerdidaAlmacenamientoPendiente,
  __resetStorageHealthParaTest,
} from '../status/storageHealth';

/**
 * v1.10.6 — reportError como hook central:
 *  1. el patrón heredado reportError({type, message, context: err}) ahora
 *     persiste la causa raíz en metadata.cause (antes: metadata {} y stack ""
 *     en los reportes de producción — la causa se perdía);
 *  2. CUALQUIER error de la familia "Data lost due to missing file" que
 *     pase por acá activa el estado global de pérdida (cubre cargas,
 *     escrituras, reglas y rechazos no manejados).
 */
describe('reportError · v1.10.6', () => {
  beforeEach(async () => {
    localStorage.clear();
    __resetStorageHealthParaTest();
    await clearErrors();
  });

  it('extrae la causa del patrón {type, message, context} a metadata.cause', async () => {
    const causa = new Error('boom interno');
    await reportError(
      { type: 'db', message: 'reporte con causa unica 1', context: causa },
      { silent: true }
    );
    const entry = (await getErrors(50)).find((e) =>
      e.message.includes('reporte con causa unica 1')
    );
    expect(entry).toBeTruthy();
    expect(entry.metadata.cause).toMatchObject({
      name: 'Error',
      message: 'boom interno',
    });
  });

  it('usa el stack de la causa como respaldo cuando el wrapper no tiene stack', async () => {
    const causa = new Error('con stack propio');
    await reportError(
      { type: 'db', message: 'reporte con stack unico 2', context: causa },
      { silent: true }
    );
    const entry = (await getErrors(50)).find((e) =>
      e.message.includes('reporte con stack unico 2')
    );
    expect(entry).toBeTruthy();
    expect(entry.stack).toContain('con stack propio');
  });

  it('conserva el metadata del llamador junto con la causa', async () => {
    await reportError(
      { type: 'db', message: 'reporte con metadata unico 3', context: new Error('x') },
      { silent: true, operation: 'getTemplatesByType' }
    );
    const entry = (await getErrors(50)).find((e) =>
      e.message.includes('reporte con metadata unico 3')
    );
    expect(entry.metadata.operation).toBe('getTemplatesByType');
    expect(entry.metadata.cause.message).toBe('x');
  });

  it('hook central: error "Data lost due to missing file" activa el estado global', async () => {
    await reportError(
      {
        name: 'AbortError',
        message:
          'AbortError NotReadableError Data lost due to missing file. Affected record should be considered irrecoverable',
      },
      { silent: true, operation: 'getEventsByMonth' }
    );
    expect(useSystemStatus.getState().storageLost).toBe(true);
    expect(hayPerdidaAlmacenamientoPendiente()).toBe(true);
  });

  it('hook central: el patrón heredado {type, message, context: err-perdida} también activa', async () => {
    await reportError(
      {
        type: 'db',
        message: 'Error al cargar las notas',
        context: {
          name: 'AbortError',
          message: 'Data lost due to missing file',
        },
      },
      { silent: true }
    );
    expect(useSystemStatus.getState().storageLost).toBe(true);
    expect(hayPerdidaAlmacenamientoPendiente()).toBe(true);
  });

  it('un error NO relacionado NO activa la pérdida de almacenamiento', async () => {
    await reportError(new Error('fallo cualquiera de red'), { silent: true });
    expect(useSystemStatus.getState().storageLost).toBe(false);
    expect(hayPerdidaAlmacenamientoPendiente()).toBe(false);
  });
});
