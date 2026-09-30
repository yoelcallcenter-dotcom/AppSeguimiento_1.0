import { normalizarTexto } from "../../../utils/helpers";

/** Regex global (con reset por flag 'g' en cada recorrido vía matchAll/replace). */
export const LLAVE_OBJECION_REGEX = /\{OBJECION:([^}]+)\}/gi;

export function llavesObjecion(texto) {
  if (typeof texto !== "string" || !texto) return [];
  LLAVE_OBJECION_REGEX.lastIndex = 0;
  const vistas = new Map();
  for (const m of texto.matchAll(LLAVE_OBJECION_REGEX)) {
    const ref = String(m[1] || "").trim();
    if (!ref) continue;
    const clave = normalizarTexto(ref);
    if (!vistas.has(clave)) vistas.set(clave, ref);
  }
  return [...vistas.values()];
}

export function buscarObjecion(ref, objeciones = []) {
  const lista = Array.isArray(objeciones) ? objeciones : [];
  const limpia = String(ref || "").trim();
  if (!limpia) return null;
  const porId = lista.find((o) => o && o.id === limpia);
  if (porId) return porId;
  const clave = normalizarTexto(limpia);
  return lista.find((o) => o && normalizarTexto(o.titulo) === clave) || null;
}

/**
 * Reemplaza {OBJECION:id} (o {OBJECION:Título}) por "titulo\ncontenido".
 * Las llaves sin objeción asociada se dejan literales.
 */
export function resolverObjeciones(texto, objeciones = []) {
  if (typeof texto !== "string" || !texto.includes("{")) return texto;
  return texto.replace(LLAVE_OBJECION_REGEX, (match, ref) => {
    const obj = buscarObjecion(ref, objeciones);
    if (!obj) return match;
    const titulo = String(obj.titulo || "").trim();
    const contenido = String(obj.contenido || "").trim();
    return [titulo, contenido].filter(Boolean).join("\n") || match;
  });
}
