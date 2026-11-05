import { describe, it, expect } from "vitest";
import {
  crearSpeechInteractivo,
  crearPaso,
  crearOpcion,
  agregarPaso,
  duplicarPaso,
  eliminarPaso,
  actualizarPaso,
  marcarInicio,
  agregarOpcion,
  actualizarOpcion,
  eliminarOpcion,
  actualizarInfo,
  validarSpeech,
  validarEstructuraSpeech,
  duplicarSpeech,
  moverPaso,
  moverOpcion,
  duplicarOpcion,
  crearPasoConectado,
  referenciasA,
  pasosAlcanzables,
  advertenciasSpeech,
  // --- nuevos en 1.11.0 (modelo v2) ---
  normalizarSpeech,
  agregarPregunta,
  actualizarPregunta,
  eliminarPregunta,
  moverPregunta,
  agregarCampo,
  actualizarCampo,
  eliminarCampo,
  moverCampo,
  agregarEstadoFinal,
  actualizarEstadoFinal,
  eliminarEstadoFinal,
  agregarModulo,
  actualizarModulo,
  eliminarModulo,
  setArchivado,
  actualizarReglas,
  resolverDestino,
  camposObligatoriosPendientes,
  TIPOS_CAMPO,
  esTipoCampoValido,
} from "./interactiveSpeechModel";

const nuevo = () =>
  crearSpeechInteractivo({ nombre: "Accidente Laboral", descripcion: "General" });

/** Acceso estándar a las opciones de la primera pregunta de una etapa (v2). */
const opcionesDe0 = (speech, pasoIdx = 0) =>
  (speech.steps[pasoIdx].preguntas[0] || { opciones: [] }).opciones;

function armarSpeech() {
  let speech = agregarPaso(agregarPaso(nuevo()));
  speech = actualizarPaso(speech, speech.steps[0].id, { titulo: "Apertura" });
  speech = actualizarPaso(speech, speech.steps[1].id, { titulo: "Cierre" });
  speech = actualizarPaso(speech, speech.steps[2].id, { titulo: "Extra" });
  speech = agregarOpcion(speech, speech.steps[0].id, "Continuar");
  const opId = speech.steps[0].preguntas[0].opciones[0].id;
  speech = actualizarOpcion(speech, speech.steps[0].id, opId, {
    targetStepId: speech.steps[1].id,
  });
  return speech;
}

