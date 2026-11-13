import { describe, it, expect } from 'vitest';
import {
  resolveLinkedCase,
  resolveCaseStateColor,
  caseOutlineStyle,
} from './CalendarView';
import { ESTADOS, CONFIG_DEFAULT } from '../../utils/constants';

// Release 1.11.4: el calendario debe pintar el estado REAL del caso vinculado
// (relatedCaseIds), no el caseContext que puede quedar obsoleto.
const caso = (id, estado, extra = {}) => ({ id, nombre: `Caso ${id}`, estado, ...extra });
const map = (...casos) => new Map(casos.map((c) => [String(c.id), c]));

describe('CalendarView · color por estado real del caso (1.11.4)', () => {
  it('resuelve el caso vinculado aunque el id sea número o string', () => {
    const c = caso(7, 'Firmo');
    expect(resolveLinkedCase({ relatedCaseIds: [7] }, map(c))).toBe(c);
    expect(resolveLinkedCase({ relatedCaseIds: ['7'] }, map(c))).toBe(c);
  });

  it('elige el primer caso existente cuando hay varios ids', () => {
    const c2 = caso('c2', 'Baja');
    const linked = resolveLinkedCase({ relatedCaseIds: ['inexistente', 'c2'] }, map(c2));
    expect(linked).toBe(c2);
  });

  it('sin vínculos devuelve null', () => {
    expect(resolveLinkedCase({ relatedCaseIds: [] }, map(caso(1, 'Firmo')))).toBeNull();
    expect(resolveLinkedCase({}, map(caso(1, 'Firmo')))).toBeNull();
  });

  it('usa el estado actual del caso aunque caseContext tenga otro viejo', () => {
    const c = caso('c1', 'Firmo');
    const evt = {
      relatedCaseIds: ['c1'],
      caseContext: { estado: 'Baja' },
    };
    const firmo = ESTADOS.find((e) => e.v === 'Firmo');
    expect(resolveCaseStateColor(evt, map(c), CONFIG_DEFAULT)).toBe(firmo.accent);
  });

  it('devuelve el color de cada estado configurado', () => {
    for (const estado of ['Cita virtual', 'No responde', 'Baja']) {
      const c = caso('c1', estado);
      const expected = ESTADOS.find((e) => e.v === estado).accent;
      expect(
        resolveCaseStateColor({ relatedCaseIds: ['c1'] }, map(c), CONFIG_DEFAULT)
      ).toBe(expected);
    }
  });

  it('si el caso vinculado no existe no inventa color desde caseContext', () => {
    const evt = {
      relatedCaseIds: ['borrado'],
      caseContext: { estado: 'Firmo' },
    };
    expect(resolveCaseStateColor(evt, map(), CONFIG_DEFAULT)).toBeNull();
  });

  it('evento sin relatedCaseIds conserva el fallback legado de caseContext', () => {
    const evt = { caseContext: { estado: 'No responde' } };
    const expected = ESTADOS.find((e) => e.v === 'No responde').accent;
    expect(resolveCaseStateColor(evt, map(), CONFIG_DEFAULT)).toBe(expected);
  });

  it('sin caso no agrega outline (apariencia intacta)', () => {
    expect(caseOutlineStyle(null)).toEqual({});
  });

  it('con color de estado agrega el outline', () => {
    expect(caseOutlineStyle('#10B981')).toEqual({
      outline: '2px solid #10B981',
      outlineOffset: '-2px',
    });
  });
});
