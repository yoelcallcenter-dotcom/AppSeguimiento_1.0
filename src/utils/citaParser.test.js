import { describe, it, expect } from 'vitest';
import {
  parseCita,
  isValidCitaFormat,
  resolveCitaDate,
  buildISODate,
  formatCita,
} from './citaParser';

describe('parseCita', () => {
  it('parsea el formato canónico', () => {
    const r = parseCita('15/09 - (14:00 a 15:30)');
    expect(r).toEqual({
      day: 15,
      month: 9,
      startTime: '14:00',
      endTime: '15:30',
    });
  });

  it('tolera variaciones de espacios y separadores', () => {
    expect(parseCita('15/09-(14:00 a 15:30)')).toEqual({
      day: 15, month: 9, startTime: '14:00', endTime: '15:30',
    });
    expect(parseCita('15/09 - (14:00 a 15:30)')).toEqual({
      day: 15, month: 9, startTime: '14:00', endTime: '15:30',
    });
    expect(parseCita('5/9 - (9:05 a 10:10)')).toEqual({
      day: 5, month: 9, startTime: '09:05', endTime: '10:10',
    });
  });

  it('rechaza formatos ambiguos o inválidos', () => {
    expect(parseCita('próxima semana')).toBeNull();
    expect(parseCita('')).toBeNull();
    expect(parseCita(null)).toBeNull();
    expect(parseCita('15/09')).toBeNull();
    expect(parseCita('15/09 (14:00)')).toBeNull();
    expect(parseCita('15/09 - (14:00 a 14:00)')).toBeNull(); // fin <= inicio
    expect(parseCita('32/13 - (14:00 a 15:00)')).toBeNull(); // día/mes inválidos
    expect(parseCita('15/09 - (25:00 a 26:00)')).toBeNull(); // horas inválidas
  });
});

describe('isValidCitaFormat', () => {
  it('valida formato correcto', () => {
    expect(isValidCitaFormat('15/09 - (14:00 a 15:30)')).toBe(true);
  });
  it('invalida texto ambiguo', () => {
    expect(isValidCitaFormat('raro')).toBe(false);
    expect(isValidCitaFormat('')).toBe(false);
  });
});

describe('buildISODate', () => {
  it('construye fechas válidas', () => {
    expect(buildISODate(2026, 9, 15)).toBe('2026-09-15');
    expect(buildISODate(2026, 2, 8)).toBe('2026-02-08');
  });
  it('rechaza días inexistentes (31/02)', () => {
    expect(buildISODate(2026, 2, 31)).toBeNull();
  });
});

describe('resolveCitaDate', () => {
  const today = new Date(2026, 5, 15); // 15/06/2026

  it('usa el año de referencia si la fecha es futura o cercana', () => {
    // Cita 15/09, año base 2026, hoy 15/06/2026 → no pasada → 2026
    expect(resolveCitaDate({ day: 15, month: 9 }, '2026-01-10', today)).toBe('2026-09-15');
  });

  it('desplaza al año siguiente si quedó significativamente en el pasado', () => {
    // Cita 10/01 (ya pasó en 2026), hoy 15/06/2026 → 2027
    expect(resolveCitaDate({ day: 10, month: 1 }, '2026-01-10', today)).toBe('2027-01-10');
  });

  it('usa el año de hoy si no hay referencia', () => {
    expect(resolveCitaDate({ day: 1, month: 12 }, null, today)).toBe('2026-12-01');
  });

  it('respeta meses al inicio del año dentro de tolerancia', () => {
    // 20/06, hoy 15/06/2026, a 5 días en el futuro → 2026
    expect(resolveCitaDate({ day: 20, month: 6 }, null, today)).toBe('2026-06-20');
  });

  it('devuelve null para entradas inválidas', () => {
    expect(resolveCitaDate(null, null, today)).toBeNull();
    expect(resolveCitaDate({ day: 31, month: 2 }, null, today)).toBeNull();
  });
});

describe('formatCita', () => {
  it('formatea de vuelta a un string consistente', () => {
    expect(
      formatCita({ day: 15, month: 9, startTime: '14:00', endTime: '15:30' })
    ).toBe('15/09 - (14:00 a 15:30)');
  });
});