describe("interactiveSpeechModel", () => {
  it("crea el speech con un paso inicial INICIO, campos de persistencia y forma v2", () => {
    const speech = nuevo();
    expect(speech.id).toBeTruthy();
    expect(speech.nombre).toBe("Accidente Laboral");
    expect(speech.descripcion).toBe("General");
    expect(speech.version).toBe(1);
    expect(speech.fechaCreacion).toBeTruthy();
    expect(speech.fechaModificacion).toBeTruthy();
    expect(speech.steps).toHaveLength(1);
    expect(speech.startStepId).toBe(speech.steps[0].id);
    // --- v2 (1.11.0): nivel de preguntas, campos, archivado, estados y módulos ---
    expect(speech.steps[0].preguntas).toEqual([]);
    expect(speech.steps[0].camposRegistro).toEqual([]);
    expect(speech.archivado).toBe(false);
    expect(speech.estadosFinales).toEqual([]);
    expect(speech.reglas).toEqual([]);
    expect(speech.modulos).toHaveLength(1);
    expect(speech.modulos[0].tipo).toBe("objeciones");
    expect(validarSpeech(speech)).toEqual([]);
  });

  it("agrega pasos con orden correlativo", () => {
    let speech = nuevo();
    speech = agregarPaso(speech);
    speech = agregarPaso(speech);
    expect(speech.steps).toHaveLength(3);
    expect(speech.steps.map((s) => s.orden)).toEqual([0, 1, 2]);
    expect(speech.version).toBe(3);
  });

  it("duplica un paso con ids nuevos conservando conexiones", () => {
    let speech = nuevo();
    const inicioId = speech.startStepId;
    speech = agregarPaso(speech);
    const paso2 = speech.steps[1];
    speech = actualizarPaso(speech, paso2.id, { titulo: "Pregunta clave" });
    speech = agregarOpcion(speech, paso2.id, "Sí");
    const opId = speech.steps[1].preguntas[0].opciones[0].id;
    speech = actualizarOpcion(speech, paso2.id, opId, {
      targetStepId: inicioId,
    });
    speech = duplicarPaso(speech, paso2.id);

    expect(speech.steps).toHaveLength(3);
    const copia = speech.steps[2];
    expect(copia.id).not.toBe(paso2.id);
    expect(copia.titulo).toBe("Pregunta clave (copia)");
    expect(copia.preguntas).toHaveLength(1);
    expect(copia.preguntas[0].opciones).toHaveLength(1);
    expect(copia.preguntas[0].opciones[0].id).not.toBe(opId);
    expect(copia.preguntas[0].opciones[0].targetStepId).toBe(inicioId);
    expect(validarSpeech(speech)).toEqual([]);
  });

  it("eliminar un paso deja las opciones sin destino: pasan a avance lineal (1.11.0)", () => {
    let speech = nuevo();
    speech = agregarPaso(speech);
    const inicio = speech.steps[0];
    const paso2 = speech.steps[1];
    speech = agregarOpcion(speech, inicio.id, "Ir al paso 2");
    const opId = speech.steps[0].preguntas[0].opciones[0].id;
    speech = actualizarOpcion(speech, inicio.id, opId, {
      targetStepId: paso2.id,
    });

    speech = eliminarPaso(speech, paso2.id);
    expect(speech.steps).toHaveLength(1);
    expect(speech.steps[0].preguntas[0].opciones[0].targetStepId).toBeNull();
    // Sin destino YA no es error (§2.2): la opción avanza en línea / fin de recorrido.
    expect(validarSpeech(speech)).toEqual([]);
  });

  it("al eliminar el paso inicial promueve al primer paso restante", () => {
    let speech = nuevo();
    speech = agregarPaso(speech);
    const segundoId = speech.steps[1].id;
    speech = eliminarPaso(speech, speech.startStepId);
    expect(speech.startStepId).toBe(segundoId);
    expect(validarSpeech(speech)).toEqual([]);
  });

  it("marcarInicio cambia el paso inicial", () => {
    let speech = nuevo();
    speech = agregarPaso(speech);
    speech = marcarInicio(speech, speech.steps[1].id);
    expect(speech.startStepId).toBe(speech.steps[1].id);
    expect(validarSpeech(speech)).toEqual([]);
  });

  it("actualizarPaso sanitiza y actualiza titulo/contenido/objetivo", () => {
    let speech = nuevo();
    speech = actualizarPaso(speech, speech.startStepId, {
      titulo: "Apertura",
      contenido: "Hola, ¿cómo estás?",
      objetivo: "Confirmar identidad",
    });
    expect(speech.steps[0].titulo).toBe("Apertura");
    expect(speech.steps[0].contenido).toBe("Hola, ¿cómo estás?");
    expect(speech.steps[0].objetivo).toBe("Confirmar identidad");
  });

  it("agregarOpcion crea sin destino (avance lineal válido) y actualizarOpcion conecta", () => {
    let speech = nuevo();
    speech = agregarPaso(speech);
    const paso2 = speech.steps[1];
    speech = agregarOpcion(speech, speech.startStepId, "Sí, puedo hablar");
    const op = speech.steps[0].preguntas[0].opciones[0];
    expect(op.targetStepId).toBeNull();
    // 1.11.0: un destino solo es obligatorio "cuando requiera navegación" (§4.2).
    expect(validarSpeech(speech)).toEqual([]);

    speech = actualizarOpcion(speech, speech.startStepId, op.id, {
      targetStepId: paso2.id,
    });
    expect(speech.steps[0].preguntas[0].opciones[0].targetStepId).toBe(paso2.id);
    expect(validarSpeech(speech)).toEqual([]);
  });

  it("eliminarOpcion quita la opción", () => {
    let speech = nuevo();
    speech = agregarOpcion(speech, speech.startStepId, "Opción");
    const opId = speech.steps[0].preguntas[0].opciones[0].id;
    speech = eliminarOpcion(speech, speech.startStepId, opId);
    expect(speech.steps[0].preguntas[0].opciones).toHaveLength(0);
    expect(eliminarOpcion(speech, speech.startStepId, "no-existe")).toBe(speech);
  });

  it("detecta destino a paso inexistente, ids duplicados y nombre vacío", () => {
    const speech = nuevo();
    const conDestinoRoto = {
      ...speech,
      steps: [
        {
          ...speech.steps[0],
          preguntas: [
            {
              id: "q1",
              texto: "",
              obligatoria: false,
              opciones: [{ id: "op1", texto: "Seguir", targetStepId: "no-existe", orden: 0 }],
            },
          ],
        },
        { ...speech.steps[1], id: speech.steps[0].id, preguntas: [] },
      ],
    };
    const errores = validarSpeech(conDestinoRoto);
    expect(errores).toContain(
      'La opción "Seguir" del paso 1 apunta a un paso que no existe.'
    );
    expect(errores.some((e) => e.startsWith("IDs duplicados:"))).toBe(true);

    expect(validarSpeech({ ...speech, nombre: "  " })).toContain(
      "El speech no tiene nombre."
    );
    expect(validarSpeech({ ...speech, startStepId: "falso" })).toContain(
      "No existe el paso inicial (INICIO)."
    );
  });

  it("actualizarInfo modifica nombre/descripción", () => {
    const speech = actualizarInfo(nuevo(), {
      nombre: "Nuevo nombre",
      descripcion: "Nueva desc",
    });
    expect(speech.nombre).toBe("Nuevo nombre");
    expect(speech.descripcion).toBe("Nueva desc");
    expect(speech.version).toBe(2);
  });

  it("actualizarInfo con solo descripción conserva el nombre", () => {
    const speech = actualizarInfo(nuevo(), { descripcion: "Solo desc" });
    expect(speech.nombre).toBe("Accidente Laboral");
    expect(speech.descripcion).toBe("Solo desc");
  });

  it("duplicarSpeech genera ids nuevos, reconecta destinos y deja el original intacto", () => {
    const original = armarSpeech();
    const copia = duplicarSpeech(original);

    expect(copia.id).not.toBe(original.id);
    expect(copia.nombre).toBe("Accidente Laboral (copia)");
    expect(copia.version).toBe(1);
    expect(copia.fechaCreacion).toBeTruthy();
    expect(copia.startStepId).not.toBe(original.startStepId);
    expect(copia.steps).toHaveLength(original.steps.length);

    const idsOriginales = new Set(original.steps.map((s) => s.id));
    copia.steps.forEach((paso, i) => {
      expect(paso.id).not.toBe(original.steps[i].id);
      expect(idsOriginales.has(paso.id)).toBe(false);
      paso.preguntas.forEach((pr, q) => {
        expect(pr.id).not.toBe(original.steps[i].preguntas[q].id);
        pr.opciones.forEach((op, j) => {
          expect(op.id).not.toBe(original.steps[i].preguntas[q].opciones[j].id);
        });
      });
    });

    const opCopia = copia.steps[0].preguntas[0].opciones[0];
    expect(opCopia.targetStepId).toBe(copia.steps[1].id);
    expect(opCopia.targetStepId).not.toBe(original.steps[1].id);
    expect(validarSpeech(copia)).toEqual([]);
    expect(original.steps[0].titulo).toBe("Apertura");
    expect(original.startStepId).toBe(original.steps[0].id);
  });

  it("moverPaso reordena y reindexa; fuera de rango no cambia nada", () => {
    const speech = armarSpeech();
    const primero = speech.steps[0].id;
    const segundo = speech.steps[1].id;

    const movido = moverPaso(speech, primero, 1);
    expect(movido.steps.map((s) => s.id)).toEqual([segundo, primero, speech.steps[2].id]);
    expect(movido.steps.map((s) => s.orden)).toEqual([0, 1, 2]);
    expect(movido.version).toBe(speech.version + 1);

    expect(moverPaso(speech, primero, -1)).toBe(speech);
    expect(moverPaso(speech, primero, 5)).toBe(speech);
    expect(moverPaso(speech, "no-existe", 1)).toBe(speech);
  });

  it("moverOpcion reordena las opciones dentro de su pregunta", () => {
    let speech = armarSpeech();
    const pasoId = speech.steps[0].id;
    speech = agregarOpcion(speech, pasoId, "Segunda");
    speech = agregarOpcion(speech, pasoId, "Tercera");
    expect(opcionesDe0(speech).map((o) => o.texto)).toEqual([
      "Continuar",
      "Segunda",
      "Tercera",
    ]);

    const primeraId = speech.steps[0].preguntas[0].opciones[0].id;
    const movido = moverOpcion(speech, pasoId, primeraId, 1);
    expect(opcionesDe0(movido).map((o) => o.texto)).toEqual([
      "Segunda",
      "Continuar",
      "Tercera",
    ]);
    expect(opcionesDe0(movido).map((o) => o.orden)).toEqual([0, 1, 2]);
    expect(moverOpcion(speech, pasoId, primeraId, -1)).toBe(speech);
  });

  it("duplicarOpcion inserta una copia con id nuevo después del original", () => {
    const speech = armarSpeech();
    const pasoId = speech.steps[0].id;
    const opId = speech.steps[0].preguntas[0].opciones[0].id;
    const conCopia = duplicarOpcion(speech, pasoId, opId);
    expect(conCopia.steps[0].preguntas[0].opciones).toHaveLength(2);
    expect(conCopia.steps[0].preguntas[0].opciones[1].id).not.toBe(opId);
    expect(conCopia.steps[0].preguntas[0].opciones[1].texto).toBe("Continuar");
    expect(conCopia.steps[0].preguntas[0].opciones[1].targetStepId).toBe(
      speech.steps[0].preguntas[0].opciones[0].targetStepId
    );
    expect(opcionesDe0(conCopia).map((o) => o.orden)).toEqual([0, 1]);
    expect(duplicarOpcion(speech, pasoId, "no-existe")).toBe(speech);
  });

  it("eliminarPaso con destinoReemplazo redirige las referencias", () => {
    const speech = armarSpeech();
    const pasoCierre = speech.steps[1].id;
    const pasoExtra = speech.steps[2].id;

    const redirigido = eliminarPaso(speech, pasoCierre, pasoExtra);
    expect(redirigido.steps).toHaveLength(2);
    expect(redirigido.steps[0].preguntas[0].opciones[0].targetStepId).toBe(pasoExtra);
    expect(validarSpeech(redirigido)).toEqual([]);

    // Sin reemplazo válido la opción queda sin destino (avance lineal): válida.
    const invalido = eliminarPaso(speech, pasoCierre, "no-existe");
    expect(invalido.steps[0].preguntas[0].opciones[0].targetStepId).toBeNull();
    expect(validarSpeech(invalido)).toEqual([]);
  });

  it("referenciasA lista los pasos y opciones que apuntan a un paso", () => {
    const speech = armarSpeech();
    const refs = referenciasA(speech, speech.steps[1].id);
    expect(refs).toHaveLength(1);
    expect(refs[0].stepId).toBe(speech.steps[0].id);
    expect(refs[0].opcionId).toBe(speech.steps[0].preguntas[0].opciones[0].id);
    expect(referenciasA(speech, speech.steps[0].id)).toEqual([]);
  });

  it("crearPasoConectado agrega un paso al final y conecta la opción", () => {
    const speech = armarSpeech();
    const pasoId = speech.steps[0].id;
    const opId = speech.steps[0].preguntas[0].opciones[0].id;
    const conectado = crearPasoConectado(speech, pasoId, opId);
    expect(conectado.steps).toHaveLength(4);
    const nuevoPaso = conectado.steps[3];
    expect(conectado.steps[0].preguntas[0].opciones[0].targetStepId).toBe(nuevoPaso.id);
    expect(conectado.steps.map((s) => s.orden)).toEqual([0, 1, 2, 3]);
    expect(validarSpeech(conectado)).toEqual([]);
    expect(crearPasoConectado(speech, pasoId, "no-existe")).toBe(speech);
  });

  it("pasosAlcanzables suma destinos y avance lineal; advertencias marca huérfanos reales", () => {
    const speech = armarSpeech();
    // 1.11.0: el avance lineal (Siguiente) alcanza cualquier etapa posterior
    // al inicio, aunque ninguna opción apunte a ella.
    const alcanzables = pasosAlcanzables(speech);
    expect(alcanzables.has(speech.steps[0].id)).toBe(true);
    expect(alcanzables.has(speech.steps[1].id)).toBe(true);
    expect(alcanzables.has(speech.steps[2].id)).toBe(true);
    expect(advertenciasSpeech(speech)).toEqual([]);

    // Etapa inicial distinto del primero: la etapa 0 queda huérfana.
    const conInicioRaro = marcarInicio(speech, speech.steps[1].id);
    const advertencias = advertenciasSpeech(conInicioRaro);
    expect(advertencias).toHaveLength(1);
    expect(advertencias[0]).toContain("no está conectado desde el inicio");
    expect(advertencias[0]).toContain("Apertura");
    expect(validarSpeech(conInicioRaro)).toEqual([]);

    expect(advertenciasSpeech({ ...speech, startStepId: "falso" })).toEqual([]);
    expect(advertenciasSpeech({ ...speech, steps: [] })).toEqual([]);
  });

  it("advertencias advierte llaves de objeciones sin asociar y deduplica", () => {
    const base = nuevo();
    const conLlaves = actualizarPaso(base, base.steps[0].id, {
      contenido: "Dice {OBJECION:falta} y otra vez {OBJECION:FALTA}",
    });
    const objeciones = [{ id: "o1", titulo: "Asociada", contenido: "Texto" }];

    const adv = advertenciasSpeech(conLlaves, objeciones);
    expect(adv).toHaveLength(1);
    expect(adv[0]).toContain("{OBJECION:falta}");
    expect(adv[0]).toContain("ninguna objeción cargada");

    const conAsociada = actualizarPaso(base, base.steps[0].id, {
      contenido: "Va {OBJECION:Asociada} y {OBJECION:o1}",
    });
    expect(advertenciasSpeech(conAsociada, objeciones)).toEqual([]);

    expect(advertenciasSpeech(conLlaves)).toEqual([]);
    expect(advertenciasSpeech(conLlaves, [])).toHaveLength(1);
    expect(advertenciasSpeech(conLlaves, undefined)).toEqual([]);
  });

  it("validarEstructuraSpeech valida forma, ids y referencias", () => {
    const speech = armarSpeech();
    expect(validarEstructuraSpeech(speech)).toEqual([]);

    expect(validarEstructuraSpeech(null)).toEqual(["No es un speech válido."]);
    expect(validarEstructuraSpeech([1])).toEqual(["No es un speech válido."]);

    const sinNombre = { ...speech, nombre: "" };
    expect(validarEstructuraSpeech(sinNombre)).toContain("Falta el nombre.");

    const sinSteps = { ...speech, steps: "nope" };
    expect(validarEstructuraSpeech(sinSteps)).toContain(
      "Falta la lista de pasos (steps)."
    );

    const sinInicio = { ...speech, startStepId: "" };
    expect(validarEstructuraSpeech(sinInicio)).toContain(
      "Falta el paso inicial (startStepId)."
    );

    const inicioFalso = { ...speech, startStepId: "otro-id" };
    expect(validarEstructuraSpeech(inicioFalso)).toContain(
      "El paso inicial (startStepId) no corresponde a ningún paso."
    );

    const idsDup = {
      ...speech,
      steps: [speech.steps[0], { ...speech.steps[1], id: speech.steps[0].id }],
    };
    expect(validarEstructuraSpeech(idsDup).some((e) => e.startsWith("IDs duplicados:"))).toBe(
      true
    );

    // Archivos en forma v1 (opciones sueltas en la etapa, sin preguntas):
    // se validan con los mensajes históricos del formato.
    const baseV1 = {
      id: "s1",
      nombre: "v1",
      startStepId: "e1",
      steps: [
        { id: "e1", titulo: "Uno", contenido: "", orden: 0, opciones: [] },
        { id: "e2", titulo: "Dos", contenido: "", orden: 1, opciones: [] },
      ],
    };
    const destinoRoto = {
      ...baseV1,
      steps: [
        {
          ...baseV1.steps[0],
          opciones: [{ id: "op-x", texto: "Seguir", targetStepId: "no-existe", orden: 0 }],
        },
        baseV1.steps[1],
      ],
    };
    expect(validarEstructuraSpeech(destinoRoto)).toContain(
      "La opción 1 del paso 1 apunta a un paso que no existe."
    );

    const destinoIndefinido = {
      ...baseV1,
      steps: [
        {
          ...baseV1.steps[0],
          opciones: [{ id: "op-y", texto: "Seguir", orden: 0 }],
        },
        baseV1.steps[1],
      ],
    };
    expect(validarEstructuraSpeech(destinoIndefinido)).toContain(
      "La opción 1 del paso 1 tiene destino inválido."
    );

    const sinListas = { ...baseV1, steps: [{ id: "e1", titulo: "X" }] };
    expect(validarEstructuraSpeech(sinListas)).toContain(
      "El paso 1 no tiene lista de preguntas."
    );
  });
});

