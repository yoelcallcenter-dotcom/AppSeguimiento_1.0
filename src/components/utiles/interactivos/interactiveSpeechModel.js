import { sanitizeString } from "../../../utils/sanitize";

/**
 * interactiveSpeechModel.js
 * Modelo determinístico de Speechs Interactivos: speech → pasos → opciones
 * con conexiones (targetStepId). Funciones puras: todas devuelven un speech
 * nuevo (inmutable) para encajar con setState de useStorage. Un paso sin
 * opciones es un final del recorrido.
 */

export function nuevoId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function reindexar(steps) {
  return steps.map((paso, i) => ({
    ...paso,
    orden: i,
    opciones: paso.opciones.map((op, j) => ({ ...op, orden: j })),
  }));
}

function conCambio(speech) {
  return {
    ...speech,
    fechaModificacion: new Date().toISOString(),
    version: (speech.version || 0) + 1,
  };
}

export function crearPaso(titulo = "", contenido = "") {
  return {
    id: nuevoId(),
    titulo: sanitizeString(titulo.trim()),
    contenido: sanitizeString(contenido),
    orden: 0,
    opciones: [],
  };
}

export function crearOpcion(texto, targetStepId = null) {
  return {
    id: nuevoId(),
    texto: sanitizeString(texto.trim()),
    targetStepId,
    orden: 0,
  };
}

export function crearSpeechInteractivo({ nombre, descripcion = "" }) {
  const ahora = new Date().toISOString();
  const inicio = crearPaso("", "");
  return {
    id: nuevoId(),
    nombre: sanitizeString(String(nombre).trim()),
    descripcion: sanitizeString(String(descripcion).trim()),
    fechaCreacion: ahora,
    fechaModificacion: ahora,
    version: 1,
    startStepId: inicio.id,
    steps: [inicio],
  };
}

export function actualizarInfo(speech, { nombre, descripcion }) {
  return conCambio({
    ...speech,
    nombre: sanitizeString(String(nombre ?? speech.nombre).trim()),
    descripcion: sanitizeString(String(descripcion ?? speech.descripcion).trim()),
  });
}

export function agregarPaso(speech) {
  const paso = crearPaso("", "");
  return conCambio({
    ...speech,
    steps: reindexar([...speech.steps, paso]),
    startStepId: speech.startStepId || paso.id,
  });
}

export function duplicarPaso(speech, stepId) {
  const idx = speech.steps.findIndex((s) => s.id === stepId);
  if (idx === -1) return speech;
  const original = speech.steps[idx];
  const copia = {
    ...original,
    id: nuevoId(),
    titulo: original.titulo ? `${original.titulo} (copia)` : "",
    opciones: original.opciones.map((op) => ({ ...op, id: nuevoId() })),
  };
  const steps = [...speech.steps];
  steps.splice(idx + 1, 0, copia);
  return conCambio({ ...speech, steps: reindexar(steps) });
}

export function eliminarPaso(speech, stepId, destinoReemplazo = null) {
  const valido =
    destinoReemplazo &&
    destinoReemplazo !== stepId &&
    speech.steps.some((s) => s.id === destinoReemplazo)
      ? destinoReemplazo
      : null;
  const steps = speech.steps
    .filter((s) => s.id !== stepId)
    .map((paso) => ({
      ...paso,
      opciones: paso.opciones.map((op) =>
        op.targetStepId === stepId ? { ...op, targetStepId: valido } : op
      ),
    }));
  const startStepId =
    speech.startStepId === stepId
      ? steps.length
        ? steps[0].id
        : null
      : speech.startStepId;
  return conCambio({ ...speech, steps: reindexar(steps), startStepId });
}

export function referenciasA(speech, stepId) {
  const refs = [];
  speech.steps.forEach((paso) => {
    if (paso.id === stepId) return;
    paso.opciones.forEach((op) => {
      if (op.targetStepId === stepId) refs.push({ stepId: paso.id, opcionId: op.id });
    });
  });
  return refs;
}

export function moverPaso(speech, stepId, delta) {
  const idx = speech.steps.findIndex((s) => s.id === stepId);
  const destino = idx + delta;
  if (idx === -1 || destino < 0 || destino >= speech.steps.length) return speech;
  const steps = [...speech.steps];
  const [movido] = steps.splice(idx, 1);
  steps.splice(destino, 0, movido);
  return conCambio({ ...speech, steps: reindexar(steps) });
}

export function moverOpcion(speech, stepId, opcionId, delta) {
  const idx = speech.steps.findIndex((s) => s.id === stepId);
  if (idx === -1) return speech;
  const paso = speech.steps[idx];
  const pos = paso.opciones.findIndex((op) => op.id === opcionId);
  const destino = pos + delta;
  if (pos === -1 || destino < 0 || destino >= paso.opciones.length) return speech;
  const opciones = [...paso.opciones];
  const [movida] = opciones.splice(pos, 1);
  opciones.splice(destino, 0, movida);
  const steps = speech.steps.map((s, i) => (i === idx ? { ...s, opciones } : s));
  return conCambio({ ...speech, steps: reindexar(steps) });
}

