import {
  normalizarSpeech,
  normalizarLayout,
  LAYOUT_VERSION,
} from "../interactiveSpeechModel";

/**
 * grafoSpeech.js (Release 1.11.1 — Constructor visual de flujos)
 *
 * Traduce el MISMO speech del asistente (etapas → preguntas → opciones) a un
 * grafo de nodos y conexiones para dibujarlo. No hay un segundo modelo: este
 * archivo es una VISTA derivada y pura; toda edición vuelve al modelo real
 * con los mutadores de `interactiveSpeechModel`.
 *
 * Mapeo decidido con el usuario (evita ~90 nodos en el guion ART):
 * - Inicio      → nodo sintético (startStepId).
 * - Etapa       → nodo con el speech/contenido de la etapa.
 * - Pregunta    → nodo; si tiene 2+ opciones se muestra como DECISIÓN.
 * - Opción      → PUERTO de salida del nodo pregunta (una arista por opción).
 * - Respuesta sugerida / Acción → propiedades de la opción, visibles como
 *   badges del puerto y editables en el panel (no son nodos aparte).
 * - Finalización→ un nodo por estadoFinal (+ uno genérico para
 *   finalizaLlamada sin estado). Fin del guion → nodo sintético de fin
 *   natural (no se puede conectar a mano: es la ausencia de destino).
 *
 * Reglas de conexión (idénticas a `resolverDestino` del runner):
 * 1) finalizaLlamada gana sobre targetStepId (el runner abre el cierre antes
 *    de resolver el destino).
 * 2) targetStepId válido → se entra a esa etapa (su contenido y su pregunta 0).
 * 3) sin destino → siguiente pregunta de la etapa; si era la última, siguiente
 *    etapa; si no hay más, Fin.
 *
 * El layout (`speech.layout`) es opcional y cosmético: se sanea con
 * `normalizarLayout` y nunca participa de la ejecución.
 */

export const TIPO_NODO = {
  INICIO: "inicio",
  ETAPA: "etapa",
  PREGUNTA: "pregunta",
  DECISION: "decision",
  FINAL: "final",
  FIN: "fin",
};

/** Dimensiones compartidas por el lienzo, el nodo y el cálculo de aristas. */
export const ANCHO_NODO = 300;
export const ALTO_CABECERA_NODO = 104;
export const ALTO_PUERTO = 30;
export const ALTO_NODO = ALTO_CABECERA_NODO + 8;
export const SEPARACION_FILAS = 56;
export const SEPARACION_PUERTOS = 24;

/** Posiciones por defecto (el usuario puede mover y auto-organizar después). */
export const X_INICIO = 40;
export const X_ETAPA = 380;
export const X_PREGUNTA = 720;
export const X_FINAL = 1080;
export const Y_INICIAL = 40;

const preguntasDePaso = (paso) =>
  Array.isArray(paso?.preguntas) ? paso.preguntas : [];

const opcionesDePregunta = (pregunta) =>
  Array.isArray(pregunta?.opciones) ? pregunta.opciones : [];

export const claveEtapa = (stepId) => `etapa:${stepId}`;
export const clavePregunta = (preguntaId) => `pregunta:${preguntaId}`;
export const claveFinal = (estadoId) => `fin:${estadoId}`;

export const CLAVE_INICIO = "inicio";
export const CLAVE_FIN = "fin";

export const etiquetaTipoNodo = (tipo) =>
  ({
    [TIPO_NODO.INICIO]: "Inicio",
    [TIPO_NODO.ETAPA]: "Etapa",
    [TIPO_NODO.PREGUNTA]: "Pregunta",
    [TIPO_NODO.DECISION]: "Decisión",
    [TIPO_NODO.FINAL]: "Finalización",
    [TIPO_NODO.FIN]: "Fin",
  }[tipo] || "Nodo");

export const esNodoDestino = (nodo) =>
  Boolean(nodo) &&
  (nodo.tipo === TIPO_NODO.ETAPA ||
    nodo.tipo === TIPO_NODO.FINAL ||
    nodo.tipo === TIPO_NODO.FIN);

/** Alto real del nodo: los puertos empujan la tarjeta hacia abajo. */
export function altoNodo(nodo) {
  const puertos = Array.isArray(nodo?.salidas) ? nodo.salidas.length : 0;
  // Una pregunta sin opciones igual dibuja el puerto "Siguiente".
  const extra = puertos > 0 ? puertos : nodo?.tipo === TIPO_NODO.PREGUNTA || nodo?.tipo === TIPO_NODO.DECISION ? 1 : 0;
  return ALTO_NODO + extra * ALTO_PUERTO;
}