describe("normalizarSpeech: migración v1 → v2 (1.11.0)", () => {
  /** Guion en la forma anterior a la 1.11.0, tal cual queda en storage. */
  const speechV1 = () => ({
    id: "s-v1",
    nombre: "Guion viejo",
    descripcion: "Migrado",
    fechaCreacion: "2025-01-01T00:00:00.000Z",
    fechaModificacion: "2025-06-01T00:00:00.000Z",
    version: 3,
    startStepId: "e1",
    steps: [
      {
        id: "e1",
        titulo: "Saludo",
        contenido: "Hola, ¿puedo hablar?",
        orden: 0,
        opciones: [
          { id: "op1", texto: "Seguir", targetStepId: "e2", orden: 0 },
          { id: "op2", texto: "Fin", targetStepId: null, orden: 1 },
        ],
      },
      { id: "e2", titulo: "Cierre", contenido: "Gracias", orden: 1, opciones: [] },
    ],
  });

  it("envuelve las opciones v1 en una pregunta implícita y agrega los campos nuevos", () => {
    const v2 = normalizarSpeech(speechV1());

    // Etapa: sin espejo "opciones", con una pregunta implícita (id determinista).
    expect(v2.steps[0].opciones).toBeUndefined();
    expect(v2.steps[0].preguntas).toHaveLength(1);
    expect(v2.steps[0].preguntas[0].id).toBe("preg-e1");
    expect(v2.steps[0].preguntas[0].opciones.map((o) => o.texto)).toEqual([
      "Seguir",
      "Fin",
    ]);
    expect(v2.steps[0].preguntas[0].opciones[0].targetStepId).toBe("e2");
    expect(v2.steps[1].preguntas).toHaveLength(1);
    expect(v2.steps[1].preguntas[0].opciones).toEqual([]);

    // Campos de etapa y de guion nuevos.
    expect(v2.steps[0].objetivo).toBe("");
    expect(v2.steps[0].camposRegistro).toEqual([]);
    expect(v2.archivado).toBe(false);
    expect(v2.estadosFinales).toEqual([]);
    expect(v2.reglas).toEqual([]);
    expect(v2.modulos).toHaveLength(1);
    expect(v2.modulos[0].tipo).toBe("objeciones");

    // Opción enriquecida con defaults (sin perder lo original).
    const op = v2.steps[0].preguntas[0].opciones[0];
    expect(op.id).toBe("op1");
    expect(op.respuestaSugerida).toBe("");
    expect(op.accion).toBe("");
    expect(op.requiereAclaracion).toBe(false);
    expect(op.finalizaLlamada).toBe(false);
    expect(op.estadoFinalId).toBeNull();
    expect(op.moduloId).toBeNull();

    // No toca metadatos de persistencia.
    expect(v2.version).toBe(3);
    expect(v2.fechaModificacion).toBe("2025-06-01T00:00:00.000Z");
    expect(validarSpeech(v2)).toEqual([]);
  });

  it("es idempotente: repetir la normalización devuelve el mismo objeto", () => {
    const v2 = normalizarSpeech(speechV1());
    expect(normalizarSpeech(v2)).toBe(v2);
    // Dos normalizaciones independientes del mismo v1 producen el mismo resultado.
    expect(normalizarSpeech(speechV1())).toEqual(normalizarSpeech(speechV1()));
  });

  it("no es destructiva: conserva textos, destinos e ids originales", () => {
    const v2 = normalizarSpeech(speechV1());
    expect(v2.id).toBe("s-v1");
    expect(v2.nombre).toBe("Guion viejo");
    expect(v2.steps.map((s) => s.id)).toEqual(["e1", "e2"]);
    expect(v2.steps[0].contenido).toBe("Hola, ¿puedo hablar?");
    expect(v2.steps[0].preguntas[0].opciones.map((o) => o.id)).toEqual(["op1", "op2"]);
    expect(v2.steps[1].titulo).toBe("Cierre");
  });

  it("un guion nuevo en v2 se devuelve tal cual (misma referencia)", () => {
    const speech = crearSpeechInteractivo({ nombre: "Nuevo" });
    expect(normalizarSpeech(speech)).toBe(speech);
    expect(normalizarSpeech(null)).toBe(null);
    expect(normalizarSpeech("nope")).toBe("nope");
  });
});

