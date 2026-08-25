/**
 * csvUtils.js
 * Utilidades para manejo de CSV (escape, parseo, etc.)
 */

/**
 * Neutraliza inyección de fórmulas (CSV injection) en valores exportados:
 * si un valor comienza con =, +, - o @, se antepone una comilla para que
 * las planillas lo traten como texto plano.
 */
export function sanitizeCSV(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/^[=+\-@]/.test(str.trim())) {
    return "'" + str;
  }
  return str;
}

/**
 * Escapa un valor para CSV
 */
export function escapeCSV(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);

  if (
    str.includes('"') ||
    str.includes(",") ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Desescapa un valor de CSV
 */
export function unescapeCSV(value) {
  if (!value) return "";
  let str = value.trim();

  if (str.startsWith('"') && str.endsWith('"')) {
    str = str.slice(1, -1).replace(/""/g, '"');
  }

  return str;
}

/**
 * Parsea una línea CSV respetando comillas
 */
export function parseCSVLine(line) {
  const result = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

/**
 * Parsea reportes desde string (legacy)
 */
export function parseReportesString(str) {
  if (!str || typeof str !== "string") return [];

  const items = str.split("//").filter((s) => s.trim());
  return items
    .map((item) => {
      const match = item.trim().match(/^\(([^)]+)\)\s*(.*)/);
      if (match) {
        return {
          fecha: match[1].trim(),
          texto: match[2].trim(),
        };
      }
      return {
        fecha: "",
        texto: item.trim(),
      };
    })
    .filter((r) => r.texto);
}

/**
 * Parsea comentarios desde string (legacy)
 */
export function parseComentariosString(str) {
  if (!str || typeof str !== "string") return [];

  const items = str.split("//").filter((s) => s.trim());
  return items
    .map((item) => {
      const match = item.trim().match(/^\(([^)]+)\)\s*(.*)/);
      if (match) {
        return {
          fecha: match[1].trim(),
          texto: match[2].trim(),
          usuario: "Usuario",
        };
      }
      return {
        fecha: new Date().toISOString(),
        texto: item.trim(),
        usuario: "Usuario",
      };
    })
    .filter((c) => c.texto);
}

/**
 * Parsea tags desde string (legacy)
 */
export function parseTagsString(str) {
  if (!str || typeof str !== "string") return [];
  return str
    .split(";")
    .map((t) => t.trim())
    .filter(Boolean);
}

export function parseNotasString(str) {
  if (!str || typeof str !== "string") return [];
  return str.split("//").map((s) => s.trim()).filter(Boolean).map((item) => {
    const m = item.match(/^([^:]+):\s*(.*)\s*\(([^)]*)\)$/);
    if (m) return { titulo: m[1].trim(), contenido: m[2].trim(), fecha: m[3].trim() || "" };
    return { titulo: "", contenido: item, fecha: "" };
  });
}

export function parseAgendaString(str) {
  if (!str || typeof str !== "string") return [];
  return str.split("//").map((s) => s.trim()).filter(Boolean).map((item) => {
    const m = item.match(/^(.+)\s*\(([^)]*)\)$/);
    if (m) return { titulo: m[1].trim(), fecha: m[2].trim() || "" };
    return { titulo: item.trim(), fecha: "" };
  });
}
