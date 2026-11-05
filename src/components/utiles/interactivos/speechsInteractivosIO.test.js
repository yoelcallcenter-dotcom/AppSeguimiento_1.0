import { describe, it, expect } from "vitest";
import {
  FORMATO_TIPO,
  FORMATO_VERSION,
  nombreArchivoSpeechs,
  serializarSpeechs,
  parsearEnvelope,
  migrarEnvelope,
  prepararFilasImport,
  aplicarImportacion,
  fusionarObjeciones,
} from "./speechsInteractivosIO";
import {
  crearSpeechInteractivo,
  agregarPaso,
  agregarOpcion,
  actualizarOpcion,
  actualizarPaso,
  agregarPregunta,
  agregarCampo,
  agregarEstadoFinal,
  actualizarReglas,
  marcarInicio,
  validarSpeech,
} from "./interactiveSpeechModel";

function armarSpeech(nombre = "Accidente Laboral") {
  let speech = crearSpeechInteractivo({ nombre, descripcion: "General" });
  speech = agregarPaso(speech);
  speech = actualizarPaso(speech, speech.steps[1].id, { titulo: "Cierre" });
  speech = agregarOpcion(speech, speech.steps[0].id, "Continuar");
  const opId = speech.steps[0].preguntas[0].opciones[0].id;
  speech = actualizarOpcion(speech, speech.steps[0].id, opId, {
    targetStepId: speech.steps[1].id,
  });
  return speech;
}

/** Guion rico en contenido v2: para el roundtrip completo de export/import. */
function guionRico() {
  let speech = armarSpeech("Rico");
  const e1 = speech.steps[0].id;
  speech = agregarPregunta(speech, e1, "¿Qué lesión tuviste?");
  speech = actualizarOpcion(speech, e1, speech.steps[0].preguntas[0].opciones[0].id, {
    respuestaSugerida: "Cuénteme cómo fue.",
    accion: "Escuchar sin interrumpir.",
    requiereAclaracion: true,
  });
  speech = agregarCampo(speech, e1, { nombre: "Hora solicitada", tipo: "hora", obligatorio: true });
  speech = agregarEstadoFinal(speech, "No contesta");
  speech = actualizarReglas(speech, ["No presionar al trabajador."]);
  return speech;
}