const truncar = (texto, max = 120) => {
  const limpio = String(texto || "").replace(/\s+/g, " ").trim();
  return limpio.length > max ? `${limpio.slice(0, max - 1)}…` : limpio;
};

const etiquetaPaso = (paso, index) => {
  const titulo = String(paso?.titulo || "").trim();
  return titulo || `Etapa ${index + 1}`;
};

/**
 * Construye el grafo visual. Es determinístico: mismas entradas → mismos
 * nodos, aristas e ids, lo que permite testearlo y usarlo como clave de memo.
 */
export function construirGrafo(speech) {
  const guion = normalizarSpeech(speech) || {};
  const steps = Array.isArray(guion.steps) ? guion.steps : [];
  const estados = Array.isArray(guion.estadosFinales) ? guion.estadosFinales : [];
  const nodos = [];
  const aristas = [];

  const nodoPorClave = new Map();
  const agregarNodo = (nodo) => {
    nodos.push(nodo);
    nodoPorClave.set(nodo.key, nodo);
    return nodo;
  };
  const agregarArista = (arista) => {
    aristas.push({
      ...arista,
      id: `${arista.desde}->${arista.hasta}#${arista.puertoId || "auto"}`,
    });
  };

  const indiceInicio = steps.findIndex((s) => s.id === guion.startStepId);
  const pasoInicio = indiceInicio >= 0 ? steps[indiceInicio] : null;

  // --- Inicio -------------------------------------------------------------
  const inicio = agregarNodo({
    key: CLAVE_INICIO,
    tipo: TIPO_NODO.INICIO,
    titulo: "Inicio",
    subtitulo: "Punto de entrada",
    resumen: pasoInicio
      ? `Comienza en "${etiquetaPaso(pasoInicio, indiceInicio)}".`
      : "El guion todavía no tiene una etapa inicial.",
    stepId: pasoInicio ? pasoInicio.id : null,
    salidas: [],
    entradas: 0,
  });
  if (pasoInicio) {
    agregarArista({
      desde: inicio.key,
      hasta: claveEtapa(pasoInicio.id),
      puertoId: null,
      etiqueta: "Inicio",
      tipo: "inicio",
    });
  }

  // --- Etapas y preguntas -------------------------------------------------
  steps.forEach((paso, i) => {
    const preguntas = preguntasDePaso(paso);
    const siguienteEtapaKey =
      i + 1 < steps.length ? claveEtapa(steps[i + 1].id) : CLAVE_FIN;
    const nodoEtapa = agregarNodo({
      key: claveEtapa(paso.id),
      tipo: TIPO_NODO.ETAPA,
      titulo: etiquetaPaso(paso, i),
      subtitulo: `Etapa ${i + 1}`,
      resumen:
        truncar(paso.contenido) ||
        truncar(paso.objetivo) ||
        "Sin contenido de speech.",
      objetivo: paso.objetivo || "",
      contenido: paso.contenido || "",
      stepId: paso.id,
      stepIndex: i,
      totalPreguntas: preguntas.length,
      salidas: [],
      entradas: 0,
      siguienteKey: siguienteEtapaKey,
    });

    if (!preguntas.length) {
      agregarArista({
        desde: nodoEtapa.key,
        hasta: siguienteEtapaKey,
        puertoId: null,
        etiqueta: "Continúa",
        tipo: "lineal",
      });
      return;
    }

    // La entrada a una etapa muestra su contenido y luego la primera pregunta.
    agregarArista({
      desde: nodoEtapa.key,
      hasta: clavePregunta(preguntas[0].id),
      puertoId: null,
      etiqueta: "Speech",
      tipo: "entrada",
    });

    preguntas.forEach((pr, j) => {
      const opciones = opcionesDePregunta(pr);
      const siguientePreguntaKey =
        j + 1 < preguntas.length ? clavePregunta(preguntas[j + 1].id) : siguienteEtapaKey;
      const esDecision = opciones.length >= 2;
      const salidas = [];

      if (!opciones.length) {
        agregarArista({
          desde: clavePregunta(pr.id),
          hasta: siguientePreguntaKey,
          puertoId: null,
          etiqueta: "Siguiente",
          tipo: "lineal",
        });
      }

      opciones.forEach((op) => {
        let destinoKey = siguientePreguntaKey;
        let tipo = "lineal";
        let destinoLabel = "";

        if (op.finalizaLlamada) {
          tipo = "final";
          if (op.estadoFinalId && estados.some((e) => e.id === op.estadoFinalId)) {
            destinoKey = claveFinal(op.estadoFinalId);
          } else {
            destinoKey = CLAVE_FIN;
          }
        } else if (
          typeof op.targetStepId === "string" &&
          op.targetStepId &&
          steps.some((s) => s.id === op.targetStepId)
        ) {
          tipo = "opcion";
          destinoKey = claveEtapa(op.targetStepId);
        }

        const destino = nodoPorClave.get(destinoKey);
        destinoLabel = destino ? destino.titulo : "";
        salidas.push({
          opcionId: op.id,
          texto: op.texto || "Respuesta sin texto",
          tipo,
          destinoKey,
          destinoLabel,
          respuestaSugerida: op.respuestaSugerida || "",
          accion: op.accion || "",
          requiereAclaracion: Boolean(op.requiereAclaracion),
          finalizaLlamada: Boolean(op.finalizaLlamada),
          estadoFinalId: op.estadoFinalId || null,
          moduloId: op.moduloId || null,
          targetStepId: op.targetStepId || null,
        });

        agregarArista({
          desde: clavePregunta(pr.id),
          hasta: destinoKey,
          puertoId: op.id,
          etiqueta: op.texto || "(sin texto)",
          tipo,
        });
      });

      agregarNodo({
        key: clavePregunta(pr.id),
        tipo: esDecision ? TIPO_NODO.DECISION : TIPO_NODO.PREGUNTA,
        titulo: pr.texto || "Pregunta sin texto",
        subtitulo: `Pregunta ${j + 1} · Etapa ${i + 1}`,
        resumen: opciones.length
          ? `${opciones.length} respuesta${opciones.length !== 1 ? "s" : ""}`
          : "Sin respuestas",
        stepId: paso.id,
        stepIndex: i,
        preguntaId: pr.id,
        preguntaIndex: j,
        obligatoria: Boolean(pr.obligatoria),
        salidas,
        entradas: 0,
        siguienteKey: siguientePreguntaKey,
        totalRespuestas: opciones.length,
        respuestasSugeridas: opciones.filter((op) => op.respuestaSugerida).length,
        acciones: opciones.filter((op) => op.accion).length,
        finalizaciones: opciones.filter((op) => op.finalizaLlamada).length,
      });
    });
  });

  // --- Finalizaciones y fin natural --------------------------------------
  estados.forEach((estado) => {
    agregarNodo({
      key: claveFinal(estado.id),
      tipo: TIPO_NODO.FINAL,
      titulo: estado.nombre || "Estado final sin nombre",
      subtitulo: "Finalización",
      resumen: "Cierra la llamada con este resultado.",
      estadoFinalId: estado.id,
      salidas: [],
      entradas: 0,
    });
  });
  agregarNodo({
    key: CLAVE_FIN,
    tipo: TIPO_NODO.FIN,
    titulo: "Fin del guion",
    subtitulo: "Fin sin estado",
    resumen:
      "El recorrido termina sin registrar un estado final. Conectá una respuesta a una Finalización si querés un cierre explícito.",
    salidas: [],
    entradas: 0,
  });

  // --- Etiquetas de destino (segunda pasada) -----------------------------
  // Los nodos se crean en orden y una opción puede apuntar a una etapa que
  // todavía no existía cuando se armó el puerto. Se resuelven al final para
  // que TODAS las aristas muestren el nombre real del destino.
  nodos.forEach((n) => {
    (n.salidas || []).forEach((salida) => {
      const destino = nodoPorClave.get(salida.destinoKey);
      salida.destinoLabel = destino ? destino.titulo : "";
    });
  });

  // --- Entradas por nodo (para el panel y el resumen) --------------------
  const entradas = new Map();
  aristas.forEach((a) => {
    entradas.set(a.hasta, (entradas.get(a.hasta) || 0) + 1);
  });
  nodos.forEach((n) => {
    n.entradas = entradas.get(n.key) || 0;
  });

  return { nodos, aristas };
}

