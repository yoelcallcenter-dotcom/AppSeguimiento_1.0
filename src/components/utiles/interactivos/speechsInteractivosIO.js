import {
  validarEstructuraSpeech,
  validarSpeech,
  advertenciasSpeech,
  duplicarSpeech,
} from "./interactiveSpeechModel";

/**
 * speechsInteractivosIO.js
 * Formato de archivo versionado para import/export de Speechs Interactivos:
 * { type, version, fechaExportacion, speechs: [...] }.
 * Nada se importa sin validación previa y nada se sobrescribe sin decisión
 * explícita del usuario (estrategia por fila: agregar, copia, reemplazar,
 * omitir).
 */

export const FORMATO_TIPO = "appseguimiento-interactive-speech";
export const FORMATO_VERSION = 1;

export function nombreArchivoSpeechs() {
  const hoy = new Date().toISOString().slice(0, 10);
  return `speechs_interactivos_${hoy}.json`;
}

export function serializarSpeechs(speechs) {
  return JSON.stringify(
    {
      type: FORMATO_TIPO,
      version: FORMATO_VERSION,
      fechaExportacion: new Date().toISOString(),
      speechs,
    },
    null,
    2
  );
}

export function descargarJson(nombreArchivo, texto) {
  const blob = new Blob([texto], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}

function migrarSpeechV0(speech, ahora) {
  if (!speech || typeof speech !== "object") return speech;
  return {
    ...speech,
    fechaCreacion:
      typeof speech.fechaCreacion === "string" ? speech.fechaCreacion : ahora,
    fechaModificacion:
      typeof speech.fechaModificacion === "string" ? speech.fechaModificacion : ahora,
    version: typeof speech.version === "number" ? speech.version : 1,
    steps: Array.isArray(speech.steps)
      ? speech.steps.map((paso) => {
          if (!paso || typeof paso !== "object") return paso;
          return {
            ...paso,
            orden: typeof paso.orden === "number" ? paso.orden : 0,
            opciones: Array.isArray(paso.opciones)
              ? paso.opciones.map((op) => {
                  if (!op || typeof op !== "object") return op;
                  return {
                    ...op,
                    orden: typeof op.orden === "number" ? op.orden : 0,
                    targetStepId: op.targetStepId === undefined ? null : op.targetStepId,
                  };
                })
              : paso.opciones,
          };
        })
      : speech.steps,
  };
}

export function migrarEnvelope(data) {
  const version = typeof data.version === "number" ? data.version : 0;
  if (version === FORMATO_VERSION) return data;
  switch (version) {
    case 0: {
      const ahora = new Date().toISOString();
      return {
        ...data,
        version: FORMATO_VERSION,
        fechaExportacion:
          typeof data.fechaExportacion === "string" ? data.fechaExportacion : ahora,
        speechs: Array.isArray(data.speechs)
          ? data.speechs.map((s) => migrarSpeechV0(s, ahora))
          : data.speechs,
      };
    }
    default:
      return data;
  }
}

export function parsearEnvelope(raw) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, error: "El archivo no es un JSON válido." };
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, error: "El formato del archivo no es reconocido." };
  }
  if (data.type !== FORMATO_TIPO) {
    return {
      ok: false,
      error: `Tipo de archivo no reconocido (se espera "${FORMATO_TIPO}").`,
    };
  }
  const version = typeof data.version === "number" ? data.version : 0;
  if (version > FORMATO_VERSION) {
    return {
      ok: false,
      error: `Versión de formato no soportada (${version}).`,
    };
  }
  const migrado = migrarEnvelope(data);
  if (!Array.isArray(migrado.speechs)) {
    return { ok: false, error: "El archivo no contiene la lista de speechs." };
  }
  if (!migrado.speechs.length) {
    return { ok: false, error: "El archivo no contiene speechs." };
  }
  return { ok: true, speechs: migrado.speechs };
}

export function prepararFilasImport(speechs, existentes = []) {
  const existentesIds = new Set(existentes.map((s) => s.id));
  const vistos = new Set();
  return speechs.map((speech, index) => {
    const id = speech && typeof speech === "object" ? speech.id : undefined;
    const repetidoEnArchivo = typeof id === "string" && vistos.has(id);
    if (typeof id === "string") vistos.add(id);

    const estructura = validarEstructuraSpeech(speech);
    const semanticos = estructura.length === 0 ? validarSpeech(speech) : [];
    const errores = [...estructura, ...semanticos];
    if (errores.length > 0) {
      return {
        key: `invalido-${index}`,
        speech,
        estado: "invalido",
        motivos: errores,
        advertencias: [],
        estrategia: null,
      };
    }
    const conflicto = existentesIds.has(id) || repetidoEnArchivo;
    return {
      key: id,
      speech,
      estado: conflicto ? "conflicto" : "nuevo",
      motivos: repetidoEnArchivo ? ["ID repetido dentro del archivo."] : [],
      advertencias: advertenciasSpeech(speech),
      estrategia: conflicto ? "omitir" : null,
    };
  });
}

export function aplicarImportacion(filas, estrategias = {}, existentes = []) {
  const lista = [...existentes];
  const res = { agregados: 0, reemplazados: 0, omitidos: 0, copias: 0 };
  filas.forEach((fila) => {
    if (fila.estado === "invalido") {
      res.omitidos += 1;
      return;
    }
    const estrategia =
      fila.estado === "conflicto"
        ? estrategias[fila.key] || fila.estrategia || "omitir"
        : "agregar";
    if (estrategia === "omitir") {
      res.omitidos += 1;
      return;
    }
    if (estrategia === "copia") {
      lista.push(duplicarSpeech(fila.speech));
      res.copias += 1;
      res.agregados += 1;
      return;
    }
    if (estrategia === "reemplazar") {
      const idx = lista.findIndex((s) => s.id === fila.speech.id);
      if (idx >= 0) {
        lista[idx] = fila.speech;
        res.reemplazados += 1;
      } else {
        lista.push(fila.speech);
        res.agregados += 1;
      }
      return;
    }
    if (lista.some((s) => s.id === fila.speech.id)) {
      res.omitidos += 1;
      return;
    }
    lista.push(fila.speech);
    res.agregados += 1;
  });
  return { lista, res };
}