describe("speechsInteractivosIO", () => {
  it("serializa con envelope v2 (con appVersion) y hace roundtrip completo", () => {
    const speech = armarSpeech();
    const texto = serializarSpeechs([speech]);
    const data = JSON.parse(texto);

    expect(data.type).toBe(FORMATO_TIPO);
    expect(data.type).toBe("appseguimiento-interactive-speech");
    expect(data.version).toBe(FORMATO_VERSION);
    expect(data.version).toBe(2);
    expect(data.fechaExportacion).toBeTruthy();
    expect(typeof data.appVersion).toBe("string");
    expect(data.speechs).toHaveLength(1);
    expect(data.speechs[0]).toEqual(speech);

    const parseado = parsearEnvelope(texto);
    expect(parseado.ok).toBe(true);
    expect(parseado.speechs[0].startStepId).toBe(speech.startStepId);
    expect(parseado.speechs[0].steps[0].preguntas[0].opciones[0].targetStepId).toBe(
      speech.steps[1].id
    );
    expect(parseado.speechs[0].steps[0].preguntas[0].opciones[0].id).toBe(
      speech.steps[0].preguntas[0].opciones[0].id
    );
  });

  it("el archivo contiene SOLO la definición del guion (§5.1: sin datos de llamadas)", () => {
    const data = JSON.parse(serializarSpeechs([guionRico()]));

    // Esquema exacto del guion exportado: si algún día se cuela un campo de
    // registros de llamada, este test lo detecta.
    expect(Object.keys(data.speechs[0]).sort()).toEqual([
      "archivado",
      "descripcion",
      "estadosFinales",
      "fechaCreacion",
      "fechaModificacion",
      "id",
      "modulos",
      "nombre",
      "reglas",
      "startStepId",
      "steps",
      "version",
    ]);
    expect(Object.keys(data.speechs[0].steps[0]).sort()).toEqual([
      "camposRegistro",
      "contenido",
      "id",
      "objetivo",
      "orden",
      "preguntas",
      "titulo",
    ]);
    expect(
      Object.keys(data.speechs[0].steps[0].preguntas[0].opciones[0]).sort()
    ).toEqual([
      "accion",
      "asignaciones",
      "datosARegistrar",
      "estadoFinalId",
      "finalizaLlamada",
      "id",
      "moduloId",
      "orden",
      "requiereAclaracion",
      "respuestaSugerida",
      "targetStepId",
      "texto",
    ]);
  });

  it("roundtrip conserva etapas, preguntas, ramificaciones, campos, estados y reglas (§10)", () => {
    const original = guionRico();
    const parseado = parsearEnvelope(serializarSpeechs([original]));
    expect(parseado.ok).toBe(true);
    const idaVuelta = parseado.speechs[0];

    expect(idaVuelta.steps).toHaveLength(2);
    expect(idaVuelta.steps[0].preguntas).toHaveLength(2);
    const op = idaVuelta.steps[0].preguntas[0].opciones[0];
    const opOriginal = original.steps[0].preguntas[0].opciones[0];
    expect(op.id).toBe(opOriginal.id);
    expect(op.respuestaSugerida).toBe("Cuénteme cómo fue.");
    expect(op.accion).toBe("Escuchar sin interrumpir.");
    expect(op.requiereAclaracion).toBe(true);
    expect(op.targetStepId).toBe(opOriginal.targetStepId);
    expect(idaVuelta.steps[0].camposRegistro[0].nombre).toBe("Hora solicitada");
    expect(idaVuelta.steps[0].camposRegistro[0].tipo).toBe("hora");
    expect(idaVuelta.estadosFinales.map((e) => e.nombre)).toEqual(["No contesta"]);
    expect(idaVuelta.reglas).toEqual(["No presionar al trabajador."]);

    // Y la importación de ese archivo deja la lista utilizable sin errores.
    const filas = prepararFilasImport(parseado.speechs, []);
    expect(filas[0].estado).toBe("nuevo");
    const { lista } = aplicarImportacion(filas, {}, []);
    expect(validarSpeech(lista[0])).toEqual([]);
  });

  it("nombreArchivoSpeechs sigue el patrón de la app", () => {
    expect(nombreArchivoSpeechs()).toMatch(/^speechs_interactivos_\d{4}-\d{2}-\d{2}\.json$/);
  });

  it("rechaza JSON malformado, formato desconocido y versiones futuras", () => {
    expect(parsearEnvelope("{esto no es json")).toEqual({
      ok: false,
      error: "El archivo no es un JSON válido.",
    });
    expect(parsearEnvelope('"hola"').ok).toBe(false);
    expect(parsearEnvelope("[]").ok).toBe(false);

    const otroFormato = JSON.stringify({ formato: "speechs", fecha: "x", items: [] });
    expect(parsearEnvelope(otroFormato).error).toContain("Tipo de archivo no reconocido");

    const futura = JSON.stringify({ type: FORMATO_TIPO, version: 99, speechs: [] });
    expect(parsearEnvelope(futura).error).toContain("Versión de formato no soportada (99)");

    const vacio = JSON.stringify({ type: FORMATO_TIPO, version: 2, speechs: [] });
    expect(parsearEnvelope(vacio)).toEqual({
      ok: false,
      error: "El archivo no contiene speechs.",
    });

    const sinLista = JSON.stringify({ type: FORMATO_TIPO, version: 2, speechs: "nope" });
    expect(parsearEnvelope(sinLista)).toEqual({
      ok: false,
      error: "El archivo no contiene la lista de speechs.",
    });
  });

  it("migra un envelope antiguo v0 a la versión actual rellenando metadatos", () => {
    const speech = armarSpeech();
    const opId = speech.steps[0].preguntas[0].opciones[0].id;
    const v0 = {
      type: FORMATO_TIPO,
      speechs: [
        {
          id: speech.id,
          nombre: speech.nombre,
          startStepId: speech.startStepId,
          steps: [
            {
              id: speech.steps[0].id,
              titulo: "Apertura",
              contenido: "Hola",
              opciones: [
                { id: opId, texto: "Continuar", targetStepId: speech.steps[1].id },
              ],
            },
            { id: speech.steps[1].id, titulo: "Cierre", contenido: "", opciones: [] },
          ],
        },
      ],
    };
    const migrado = migrarEnvelope(v0);
    expect(migrado.version).toBe(FORMATO_VERSION); // la cadena llega hasta v2
    expect(migrado.fechaExportacion).toBeTruthy();
    expect(migrado.speechs[0].fechaCreacion).toBeTruthy();
    expect(migrado.speechs[0].fechaModificacion).toBeTruthy();
    expect(migrado.speechs[0].version).toBe(1);
    expect(migrado.speechs[0].steps[0].orden).toBe(0);
    // v0/v1 → v2: las opciones sueltas pasan a la pregunta implícita.
    expect(migrado.speechs[0].steps[0].preguntas[0].opciones[0].targetStepId).toBe(
      speech.steps[1].id
    );

    const parseado = parsearEnvelope(JSON.stringify(v0));
    expect(parseado.ok).toBe(true);
    expect(prepararFilasImport(parseado.speechs, [])[0].estado).toBe("nuevo");
  });

  it("migra un envelope v1 (guiones con opciones sueltas) a la forma v2", () => {
    const v1 = {
      type: FORMATO_TIPO,
      version: 1,
      fechaExportacion: "2025-06-01T00:00:00.000Z",
      speechs: [
        {
          id: "v1s",
          nombre: "Guion v1",
          startStepId: "a",
          steps: [
            {
              id: "a",
              titulo: "A",
              contenido: "",
              orden: 0,
              opciones: [{ id: "o1", texto: "Seguir", targetStepId: "b", orden: 0 }],
            },
            { id: "b", titulo: "B", contenido: "", orden: 1, opciones: [] },
          ],
        },
      ],
    };
    const parseado = parsearEnvelope(JSON.stringify(v1));
    expect(parseado.ok).toBe(true);
    const s = parseado.speechs[0];
    expect(s.steps[0].opciones).toBeUndefined();
    expect(s.steps[0].preguntas).toHaveLength(1);
    expect(s.steps[0].preguntas[0].opciones[0].targetStepId).toBe("b");
    expect(s.archivado).toBe(false);
    expect(s.modulos).toHaveLength(1);
    expect(validarSpeech(s)).toEqual([]);

    // Y es re-importable como fila válida.
    expect(prepararFilasImport([s], [])[0].estado).toBe("nuevo");
  });

  it("prepara filas: nuevo, conflicto por id, inválido y advertencias de huérfanos", () => {
    const existente = armarSpeech("Existente");
    const nuevo = armarSpeech("Nueva ruta");
    const invalido = { ...nuevo, id: "mal-formado", steps: "no-array", nombre: "" };
    // Huérfano real: si el inicio es la etapa 2, la etapa 1 no se alcanza.
    const baseHuerfano = armarSpeech("Con huérfano");
    const conHuerfano = marcarInicio(baseHuerfano, baseHuerfano.steps[1].id);

    const filas = prepararFilasImport([existente, nuevo, invalido, conHuerfano], [
      existente,
    ]);

    expect(filas[0].estado).toBe("conflicto");
    expect(filas[0].estrategia).toBe("omitir");
    expect(filas[0].motivos).toEqual([]);
    expect(filas[1].estado).toBe("nuevo");
    expect(filas[1].estrategia).toBe(null);
    expect(filas[2].estado).toBe("invalido");
    expect(filas[2].motivos.length).toBeGreaterThan(0);
    expect(filas[3].estado).toBe("nuevo");
    expect(filas[3].advertencias[0]).toContain("no está conectado desde el inicio");

    const dupDentro = prepararFilasImport([existente, existente], []);
    expect(dupDentro[1].estado).toBe("conflicto");
    expect(dupDentro[1].motivos).toEqual(["ID repetido dentro del archivo."]);
  });

  it("aplica las cuatro estrategias con conteos correctos", () => {
    const existente = armarSpeech("Existente");
    const otro = armarSpeech("Otro");
    const filas = prepararFilasImport([existente, otro], [existente]);

    const { lista, res } = aplicarImportacion(
      filas,
      { [existente.id]: "reemplazar" },
      [existente]
    );
    expect(res).toEqual({
      agregados: 1,
      reemplazados: 1,
      omitidos: 0,
      copias: 0,
      objecionesAgregadas: 0,
    });
    expect(lista).toHaveLength(2);
    expect(lista.find((s) => s.id === existente.id)).toBe(existente);

    const omitido = aplicarImportacion([filas[0]], {}, [existente]);
    expect(omitido.res.omitidos).toBe(1);
    expect(omitido.lista).toHaveLength(1);
    expect(omitido.objeciones).toBeUndefined(); // sin 4.º parámetro no toca objeciones

    const copia = aplicarImportacion([filas[0]], { [existente.id]: "copia" }, [
      existente,
    ]);
    expect(copia.res.copias).toBe(1);
    expect(copia.res.agregados).toBe(1);
    expect(copia.res.omitidos).toBe(0);
    expect(copia.lista).toHaveLength(2);
    const copiaGenerada = copia.lista.find((s) => s.id !== existente.id);
    expect(copiaGenerada.nombre).toBe("Existente (copia)");
    expect(copiaGenerada.steps[0].preguntas[0].opciones[0].targetStepId).toBe(
      copiaGenerada.steps[1].id
    );

    const invalido = { estado: "invalido", key: "k", speech: null };
    const conInvalido = aplicarImportacion([invalido], {}, [existente]);
    expect(conInvalido.res.omitidos).toBe(1);
    expect(conInvalido.lista).toHaveLength(1);

    const sinEstrategia = aplicarImportacion(
      [{ ...filas[0], estado: "conflicto", estrategia: undefined }],
      {},
      [existente]
    );
    expect(sinEstrategia.res.omitidos).toBe(1);
  });
});