export function duplicarOpcion(speech, stepId, opcionId) {
  const idx = speech.steps.findIndex((s) => s.id === stepId);
  if (idx === -1) return speech;
  const paso = speech.steps[idx];
  const pos = paso.opciones.findIndex((op) => op.id === opcionId);
  if (pos === -1) return speech;
  const copia = { ...paso.opciones[pos], id: nuevoId() };
  const opciones = [...paso.opciones];
  opciones.splice(pos + 1, 0, copia);
  const steps = speech.steps.map((s, i) => (i === idx ? { ...s, opciones } : s));
  return conCambio({ ...speech, steps: reindexar(steps) });
}

export function crearPasoConectado(speech, stepIdOrigen, opcionId) {
  const origen = speech.steps.find((s) => s.id === stepIdOrigen);
  if (!origen) return speech;
  if (!origen.opciones.some((op) => op.id === opcionId)) return speech;
  const nuevo = crearPaso("", "");
  const steps = speech.steps.map((paso) =>
    paso.id !== stepIdOrigen
      ? paso
      : {
          ...paso,
          opciones: paso.opciones.map((op) =>
            op.id !== opcionId ? op : { ...op, targetStepId: nuevo.id }
          ),
        }
  );
  return conCambio({ ...speech, steps: reindexar([...steps, nuevo]) });
}

export function duplicarSpeech(speech) {
  const ahora = new Date().toISOString();
  const mapa = new Map();
  const steps = (speech.steps || []).map((paso) => {
    const idNuevo = nuevoId();
    mapa.set(paso.id, idNuevo);
    return {
      ...paso,
      id: idNuevo,
      opciones: (paso.opciones || []).map((op) => ({ ...op, id: nuevoId() })),
    };
  });
  const stepsFinales = steps.map((paso) => ({
    ...paso,
    opciones: paso.opciones.map((op) => ({
      ...op,
      targetStepId: mapa.has(op.targetStepId) ? mapa.get(op.targetStepId) : op.targetStepId,
    })),
  }));
  return {
    ...speech,
    id: nuevoId(),
    nombre: `${speech.nombre || ""} (copia)`.trim(),
    fechaCreacion: ahora,
    fechaModificacion: ahora,
    version: 1,
    startStepId: mapa.has(speech.startStepId) ? mapa.get(speech.startStepId) : speech.startStepId,
    steps: stepsFinales,
  };
}

export function pasosAlcanzables(speech) {
  const alcanzables = new Set();
  const steps = Array.isArray(speech.steps) ? speech.steps : [];
  const inicio = steps.find((s) => s.id === speech.startStepId);
  if (!inicio) return alcanzables;
  const cola = [inicio.id];
  while (cola.length) {
    const id = cola.pop();
    if (alcanzables.has(id)) continue;
    alcanzables.add(id);
    const paso = steps.find((s) => s.id === id);
    (paso?.opciones || []).forEach((op) => {
      if (op.targetStepId && steps.some((s) => s.id === op.targetStepId)) {
        cola.push(op.targetStepId);
      }
    });
  }
  return alcanzables;
}

export function advertenciasSpeech(speech) {
  const advertencias = [];
  const steps = Array.isArray(speech.steps) ? speech.steps : [];
  if (!steps.length) return advertencias;
  const alcanzables = pasosAlcanzables(speech);
  if (!steps.some((s) => s.id === speech.startStepId)) return advertencias;
  steps.forEach((paso, i) => {
    if (!alcanzables.has(paso.id)) {
      advertencias.push(
        `El paso ${i + 1} ("${paso.titulo || "sin título"}") no está conectado desde el inicio (huérfano).`
      );
    }
  });
  return advertencias;
}

