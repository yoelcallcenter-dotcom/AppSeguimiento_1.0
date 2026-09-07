import { describe, it, expect, beforeEach } from 'vitest';
import casesDB from '../core/db/casesDB';
import appDB from '../core/db/appDB';
import { localStorageAdapter } from '../core/storage/localStorageAdapter';
import { exportBackup, importBackup, validateBackup, computeChecksum } from '../services/backupService';
import { importCasesFromCSV } from '../utils/backup/importCases';
import { migrateBackup, needsMigration } from '../utils/backup/backupMigrator';
import { escapeCSV, sanitizeCSV, parseReportesString, parseComentariosString, parseNotasVinculadas, parseAgendaVinculada, parseHistorialVinculada } from '../utils/backup/csvUtils';

async function clearAll() {
  await casesDB.cases.clear();
  await casesDB.case_history.clear();
  await appDB.notes.clear();
  await appDB.events.clear();
  await appDB.note_versions.clear();
  await appDB.auto_backups.clear();
  localStorage.clear();
}

describe('Edge cases: Backup corrupto', () => {
  beforeEach(async () => { await clearAll(); });

  it('validateBackup rechaza null', () => {
    expect(validateBackup(null).length).toBeGreaterThan(0);
  });

  it('validateBackup rechaza string', () => {
    expect(validateBackup('not an object').length).toBeGreaterThan(0);
  });

  it('validateBackup rechaza kind desconocido', () => {
    const errors = validateBackup({ kind: 'unknown', data: { db: {}, storage: {} } });
    expect(errors.some((e) => e.includes('backup'))).toBe(true);
  });

  it('validateBackup rechaza version futura', () => {
    const errors = validateBackup({
      kind: 'appseguimiento-backup',
      version: 999,
      data: { db: {}, storage: {} },
    });
    expect(errors.some((e) => e.includes('futura'))).toBe(true);
  });

  it('validateBackup acepta backup válido v3', () => {
    const errors = validateBackup({
      kind: 'appseguimiento-backup',
      version: 3,
      data: { db: {}, storage: {} },
    });
    expect(errors.length).toBe(0);
  });

  it('validateBackup acepta legacy kind', () => {
    const errors = validateBackup({
      kind: 'seguimiento-art-backup',
      version: 1,
      data: { db: {}, storage: {} },
    });
    expect(errors.length).toBe(0);
  });
});

describe('Edge cases: Checksum', () => {
  it('checksum es determinista', async () => {
    const payload = { db: { cases: [] }, storage: {} };
    const c1 = await computeChecksum(payload);
    const c2 = await computeChecksum(payload);
    expect(c1).toBe(c2);
  });

  it('checksum detecta cambio mínimo', async () => {
    const p1 = { db: { cases: [{ id: '1' }] }, storage: {} };
    const p2 = { db: { cases: [{ id: '2' }] }, storage: {} };
    const c1 = await computeChecksum(p1);
    const c2 = await computeChecksum(p2);
    expect(c1).not.toBe(c2);
  });
});

describe('Edge cases: Migración', () => {
  it('backup v2 sin auto_backups se migra correctamente', () => {
    const backup = {
      kind: 'appseguimiento-backup',
      version: 2,
      data: { db: { cases: [] }, storage: {} },
    };
    const { migrated, applied } = migrateBackup(backup);
    expect(migrated.version).toBe(3);
    expect(migrated.data.db.auto_backups).toEqual([]);
    expect(applied.length).toBe(1);
  });

  it('backup v3 no necesita migración', () => {
    const backup = { kind: 'appseguimiento-backup', version: 3, data: { db: {}, storage: {} } };
    expect(needsMigration(backup)).toBe(false);
  });

  it('migración es idempotente', () => {
    const backup = { kind: 'seguimiento-art-backup', data: { db: {}, storage: {} } };
    const { migrated: m1 } = migrateBackup(backup);
    const { migrated: m2 } = migrateBackup(m1);
    expect(m1.version).toBe(m2.version);
  });
});

