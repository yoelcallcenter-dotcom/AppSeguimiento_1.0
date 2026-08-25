import { normalizarTexto } from "../utils/helpers";
import { ESTUDIOS_GL, CONTEXTOS_PRIORIDAD_INVERTIDA } from "../utils/constants";

export function esEstudioGL(nombreEstudio) {
  return ESTUDIOS_GL.includes(normalizarTexto(nombreEstudio));
}

export function elegirPorPrioridad(candidatos, contexto) {
  if (!candidatos.length) return null;
  if (candidatos.length === 1) return candidatos[0];

  const invertir = CONTEXTOS_PRIORIDAD_INVERTIDA.includes(
    normalizarTexto(contexto)
  );
  const gl = candidatos.filter((c) => esEstudioGL(c.estudio));
  const primart = candidatos.filter((c) => !esEstudioGL(c.estudio));

  if (invertir) return primart[0] || gl[0];
  return gl[0] || primart[0];
}

function listaLocalidades(m) {
  return (m.localidades || "")
    .split(/[,;]/)
    .map((x) => normalizarTexto(x))
    .filter(Boolean);
}

export function matchEstudio(texto, mapeo) {
  if (!texto || !mapeo?.length) return null;

  const raw = texto.trim();
  if (!raw) return null;

  const [ciudadRaw, ...restoRaw] = raw.split(",");
  const ciudad = normalizarTexto(ciudadRaw);
  const provincia = normalizarTexto(restoRaw.join(","));

  let candidatos = mapeo.filter((m) => listaLocalidades(m).includes(ciudad));
  if (candidatos.length) return elegirPorPrioridad(candidatos, ciudad);

  candidatos = mapeo.filter((m) =>
    listaLocalidades(m).some((l) => l.includes(ciudad) || ciudad.includes(l))
  );
  if (candidatos.length) return elegirPorPrioridad(candidatos, ciudad);

  const provinciaBusqueda = provincia || (!restoRaw.length ? ciudad : "");
  if (
    provinciaBusqueda &&
    provinciaBusqueda !== "buenos aires" &&
    provinciaBusqueda !== "caba"
  ) {
    candidatos = mapeo.filter(
      (m) => normalizarTexto(m.provincia) === provinciaBusqueda
    );
    if (candidatos.length)
      return elegirPorPrioridad(candidatos, provinciaBusqueda);

    candidatos = mapeo.filter((m) =>
      normalizarTexto(m.provincia).includes(provinciaBusqueda)
    );
    if (candidatos.length)
      return elegirPorPrioridad(candidatos, provinciaBusqueda);
  }

  return null;
}
