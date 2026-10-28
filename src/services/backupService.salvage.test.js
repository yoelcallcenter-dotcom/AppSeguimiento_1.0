import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import casesDB from '../core/db/casesDB';
import appDB from '../core/db/appDB';
import {
  exportBackup,
  importBackup,
  computeChecksum,
  verifyChecksum,
  describirSalvage,
  BACKUP_KIND,
} from './backupService';

/**
 * v1.10.8 — SALVAMENTO ante pérdida de registros ("Data lost due to missing
 * file"): el export deja de ser todo-o-nada. Con una tabla/registro dañado:
 *  - exporta lo legible y marca `backup.salvage.perdidas` (fuera de `data`,
 *    así el checksum sigue cubriendo solo lo exportado);
 *  - al importar, las tablas marcadas conservan lo local (el [] exportado es
 *    el daño, no un borrado) y se advierte en `warnings`.
 */

// Error canónico de la familia pérdida (ver storageHealth.esAlmacenamientoPerdido).
const errPerdido = () =>
  Object.assign(new Error('Data lost due to missing file'), {
    name: 'NotReadableError',
  });

let spies = [];
const spy = (...args) => {
  const s = vi.spyOn(...args);
  spies.push(s);
  return s;
};
afterEach(() => {
  spies.forEach((s) => s.mockRestore());
  spies = [];
  vi.restoreAllMocks();
});

beforeEach(async () => {
  await casesDB.cases.clear();
  await casesDB.case_history.clear();
  await appDB.notes.clear();
  await appDB.events.clear();
  await appDB.note_versions.clear();
  localStorage.clear();
});

describe('backupService — export con salvamento (1.10.8)', () => {
  it('base sana: el backup NO lleva campo salvage (sin degradación)', async () => {
    await appDB.notes.add({ title: 'N1', content: '', tags: [] });
    const backup = await exportBackup();
    expect(backup.salvage).toBeUndefined();
    expect(backup.data.db.notes).toHaveLength(1);
  });

  it('tabla dañada con claves legibles: exporta lo sano y marca 1 registro perdido', async () => {
    await appDB.notes.add({ title: 'N1', content: '', tags: [] });
    await appDB.notes.add({ title: 'N2 (dañada)', content: '', tags: [] });
    await appDB.notes.add({ title: 'N3', content: '', tags: [] });
    const ids = (await appDB.notes.orderBy('id').primaryKeys()).sort();

    // La LECTURA de la tabla falla (familia pérdida), pero el índice de
    // claves sigue legible: getPath 1 de leerTablaSalvamento.
    spy(appDB.notes, 'toArray').mockRejectedValue(errPerdido());
    spy(appDB.notes, 'orderBy').mockReturnValue({
      primaryKeys: async () => ids,
    });
    spy(appDB.notes, 'get').mockImplementation(async (k) => {
      if (k === ids[1]) throw errPerdido(); // el registro del medio está roto
      return { id: k, title: `N${k}`, content: '', tags: [] };
    });

    const backup = await exportBackup();

    expect(backup.data.db.notes).toHaveLength(2);
    expect(backup.data.db.notes.map((n) => n.id).sort()).toEqual(
      [ids[0], ids[2]].sort()
    );
    expect(backup.salvage.perdidas).toEqual([
      { tabla: 'notes', registros: 1 },
    ]);
    // El checksum sigue válido: `salvage` vive FUERA de `data`.
    expect(await verifyChecksum(backup)).toBe(true);
  });

  it('tabla string-keyed totalmente ilegible: marcada ilegible (no "vacía")', async () => {
    await casesDB.cases.bulkPut([
      { id: 'c1', nombre: 'Ana', estado: 'Pendiente', fecha: '2026-07-01' },
      { id: 'c2', nombre: 'Bruno', estado: 'Firmo', fecha: '2026-07-02' },
    ]);
    // Ni lectura ni enumeración de claves: la sonda también falla → no hay
    // forma segura de bisecar claves string → ilegible COMPLETA.
    const rechazar = async () => {
      throw errPerdido();
    };
    spy(casesDB.cases, 'toArray').mockRejectedValue(errPerdido());
    spy(casesDB.cases, 'orderBy').mockReturnValue({
      primaryKeys: rechazar,
      limit: () => ({ primaryKeys: rechazar }),
    });

    const backup = await exportBackup();

    expect(backup.data.db.cases).toEqual([]);
    expect(backup.salvage.perdidas).toEqual([
      { tabla: 'cases', registros: null, ilegible: true },
    ]);
  });

  it('bisección numérica: aísla la clave dañada sin perder las sanas', async () => {
    // 10 eventos; el id 5 (el "dañado") no se puede leer.
    const ids = [];
    for (let i = 0; i < 10; i++) {
      ids.push(
        await appDB.events.add({
          title: `E${i}`,
          startDate: '2026-07-01',
          status: 'pendiente',
          createdAt: new Date().toISOString(),
        })
      );
    }
    const dañada = ids[4];

    spy(appDB.events, 'toArray').mockRejectedValue(errPerdido());
    spy(appDB.events, 'orderBy').mockImplementation(() => ({
      // Enumeración COMPLETA falla (el registro roto está en el medio)…
      primaryKeys: async () => {
        throw errPerdido();
      },
      // …pero la sonda de 1 clave funciona (la primera está sana).
      limit: () => ({ primaryKeys: async () => [ids[0]] }),
      // Rangos: fallan solo si contienen la clave dañada (como en Chromium).
      between: (min, max) => ({
        primaryKeys: async () => {
          if (dañada >= min && dañada < max) throw errPerdido();
          return ids.filter((k) => k >= min && k < max);
        },
      }),
    }));
    spy(appDB.events, 'get').mockImplementation(async (k) => {
      if (k === dañada) throw errPerdido();
      return { id: k, title: `E${k}`, startDate: '2026-07-01', status: 'pendiente' };
    });

    const backup = await exportBackup();

    expect(backup.data.db.events).toHaveLength(9);
    expect(backup.data.db.events.some((e) => e.id === dañada)).toBe(false);
    expect(backup.salvage.perdidas).toEqual([{ tabla: 'events', registros: 1 }]);
  });

  it('un error que NO es de la familia pérdida sigue propagándose (comportamiento previo)', async () => {
    spy(appDB.notes, 'toArray').mockRejectedValue(new Error('TypeError: boom'));
    await expect(exportBackup()).rejects.toThrow(/boom/);
  });
});

