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

import { MetaFirmasWidget } from './MetaFirmasWidget';

// Tests 1.10.0 (feature A). Sin jest-dom en el repo → asertamos con
// toBeTruthy() (patrón del repo). localStorage limpio = DEFAULT_GOALS:
// firmas diaria deshabilitada, firmas mensuales 14 habilitadas.
describe('MetaFirmasWidget (1.10.0 · feature A)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renderiza el título', () => {
    render(<MetaFirmasWidget />);
    expect(screen.getByText('Meta de firmas')).toBeTruthy();
  });

  it('informa la meta diaria de firmas deshabilitada (default)', () => {
    render(<MetaFirmasWidget />);
    expect(screen.getByText('Hoy')).toBeTruthy();
    expect(screen.getByText(/Meta deshabilitada/)).toBeTruthy();
  });

  it('muestra la meta mensual de firmas (0 / 14 por defecto)', () => {
    render(<MetaFirmasWidget />);
    expect(screen.getByText('Este mes')).toBeTruthy();
    expect(screen.getByText('0 / 14')).toBeTruthy();
  });
});
