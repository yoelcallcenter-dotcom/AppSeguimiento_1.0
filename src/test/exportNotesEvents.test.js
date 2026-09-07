import { describe, it, expect, beforeEach } from 'vitest';
import casesDB from '../core/db/casesDB';
import appDB from '../core/db/appDB';
import { exportNotesToCSV, NOTES_CSV_HEADERS } from '../utils/backup/exportNotes';
import { exportEventsToCSV, EVENTS_CSV_HEADERS } from '../utils/backup/exportEvents';

async function clearAll() {
  await casesDB.cases.clear();
  await casesDB.case_history.clear();
  await appDB.notes.clear();
  await appDB.events.clear();
  await appDB.note_versions.clear();
  await appDB.auto_backups.clear();
}

describe('exportNotesToCSV', () => {
  beforeEach(async () => { await clearAll(); });

  it('lanza error si no hay notas', async () => {
    await expect(exportNotesToCSV()).rejects.toThrow('No hay notas para exportar');
  });

  it('genera CSV con headers correctos', async () => {
    await appDB.notes.add({
      title: 'Nota 1',
      content: 'Contenido',
      tags: ['tag1', 'tag2'],
      relatedCaseIds: ['c1'],
      createdAt: '2025-06-15T10:00:00.000Z',
      updatedAt: '2025-06-15T12:00:00.000Z',
    });

    const csv = await exportNotesToCSV();
    const lines = csv.split('\n');
    expect(lines[0]).toBe(NOTES_CSV_HEADERS.join(','));
    expect(lines.length).toBe(2);
  });

  it('exporta campos de nota correctamente', async () => {
    await appDB.notes.add({
      title: 'Mi Nota',
      content: 'Detalle importante',
      tags: ['urgente', 'seguimiento'],
      relatedCaseIds: ['caso1', 'caso2'],
      createdAt: '2025-06-15T10:00:00.000Z',
      updatedAt: '2025-06-15T12:00:00.000Z',
    });

    const csv = await exportNotesToCSV();
    const lines = csv.split('\n');
    const row = lines[1];
    expect(row).toContain('Mi Nota');
    expect(row).toContain('Detalle importante');
    expect(row).toContain('urgente; seguimiento');
    expect(row).toContain('caso1; caso2');
  });

  it('neutraliza CSV injection en contenido', async () => {
    await appDB.notes.add({
      title: '=SUM(A1)',
      content: '+cmd|calc',
      tags: [],
      createdAt: '2025-06-15T10:00:00.000Z',
      updatedAt: '2025-06-15T10:00:00.000Z',
    });

    const csv = await exportNotesToCSV();
    expect(csv).toContain("'=SUM(A1)");
    expect(csv).toContain("'+cmd|calc");
  });

  it('maneja notas sin campos opcionales', async () => {
    await appDB.notes.add({
      title: 'Basica',
      content: '',
      createdAt: '2025-06-15T10:00:00.000Z',
      updatedAt: '2025-06-15T10:00:00.000Z',
    });

    const csv = await exportNotesToCSV();
    const lines = csv.split('\n');
    expect(lines.length).toBe(2);
    expect(lines[1]).toContain('Basica');
  });

  it('exporta múltiples notas', async () => {
    for (let i = 0; i < 5; i++) {
      await appDB.notes.add({
        title: `Nota ${i}`,
        content: `Contenido ${i}`,
        tags: [],
        createdAt: `2025-06-1${i}T10:00:00.000Z`,
        updatedAt: `2025-06-1${i}T10:00:00.000Z`,
      });
    }

    const csv = await exportNotesToCSV();
    const lines = csv.split('\n');
    expect(lines.length).toBe(6);
  });

  it('acepta array de notas como parámetro', async () => {
    const mockNotes = [
      { id: 1, title: 'Mock', content: 'Test', tags: ['a'], relatedCaseIds: [], createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    ];
    const csv = await exportNotesToCSV(mockNotes);
    expect(csv).toContain('Mock');
  });

  it('escapeCSV maneja comas en contenido', async () => {
    await appDB.notes.add({
      title: 'Con coma',
      content: 'detalle, con coma',
      tags: [],
      createdAt: '2025-06-15T10:00:00.000Z',
      updatedAt: '2025-06-15T10:00:00.000Z',
    });

    const csv = await exportNotesToCSV();
    expect(csv).toContain('"detalle, con coma"');
  });
});

describe('exportEventsToCSV', () => {
  beforeEach(async () => { await clearAll(); });

  it('lanza error si no hay eventos', async () => {
    await expect(exportEventsToCSV()).rejects.toThrow('No hay eventos para exportar');
  });

  it('genera CSV con headers correctos', async () => {
    await appDB.events.add({
      title: 'Reunion',
      startDate: '2025-06-20',
      status: 'pendiente',
      priority: 'alta',
      relatedCaseIds: ['c1'],
      createdAt: '2025-06-15T10:00:00.000Z',
    });

    const csv = await exportEventsToCSV();
    const lines = csv.split('\n');
    expect(lines[0]).toBe(EVENTS_CSV_HEADERS.join(','));
    expect(lines.length).toBe(2);
  });

  it('exporta campos de evento correctamente', async () => {
    await appDB.events.add({
      title: 'Cita medica',
      startDate: '2025-06-20',
      endDate: '2025-06-20',
      status: 'confirmado',
      priority: 'media',
      description: 'Consulta general',
      relatedCaseIds: ['caso1'],
      relatedNoteId: 'nota1',
      createdAt: '2025-06-15T10:00:00.000Z',
    });

    const csv = await exportEventsToCSV();
    expect(csv).toContain('Cita medica');
    expect(csv).toContain('2025-06-20');
    expect(csv).toContain('confirmado');
    expect(csv).toContain('Consulta general');
    expect(csv).toContain('caso1');
  });

  it('neutraliza CSV injection en titulo', async () => {
    await appDB.events.add({
      title: '=CMD',
      startDate: '2025-06-20',
      createdAt: '2025-06-15T10:00:00.000Z',
    });

    const csv = await exportEventsToCSV();
    expect(csv).toContain("'=CMD");
  });

  it('maneja eventos sin campos opcionales', async () => {
    await appDB.events.add({
      title: 'Basico',
      createdAt: '2025-06-15T10:00:00.000Z',
    });

    const csv = await exportEventsToCSV();
    const lines = csv.split('\n');
    expect(lines.length).toBe(2);
  });

  it('exporta múltiples eventos', async () => {
    for (let i = 0; i < 3; i++) {
      await appDB.events.add({
        title: `Evento ${i}`,
        startDate: `2025-06-${20 + i}`,
        status: 'pendiente',
        createdAt: '2025-06-15T10:00:00.000Z',
      });
    }

    const csv = await exportEventsToCSV();
    const lines = csv.split('\n');
    expect(lines.length).toBe(4);
  });

  it('acepta array de eventos como parámetro', async () => {
    const mockEvents = [
      { id: 1, title: 'Mock Event', startDate: '2025-01-01', status: 'ok', createdAt: '2025-01-01' },
    ];
    const csv = await exportEventsToCSV(mockEvents);
    expect(csv).toContain('Mock Event');
  });
});
