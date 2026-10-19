/**
 * Markdown.test.jsx — post 1.10.1 (lector de documentación)
 *
 * Antes la pestaña Documentación mostraba README/CHANGELOG como texto plano
 * dentro de un <pre>: los títulos "#" y la negrita "**..." se veían literales.
 * Estos tests cubren el parser propio (sin dependencias) que ahora los
 * interpreta como un visor .md.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Markdown } from './Markdown';

describe('Markdown (lector .md de la Documentación)', () => {
  it('renderiza títulos # hasta ######', () => {
    const { container } = render(<Markdown content={'# Uno\n\n## Dos\n\n### Tres'} />);
    expect(container.querySelector('h1').textContent).toBe('Uno');
    expect(container.querySelector('h2').textContent).toBe('Dos');
    expect(container.querySelector('h3').textContent).toBe('Tres');
  });

  it('interpreta **dobles asteriscos** como negrita y *asterisco* como itálica', () => {
    const { container } = render(<Markdown content={'**negrita** e *italica*'} />);
    const strong = container.querySelector('strong');
    expect(strong).toBeTruthy();
    expect(strong.textContent).toBe('negrita');
    expect(container.querySelector('em').textContent).toBe('italica');
    // Los marcadores ya no quedan como texto literal.
    expect(container.textContent).not.toContain('**');
  });

  it('renderiza código inline con backticks', () => {
    const { container } = render(<Markdown content={'usar `npm run build` para compilar'} />);
    const code = container.querySelector('code');
    expect(code).toBeTruthy();
    expect(code.textContent).toBe('npm run build');
  });

  it('renderiza listas con y sin ordenar (y sub-nivel por indentación)', () => {
    const { container } = render(
      <Markdown content={'- uno\n- dos\n  - sub\n\n1. primero\n2. segundo'} />
    );
    const ul = container.querySelector('ul');
    expect(ul).toBeTruthy();
    expect(ul.querySelectorAll(':scope > li').length).toBe(2);
    // El sub-item vive dentro de la lista (sub-ul anidada).
    expect(ul.querySelector('li ul li').textContent).toBe('sub');
    const ol = container.querySelector('ol');
    expect(ol).toBeTruthy();
    expect(ol.querySelectorAll(':scope > li').length).toBe(2);
  });

  it('los bloques ``` son literales (no interpreta # ni * dentro)', () => {
    const { container } = render(
      <Markdown content={'```bash\n# comentario *archivo*\necho "hola"\n```'} />
    );
    const pre = container.querySelector('pre');
    expect(pre).toBeTruthy();
    expect(pre.textContent).toContain('# comentario *archivo*');
    // Sin títulos ni énfasis generados desde el interior del bloque.
    expect(container.querySelector('h1')).toBeNull();
    expect(container.querySelector('strong')).toBeNull();
  });

  it('renderiza tablas markdown con encabezado y filas', () => {
    const { container } = render(
      <Markdown content={'| Comando | Qué hace |\n|---|---|\n| `npm start` | Dev server |'} />
    );
    const table = container.querySelector('table');
    expect(table).toBeTruthy();
    expect(table.querySelectorAll('th').length).toBe(2);
    expect(table.querySelectorAll('tbody td').length).toBe(2);
    expect(table.querySelector('th').textContent).toBe('Comando');
  });

  it('renderiza citas, reglas horizontales y enlaces', () => {
    const { container } = render(
      <Markdown content={'> nota importante\n\n---\n\n[Changelog](https://example.com/cv)'} />
    );
    expect(container.querySelector('blockquote').textContent).toBe('nota importante');
    expect(container.querySelector('hr')).toBeTruthy();
    const a = container.querySelector('a');
    expect(a.getAttribute('href')).toBe('https://example.com/cv');
    expect(a.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('el escape \\* deja el asterisco literal sin envolver', () => {
    const { container } = render(<Markdown content={'no \\*envolver\\* esto'} />);
    expect(container.querySelector('em')).toBeNull();
    expect(container.textContent).toContain('*envolver*');
  });

  it('los asteriscos sin cierre quedan como texto (no inventa énfasis)', () => {
    const { container } = render(<Markdown content={'3 * 4 = 12'} />);
    expect(container.querySelector('em')).toBeNull();
    expect(container.textContent).toBe('3 * 4 = 12');
  });
});
