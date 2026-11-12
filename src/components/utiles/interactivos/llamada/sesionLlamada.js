/**
 * sesionLlamada.js (Release 1.11.2 — Modo llamada)
 *
 * Estado SERIALIZABLE de una llamada del Asistente Interactivo. Es el ÚNICO
 * motor de sesión: lo consumen el runner clásico (Vista rápida) y la pantalla
 * nueva de Modo llamada, así no hay dos implementaciones que se desincronicen
 * (requisito "no duplicar el motor").
 *
 * Decisiones y por qué:
 * - `camino` guarda TODAS las posiciones reales visitadas y `indice` apunta a
 *   la actual. Antes el runner solo guardaba el historial hacia atrás, así que
 *   al volver se perdía el rastro del camino posterior y era imposible avisar
 *   qué información se descartaría al cambiar una respuesta. Ahora el tramo
 *   posterior queda en `camino` (forward) y se puede comparar/truncar.
 * - `enFin` representa la pantalla virtual "fin del recorrido" sin inventar
 *   una etapa: `pasoId` queda en null y Atrás vuelve a la última posición real.
 * - `respuestas[clave] = { opcionId, autos }` guarda la opción confirmada y
 *   los campos autocompletados por esa opción (`autos` = campoId → valor).
 *   Así el cambio de respuesta puede limpiar SOLO lo automático que nadie
 *   editó y conservar lo escrito a mano (decisión de producto 1.11.2).
 * - Las funciones son puras: reciben la sesión y devuelven una sesión nueva.
 *   El hook `useSesionLlamada` es el que las conecta con React y storage.
 * - La serialización NO guarda copias del guion, solo ids y valores. Al
 *   retomar, `normalizarSesion` valida ids contra el guion actual; si algo ya
 *   no existe devuelve `ok:false` en vez de reanudar sobre datos rotos.
 */

import {
  resolverDestino,
  camposObligatoriosPendientes,
} from "../interactiveSpeechModel";

export const SESION_VERSION = 1;

// ---------------------------------------------------------------------------
// Lectores defensivos (toleran v1 y datos incompletos)
// ---------------------------------------------------------------------------

const esObjeto = (v) => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const pasosDe = (speech) => (Array.isArray(speech?.steps) ? speech.steps : []);

function preguntasDe(paso) {
  if (Array.isArray(paso?.preguntas)) return paso.preguntas;
  // Forma v1: opciones sueltas en la etapa → pregunta implícita. El id es
  // determinista (mismo criterio que el modelo) para no romper referencias.
  if (Array.isArray(paso?.opciones)) {
    return [{ id: `preg-${paso.id}`, texto: "", obligatoria: false, opciones: paso.opciones }];
  }
  return [];
}

const opcionesDe = (pregunta) =>
  Array.isArray(pregunta?.opciones) ? pregunta.opciones : [];
const camposDe = (paso) =>
  Array.isArray(paso?.camposRegistro) ? paso.camposRegistro : [];

const buscarPaso = (speech, pasoId) =>
  pasosDe(speech).find((p) => p && p.id === pasoId) || null;

function buscarPregunta(paso, preguntaIdx) {
  const preguntas = preguntasDe(paso);
  const idx = Number.isInteger(preguntaIdx) ? preguntaIdx : 0;
  return { preguntas, pregunta: preguntas[idx] || null, idx };
}

export function clavePosicion(pasoId, preguntaIdx) {
  return `${pasoId}|${Number.isInteger(preguntaIdx) ? preguntaIdx : 0}`;
}

export function claveAclaracion(pasoId, preguntaIdx, opcionId) {
  return `${clavePosicion(pasoId, preguntaIdx)}|${opcionId}`;
}

function parsearClave(clave) {
  const texto = String(clave || "");
  const ultimo = texto.lastIndexOf("|");
  if (ultimo === -1) return null;
  const pasoId = texto.slice(0, ultimo);
  const preguntaIdx = Number(texto.slice(ultimo + 1));
  if (!pasoId || !Number.isInteger(preguntaIdx)) return null;
  return { pasoId, preguntaIdx };
}

const ahoraISO = () => new Date().toISOString();

const tocar = (sesion, cambios = {}) => ({
  ...sesion,
  ...cambios,
  actualizadaEn: ahoraISO(),
});

