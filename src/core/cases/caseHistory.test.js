import { describe, it, expect, beforeEach } from 'vitest';
import casesDB from '../db/casesDB';
import {
  HISTORY_TYPES,
  computeCaseChanges,
  eventsFromChanges,
  recordCaseEvent,
  recordCaseChanges,
  getCaseHistory,
  deleteCaseHistory,
  resolveLastActivity,
  getInactivityInfo,
} from './caseHistory';
import { exportBackup, importBackup } from '../../services/backupService';

const casoBase = (overrides = {}) => ({
  id: 'c1',
  nombre: 'JUAN PEREZ',
  telefono: '261 555-0001',
  localidad: 'MENDOZA',
  aseguradora: 'GALENO',
  estudioJuridico: 'Estudio A',
  estado: 'Cita virtual',
  fecha: '2026-08-01',
  reporteHistory: [],
  comentarios: [],
  tags: [],
  ...overrides,
});

beforeEach(async () => {
  await casesDB.cases.clear();
  await casesDB.case_history.clear();
});

describe('computeCaseChanges', () => {
  it('no genera cambios si el caso es idéntico', () => {
    const prev = casoBase();
    const next = { ...prev };
    expect(computeCaseChanges(prev, next)).toEqual([]);
  });

  it('detecta cambio de estado con valor anterior y nuevo', () => {
    const cambios = computeCaseChanges(casoBase(), casoBase({ estado: 'Firmo' }));
    expect(cambios).toHaveLength(1);
    expect(cambios[0].type).toBe(HISTORY_TYPES.STATUS_CHANGED);
    expect(cambios[0].previousValue).toBe('Cita virtual');
    expect(cambios[0].newValue).toBe('Firmo');
  });

  it('detecta cambios de estudio y aseguradora por separado', () => {
    const cambios = computeCaseChanges(
      casoBase(),
      casoBase({ estudioJuridico: 'Estudio B', aseguradora: 'PROVINCIA' })
    );
    const tipos = cambios.map((c) => c.type);
    expect(tipos).toContain(HISTORY_TYPES.ESTUDIO_CHANGED);
    expect(tipos).toContain(HISTORY_TYPES.ASEGURADORA_CHANGED);
  });

  it('agrupa campos generales en un único evento CASE_UPDATED', () => {
    const cambios = computeCaseChanges(
      casoBase(),
      casoBase({ telefono: '261 555-9999', localidad: 'GODOY CRUZ' })
    );
    const generales = cambios.filter((c) => c.type === HISTORY_TYPES.CASE_UPDATED);
    expect(generales).toHaveLength(1);
    expect(generales[0].labels.sort()).toEqual(['Localidad', 'Teléfono']);
  });

  it('detecta firma registrada cuando se asigna fechaFirma', () => {
    const cambios = computeCaseChanges(
      casoBase({ estado: 'Firmo', fechaFirma: null }),
      casoBase({ estado: 'Firmo', fechaFirma: '2026-08-25' })
    );
    expect(cambios.map((c) => c.type)).toContain(HISTORY_TYPES.FIRMA_REGISTERED);
  });

  it('detecta reportes agregados manteniendo el prefijo', () => {
    const rep = { fecha: '25/08', texto: 'Se envió información', origen: 'Operador' };
    const cambios = computeCaseChanges(casoBase(), casoBase({ reporteHistory: [rep] }));
    expect(cambios).toHaveLength(1);
    expect(cambios[0].type).toBe(HISTORY_TYPES.REPORT_ADDED);
    expect(cambios[0].addedCount).toBe(1);
  });

  it('no detecta reporte si la lista no crece con el mismo prefijo', () => {
    const previo = casoBase({
      reporteHistory: [{ fecha: '25/08', texto: 'Original', origen: 'Operador' }],
    });
    const editado = casoBase({
      reporteHistory: [{ fecha: '25/08', texto: 'Editado distinto', origen: 'Operador' }],
    });
    expect(computeCaseChanges(previo, editado)).toHaveLength(0);
  });

  it('detecta comentarios nuevos por id como interacción manual', () => {
    const comentario = { id: 'x1', fecha: new Date().toISOString(), texto: 'Llamé al cliente', tipo: 'Llamada realizada' };
    const cambios = computeCaseChanges(casoBase(), casoBase({ comentarios: [comentario] }));
    expect(cambios).toHaveLength(1);
    expect(cambios[0].type).toBe(HISTORY_TYPES.MANUAL_INTERACTION);
    expect(cambios[0].interactionType).toBe('Llamada realizada');
  });

  it('devuelve CASE_CREATED cuando no hay caso previo', () => {
    const cambios = computeCaseChanges(null, casoBase());
    expect(cambios).toHaveLength(1);
    expect(cambios[0].type).toBe(HISTORY_TYPES.CASE_CREATED);
  });
});