describe("preguntas por etapa (nivel nuevo 1.11.0)", () => {
  it("agregarPregunta/agregarOpcion reparten opciones por pregunta", () => {
    let speech = nuevo();
    const stepId = speech.startStepId;
    speech = agregarPregunta(speech, stepId, "¿Qué lesión tuviste?");
    speech = agregarPregunta(speech, stepId, "¿Cómo sigue?");
    expect(speech.steps[0].preguntas.map((p) => p.texto)).toEqual([
      "¿Qué lesión tuviste?",
      "¿Cómo sigue?",
    ]);

    const [q1, q2] = speech.steps[0].preguntas;
    speech = agregarOpcion(speech, stepId, "La explica", q1.id);
    speech = agregarOpcion(speech, stepId, "Avanzar", q2.id);
    speech = agregarOpcion(speech, stepId, "Primera también", q1.id);
    expect(opcionesDe0(speech).map((o) => o.texto)).toEqual([
      "La explica",
      "Primera también",
    ]);
    expect(speech.steps[0].preguntas[1].opciones.map((o) => o.texto)).toEqual(["Avanzar"]);
    // Sin preguntaId se usa la primera.
    speech = agregarOpcion(speech, stepId, "Default");
    expect(opcionesDe0(speech).map((o) => o.texto)).toContain("Default");
    // Pregunta inexistente: no agrega nada.
    const antes = JSON.stringify(speech.steps[0].preguntas);
    expect(agregarOpcion(speech, stepId, "X", "no-existe").steps[0].preguntas).toEqual(
      JSON.parse(antes)
    );
  });

  it("actualizarPregunta cambia texto y obligatoriedad", () => {
    let speech = nuevo();
    speech = agregarPregunta(speech, speech.startStepId, "Pregunta");
    const qId = speech.steps[0].preguntas[0].id;
    speech = actualizarPregunta(speech, speech.startStepId, qId, {
      texto: "Otra",
      obligatoria: true,
    });
    expect(speech.steps[0].preguntas[0].texto).toBe("Otra");
    expect(speech.steps[0].preguntas[0].obligatoria).toBe(true);
    // Sanitiza HTML.
    speech = actualizarPregunta(speech, speech.startStepId, qId, { texto: "<b>hi</b>" });
    expect(speech.steps[0].preguntas[0].texto).toBe("hi");
  });

  it("eliminarPregunta quita la pregunta con sus opciones y no toca otras", () => {
    let speech = nuevo();
    const stepId = speech.startStepId;
    speech = agregarPregunta(speech, stepId, "Primera");
    speech = agregarPregunta(speech, stepId, "Segunda");
    const [q1, q2] = speech.steps[0].preguntas;
    speech = agregarOpcion(speech, stepId, "A", q1.id);
    speech = agregarOpcion(speech, stepId, "B", q2.id);

    speech = eliminarPregunta(speech, stepId, q1.id);
    expect(speech.steps[0].preguntas).toHaveLength(1);
    expect(speech.steps[0].preguntas[0].id).toBe(q2.id);
    expect(speech.steps[0].preguntas[0].opciones.map((o) => o.texto)).toEqual(["B"]);
    expect(eliminarPregunta(speech, stepId, "no-existe")).toBe(speech);
    expect(eliminarPregunta(speech, "no-existe", q2.id)).toBe(speech);
  });

  it("moverPregunta reordena dentro de la etapa y fuera de rango no cambia", () => {
    let speech = nuevo();
    const stepId = speech.startStepId;
    speech = agregarPregunta(speech, stepId, "1");
    speech = agregarPregunta(speech, stepId, "2");
    speech = agregarPregunta(speech, stepId, "3");
    const ids = speech.steps[0].preguntas.map((p) => p.id);

    const movido = moverPregunta(speech, stepId, ids[0], 1);
    expect(movido.steps[0].preguntas.map((p) => p.texto)).toEqual(["2", "1", "3"]);
    expect(moverPregunta(speech, stepId, ids[0], -1)).toBe(speech);
    expect(moverPregunta(speech, stepId, ids[0], 5)).toBe(speech);
    expect(moverPregunta(speech, stepId, "no-existe", 1)).toBe(speech);
  });
});

