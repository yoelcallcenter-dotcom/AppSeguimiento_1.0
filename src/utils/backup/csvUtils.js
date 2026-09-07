/**
 * csvUtils.js
 * Utilidades para manejo de CSV (escape, parseo, etc.)
 * Fuente única de verdad para todas las funciones CSV.
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

const ORIGEN_MAP = { "Operador": "Operador", "Primera Atención": "Primera Atención", "Estudio Jurídico": "Estudio Jurídico" };

/**
 * Parsea reportes desde string
 * Soporta formato con tag [origen]: (fecha) [origen] texto
 */
export function parseReportesString(str) {
  if (!str || typeof str !== "string") return [];

  const items = str.split("//").filter((s) => s.trim());
  return items
    .map((item) => {
      const match = item.trim().match(/^\(([^)]+)\)\s*(?:\[([^\]]+)\]\s*)?(.*)/);
      if (match) {
        const origen = match[2] && ORIGEN_MAP[match[2]] ? ORIGEN_MAP[match[2]] : "Operador";
        return {
          fecha: match[1].trim(),
          texto: match[3].trim(),
          origen,
        };
      }
      return {
        fecha: "",
        texto: item.trim(),
        origen: "Operador",
      };
    })
    .filter((r) => r.texto);
}

/**
 * Parsea comentarios desde string
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
 * Parsea tags desde string
 */
export function parseTagsString(str) {
  if (!str || typeof str !== "string") return [];
  return str
    .split(";")
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Parsea notas vinculadas desde CSV
 */
export function parseNotasVinculadas(str) {
  if (!str || typeof str !== "string") return [];
  return str.split("//").map((s) => s.trim()).filter(Boolean).map((item) => {
    const m = item.match(/^([^:]+):\s*(.*)\s*\(([^)]*)\)$/);
    if (m) return { titulo: m[1].trim(), contenido: m[2].trim(), fecha: m[3].trim() || "" };
    return { titulo: "", contenido: item, fecha: "" };
  });
}

/**
 * Serializa notas vinculadas para CSV
 */
export function serializarNotasVinculadas(notas) {
  if (!notas || notas.length === 0) return "";
  return notas
    .map((n) => `${n.titulo || n.title || ""}: ${n.contenido || n.content || ""} (${n.fecha || ""})`)
    .join(" // ");
}

/**
 * Parsea agenda vinculada desde CSV
 */
export function parseAgendaVinculada(str) {
  if (!str || typeof str !== "string") return [];
  return str.split("//").map((s) => s.trim()).filter(Boolean).map((item) => {
    const m = item.match(/^(.+)\s*\(([^)]*)\)$/);
    if (m) return { titulo: m[1].trim(), fecha: m[2].trim() || "" };
    return { titulo: item.trim(), fecha: "" };
  });
}

/**
 * Serializa agenda vinculada para CSV
 */
export function serializarAgendaVinculada(eventos) {
  if (!eventos || eventos.length === 0) return "";
  return eventos
    .map((e) => {
      const fecha = e.fecha || (e.startDate ? e.startDate.slice(0, 10) : "");
      return `${e.titulo || e.title || ""} (${fecha})`;
    })
    .join(" // ");
}

/**
 * Parsea string de historial de cambios
 * Formato: "fecha|type|title|description; fecha2|type2|title2|description2"
 */
export function parseHistorialVinculada(str) {
  if (!str || typeof str !== "string") return [];
  return str
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((item) => {
      const parts = item.split("|");
      return {
        timestamp: parts[0] ? new Date(parts[0]).getTime() || Date.now() : Date.now(),
        type: parts[1] || "manual",
        title: parts[2] || "",
        description: parts[3] || "",
      };
    });
}