describe('eventsFromChanges', () => {
  it('construye título y descripción comprensibles desde el tipo', () => {
    const eventos = eventsFromChanges('c1', [
      { type: HISTORY_TYPES.STATUS_CHANGED, field: 'estado', previousValue: 'En seguimiento', newValue: 'Derivado' },
    ], { timestamp: '2026-08-25T12:00:00.000Z' });
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({
      caseId: 'c1',
      type: 'status_changed',
      title: 'Estado actualizado',
    });
    expect(eventos[0].description).toContain('En seguimiento');
    expect(eventos[0].description).toContain('Derivado');
    expect(eventos[0].metadata.previousValue).toBe('En seguimiento');
    expect(eventos[0].metadata.newValue).toBe('Derivado');
  });

  it('todos los eventos de una misma acción comparten el timestamp', () => {
    const cambios = computeCaseChanges(
      casoBase(),
      casoBase({ estado: 'Pendiente', estudioJuridico: 'Estudio Z', aseguradora: 'SMG' })
    );
    const eventos = eventsFromChanges('c1', cambios, { timestamp: '2026-08-25T12:00:00.000Z' });
    expect(eventos.length).toBeGreaterThanOrEqual(3);
    expect(new Set(eventos.map((e) => e.timestamp))).toHaveProperty('size', 1);
  });
});

describe('persistencia del historial', () => {
  it('registra eventos, los ordena del más reciente al más antiguo y sobrevive a una relectura', async () => {
    await recordCaseEvent({
      caseId: 'c1',
      type: HISTORY_TYPES.CASE_CREATED,
      title: 'Caso creado',
      description: 'Alta',
      timestamp: '2026-08-20T10:00:00.000Z',
    });
    await recordCaseEvent({
      caseId: 'c1',
      type: HISTORY_TYPES.STATUS_CHANGED,
      title: 'Estado actualizado',
      description: 'El caso pasó de "A" a "B"',
      metadata: { previousValue: 'A', newValue: 'B' },
      timestamp: '2026-08-25T10:00:00.000Z',
    });

    const historial = await getCaseHistory('c1');
    expect(historial).toHaveLength(2);
    expect(historial[0].type).toBe(HISTORY_TYPES.STATUS_CHANGED);
    expect(historial[1].type).toBe(HISTORY_TYPES.CASE_CREATED);

    // Relectura (simula recarga): mismos datos, sin duplicados.
    const otraVez = await getCaseHistory('c1');
    expect(otraVez).toHaveLength(2);
  });

  it('no registra duplicados de una misma acción', async () => {
    const evento = {
      caseId: 'c1',
      type: HISTORY_TYPES.NOTE_ADDED,
      title: 'Nota agregada',
      description: 'Seguimiento inicial',
      timestamp: new Date().toISOString(),
    };
    await recordCaseEvent(evento);
    const registrado = await recordCaseEvent({ ...evento });
    expect(registrado).toBe(false);
    expect(await getCaseHistory('c1')).toHaveLength(1);
  });

  it('recordCaseChanges no registra nada si no hay cambios reales', async () => {
    const prev = casoBase();
    const registrados = await recordCaseChanges('c1', prev, { ...prev });
    expect(registrados).toBe(0);
    expect(await getCaseHistory('c1')).toHaveLength(0);
  });

  it('recordCaseChanges registra la creación y luego la edición', async () => {
    await recordCaseChanges('c1', null, casoBase());
    await recordCaseChanges('c1', casoBase(), casoBase({ estado: 'Pendiente' }));
    const historial = await getCaseHistory('c1');
    expect(historial.map((e) => e.title)).toEqual(['Estado actualizado', 'Caso creado']);
  });

  it('deleteCaseHistory elimina los eventos del caso', async () => {
    await recordCaseChanges('c1', null, casoBase());
    await deleteCaseHistory('c1');
    expect(await getCaseHistory('c1')).toHaveLength(0);
  });

  it('el historial queda asociado solo al caseId correspondiente', async () => {
    await recordCaseChanges('c1', null, casoBase());
    await recordCaseChanges('c2', null, casoBase({ id: 'c2', nombre: 'OTRO' }));
    expect(await getCaseHistory('c1')).toHaveLength(1);
    expect(await getCaseHistory('c2')).toHaveLength(1);
  });
});

