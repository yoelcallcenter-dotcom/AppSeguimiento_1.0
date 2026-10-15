/**
 * PlantillaForm.test.jsx — 1.10.1 / T5
 *
 * Mejora del form de plantillas:
 *  - Selector de tipo por chips (con icono y color) en lugar de un <select>.
 *  - T5: crear y editar comparten la MISMA interfaz — los chips de tipo
 *    están activos también al editar (antes: badge estático + candado
 *    "El tipo no se puede cambiar al editar").
 *  - La vista previa arranca visible por defecto (antes oculta tras toggle).
 *  - Guardia de cambios sin guardar: Cancelar con cambios abre ConfirmDialog.
 *  - Validación de nombre y guardado vía createTemplate/updateTemplate.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../features/templates/templatesStore', () => ({
  createTemplate: vi.fn(async () => ({})),
  updateTemplate: vi.fn(async () => ({})),
}));

import { PlantillaForm } from './PlantillaForm';
import { createTemplate, updateTemplate } from '../../features/templates/templatesStore';

const FIXTURE = {
  id: 1,
  name: 'Seguimiento telefónico',
  category: 'Telefonia',
  type: 'reporte',
  active: true,
  content: { texto: 'Se habló con {NOMBRE}', origen: 'Operador', estado: 'Cita virtual' },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PlantillaForm (1.10.1 — mejora del form)', () => {
  it('al crear muestra chips de tipo y la preview visible por defecto', () => {
    render(<PlantillaForm onSave={vi.fn()} onCancel={vi.fn()} showToast={vi.fn()} config={{}} />);
    // Chips de tipo con icono (el tipo nota arranca activo).
    const notaChip = screen.getByRole('button', { name: 'Nota' });
    expect(notaChip.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Reporte' })).toBeTruthy();
    // Preview visible por defecto (antes oculta tras el toggle).
    expect(screen.getByText('Vista previa (con datos de ejemplo)')).toBeTruthy();
  });

  it('cambiar el tipo a reporte muestra sus campos', () => {
    render(<PlantillaForm onSave={vi.fn()} onCancel={vi.fn()} showToast={vi.fn()} config={{}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reporte' }));
    expect(screen.getByText('Texto del reporte')).toBeTruthy();
    expect(screen.getByText('Origen')).toBeTruthy();
    expect(screen.getByText('Estado del caso (opcional)')).toBeTruthy();
  });

  it('al editar muestra los mismos chips de tipo que al crear y el tipo es modificable', () => {
    render(<PlantillaForm template={FIXTURE} onSave={vi.fn()} onCancel={vi.fn()} showToast={vi.fn()} config={{}} />);
    expect(screen.getByText('Editar plantilla')).toBeTruthy();
    // T5: sin candado — el tipo ahora es modificable también al editar.
    expect(screen.queryByText('El tipo no se puede cambiar al editar')).toBeNull();
    // Mismo selector de chips que en crear (el tipo del FIXTURE arranca activo).
    expect(screen.getByRole('button', { name: 'Reporte' }).getAttribute('aria-pressed')).toBe('true');
    const eventoChip = screen.getByRole('button', { name: 'Evento' });
    expect(eventoChip.getAttribute('aria-pressed')).toBe('false');
    // Los campos del tipo reporte siguen presentes antes de cambiar.
    expect(screen.getByText('Estado del caso (opcional)')).toBeTruthy();
    // Cambiar el tipo muestra los campos del nuevo tipo (igual que al crear).
    fireEvent.click(eventoChip);
    expect(screen.getByRole('button', { name: 'Evento' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('Descripción')).toBeTruthy();
    expect(screen.queryByText('Estado del caso (opcional)')).toBeNull();
  });

  it('cancelar sin cambios llama onCancel directo (sin ConfirmDialog)', () => {
    const onCancel = vi.fn();
    render(<PlantillaForm onSave={vi.fn()} onCancel={onCancel} showToast={vi.fn()} config={{}} />);
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onCancel).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Descartar' })).toBeNull();
  });

  it('cancelar con cambios abre ConfirmDialog y "Descartar" descarta', async () => {
    const onCancel = vi.fn();
    render(<PlantillaForm onSave={vi.fn()} onCancel={onCancel} showToast={vi.fn()} config={{}} />);
    // Tipear un nombre marca el form como sucio.
    fireEvent.change(screen.getByPlaceholderText('Ej: Seguimiento telefónico'), {
      target: { value: 'Mi plantilla' },
    });
    fireEvent.click(screen.getByText('Cancelar'));
    // El dialog de confirmación aparece (animado → findBy).
    const descartar = await screen.findByRole('button', { name: 'Descartar' });
    expect(screen.getByText(/Hay cambios sin guardar/)).toBeTruthy();
    fireEvent.click(descartar);
    expect(onCancel).toHaveBeenCalled();
  });

  it('guardar con nombre válido llama createTemplate y onSave', async () => {
    const onSave = vi.fn();
    const showToast = vi.fn();
    render(<PlantillaForm onSave={onSave} onCancel={vi.fn()} showToast={showToast} config={{}} />);
    fireEvent.change(screen.getByPlaceholderText('Ej: Seguimiento telefónico'), {
      target: { value: 'Mi plantilla' },
    });
    fireEvent.click(screen.getByText('Crear plantilla'));
    await waitFor(() => expect(createTemplate).toHaveBeenCalledTimes(1));
    expect(createTemplate).toHaveBeenCalledWith(expect.objectContaining({ name: 'Mi plantilla' }));
    expect(onSave).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('Plantilla creada', 'success');
  });

  it('editar plantilla válida llama updateTemplate', async () => {
    const onSave = vi.fn();
    render(<PlantillaForm template={FIXTURE} onSave={onSave} onCancel={vi.fn()} showToast={vi.fn()} config={{}} />);
    fireEvent.click(screen.getByText('Guardar cambios'));
    await waitFor(() => expect(updateTemplate).toHaveBeenCalledTimes(1));
    expect(updateTemplate).toHaveBeenCalledWith(FIXTURE.id, expect.objectContaining({ name: FIXTURE.name }));
    expect(onSave).toHaveBeenCalled();
  });

  it('nombre vacío muestra el error de validación y no guarda', () => {
    render(<PlantillaForm onSave={vi.fn()} onCancel={vi.fn()} showToast={vi.fn()} config={{}} />);
    fireEvent.click(screen.getByText('Crear plantilla'));
    expect(screen.getByText('El nombre es requerido')).toBeTruthy();
    expect(createTemplate).not.toHaveBeenCalled();
  });
});