describe("opciones v2: respuesta sugerida, acciones y cierre (§2.2/§2.3)", () => {
  const conOpcion = () => {
    let speech = nuevo();
    speech = agregarOpcion(speech, speech.startStepId, "Sí, recuerda");
    const opId = speech.steps[0].preguntas[0].opciones[0].id;
    return { speech, opId };
  };

  it("actualizarOpcion guarda respuesta sugerida, acción y datos a registrar", () => {
    const { speech, opId } = conOpcion();
    const actualizado = actualizarOpcion(speech, speech.startStepId, opId, {
      respuestaSugerida: "Perfecto, cuénteme cómo fue.",
      accion: "Escuchar y no interrumpir.",
      datosARegistrar: "Descripción de la lesión",
    });
    const op = actualizado.steps[0].preguntas[0].opciones[0];
    expect(op.respuestaSugerida).toBe("Perfecto, cuénteme cómo fue.");
    expect(op.accion).toBe("Escuchar y no interrumpir.");
    expect(op.datosARegistrar).toBe("Descripción de la lesión");
    // Sanitiza HTML en los textos nuevos.
    const limpio = actualizarOpcion(speech, speech.startStepId, opId, {
      respuestaSugerida: "<script>x</script>ok",
    });
    expect(limpio.steps[0].preguntas[0].opciones[0].respuestaSugerida).toBe("ok");
  });

  it("configura aclaración obligatoria, cierre con estado final y módulo", () => {
    let { speech, opId } = conOpcion();
    speech = agregarEstadoFinal(speech, "No contesta");
    speech = agregarModulo(speech, { tipo: "objeciones", titulo: "Dudas" });
    const estadoId = speech.estadosFinales[0].id;
    const moduloId = speech.modulos[1].id;

    const op = actualizarOpcion(speech, speech.startStepId, opId, {
      requiereAclaracion: true,
      finalizaLlamada: true,
      estadoFinalId: estadoId,
      moduloId,
    }).steps[0].preguntas[0].opciones[0];
    expect(op.requiereAclaracion).toBe(true);
    expect(op.finalizaLlamada).toBe(true);
    expect(op.estadoFinalId).toBe(estadoId);
    expect(op.moduloId).toBe(moduloId);
    expect(validarSpeech(speech)).toEqual([]);
  });

  it("normaliza asignaciones: descarta basura y sanitiza valores", () => {
    const { speech, opId } = conOpcion();
    const op = actualizarOpcion(speech, speech.startStepId, opId, {
      asignaciones: [
        { campoId: "c1", valor: "<b>123</b>" },
        { campoId: "", valor: "x" },
        "junk",
        { valor: "sin-campo" },
      ],
    }).steps[0].preguntas[0].opciones[0];
    expect(op.asignaciones).toEqual([{ campoId: "c1", valor: "123" }]);
    // Sin tocarlo conserva la referencia.
    expect(
      actualizarOpcion(speech, speech.startStepId, opId, {}).steps[0].preguntas[0]
        .opciones[0].asignaciones
    ).toEqual([]);
  });
});

describe("campos de registro por etapa (§3)", () => {
  it("TIPOS_CAMPO cubre los 8 tipos del spec y esTipoCampoValido los valida", () => {
    expect(TIPOS_CAMPO.map((t) => t.tipo)).toEqual([
      "texto-corto",
      "texto-largo",
      "seleccion-unica",
      "seleccion-multiple",
      "si-no",
      "fecha",
      "hora",
      "observaciones",
    ]);
    expect(esTipoCampoValido("fecha")).toBe(true);
    expect(esTipoCampoValido("voodoo")).toBe(false);
  });

  it("agregarCampo crea con defaults y actualizarCampo edita nombre/tipo/obligatorio/opciones", () => {
    let speech = nuevo();
    const stepId = speech.startStepId;
    speech = agregarCampo(speech, stepId, { nombre: "Teléfono" });
    const campo = speech.steps[0].camposRegistro[0];
    expect(campo.tipo).toBe("texto-corto");
    expect(campo.obligatorio).toBe(false);
    expect(campo.opciones).toEqual([]);

    speech = actualizarCampo(speech, stepId, campo.id, {
      nombre: "Motivo",
      tipo: "seleccion-unica",
      obligatorio: true,
      opciones: ["A", "", "B"],
    });
    const editado = speech.steps[0].camposRegistro[0];
    expect(editado.nombre).toBe("Motivo");
    expect(editado.tipo).toBe("seleccion-unica");
    expect(editado.obligatorio).toBe(true);
    expect(editado.opciones).toEqual(["A", "B"]);

    // Tipo inválido: se ignora (no rompe el guion con tipos basura).
    const conTipoRaro = actualizarCampo(speech, stepId, campo.id, { tipo: "voodoo" });
    expect(conTipoRaro.steps[0].camposRegistro[0].tipo).toBe("seleccion-unica");
    expect(actualizarCampo(speech, stepId, "no-existe", { nombre: "X" })).not.toBe(speech);
  });

  it("eliminarCampo purga las asignaciones que lo referenciaban", () => {
    let speech = nuevo();
    const stepId = speech.startStepId;
    speech = agregarCampo(speech, stepId, { nombre: "Hora solicitada" });
    speech = agregarOpcion(speech, stepId, "Ocupado");
    const campoId = speech.steps[0].camposRegistro[0].id;
    const opId = speech.steps[0].preguntas[0].opciones[0].id;
    speech = actualizarOpcion(speech, stepId, opId, {
      asignaciones: [{ campoId, valor: "10:30" }],
    });

    speech = eliminarCampo(speech, stepId, campoId);
    expect(speech.steps[0].camposRegistro).toHaveLength(0);
    expect(speech.steps[0].preguntas[0].opciones[0].asignaciones).toEqual([]);
    expect(validarSpeech(speech)).toEqual([]);
    expect(eliminarCampo(speech, stepId, "no-existe")).toBe(speech);
  });

  it("moverCampo reordena dentro de la etapa; fuera de rango no cambia", () => {
    let speech = nuevo();
    const stepId = speech.startStepId;
    speech = agregarCampo(speech, stepId, { nombre: "Uno" });
    speech = agregarCampo(speech, stepId, { nombre: "Dos" });
    const ids = speech.steps[0].camposRegistro.map((c) => c.id);
    const movido = moverCampo(speech, stepId, ids[0], 1);
    expect(movido.steps[0].camposRegistro.map((c) => c.nombre)).toEqual(["Dos", "Uno"]);
    expect(moverCampo(speech, stepId, ids[0], -1)).toBe(speech);
    expect(moverCampo(speech, stepId, ids[0], 9)).toBe(speech);
  });
});

