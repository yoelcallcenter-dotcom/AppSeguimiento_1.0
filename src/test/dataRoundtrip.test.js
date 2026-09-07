import { describe, it, expect, beforeEach } from 'vitest';
import casesDB from '../core/db/casesDB';
import appDB from '../core/db/appDB';
import { localStorageAdapter } from '../core/storage/localStorageAdapter';
import { exportBackup, importBackup, validateBackup, computeChecksum, verifyChecksum } from '../services/backupService';
import { migrateBackup, needsMigration, BACKUP_SCHEMA_VERSION_CURRENT } from '../utils/backup/backupMigrator';

async function clearAll() {
  await casesDB.cases.clear();
  await casesDB.case_history.clear();
  await appDB.notes.clear();
  await appDB.events.clear();
  await appDB.note_versions.clear();
  await appDB.auto_backups.clear();
  localStorage.clear();
}

async function seedTestData() {
  const caseId = 'test-case-001';
  await casesDB.cases.put({
    id: caseId,
    nombre: 'Juan Pérez',
    telefono: '+5491155551234',
    localidad: 'La Plata',
    aseguradora: 'Sancor Salud',
    estado: 'Cita virtual',
    fecha: '2025-06-15',
    observaciones: 'Caso de prueba',
    tags: ['urgente', 'test'],
    reporteHistory: [{ fecha: '2025-06-15', texto: 'Primer reporte', origen: 'Operador' }],
    comentarios: [{ fecha: '2025-06-15', texto: 'Comentario test', usuario: 'Usuario' }],
    version: 1,
    updatedAt: '2025-06-15T10:00:00.000Z',
  });

  await casesDB.case_history.put({
    caseId,
    timestamp: Date.now(),
    type: 'created',
    title: 'Caso creado',
    description: 'Creado para test',
  });

  const noteId = await appDB.notes.add({
    title: 'Nota de prueba',
    content: 'Contenido de nota test',
    tags: ['test'],
    relatedCaseIds: [caseId],
    createdAt: '2025-06-15T10:00:00.000Z',
    updatedAt: '2025-06-15T10:00:00.000Z',
    version: 1,
  });

  await appDB.events.add({
    title: 'Cita de prueba',
    startDate: '2025-06-20T09:00:00.000Z',
    endDate: '2025-06-20T10:00:00.000Z',
    status: 'confirmed',
    priority: 'high',
    relatedCaseIds: [caseId],
    relatedNoteId: noteId,
    eventType: 'cita',
    createdAt: '2025-06-15T10:00:00.000Z',
    updatedAt: '2025-06-15T10:00:00.000Z',
    version: 1,
  });

  localStorageAdapter.set('config-art-tracker', {
    estadoDefault: 'Cita virtual',
    formatoFecha: 'DD/MM/YYYY',
    operador: 'Test Operator',
  });
  localStorageAdapter.set('pasos-art-tracker', [
    { id: 'p1', titulo: 'Paso 1', contenido: 'Contenido del paso' },
  ]);
  localStorage.setItem('userOperatorProfile', JSON.stringify({
    fullName: 'Test User',
    displayName: 'TU',
  }));
  localStorage.setItem('app-theme', JSON.stringify('dark'));

  return { caseId, noteId };
}

describe('Roundtrip Backup → Restore', () => {
  beforeEach(async () => {
    await clearAll();
  });

  it('export → import preserva casos, notas, eventos, historial y config', async () => {
    const { caseId, noteId } = await seedTestData();

    const backup = await exportBackup();

    expect(backup.kind).toBe('appseguimiento-backup');
    expect(backup.version).toBe(3);
    expect(backup.checksum).toBeTruthy();
    expect(backup.data.db.cases.length).toBe(1);
    expect(backup.data.db.case_history.length).toBe(1);
    expect(backup.data.db.notes.length).toBe(1);
    expect(backup.data.db.events.length).toBe(1);

    const checksumOk = await verifyChecksum(backup);
    expect(checksumOk).toBe(true);

    await clearAll();

    const result = await importBackup(backup, { permitirVaciar: true });

    expect(result.counts.cases).toBe(1);
    expect(result.counts.notes).toBe(1);
    expect(result.counts.events).toBe(1);
    expect(result.counts.case_history).toBe(1);

    const restoredCases = await casesDB.cases.toArray();
    expect(restoredCases.length).toBe(1);
    expect(restoredCases[0].nombre).toBe('Juan Pérez');
    expect(restoredCases[0].telefono).toBe('+5491155551234');
    expect(restoredCases[0].tags).toEqual(['urgente', 'test']);

    const restoredHistory = await casesDB.case_history.toArray();
    expect(restoredHistory.length).toBe(1);
    expect(restoredHistory[0].caseId).toBe(caseId);

    const restoredNotes = await appDB.notes.toArray();
    expect(restoredNotes.length).toBe(1);
    expect(restoredNotes[0].title).toBe('Nota de prueba');
    expect(restoredNotes[0].relatedCaseIds).toContain(caseId);

    const restoredEvents = await appDB.events.toArray();
    expect(restoredEvents.length).toBe(1);
    expect(restoredEvents[0].title).toBe('Cita de prueba');
    expect(restoredEvents[0].eventType).toBe('cita');

    const config = localStorageAdapter.get('config-art-tracker');
    expect(config.estadoDefault).toBe('Cita virtual');

    const steps = localStorageAdapter.get('pasos-art-tracker');
    expect(steps.length).toBe(1);

    const profile = JSON.parse(localStorage.getItem('userOperatorProfile'));
    expect(profile.fullName).toBe('Test User');

    const theme = JSON.parse(localStorage.getItem('app-theme'));
    expect(theme).toBe('dark');
  });

  it('checksum detecta manipulación', async () => {
    await seedTestData();
    const backup = await exportBackup();
    backup.data.db.cases[0].nombre = 'MODIFICADO';
    const checksumOk = await verifyChecksum(backup);
    expect(checksumOk).toBe(false);
  });

  it('validateBackup rechaza estructura inválida', () => {
    expect(validateBackup(null).length).toBeGreaterThan(0);
    expect(validateBackup({}).length).toBeGreaterThan(0);
    expect(validateBackup({ kind: 'otro' }).length).toBeGreaterThan(0);
  });

  it('backup v3 incluye auto_backups', async () => {
    await seedTestData();
    const backup = await exportBackup();
    expect(backup.data.db.auto_backups).toBeDefined();
    expect(Array.isArray(backup.data.db.auto_backups)).toBe(true);
  });

  it('restore protege claves conocidas no presentes en backup', async () => {
    await seedTestData();
    const backup = await exportBackup();

    await clearAll();

    localStorage.setItem('app-typography-preset', JSON.stringify('futurista'));

    await importBackup(backup, { permitirVaciar: true });

    const preserved = JSON.parse(localStorage.getItem('app-typography-preset'));
    expect(preserved).toBe('futurista');
  });
});