export function nodoPorClave(grafo, clave) {
  return (grafo?.nodos || []).find((n) => n.key === clave) || null;
}

export function clavesDeGrafo(grafo) {
  return new Set((grafo?.nodos || []).map((n) => n.key));
}

/**
 * Layout automático por etapas: cada etapa ocupa una fila, con su speech a la
 * izquierda y sus preguntas apiladas a la derecha. Las finalizaciones van a
 * una columna propia. Es determinístico y no necesita dagre.
 */
export function layoutAutomatico(grafo) {
  const nodos = Array.isArray(grafo?.nodos) ? grafo.nodos : [];
  const posiciones = {};
  const etapas = nodos.filter((n) => n.tipo === TIPO_NODO.ETAPA);
  const finales = nodos.filter(
    (n) => n.tipo === TIPO_NODO.FINAL || n.tipo === TIPO_NODO.FIN
  );

  let y = Y_INICIAL;
  const yInicio = y;
  etapas.forEach((etapa) => {
    const preguntas = nodos.filter(
      (n) =>
        (n.tipo === TIPO_NODO.PREGUNTA || n.tipo === TIPO_NODO.DECISION) &&
        n.stepId === etapa.stepId
    );
    let altoPreguntas = 0;
    preguntas.forEach((p) => {
      posiciones[p.key] = { x: X_PREGUNTA, y: y + altoPreguntas };
      altoPreguntas += altoNodo(p) + SEPARACION_PUERTOS;
    });
    posiciones[etapa.key] = { x: X_ETAPA, y };
    const altoFila = Math.max(
      altoNodo(etapa),
      altoPreguntas > 0 ? altoPreguntas - SEPARACION_PUERTOS : 0
    );
    y += altoFila + SEPARACION_FILAS;
  });

  const inicio = nodos.find((n) => n.tipo === TIPO_NODO.INICIO);
  if (inicio) {
    posiciones[inicio.key] = { x: X_INICIO, y: yInicio };
  }

  let yFinal = Y_INICIAL;
  finales.forEach((n) => {
    posiciones[n.key] = { x: X_FINAL, y: yFinal };
    yFinal += altoNodo(n) + SEPARACION_PUERTOS;
  });

  return posiciones;
}

