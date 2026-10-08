import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

const mockCases = [];

vi.mock('../../../core/store/useAppStore', () => ({
  default: vi.fn((selector) => {
    const state = { cases: mockCases };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

import { HistorialMetas30 } from './HistorialMetas30';

// Tests 1.10.0 (feature E). localStorage limpio = DEFAULT_GOALS
// (daily.cases habilitada → métrica 'cases'). Sin jest-dom → toBeTruthy().
describe('HistorialMetas30 (1.10.0 · feature E)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renderiza título, periodo y KPI de 30 días hábiles', () => {
    render(<HistorialMetas30 />);
    expect(screen.getByText('Historial de metas (30 días)')).toBeTruthy();
    expect(screen.getByText('Meta vigente')).toBeTruthy();
    expect(screen.getByText('30')).toBeTruthy();
    // Sin casos: 0 días cumplidos → 0%.
    expect(screen.getByText('0%')).toBeTruthy();
    expect(screen.getByText('Días hábiles')).toBeTruthy();
    expect(screen.getByText('% Cumplimiento')).toBeTruthy();
  });

  it('con todas las metas diarias deshabilitadas muestra el mensaje vacío', () => {
    // Clave de storage de operatorStore (OPERATOR_STORAGE_KEYS.GOALS).
    localStorage.setItem(
      'userOperatorGoals',
      JSON.stringify({
        daily: {
          cases: { enabled: false },
          reports: { enabled: false },
          firmas: { enabled: false },
        },
      })
    );
    render(<HistorialMetas30 />);
    expect(screen.getByText(/No hay metas diarias habilitadas/)).toBeTruthy();
  });
});
