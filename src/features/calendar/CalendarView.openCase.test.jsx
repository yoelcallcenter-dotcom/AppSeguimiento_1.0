import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CalendarView from './CalendarView';
import { CONFIG_DEFAULT } from '../../utils/constants';

// Release 1.11.4: apertura del caso vinculado desde el evento del calendario
// sin romper la edición (el click en el chip sigue abriendo EventModal).
vi.mock('./calendarStore', () => ({
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
  getEvent: vi.fn(),
  getEventsByMonth: vi.fn(),
  getEventsByDateRange: vi.fn(),
  getAllEvents: vi.fn(),
  EVENT_TYPES: { CITA: 'cita', REPROGRAMACION: 'reprogramacion', MANUAL: 'manual' },
}));

vi.mock('./calendarService', () => ({
  useCalendarService: () => ({ checkUpcomingEvents: vi.fn() }),
}));

vi.mock('./EventModal', () => ({
  __esModule: true,
  default: ({ isOpen }) => (isOpen ? <div data-testid="event-modal" /> : null),
}));

vi.mock('../notes/notesStore', () => ({
  getAllNotes: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../core/store/useAppStore', () => ({
  default: { getState: () => ({ loadEvents: vi.fn() }) },
}));

vi.mock('../operator/operatorStore', () => ({
  getOperatorAvailability: () => ({}),
  getOperatorSettings: () => ({}),
}));

vi.mock('../operator/operatorMetrics', () => ({
  getAvailabilityOn: () => null,
}));

vi.mock('../../core/db/casesDB', () => ({
  default: { cases: { update: vi.fn() } },
}));

vi.mock('../../core/cases/citaAutoEvents', () => ({
  syncCitaEvent: vi.fn(),
}));

const { getEventsByMonth } = await import('./calendarStore');

const fechaHoy = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

const CASO = { id: 'c1', nombre: 'Caso Uno', estado: 'Firmo' };

function evento(overrides = {}) {
  return {
    id: 'e1',
    title: 'Llamada',
    startDate: `${fechaHoy()}T10:00:00`,
    endDate: `${fechaHoy()}T11:00:00`,
    priority: 'medium',
    status: 'pending',
    eventType: 'manual',
    relatedCaseIds: ['c1'],
    tags: [],
    ...overrides,
  };
}

function renderVista(onVerCaso, casos = [CASO]) {
  return render(
    <CalendarView
      showToast={vi.fn()}
      casos={casos}
      config={CONFIG_DEFAULT}
      onVerCaso={onVerCaso}
    />
  );
}

describe('CalendarView · apertura del caso desde el evento (1.11.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('muestra el botón de apertura, pinta el outline del estado y abre el caso real', async () => {
    getEventsByMonth.mockResolvedValue([evento()]);
    const onVerCaso = vi.fn();
    renderVista(onVerCaso);

    const abrir = await screen.findByRole('button', {
      name: 'Abrir caso vinculado Caso Uno',
    });
    // Outline = color del estado actual (Firmo → #10B981).
    const chip = abrir.closest('[role="button"]');
    expect(chip.style.outline).toMatch(/2px solid (rgb\(16, 185, 129\)|#10B981)/i);

    fireEvent.click(abrir);
    expect(onVerCaso).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1' }));
    // El click de apertura no dispara el modal de edición.
    expect(screen.queryByTestId('event-modal')).toBeNull();
  });

  it('al hacer click en el chip (fuera del botón) sigue abriendo la edición', async () => {
    getEventsByMonth.mockResolvedValue([evento()]);
    renderVista(vi.fn());

    const abrir = await screen.findByRole('button', {
      name: 'Abrir caso vinculado Caso Uno',
    });
    fireEvent.click(abrir.closest('[role="button"]'));
    await waitFor(() => expect(screen.getByTestId('event-modal')).toBeTruthy());
  });

  it('un evento sin caso vinculado no muestra acción de apertura', async () => {
    getEventsByMonth.mockResolvedValue([
      evento({ relatedCaseIds: [], caseContext: null }),
    ]);
    renderVista(vi.fn());

    await screen.findByRole('button', { name: 'Editar evento Llamada' });
    expect(
      screen.queryByRole('button', { name: /Abrir caso vinculado/ })
    ).toBeNull();
  });
});
