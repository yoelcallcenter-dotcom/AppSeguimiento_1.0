import { describe, it, expect } from "vitest";
import { crearEjemploART, OBJECIONES_EJEMPLO_ART } from "./ejemploGuionART";
import { validarSpeech, normalizarSpeech } from "./interactiveSpeechModel";
import { fusionarObjeciones } from "./speechsInteractivosIO";

/**
 * Tests del guion de ejemplo ART (§7 de la Release 1.11.0).
 *
 * Qué se protege:
 * - El ejemplo debe ser usable de entrada: validarSpeech() === [].
 * - Los conteos del documento fuente (8 etapas, 9 estados, 12 objeciones).
 * - El seed es idempotente por id: crear dos veces no duplica nada.
 * - El contenido viaja en el guion (reglas, ramificaciones, estados finales)
 *   y no queda codificado en el motor.
 */
describe("ejemploGuionART (Release 1.11.0 §7)", () => {
  it("es válido: validarSpeech devuelve una lista vacía", () => {
    expect(validarSpeech(crearEjemploART())).toEqual([]);
  });

  it("tiene 8 etapas, 9 estados finales y el inicio en art-e1", () => {
    const ejemplo = crearEjemploART();
    expect(ejemplo.steps).toHaveLength(8);
    expect(ejemplo.estadosFinales).toHaveLength(9);
    expect(ejemplo.startStepId).toBe("art-e1");
    // ids únicos en todo el árbol (validarSpeech también lo chequea, pero el
    // assert directo deja claro qué se está cuidando).
    const ids = [
      ...ejemplo.steps.map((s) => s.id),
      ...ejemplo.estadosFinales.map((e) => e.id),
      ...ejemplo.modulos.map((m) => m.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("trae las 12 objeciones y el módulo con el título exacto del documento", () => {
    expect(OBJECIONES_EJEMPLO_ART).toHaveLength(12);
    expect(new Set(OBJECIONES_EJEMPLO_ART.map((o) => o.id)).size).toBe(12);
    OBJECIONES_EJEMPLO_ART.forEach((o) => {
      expect(typeof o.titulo).toBe("string");
      expect(o.titulo.trim().length).toBeGreaterThan(0);
      expect(typeof o.contenido).toBe("string");
      expect(o.contenido.trim().length).toBeGreaterThan(0);
    });

    const ejemplo = crearEjemploART();
    const moduloObjeciones = ejemplo.modulos.find((m) => m.tipo === "objeciones");
    expect(moduloObjeciones).toBeTruthy();
    expect(moduloObjeciones.titulo).toBe("Módulos transversales. Objeciones.");
  });

  it("crearEjemploART devuelve copias independientes con los mismos ids", () => {
    const a = crearEjemploART();
    const b = crearEjemploART();
    expect(a).not.toBe(b);
    expect(a.steps).not.toBe(b.steps);
    expect(a.steps.map((s) => s.id)).toEqual(b.steps.map((s) => s.id));

    // Mutar una copia no debe afectar a la otra ni a la constante del módulo.
    a.steps[0].titulo = "mutado";
    expect(b.steps[0].titulo).not.toBe("mutado");
    expect(crearEjemploART().steps[0].titulo).not.toBe("mutado");
  });

  it("el seed de objeciones no duplica al aplicarse dos veces", () => {
    const primera = fusionarObjeciones([], OBJECIONES_EJEMPLO_ART);
    expect(primera).toHaveLength(12);

    // Segunda aplicación: sin novedades → misma referencia (React no re-renderiza).
    const segunda = fusionarObjeciones(primera, OBJECIONES_EJEMPLO_ART);
    expect(segunda).toBe(primera);
    expect(segunda).toHaveLength(12);
  });

  it("el contenido operativo vive en el guion: reglas, ramificaciones y estados", () => {
    const ejemplo = crearEjemploART();
    expect(ejemplo.reglas.length).toBeGreaterThan(0);

    // La etapa 1 ramifica explícitamente a la 2.
    expect(ejemplo.steps[0].preguntas[0].opciones[0].targetStepId).toBe(
      "art-e2"
    );

    // Hay opciones que cierran la llamada y todas declaran un estado final
    // existente en el catálogo del propio guion.
    const idsEstados = new Set(ejemplo.estadosFinales.map((e) => e.id));
    const finalizan = ejemplo.steps
      .flatMap((s) => s.preguntas)
      .flatMap((p) => p.opciones)
      .filter((o) => o.finalizaLlamada);
    expect(finalizan.length).toBeGreaterThan(0);
    finalizan.forEach((o) => {
      expect(o.estadoFinalId).toBeTruthy();
      expect(idsEstados.has(o.estadoFinalId)).toBe(true);
    });

    // Los módulos transversales referenciados existen.
    const idsModulos = new Set(ejemplo.modulos.map((m) => m.id));
    ejemplo.steps
      .flatMap((s) => s.preguntas)
      .flatMap((p) => p.opciones)
      .filter((o) => o.moduloId)
      .forEach((o) => expect(idsModulos.has(o.moduloId)).toBe(true));
  });

  it("normalizarSpeech es idempotente sobre el ejemplo (no lo reescribe)", () => {
    const ejemplo = crearEjemploART();
    const normalizado = normalizarSpeech(ejemplo);
    expect(normalizarSpeech(normalizado)).toBe(normalizado);
    expect(validarSpeech(normalizado)).toEqual([]);
  });
});
