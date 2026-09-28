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
} from "./speechsInteractivosIO";
import {
  crearSpeechInteractivo,
  agregarPaso,
  agregarOpcion,
  actualizarOpcion,
  actualizarPaso,
} from "./interactiveSpeechModel";

function armarSpeech(nombre = "Accidente Laboral") {
  let speech = crearSpeechInteractivo({ nombre, descripcion: "General" });
  speech = agregarPaso(speech);
  speech = actualizarPaso(speech, speech.steps[1].id, { titulo: "Cierre" });
  speech = agregarOpcion(speech, speech.steps[0].id, "Continuar");
  const opId = speech.steps[0].opciones[0].id;
  speech = actualizarOpcion(speech, speech.steps[0].id, opId, {
    targetStepId: speech.steps[1].id,
  });
  return speech;
}

describe("speechsInteractivosIO", () => {
  it("serializa con envelope versionado y hace roundtrip completo", () => {
    const speech = armarSpeech();
    const texto = serializarSpeechs([speech]);
    const data = JSON.parse(texto);

    expect(data.type).toBe(FORMATO_TIPO);
    expect(data.type).toBe("appseguimiento-interactive-speech");
    expect(data.version).toBe(FORMATO_VERSION);
    expect(data.version).toBe(1);
    expect(data.fechaExportacion).toBeTruthy();
    expect(data.speechs).toHaveLength(1);
    expect(data.speechs[0]).toEqual(speech);

    const parseado = parsearEnvelope(texto);
    expect(parseado.ok).toBe(true);
    expect(parseado.speechs[0].startStepId).toBe(speech.startStepId);
    expect(parseado.speechs[0].steps[0].opciones[0].targetStepId).toBe(
      speech.steps[1].id
    );
    expect(parseado.speechs[0].steps[0].opciones[0].id).toBe(
      speech.steps[0].opciones[0].id
    );
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

    const vacio = JSON.stringify({ type: FORMATO_TIPO, version: 1, speechs: [] });
    expect(parsearEnvelope(vacio)).toEqual({
      ok: false,
      error: "El archivo no contiene speechs.",
    });

    const sinLista = JSON.stringify({ type: FORMATO_TIPO, version: 1, speechs: "nope" });
    expect(parsearEnvelope(sinLista)).toEqual({
      ok: false,
      error: "El archivo no contiene la lista de speechs.",
    });
  });

  it("migra un envelope antiguo v0 a v1 rellenando metadatos", () => {
    const speech = armarSpeech();
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
                { id: speech.steps[0].opciones[0].id, texto: "Continuar", targetStepId: speech.steps[1].id },
              ],
            },
            { id: speech.steps[1].id, titulo: "Cierre", contenido: "", opciones: [] },
          ],
        },
      ],
    };
    const migrado = migrarEnvelope(v0);
    expect(migrado.version).toBe(1);
    expect(migrado.fechaExportacion).toBeTruthy();
    expect(migrado.speechs[0].fechaCreacion).toBeTruthy();
    expect(migrado.speechs[0].fechaModificacion).toBeTruthy();
    expect(migrado.speechs[0].version).toBe(1);
    expect(migrado.speechs[0].steps[0].orden).toBe(0);

    const parseado = parsearEnvelope(JSON.stringify(v0));
    expect(parseado.ok).toBe(true);
    expect(prepararFilasImport(parseado.speechs, [])[0].estado).toBe("nuevo");
  });

  it("prepara filas: nuevo, conflicto por id, inválido y advertencias de huérfanos", () => {
    const existente = armarSpeech("Existente");
    const nuevo = armarSpeech("Nueva ruta");
    const invalido = { ...nuevo, id: "mal-formado", steps: "no-array", nombre: "" };
    const conHuerfano = agregarPaso(armarSpeech("Con huérfano"));

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
    });
    expect(lista).toHaveLength(2);
    expect(lista.find((s) => s.id === existente.id)).toBe(existente);

    const omitido = aplicarImportacion([filas[0]], {}, [existente]);
    expect(omitido.res.omitidos).toBe(1);
    expect(omitido.lista).toHaveLength(1);

    const copia = aplicarImportacion([filas[0]], { [existente.id]: "copia" }, [
      existente,
    ]);
    expect(copia.res.copias).toBe(1);
    expect(copia.res.agregados).toBe(1);
    expect(copia.res.omitidos).toBe(0);
    expect(copia.lista).toHaveLength(2);
    const copiaGenerada = copia.lista.find((s) => s.id !== existente.id);
    expect(copiaGenerada.nombre).toBe("Existente (copia)");
    expect(copiaGenerada.steps[0].opciones[0].targetStepId).toBe(copiaGenerada.steps[1].id);

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