// ---------------------------------------------------------------------------
// Creación y posición
// ---------------------------------------------------------------------------

export function crearSesion(speech) {
  const steps = pasosDe(speech);
  const inicio =
    (speech?.startStepId && steps.some((s) => s?.id === speech.startStepId)
      ? speech.startStepId
      : null) || steps[0]?.id || null;
  const marca = ahoraISO();
  return {
    v: SESION_VERSION,
    speechId: String(speech?.id || ""),
    // `version` del guion: la incrementa el modelo en cada edición
    // (conCambio). Se usa al retomar para avisar si el guion cambió.
    speechVersion: Number(speech?.version) || 0,
    iniciadaEn: marca,
    actualizadaEn: marca,
    pasoId: inicio,
    preguntaIdx: 0,
    camino: inicio ? [{ pasoId: inicio, preguntaIdx: 0 }] : [],
    indice: inicio ? 0 : -1,
    enFin: false,
    borradorOpcionId: "",
    respuestas: {},
    registro: {},
    aclaraciones: {},
    completadas: [],
    consultadas: [],
    notas: "",
    finalizada: false,
    estadoFinalId: "",
  };
}

export function posicionActual(sesion) {
  return {
    pasoId: sesion?.enFin ? null : sesion?.pasoId || null,
    preguntaIdx: sesion?.preguntaIdx || 0,
  };
}

export function respuestaDe(sesion, pasoId, preguntaIdx) {
  const clave = clavePosicion(pasoId, preguntaIdx);
  return sesion?.respuestas?.[clave] || null;
}

/** Posición siguiente ya visitada (para el análisis de impacto y pruebas). */
export function posicionSiguiente(sesion) {
  if (!sesion || sesion.enFin) return null;
  return sesion.camino?.[sesion.indice + 1] || null;
}

/** ¿La sesión tuvo alguna interacción? (montar no cuenta como pendiente). */
export function sesionTocada(sesion) {
  return Boolean(
    sesion && sesion.actualizadaEn && sesion.actualizadaEn !== sesion.iniciadaEn
  );
}

// ---------------------------------------------------------------------------
// Asignaciones automáticas (mismas reglas que el runner de 1.11.0)
// ---------------------------------------------------------------------------

function valorVacio(campo, v) {
  if (campo?.tipo === "seleccion-multiple") return !(Array.isArray(v) && v.length > 0);
  if (campo?.tipo === "si-no") return v !== "si" && v !== "no";
  return v === undefined || v === null || String(v).trim() === "";
}

/**
 * Aplica las asignaciones de una opción SOLO sobre campos vacíos. Devuelve el
 * registro nuevo y el mapa `autos` (campoId → valor) para poder revertirlas
 * sin tocar lo que el operador escribió a mano.
 */
export function aplicarAsignaciones(speech, pasoId, opcion, registro = {}) {
  const campos = camposDe(buscarPaso(speech, pasoId));
  const autos = {};
  (Array.isArray(opcion?.asignaciones) ? opcion.asignaciones : []).forEach((a) => {
    const campo = campos.find((c) => c && c.id === a?.campoId);
    if (!campo || !valorVacio(campo, registro[a.campoId])) return;
    autos[a.campoId] =
      campo.tipo === "seleccion-multiple"
        ? String(a.valor ?? "")
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : a.valor ?? "";
  });
  return { registro: { ...registro, ...autos }, autos };
}

const mismosValores = (a, b) => {
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
  }
  return a === b;
};

/** Limpia del registro los autos cuyo valor sigue intacto (no editados). */
function limpiarAutos(registro, autos) {
  const siguiente = { ...registro };
  Object.keys(autos || {}).forEach((campoId) => {
    if (mismosValores(siguiente[campoId], autos[campoId])) delete siguiente[campoId];
  });
  return siguiente;
}

// ---------------------------------------------------------------------------
// Navegación
// ---------------------------------------------------------------------------

/**
 * Mueve el puntero al destino del motor. Si el destino coincide con la
 * posición siguiente ya visitada, conserva el tramo posterior (volver a
 * avanzar sin cambiar nada no debe borrar el camino). Si no coincide, trunca
 * el futuro y agrega la posición nueva.
 */
