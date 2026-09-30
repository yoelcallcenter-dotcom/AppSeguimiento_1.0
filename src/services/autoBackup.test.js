import { describe, it, expect, beforeEach } from 'vitest';
import appDB from '../core/db/appDB';
import {
  getBackupHistory,
  normalizeAutoBackupHistory,
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
