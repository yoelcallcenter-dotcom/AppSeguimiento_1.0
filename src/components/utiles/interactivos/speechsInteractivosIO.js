import {
  validarEstructuraSpeech,
  validarSpeech,
  advertenciasSpeech,
  duplicarSpeech,
  normalizarSpeech,
  normalizarLayout,
} from "./interactiveSpeechModel";
import { APP_VERSION } from "../../../core/version";

/**
 * speechsInteractivosIO.js
 * Formato de archivo versionado para import/export de guiones del Asistente
 * Interactivo: { type, version, fechaExportacion, appVersion, speechs: [...] }.
 * Nada se importa sin validación previa y nada se sobrescribe sin decisión
 * explícita del usuario (estrategia por fila: agregar, copia, reemplazar,
 * omitir).
 *
 * v2 (Release 1.11.0) — cambios y por qué:
 * - FORMATO_VERSION 1 → 2: los guiones ahora incluyen preguntas por etapa,
 *   respuesta sugerida/acción por opción, campos de registro, estados
 *   finales, módulos y reglas. migrarEnvelope() encadena 0 → 1 → 2 (patrón
 *   switch existente, ahora con recursión explícita para no usar fallthrough).
 * - serializarSpeechs() normaliza a v2 ANTES de exportar (un guion guardado
 *   en la forma vieja viaja como v2) y agrega appVersion para diagnóstico.
 * - Snapshot de objeciones: si se pasa la lista global, el módulo de
 *   objeciones del guion exportado la incluye (§5.1 "el archivo debe
 *   contener… Módulos transversales. Objeciones."), para que otra instalación
 *   pueda reconstruir el módulo. Al importar se fusiona por id SIN
 *   sobrescribir (§5.3): solo se agregan las que faltan.
 * - Los datos de llamadas (registro en memoria del runner) NUNCA viajan en
 *   el archivo: solo la definición del guion.
 *
 * 1.11.1 — constructor visual:
 * - El guion puede traer `layout` (posiciones de los nodos). Es OPCIONAL y
 *   cosmético, por eso NO se sube FORMATO_VERSION: un archivo exportado por
 *   1.11.1 sigue siendo v2 y una instalación 1.11.0 lo importa ignorando la
 *   clave. Al importar se sanea con normalizarLayout; un layout corrupto se
 *   descarta sin rechazar el guion.
 */

export const FORMATO_TIPO = "appseguimiento-interactive-speech";
export const FORMATO_VERSION = 2;

export function nombreArchivoSpeechs() {
  const hoy = new Date().toISOString().slice(0, 10);
  return `speechs_interactivos_${hoy}.json`;
}

/** Solo los campos públicos de una objeción viajan en el archivo. */
function objecionSnapshot(o) {
  if (!o || typeof o !== "object") return null;
  if (typeof o.id !== "string" || !o.id) return null;
  return {
    id: o.id,
    titulo: typeof o.titulo === "string" ? o.titulo : "",
    contenido: typeof o.contenido === "string" ? o.contenido : "",
  };
}

/**
 * Exporta guiones en el envelope v2. Cada guion se normaliza a v2 y, si hay
 * lista global de objeciones, su primer módulo tipo "objeciones" recibe un
 * snapshot con esa lista (se trabaja sobre copias: nunca muta el storage).
 */
