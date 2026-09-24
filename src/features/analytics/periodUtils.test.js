import { describe, it, expect } from 'vitest';
import { diasHabilesEnRango, diasEfectivosEnRango } from './periodUtils';

const SEPTIEMBRE = { startISO: '2026-09-01', endISO: '2026-09-30' };

describe('diasEfectivosEnRango (FH = TM − FS − In − Fe − Va)', () => {
  it('septiembre 2026 tiene 22 días hábiles sin disponibilidad', () => {
    expect(diasHabilesEnRango(SEPTIEMBRE)).toBe(22);
    expect(diasEfectivosEnRango(SEPTIEMBRE).length).toBe(22);
  });

  it('descuenta vacaciones, feriados e inasistencias solo sobre días hábiles', () => {
    const availability = {
      vacations: [{ id: 'v1', start: '2026-09-07', end: '2026-09-11' }],
      holidays: [{ id: 'h1', name: 'Feriado', date: '2026-09-21' }],
      absences: [{ id: 'a1', date: '2026-09-15', type: 'personal' }],
    };
    // 22 - 5 vacaciones - 1 feriado - 1 inasistencia = 15
    expect(diasEfectivosEnRango(SEPTIEMBRE, [1, 2, 3, 4, 5], availability)).toHaveLength(15);
  });

  it('vacaciones con fines de semana adentro solo descuentan días laborables', () => {
    const availability = {
      vacations: [{ id: 'v1', start: '2026-09-04', end: '2026-09-06' }], // vie-sáb-dom
    };
    const dias = diasEfectivosEnRango(SEPTIEMBRE, [1, 2, 3, 4, 5], availability);
    expect(dias).not.toContain('2026-09-04');
    // solo el viernes 4 era laborable dentro del rango de vacaciones
    expect(dias).toHaveLength(21);
    expect(dias).toContain('2026-09-07');
  });

  it('solape vacación ∩ feriado se descuenta una sola vez', () => {
    const availability = {
      vacations: [{ id: 'v1', start: '2026-09-14', end: '2026-09-18' }],
      holidays: [{ id: 'h1', name: 'Feriado', date: '2026-09-16' }],
    };
    // 22 - 5 (el feriado cae dentro de las vacaciones) = 17
    expect(diasEfectivosEnRango(SEPTIEMBRE, [1, 2, 3, 4, 5], availability)).toHaveLength(17);
  });

  it('respecta workingDays no estándar (mar-sáb) y descuenta solo esos días', () => {
    const availability = {
      absences: [{ id: 'a1', date: '2026-09-13', type: 'enfermedad' }], // domingo
      holidays: [{ id: 'h1', name: 'Feriado', date: '2026-09-15' }],     // martes
    };
    const series = diasEfectivosEnRango(SEPTIEMBRE, [2, 3, 4, 5, 6], availability);
    expect(series).not.toContain('2026-09-15');
    // Domingo no es laborable para mar-sáb: no lo descuenta como inasistencia.
    if (series.includes('2026-09-13')) {
      throw new Error('el domingo no debería aparecer en workingDays mar-sáb');
    }
  });

  it('rango parcial descuenta feriados dentro del sub-rango', () => {
    const rango = { startISO: '2026-09-14', endISO: '2026-09-25' }; // lun a vie de 2 semanas
    const availability = {
      absences: [{ id: 'a1', date: '2026-09-16', type: 'personal' }],
    };
    expect(diasEfectivosEnRango(rango, [1, 2, 3, 4, 5], availability)).toHaveLength(9);
  });
});