describe("estados finales, módulos, reglas y archivado (§2.4/§2.5/§8)", () => {
  it("estados finales: alta, edición y baja limpia referencias de opciones", () => {
    let speech = nuevo();
    const stepId = speech.startStepId;
    speech = agregarEstadoFinal(speech, "Derivación coordinada");
    speech = agregarEstadoFinal(speech, "Llamada interrumpida");
    expect(speech.estadosFinales.map((e) => e.nombre)).toEqual([
      "Derivación coordinada",
      "Llamada interrumpida",
    ]);

    const estadoId = speech.estadosFinales[0].id;
    speech = actualizarEstadoFinal(speech, estadoId, { nombre: "Derivado" });
    expect(speech.estadosFinales[0].nombre).toBe("Derivado");
    expect(actualizarEstadoFinal(speech, "no-existe", { nombre: "X" })).toBe(speech);

    speech = agregarOpcion(speech, stepId, "Finaliza acá");
    const opId = speech.steps[0].preguntas[0].opciones[0].id;
    speech = actualizarOpcion(speech, stepId, opId, {
      finalizaLlamada: true,
      estadoFinalId: estadoId,
    });

    speech = eliminarEstadoFinal(speech, estadoId);
    expect(speech.estadosFinales).toHaveLength(1);
    expect(speech.steps[0].preguntas[0].opciones[0].estadoFinalId).toBeNull();
    expect(validarSpeech(speech)).toEqual([]);
    expect(eliminarEstadoFinal(speech, "no-existe")).toBe(speech);
  });

  it("módulos: alta, edición de título y baja limpia moduloId de las opciones", () => {
    let speech = nuevo(); // ya trae el módulo de objeciones
    const stepId = speech.startStepId;
    speech = agregarModulo(speech, { tipo: "objeciones", titulo: "Segundo panel" });
    expect(speech.modulos).toHaveLength(2);

    const moduloId = speech.modulos[1].id;
    speech = actualizarModulo(speech, moduloId, { titulo: "Renombrado" });
    expect(speech.modulos[1].titulo).toBe("Renombrado");
    expect(actualizarModulo(speech, "no-existe", { titulo: "X" })).toBe(speech);

    speech = agregarOpcion(speech, stepId, "Ver objeciones");
    const opId = speech.steps[0].preguntas[0].opciones[0].id;
    speech = actualizarOpcion(speech, stepId, opId, { moduloId });
    speech = eliminarModulo(speech, moduloId);
    expect(speech.modulos).toHaveLength(1);
    expect(speech.steps[0].preguntas[0].opciones[0].moduloId).toBeNull();
    expect(validarSpeech(speech)).toEqual([]);
    expect(eliminarModulo(speech, "no-existe")).toBe(speech);
  });

  it("setArchivado solo cambia cuando corresponde; actualizarReglas sanea la lista", () => {
    const speech = nuevo();
    expect(setArchivado(speech, false)).toBe(speech); // identidad: ya estaba así
    const archivado = setArchivado(speech, true);
    expect(archivado.archivado).toBe(true);
    expect(archivado.version).toBe(speech.version + 1);

    const conReglas = actualizarReglas(speech, [
      "No presionar al trabajador.",
      42,
      "No garantizar una indemnización.",
    ]);
    expect(conReglas.reglas).toEqual([
      "No presionar al trabajador.",
      "No garantizar una indemnización.",
    ]);
    const saneado = actualizarReglas(speech, ["<b>Regla</b>"]);
    expect(saneado.reglas).toEqual(["Regla"]);
  });
});

describe("motor de navegación resolverDestino (§2.2/§9)", () => {
  /** Guion de 2 etapas: etapa 1 con 2 preguntas, etapa 2 sin preguntas. */
  const guion = () => {
    let speech = agregarPaso(nuevo());
    const e1 = speech.steps[0].id;
    const e2 = speech.steps[1].id;
    speech = actualizarPaso(speech, e1, { titulo: "Uno" });
    speech = actualizarPaso(speech, e2, { titulo: "Dos" });
    speech = agregarPregunta(speech, e1, "P1");
    speech = agregarPregunta(speech, e1, "P2");
    speech = agregarOpcion(speech, e1, "Sin destino", speech.steps[0].preguntas[0].id);
    speech = agregarOpcion(speech, e1, "Con destino", speech.steps[0].preguntas[1].id);
    return speech;
  };

  it("sigue las tres reglas: destino explícito, siguiente pregunta y siguiente etapa", () => {
    const speech = guion();
    const e1 = speech.steps[0].id;
    const e2 = speech.steps[1].id;
    const sinDestino = speech.steps[0].preguntas[0].opciones[0];
    const conDestino = speech.steps[0].preguntas[1].opciones[0];
    speech.steps[1]; // e2 disponible

    // 1) Destino explícito → salta a la etapa destino (primera pregunta).
    const actualizado = actualizarOpcion(speech, e1, conDestino.id, { targetStepId: e2 });
    const opConDestino = actualizado.steps[0].preguntas[1].opciones[0];
    expect(resolverDestino(actualizado, e1, 1, opConDestino)).toEqual({
      stepId: e2,
      preguntaIdx: 0,
      fin: false,
    });

    // 2) Sin destino, hay más preguntas → siguiente pregunta de la etapa.
    expect(resolverDestino(speech, e1, 0, sinDestino)).toEqual({
      stepId: e1,
      preguntaIdx: 1,
      fin: false,
    });

    // 3) Última pregunta sin destino → siguiente etapa por orden.
    expect(resolverDestino(speech, e1, 1, null)).toEqual({
      stepId: e2,
      preguntaIdx: 0,
      fin: false,
    });

    // 4) "Siguiente" (opcion null) en la última etapa → fin del recorrido.
    expect(resolverDestino(speech, e2, 0, null)).toEqual({
      stepId: null,
      preguntaIdx: 0,
      fin: true,
    });
  });

  it("cae al avance lineal cuando el destino está roto o la etapa no existe", () => {
    const speech = guion();
    const e1 = speech.steps[0].id;
    const rota = { id: "op", texto: "x", targetStepId: "no-existe" };
    expect(resolverDestino(speech, e1, 0, rota)).toEqual({
      stepId: e1,
      preguntaIdx: 1,
      fin: false,
    });
    expect(resolverDestino(speech, "etapa-fantasma", 0, null)).toEqual({
      stepId: null,
      preguntaIdx: 0,
      fin: true,
    });
    // finalizaLlamada NO lo decide el motor: lo evalúa la UI antes (§2.5).
    const queCierra = { id: "op", texto: "x", targetStepId: null, finalizaLlamada: true };
    expect(resolverDestino(speech, e1, 0, queCierra).fin).toBe(false);
  });
});