function avanzarA(sesion, destino, extra = {}) {
  if (destino.fin) {
    return tocar(sesion, {
      ...extra,
      enFin: true,
      pasoId: null,
      preguntaIdx: 0,
      borradorOpcionId: "",
    });
  }
  const siguiente = { pasoId: destino.stepId, preguntaIdx: destino.preguntaIdx };
  const yaVisitada = sesion.camino?.[sesion.indice + 1];
  const coincide =
    yaVisitada &&
    yaVisitada.pasoId === siguiente.pasoId &&
    yaVisitada.preguntaIdx === siguiente.preguntaIdx;
  const camino = coincide
    ? sesion.camino
    : [...(sesion.camino || []).slice(0, sesion.indice + 1), siguiente];
  return tocar(sesion, {
    ...extra,
    camino,
    indice: coincide ? sesion.indice + 1 : camino.length - 1,
    pasoId: siguiente.pasoId,
    preguntaIdx: siguiente.preguntaIdx,
    enFin: false,
    borradorOpcionId: "",
  });
}

/** Registra la opción elegida como borrador (aún no confirmada). */
export function elegirOpcion(sesion, opcionId) {
  return tocar(sesion, { borradorOpcionId: opcionId || "" });
}

export function limpiarBorrador(sesion) {
  return tocar(sesion, { borradorOpcionId: "" });
}

/**
 * Avanza desde la posición actual. Orden de gates (idéntico al runner 1.11.0):
 * 1) campos obligatorios de la etapa, 2) opción que finaliza la llamada,
 * 3) motor `resolverDestino`, 4) guarda la respuesta y aplica asignaciones.
 *
 * Devuelve `{ sesion, evento }`; el evento es `gate`, `finaliza`, `avance`,
 * `fin` o `sin-paso`. El borrador se conserva si el gate bloquea.
 */
export function avanzar(sesion, speech) {
  const paso = buscarPaso(speech, sesion?.pasoId);
  if (!paso) return { sesion, evento: { tipo: "sin-paso" } };
  const { pregunta } = buscarPregunta(paso, sesion.preguntaIdx);
  const opciones = opcionesDe(pregunta);
  const opcion = sesion.borradorOpcionId
    ? opciones.find((o) => o && o.id === sesion.borradorOpcionId) || null
    : null;

  const pendientes = camposObligatoriosPendientes(
    speech,
    sesion.pasoId,
    sesion.registro
  );
  if (pendientes.length) {
    return { sesion, evento: { tipo: "gate", pendientes } };
  }

  if (opcion?.finalizaLlamada) {
    return {
      sesion,
      evento: { tipo: "finaliza", estadoFinalId: opcion.estadoFinalId || "" },
    };
  }

  let registro = sesion.registro;
  let autos = {};
  if (opcion) {
    const aplicado = aplicarAsignaciones(speech, sesion.pasoId, opcion, registro);
    registro = aplicado.registro;
    autos = aplicado.autos;
  }
  const respuestas = { ...sesion.respuestas };
  if (opcion) {
    const clave = clavePosicion(sesion.pasoId, sesion.preguntaIdx);
    const previa = respuestas[clave];
    // Volver a confirmar la MISMA opción (p. ej. tras "Atrás") no debe perder
    // el rastro de los campos autocompletados: se conservan los `autos`
    // anteriores y se suman los nuevos. `limpiarAutos` solo borra los que
    // siguen con el valor asignado, así que conservarlos es seguro aunque el
    // operador los haya editado a mano.
    respuestas[clave] = {
      opcionId: opcion.id,
      autos:
        previa?.opcionId === opcion.id
          ? { ...(previa.autos || {}), ...autos }
          : autos,
    };
  }
  const destino = resolverDestino(
    speech,
    sesion.pasoId,
    sesion.preguntaIdx,
    opcion
  );
  const nueva = avanzarA({ ...sesion, registro, respuestas }, destino);
  return {
    sesion: nueva,
    evento: { tipo: destino.fin ? "fin" : "avance" },
  };
}