describe('última actividad e inactividad', () => {
  it('resolveLastActivity usa lastActivityAt con fallback a updatedAt/createdAt', () => {
    expect(resolveLastActivity({ lastActivityAt: '2026-08-25T10:00:00Z', updatedAt: '2026-08-01T10:00:00Z' })).toBe('2026-08-25T10:00:00Z');
    expect(resolveLastActivity({ updatedAt: '2026-08-01T10:00:00Z' })).toBe('2026-08-01T10:00:00Z');
    expect(resolveLastActivity({ createdAt: '2026-07-01T10:00:00Z' })).toBe('2026-07-01T10:00:00Z');
    expect(resolveLastActivity(null)).toBeNull();
  });

  it('marca como inactivo un caso activo sin actividad reciente', () => {
    const ahora = new Date('2026-08-25T12:00:00Z');
    const info = getInactivityInfo(
      { estado: 'Cita virtual', lastActivityAt: '2026-08-18T12:00:00Z' },
      { thresholdDays: 5, now: ahora }
    );
    expect(info.inactive).toBe(true);
    expect(info.days).toBe(7);
  });

  it('ignora estados cerrados y casos dentro del umbral', () => {
    const ahora = new Date('2026-08-25T12:00:00Z');
    expect(
      getInactivityInfo({ estado: 'Firmo', lastActivityAt: '2026-07-01T12:00:00Z' }, { now: ahora }).inactive
    ).toBe(false);
    expect(
      getInactivityInfo({ estado: 'Cita virtual', lastActivityAt: '2026-08-24T12:00:00Z' }, { now: ahora }).inactive
    ).toBe(false);
  });

  it('los casos anteriores a 1.3.1 usan updatedAt como actividad (sin inventar fechas)', () => {
    const info = getInactivityInfo(
      { estado: 'Pendiente', updatedAt: '2026-08-01T12:00:00Z' },
      { thresholdDays: 5, now: new Date('2026-08-25T12:00:00Z') }
    );
    expect(info.inactive).toBe(true);
    expect(info.lastActivity).toBe('2026-08-01T12:00:00Z');
  });
});

describe('integración con backups', () => {
  it('un backup nuevo conserva y restaura el historial', async () => {
    await casesDB.cases.put(casoBase());
    await recordCaseChanges('c1', null, casoBase());

    const backup = await exportBackup();
    expect(Array.isArray(backup.data.db.case_history)).toBe(true);
    expect(backup.data.db.case_history).toHaveLength(1);

    await casesDB.cases.clear();
    await casesDB.case_history.clear();

    const result = await importBackup(backup);
    expect(result.counts.case_history).toBe(1);
    expect(await getCaseHistory('c1')).toHaveLength(1);
  });

  it('un backup antiguo sin historial se restaura con default seguro (sin inventar eventos)', async () => {
    await casesDB.cases.put(casoBase());
    await recordCaseChanges('c1', null, casoBase());

    const backup = await exportBackup();
    delete backup.data.db.case_history;
    // Recalcula checksum para simular un backup legacy válido sin la tabla.
    backup.checksum = await import('../../services/backupService').then((m) =>
      m.computeChecksum(backup.data)
    );

    await casesDB.case_history.clear();

    const result = await importBackup(backup);
    expect(result.counts.cases).toBe(1);
    expect(result.counts.case_history).toBe(0);
    expect(await getCaseHistory('c1')).toHaveLength(0);
  });
});
