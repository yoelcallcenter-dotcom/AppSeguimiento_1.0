/**
 * Markdown.jsx — lector de documentos .md para la Documentación (HelpPanel).
 *
 * Por qué existe (post 1.10.1, pedido del usuario): la pestaña "Documentación"
 * mostraba README/CHANGELOG dentro de un <pre> en texto plano, así que toda la
 * sintaxis markdown se veía literal — "**texto**" con los dobles asteriscos y
 * "#..."" delante de cada título. Ahora el lector interpreta el md igual que un
 * visor .md de verdad: # títulos, **negrita**, *itálica*, listas, tablas,
 * bloques de código, citas y enlaces.
 *
 * Implementado a mano y sin dependencias nuevas (regla del proyecto): parsea
 * por bloques y devuelve React elements — nunca dangerouslySetInnerHTML — así
 * el contenido no puede inyectar HTML. Tokens de color vía var(--color-*)
 * para respetar el tema vigente.
 *
 * Soporte: # hasta ######, **negrita**, *itálica* o _itálica_, ***ambas***,
 * ~~tachado~~, `código inline`, [enlaces](url), listas -,*,+ y 1. con anidación
 * por indentación, bloques ``` (contenido literal, sin parsear), tablas | a |,
 * citas >, hr (---) y párrafos (los saltos de línea originales se conservan
 * con whitespace-pre-line).
 */
import React from 'react';

/* Estilos compartidos (tokens del tema, misma filosofía que HelpPanel). */
const CODE_INLINE = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '0.85em',
  backgroundColor: 'var(--color-surface2)',
  border: '1px solid var(--color-border)',
  borderRadius: 4,
  padding: '0 4px',
};

const PRE_BLOCK = {
  backgroundColor: 'var(--color-surface2)',
  border: '1px solid var(--color-border)',
  borderRadius: 6,
  padding: 10,
  overflowX: 'auto',
  fontSize: 12,
  lineHeight: 1.5,
  whiteSpace: 'pre',
  margin: 0,
};

const LINK = { color: 'var(--color-accent)', textDecoration: 'underline' };

const HEADING_COLOR = { color: 'var(--color-text)' };
const BODY_COLOR = { color: 'var(--color-text)' };
const MUTED_COLOR = { color: 'var(--color-text-muted)' };

/**
 * Parsea el texto "inline" de una línea (negrita, itálica, código, enlaces).
 * Tokenizador manual: busca el próximo marcador y exige su cierre; si no lo
 * hay, el marcador queda como texto literal (evita envolver asteriscos
 * sueltos). `\` escapa el siguiente carácter.
 */
