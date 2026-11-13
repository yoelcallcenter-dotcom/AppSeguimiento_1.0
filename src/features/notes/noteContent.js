import { sanitizeHTML } from '../../utils/sanitize';

/**
 * Release 1.11.4 — utilidades de contenido de notas.
 *
 * Problema corregido: el editor Tiptap interpreta su contenido como HTML.
 * Las notas históricas y las plantillas guardan TEXTO PLANO con `\n`; al
 * cargarlas en Tiptap los saltos se colapsaban y todos los párrafos quedaban
 * en uno solo. Estas funciones normalizan texto→HTML SOLO para mostrar/editar,
 * sin reescribir el dato guardado hasta que el usuario guarde la nota.
 *
 * Reglas:
 *  - Si el contenido YA es HTML (notas editadas con Tiptap), se sanitiza y se
 *    conserva tal cual (párrafos, listas, negritas, <br>, etc.).
 *  - Si es texto plano, cada línea se preserva con <br> y cada línea vacía
 *    separa párrafos. Los saltos consecutivos legítimos no se eliminan.
 *  - Nunca se elimina texto: el contenido original sigue siendo la fuente.
 */

// Etiquetas que reconocemos como HTML "de verdad" (las mismas que permite
// utils/sanitize). Evita falsos positivos con textos que usan "<" y ">"
// (p. ej. "2 < 3 > 1").
const HTML_TAG_RE = /<\/?(?:p|br|div|strong|b|em|i|u|s|strike|sub|sup|h[1-6]|ul|ol|li|a|blockquote|code|pre|hr|span)\b[^>]*>/i;

export function esContenidoHTMLNota(value) {
  return typeof value === 'string' && HTML_TAG_RE.test(value);
}

function escaparHTMLNota(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Convierte el contenido almacenado de una nota al HTML que espera Tiptap.
 * Es idempotente: aplicarla sobre HTML solo sanitiza.
 */
export function contenidoNotaAEditor(content) {
  if (content === null || content === undefined) return '';
  const raw = String(content).replace(/\r\n?/g, '\n');
  if (!raw.trim()) return '';

  // HTML existente: se conserva la estructura (sanitizada).
  if (esContenidoHTMLNota(raw)) return sanitizeHTML(raw);

  // Texto plano: se quitan solo los saltos de los extremos (no aportan
  // contenido) y se preservan todos los internos.
  const limpio = raw.replace(/^\n+|\n+$/g, '');
  if (!limpio) return '';
  return limpio
    .split(/\n{2,}/)
    .map((parrafo) =>
      `<p>${parrafo
        .split('\n')
        .map(escaparHTMLNota)
        .join('<br>')}</p>`
    )
    .join('');
}

/**
 * Texto plano para previews (lista y palette de búsqueda).
 * Convierte <br> y cierres de bloque en espacios/nuevas líneas para que dos
 * párrafos no se peguen ("hola" + "mundo" → "hola mundo", no "holamundo").
 */
export function contenidoNotaATexto(content) {
  if (!content) return '';
  const raw = String(content).replace(/\r\n?/g, '\n');
  if (!esContenidoHTMLNota(raw)) return raw;
  return raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|li|h[1-6]|blockquote|pre)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