/** Vuelve a la posición anterior conservando respuestas y registro. */
export function atras(sesion) {
  if (!sesion) return sesion;
  if (sesion.enFin) {
    const pos = sesion.camino?.[sesion.indice];
    if (!pos) return sesion;
    return tocar(sesion, {
      enFin: false,
      pasoId: pos.pasoId,
      preguntaIdx: pos.preguntaIdx,
      borradorOpcionId: "",
    });
  }
  if (sesion.indice <= 0) return sesion;
  const nuevoIndice = sesion.indice - 1;
  const pos = sesion.camino[nuevoIndice];
  return tocar(sesion, {
    indice: nuevoIndice,
    pasoId: pos.pasoId,
    preguntaIdx: pos.preguntaIdx,
    enFin: false,
    borradorOpcionId: "",
  });
}

export function puedeAtras(sesion) {
  return Boolean(sesion && (sesion.enFin || sesion.indice > 0));
}

/**
 * Salto manual a una etapa (selector "Ir a etapa"). Cuenta como paso visitado
 * y descarta el futuro que ya no corresponde a este recorrido.
 */
export function irAPaso(sesion, speech, stepId) {
  const paso = buscarPaso(speech, stepId);
  if (!paso) return sesion;
  const siguiente = { pasoId: stepId, preguntaIdx: 0 };
  const camino = [...(sesion.camino || []).slice(0, sesion.indice + 1), siguiente];
  return tocar(sesion, {
    camino,
    indice: camino.length - 1,
    pasoId: stepId,
    preguntaIdx: 0,
    enFin: false,
    borradorOpcionId: "",
  });
}

export function reiniciarSesion(sesion, speech) {
  const base = crearSesion(speech);
  // Conserva la identidad de la sesión pendiente (mismo speech) para que el
  // storage no acumule llamadas nuevas al reiniciar.
  return {
    ...base,
    iniciadaEn: sesion?.iniciadaEn || base.iniciadaEn,
    actualizadaEn: ahoraISO(),
  };
}

// ---------------------------------------------------------------------------
// Registro, notas, objeciones y finalización
// ---------------------------------------------------------------------------

export function setCampoRegistro(sesion, campoId, valor) {
  return tocar(sesion, { registro: { ...sesion.registro, [campoId]: valor } });
}

export function setAclaracionSesion(sesion, clave, texto) {
  return tocar(sesion, {
    aclaraciones: { ...sesion.aclaraciones, [clave]: texto },
  });
}

export function setNotasSesion(sesion, notas) {
  return tocar(sesion, { notas: String(notas ?? "") });
}

export function registrarConsultada(sesion, id) {
  if (!id || (sesion.consultadas || []).includes(id)) return sesion;
  return tocar(sesion, { consultadas: [...(sesion.consultadas || []), id] });
}

export function toggleCompletada(sesion, pasoId) {
  if (!pasoId) return sesion;
  const set = new Set(sesion.completadas || []);
  if (set.has(pasoId)) set.delete(pasoId);
  else set.add(pasoId);
  return tocar(sesion, { completadas: [...set] });
}

/**
 * Finaliza la llamada. Si hay una opción en borrador, la registra junto con
 * sus asignaciones para que el resumen y un retomado posterior sean fieles.
 */
export function finalizarSesion(sesion, speech, estadoFinalId = "") {
  const paso = buscarPaso(speech, sesion?.pasoId);
  let registro = sesion.registro;
  const respuestas = { ...sesion.respuestas };
  if (paso && sesion.borradorOpcionId) {
    const { pregunta } = buscarPregunta(paso, sesion.preguntaIdx);
    const opcion = opcionesDe(pregunta).find(
      (o) => o && o.id === sesion.borradorOpcionId
    );
    if (opcion) {
      const aplicado = aplicarAsignaciones(speech, sesion.pasoId, opcion, registro);
      registro = aplicado.registro;
      respuestas[clavePosicion(sesion.pasoId, sesion.preguntaIdx)] = {
        opcionId: opcion.id,
        autos: aplicado.autos,
      };
    }
  }
  return tocar(sesion, {
    registro,
    respuestas,
    finalizada: true,
    estadoFinalId: estadoFinalId || "",
    borradorOpcionId: "",
  });
}

// ---------------------------------------------------------------------------
// Cambio de respuesta anterior: análisis de impacto + aplicación conservadora
// ---------------------------------------------------------------------------

