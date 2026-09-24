import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { WidgetWrapper } from './WidgetWrapper';

describe('WidgetWrapper', () => {
  it('renderiza titulo', () => {
    render(<WidgetWrapper title="Test Widget"><div>Content</div></WidgetWrapper>);
    expect(screen.getByText('Test Widget')).toBeTruthy();
  });

  it('renderiza children cuando no hay loading/error/empty', () => {
    render(<WidgetWrapper title="Test"><div>Child content</div></WidgetWrapper>);
    expect(screen.getByText('Child content')).toBeTruthy();
  });

  it('muestra periodo cuando se provee', () => {
    render(<WidgetWrapper title="Test" period="Mar 2026"><div>Content</div></WidgetWrapper>);
    expect(screen.getByText('Mar 2026')).toBeTruthy();
  });

  it('muestra empty state', () => {
    render(<WidgetWrapper title="Test" empty emptyMessage="Sin datos" />);
    expect(screen.getByText('Sin datos')).toBeTruthy();
  });

  it('muestra loading state', () => {
    const { container } = render(<WidgetWrapper title="Test" loading />);
    expect(container.querySelector('.animate-fade-in')).toBeTruthy();
  });

  it('muestra error state', () => {
    render(<WidgetWrapper title="Test" error="Error de carga" />);
    expect(screen.getByText('Error de carga')).toBeTruthy();
  });
});
