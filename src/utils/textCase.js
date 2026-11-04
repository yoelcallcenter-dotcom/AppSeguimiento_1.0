/**
 * textCase.js (v1.10.11)
 * Transformaciones de texto estilo mayusculasminusculas.ar para la nueva
 * toolbar de Notas y Reportes.
 *
 * Motivo: los operadores pegan texto de fuentes externas con un formato
 * inconsistente (todo en mayúsculas, minúsculas o espacios dobles). La app
 * ofrece 6 modos de conversión sin salir del editor.
 *
 * Decisiones de diseño (documentadas para no "adivinarlas" después):
 * - `sentence` (Tipo oración): pasa TODO a minúsculas y luego sube la letra
 *   de cada inicio de oración (inicio del texto, tras . ! ? o salto de línea).
 *   Los signos invertidos (¿ ¡) no cortan la oración: el primer LETRA
 *   después del inicio es la que sube. Un dígito "consume" el turno de
 *   mayúscula ("hola. 5 letras" → "Hola. 5 letras", no "5 Letras").
 * - `title` (Tipo Título): baja todo y sube la primera letra de cada "palabra",
 *   donde palabra empieza tras cualquier carácter que NO sea letra (inicio,
 *   espacios, signos, guiones, dígitos). Sin lista de conectores: todas las
 *   palabras se capitalizan.
 * - `alter` (aLtErNaR): alterna minúscula/mayúscula por LETRA, arrancando en
 *   minúscula (literal "aLtErNaR"); los no-letras no avanzan el conmutador.
 * - `spaces` (quitar espacios de más): por línea colapsa espacios/tabs
 *   repetidos a uno y recorta los extremos; al final recorta el texto entero
 *   y limita 3+ saltos de línea consecutivos a 2 (no borra líneas vacías
 *   internas: eso no es "espacio de más", es formato del usuario).
 *
 * Sin dependencias nuevas; texto no-string se trata como "".
 */

/** Modos disponibles (etiqueta corta para el botón + título para `title`). */
export const MODOS_TRANSFORMACION = [
  { modo: "upper", etiqueta: "ABC", titulo: "MAYÚSCULAS" },
  { modo: "lower", etiqueta: "abc", titulo: "minúsculas" },
  { modo: "sentence", etiqueta: "Oración", titulo: "Tipo oración" },
  { modo: "title", etiqueta: "Título", titulo: "Tipo Título" },
  { modo: "alter", etiqueta: "aLtErNaR", titulo: "Alternar mayúsculas y minúsculas" },
  { modo: "spaces", etiqueta: "Quitar espacios", titulo: "Quitar espacios de más" },
];

const FIN_ORACION = /[.!?]/;

function aOraciones(t) {
  const bajo = t.toLowerCase();
  let subeProxima = true; // inicio del texto = inicio de oración
  let out = "";
  for (const ch of bajo) {
    if (FIN_ORACION.test(ch) || ch === "\n") {
      subeProxima = true;
      out += ch;
      continue;
    }
    if (/[a-záéíóúüñ]/i.test(ch)) {
      out += subeProxima ? ch.toUpperCase() : ch;
      subeProxima = false;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      // el turno de mayúscula lo "usa" el dígito (ver header).
      if (subeProxima) subeProxima = false;
      out += ch;
      continue;
    }
    out += ch;
  }
  return out;
}

function aTitulo(t) {
  const bajo = t.toLowerCase();
  let out = "";
  let prev = "";
  for (const ch of bajo) {
    const esLetra = /[a-záéíóúüñ]/i.test(ch);
    if (esLetra && !/[a-záéíóúüñ]/i.test(prev)) {
      out += ch.toUpperCase();
    } else {
      out += ch;
    }
    prev = ch;
  }
  return out;
}

function alternar(t) {
  let sube = false; // "aLtErNaR": la primera letra va en minúscula
  let out = "";
  for (const ch of t) {
    if (/[a-záéíóúüñ]/i.test(ch)) {
      out += sube ? ch.toUpperCase() : ch.toLowerCase();
      sube = !sube;
    } else {
      out += ch; // los no-letras no afectan el conmutador
    }
  }
  return out;
}

function quitarEspacios(t) {
  return t
    .split("\n")
    .map((linea) => linea.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Aplica un modo de transformación sobre el texto.
 * @param {string} texto texto de entrada (se tolera null/undefined)
 * @param {"upper"|"lower"|"sentence"|"title"|"alter"|"spaces"} modo
 * @returns {string} texto transformado (siempre string)
 */
export function applyCaseMode(texto, modo) {
  const t = typeof texto === "string" ? texto : "";
  switch (modo) {
    case "upper":
      return t.toUpperCase();
    case "lower":
      return t.toLowerCase();
    case "sentence":
      return aOraciones(t);
    case "title":
      return aTitulo(t);
    case "alter":
      return alternar(t);
    case "spaces":
      return quitarEspacios(t);
    default:
      return t;
  }
}

export default applyCaseMode;