describe('backupService — import con salvamento (1.10.8)', () => {
  // Backup mínimo válido v3 con TODAS las secciones de appDB presentes (una
  // sección ausente también se preserva, pero acá se aísla el comportamiento
  // del salvamento).
  const armarBackup = async ({ dbExtra = {}, salvage = undefined }) => {
    const db = {
      cases: [],
      case_history: [],
      events: [],
      notes: [],
      note_versions: [],
      ...dbExtra,
    };
    const data = { db, storage: {} };
    const backup = {
      kind: BACKUP_KIND,
      version: 3,
      appVersion: '1.10.8',
      timestamp: new Date().toISOString(),
      checksum: await computeChecksum(data),
      data,
    };
    if (salvage) backup.salvage = salvage;
    return backup;
  };

  it('tabla marcada en salvage: conserva lo local y lo advierte (no borra el [])', async () => {
    // Local: una nota sana.
    const localId = await appDB.notes.add({
      title: 'Local sana',
      content: '',
      tags: [],
    });

    // El backup exportó notes: [] POR DAÑO, no por vaciado.
    const backup = await armarBackup({
      dbExtra: { notes: [] },
      salvage: { perdidas: [{ tabla: 'notes', registros: 2 }] },
    });

    const result = await importBackup(backup);

    // La nota local SOBREVIVE (el [] del backup es el daño).
    const notas = await appDB.notes.toArray();
    expect(notas).toHaveLength(1);
    expect(notas[0].id).toBe(localId);
    // El warning explica qué pasó.
    expect(
      result.warnings.some((w) => /notes/.test(w) && /salvamento/.test(w))
    ).toBe(true);
    // El conteo de la huella refleja lo REAL (local), no el [] dañado.
    expect(result.counts.notes).toBe(1);
  });

  it('cases marcado en salvage: no vacía los casos locales ni dispara el guard anti-vaciado', async () => {
    await casesDB.cases.bulkPut([
      { id: 'c1', nombre: 'Local', estado: 'Pendiente', fecha: '2026-07-01' },
    ]);

    // Sin salvamento, este backup (cases: [] con casos locales) lanzaría el
    // error CRITICAL anti-vaciado; con salvage se conserva lo local sin drama.
    const backup = await armarBackup({
      dbExtra: { cases: [] },
      salvage: { perdidas: [{ tabla: 'cases', registros: null, ilegible: true }] },
    });

    const result = await importBackup(backup);

    const casos = await casesDB.cases.toArray();
    expect(casos).toHaveLength(1);
    expect(casos[0].id).toBe('c1');
    expect(
      result.warnings.some((w) => /cases/.test(w) && /ilegible/.test(w))
    ).toBe(true);
    expect(result.counts.cases).toBe(1);
  });

  it('backup SIN salvage: conserva el comportamiento previo (secciones ausentes preservan)', async () => {
    // OJO: auto_backups queda FUERA de DB_TABLES a propósito (1.9.5); se usa
    // "templates", que sí es una sección de appDB ausente del db de prueba.
    const backup = await armarBackup({}); // secciones presentes en []
    const result = await importBackup(backup);
    expect(backup.salvage).toBeUndefined();
    expect(result.warnings.some((w) => /templates/.test(w))).toBe(true);
  });
});

describe('describirSalvage (1.10.8)', () => {
  it('resume las tablas perdidas para los toasts de UI', () => {
    expect(describirSalvage(null)).toBeNull();
    expect(describirSalvage({ perdidas: [] })).toBeNull();
    expect(
      describirSalvage({
        perdidas: [
          { tabla: 'notes', registros: 2 },
          { tabla: 'cases', registros: null, ilegible: true },
        ],
      })
    ).toBe('notes: 2 registro(s) perdido(s), cases (tabla ilegible completa)');
  });
});