describe("camposObligatoriosPendientes (§3/§2.1)", () => {
  const conCampos = () => {
    let speech = nuevo();
    const stepId = speech.startStepId;
    speech = agregarCampo(speech, stepId, { nombre: "Teléfono", tipo: "texto-corto", obligatorio: true });
    speech = agregarCampo(speech, stepId, { nombre: "Email", tipo: "texto-corto" });
    speech = agregarCampo(speech, stepId, { nombre: "Motivo", tipo: "seleccion-unica", obligatorio: true, opciones: ["A"] });
    speech = agregarCampo(speech, stepId, { nombre: "Confirmado", tipo: "si-no", obligatorio: true });
    speech = agregarCampo(speech, stepId, { nombre: "Temas", tipo: "seleccion-multiple", obligatorio: true, opciones: ["x"] });
    return { speech, stepId };
  };

  it("lista solo los obligatorios sin valor; los opcionales nunca bloquean", () => {
    const { speech, stepId } = conCampos();
    expect(camposObligatoriosPendientes(speech, stepId, {})).toEqual([
      "Teléfono",
      "Motivo",
      "Confirmado",
      "Temas",
    ]);

    const [tel, email, motivo, confirmado, temas] = speech.steps[0].camposRegistro;
    expect(email.obligatorio).toBe(false);
    expect(
      camposObligatoriosPendientes(speech, stepId, {
        [tel.id]: "123",
        [motivo.id]: "A",
        [confirmado.id]: "no",
        [temas.id]: ["x"],
      })
    ).toEqual([]);
  });

  it("interpreta los valores según el tipo: múltiple vacío y si-no sin responder cuentan", () => {
    const { speech, stepId } = conCampos();
    const [tel, , motivo, confirmado, temas] = speech.steps[0].camposRegistro;

    expect(
      camposObligatoriosPendientes(speech, stepId, {
        [tel.id]: "   ",
        [motivo.id]: "",
        [confirmado.id]: "",
        [temas.id]: [],
      })
    ).toEqual(["Teléfono", "Motivo", "Confirmado", "Temas"]);

    // "si" y "no" son respuestas válidas; "" es pendiente.
    expect(
      camposObligatoriosPendientes(speech, stepId, {
        [tel.id]: "x",
        [motivo.id]: "A",
        [confirmado.id]: "si",
        [temas.id]: ["x"],
      })
    ).toEqual([]);
  });

  it("etapa inexistente o sin campos devuelve lista vacía", () => {
    const { speech } = conCampos();
    expect(camposObligatoriosPendientes(speech, "no-existe", {})).toEqual([]);
    const sinCampos = agregarPaso(speech);
    expect(
      camposObligatoriosPendientes(sinCampos, sinCampos.steps[1].id, {})
    ).toEqual([]);
  });
});

describe("validación v2 (§4.2)", () => {
  it("un destino ya no es obligatorio (avance lineal)", () => {
    let speech = nuevo();
    speech = agregarOpcion(speech, speech.startStepId, "Continuar en línea");
    expect(validarSpeech(speech)).toEqual([]);
  });

  it("reporta referencias rotas a estados, módulos y asignaciones", () => {
    let speech = crearSpeechInteractivo({ nombre: "G" });
    speech = agregarEstadoFinal(speech, "Derivado");
    speech = agregarModulo(speech, { tipo: "objeciones", titulo: "Otro" });
    speech = agregarOpcion(speech, speech.startStepId, "Ir");
    const opId = speech.steps[0].preguntas[0].opciones[0].id;
    speech = actualizarOpcion(speech, speech.startStepId, opId, {
      estadoFinalId: "estado-fantasma",
      moduloId: "modulo-fantasma",
      asignaciones: [{ campoId: "campo-ajeno", valor: "x" }],
    });

    const errores = validarSpeech(speech);
    expect(errores.some((e) => e.includes("estado final que no existe"))).toBe(true);
    expect(errores.some((e) => e.includes("módulo que no existe"))).toBe(true);
    expect(errores.some((e) => e.includes("dato de registro sin campo válido"))).toBe(true);
  });

  it("reporta campos sin nombre, con tipo inválido o selección sin opciones", () => {
    const base = nuevo();
    const pasoBase = base.steps[0];

    const sinNombre = {
      ...base,
      steps: [{ ...pasoBase, camposRegistro: [{ id: "c1", nombre: "  ", tipo: "texto-corto", obligatorio: false, opciones: [] }] }],
    };
    expect(validarSpeech(sinNombre).some((e) => e.includes("no tiene nombre"))).toBe(true);

    const tipoRaro = {
      ...base,
      steps: [{ ...pasoBase, camposRegistro: [{ id: "c2", nombre: "X", tipo: "voodoo", obligatorio: false, opciones: [] }] }],
    };
    expect(validarSpeech(tipoRaro).some((e) => e.includes("tipo inválido"))).toBe(true);

    const seleccionVacia = {
      ...base,
      steps: [{ ...pasoBase, camposRegistro: [{ id: "c3", nombre: "Zona", tipo: "seleccion-unica", obligatorio: false, opciones: [] }] }],
    };
    expect(validarSpeech(seleccionVacia).some((e) => e.includes("no tiene opciones"))).toBe(true);

    // Selección con opciones: válida.
    const seleccionOk = {
      ...base,
      steps: [{ ...pasoBase, camposRegistro: [{ id: "c4", nombre: "Zona", tipo: "seleccion-unica", obligatorio: false, opciones: ["Norte"] }] }],
    };
    expect(validarSpeech(seleccionOk)).toEqual([]);
  });

  it("incluye ids de campos, estados y módulos en la detección de duplicados", () => {
    const base = nuevo();
    const pasoBase = base.steps[0];
    const conDups = {
      ...base,
      steps: [
        {
          ...pasoBase,
          camposRegistro: [{ id: "dup-id", nombre: "A", tipo: "texto-corto", obligatorio: false, opciones: [] }],
        },
        { ...pasoBase, id: "otro-paso", preguntas: [], camposRegistro: [{ id: "dup-id", nombre: "B", tipo: "texto-corto", obligatorio: false, opciones: [] }] },
      ],
      startStepId: pasoBase.id,
    };
    expect(validarSpeech(conDups).some((e) => e.startsWith("IDs duplicados:") && e.includes("dup-id"))).toBe(true);
  });
});