describe('Edge cases: CSV injection', () => {
  it('neutraliza fórmulas Excel', () => {
    expect(sanitizeCSV('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
    expect(sanitizeCSV('+cmd|\'/C calc\'')).toBe("'+cmd|'/C calc'");
    expect(sanitizeCSV('-1+1')).toBe("'-1+1");
    expect(sanitizeCSV('@SUM(1)')).toBe("'@SUM(1)");
  });

  it('no modifica valores seguros', () => {
    expect(sanitizeCSV('Texto normal')).toBe('Texto normal');
    expect(sanitizeCSV('123')).toBe('123');
    expect(sanitizeCSV('')).toBe('');
  });

  it('escapeCSV maneja comas y comillas', () => {
    expect(escapeCSV('a,b')).toBe('"a,b"');
    expect(escapeCSV('a"b')).toBe('"a""b"');
    expect(escapeCSV('a\nb')).toBe('"a\nb"');
    expect(escapeCSV('simple')).toBe('simple');
  });
});

describe('Edge cases: CSV parsers', () => {
  it('parseReportesString con formato [origen]', () => {
    const result = parseReportesString('(2025-06-15) [Estudio Jurídico] Reporte de avance');
    expect(result.length).toBe(1);
    expect(result[0].origen).toBe('Estudio Jurídico');
    expect(result[0].fecha).toBe('2025-06-15');
    expect(result[0].texto).toBe('Reporte de avance');
  });

  it('parseReportesString sin origen', () => {
    const result = parseReportesString('(2025-06-15) Reporte simple');
    expect(result[0].origen).toBe('Operador');
  });

  it('parseNotasVinculadas formato correcto', () => {
    const result = parseNotasVinculadas('Titulo: Contenido (2025-06-15)');
    expect(result.length).toBe(1);
    expect(result[0].titulo).toBe('Titulo');
    expect(result[0].contenido).toBe('Contenido');
    expect(result[0].fecha).toBe('2025-06-15');
  });

  it('parseAgendaVinculada formato correcto', () => {
    const result = parseAgendaVinculada('Cita medica (2025-06-20)');
    expect(result.length).toBe(1);
    expect(result[0].titulo).toBe('Cita medica');
    expect(result[0].fecha).toBe('2025-06-20');
  });

  it('parseHistorialVinculada formato pipe', () => {
    const result = parseHistorialVinculada('2025-06-15|created|Caso creado|Test');
    expect(result.length).toBe(1);
    expect(result[0].type).toBe('created');
    expect(result[0].title).toBe('Caso creado');
  });
});

describe('Edge cases: Import CSV', () => {
  beforeEach(async () => { await clearAll(); });

  it('ignora filas vacías', async () => {
    const csv = 'Nombre,Telefono\n\n\n';
    const result = await importCasesFromCSV(csv);
    expect(result.success).toBe(false);
  });

  it('ignora filas sin nombre ni teléfono', async () => {
    const csv = 'Nombre,Telefono,Localidad\n,,""';
    const result = await importCasesFromCSV(csv);
    expect(result.success).toBe(false);
  });

  it('import en modo append preserva existentes', async () => {
    await casesDB.cases.put({
      id: 'old',
      nombre: 'Viejo',
      telefono: '111',
      estado: 'Activo',
      version: 1,
      updatedAt: '2025-01-01T00:00:00.000Z',
    });
    const csv = 'Nombre,Telefono\nNuevo,222';
    const result = await importCasesFromCSV(csv, { mode: 'append' });
    expect(result.success).toBe(true);
    const all = await casesDB.cases.toArray();
    expect(all.length).toBe(2);
  });

  it('import en modo replace elimina existentes', async () => {
    await casesDB.cases.put({
      id: 'old',
      nombre: 'Viejo',
      telefono: '111',
      estado: 'Activo',
      version: 1,
      updatedAt: '2025-01-01T00:00:00.000Z',
    });
    const csv = 'Nombre,Telefono\nNuevo,222';
    const result = await importCasesFromCSV(csv, { mode: 'replace' });
    expect(result.success).toBe(true);
    const all = await casesDB.cases.toArray();
    expect(all.length).toBe(1);
    expect(all[0].nombre).toBe('Nuevo');
  });

  it('neutraliza HTML en import', async () => {
    const csv = 'Nombre,Telefono\n<script>alert(1)</script>Test,222';
    const result = await importCasesFromCSV(csv);
    expect(result.success).toBe(true);
    const caso = (await casesDB.cases.toArray())[0];
    expect(caso.nombre).not.toContain('<script>');
  });

  it('deduplica por ID', async () => {
    const csv = 'ID,Nombre,Telefono\ndup1,Juan,111\ndup1,Pedro,222';
    const result = await importCasesFromCSV(csv);
    expect(result.success).toBe(true);
    const all = await casesDB.cases.toArray();
    expect(all.length).toBe(1);
  });
});

describe('Edge cases: Restore parcial', () => {
  beforeEach(async () => { await clearAll(); });

  it('restore sin sección de notas preserva notas actuales', async () => {
    await appDB.notes.add({
      title: 'Nota existente',
      content: 'Test',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      version: 1,
    });

    const backup = {
      kind: 'appseguimiento-backup',
      version: 3,
      timestamp: new Date().toISOString(),
      data: {
        db: { cases: [], case_history: [], events: [], note_versions: [], auto_backups: [] },
        storage: {},
      },
    };
    backup.checksum = await computeChecksum(backup.data);

    await importBackup(backup, { notas: false, permitirVaciar: true });

    const notes = await appDB.notes.toArray();
    expect(notes.length).toBe(1);
    expect(notes[0].title).toBe('Nota existente');
  });

  it('restore con 0 casos bloquea si hay existentes', async () => {
    await casesDB.cases.put({
      id: 'existing',
      nombre: 'Test',
      telefono: '111',
      estado: 'Activo',
      version: 1,
      updatedAt: '2025-01-01T00:00:00.000Z',
    });

    const backup = {
      kind: 'appseguimiento-backup',
      version: 3,
      timestamp: new Date().toISOString(),
      data: {
        db: { cases: [], case_history: [], notes: [], events: [], note_versions: [], auto_backups: [] },
        storage: {},
      },
    };
    backup.checksum = await computeChecksum(backup.data);

    await expect(importBackup(backup)).rejects.toThrow(/bloqueada/);
  });
});