export function validarEstructuraSpeech(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return ["No es un speech válido."];
  }
  const errores = [];
  if (typeof obj.id !== "string" || !obj.id.trim()) errores.push("Falta el id.");
  if (typeof obj.nombre !== "string" || !obj.nombre.trim()) errores.push("Falta el nombre.");
  if (!Array.isArray(obj.steps)) {
    errores.push("Falta la lista de pasos (steps).");
    return errores;
  }
  if (typeof obj.startStepId !== "string" || !obj.startStepId) {
    errores.push("Falta el paso inicial (startStepId).");
  } else if (!obj.steps.some((s) => s && s.id === obj.startStepId)) {
    errores.push("El paso inicial (startStepId) no corresponde a ningún paso.");
  }
  const ids = new Set();
  const duplicados = new Set();
  obj.steps.forEach((paso, i) => {
    if (!paso || typeof paso !== "object" || typeof paso.id !== "string" || !paso.id) {
      errores.push(`El paso ${i + 1} no tiene id válido.`);
      return;
    }
    if (ids.has(paso.id)) duplicados.add(paso.id);
    ids.add(paso.id);
    if (!Array.isArray(paso.opciones)) {
      errores.push(`El paso ${i + 1} no tiene lista de opciones.`);
      return;
    }
    paso.opciones.forEach((op, j) => {
      if (!op || typeof op !== "object" || typeof op.id !== "string" || !op.id) {
        errores.push(`La opción ${j + 1} del paso ${i + 1} no tiene id válido.`);
        return;
      }
      if (ids.has(op.id)) duplicados.add(op.id);
      ids.add(op.id);
      if (typeof op.texto !== "string") {
        errores.push(`La opción ${j + 1} del paso ${i + 1} tiene texto inválido.`);
      }
      if (op.targetStepId !== null && typeof op.targetStepId !== "string") {
        errores.push(`La opción ${j + 1} del paso ${i + 1} tiene destino inválido.`);
      } else if (op.targetStepId && !obj.steps.some((s) => s && s.id === op.targetStepId)) {
        errores.push(`La opción ${j + 1} del paso ${i + 1} apunta a un paso que no existe.`);
      }
    });
  });
  if (duplicados.size) {
    errores.push(`IDs duplicados: ${[...duplicados].join(", ")}.`);
  }
  return errores;
}

export function actualizarPaso(speech, stepId, cambios = {}) {
  return conCambio({
    ...speech,
    steps: speech.steps.map((paso) =>
      paso.id !== stepId
        ? paso
        : {
            ...paso,
            titulo:
              cambios.titulo !== undefined
                ? sanitizeString(String(cambios.titulo).trim())
                : paso.titulo,
            contenido:
              cambios.contenido !== undefined
                ? sanitizeString(cambios.contenido)
                : paso.contenido,
          }
    ),
  });
}

export function marcarInicio(speech, stepId) {
  if (!speech.steps.some((s) => s.id === stepId)) return speech;
  return conCambio({ ...speech, startStepId: stepId });
}

export function agregarOpcion(speech, stepId, texto = "") {
  return conCambio({
    ...speech,
    steps: speech.steps.map((paso) =>
      paso.id !== stepId
        ? paso
        : { ...paso, opciones: [...paso.opciones, crearOpcion(texto, null)] }
    ),
  });
}

export function actualizarOpcion(speech, stepId, opcionId, cambios = {}) {
  return conCambio({
    ...speech,
    steps: speech.steps.map((paso) =>
      paso.id !== stepId
        ? paso
        : {
            ...paso,
            opciones: paso.opciones.map((op) =>
              op.id !== opcionId
                ? op
                : {
                    ...op,
                    texto:
                      cambios.texto !== undefined
                        ? sanitizeString(String(cambios.texto).trim())
                        : op.texto,
                    targetStepId:
                      cambios.targetStepId !== undefined
                        ? cambios.targetStepId || null
                        : op.targetStepId,
                  }
            ),
          }
    ),
  });
}

export function eliminarOpcion(speech, stepId, opcionId) {
  return conCambio({
    ...speech,
    steps: speech.steps.map((paso) =>
      paso.id !== stepId
        ? paso
        : { ...paso, opciones: paso.opciones.filter((op) => op.id !== opcionId) }
    ),
  });
}

export function validarSpeech(speech) {
  if (!speech || typeof speech !== "object") return ["El speech está vacío o es inválido."];
  const errores = [];
  if (!speech.nombre || !String(speech.nombre).trim()) {
    errores.push("El speech no tiene nombre.");
  }
  const steps = Array.isArray(speech.steps) ? speech.steps : [];
  if (!steps.length) {
    errores.push("El speech no tiene ningún paso.");
  } else if (!speech.startStepId || !steps.some((s) => s.id === speech.startStepId)) {
    errores.push("No existe el paso inicial (INICIO).");
  }

  const ids = [];
  steps.forEach((paso) => {
    ids.push(paso.id);
    (paso.opciones || []).forEach((op) => ids.push(op.id));
  });
  const vistos = new Set();
  const duplicados = new Set();
  ids.forEach((id) => {
    if (vistos.has(id)) duplicados.add(id);
    vistos.add(id);
  });
  if (duplicados.size) {
    errores.push(`IDs duplicados: ${[...duplicados].join(", ")}.`);
  }

  steps.forEach((paso, i) => {
    const etiquetaPaso = `paso ${i + 1}`;
    (paso.opciones || []).forEach((op) => {
      const etiqueta = `La opción "${op.texto || "(sin texto)"}" del ${etiquetaPaso}`;
      if (!op.texto || !String(op.texto).trim()) {
        errores.push(`Una opción del ${etiquetaPaso} no tiene texto.`);
      }
      if (!op.targetStepId) {
        errores.push(`${etiqueta} no tiene destino.`);
      } else if (!steps.some((s) => s.id === op.targetStepId)) {
        errores.push(`${etiqueta} apunta a un paso que no existe.`);
      }
    });
  });

  return errores;
}