/** Índice en `camino` de la posición indicada, buscando desde la actual. */
function indiceDe(sesion, pasoId, preguntaIdx) {
  for (let i = Math.min(sesion.indice, sesion.camino.length - 1); i >= 0; i -= 1) {
    const p = sesion.camino[i];
    if (p.pasoId === pasoId && p.preguntaIdx === preguntaIdx) return i;
  }
  return -1;
}

/**
 * Calcula QUÉ se perdería al cambiar una respuesta, sin modificar nada.
 * El UI lo muestra antes de pedir confirmación.
 *
 * - `respuestasDescartadas`: respuestas posteriores del camino.
 * - `camposAuto`: autos posteriores (o de la respuesta cambiada) que siguen
 *   con el valor asignado y por lo tanto se pueden limpiar.
 * - `camposManual`: autos que el operador editó y se conservan.
 * - `cambiaElCamino`: el destino nuevo difiere del siguiente visitado.
 */
export function analizarCambio(sesion, speech, clave, opcionId) {
  const pos = parsearClave(clave);
  if (!sesion || !pos) {
    return { valido: false, cambiaElCamino: false, respuestasDescartadas: 0, camposAuto: [], camposManual: [] };
  }
  const paso = buscarPaso(speech, pos.pasoId);
  const { pregunta } = buscarPregunta(paso, pos.preguntaIdx);
  const opcion = opcionesDe(pregunta).find((o) => o && o.id === opcionId) || null;
  if (!paso || !pregunta || !opcion) {
    return { valido: false, cambiaElCamino: false, respuestasDescartadas: 0, camposAuto: [], camposManual: [] };
  }
  const idx = indiceDe(sesion, pos.pasoId, pos.preguntaIdx);
  if (idx === -1) {
    return { valido: false, cambiaElCamino: false, respuestasDescartadas: 0, camposAuto: [], camposManual: [] };
  }

  const anterior = respuestaDe(sesion, pos.pasoId, pos.preguntaIdx);
  const destino = resolverDestino(speech, pos.pasoId, pos.preguntaIdx, opcion);
  // Cambiar la opción SIEMPRE invalida el tramo posterior (aunque el destino
  // inmediato coincida: las respuestas siguientes se dieron con otra
  // respuesta previa). Volver a elegir la misma opción no hace nada.
  const cambiaElCamino = !anterior || anterior.opcionId !== opcionId;

  // Posiciones posteriores que se abandonan (solo si el destino cambia).
  const descartadas = cambiaElCamino ? sesion.camino.slice(idx + 1) : [];
  const respuestasDescartadas = descartadas.filter((p) =>
    respuestaDe(sesion, p.pasoId, p.preguntaIdx)
  ).length;

  // Autos afectados: la respuesta que se cambia + las respuestas posteriores.
  const autosAfectados = {};
  const claves = [clavePosicion(pos.pasoId, pos.preguntaIdx), ...descartadas.map((p) => clavePosicion(p.pasoId, p.preguntaIdx))];
  claves.forEach((c) => {
    const r = sesion.respuestas?.[c];
    if (r?.autos) Object.assign(autosAfectados, r.autos);
  });
  const camposAuto = [];
  const camposManual = [];
  Object.keys(autosAfectados).forEach((campoId) => {
    if (mismosValores(sesion.registro?.[campoId], autosAfectados[campoId])) {
      camposAuto.push(campoId);
    } else if (sesion.registro?.[campoId] !== undefined) {
      camposManual.push(campoId);
    }
  });

  return {
    valido: true,
    cambiaElCamino,
    respuestasDescartadas,
    camposAuto,
    camposManual,
    destino,
    opcion,
  };
}

/**
 * Aplica el cambio de una respuesta anterior de forma CONSERVADORA:
 * - trunca el camino posterior al punto editado;
 * - elimina las respuestas de ese tramo;
 * - limpia solo los autos que siguen intactos (lo escrito a mano se conserva);
 * - registra la respuesta nueva y avanza con el motor.
 *
 * Devuelve `{ sesion, evento }` igual que `avanzar`; si el gate bloquea, la
 * respuesta nueva queda registrada y la posición no avanza.
 */
