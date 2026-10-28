// v1.10.7: + vi/afterEach para spies de storage dañado y + hayQueEjecutarBackup.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import appDB from '../core/db/appDB';
import casesDB from '../core/db/casesDB';
import { exportBackup } from './backupService';
import {
  getBackupHistory,
  normalizeAutoBackupHistory,
  hayQueEjecutarBackup,
  // v1.10.8: snapshot local de emergencia (localStorage).
  guardarSnapshotLocal,
  leerSnapshotLocal,
  haySnapshotLocal,
  limpiarSnapshotLocal,
  restaurarSnapshotLocal,
  runAutoBackup,
  SNAPSHOT_LOCAL_KEY,
  SNAPSHOT_MAX_CHARS,
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

// v1.10.8: el snapshot de EMERGENCIA en localStorage — si la IndexedDB se
// pierde, los backups automáticos (que viven en esa misma base) también; el
// snapshot sobrevive en otro origen de datos y permite restaurar igual.

describe('snapshot local de emergencia (1.10.8)', () => {
  let spies = [];
  const spy = (...args) => {
    const s = vi.spyOn(...args);
    spies.push(s);
    return s;
  };

  beforeEach(async () => {
    localStorage.removeItem(SNAPSHOT_LOCAL_KEY);
    localStorage.removeItem('backup-last-run');
    await casesDB.cases.clear();
    await casesDB.case_history.clear();
    await appDB.notes.clear();
    await appDB.events.clear();
  });

  afterEach(() => {
    spies.forEach((s) => s.mockRestore());
    spies = [];
    vi.restoreAllMocks();
  });

  it('guardar + leer: devuelve el objeto exacto; haySnapshotLocal solo chequea presencia', async () => {
    const backup = await exportBackup();
    expect(haySnapshotLocal()).toBe(false);

    const r = guardarSnapshotLocal(backup);

    expect(r.guardado).toBe(true);
    expect(r.bytes).toBeGreaterThan(0);
    expect(haySnapshotLocal()).toBe(true);
    expect(leerSnapshotLocal()).toEqual(backup);
  });

  it('guardarSnapshotLocal: si supera el límite NO guarda (no agota la cuota)', () => {
    const r = guardarSnapshotLocal({ big: 'x'.repeat(SNAPSHOT_MAX_CHARS + 10) });
    expect(r).toEqual({ guardado: false, motivo: 'limite' });
    expect(haySnapshotLocal()).toBe(false);
  });

  it('guardarSnapshotLocal: cuota agotada se informa pero NUNCA lanza', () => {
    spy(Storage.prototype, 'setItem').mockImplementation(() => {
      throw Object.assign(new Error('quota'), { name: 'QuotaExceededError' });
    });
    const r = guardarSnapshotLocal({ ok: true });
    expect(r).toEqual({ guardado: false, motivo: 'limite' });
  });

  it('limpiarSnapshotLocal elimina la copia (para "borrar todo")', async () => {
    guardarSnapshotLocal(await exportBackup());
    expect(haySnapshotLocal()).toBe(true);
    limpiarSnapshotLocal();
    expect(haySnapshotLocal()).toBe(false);
    expect(leerSnapshotLocal()).toBeNull();
  });

  it('restaurarSnapshotLocal sin snapshot → ok:false con mensaje claro', async () => {
    const r = await restaurarSnapshotLocal();
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/No hay snapshot local/);
  });

  it('restaurarSnapshotLocal con JSON corrupto → ok:false (no lanza)', () => {
    localStorage.setItem(SNAPSHOT_LOCAL_KEY, '{esto no es json');
    return restaurarSnapshotLocal().then((r) => {
      expect(r.ok).toBe(false);
    });
  });

  it('restaurarSnapshotLocal con objeto inválido → ok:false explicando el motivo', async () => {
    localStorage.setItem(SNAPSHOT_LOCAL_KEY, JSON.stringify({ foo: 1 }));
    const r = await restaurarSnapshotLocal();
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/no es válido/);
  });

  it('roundtrip: restaura el snapshot por sobre los datos locales', async () => {
    await casesDB.cases.bulkPut([
      { id: 'c1', nombre: 'Del snapshot', estado: 'Pendiente', fecha: '2026-07-01' },
    ]);
    const backup = await exportBackup();
    guardarSnapshotLocal(backup);

    // Dato POST-snapshot que el import (atómico) debe descartar.
    await appDB.notes.add({ title: 'post-snapshot', content: '', tags: [] });

    const r = await restaurarSnapshotLocal();

    expect(r.ok).toBe(true);
    expect(r.counts.cases).toBe(1);
    const notas = await appDB.notes.toArray();
    expect(notas.some((n) => n.title === 'post-snapshot')).toBe(false);
  });

  it('runAutoBackup feliz: guarda el snapshot y lo reporta en el resultado', async () => {
    await appDB.notes.add({ title: 'N1', content: '', tags: [] });

    const r = await runAutoBackup({ silent: true });

    expect(r.ok).toBe(true);
    expect(r.snapshot.guardado).toBe(true);
    expect(haySnapshotLocal()).toBe(true);
    const snap = leerSnapshotLocal();
    expect(snap.data.db.notes).toHaveLength(1);
  });

  it('historial dañado (auto_backups.add falla): el snapshot SÍ quedó guardado', async () => {
    spy(appDB.auto_backups, 'add').mockRejectedValue(
      Object.assign(new Error('Data lost due to missing file'), { name: 'AbortError' })
    );

    const r = await runAutoBackup({ silent: true });

    expect(r.ok).toBe(false);
    expect(r.snapshotGuardado).toBe(true);
    // La copia de emergencia existe y es restaurable.
    expect(haySnapshotLocal()).toBe(true);
    expect(leerSnapshotLocal().kind).toBe('appseguimiento-backup');
  });
});
