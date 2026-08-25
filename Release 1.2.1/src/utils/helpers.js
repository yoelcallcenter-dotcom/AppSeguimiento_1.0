import { sanitizeString } from "./sanitize";
import { DEFAULT_PLANTILLAS } from "./constants";
import { hoyISO, hoyDDMM, uid } from "./dateUtils";
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

export function parseFicha(texto) {
  const nombre = extraerCampo(texto, "NOMBRE").toUpperCase();
  const telefono = extraerCampo(texto, "TELEFONO");
  const localidad = extraerCampo(texto, "LOCALIDAD").toUpperCase();
  const artOriginal = extraerCampo(texto, "ART").toUpperCase();
  const aseguradora = artOriginal.replace(/\s*\([^)]*\)/g, "").trim();
  const ingreso = extraerCampo(texto, "INGRESO");
  const lesion = extraerCampo(texto, "LESION") || extraerCampo(texto, "LESIó");
  const profesion = extraerCampo(texto, "PROFESION");
  const cita = extraerCampo(texto, "CITA");
  const observaciones = extraerCampo(texto, "OBSERVACIONES");
  const tags = extraerCampo(texto, "TAGS")
    .split(/[;,]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const comentarios = extraerCampo(texto, "COMENTARIOS")
    .split(/\n+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((textoComentario) => ({
      fecha: hoyDDMM(),
      texto: textoComentario,
      usuario: "Usuario",
    }));
  return {
    nombre: sanitizeString(nombre),
    telefono: sanitizeString(telefono),
    localidad: sanitizeString(localidad),
    aseguradora: sanitizeString(aseguradora),
    ingreso: sanitizeString(ingreso),
    lesion: sanitizeString(lesion),
    profesion: sanitizeString(profesion),
    cita: sanitizeString(cita),
    observaciones: sanitizeString(observaciones),
    tags,
    comentarios,
    tipoIngreso: sugerirTipoIngreso(lesion),
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