function parseInline(text, keyBase = 'in') {
  const nodes = [];
  let plain = '';
  let i = 0;
  let n = 0;
  const flush = () => {
    if (plain) {
      nodes.push(plain);
      plain = '';
    }
  };

  while (i < text.length) {
    const ch = text[i];

    // Escape: \* \_ \[ etc. → el carácter literal.
    if (ch === '\\' && i + 1 < text.length) {
      plain += text[i + 1];
      i += 2;
      continue;
    }

    // Enlace [texto](url) — exige cierre y url sin espacios.
    if (ch === '[') {
      const close = text.indexOf('](', i);
      if (close !== -1) {
        const end = text.indexOf(')', close + 2);
        const label = text.slice(i + 1, close);
        const href = text.slice(close + 2, end);
        if (end !== -1 && label && href && !/\s/.test(href)) {
          flush();
          nodes.push(
            <a
              key={`${keyBase}-a${n++}`}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={LINK}
            >
              {parseInline(label, `${keyBase}-${n}`)}
            </a>
          );
          i = end + 1;
          continue;
        }
      }
      plain += ch;
      i += 1;
      continue;
    }

    // Énfasis: ` ** * _ ~~ (1 o 2 caracteres según marcador).
    if (ch === '`' || ch === '*' || ch === '_' || ch === '~') {
      // _ solo cuenta como delimitador al inicio de palabra (evita cortar
      // identificadores como some_field_name).
      if (ch === '_') {
        const prev = i === 0 ? ' ' : text[i - 1];
        if (!/[\s(]/.test(prev)) {
          plain += ch;
          i += 1;
          continue;
        }
      }
      const token = (ch === '*' || ch === '~') && text[i + 1] === ch ? ch + ch : ch;
      const closer = text.indexOf(token, i + token.length);
      // Sin cierre, o contenido vacío → literal (no hay énfasis que renderizar).
      if (closer === -1 || closer === i + token.length) {
        plain += ch;
        i += 1;
        continue;
      }
      const inner = text.slice(i + token.length, closer);
      flush();
      if (token === '`') {
        nodes.push(
          <code key={`${keyBase}-c${n++}`} style={CODE_INLINE}>
            {inner}
          </code>
        );
      } else if (token === '~~') {
        nodes.push(<del key={`${keyBase}-d${n++}`}>{parseInline(inner, `${keyBase}-${n}`)}</del>);
      } else if (token === '***') {
        nodes.push(
          <strong key={`${keyBase}-s${n++}`}>
            <em>{parseInline(inner, `${keyBase}-${n}`)}</em>
          </strong>
        );
      } else if (token === '**') {
        nodes.push(
          <strong key={`${keyBase}-s${n++}`}>{parseInline(inner, `${keyBase}-${n}`)}</strong>
        );
      } else {
        // * o _ → itálica (el contenido puede traer negrita anidada).
        nodes.push(<em key={`${keyBase}-e${n++}`}>{parseInline(inner, `${keyBase}-${n}`)}</em>);
      }
      i = closer + token.length;
      continue;
    }

    plain += ch;
    i += 1;
  }
  flush();
  return nodes;
}

/* ¿La línea abre un bloque nuevo? (para cortar párrafos sin regex duplicada) */
function isBlockStart(line) {
  return (
    /^\s{0,3}#{1,6}\s/.test(line) ||
    /^\s*```/.test(line) ||
    /^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(line) ||
    /^\s*>/.test(line) ||
    /^\s*([-*+]|\d+[.)])\s+/.test(line)
  );
}

/* Detecta fila separadora de tabla markdown (|---|:---:|). */
function isTableSeparator(line) {
  return (
    /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/.test(line) &&
    /-/.test(line) &&
    line.includes('|')
  );
}

/* " | a | b | " → ['a', 'b'] */
function splitRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

const LIST_RE = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;

/**
 * Parsea una lista (no ordenada u ordenada) con anidación por indentación.
 * Devuelve [elemento, índice de línea siguiente]. Las sub-líneas con indent
 * mayor pertenecen al último item (sub-lista o continuación) y se parsean en
 * forma recursiva con la indentación base dedenteada.
 */
function parseList(lines, start, keyBase) {
  const first = LIST_RE.exec(lines[start]);
  const baseIndent = first[1].length;
  const ordered = /\d/.test(first[2][0]);
  const items = [];
  let i = start;

  while (i < lines.length) {
    const m = LIST_RE.exec(lines[i]);
    if (m && m[1].length === baseIndent && /\d/.test(m[2][0]) === ordered) {
      items.push([m[3]]);
      i += 1;
    } else if (m && m[1].length > baseIndent) {
      // Continuación/ sub-nivel del último item: se guarda la línea CRUDA (sin
      // dedentar) para poder detectar después si es una sub-lista (fix: al
      // dedentar de antemano, "- sub" perdía su indent y se parseaba como
      // párrafo y no como sub-nivel).
      if (items.length) items[items.length - 1].push(lines[i]);
      i += 1;
    } else if (!m && lines[i].trim() && items.length) {
      // Párrafo de continuación pegado al item (indentado o no).
      items[items.length - 1].push(lines[i]);
      i += 1;
    } else {
      break;
    }
  }

  const tag = ordered ? 'ol' : 'ul';
  const content = items.map((itemLines, idx) => {
    const [head, ...rest] = itemLines;
    // Sub-líneas: si traen otro marcador de lista → sub-bloque (recursivo,
    // con la indentación base+2 removida); si no → párrafo de continuación.
    const hasSubList = rest.some((l) => LIST_RE.test(l));
    let children = parseInline(head, `${keyBase}-${idx}`);
    if (rest.length) {
      if (hasSubList) {
        const dedented = rest.map((l) => l.replace(new RegExp(`^ {0,${baseIndent + 2}}`), ''));
        children = [children, ...parseBlocks(dedented, `${keyBase}-${idx}-s`)]; // eslint-disable-line no-use-before-define
      } else {
        const joined = rest.join('\n');
        if (joined.trim()) {
          children = [
            children,
            <p key={`${keyBase}-${idx}-p`} className="whitespace-pre-line" style={{ margin: 0 }}>
              {parseInline(joined, `${keyBase}-${idx}-p`)}
            </p>,
          ];
        }
      }
    }
    return <li key={`${keyBase}-${idx}`}>{children}</li>;
  });

  return [
    React.createElement(
      tag,
      {
        key: `${keyBase}-list`,
        className: ordered ? 'list-decimal' : 'list-disc',
        style: { ...BODY_COLOR, paddingLeft: 22, margin: 0, display: 'list-item' },
      },
      content
    ),
    i,
  ];
}

/**
 * Parsea un array de líneas y devuelve los elementos de bloque resultuentes.
 * Orden por línea: fence de código → título → hr → tabla → cita → lista →
 * párrafo (líneas consecutivas no vacías agrupadas).
 */
function parseBlocks(lines, keyBase = 'b') {
  const blocks = [];
  let i = 0;
  let n = 0;
  const key = () => `${keyBase}-${n++}`;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    // Bloque de código con fence ``` — contenido literal (sin interpretar #, *...).
    const fence = /^\s*```/.test(line);
    if (fence) {
      const buf = [];
      i += 1;
      while (i < lines.length && !/^\s*```/.test(lines[i])) {
        buf.push(lines[i]);
        i += 1;
      }
      i += 1; // cierra el fence (o fin de documento)
      blocks.push(
        <pre key={key()} style={PRE_BLOCK}>
          <code style={{ fontFamily: 'inherit' }}>{buf.join('\n')}</code>
        </pre>
      );
      continue;
    }

    // Título # … ######
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const sizes = ['text-xl', 'text-lg', 'text-base', 'text-sm', 'text-xs', 'text-xs'];
      const weights = ['font-bold', 'font-bold', 'font-semibold', 'font-semibold', 'font-medium', 'font-medium'];
      blocks.push(
        React.createElement(
          `h${level}`,
          {
            key: key(),
            className: `${sizes[level - 1]} ${weights[level - 1]} ${level <= 2 ? 'mt-4 mb-1.5' : 'mt-3 mb-1'} ${level <= 2 ? 'pb-1' : ''}`,
            style: {
              ...HEADING_COLOR,
              borderBottom: level <= 2 ? '1px solid var(--color-border)' : undefined,
            },
          },
          parseInline(h[2], key())
        )
      );
      i += 1;
      continue;
    }

    // Línea horizontal (---, *** o ___).
    if (/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(line)) {
      blocks.push(<hr key={key()} style={{ border: 0, borderTop: '1px solid var(--color-border)', margin: '12px 0' }} />);
      i += 1;
      continue;
    }

    // Tabla: fila con | seguida de fila separadora.
    if (line.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const head = splitRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      blocks.push(
        <table key={key()} className="w-full" style={{ borderCollapse: 'collapse', ...BODY_COLOR, margin: '8px 0' }}>
          <thead>
            <tr>
              {head.map((c, ci) => (
                <th
                  key={ci}
                  className="text-left"
                  style={{
                    backgroundColor: 'var(--color-surface2)',
                    border: '1px solid var(--color-border)',
                    padding: '5px 8px',
                    fontSize: 12,
                    color: 'var(--color-text)',
                  }}
                >
                  {parseInline(c, `${key()}-h${ci}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri}>
                {r.map((c, ci) => (
                  <td
                    key={ci}
                    style={{
                      border: '1px solid var(--color-border)',
                      padding: '5px 8px',
                      fontSize: 12,
                    }}
                  >
                    {parseInline(c, `${key()}-c${ri}${ci}`)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
      continue;
    }

    // Cita (>) — se agrupan las líneas consecutivas y se limpia el prefijo.
    if (/^\s*>/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ''));
        i += 1;
      }
      blocks.push(
        <blockquote
          key={key()}
          style={{
            ...MUTED_COLOR,
            borderLeft: '3px solid var(--color-accent)',
            paddingLeft: 10,
            fontStyle: 'italic',
            margin: '8px 0',
          }}
        >
          {parseInline(buf.join(' '), key())}
        </blockquote>
      );
      continue;
    }

    // Lista con o sin ordenar (con anidación por indentación).
    if (LIST_RE.test(line)) {
      const [el, next] = parseList(lines, i, key());
      blocks.push(el);
      i = next;
      continue;
    }

    // Párrafo: líneas consecutivas hasta el próximo bloque; los saltos
    // originales se conservan (whitespace-pre-line), como en el archivo .md.
    const buf = [line];
    i += 1;
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) {
      // Una fila de tabla dentro del párrafo corta (misma detección que arriba).
      if (lines[i].includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) break;
      buf.push(lines[i]);
      i += 1;
    }
    blocks.push(
      <p key={key()} className="whitespace-pre-line" style={{ ...BODY_COLOR, margin: '6px 0', lineHeight: 1.6 }}>
        {parseInline(buf.join('\n'), key())}
      </p>
    );
  }

  return blocks;
}

/**
 * Componente: renderiza contenido markdown como documento formateado.
 * `content` es texto plano (DOC_README/DOC_CHANGELOG de docsContent.js).
 */
export function Markdown({ content = '' }) {
  const lines = String(content).replace(/\r\n/g, '\n').split('\n');
  return <div style={{ ...BODY_COLOR, fontSize: 13 }}>{parseBlocks(lines)}</div>;
}

export default Markdown;
