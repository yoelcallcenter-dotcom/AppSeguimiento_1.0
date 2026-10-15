/**
 * calendarViewDrop.test.js — 1.10.1
 *
 * Regresión E01 (CRÍTICO): el drop en vista día construía
 * newDateStr="YYYY-MM-DDTHH:MM:00" y newStartDate hacía
 * oldIso.replace(oldDate, newDateStr) → ISO con DOBLE "T"
 * ("…T14:00:00T09:30:00.000Z") → new Date() inválido → "NaN/NaN" en el campo
 * cita → syncCitaEvent BORRABA el evento de cita del caso.
 *
 * Cubre:
 *  - newStartDate (reescrito): reemplaza fecha y hora preservando el sufijo.
 *  - buildCitaFromDrop: cita válida SIN new Date() roto; null si inválida.
 *  - Flujo end-to-end: drop de CITA → syncCitaEvent ACTUALIZA (no borra).
 *  - Eventos all-day (sin "T") no se corrompen.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import appDB from '../../core/db/appDB';
import casesDB from '../../core/db/casesDB';
import {
  newStartDate,
  buildCitaFromDrop,
  monthRangeLocal,
  visibleRangeLocal,
  withPreservedDuration,
  resolveCitaFromDrop,
} from './CalendarView';
import { syncCitaEvent } from '../../core/cases/citaAutoEvents';
import { parseCita } from '../../utils/citaParser';

beforeEach(async () => {
  await appDB.events.clear();
  await casesDB.cases.clear();
  await casesDB.case_history.clear();
});

describe('newStartDate (E01 — 1.10.1)', () => {
  it('vista día sobre evento con hora: sin DOBLE T y hora correcta', () => {
    const result = newStartDate('2026-10-15T09:30:00.000Z', '2026-10-20T14:00:00');
    expect(result).toBe('2026-10-20T14:00:00.000Z');
    expect(result).not.toContain('T14:00:00T'); // el bug producía doble T
    expect(isNaN(new Date(result).getTime())).toBe(false);
  });

  it('vista día sobre formato del repo (sin Z): "YYYY-MM-DDTHH:MM:00"', () => {
    // Eventos creados por EventModal: `${date}T${time}:00` (sin Z).
    const result = newStartDate('2026-10-15T09:30:00', '2026-10-20T14:00:00');
    expect(result).toBe('2026-10-20T14:00:00');
    expect(isNaN(new Date(result).getTime())).toBe(false);
  });

  it('vista día sobre evento con hora parcial "HH:MM": conserva el destino', () => {
    const result = newStartDate('2026-10-15T09:30', '2026-10-20T14:00:00');
    expect(result).toBe('2026-10-20T14:00');
    expect(isNaN(new Date(result).getTime())).toBe(false);
  });

  it('mes/semana sobre evento con hora: conserva hora y sufijo', () => {
    const result = newStartDate('2026-10-15T09:30:00.000Z', '2026-10-20');
    expect(result).toBe('2026-10-20T09:30:00.000Z');
  });

  it('all-day sobre all-day: solo cambia la fecha (sin "T" inventado)', () => {
    const result = newStartDate('2026-10-15', '2026-10-20');
    expect(result).toBe('2026-10-20');
    expect(result).not.toContain('T');
  });

  it('destino con hora sobre evento all-day: agrega "T…:00" válido', () => {
    const result = newStartDate('2026-10-15', '2026-10-20T14:00:00');
    expect(result).toBe('2026-10-20T14:00:00');
    expect(isNaN(new Date(result).getTime())).toBe(false);
  });

  it('entrada inválida: devuelve el oldIso original (nunca un ISO corrupto)', () => {
    expect(newStartDate('2026-10-15T09:30:00', 'basura')).toBe('2026-10-15T09:30:00');
    expect(newStartDate('', 'basura')).toBe('');
  });

  it('sin oldIso (vacío o basura): usa la fecha destino válida, jamás un string corrupto', () => {
    // 1.10.1: si el oldIso está vacío, devolver '' escribiría startDate='' en el
    // store y el evento quedaría invisible/irrecuperable en el calendario. En
    // cambio la fecha destino es un ISO válido y siempre es utilizable.
    expect(newStartDate('', '2026-10-20')).toBe('2026-10-20');
    expect(isNaN(new Date(newStartDate('', '2026-10-20')).getTime())).toBe(false);
    expect(newStartDate('garbage', '2026-10-20T14:00:00')).toBe('2026-10-20T14:00:00');
  });
});

describe('buildCitaFromDrop (E01 — 1.10.1)', () => {
  it('construye la cita en formato canónico del repo', () => {
    const cita = buildCitaFromDrop('2026-10-20T14:00:00', '2026-10-20T15:00:00');
    expect(cita).toBe('20/10 - (14:00 a 15:00)');
    expect(parseCita(cita)).not.toBeNull(); // debe pasar el parser del repo
  });

  it('fin <= inicio → null (misma regla que parseCita: si no, syncCitaEvent borraría)', () => {
    // Vista día sin preservar duración daría "(14:00 a 14:00)" → cita inválida.
    expect(buildCitaFromDrop('2026-10-20T14:00:00', null)).toBeNull();
    expect(buildCitaFromDrop('2026-10-20T14:00:00', '2026-10-20T13:00:00')).toBeNull();
  });

  it('ISO corrupto (doble T) → null (NO se toca el caso ni syncCitaEvent)', () => {
    const corrupto = '2026-10-20T14:00:00T09:30:00.000Z'; // salida del bug E01
    expect(buildCitaFromDrop(corrupto, corrupto)).toBeNull();
  });

  it('fecha inválida (NaN) → null', () => {
    expect(buildCitaFromDrop('NaN/NaN - (a b)', null)).toBeNull();
  });
});

describe('withPreservedDuration (E01 — 1.10.1)', () => {
  it('conserva la duración original del evento al moverlo de hora', () => {
    // 09:30→10:30 (1 h) movido a las 14:00 ⇒ 14:00→15:00.
    const end = withPreservedDuration('2026-10-20T14:00:00', '2026-10-15T09:30:00', '2026-10-15T10:30:00');
    expect(end).toBe('2026-10-20T15:00:00');
  });

  it('duración que cruza medianoche cambia de día correctamente', () => {
    // 23:00→01:30 (2.5 h) movido a 22:00 ⇒ 22:00→00:30 del día siguiente.
    const end = withPreservedDuration('2026-10-20T22:00:00', '2026-10-15T23:00:00', '2026-10-16T01:30:00');
    expect(end).toBe('2026-10-21T00:30:00');
  });

  it('sin duración utilizable usa 1 hora por defecto', () => {
    const end = withPreservedDuration('2026-10-20T14:00:00', '2026-10-15T09:00:00', null);
    expect(end).toBe('2026-10-20T15:00:00');
  });
});

describe('drop de CITA end-to-end: syncCitaEvent NO borra (E01 — 1.10.1)', () => {
  const caso = {
    id: 'c1',
    nombre: 'JUAN PEREZ',
    estado: 'Cita virtual',
    fecha: '2026-01-01',
    cita: '15/10 - (09:30 a 10:30)',
  };

  it('reprogramar con hora (vista día) actualiza el evento sin borrarlo', async () => {
    await casesDB.cases.add({ ...caso });
    // Crear el evento de cita automático inicial.
    const created = await syncCitaEvent({ ...caso }, {});
    expect(created.action).toBe('created');

    // --- Simulación del drop en vista día (lo que hace handleEventDrop) ---
    const evento = await appDB.events.toArray();
    const citaEvt = evento.find((e) => e.eventType === 'cita');
    const newStart = newStartDate(citaEvt.startDate, '2026-10-20T14:00:00');
    // Vista día: destino con hora para inicio Y fin ⇒ mismo slot (14:00 y 14:00).
    const newEnd = newStartDate(citaEvt.endDate, '2026-10-20T14:00:00');
    const nuevaCita = resolveCitaFromDrop(newStart, newEnd, citaEvt);
    // ---
    expect(newStart).toBe('2026-10-20T14:00:00');
    expect(newEnd).toBe(newStart); // inicio = fin: sin duración preservada sería inválida
    expect(nuevaCita).toBe('20/10 - (14:00 a 15:00)');

    const casoActualizado = { ...caso, cita: nuevaCita };
    const result = await syncCitaEvent(casoActualizado, {});

    // Antes del fix: cita "NaN/NaN - (…)" → parseCita null → acción 'deleted'.
    expect(result.action).toBe('updated');
    const restantes = await appDB.events.toArray();
    expect(restantes).toHaveLength(1); // el evento NO fue borrado
    expect(restantes[0].startDate).toBe('2026-10-20T14:00:00');
    expect(restantes[0].endDate).toBe('2026-10-20T15:00:00');
  });

  it('referencia: una cita inválida SÍ haría borrar el evento (por eso se valida)', async () => {
    await casesDB.cases.add({ ...caso });
    await syncCitaEvent({ ...caso }, {});
    // Si la cita quedara corrupta (camino antiguo), syncCitaEvent la elimina:
    const result = await syncCitaEvent({ ...caso, cita: 'NaN/NaN - (a a)' }, {});
    expect(result.action).toBe('deleted');
    expect(await appDB.events.toArray()).toHaveLength(0);
  });
});

describe('monthRangeLocal (E03 — 1.10.1)', () => {
  it('usa strings locales: fin de mes = último día T23:59:59.999', () => {
    expect(monthRangeLocal(2026, 9)).toEqual({
      start: '2026-10-01',
      end: '2026-10-31T23:59:59.999',
    });
  });

  it('cierre lexicográfico correcto en extremos', () => {
    const { start, end } = monthRangeLocal(2026, 1); // febrero 2026 (28 días)
    expect('2026-02-28T23:59:59' <= end).toBe(true);
    expect('2026-02-28T23:59:59' > start).toBe(true);
    expect('2026-03-01' <= end).toBe(false); // primer día del mes siguiente fuera
    expect('2026-01-31T23:59:59' >= start).toBe(false);
  });
});

describe('resolveCitaFromDrop — rama CITA de handleEventDrop (E01 — 1.10.1)', () => {
  const evento = { startDate: '2026-10-15T09:30:00', endDate: '2026-10-15T10:30:00' };

  it('vista DÍA (inicio = fin en el mismo slot): conserva la duración original', () => {
    // REGRESIÓN: una versión intermedia del fix metía withPreservedDuration en
    // la variable de INICIO ⇒ inicio === fin ⇒ buildCitaFromDrop → null ⇒ el
    // drop de CITAS quedaba siempre con "fecha inválida".
    const newStart = newStartDate(evento.startDate, '2026-10-20T14:00:00');
    const newEnd = newStartDate(evento.endDate, '2026-10-20T14:00:00');
    expect(newStart).toBe(newEnd);
    expect(resolveCitaFromDrop(newStart, newEnd, evento)).toBe('20/10 - (14:00 a 15:00)');
  });

  it('vista MES/SEMANA: usa newEnd y conserva la hora original del fin', () => {
    const newStart = newStartDate(evento.startDate, '2026-10-20');
    const newEnd = newStartDate(evento.endDate, '2026-10-20');
    expect(resolveCitaFromDrop(newStart, newEnd, evento)).toBe('20/10 - (09:30 a 10:30)');
  });

  it('sin endDate: usa la duración por defecto de 1 hora', () => {
    const sinFin = { startDate: '2026-10-15T09:30:00', endDate: null };
    const newStart = newStartDate(sinFin.startDate, '2026-10-20T14:00:00');
    expect(resolveCitaFromDrop(newStart, newStart, sinFin)).toBe('20/10 - (14:00 a 15:00)');
  });

  it('ISO con sufijo Z: el fin NO queda antes del inicio (parseo wall-clock)', () => {
    // En UTC-3 new Date('…14:00Z').getHours() = 11: si se formatea con Date se
    // obtenía fin "12:00" < inicio "14:00" → la cita era rechazada.
    const conZ = { startDate: '2026-10-15T09:30:00.000Z', endDate: '2026-10-15T10:30:00.000Z' };
    const newStart = newStartDate(conZ.startDate, '2026-10-20T14:00:00');
    const newEnd = newStartDate(conZ.endDate, '2026-10-20T14:00:00');
    expect(resolveCitaFromDrop(newStart, newEnd, conZ)).toBe('20/10 - (14:00 a 15:00)');
  });

  it('evento all-day (sin hora): null ⇒ NO se toca el caso ni syncCitaEvent', () => {
    const allDay = { startDate: '2026-10-15', endDate: '2026-10-15' };
    const newStart = newStartDate(allDay.startDate, '2026-10-20');
    const newEnd = newStartDate(allDay.endDate, '2026-10-20');
    expect(resolveCitaFromDrop(newStart, newEnd, allDay)).toBeNull();
  });

  it('ISO corrupto (doble T): null ⇒ NO se toca el caso ni syncCitaEvent', () => {
    expect(resolveCitaFromDrop('2026-10-20T14:00:00T09:30:00.000Z', null, evento)).toBeNull();
  });
});

describe('withPreservedDuration con sufijo Z (E01 — 1.10.1)', () => {
  it('no desplaza la hora en zonas UTC negativas (wall-clock)', () => {
    const end = withPreservedDuration(
      '2026-10-20T14:00:00.000Z',
      '2026-10-15T09:30:00.000Z',
      '2026-10-15T10:30:00.000Z'
    );
    expect(end).toBe('2026-10-20T15:00:00'); // 14:00 + 1 h (no 11:00 → 12:00)
  });

  it('entrada sin hora (all-day): null', () => {
    expect(withPreservedDuration('2026-10-20', '2026-10-15', null)).toBeNull();
  });
});

describe('visibleRangeLocal (E03 — 1.10.1)', () => {
  it('día: rango local completo de ese día (fin 23:59:59.999)', () => {
    expect(visibleRangeLocal(new Date(2026, 9, 20), 'day')).toEqual({
      start: '2026-10-20',
      end: '2026-10-20T23:59:59.999',
    });
  });

  it('semana: domingo..sábado cubriendo AMBOS meses cuando la semana cruza', () => {
    // 2026-10-01 es jueves → la semana mostrada es 2026-09-27 .. 2026-10-03.
    expect(visibleRangeLocal(new Date(2026, 9, 1), 'week')).toEqual({
      start: '2026-09-27',
      end: '2026-10-03T23:59:59.999',
    });
  });

  it('semana normal (misma semana de octubre): extremos del domingo al sábado', () => {
    // 2026-10-15 es jueves → semana 2026-10-11 .. 2026-10-17.
    expect(visibleRangeLocal(new Date(2026, 9, 15), 'week')).toEqual({
      start: '2026-10-11',
      end: '2026-10-17T23:59:59.999',
    });
  });
});