describe("objeciones en el archivo (§5.1/§5.3)", () => {
  const objeciones = [
    { id: "o1", titulo: "Ya tengo abogado", contenido: "Respuesta 1" },
    { id: "o2", titulo: "No me interesa", contenido: "Respuesta 2" },
  ];

  it("serializarSpeechs incluye el snapshot de objeciones en el módulo (sobre copias)", () => {
    const speech = armarSpeech();
    const data = JSON.parse(serializarSpeechs([speech], objeciones));
    expect(data.speechs[0].modulos[0].tipo).toBe("objeciones");
    expect(data.speechs[0].modulos[0].objeciones).toEqual(objeciones);
    // Nunca muta el objeto del storage: el snapshot vive solo en la copia exportada.
    expect(speech.modulos[0].objeciones).toBeUndefined();
    // Sin lista no se agrega el snapshot (el archivo sigue siendo válido).
    expect(JSON.parse(serializarSpeechs([speech])).speechs[0].modulos[0].objeciones).toBeUndefined();
  });

  it("al importar fusiona objeciones por id sin sobrescribir las existentes", () => {
    const archivo = serializarSpeechs([armarSpeech()], objeciones);
    const parseado = parsearEnvelope(archivo);
    const filas = prepararFilasImport(parseado.speechs, []);
    const globales = [
      { id: "o1", titulo: "Versión local", contenido: "No se toca" },
      { id: "local", titulo: "Mía", contenido: "Solo mía" },
    ];

    const { res, objeciones: fusionadas } = aplicarImportacion(filas, {}, [], globales);
    expect(res.objecionesAgregadas).toBe(1); // solo "o2" es nueva
    expect(fusionadas).toHaveLength(3);
    expect(fusionadas.find((o) => o.id === "o1").titulo).toBe("Versión local");
    expect(fusionadas.find((o) => o.id === "local")).toBeTruthy();
    expect(fusionadas.find((o) => o.id === "o2").contenido).toBe("Respuesta 2");
  });

  it("si el usuario omite la importación, sus objeciones NO se fusionan", () => {
    const speech = armarSpeech();
    const archivo = serializarSpeechs([speech], objeciones);
    // Mismo id en el archivo y en la lista local → fila en conflicto.
    const filas = prepararFilasImport(parsearEnvelope(archivo).speechs, [speech]);
    const globales = [{ id: "local", titulo: "Mía", contenido: "x" }];
    const { res, objeciones: fusionadas } = aplicarImportacion(filas, {}, [speech], globales);
    expect(res.omitidos).toBe(1);
    expect(res.objecionesAgregadas).toBe(0);
    expect(fusionadas).toHaveLength(1);
  });

  it("fusionarObjeciones es defensiva y conserva la referencia si no hay altas", () => {
    const base = [{ id: "a", titulo: "A", contenido: "x" }];
    expect(fusionarObjeciones(base, [])).toBe(base);
    expect(fusionarObjeciones(base, [{ id: "a", titulo: "Otra", contenido: "y" }])).toBe(base);
    expect(fusionarObjeciones(base, [{ titulo: "sin id" }, null, "junk"])).toBe(base);
    const conAltas = fusionarObjeciones(base, [{ id: "b", titulo: "B", contenido: "z" }]);
    expect(conAltas).toHaveLength(2);
    expect(conAltas[0]).toBe(base[0]);
  });
});
