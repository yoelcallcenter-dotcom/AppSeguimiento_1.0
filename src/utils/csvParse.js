/**
 * csvParse.js
 * Parser CSV compartido y robusto para todos los flujos de importación.
 *
 * - Respeta comillas: un campo entre comillas puede contener comas, comillas
 *   escapadas ("") y saltos de línea sin romper el parseo.
 * - Normaliza finales de línea (CRLF / CR / LF) y elimina el BOM.
 * - Repara columnas (recomendado): si una fila tiene MÁS celdas que
 *   encabezados (p.ej. comas "peladas" dentro de textos sin comillas, típico
 *   de CSVs re-editados en Excel o exportados por otros sistemas), fusiona el
 *   excedente en la última columna conservando las comas. Si tiene MENOS,
 *   completa con cadenas vacías.
 */

const STRIP_BOM = /^\uFEFF/;

function parseLine(line) {
  const vals = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        q = !q;
      }
    } else if (ch === "," && !q) {
      vals.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  vals.push(cur);
  return vals;
}

/**
 * Ajusta una fila al número esperado de columnas.
 * - Más celdas que target: fusiona el excedente en la última columna con ",".
 * - Menos celdas que target: completa con cadenas vacías.
 */
export function normalizeRow(row, target) {
  if (target <= 0 || row.length === target) return row;
  const out = [];
  for (let i = 0; i < target; i++) {
    if (i === target - 1) {
      out.push(row.slice(target - 1).join(","));
    } else {
      out.push(row[i] !== undefined ? row[i] : "");
    }
  }
  return out;
}

/**
 * Parsea texto CSV a { headers, rows }.
 * @param {string} text - Contenido CSV.
 * @param {{ repairColumns?: boolean }} options
 * @returns {{ headers: string[], rows: string[][] }}
 */
export function parseCSV(text, options = {}) {
  const { repairColumns = true } = options;
  const content = String(text ?? "").replace(STRIP_BOM, "");

  const lines = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === '"') {
      if (inQuotes && content[i + 1] === '"') {
        current += '""';
        i++;
      } else {
        current += '"';
        inQuotes = !inQuotes;
      }
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && content[i + 1] === "\n") i++;
      if (current.trim()) lines.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) lines.push(current.trim());

  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = parseLine(lines[0]).map((h) => h.trim());
  let rows = lines.slice(1).map(parseLine);

  if (repairColumns && headers.length > 0) {
    rows = rows.map((row) => normalizeRow(row, headers.length));
  }
  rows = rows.map((row) => row.map((cell) => cell.trim()));

  return { headers, rows };
}