/**
 * Combina layout automático + posiciones guardadas. Las guardadas mandan; así
 * mover un nodo no reorganiza el resto. `normalizarLayout` descarta basura.
 */
export function posicionesConLayout(grafo, layout) {
  const guardadas = normalizarLayout(layout)?.nodos || {};
  return { ...layoutAutomatico(grafo), ...guardadas };
}

/** Layout saneado y podado a los nodos que existen HOY en el grafo. */
export function podarLayout(grafo, layout) {
  const validas = clavesDeGrafo(grafo);
  const nodos = {};
  Object.entries(normalizarLayout(layout)?.nodos || {}).forEach(([clave, pos]) => {
    if (validas.has(clave)) nodos[clave] = pos;
  });
  return { version: LAYOUT_VERSION, nodos };
}

/** Devuelve un speech nuevo con una posición, sin bumpear versión/fecha. */
export function conPosicionNodo(speech, clave, posicion) {
  if (!speech || !posicion) return speech;
  const nodos = {
    ...(speech.layout && speech.layout.nodos ? speech.layout.nodos : {}),
    [clave]: { x: Math.round(posicion.x), y: Math.round(posicion.y) },
  };
  return { ...speech, layout: { version: LAYOUT_VERSION, ...(speech.layout || {}), nodos } };
}

/**
 * Devuelve un speech nuevo con un layout completo (auto-organizar). Conserva
 * `vista` si existía: auto-organizar no debe cambiar el zoom/pan del usuario.
 */
export function conLayoutCompleto(speech, nodos) {
  return {
    ...speech,
    layout: { version: LAYOUT_VERSION, ...(speech?.layout || {}), nodos },
  };
}

/**
 * Vista (pan/zoom) que entra todo el diagrama en el lienzo. En jsdom las
 * medidas son 0: se devuelve una vista usable en vez de dividir por cero.
 */
export function calcularVistaAjustada(posiciones, grafo, ancho, alto, margen = 48) {
  const nodos = Array.isArray(grafo?.nodos) ? grafo.nodos : [];
  if (!nodos.length) return { x: margen, y: margen, zoom: 1 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  nodos.forEach((n) => {
    const pos = posiciones[n.key];
    if (!pos) return;
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + ANCHO_NODO);
    maxY = Math.max(maxY, pos.y + altoNodo(n));
  });
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return { x: margen, y: margen, zoom: 1 };
  }
  const anchoContenido = Math.max(1, maxX - minX);
  const altoContenido = Math.max(1, maxY - minY);
  if (!(ancho > 0) || !(alto > 0)) {
    return { x: margen, y: margen, zoom: 1 };
  }
  const zoom = Math.min(
    1.1,
    Math.max(0.25, Math.min((ancho - margen * 2) / anchoContenido, (alto - margen * 2) / altoContenido))
  );
  return {
    x: (ancho - anchoContenido * zoom) / 2 - minX * zoom,
    y: (alto - altoContenido * zoom) / 2 - minY * zoom,
    zoom,
  };
}

/** Centra un nodo en el lienzo conservando el zoom actual. */
export function centrarVistaEnNodo(posiciones, nodo, vista, ancho, alto) {
  const pos = posiciones[nodo.key];
  if (!pos || !(ancho > 0) || !(alto > 0)) return vista;
  return {
    ...vista,
    x: ancho / 2 - (pos.x + ANCHO_NODO / 2) * vista.zoom,
    y: alto / 2 - (pos.y + altoNodo(nodo) / 2) * vista.zoom,
  };
}
