import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterChip } from './FilterChip';

// Tests 1.10.0: FilterChip ahora propaga props extra al <button> sin romper
// el comportamiento base. (El data-tour de ejemplo antes era el chip "Solo de
// hoy" del header, que se quitó en la revisión 1.10.0; el ejemplo queda
// genérico porque la propagación de props sigue siendo el contrato a blindar.)
describe('FilterChip (1.10.0)', () => {
  it('propaga props extra al button (data-tour)', () => {
    render(<FilterChip data-tour="chip-demo">Filtro</FilterChip>);
    const button = screen.getByRole('button');
    expect(button.getAttribute('data-tour')).toBe('chip-demo');
    expect(screen.getByText('Filtro')).toBeTruthy();
  });

  it('marca aria-pressed según active', () => {
    const { rerender } = render(<FilterChip>Día</FilterChip>);
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('false');
    rerender(<FilterChip active>Día</FilterChip>);
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('true');
  });

  it('dispara onClick', () => {
    const onClick = vi.fn();
    render(<FilterChip onClick={onClick}>Día</FilterChip>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('deshabilitado no dispara onClick', () => {
    const onClick = vi.fn();
    render(
      <FilterChip disabled onClick={onClick}>
        Día
      </FilterChip>
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});
