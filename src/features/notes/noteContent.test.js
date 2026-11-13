import { describe, it, expect } from 'vitest';
import {
  contenidoNotaAEditor,
  contenidoNotaATexto,
  esContenidoHTMLNota,
} from './noteContent';

// Release 1.11.4: regresión de saltos de línea en notas.
// El editor Tiptap recibe HTML; las notas viejas y las plantillas guardan
// texto plano con \n. Antes se colapsaban todos los párrafos en uno.
describe('noteContent · normalización de contenido (1.11.4)', () => {
  it('convierte texto plano de una línea en un párrafo', () => {
    expect(contenidoNotaAEditor('Hola mundo')).toBe('<p>Hola mundo</p>');
  });

  it('conserva un salto simple como <br>', () => {
    expect(contenidoNotaAEditor('Linea 1\nLinea 2')).toBe(
      '<p>Linea 1<br>Linea 2</p>'
    );
  });

  it('convierte líneas vacías en párrafos separados', () => {
    expect(contenidoNotaAEditor('Parrafo 1\n\nParrafo 2')).toBe(
      '<p>Parrafo 1</p><p>Parrafo 2</p>'
    );
  });

  it('conserva varios párrafos y saltos internos', () => {
    expect(contenidoNotaAEditor('A\nB\n\nC\n\n\nD\nE')).toBe(
      '<p>A<br>B</p><p>C</p><p>D<br>E</p>'
    );
  });

  it('no interpreta como HTML un texto con < y > sueltos', () => {
    expect(contenidoNotaAEditor('2 < 3 > 1')).toBe('<p>2 &lt; 3 &gt; 1</p>');
  });

  it('escapa caracteres peligrosos del texto plano', () => {
    expect(contenidoNotaAEditor('<script>alert(1)</script>')).toBe(
      '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>'
    );
  });

  it('conserva el HTML existente y lo sanitiza', () => {
    expect(contenidoNotaAEditor('<p>Uno</p><p>Dos</p>')).toBe(
      '<p>Uno</p><p>Dos</p>'
    );
    expect(contenidoNotaAEditor('<p>Seguro</p><script>alert(1)</script>')).toBe(
      '<p>Seguro</p>'
    );
  });

  it('normaliza CRLF sin perder saltos', () => {
    expect(contenidoNotaAEditor('A\r\nB\r\n\r\nC')).toBe(
      '<p>A<br>B</p><p>C</p>'
    );
  });

  it('es idempotente sobre su propia salida', () => {
    const html = contenidoNotaAEditor('A\n\nB');
    expect(contenidoNotaAEditor(html)).toBe(html);
  });

  it('detecta HTML solo con etiquetas conocidas', () => {
    expect(esContenidoHTMLNota('<p>x</p>')).toBe(true);
    expect(esContenidoHTMLNota('2 < 3 > 1')).toBe(false);
  });

  it('genera previews sin pegar párrafos ni mostrar etiquetas', () => {
    expect(contenidoNotaATexto('<p>Hola</p><p>Mundo</p>')).toBe('Hola\nMundo');
    expect(contenidoNotaATexto('Linea 1\nLinea 2')).toBe('Linea 1\nLinea 2');
    expect(contenidoNotaATexto('')).toBe('');
  });

  it('decodifica entidades básicas en el preview', () => {
    expect(contenidoNotaATexto('<p>A &amp; B &lt; C</p>')).toBe('A & B < C');
  });
});
