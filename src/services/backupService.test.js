import { describe, it, expect, beforeEach } from 'vitest';
import casesDB from '../core/db/casesDB';
import appDB from '../core/db/appDB';
import { localStorageAdapter } from '../core/storage/localStorageAdapter';
import {
  exportBackup,
  importBackup,
  parseBackupJSON,
  validateBackup,
  verifyChecksum,
  computeChecksum,
  backupSizeKB,
  BACKUP_KIND,
} from './backupService';

async function limpiarBases() {
  await casesDB.cases.clear();
  await appDB.notes.clear();
  await appDB.events.clear();
  await appDB.note_versions.clear();
}

beforeEach(async () => {
  await limpiarBases();
  localStorage.clear();
});

describe('backupService — export', () => {
  it('exporta un backup con estructura y checksum', async () => {
    await casesDB.cases.bulkPut([
      { id: 'c1', nombre: 'Ana', telefono: '261 555-0001', localidad: 'MENDOZA', estado: 'Pendiente', fecha: '2026-07-01' },
    ]);
    await appDB.notes.add({ title: 'Nota de prueba', content: '<p>hola</p>', tags: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

    const backup = await exportBackup();

    expect(backup.kind).toBe(BACKUP_KIND);
    expect(backup.version).toBe(2);
    expect(backup.timestamp).toBeTruthy();
    expect(typeof backup.checksum).toBe('string');
    expect(backup.data.db.cases).toHaveLength(1);
    expect(backup.data.db.notes).toHaveLength(1);
    expect(backup.data.db.cases[0].nombre).toBe('Ana');
    expect(backupSizeKB(backup)).toBeGreaterThanOrEqual(1);
  });

  it('el checksum detecta manipulación', async () => {
    const backup = await exportBackup();
    backup.data.db.cases = [{ id: 'x', nombre: 'Trucado' }];
    const ok = await verifyChecksum(backup);
    expect(ok).toBe(false);
  });
});

describe('backupService — roundtrip', () => {
  it('restaura casos, notas y eventos tras limpiar las bases', async () => {
    await casesDB.cases.bulkPut([
      { id: 'c1', nombre: 'Ana', telefono: '261 555-0001', localidad: 'MENDOZA', estado: 'Pendiente', fecha: '2026-07-01' },
      { id: 'c2', nombre: 'Bruno', telefono: '261 555-0002', localidad: 'GODOY CRUZ', estado: 'Firmo', fecha: '2026-07-02' },
    ]);
    const notaId = await appDB.notes.add({ title: 'N1', content: '', tags: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    await appDB.events.add({ title: 'Llamada', startDate: '2026-07-03', status: 'pendiente', relatedNoteId: notaId, createdAt: new Date().toISOString() });
    localStorageAdapter.set('config-art-tracker', { operador: 'Yoel', formatoFecha: 'DD/MM/YYYY' });

    const backup = await exportBackup();

    await limpiarBases();
    localStorage.clear();

    const result = await importBackup(backup);

    expect(result.counts.cases).toBe(2);
    expect(result.counts.notes).toBe(1);
    expect(result.counts.events).toBe(1);

    const casos = await casesDB.cases.toArray();
    const notas = await appDB.notes.toArray();
    const eventos = await appDB.events.toArray();

    expect(casos.map((c) => c.nombre).sort()).toEqual(['Ana', 'Bruno']);
    expect(notas).toHaveLength(1);
    expect(eventos).toHaveLength(1);

    const config = localStorageAdapter.get('config-art-tracker');
    expect(config.operador).toBe('Yoel');
  });

  it('rechaza un backup con checksum alterado sin tocar los datos', async () => {
    await casesDB.cases.bulkPut([{ id: 'c1', nombre: 'Original', telefono: '261 555-0001', localidad: 'MENDOZA', estado: 'Pendiente', fecha: '2026-07-01' }]);
    const backup = await exportBackup();
    backup.data.db.cases[0].nombre = 'Modificado';
    await importBackup(backup).catch(() => {});

    const casos = await casesDB.cases.toArray();
    expect(casos[0].nombre).toBe('Original');
  });
});

describe('backupService — validación', () => {
  it('validateBackup detecta estructura inválida', () => {
    expect(validateBackup(null).length).toBeGreaterThan(0);
    expect(validateBackup({ kind: 'otra-cosa', data: {} }).length).toBeGreaterThan(0);
    expect(validateBackup({ kind: BACKUP_KIND, data: {} }).length).toBe(0);
  });

  it('parseBackupJSON rechaza JSON roto y backups corruptos', async () => {
    const { backup, error } = await parseBackupJSON('not json {');
    expect(backup).toBeNull();
    expect(error).toBeTruthy();
  });

  it('parseBackupJSON acepta un backup real', async () => {
    const real = await exportBackup();
    const { backup, error } = await parseBackupJSON(JSON.stringify(real));
    expect(error).toBeNull();
    expect(backup.kind).toBe(BACKUP_KIND);
  });

  it('computeChecksum es determinístico', async () => {
    const payload = { a: [1, 2], b: 'hola' };
    const h1 = await computeChecksum(payload);
    const h2 = await computeChecksum(payload);
    expect(h1).toBe(h2);
  });
});
