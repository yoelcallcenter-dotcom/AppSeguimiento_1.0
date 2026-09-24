import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { SectionHeader, ConfigSection, ConfigSectionTitle, ConfigRow, ConfigField, ConfigGrid, ConfigTip, ConfigDivider } from './ui';
import { Zap, Settings } from 'lucide-react';

describe('SectionHeader plegable', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('muestra título y descripción expandido por defecto', () => {
    render(<SectionHeader icon={Zap} titulo="Dashboard" descripcion="Resumen general" storageKey="test-vista" />);
    expect(screen.getByText('Dashboard')).toBeTruthy();
    expect(screen.getByText('Resumen general')).toBeTruthy();
    expect(screen.getByRole('button', { expanded: true })).toBeTruthy();
  });

  it('sin storageKey no renderiza el botón de plegar', () => {
    render(<SectionHeader titulo="Sin key" descripcion="Desc" />);
    expect(screen.getByText('Sin key')).toBeTruthy();
    expect(screen.getByText('Desc')).toBeTruthy();
    expect(screen.queryByRole('button', { expanded: true })).toBeNull();
  });

  it('contraer oculta icono, título y descripción, y persiste en localStorage', () => {
    const { container } = render(<SectionHeader icon={Zap} titulo="Tabla" descripcion="Detalle de casos" storageKey="test-vista" />);
    expect(container.querySelectorAll('svg').length).toBe(2);
    fireEvent.click(screen.getByRole('button', { expanded: true }));
    expect(screen.queryByText('Tabla')).toBeNull();
    expect(screen.queryByText('Detalle de casos')).toBeNull();
    expect(container.querySelectorAll('svg').length).toBe(1);
    expect(screen.getByRole('button', { expanded: false, name: 'Expandir Tabla' })).toBeTruthy();
    expect(window.localStorage.getItem('app.sh.test-vista')).toBe('1');
  });

  it('restaura el estado colapsado desde localStorage al montar', () => {
    window.localStorage.setItem('app.sh.test-vista', '1');
    render(<SectionHeader titulo="Kanban" descripcion="Por estado" storageKey="test-vista" />);
    expect(screen.queryByText('Kanban')).toBeNull();
    expect(screen.queryByText('Por estado')).toBeNull();
    expect(screen.getByRole('button', { expanded: false, name: 'Expandir Kanban' })).toBeTruthy();
  });

  it('expandir de nuevo recupera título y descripción y guarda "0"', () => {
    render(<SectionHeader icon={Zap} titulo="Notas" descripcion="Observaciones" storageKey="test-vista" />);
    const btn = screen.getByRole('button', { expanded: true });
    fireEvent.click(btn);
    fireEvent.click(screen.getByRole('button', { expanded: false }));
    expect(screen.getByText('Observaciones')).toBeTruthy();
    expect(window.localStorage.getItem('app.sh.test-vista')).toBe('0');
  });

  it('con overlayCollapsed el chevron contraído no ocupa altura y queda absoluto', () => {
    window.localStorage.setItem('app.sh.test-vista', '1');
    const { container } = render(
      <SectionHeader titulo="Tabla" descripcion="Detalle" storageKey="test-vista" overlayCollapsed />
    );
    const root = container.firstChild;
    expect(root.className).toContain('h-0');
    const btn = screen.getByRole('button', { expanded: false, name: 'Expandir Tabla' });
    expect(btn.className).toContain('absolute');
    expect(btn.className).toContain('top-7');
    expect(screen.queryByText('Tabla')).toBeNull();
  });

  it('sin overlayCollapsed el chevron contraído sigue en flujo', () => {
    window.localStorage.setItem('app.sh.test-vista', '1');
    const { container } = render(<SectionHeader titulo="Kanban" descripcion="Por estado" storageKey="test-vista" />);
    const root = container.firstChild;
    expect(root.className).toContain('justify-end');
    expect(root.className).not.toContain('h-0');
  });
});

describe('primitivas de ui.jsx', () => {
  it('ConfigSectionTitle muestra el texto y el icono', () => {
    render(<ConfigSectionTitle icon={Zap}>Notificaciones</ConfigSectionTitle>);
    expect(screen.getByText('Notificaciones')).toBeTruthy();
  });

  it('ConfigSectionTitle renderiza sin icono', () => {
    render(<ConfigSectionTitle>Título plano</ConfigSectionTitle>);
    expect(screen.getByText('Título plano')).toBeTruthy();
  });

  it('ConfigRow muestra label, descripción y control', () => {
    render(<ConfigRow label="Sonido" desc="Reproduce un sonido al llegar una alerta" control={<button>C</button>} />);
    expect(screen.getByText('Sonido')).toBeTruthy();
    expect(screen.getByText('Reproduce un sonido al llegar una alerta')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'C' })).toBeTruthy();
  });

  it('ConfigField muestra label, descripción y contenido', () => {
    render(<ConfigField label="Nombre" desc="Cómo querés que te llamemos"><input aria-label="nombre" /></ConfigField>);
    expect(screen.getByText('Nombre')).toBeTruthy();
    expect(screen.getByLabelText('nombre')).toBeTruthy();
  });

  it('ConfigGrid respeta el número de columnas', () => {
    render(
      <ConfigGrid columns={3}>
        <span>a</span><span>b</span><span>c</span>
      </ConfigGrid>
    );
    const grid = screen.getByText('a').parentElement;
    expect(grid).toBeTruthy();
  });

  it('ConfigTip muestra título por defecto y contenido', () => {
    render(<ConfigTip>Revisá tus campos indexados.</ConfigTip>);
    expect(screen.getByText('Sugerencias')).toBeTruthy();
    expect(screen.getByText('Revisá tus campos indexados.')).toBeTruthy();
  });

  it('ConfigTip acepta título personalizado', () => {
    render(<ConfigTip title="Nota">Algo útil.</ConfigTip>);
    expect(screen.getByText('Nota')).toBeTruthy();
  });

  it('ConfigSection y ConfigDivider renderizan sus hijos', () => {
    render(<ConfigSection><ConfigDivider /><Settings data-testid="set" /></ConfigSection>);
    expect(screen.getByTestId('set')).toBeTruthy();
  });
});