export function serializarSpeechs(speechs, objeciones = []) {
  const conSnapshot = Array.isArray(objeciones) && objeciones.length > 0;
  const lista = (Array.isArray(speechs) ? speechs : []).map((s) => {
    const normalizado = normalizarSpeech(s);
    if (!conSnapshot || !normalizado || !Array.isArray(normalizado.modulos)) return normalizado;
    const idx = normalizado.modulos.findIndex((m) => m && m.tipo === "objeciones");
    if (idx === -1) return normalizado;
    const modulos = normalizado.modulos.map((m, i) =>
      i === idx
        ? { ...m, objeciones: objeciones.map(objecionSnapshot).filter(Boolean) }
        : m
    );
    return { ...normalizado, modulos };
  });
  return JSON.stringify(
    {
      type: FORMATO_TIPO,
      version: FORMATO_VERSION,
      fechaExportacion: new Date().toISOString(),
      appVersion: APP_VERSION,
      speechs: lista,
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

/** v0 (pre-1.9.x): rellena metadatos que el formato viejo no traía. */
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

/**
 * Migra el envelope a la versión actual. Cadena explícita:
 *   v0 → (migrarSpeechV0 + metadatos) → v1 → (normalizarSpeech por guion) → v2.
 * Se usa recursión en vez de fallthrough del switch para que la lectura y el
 * lint queden claros: cada versión "cae" en la siguiente llamada.
 * Las versiones futuras las rechaza parsearEnvelope antes de llegar acá.
 */
export function migrarEnvelope(data) {
  const version = typeof data.version === "number" ? data.version : 0;
  if (version === FORMATO_VERSION) return data;
  switch (version) {
    case 0: {
      const ahora = new Date().toISOString();
      return migrarEnvelope({
        ...data,
        version: 1,
        fechaExportacion:
          typeof data.fechaExportacion === "string" ? data.fechaExportacion : ahora,
        speechs: Array.isArray(data.speechs)
          ? data.speechs.map((s) => migrarSpeechV0(s, ahora))
          : data.speechs,
      });
    }
    case 1: {
      // v1 → v2: la forma de los guiones cambió (preguntas, campos, estados…).
      // normalizarSpeech es idempotente y no destructiva: conserva todo.
      return {
        ...data,
        version: 2,
        speechs: Array.isArray(data.speechs)
          ? data.speechs.map((s) => normalizarSpeech(s))
          : data.speechs,
      };
    }
    default:
      return data;
  }
}

/**
 * Release 1.11.1: normaliza el speech y sanea el layout del constructor.
 * El layout es cosmético: si viene corrupto se descarta en vez de rechazar el
 * guion completo. Si es válido se conserva para que el diagrama abra igual.
 */
function normalizarSpeechImportado(speech) {
  const normalizado = normalizarSpeech(speech);
  if (!normalizado || typeof normalizado !== "object" || !("layout" in normalizado)) {
    return normalizado;
  }
  const layout = normalizarLayout(normalizado.layout);
  if (!layout) {
    const { layout: _layoutInvalido, ...resto } = normalizado;
    return resto;
  }
  return { ...normalizado, layout };
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
  // Red de seguridad: aunque el envelope diga v2, cada guion pasa por la
  // normalización idempotente antes de llegar a la vista (§5.2 "no importar
  // archivos parcialmente dañados de manera silenciosa").
  return { ok: true, speechs: migrado.speechs.map(normalizarSpeechImportado) };
}

export function prepararFilasImport(speechs, existentes = [], objeciones = undefined) {
  const existentesIds = new Set(existentes.map((s) => s.id));
  const vistos = new Set();
  return speechs.map((speech, index) => {
    const id = speech && typeof speech === "object" ? speech.id : undefined;
    const repetidoEnArchivo = typeof id === "string" && vistos.has(id);
    if (typeof id === "string") vistos.add(id);

    // Los errores traen ubicación ("La opción X del paso Y…", §5.2).
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
      advertencias: advertenciasSpeech(speech, objeciones),
      estrategia: conflicto ? "omitir" : null,
    };
  });
}

/**
 * Fusiona objeciones importadas en la lista global SIN sobrescribir: solo se
 * agregan las que no existan por id (los guiones importados no modifican
 * retroactivamente nada de la instalación destino, §5.3). Devuelve la MISMA
 * referencia si no hay novedad, para que React no re-renderice sin motivo.
 */
export function fusionarObjeciones(existentes = [], importadas = []) {
  const base = Array.isArray(existentes) ? existentes : [];
  const conocidos = new Set(base.map((o) => o && o.id).filter(Boolean));
  const altas = [];
  (Array.isArray(importadas) ? importadas : []).forEach((o) => {
    const snap = objecionSnapshot(o);
    if (!snap || conocidos.has(snap.id)) return;
    conocidos.add(snap.id);
    altas.push(snap);
  });
  return altas.length ? [...base, ...altas] : base;
}

/**
 * Aplica las estrategias elegidas. Si se pasa la lista global de
 * objeciones (4.º parámetro), además devuelve en `objeciones` la lista
 * fusionada con los snapshots de los guiones efectivamente importados y en
 * `res.objecionesAgregadas` el conteo de altas nuevas.
 */
export function aplicarImportacion(filas, estrategias = {}, existentes = [], objecionesExistentes) {
  const lista = [...existentes];
  const res = { agregados: 0, reemplazados: 0, omitidos: 0, copias: 0, objecionesAgregadas: 0 };
  // Los snapshots solo se toman de los guiones que ENTRAAN: si el usuario
  // omite o reemplaza, las objeciones del guion ajeno no se fusionan.
  const snapshots = [];
  const tomarSnapshot = (speech) => {
    (Array.isArray(speech.modulos) ? speech.modulos : []).forEach((m) => {
      if (m && m.tipo === "objeciones" && Array.isArray(m.objeciones)) {
        snapshots.push(...m.objeciones);
      }
    });
  };
  filas.forEach((fila) => {
    if (fila.estado === "invalido") {
      res.omitidos += 1;
      return;
    }
    const estrategia =
      fila.estado === "conflicto"
        ? estrategias[fila.key] || fila.estrategia || "omitir"
        : "agregar";
    // Siempre en forma v2: un archivo viejo importado se guarda ya migrado.
    const speech = normalizarSpeech(fila.speech);
    if (estrategia === "omitir") {
      res.omitidos += 1;
      return;
    }
    if (estrategia === "copia") {
      lista.push(duplicarSpeech(speech));
      tomarSnapshot(speech);
      res.copias += 1;
      res.agregados += 1;
      return;
    }
    if (estrategia === "reemplazar") {
      const idx = lista.findIndex((s) => s.id === speech.id);
      if (idx >= 0) {
        lista[idx] = speech;
        res.reemplazados += 1;
      } else {
        lista.push(speech);
        res.agregados += 1;
      }
      tomarSnapshot(speech);
      return;
    }
    if (lista.some((s) => s.id === speech.id)) {
      res.omitidos += 1;
      return;
    }
    lista.push(speech);
    tomarSnapshot(speech);
    res.agregados += 1;
  });

  let objeciones;
  if (Array.isArray(objecionesExistentes)) {
    const antes = fusionarObjeciones(objecionesExistentes, snapshots);
    res.objecionesAgregadas = antes.length - objecionesExistentes.length;
    objeciones = antes;
  }
  return { lista, res, objeciones };
}
