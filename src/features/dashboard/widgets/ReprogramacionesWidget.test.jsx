import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

const mockCases = [
  { id: '1', nombre: 'ANA LOPEZ', estado: 'Reprogramado', aseguradora: 'Galeno ART', localidad: 'LA PLATA', reporteHistory: [{ fecha: '15/03' }] },
  { id: '2', nombre: 'JUAN GARCIA', estado: 'Reprogramado', aseguradora: 'OMINT', localidad: 'CABA', reporteHistory: [] },
  { id: '3', nombre: 'MARIA RODRIGUEZ', estado: 'Pendiente', aseguradora: 'Galeno ART', localidad: 'CABA', reporteHistory: [] },
];

vi.mock('../../../core/store/useAppStore', () => ({
  default: vi.fn((selector) => {
    const state = { cases: mockCases };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

import { ReprogramacionesWidget } from './ReprogramacionesWidget';

describe('ReprogramacionesWidget', () => {
  it('renderiza titulo', () => {
    render(<ReprogramacionesWidget period="Mar 2026" />);
    expect(screen.getByText('Reprogramaciones')).toBeTruthy();
  });

  it('muestra solo casos Reprogramado', () => {
    render(<ReprogramacionesWidget period="Mar 2026" />);
    expect(screen.getByText('ANA LOPEZ')).toBeTruthy();
    expect(screen.getByText('JUAN GARCIA')).toBeTruthy();
    expect(screen.queryByText('MARIA RODRIGUEZ')).toBeNull();
  });

  it('muestra datos de aseguradora y localidad', () => {
    render(<ReprogramacionesWidget period="Mar 2026" />);
    expect(screen.getByText(/Galeno ART.*LA PLATA/)).toBeTruthy();
  });
});