describe('Migración de backups', () => {
  beforeEach(async () => {
    await clearAll();
  });

  it('detecta backup v0 que necesita migración', () => {
    const backup = { kind: 'seguimiento-art-backup', data: { db: {}, storage: {} } };
    expect(needsMigration(backup)).toBe(true);
  });

  it('no migra backup v3 actual', () => {
    const backup = { kind: 'appseguimiento-backup', version: 3, data: { db: {}, storage: {} } };
    expect(needsMigration(backup)).toBe(false);
  });

  it('migra v0 → v3 correctamente', () => {
    const backup = { kind: 'seguimiento-art-backup', data: { db: {}, storage: {} } };
    const { migrated, applied } = migrateBackup(backup);
    expect(migrated.kind).toBe('appseguimiento-backup');
    expect(migrated.version).toBe(3);
    expect(applied.length).toBe(3);
    expect(migrated.data.db.auto_backups).toEqual([]);
  });

  it('migra v1 → v3 correctamente', () => {
    const backup = { kind: 'seguimiento-art-backup', version: 1, data: { db: {}, storage: {} } };
    const { migrated, applied } = migrateBackup(backup);
    expect(migrated.kind).toBe('appseguimiento-backup');
    expect(migrated.version).toBe(3);
    expect(applied.length).toBe(2);
  });
});

describe('Import CSV unificado', () => {
  beforeEach(async () => {
    await clearAll();
  });

  it('importCasesFromCSV en modo append agrega sin borrar', async () => {
    await casesDB.cases.put({
      id: 'existing',
      nombre: 'Existente',
      telefono: '1111111111',
      estado: 'Activo',
      version: 1,
      updatedAt: '2025-01-01T00:00:00.000Z',
    });

    const { importCasesFromCSV } = await import('../utils/backup/importCases');
    const csv = 'Nombre,Telefono,Estado\nNuevo Caso,2222222222,Sin reporte';

    const result = await importCasesFromCSV(csv, { mode: 'append' });

    expect(result.success).toBe(true);
    const all = await casesDB.cases.toArray();
    expect(all.length).toBe(2);
    expect(all.find((c) => c.nombre === 'Existente')).toBeTruthy();
    expect(all.find((c) => c.nombre === 'Nuevo Caso')).toBeTruthy();
  });

  it('importCasesFromCSV en modo replace borra y reemplaza', async () => {
    await casesDB.cases.put({
      id: 'existing',
      nombre: 'Existente',
      telefono: '1111111111',
      estado: 'Activo',
      version: 1,
      updatedAt: '2025-01-01T00:00:00.000Z',
    });

    const { importCasesFromCSV } = await import('../utils/backup/importCases');
    const csv = 'Nombre,Telefono,Estado\nNuevo Caso,2222222222,Sin reporte';

    const result = await importCasesFromCSV(csv, { mode: 'replace' });

    expect(result.success).toBe(true);
    const all = await casesDB.cases.toArray();
    expect(all.length).toBe(1);
    expect(all[0].nombre).toBe('Nuevo Caso');
  });
});

describe('Cascada deleteCase', () => {
  beforeEach(async () => {
    await clearAll();
  });

  it('al eliminar caso, limpia referencias en notas', async () => {
    const caseId = 'cascade-test';
    await casesDB.cases.put({
      id: caseId,
      nombre: 'Test',
      telefono: '111',
      estado: 'Activo',
      version: 1,
      updatedAt: '2025-01-01T00:00:00.000Z',
    });

    const noteId = await appDB.notes.add({
      title: 'Nota vinculada',
      content: 'Test',
      relatedCaseIds: [caseId, 'other-case'],
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      version: 1,
    });

    await casesDB.case_history.put({
      caseId,
      timestamp: Date.now(),
      type: 'created',
      title: 'Test',
      description: 'Test',
    });

    const { default: useAppStore } = await import('../core/store/useAppStore');
    await useAppStore.getState().deleteCase(caseId);

    const remainingCases = await casesDB.cases.toArray();
    expect(remainingCases.length).toBe(0);

    const remainingHistory = await casesDB.case_history.toArray();
    expect(remainingHistory.length).toBe(0);

    const note = await appDB.notes.get(noteId);
    expect(note.relatedCaseIds).not.toContain(caseId);
    expect(note.relatedCaseIds).toContain('other-case');
  });
});