export function aplicarCambio(sesion, speech, clave, opcionId) {
  const analisis = analizarCambio(sesion, speech, clave, opcionId);
  if (!analisis.valido) return { sesion, evento: { tipo: "invalido" } };
  const pos = parsearClave(clave);
  const idx = indiceDe(sesion, pos.pasoId, pos.preguntaIdx);
  if (idx === -1) return { sesion, evento: { tipo: "invalido" } };

  // Camino truncado al punto editado (se vuelve a avanzar desde ahí).
  const caminoFinal = (sesion.camino || []).slice(0, idx + 1);

  // Respuestas: fuera las del tramo abandonado y la vieja del punto editado.
  const respuestas = { ...sesion.respuestas };
  const clavesEnCamino = new Set(
    caminoFinal.map((p) => clavePosicion(p.pasoId, p.preguntaIdx))
  );
  Object.keys(respuestas).forEach((c) => {
    const p = parsearClave(c);
    if (!p) return;
    const esElPuntoEditado =
      p.pasoId === pos.pasoId && p.preguntaIdx === pos.preguntaIdx;
    if (!clavesEnCamino.has(c) || esElPuntoEditado) delete respuestas[c];
  });

  // Registro: limpiar autos afectados SOLO si siguen con el valor asignado.
  const autosAAfectar = {};
  [
    clavePosicion(pos.pasoId, pos.preguntaIdx),
    ...sesion.camino
      .slice(idx + 1)
      .map((p) => clavePosicion(p.pasoId, p.preguntaIdx)),
  ].forEach((c) => {
    const r = sesion.respuestas?.[c];
    if (r?.autos) Object.assign(autosAAfectar, r.autos);
  });
  const registro = limpiarAutos({ ...sesion.registro }, autosAAfectar);

  // La respuesta nueva queda como BORRADOR: `avanzar` aplica sus asignaciones
  // (sobre campos vacíos) y la confirma con el gate de obligatorios. Así los
  // `autos` se registran una sola vez y se pueden revertir en el futuro.
  respuestas[clavePosicion(pos.pasoId, pos.preguntaIdx)] = {
    opcionId,
    autos: {},
  };

  const base = tocar(sesion, {
    camino: caminoFinal,
    indice: caminoFinal.length - 1,
    pasoId: pos.pasoId,
    preguntaIdx: pos.preguntaIdx,
    enFin: false,
    borradorOpcionId: opcionId,
    respuestas,
    registro,
  });

  // Confirmar el avance desde la posición editada (gate incluido).
  return avanzar(base, speech);
}

// ---------------------------------------------------------------------------
// Serialización y retomado
// ---------------------------------------------------------------------------

export function serializarSesion(sesion) {
  if (!sesion) return null;
  // Copia JSON-safe: el storage no debe recibir Sets ni referencias externas.
  return JSON.parse(JSON.stringify({ ...sesion, v: SESION_VERSION }));
}

const posicionValida = (speech, pasoId, preguntaIdx) => {
  const paso = buscarPaso(speech, pasoId);
  if (!paso) return null;
  const preguntas = preguntasDe(paso);
  const idx = Number.isInteger(preguntaIdx) ? preguntaIdx : 0;
  if (idx < 0 || (preguntas.length > 0 && idx >= preguntas.length)) return null;
  return { pasoId, preguntaIdx: idx };
};

/**
 * Valida y sanea una sesión guardada contra el guion ACTUAL.
 * Devuelve `{ ok, sesion, guionCambiado, motivo }`.
 *
 * Casos rechazados (no se retoma a ciegas): formato desconocido, otro speech,
 * etapa/pregunta inexistente, opción elegida inexistente. Si el guion solo
 * cambió de versión pero los ids siguen válidos, `ok:true` + aviso.
 */
