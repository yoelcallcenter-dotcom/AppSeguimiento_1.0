/**
 * calendarStore.test.js — 1.10.1
 *
 * Regresiones E02 y E03 del Release 1.10.1:
 *  - E02: getEventsByMonth usaba un límite lexicográfico "YYYY-MM-31" que
 *    excluía eventos CON HORA del último día del mes ("…-31T09:30" > "…-31").
 *  - E03 (integración): el rango local [01..último día T23:59:59.999] construido
 *    por monthRangeLocal debe incluir eventos con hora del primer y último día
 *    vía getEventsByDateRange (comparación lexicográfica sobre startDate).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import appDB from '../../core/db/appDB';
import { getEventsByMonth, getEventsByDateRange, completarCitasDeCaso } from './calendarStore';
import { monthRangeLocal, visibleRangeLocal } from './CalendarView';

async function clearEvents() {
  await appDB.events.clear();
}

async function addEvent(startDate, extra = {}) {
  return appDB.events.add({
    title: 'Evento test',
    startDate,
    endDate: startDate,
    status: 'pending',
    priority: 'medium',
    relatedCaseIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    ...extra,
  });
}

beforeEach(async () => { await clearEvents(); });

describe('getEventsByMonth (E02 — 1.10.1)', () => {
  it('incluye un evento CON HORA del último día del mes', async () => {
    // Octubre 2026 tiene 31 días. "2026-10-31T09:30:00" era excluido por el
    // bug lexicográfico (upper bound "2026-10-31" sin hora).
    await addEvent('2026-10-31T09:30:00');
    const result = await getEventsByMonth(2026, 9);
    expect(result).toHaveLength(1);
    expect(result[0].startDate).toBe('2026-10-31T09:30:00');
  });

  it('incluye un evento CON HORA del primer día del mes', async () => {
    await addEvent('2026-10-01T18:00:00');
    const result = await getEventsByMonth(2026, 9);
    expect(result).toHaveLength(1);
  });

  it('incluye eventos all-day (sin hora) del primer y último día', async () => {
    await addEvent('2026-10-01');
    await addEvent('2026-10-31');
    const result = await getEventsByMonth(2026, 9);
    expect(result).toHaveLength(2);
  });

  it('EXCLUYE eventos del mes siguiente (all-day y con hora)', async () => {
    await addEvent('2026-11-01');
    await addEvent('2026-11-01T10:00:00');
    const result = await getEventsByMonth(2026, 9);
    expect(result).toHaveLength(0);
  });

  it('EXCLUYE eventos del mes anterior', async () => {
    await addEvent('2026-09-30T23:59:59');
    await addEvent('2026-09-30');
    const result = await getEventsByMonth(2026, 9);
    expect(result).toHaveLength(0);
  });

  it('mes de febrero (año bisiesto): incluye 29 con hora, excluye 1 de marzo', async () => {
    await addEvent('2028-02-29T12:00:00'); // 2028 es bisiesto
    await addEvent('2028-03-01T00:00:00');
    const result = await getEventsByMonth(2028, 1);
    expect(result).toHaveLength(1);
    expect(result[0].startDate).toBe('2028-02-29T12:00:00');
  });
});

describe('getEventsByDateRange con monthRangeLocal (E03 — 1.10.1)', () => {
  it('el rango incluye eventos del primer y último día CON hora', async () => {
    // Antes: end = toISOString() del último día 00:00 local → en UTC-3 quedaba
    // "…T03:00Z" y excluía "…-31T18:00". monthRangeLocal usa fin de día local.
    const { start, end } = monthRangeLocal(2026, 9);
    expect(start).toBe('2026-10-01');
    expect(end).toBe('2026-10-31T23:59:59.999');

    await addEvent('2026-10-01T08:15:00');
    await addEvent('2026-10-31T18:45:00');
    await addEvent('2026-11-01T00:00:00'); // fuera de rango
    await addEvent('2026-09-30T23:00:00'); // fuera de rango

    const result = await getEventsByDateRange(start, end);
    expect(result).toHaveLength(2);
    const fechas = result.map((e) => e.startDate).sort();
    expect(fechas).toEqual(['2026-10-01T08:15:00', '2026-10-31T18:45:00']);
  });

  it('mes cruzado (julio, 31 días): extremos incluidos', async () => {
    const { start, end } = monthRangeLocal(2026, 6);
    expect(start).toBe('2026-07-01');
    expect(end).toBe('2026-07-31T23:59:59.999');

    await addEvent('2026-07-01T00:00:00');
    await addEvent('2026-07-31T23:59:00');
    const result = await getEventsByDateRange(start, end);
    expect(result).toHaveLength(2);
  });
});

describe('getEventsByDateRange con visibleRangeLocal (E03 — 1.10.1)', () => {
  it('semana que CRUZA de mes: incluye eventos de ambos meses', async () => {
    // Vista semanal del 2026-10-01 (jueves): el rango real visible es
    // 2026-09-27 .. 2026-10-03. Antes el rango era el mes de currentDate
    // (octubre) y los días de septiembre quedaban SIN CARGAR.
    const { start, end } = visibleRangeLocal(new Date(2026, 9, 1), 'week');
    expect(start).toBe('2026-09-27');
    expect(end).toBe('2026-10-03T23:59:59.999');

    await addEvent('2026-09-28T10:00:00'); // lunes de esa semana (septiembre)
    await addEvent('2026-10-01T09:00:00'); // jueves
    await addEvent('2026-10-03T18:00:00'); // sábado (último día, con hora)
    await addEvent('2026-09-26T10:00:00'); // sábado anterior: fuera
    await addEvent('2026-10-04T10:00:00'); // domingo siguiente: fuera

    const result = await getEventsByDateRange(start, end);
    expect(result).toHaveLength(3);
    const fechas = result.map((e) => e.startDate).sort();
    expect(fechas).toEqual(['2026-09-28T10:00:00', '2026-10-01T09:00:00', '2026-10-03T18:00:00']);
  });

  it('día: incluye el último día con hora y all-day, excluye el día siguiente', async () => {
    const { start, end } = visibleRangeLocal(new Date(2026, 9, 31), 'day');
    expect(start).toBe('2026-10-31');
    expect(end).toBe('2026-10-31T23:59:59.999');

    await addEvent('2026-10-31T23:59:00');
    await addEvent('2026-10-31'); // all-day
    await addEvent('2026-11-01T00:00:00'); // fuera

    const result = await getEventsByDateRange(start, end);
    expect(result).toHaveLength(2);
  });
});

describe('completarCitasDeCaso (1.10.1 — reporte completa el evento de cita)', () => {
  it('completa el evento automático pendiente (tag regla-cita) del caso', async () => {
    await addEvent('2026-10-10T09:00:00', {
      relatedCaseIds: ['c1'],
      tags: ['regla-cita'],
      status: 'pending',
    });
    const n = await completarCitasDeCaso('c1');
    expect(n).toBe(1);
    const [ev] = await appDB.events.toArray();
    expect(ev.status).toBe('completed');
  });

  it('también completa eventos "confirmed"', async () => {
    await addEvent('2026-10-10T09:00:00', {
      relatedCaseIds: ['c1'],
      tags: ['regla-cita'],
      status: 'confirmed',
    });
    expect(await completarCitasDeCaso('c1')).toBe(1);
    const [ev] = await appDB.events.toArray();
    expect(ev.status).toBe('completed');
  });

  it('NO toca eventos sin el tag (manuales) ni de otros sistemas', async () => {
    await addEvent('2026-10-10T09:00:00', {
      relatedCaseIds: ['c1'],
      tags: [], // creado a mano
      status: 'pending',
    });
    await addEvent('2026-10-10T10:00:00', {
      relatedCaseIds: ['c1'],
      tags: [],
      eventType: 'cita', // sistema citaAutoEvents
      status: 'pending',
    });
    expect(await completarCitasDeCaso('c1')).toBe(0);
    const eventos = await appDB.events.toArray();
    expect(eventos.every((e) => e.status === 'pending')).toBe(true);
  });

  it('NO toca eventos de otros casos ni ya completados/cancelados (idempotente)', async () => {
    await addEvent('2026-10-10T09:00:00', {
      relatedCaseIds: ['otro'],
      tags: ['regla-cita'],
      status: 'pending',
    });
    await addEvent('2026-10-10T10:00:00', {
      relatedCaseIds: ['c1'],
      tags: ['regla-cita'],
      status: 'completed',
    });
    await addEvent('2026-10-10T11:00:00', {
      relatedCaseIds: ['c1'],
      tags: ['regla-cita'],
      status: 'cancelled',
    });
    expect(await completarCitasDeCaso('c1')).toBe(0);
    // Segunda llamada sobre un pendiente ya completado: no vuelve a tocar nada.
    await addEvent('2026-10-10T12:00:00', {
      relatedCaseIds: ['c1'],
      tags: ['regla-cita'],
      status: 'pending',
    });
    expect(await completarCitasDeCaso('c1')).toBe(1);
    expect(await completarCitasDeCaso('c1')).toBe(0);
  });

  it('tolera ids numéricos (comparación String) y caseId vacío', async () => {
    await addEvent('2026-10-10T09:00:00', {
      relatedCaseIds: [7],
      tags: ['regla-cita'],
      status: 'pending',
    });
    expect(await completarCitasDeCaso('7')).toBe(1);
    expect(await completarCitasDeCaso('')).toBe(0);
    expect(await completarCitasDeCaso(null)).toBe(0);
  });
});
