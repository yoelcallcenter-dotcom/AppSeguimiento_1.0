import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Btn } from './Btn';

/**
 * C02c (1.10.1): loading de Btn.
 * Antes el icono se desmontaba (`Icon && !loading`), el texto quedaba
 * `color: transparent` y el spinner ::after salía transparente en todo
 * botón sin variantClass (los Btn con prop `color`, p.ej. "Exportar CSV").
 * Estos tests fijan el comportamiento nuevo: icono estable, label oculto
 * con visibility (no se pierde el ancho) y spinner overlay visible en
 * TODOS los botones, con el botón deshabilitado mientras carga.
 */
describe('Btn · C02c (1.10.1): estado loading', () => {
  it('mantiene el icono montado, oculta el label y muestra el spinner', () => {
    const { container } = render(
      <Btn loading icon={() => <svg data-testid="ic" />} size="sm">
        Exportar CSV
      </Btn>
    );

    // El icono NO se desmonta (antes saltaba el ancho ~20px).
    expect(screen.getByTestId('ic')).toBeTruthy();
    // El label conserva el texto (y por lo tanto el ancho) pero oculto.
    const label = screen.getByText('Exportar CSV');
    expect(label.className).toContain('btn-loading-label');
    // El spinner existe como overlay.
    expect(container.querySelector('.btn-spinner')).toBeTruthy();
  });

  it('muestra el spinner también con prop `color` (sin variantClass)', () => {
    // Regresión exacta del bug: Btn con color explícito no hereda ninguna
    // variante, así que las reglas viejas de spinner no le aplicaban.
    const { container } = render(
      <Btn loading color="var(--color-success)" textColor="#ffffff" icon={() => <svg />}>
        Exportar CSV
      </Btn>
    );
    const btn = screen.getByText('Exportar CSV').closest('button');
    expect(btn.className).not.toContain('btn-primary');
    expect(btn.className).not.toContain('btn-accent');
    expect(container.querySelector('.btn-spinner')).toBeTruthy();
  });

  it('deshabilita el botón mientras carga y respeta aria-busy', () => {
    render(<Btn loading>Guardar</Btn>);
    const btn = screen.getByText('Guardar').closest('button');
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute('aria-busy')).toBe('true');
  });

  it('sin loading no hay spinner ni label oculto, y el click llega', () => {
    let clicks = 0;
    const { container } = render(<Btn onClick={() => { clicks += 1; }}>Guardar</Btn>);
    expect(container.querySelector('.btn-spinner')).toBeFalsy();
    fireEvent.click(screen.getByText('Guardar'));
    expect(clicks).toBe(1);
  });
});
