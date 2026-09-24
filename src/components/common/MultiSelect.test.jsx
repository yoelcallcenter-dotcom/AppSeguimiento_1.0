import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MultiSelect } from './MultiSelect';

const OPTIONS = [
  { value: 'a', label: 'Opción A' },
  { value: 'b', label: 'Opción B' },
  { value: 'c', label: 'Opción C' },
];

describe('MultiSelect', () => {
  it('muestra placeholder cuando no hay selección', () => {
    render(<MultiSelect options={OPTIONS} value={[]} onChange={() => {}} placeholder="Todas" />);
    expect(screen.getByText('Todas')).toBeTruthy();
  });

  it('muestra contador de seleccionados', () => {
    render(<MultiSelect options={OPTIONS} value={['a', 'b']} onChange={() => {}} />);
    expect(screen.getByText('2 seleccionados')).toBeTruthy();
  });

  it('abre dropdown al hacer click en el botón principal', () => {
    render(<MultiSelect options={OPTIONS} value={[]} onChange={() => {}} />);
    const btn = screen.getAllByRole('button')[0];
    fireEvent.click(btn);
    expect(screen.getByRole('listbox')).toBeTruthy();
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('selecciona un item al hacer click en el checkbox', () => {
    const onChange = vi.fn();
    render(<MultiSelect options={OPTIONS} value={[]} onChange={onChange} />);
    const btn = screen.getAllByRole('button')[0];
    fireEvent.click(btn);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    expect(onChange).toHaveBeenCalledWith(['a']);
  });

  it('deselecciona un item ya seleccionado', () => {
    const onChange = vi.fn();
    render(<MultiSelect options={OPTIONS} value={['a', 'b']} onChange={onChange} />);
    const btn = screen.getAllByRole('button')[0];
    fireEvent.click(btn);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    expect(onChange).toHaveBeenCalledWith(['b']);
  });

  it('limpia un item desde la pill', () => {
    const onChange = vi.fn();
    render(<MultiSelect options={OPTIONS} value={['a', 'b']} onChange={onChange} />);
    const pill = screen.getByRole('button', { name: /Quitar Opción A/ });
    fireEvent.click(pill);
    expect(onChange).toHaveBeenCalledWith(['b']);
  });

  it('muestra label opcional', () => {
    render(<MultiSelect label="Estado" options={OPTIONS} value={[]} onChange={() => {}} />);
    expect(screen.getByText('Estado')).toBeTruthy();
  });

  it('muestra "Sin opciones" cuando options está vacío', () => {
    render(<MultiSelect options={[]} value={[]} onChange={() => {}} />);
    const btn = screen.getAllByRole('button')[0];
    fireEvent.click(btn);
    expect(screen.getByText('Sin opciones')).toBeTruthy();
  });
});
