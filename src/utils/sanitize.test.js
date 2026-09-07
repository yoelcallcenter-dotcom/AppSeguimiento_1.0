import { describe, it, expect } from 'vitest';
import { sanitizeHTML, sanitizeString, sanitizeObject } from './sanitize';

describe('sanitizeHTML', () => {
  it('permite tags HTML seguros', () => {
    const input = '<p>Hola <strong>mundo</strong></p>';
    expect(sanitizeHTML(input)).toBe(input);
  });

  it('permite atributos href, target, rel, class', () => {
    const input = '<a href="https://example.com" target="_blank" rel="noopener" class="link">Link</a>';
    expect(sanitizeHTML(input)).toBe(input);
  });

  it('elimina script', () => {
    expect(sanitizeHTML('<p>Hola</p><script>alert("xss")</script>')).toBe('<p>Hola</p>');
  });

  it('elimina iframe', () => {
    expect(sanitizeHTML('<iframe src="evil.com"></iframe>')).toBe('');
  });

  it('elimina event handlers', () => {
    expect(sanitizeHTML('<p onclick="alert(1)">Texto</p>')).toBe('<p>Texto</p>');
  });

  it('elimina onerror en img', () => {
    const result = sanitizeHTML('<img onerror="alert(1)" src="x">');
    expect(result).not.toContain('onerror');
    expect(result).not.toContain('alert');
  });

  it('no permite data attributes', () => {
    expect(sanitizeHTML('<p data-x="y">Texto</p>')).toBe('<p>Texto</p>');
  });

  it('devuelve non-string sin modificar', () => {
    expect(sanitizeHTML(42)).toBe(42);
    expect(sanitizeHTML(null)).toBe(null);
  });
});

describe('sanitizeString', () => {
  it('elimina todo HTML', () => {
    expect(sanitizeString('<p>Hola <strong>mundo</strong></p>')).toBe('Hola mundo');
  });

  it('elimina script', () => {
    expect(sanitizeString('<script>alert(1)</script>Hola')).toBe('Hola');
  });

  it('preserva texto plano', () => {
    expect(sanitizeString('Hola mundo')).toBe('Hola mundo');
  });

  it('devuelve non-string sin modificar', () => {
    expect(sanitizeString(123)).toBe(123);
  });
});

describe('sanitizeObject', () => {
  it('sanea strings en un objeto', () => {
    const input = { nombre: '<script>alert(1)</script>Juan', edad: 30 };
    const result = sanitizeObject(input);
    expect(result.nombre).toBe('Juan');
    expect(result.edad).toBe(30);
  });

  it('sanea recursivamente objetos anidados', () => {
    const input = { a: { b: '<script>alert(1)</script>Texto seguro' } };
    const result = sanitizeObject(input);
    expect(result.a.b).toBe('Texto seguro');
  });

  it('sanea arrays', () => {
    const input = ['<b>ok</b>', 'plain'];
    const result = sanitizeObject(input);
    expect(result[0]).toBe('ok');
    expect(result[1]).toBe('plain');
  });

  it('devuelve non-object sin modificar', () => {
    expect(sanitizeObject(null)).toBe(null);
    expect(sanitizeObject(42)).toBe(42);
  });
});
