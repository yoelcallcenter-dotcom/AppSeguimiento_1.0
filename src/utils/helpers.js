import { sanitizeString } from "./sanitize";
import { DEFAULT_PLANTILLAS } from "./constants";
import { hoyISO, hoyDDMM, uid } from "./dateUtils";
import { getFichaFields } from "./catalogos";
export { hoyISO, uid };

export function normalizarTexto(s) {
  return (s || "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function primerNombre(nombreCompleto) {
  const partes = (nombreCompleto || "")
    .replace(/[-/]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (partes.length === 0) return "";
  return partes.length > 1 ? partes[1] : partes[0];
}

export function capitalizarSiMayus(texto) {
  const t = texto.trim();
  if (t && t === t.toUpperCase())
    return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
  return t;
}

export function extraerCampo(texto, tag) {
  const regex = new RegExp(
    tag + ":\\s*([\\s\\S]*?)(?=\\n[A-ZÁéíÓÚÑ\\s]+:|$)",
    "i"
  );
  const m = texto.match(regex);
  return m ? m[1].trim() : "";
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const RE_ETIQUETA_GENERICA = /^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{0,40}:/;

/**
 * Construye los detectores de etiqueta a partir de los campos configurados.
 * Cada detector ancla la palabra clave al inicio de una línea (tras optional
 * whitespace), seguida de ":" o "-", sobre el texto normalizado (minúsculas
 * y sin acentos). Se ordena de más larga a más corta y, a igual longitud,
 * por posición en la lista: así "FECHA CITA" gana sobre "CITA".
 */
function construirEtiquetas(campos) {
  const pares = [];
  campos.forEach((campo, orden) => {
    if (!campo || !campo.target) return;
    const keywords = Array.isArray(campo.keywords) ? campo.keywords : [];
    keywords.forEach((kw) => {
      const nk = normalizarTexto(kw);
      if (!nk) return;
      pares.push({
        orden,
        nk,
        regex: new RegExp("^" + escapeRegExp(nk) + "\\s*[:\\-]\\s*"),
      });
    });
  });
  pares.sort((a, b) => b.nk.length - a.nk.length || a.orden - b.orden);
  return pares;
}

function detectarEtiqueta(linea, etiquetas) {
  const sinEspacios = linea.replace(/^\s+/, "");
  const norm = normalizarTexto(sinEspacios);
  if (!norm) return null;
  for (const par of etiquetas) {
    const m = norm.match(par.regex);
    if (m) return { orden: par.orden, resto: sinEspacios.slice(m[0].length) };
  }
  return null;
}

/**
 * Recorre el texto línea por línea y acumula el valor de cada campo: la
 * primera ocurrencia de una etiqueta gana; una línea que parezca otra
 * etiqueta (genérica, en mayúsculas) cierra el valor en curso; el resto de
 * las líneas se anexan como continuación. Devuelve un Map orden por la
 * primera aparición de cada etiqueta en la ficha.
 */
function segmentarFicha(texto, etiquetas) {
  const valores = new Map();
  let actual = null;
  const lineas = (texto || "").split(/\r?\n/);
  for (const linea of lineas) {
    const det = detectarEtiqueta(linea, etiquetas);
    if (det) {
      if (!valores.has(det.orden)) {
        valores.set(det.orden, det.resto);
        actual = det.orden;
      } else {
        actual = null;
      }
      continue;
    }
    const sinEspacios = linea.replace(/^\s+/, "");
    if (actual !== null && RE_ETIQUETA_GENERICA.test(sinEspacios)) {
      actual = null;
      continue;
    }
    if (actual !== null) {
      valores.set(actual, valores.get(actual) + "\n" + linea);
    }
  }
  return valores;
}

function transformarValor(target, valor) {
  switch (target) {
    case "nombre":
    case "localidad":
      return valor.toUpperCase();
    case "aseguradora":
      return valor.toUpperCase().replace(/\s*\([^)]*\)/g, "").trim();
    case "tags":
      return valor
        .split(/[;,]+/)
        .map((t) => t.trim())
        .filter(Boolean);
    case "comentarios":
      return valor
        .split(/\n+/)
        .map((t) => t.trim())
        .filter(Boolean);
    default:
      return valor;
  }
}

export function parseFicha(texto, config) {
  const campos = getFichaFields(config);
  const etiquetas = construirEtiquetas(campos);
  const valores = segmentarFicha(texto, etiquetas);

  const bruto = {};
  for (const [orden, valorCrudo] of valores) {
    const campo = campos[orden];
    if (!campo || !campo.target) continue;
    if (bruto[campo.target] !== undefined) continue;
    const valor = (valorCrudo || "").trim();
    if (!valor) continue;
    bruto[campo.target] = transformarValor(campo.target, valor);
  }

  const observacionesBase =
    typeof bruto.observaciones === "string" ? bruto.observaciones : "";
  const horario = typeof bruto.horario === "string" ? bruto.horario.trim() : "";
  const observaciones =
    observacionesBase +
    (horario
      ? (observacionesBase ? ". " : "") + "Horario confirmado: " + horario
      : "");
  const comentarios = Array.isArray(bruto.comentarios)
    ? bruto.comentarios
    : [];

  return {
    nombre: sanitizeString(bruto.nombre || ""),
    telefono: sanitizeString(bruto.telefono || ""),
    localidad: sanitizeString(bruto.localidad || ""),
    aseguradora: sanitizeString(bruto.aseguradora || ""),
    ingreso: sanitizeString(bruto.ingreso || ""),
    lesion: sanitizeString(bruto.lesion || ""),
    profesion: sanitizeString(bruto.profesion || ""),
    cita: sanitizeString(bruto.cita || ""),
    observaciones: sanitizeString(observaciones),
    tags: Array.isArray(bruto.tags) ? bruto.tags : [],
    comentarios: comentarios.map((textoComentario) => ({
      fecha: hoyDDMM(),
      texto: textoComentario,
      usuario: "Usuario",
    })),
    tipoIngreso: sugerirTipoIngreso(bruto.lesion || ""),
  };
}

export function sugerirTipoIngreso(lesion) {
  const l = (lesion || "").toLowerCase();
  if (l.includes("cirugia") || l.includes("cirugía"))
    return "Accidente + Cirugía";
  if (l.includes("tratamiento") || l.includes("reposo"))
    return "Accidente + Tratamiento";
  return "";
}

export function generarConversacion(
  nombreCompleto,
  operador,
  horario,
  plantillas
) {
  const nombre = primerNombre(nombreCompleto) || "?";
  const op = operador?.trim() || "[operador]";
  const hora = horario?.trim() || "[horario]";
  const base = plantillas?.length ? plantillas : DEFAULT_PLANTILLAS;
  return base.map((t) =>
    (t || "")
      .split("{NOMBRE}")
      .join(nombre)
      .split("{OPERADOR}")
      .join(op)
      .split("{HORARIO}")
      .join(hora)
  );
}

export function casoVacio() {
  return {
    id: uid(),
    fecha: hoyISO(),
    nombre: "",
    telefono: "",
    localidad: "",
    aseguradora: "",
    profesion: "",
    ingreso: "",
    lesion: "",
    tipoIngreso: "",
    cita: "",
    estudioJuridico: "",
    estado: "Cita virtual",
    observaciones: "",
    horario: "",
    reporteHistory: [],
    comentarios: [],
    notasVinculadas: [],
    agendaVinculada: [],
    tags: [],
    fechaFirma: null,
    alertaFirmaEnviada: false,
  };
}