export function normalizarSesion(raw, speech) {
  if (!esObjeto(raw) || raw.v !== SESION_VERSION) {
    return { ok: false, motivo: "formato-desconocido", sesion: null };
  }
  if (!esObjeto(speech) || !Array.isArray(speech.steps)) {
    return { ok: false, motivo: "sin-guion", sesion: null };
  }
  if (String(raw.speechId || "") !== String(speech.id || "")) {
    return { ok: false, motivo: "otro-speech", sesion: null };
  }
  if (!pasosDe(speech).length) {
    return { ok: false, motivo: "guion-sin-etapas", sesion: null };
  }

  const base = crearSesion(speech);
  const guionCambiado = (Number(raw.speechVersion) || 0) !== (Number(speech.version) || 0);

  const enFinRaw = Boolean(raw.enFin) || raw.pasoId === null;
  const posRaw = enFinRaw ? null : posicionValida(speech, raw.pasoId, raw.preguntaIdx);
  if (!enFinRaw && !posRaw) {
    return { ok: false, motivo: "posicion-inexistente", sesion: null };
  }

  // Camino saneado: se descartan posiciones rotas y se garantiza que la
  // posición actual esté en el índice indicado.
  const camino = (Array.isArray(raw.camino) ? raw.camino : [])
    .map((p) => (esObjeto(p) ? posicionValida(speech, p.pasoId, p.preguntaIdx) : null))
    .filter(Boolean);
  if (posRaw) {
    const idx = camino.findIndex(
      (p) => p.pasoId === posRaw.pasoId && p.preguntaIdx === posRaw.preguntaIdx
    );
    if (idx === -1) camino.push(posRaw);
  }
  if (!camino.length && !posRaw) camino.push(...base.camino);
  let indice = Number.isInteger(raw.indice) ? raw.indice : camino.length - 1;
  indice = Math.max(0, Math.min(indice, camino.length - 1));
  if (posRaw) {
    const idx = camino.findIndex(
      (p) => p.pasoId === posRaw.pasoId && p.preguntaIdx === posRaw.preguntaIdx
    );
    if (idx !== -1) indice = idx;
  }

  // Respuestas: solo las que siguen apuntando a una opción existente.
  const respuestas = {};
  Object.keys(esObjeto(raw.respuestas) ? raw.respuestas : {}).forEach((clave) => {
    const p = parsearClave(clave);
    if (!p) return;
    const paso = buscarPaso(speech, p.pasoId);
    if (!paso) return;
    const { pregunta } = buscarPregunta(paso, p.preguntaIdx);
    const r = raw.respuestas[clave];
    const opcion = opcionesDe(pregunta).find((o) => o && o.id === r?.opcionId);
    if (!opcion) return;
    respuestas[clave] = { opcionId: opcion.id, autos: esObjeto(r.autos) ? { ...r.autos } : {} };
  });

  const completadas = (Array.isArray(raw.completadas) ? raw.completadas : []).filter(
    (id) => pasosDe(speech).some((p) => p.id === id)
  );

  const pasoActual = posRaw ? buscarPaso(speech, posRaw.pasoId) : null;
  const { pregunta: preguntaActual } = pasoActual
    ? buscarPregunta(pasoActual, posRaw.preguntaIdx)
    : { pregunta: null };
  const borrador = opcionesDe(preguntaActual).some((o) => o?.id === raw.borradorOpcionId)
    ? raw.borradorOpcionId
    : "";

  const estadoFinalId = (Array.isArray(speech.estadosFinales) ? speech.estadosFinales : []).some(
    (e) => e?.id === raw.estadoFinalId
  )
    ? raw.estadoFinalId
    : "";

  const sesion = {
    ...base,
    speechVersion: Number(raw.speechVersion) || base.speechVersion,
    iniciadaEn: typeof raw.iniciadaEn === "string" ? raw.iniciadaEn : base.iniciadaEn,
    actualizadaEn:
      typeof raw.actualizadaEn === "string" ? raw.actualizadaEn : base.actualizadaEn,
    pasoId: posRaw ? posRaw.pasoId : null,
    preguntaIdx: posRaw ? posRaw.preguntaIdx : 0,
    camino,
    indice,
    enFin: enFinRaw,
    borradorOpcionId: borrador,
    respuestas,
    registro: esObjeto(raw.registro) ? { ...raw.registro } : {},
    aclaraciones: esObjeto(raw.aclaraciones) ? { ...raw.aclaraciones } : {},
    completadas,
    consultadas: (Array.isArray(raw.consultadas) ? raw.consultadas : []).filter(
      (id) => typeof id === "string"
    ),
    notas: typeof raw.notas === "string" ? raw.notas : "",
    finalizada: Boolean(raw.finalizada),
    estadoFinalId,
  };
  return { ok: true, sesion, guionCambiado, motivo: "" };
}

export function deserializarSesion(raw, speech) {
  return normalizarSesion(raw, speech);
}
