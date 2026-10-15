/**
 * PlantillasView.test.jsx — 1.10.1
 *
 * Rediseño de la tab Plantillas (Utiles):
 *  - Clic en una plantilla abre el modal de vista previa (variables
 *    resueltas con datos de ejemplo) en lugar del form de edición.
 *  - El modal permite entrar a editar; el form de plantillas de tipo
 *    reporte expone el selector opcional "Estado del caso".
 *  - Empty state inicial con CTA "Crear la primera plantilla".
 *  - Contador filtrado "Mostrando N de M" y badge "Pausada".
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../features/templates/templatesStore', () => ({
  getAllTemplates: vi.fn(),
  deleteTemplate: vi.fn(async () => true),
  duplicateTemplate: vi.fn(async () => true),
  toggleTemplateActive: vi.fn(async () => true),
  createTemplate: vi.fn(async () => ({})),
  updateTemplate: vi.fn(async () => ({})),
}));

import { PlantillasView } from './PlantillasView';
import { getAllTemplates } from '../../features/templates/templatesStore';

const FIXTURES = [
  {
    id: 1,
    name: 'Seguimiento telefónico',
    category: 'Telefonia',
    type: 'reporte',
    active: true,
    content: { texto: 'Se habló con {NOMBRE}', origen: 'Operador', estado: 'Cita virtual' },
  },
  {
    id: 2,
    name: 'Nota vieja',
    category: '',
    type: 'nota',
    active: false,
    content: { title: 'Nota {NOMBRE}', content: 'Contenido de ejemplo' },
  },
];

function renderView(showToast = vi.fn()) {
  return render(<PlantillasView showToast={showToast} config={{}} />);
}

beforeEach(() => {
  vi.clearAllMocks();
  getAllTemplates.mockResolvedValue(FIXTURES);
});

describe('PlantillasView (1.10.1 — rediseño)', () => {
  it('clic en una plantilla abre la vista previa con variables resueltas', async () => {
    renderView();
    const fila = await screen.findByText('Seguimiento telefónico');
    fireEvent.click(fila);
    // Modal con el contenido resuelto (sampleContext: ANA LOPEZ) y el estado.
    expect(await screen.findByText(/Se habló con ANA LOPEZ/)).toBeTruthy();
    expect(screen.getByText(/Cita virtual/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Editar' })).toBeTruthy();
  });

  it('desde la vista previa, "Editar" abre el form (con el selector de estado en reportes)', async () => {
    renderView();
    fireEvent.click(await screen.findByText('Seguimiento telefónico'));
    fireEvent.click(await screen.findByRole('button', { name: 'Editar' }));
    expect(screen.getByText('Editar plantilla')).toBeTruthy();
    // El form de plantilla de reporte expone el estado opcional del caso.
    expect(screen.getByText('Estado del caso (opcional)')).toBeTruthy();
  });

  it('muestra el empty state inicial con CTA "Crear la primera plantilla"', async () => {
    getAllTemplates.mockResolvedValue([]);
    renderView();
    expect(await screen.findByText(/No hay plantillas creadas/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Crear la primera plantilla/ })).toBeTruthy();
  });

  it('filtra y muestra el contador "Mostrando N de M"', async () => {
    renderView();
    await screen.findByText('Seguimiento telefónico');
    fireEvent.change(screen.getByPlaceholderText('Buscar plantillas...'), { target: { value: 'Nota' } });
    expect(await screen.findByText(/Mostrando 1 de 2/)).toBeTruthy();
  });

  it('la plantilla pausada muestra el badge "Pausada"', async () => {
    renderView();
    const badges = await screen.findAllByText('Pausada');
    expect(badges.length).toBeGreaterThan(0);
  });
});
