/**
 * CalendarToolbar.test.jsx — T4a/C03 (1.10.1)
 *
 * Cubre el rediseño visual de la toolbar:
 *  - navegación prev/hoy/next ahora con Btn/BtnOutline (componentes comunes)
 *    manteniendo los aria-label "Anterior"/"Siguiente" que usan tours/a11y.
 *  - selectores de vista migrados de SubPills a FilterChip: siguen dentro de
 *    role="group" aria-label="Vistas del calendario" y exponen aria-pressed.
 *  - el chip de disponibilidad expone aria-pressed y su aria-label estable
 *    (el texto "Disponibilidad" está oculto en pantallas chicas).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CalendarToolbar from './CalendarToolbar';

const baseProps = {
  currentView: 'month',
  onViewChange: vi.fn(),
  currentDate: new Date(2026, 9, 1),
  onPrev: vi.fn(),
  onNext: vi.fn(),
  onToday: vi.fn(),
  onAddEvent: vi.fn(),
  showAvailability: true,
  onToggleAvailability: vi.fn(),
};

describe('CalendarToolbar (T4a/C03 — 1.10.1)', () => {
  it('conserva los aria-label de navegación, "Hoy" y "Nuevo evento"', () => {
    render(<CalendarToolbar {...baseProps} />);
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Hoy' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Nuevo evento' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Disponibilidad' })).toBeTruthy();
  });

  it('el grupo de vistas conserva el aria-label y cada chip informa aria-pressed', () => {
    render(<CalendarToolbar {...baseProps} />);
    const grupo = screen.getByRole('group', { name: 'Vistas del calendario' });
    expect(grupo).toBeTruthy();
    ['Dia', 'Semana', 'Mes', 'Lista'].forEach((label) => {
      expect(screen.getByRole('button', { name: label }).getAttribute('aria-pressed')).toBe(
        String(label === 'Mes')
      );
    });
    expect(grupo.querySelectorAll('button')).toHaveLength(4);
  });

  it('click en una vista llama a onViewChange con su id', () => {
    const onViewChange = vi.fn();
    render(<CalendarToolbar {...baseProps} onViewChange={onViewChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Semana' }));
    expect(onViewChange).toHaveBeenCalledWith('week');
  });

  it('navegación y disponibilidad disparan sus handlers', async () => {
    const props = {
      ...baseProps,
      onPrev: vi.fn(),
      onNext: vi.fn(),
      onToday: vi.fn(),
      onToggleAvailability: vi.fn(),
      showAvailability: false,
    };
    render(<CalendarToolbar {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hoy' }));
    fireEvent.click(screen.getByRole('button', { name: 'Disponibilidad' }));
    expect(props.onPrev).toHaveBeenCalledTimes(1);
    expect(props.onNext).toHaveBeenCalledTimes(1);
    expect(props.onToday).toHaveBeenCalledTimes(1);
    expect(props.onToggleAvailability).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('button', { name: 'Disponibilidad' }).getAttribute('aria-pressed')
    ).toBe('false');
  });

  // T4c/C03 (1.10.1): el chip "Filtros" es la nueva puerta de entrada al
  // panel (que ahora va oculto por defecto en CalendarView).
  it('chip Filtros: aria-pressed, aria-controls al panel y contador de activos', () => {
    const onToggleFilters = vi.fn();
    const { rerender } = render(
      <CalendarToolbar {...baseProps} showFilters={false} onToggleFilters={onToggleFilters} />
    );
    const chip = screen.getByRole('button', { name: 'Filtros' });
    expect(chip.getAttribute('aria-pressed')).toBe('false');
    expect(chip.getAttribute('aria-controls')).toBe('cal-filtros-panel');

    fireEvent.click(chip);
    expect(onToggleFilters).toHaveBeenCalledTimes(1);

    // Con filtros activos y panel abierto: aria-pressed true + "(2)" visible.
    rerender(
      <CalendarToolbar
        {...baseProps}
        showFilters
        onToggleFilters={onToggleFilters}
        filtersActive={2}
      />
    );
    const abierto = screen.getByRole('button', { name: 'Filtros (2)' });
    expect(abierto.getAttribute('aria-pressed')).toBe('true');
    // Sin filtros activos no se pinta contador alguno.
    rerender(<CalendarToolbar {...baseProps} showFilters filtersActive={0} />);
    expect(screen.getByRole('button', { name: 'Filtros' })).toBeTruthy();
  });
});
