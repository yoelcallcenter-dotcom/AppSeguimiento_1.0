import { describe, it, expect } from 'vitest';
import {
  normalizeDate,
  isSameMonth,
  fechaUltimoReporte,
  getAvailableMonthsConReportes,
} from './dateFilters';

// Año esperado para una fecha DD/MM sin año: año actual, salvo que caiga
// >30 días en el futuro (entonces año anterior).
function expectedDDMM(dd, mm) {
  const today = new Date();
  let year = today.getFullYear();
  const candidate = new Date(year, mm - 1, dd);
  if (Math.round((candidate - today) / (1000 * 60 * 60 * 24)) > 30) year -= 1;
  return `${year}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

describe('normalizeDate', () => {
  it('mantiene fechas ISO intactas', () => {
    expect(normalizeDate('2026-07-15')).toBe('2026-07-15');
    expect(normalizeDate('2026-07-15T10:30:00.000Z')).toBe('2026-07-15');
  });

  it('convierte DD/MM/YYYY sin intercambiar mes y día', () => {
    expect(normalizeDate('15/07/2026')).toBe('2026-07-15');
    expect(normalizeDate('03/05/2026')).toBe('2026-05-03');
    expect(normalizeDate('2026/07/15')).toBe('2026-07-15');
  });

  it('convierte DD/MM al año actual en vez de 2001', () => {
    const iso = normalizeDate('07/08');
    expect(iso).toBe(expectedDDMM(7, 8));
    expect(iso.startsWith('2001-')).toBe(false);
  });

  it('rechaza fechas inexistentes', () => {
    expect(normalizeDate('31/02/2026')).toBe(null);
    expect(normalizeDate('garbage')).toBe(null);
    expect(normalizeDate('')).toBe(null);
    expect(normalizeDate(null)).toBe(null);
  });
});

describe('isSameMonth', () => {
  it('matchea DD/MM/YYYY en el mes correcto', () => {
    expect(isSameMonth('15/07/2026', 6, 2026)).toBe(true);
    expect(isSameMonth('15/07/2026', 6, 2025)).toBe(false);
  });

  it('matchea DD/MM sin caer en 2001', () => {
    const expected = expectedDDMM(7, 8);
    const [, m] = expected.split('-').map(Number);
    const year = Number(expected.slice(0, 4));
    expect(isSameMonth('07/08', m - 1, year)).toBe(true);
    expect(isSameMonth('07/08', 6, 2001)).toBe(false);
  });
});

describe('fechaUltimoReporte', () => {
  it('normaliza la fecha del último reporte DD/MM sin caer en 2001', () => {
    const caso = { reporteHistory: [{ fecha: '07/08', texto: 'Avance' }] };
    expect(fechaUltimoReporte(caso)).toBe(expectedDDMM(7, 8));
    expect(fechaUltimoReporte(caso).startsWith('2001-')).toBe(false);
  });

  it('normaliza reportes DD/MM/YYYY', () => {
    const caso = { reporteHistory: [{ fecha: '15/07/2026', texto: 'Firmó' }] };
    expect(fechaUltimoReporte(caso)).toBe('2026-07-15');
  });

  it('devuelve null sin reportes o sin fecha', () => {
    expect(fechaUltimoReporte({})).toBe(null);
    expect(fechaUltimoReporte({ reporteHistory: [] })).toBe(null);
    expect(fechaUltimoReporte({ reporteHistory: [{ fecha: '', texto: 'x' }] })).toBe(null);
  });
});

describe('getAvailableMonthsConReportes', () => {
  it('agrupa meses sin fechas 2001', () => {
    const casos = [
      { fecha: '15/07/2026', reporteHistory: [{ fecha: '07/08', texto: 'x' }] },
      { fecha: '2026-06-10', reporteHistory: [] },
    ];
    const months = getAvailableMonthsConReportes(casos);
    expect(months.some((m) => m.startsWith('2001-'))).toBe(false);
    expect(months).toContain('2026-07');
    expect(months).toContain('2026-06');
  });
});
