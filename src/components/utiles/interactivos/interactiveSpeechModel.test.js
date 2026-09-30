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
} from "./interactiveSpeechModel";

const nuevo = () =>
  crearSpeechInteractivo({ nombre: "Accidente Laboral", descripcion: "General" });

function armarSpeech() {
  let speech = agregarPaso(agregarPaso(nuevo()));
  speech = actualizarPaso(speech, speech.steps[0].id, { titulo: "Apertura" });
  speech = actualizarPaso(speech, speech.steps[1].id, { titulo: "Cierre" });
  speech = actualizarPaso(speech, speech.steps[2].id, { titulo: "Extra" });
  speech = agregarOpcion(speech, speech.steps[0].id, "Continuar");
  const opId = speech.steps[0].opciones[0].id;
  speech = actualizarOpcion(speech, speech.steps[0].id, opId, {
    targetStepId: speech.steps[1].id,
  });
  return speech;
}

describe("interactiveSpeechModel", () => {
  it("crea el speech con un paso inicial INICIO y campos de persistencia", () => {
    const speech = nuevo();
    expect(speech.id).toBeTruthy();
    expect(speech.nombre).toBe("Accidente Laboral");
    expect(speech.descripcion).toBe("General");
    expect(speech.version).toBe(1);
    expect(speech.fechaCreacion).toBeTruthy();
    expect(speech.fechaModificacion).toBeTruthy();
    expect(speech.steps).toHaveLength(1);
    expect(speech.startStepId).toBe(speech.steps[0].id);
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
    const opId = speech.steps.find((s) => s.id === paso2.id).opciones[0].id;
    speech = actualizarOpcion(speech, paso2.id, opId, {
      targetStepId: inicioId,
    });
    speech = duplicarPaso(speech, paso2.id);

    expect(speech.steps).toHaveLength(3);
    const copia = speech.steps[2];
    expect(copia.id).not.toBe(paso2.id);
    expect(copia.titulo).toBe("Pregunta clave (copia)");
    expect(copia.opciones).toHaveLength(1);
    expect(copia.opciones[0].id).not.toBe(opId);
    expect(copia.opciones[0].targetStepId).toBe(inicioId);
    expect(validarSpeech(speech)).toEqual([]);
  });

  it("eliminar un paso deja las referencias externas sin destino (error de validación)", () => {
    let speech = nuevo();
    speech = agregarPaso(speech);
    const inicio = speech.steps[0];
    const paso2 = speech.steps[1];
    speech = agregarOpcion(speech, inicio.id, "Ir al paso 2");
    const opId = speech.steps.find((s) => s.id === inicio.id).opciones[0].id;
    speech = actualizarOpcion(speech, inicio.id, opId, {
      targetStepId: paso2.id,
    });

    speech = eliminarPaso(speech, paso2.id);
    expect(speech.steps).toHaveLength(1);
    expect(speech.steps[0].opciones[0].targetStepId).toBeNull();
    expect(validarSpeech(speech)).toContain(
      `La opción "Ir al paso 2" del paso 1 no tiene destino.`
    );
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

  it("actualizarPaso sanitiza y actualiza titulo/contenido", () => {
    let speech = nuevo();
    speech = actualizarPaso(speech, speech.startStepId, {
      titulo: "Apertura",
      contenido: "Hola, ¿cómo estás?",
    });
    expect(speech.steps[0].titulo).toBe("Apertura");
    expect(speech.steps[0].contenido).toBe("Hola, ¿cómo estás?");
  });

  it("agregarOpcion crea sin destino y actualizarOpcion conecta", () => {
    let speech = nuevo();
    speech = agregarPaso(speech);
    const paso2 = speech.steps[1];
    speech = agregarOpcion(speech, speech.startStepId, "Sí, puedo hablar");
    const op = speech.steps[0].opciones[0];
    expect(op.targetStepId).toBeNull();
    expect(validarSpeech(speech)).toContain(
      'La opción "Sí, puedo hablar" del paso 1 no tiene destino.'
    );

    speech = actualizarOpcion(speech, speech.startStepId, op.id, {
      targetStepId: paso2.id,
    });
    expect(speech.steps[0].opciones[0].targetStepId).toBe(paso2.id);
    expect(validarSpeech(speech)).toEqual([]);
  });

  it("eliminarOpcion quita la opción", () => {
    let speech = nuevo();
    speech = agregarOpcion(speech, speech.startStepId, "Opción");
    const opId = speech.steps[0].opciones[0].id;
    speech = eliminarOpcion(speech, speech.startStepId, opId);
    expect(speech.steps[0].opciones).toHaveLength(0);
  });

  it("detecta destino a paso inexistente, ids duplicados y nombre vacío", () => {
    const speech = nuevo();
    const conDestinoRoto = {
      ...speech,
      steps: [
        {
          ...speech.steps[0],
          opciones: [
            { id: "op1", texto: "Seguir", targetStepId: "no-existe", orden: 0 },
          ],
        },
        { ...speech.steps[0], id: speech.steps[0].id, opciones: [] },
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
      paso.opciones.forEach((op, j) => {
        expect(op.id).not.toBe(original.steps[i].opciones[j].id);
      });
    });

    const opCopia = copia.steps[0].opciones[0];
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

  it("moverOpcion reordena las opciones dentro del paso", () => {
    let speech = armarSpeech();
    const pasoId = speech.steps[0].id;
    speech = agregarOpcion(speech, pasoId, "Segunda");
    speech = agregarOpcion(speech, pasoId, "Tercera");
    expect(speech.steps[0].opciones.map((o) => o.texto)).toEqual([
      "Continuar",
      "Segunda",
      "Tercera",
    ]);

    const primeraId = speech.steps[0].opciones[0].id;
    const movido = moverOpcion(speech, pasoId, primeraId, 1);
    expect(movido.steps[0].opciones.map((o) => o.texto)).toEqual([
      "Segunda",
      "Continuar",
      "Tercera",
    ]);
    expect(movido.steps[0].opciones.map((o) => o.orden)).toEqual([0, 1, 2]);
    expect(moverOpcion(speech, pasoId, primeraId, -1)).toBe(speech);
  });

  it("duplicarOpcion inserta una copia con id nuevo después del original", () => {
    const speech = armarSpeech();
    const pasoId = speech.steps[0].id;
    const opId = speech.steps[0].opciones[0].id;
    const conCopia = duplicarOpcion(speech, pasoId, opId);
    expect(conCopia.steps[0].opciones).toHaveLength(2);
    expect(conCopia.steps[0].opciones[1].id).not.toBe(opId);
    expect(conCopia.steps[0].opciones[1].texto).toBe("Continuar");
    expect(conCopia.steps[0].opciones[1].targetStepId).toBe(
      speech.steps[0].opciones[0].targetStepId
    );
    expect(conCopia.steps[0].opciones.map((o) => o.orden)).toEqual([0, 1]);
    expect(duplicarOpcion(speech, pasoId, "no-existe")).toBe(speech);
  });

  it("eliminarPaso con destinoReemplazo redirige las referencias", () => {
    const speech = armarSpeech();
    const pasoCierre = speech.steps[1].id;
    const pasoExtra = speech.steps[2].id;

    const redirigido = eliminarPaso(speech, pasoCierre, pasoExtra);
    expect(redirigido.steps).toHaveLength(2);
    expect(redirigido.steps[0].opciones[0].targetStepId).toBe(pasoExtra);
    expect(validarSpeech(redirigido)).toEqual([]);

    const invalido = eliminarPaso(speech, pasoCierre, "no-existe");
    expect(invalido.steps[0].opciones[0].targetStepId).toBeNull();
    expect(validarSpeech(invalido)).toContain(
      'La opción "Continuar" del paso 1 no tiene destino.'
    );
  });

  it("referenciasA lista los pasos y opciones que apuntan a un paso", () => {
    const speech = armarSpeech();
    const refs = referenciasA(speech, speech.steps[1].id);
    expect(refs).toHaveLength(1);
    expect(refs[0].stepId).toBe(speech.steps[0].id);
    expect(refs[0].opcionId).toBe(speech.steps[0].opciones[0].id);
    expect(referenciasA(speech, speech.steps[0].id)).toEqual([]);
  });

  it("crearPasoConectado agrega un paso al final y conecta la opción", () => {
    const speech = armarSpeech();
    const pasoId = speech.steps[0].id;
    const opId = speech.steps[0].opciones[0].id;
    const conectado = crearPasoConectado(speech, pasoId, opId);
    expect(conectado.steps).toHaveLength(4);
    const nuevoPaso = conectado.steps[3];
    expect(conectado.steps[0].opciones[0].targetStepId).toBe(nuevoPaso.id);
    expect(conectado.steps.map((s) => s.orden)).toEqual([0, 1, 2, 3]);
    expect(validarSpeech(conectado)).toEqual([]);
    expect(crearPasoConectado(speech, pasoId, "no-existe")).toBe(speech);
  });

  it("pasosAlcanzables calcula el flujo y advertencias marca huérfanos sin bloquear", () => {
    const speech = armarSpeech();
    const alcanzables = pasosAlcanzables(speech);
    expect(alcanzables.has(speech.steps[0].id)).toBe(true);
    expect(alcanzables.has(speech.steps[1].id)).toBe(true);
    expect(alcanzables.has(speech.steps[2].id)).toBe(false);

    const advertencias = advertenciasSpeech(speech);
    expect(advertencias).toHaveLength(1);
    expect(advertencias[0]).toContain("no está conectado desde el inicio");
    expect(advertencias[0]).toContain("Extra");
    expect(validarSpeech(speech)).toEqual([]);

    let conectado = agregarOpcion(speech, speech.steps[1].id, "Ir a extra");
    const opId2 = conectado.steps[1].opciones[0].id;
    conectado = actualizarOpcion(conectado, conectado.steps[1].id, opId2, {
      targetStepId: conectado.steps[2].id,
    });
    expect(advertenciasSpeech(conectado)).toEqual([]);

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

    const destinoRoto = {
      ...speech,
      steps: [
        {
          ...speech.steps[0],
          opciones: [{ id: "op-x", texto: "Seguir", targetStepId: "no-existe", orden: 0 }],
        },
        speech.steps[1],
        speech.steps[2],
      ],
    };
    expect(validarEstructuraSpeech(destinoRoto)).toContain(
      "La opción 1 del paso 1 apunta a un paso que no existe."
    );

    const destinoIndefinido = {
      ...speech,
      steps: [
        {
          ...speech.steps[0],
          opciones: [{ id: "op-y", texto: "Seguir", orden: 0 }],
        },
        speech.steps[1],
        speech.steps[2],
      ],
    };
    expect(validarEstructuraSpeech(destinoIndefinido)).toContain(
      "La opción 1 del paso 1 tiene destino inválido."
    );
  });
});

describe("robustez ante datos incompletos (1.9.3)", () => {
  const sinSteps = { id: "s-x", nombre: "importado roto" };
  const pasoSinOpciones = { id: "s1", titulo: "Paso" };

  it("los mutadores no explotan cuando steps u opciones faltan", () => {
    expect(() => agregarPaso(sinSteps)).not.toThrow();
    expect(() => eliminarPaso(sinSteps, "s1")).not.toThrow();
    expect(() => referenciasA(sinSteps, "s1")).not.toThrow();
    expect(() => moverPaso(sinSteps, "s1", 1)).not.toThrow();
    expect(() => actualizarPaso(sinSteps, "s1", { titulo: "x" })).not.toThrow();
    expect(() => marcarInicio(sinSteps, "s1")).not.toThrow();
    expect(() => duplicarSpeech(sinSteps)).not.toThrow();

    const sinOpciones = { id: "s", nombre: "n", steps: [pasoSinOpciones] };
    expect(() => duplicarPaso(sinOpciones, "s1")).not.toThrow();
    expect(() => moverOpcion(sinOpciones, "s1", "op1", 1)).not.toThrow();
    expect(() => duplicarOpcion(sinOpciones, "s1", "op1")).not.toThrow();
    expect(() => crearPasoConectado(sinOpciones, "s1", "op1")).not.toThrow();
    expect(() => actualizarOpcion(sinOpciones, "s1", "op1", { texto: "x" })).not.toThrow();
    expect(() => eliminarOpcion(sinOpciones, "s1", "op1")).not.toThrow();
    expect(() => agregarOpcion(sinOpciones, "s1", "Texto")).not.toThrow();
  });

  it("agregarPaso repara un speech sin steps", () => {
    const r = agregarPaso(sinSteps);
    expect(Array.isArray(r.steps)).toBe(true);
    expect(r.steps).toHaveLength(1);
    expect(r.startStepId).toBe(r.steps[0].id);
  });

  it("agregarPaso sobre un paso sin opciones lo reindexa con lista vacía", () => {
    const r = agregarPaso({ id: "s", nombre: "n", steps: [pasoSinOpciones] });
    expect(r.steps[0].opciones).toEqual([]);
    expect(r.steps.map((s) => s.orden)).toEqual([0, 1]);
  });

  it("agregarOpcion sobre un paso sin opciones agrega la primera opción", () => {
    const r = agregarOpcion(
      { id: "s", nombre: "n", steps: [pasoSinOpciones] },
      "s1",
      "Continuar"
    );
    expect(r.steps[0].opciones).toHaveLength(1);
    expect(r.steps[0].opciones[0].texto).toBe("Continuar");
  });

  it("crearPaso/crearOpcion/crearSpeechInteractivo toleran valores no-string", () => {
    expect(crearPaso(null, undefined).titulo).toBe("");
    expect(crearPaso(123).titulo).toBe("123");
    expect(crearOpcion(undefined).texto).toBe("");
    expect(crearSpeechInteractivo({}).nombre).toBe("");
  });
});
