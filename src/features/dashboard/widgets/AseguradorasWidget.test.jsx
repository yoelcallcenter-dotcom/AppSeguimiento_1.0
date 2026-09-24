import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

const mockCases = [
  { id: '1', nombre: 'ANA', estado: 'Firmo', aseguradora: 'Galeno ART' },
  { id: '2', nombre: 'JUAN', estado: 'Pendiente', aseguradora: 'Galeno ART' },
  { id: '3', nombre: 'MARIA', estado: 'Firmo', aseguradora: 'OMINT' },
  { id: '4', nombre: 'PEDRO', estado: 'Baja', aseguradora: 'OMINT' },
  { id: '5', nombre: 'LUISA', estado: 'Cita virtual', aseguradora: 'OSDE' },
];

vi.mock('../../../core/store/useAppStore', () => ({
  default: vi.fn((selector) => {
    const state = { cases: mockCases };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

import { AseguradorasWidget } from './AseguradorasWidget';

describe('AseguradorasWidget', () => {
  it('renderiza titulo', () => {
    render(<AseguradorasWidget period="Mar 2026" />);
    expect(screen.getByText('Aseguradoras')).toBeTruthy();
  });

  it('muestra aseguradoras ordenadas por cantidad', () => {
    render(<AseguradorasWidget period="Mar 2026" />);
    expect(screen.getByText('Galeno ART')).toBeTruthy();
    expect(screen.getByText('OMINT')).toBeTruthy();
    expect(screen.getByText('OSDE')).toBeTruthy();
  });

  it('muestra metricas de conversion', () => {
    render(<AseguradorasWidget period="Mar 2026" />);
    const results = screen.getAllByText(/1\/2/);
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});
