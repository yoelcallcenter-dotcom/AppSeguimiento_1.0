// v1.10.7: + vi/afterEach para spies de storage dañado y + hayQueEjecutarBackup.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import appDB from '../core/db/appDB';
import {
  getBackupHistory,
  normalizeAutoBackupHistory,
  hayQueEjecutarBackup,
} from './autoBackup';

const NORMALIZED_KEY = 'app.auto-backups-normalized';

async function seedLegado() {
  await appDB.auto_backups.add({
    timestamp: '2025-01-02T00:00:00.000Z',
    kind: 'auto',
    sizeKB: 120,
    counts: { cases: 3, notes: 1, events: 0 },
    backup: {
      data: {
        db: {
          cases: [{ id: 'c1' }],
          auto_backups: [{ id: 1, backup: { data: { db: { auto_backups: [] } } } }],
        },
      },
    },
  });
  await appDB.auto_backups.add({
    timestamp: '2025-01-01T00:00:00.000Z',
    kind: 'auto',
    sizeKB: 10,
    counts: { cases: 1, notes: 0, events: 0 },
    backup: { data: { db: { cases: [{ id: 'c0' }] } } },
  });
  await appDB.migration_snapshots.add({
    fromVersion: 4,
    toVersion: 5,
    createdAt: '2025-01-01T00:00:00.000Z',
    data: {
      cases: [],
      auto_backups: [{ id: 9, backup: { gigante: true } }],
    },
  });
}

describe('normalizeAutoBackupHistory (1.9.5)', () => {
  beforeEach(async () => {
    await appDB.auto_backups.clear();
    await appDB.migration_snapshots.clear();
    localStorage.removeItem(NORMALIZED_KEY);
    await seedLegado();
  });

  it('quita el historial anidado de cada snapshot y de los snapshots de migración', async () => {
    const normalizados = await normalizeAutoBackupHistory();

    expect(normalizados).toBe(2);

    const filas = await appDB.auto_backups.orderBy('timestamp').toArray();
    expect(filas).toHaveLength(2);
    for (const fila of filas) {
      expect(fila.backup.data.db.auto_backups).toBeUndefined();
      expect(fila.backup.data.db.cases).toBeDefined();
      expect(fila.counts).toBeDefined();
    }

    const snapshot = (await appDB.migration_snapshots.toArray())[0];
    expect(snapshot.data.auto_backups).toEqual([]);
    expect(snapshot.data.cases).toEqual([]);
  });

  it('marca la normalización como ejecutada (idempotente)', async () => {
    expect(localStorage.getItem(NORMALIZED_KEY)).toBeNull();
    await normalizeAutoBackupHistory();
    expect(localStorage.getItem(NORMALIZED_KEY)).toBe('1');

    await appDB.auto_backups.add({
      timestamp: '2025-01-03T00:00:00.000Z',
      kind: 'auto',
      sizeKB: 5,
      counts: { cases: 0, notes: 0, events: 0 },
      backup: { data: { db: { auto_backups: [{ id: 99 }] } } },
    });

    expect(await normalizeAutoBackupHistory()).toBe(0);
    const fila = await appDB.auto_backups.orderBy('timestamp').reverse().first();
    expect(fila.backup.data.db.auto_backups).toBeDefined();
  });

  it('el historial ya no contiene blobs anidados tras normalizar', async () => {
    await normalizeAutoBackupHistory();
    const historial = await getBackupHistory();
    expect(historial).toHaveLength(2);
    expect(historial[0].sizeKB).toBe(120);
    for (const b of historial) {
      expect(b.backup.data.db.auto_backups).toBeUndefined();
    }
  });
});

// v1.10.7: por qué no se podían hacer backups / por qué el historial quedaba
// vacío tras una pérdida de archivos (DB recreada con last-run sobreviviente
// en localStorage) y por qué el Diagnóstico necesitaba distinguir
// "no hay backups" de "el historial no se puede leer".
describe('hayQueEjecutarBackup + getBackupHistory({relanzar}) (1.10.7)', () => {
  let spies = [];

  beforeEach(async () => {
    await appDB.auto_backups.clear();
    localStorage.removeItem('backup-frecuencia');
    localStorage.removeItem('backup-last-run');
  });

  afterEach(() => {
    spies.forEach((s) => s.mockRestore());
    spies = [];
    vi.restoreAllMocks();
  });

  it('frecuencia manual: nunca corre automático, aunque el historial esté vacío', async () => {
    localStorage.setItem('backup-frecuencia', 'manual');
    expect(await hayQueEjecutarBackup()).toBe(false);
  });

  it('hist vacío + período NO vencido → SÍ ejecuta (fix: DB recreada tras la pérdida)', async () => {
    localStorage.setItem('backup-frecuencia', 'diario');
    // "backup-last-run" sobrevive a la pérdida (está en localStorage)…
    localStorage.setItem('backup-last-run', String(Date.now()));
    // …pero el historial quedó vacío: hay que respaldar YA, no en 24 h.
    expect(await hayQueEjecutarBackup()).toBe(true);
  });

  it('hist con filas + período NO vencido → no ejecuta (comportamiento original)', async () => {
    localStorage.setItem('backup-frecuencia', 'diario');
    localStorage.setItem('backup-last-run', String(Date.now()));
    await appDB.auto_backups.add({
      timestamp: new Date().toISOString(),
      kind: 'auto',
      sizeKB: 10,
      counts: { cases: 1, notes: 0, events: 0 },
      backup: { data: { db: {} } },
    });
    expect(await hayQueEjecutarBackup()).toBe(false);
  });

  it('período vencido → ejecuta aunque el historial tenga filas', async () => {
    localStorage.setItem('backup-frecuencia', 'diario');
    localStorage.setItem('backup-last-run', String(Date.now() - 25 * 60 * 60 * 1000));
    await appDB.auto_backups.add({
      timestamp: new Date().toISOString(),
      kind: 'auto',
      sizeKB: 10,
      counts: { cases: 1, notes: 0, events: 0 },
      backup: { data: { db: {} } },
    });
    expect(await hayQueEjecutarBackup()).toBe(true);
  });

  it('tabla ilegible (storage dañado) → false: no reintenta cada minuto algo roto', async () => {
    localStorage.setItem('backup-frecuencia', 'diario');
    localStorage.setItem('backup-last-run', String(Date.now()));
    spies.push(
      vi.spyOn(appDB.auto_backups, 'count').mockRejectedValue(new Error('Data lost due to missing file'))
    );
    expect(await hayQueEjecutarBackup()).toBe(false);
  });

  it('getBackupHistory: por defecto devuelve [] ante un error (fallback de la UI)', async () => {
    spies.push(
      vi.spyOn(appDB.auto_backups, 'orderBy').mockImplementation(() => {
        throw Object.assign(new Error('Data lost due to missing file'), { name: 'AbortError' });
      })
    );
    expect(await getBackupHistory()).toEqual([]);
  });

  it('getBackupHistory({relanzar:true}) propaga el error (para el Diagnóstico)', async () => {
    spies.push(
      vi.spyOn(appDB.auto_backups, 'orderBy').mockImplementation(() => {
        throw Object.assign(new Error('Data lost due to missing file'), { name: 'AbortError' });
      })
    );
    await expect(getBackupHistory({ relanzar: true })).rejects.toThrow(/Data lost/);
  });
});
