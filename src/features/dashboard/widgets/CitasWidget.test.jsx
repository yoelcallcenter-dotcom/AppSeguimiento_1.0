import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

const mockEvents = [
  { id: 1, title: 'Cita medica', startDate: new Date(Date.now() + 86400000).toISOString(), eventType: 'cita', status: 'pending', relatedCaseIds: ['1'] },
  { id: 2, title: 'Cita abogado', startDate: new Date(Date.now() + 2 * 86400000).toISOString(), eventType: 'cita', status: 'confirmed', relatedCaseIds: ['2'] },
  { id: 3, title: 'Reunion', startDate: new Date(Date.now() + 3 * 86400000).toISOString(), eventType: 'manual', status: 'pending', relatedCaseIds: [] },
];
const mockCases = [
  { id: '1', nombre: 'ANA LOPEZ', aseguradora: 'Galeno ART' },
  { id: '2', nombre: 'JUAN GARCIA', aseguradora: 'OMINT' },
];

vi.mock('../../../core/store/useAppStore', () => ({
  default: vi.fn((selector) => {
    const state = { events: mockEvents, cases: mockCases };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

import { CitasWidget } from './CitasWidget';

describe('CitasWidget', () => {
  it('renderiza titulo', () => {
    render(<CitasWidget period="Mar 2026" />);
    expect(screen.getByText('Citas proximas')).toBeTruthy();
  });

  it('muestra periodo', () => {
    render(<CitasWidget period="Mar 2026" />);
    expect(screen.getByText('Mar 2026')).toBeTruthy();
  });

  it('muestra citas filtradas por tipo cita', () => {
    render(<CitasWidget period="Mar 2026" />);
    expect(screen.getByText('ANA LOPEZ')).toBeTruthy();
    expect(screen.getByText('JUAN GARCIA')).toBeTruthy();
  });

  it('muestra badge OK para confirmadas', () => {
    render(<CitasWidget period="Mar 2026" />);
    expect(screen.getByText('OK')).toBeTruthy();
  });
});