describe("duplicarSpeech con contenido v2", () => {
  it("regenera ids de campos, estados y módulos y re-apunta todas las referencias", () => {
    let speech = crearSpeechInteractivo({ nombre: "Base" });
    const stepId = speech.startStepId;
    speech = agregarCampo(speech, stepId, { nombre: "Tel", tipo: "texto-corto" });
    speech = agregarEstadoFinal(speech, "Derivado");
    speech = agregarModulo(speech, { tipo: "objeciones", titulo: "Extra" });
    speech = agregarOpcion(speech, stepId, "Sí");
    const campoId = speech.steps[0].camposRegistro[0].id;
    const estadoId = speech.estadosFinales[0].id;
    const moduloId = speech.modulos[1].id;
    const opId = speech.steps[0].preguntas[0].opciones[0].id;
    speech = actualizarOpcion(speech, stepId, opId, {
      estadoFinalId: estadoId,
      moduloId,
      asignaciones: [{ campoId, valor: "123" }],
    });
    speech = actualizarReglas(speech, ["No presionar."]);
    speech = setArchivado(speech, true);

    const copia = duplicarSpeech(speech);
    expect(copia.archivado).toBe(false); // la copia nace activa
    expect(copia.reglas).toEqual(["No presionar."]);
    expect(copia.modulos).toHaveLength(2);
    expect(copia.modulos[0].id).not.toBe(speech.modulos[0].id);

    const campoCopia = copia.steps[0].camposRegistro[0];
    expect(campoCopia.id).not.toBe(campoId);
    const estadoCopia = copia.estadosFinales[0];
    expect(estadoCopia.id).not.toBe(estadoId);
    expect(estadoCopia.nombre).toBe("Derivado");
    const moduloCopia = copia.modulos[1];
    expect(moduloCopia.id).not.toBe(moduloId);

    const opCopia = copia.steps[0].preguntas[0].opciones[0];
    expect(opCopia.estadoFinalId).toBe(estadoCopia.id);
    expect(opCopia.moduloId).toBe(moduloCopia.id);
    expect(opCopia.asignaciones).toEqual([{ campoId: campoCopia.id, valor: "123" }]);
    expect(validarSpeech(copia)).toEqual([]);
  });
});

describe("robustez ante datos incompletos (1.9.3)", () => {
  const sinSteps = { id: "s-x", nombre: "importado roto" };
  const pasoSinOpciones = { id: "s1", titulo: "Paso" };

  it("los mutadores no explotan cuando steps, preguntas u opciones faltan", () => {
    expect(() => agregarPaso(sinSteps)).not.toThrow();
    expect(() => eliminarPaso(sinSteps, "s1")).not.toThrow();
    expect(() => referenciasA(sinSteps, "s1")).not.toThrow();
    expect(() => moverPaso(sinSteps, "s1", 1)).not.toThrow();
    expect(() => actualizarPaso(sinSteps, "s1", { titulo: "x" })).not.toThrow();
    expect(() => marcarInicio(sinSteps, "s1")).not.toThrow();
    expect(() => duplicarSpeech(sinSteps)).not.toThrow();
    expect(() => agregarPregunta(sinSteps, "s1", "P")).not.toThrow();
    expect(() => agregarCampo(sinSteps, "s1", { nombre: "C" })).not.toThrow();
    expect(() => agregarEstadoFinal(sinSteps, "E")).not.toThrow();
    expect(() => agregarModulo(sinSteps, {})).not.toThrow();
    expect(() => actualizarReglas(sinSteps, ["R"])).not.toThrow();
    expect(() => normalizarSpeech(sinSteps)).not.toThrow();
    expect(() => resolverDestino(sinSteps, "s1", 0, null)).not.toThrow();
    expect(() => camposObligatoriosPendientes(sinSteps, "s1", {})).not.toThrow();

    const sinOpciones = { id: "s", nombre: "n", steps: [pasoSinOpciones] };
    expect(() => duplicarPaso(sinOpciones, "s1")).not.toThrow();
    expect(() => moverOpcion(sinOpciones, "s1", "op1", 1)).not.toThrow();
    expect(() => duplicarOpcion(sinOpciones, "s1", "op1")).not.toThrow();
    expect(() => crearPasoConectado(sinOpciones, "s1", "op1")).not.toThrow();
    expect(() => actualizarOpcion(sinOpciones, "s1", "op1", { texto: "x" })).not.toThrow();
    expect(() => eliminarOpcion(sinOpciones, "s1", "op1")).not.toThrow();
    expect(() => agregarOpcion(sinOpciones, "s1", "Texto")).not.toThrow();
    expect(() => eliminarPregunta(sinOpciones, "s1", "p1")).not.toThrow();
    expect(() => moverPregunta(sinOpciones, "s1", "p1", 1)).not.toThrow();
    expect(() => actualizarPregunta(sinOpciones, "s1", "p1", { texto: "x" })).not.toThrow();
    expect(() => eliminarCampo(sinOpciones, "s1", "c1")).not.toThrow();
    expect(() => moverCampo(sinOpciones, "s1", "c1", 1)).not.toThrow();
    expect(() => eliminarEstadoFinal(sinOpciones, "e1")).not.toThrow();
    expect(() => eliminarModulo(sinOpciones, "m1")).not.toThrow();
  });

  it("agregarPaso repara un speech sin steps", () => {
    const r = agregarPaso(sinSteps);
    expect(Array.isArray(r.steps)).toBe(true);
    expect(r.steps).toHaveLength(1);
    expect(r.startStepId).toBe(r.steps[0].id);
  });

  it("agregarPaso sobre un paso sin preguntas lo deja con lista vacía", () => {
    const r = agregarPaso({ id: "s", nombre: "n", steps: [pasoSinOpciones] });
    expect(r.steps[0].preguntas).toEqual([]);
    expect(r.steps.map((s) => s.orden)).toEqual([0, 1]);
  });

  it("agregarOpcion sobre un paso sin preguntas crea la primera con la opción", () => {
    const r = agregarOpcion(
      { id: "s", nombre: "n", steps: [pasoSinOpciones] },
      "s1",
      "Continuar"
    );
    expect(r.steps[0].preguntas).toHaveLength(1);
    expect(r.steps[0].preguntas[0].opciones).toHaveLength(1);
    expect(r.steps[0].preguntas[0].opciones[0].texto).toBe("Continuar");
  });

  it("crearPaso/crearOpcion/crearSpeechInteractivo toleran valores no-string", () => {
    expect(crearPaso(null, undefined).titulo).toBe("");
    expect(crearPaso(123).titulo).toBe("123");
    expect(crearPaso(null).preguntas).toEqual([]);
    expect(crearOpcion(undefined).texto).toBe("");
    expect(crearOpcion(undefined).targetStepId).toBeNull();
    expect(crearSpeechInteractivo({}).nombre).toBe("");
    expect(crearSpeechInteractivo({}).modulos).toHaveLength(1);
  });
});
