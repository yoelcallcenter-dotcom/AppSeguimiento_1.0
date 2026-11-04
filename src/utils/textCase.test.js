import { describe, it, expect } from "vitest";
import { applyCaseMode, MODOS_TRANSFORMACION } from "./textCase";

/**
 * textCase.test.js (v1.10.11)
 * Fija los 6 modos de la toolbar de Notas/Reportes (estilo
 * mayusculasminusculas.ar): mayúsculas, minúsculas, tipo oración, tipo
 * título, alternado y limpieza de espacios, con sus casos borde
 * (puntuación, dígitos, signos invertidos, acentos, no-strings).
 */
describe("textCase · transformaciones de texto (1.10.11)", () => {
  it("MODOS_TRANSFORMACION expone los 6 modos con etiqueta y título", () => {
    expect(MODOS_TRANSFORMACION.map((m) => m.modo)).toEqual([
      "upper",
      "lower",
      "sentence",
      "title",
      "alter",
      "spaces",
    ]);
    MODOS_TRANSFORMACION.forEach((m) => {
      expect(m.etiqueta.length).toBeGreaterThan(0);
      expect(m.titulo.length).toBeGreaterThan(0);
    });
  });

  it("upper / lower respetan acentos y ñ, y no tocan lo demás", () => {
    expect(applyCaseMode("hola señoría 123", "upper")).toBe("HOLA SEÑORÍA 123");
    expect(applyCaseMode("HOLA SEÑORÍA 123", "lower")).toBe("hola señoría 123");
    // El modo por defecto devuelve el texto tal cual.
    expect(applyCaseMode("HOLA", "desconocido")).toBe("HOLA");
    // Entradas no-string no tiran excepción.
    expect(applyCaseMode(null, "upper")).toBe("");
    expect(applyCaseMode(undefined, "sentence")).toBe("");
  });

  it("sentence: sube la primera letra de cada oración y baja el resto", () => {
    expect(applyCaseMode("HOLA. ¿CÓMO ESTÁS? BIEN, ¿Y VOS?", "sentence")).toBe(
      "Hola. ¿Cómo estás? Bien, ¿y vos?"
    );
    // Inicio de texto y saltos de línea también cuentan como oración.
    expect(applyCaseMode("primera línea\nSEGUNDA LÍNEA", "sentence")).toBe(
      "Primera línea\nSegunda línea"
    );
    // Un dígito consume el turno de mayúscula (no "5 Letras").
    expect(applyCaseMode("hola. 5 letras acá", "sentence")).toBe("Hola. 5 letras acá");
  });

  it("title: capitaliza cada palabra (tras cualquier no-letra)", () => {
    expect(applyCaseMode("hola mundo de prueba", "title")).toBe("Hola Mundo De Prueba");
    expect(applyCaseMode("CASO: gonzález, yoel (obra social)", "title")).toBe(
      "Caso: González, Yoel (Obra Social)"
    );
    expect(applyCaseMode("palabra bajita y OTRA MAYÚSCULA", "title")).toBe(
      "Palabra Bajita Y Otra Mayúscula"
    );
  });

  it("alter: alterna por letra arrancando en minúscula", () => {
    expect(applyCaseMode("hola mundo", "alter")).toBe("hOlA mUnDo");
    expect(applyCaseMode("HOLA", "alter")).toBe("hOlA");
    // Los no-letras no mueven el conmutador (la 'c' sigue en minúscula).
    expect(applyCaseMode("ab-12 cd", "alter")).toBe("aB-12 cD");
    expect(applyCaseMode("abcdefg", "alter")).toBe("aBcDeFg");
  });

  it("spaces: colapsa espacios por línea, recorta extremos y limita saltos", () => {
    expect(applyCaseMode("  hola    mundo \n\n   chau   ", "spaces")).toBe(
      "hola mundo\n\nchau"
    );
    expect(applyCaseMode("tab\t\ty comillas  ", "spaces")).toBe("tab y comillas");
    //3+ líneas vacías seguidas quedan en una sola en blanco.
    expect(applyCaseMode("a\n\n\n\n\nb", "spaces")).toBe("a\n\nb");
    // No borra líneas con contenido (eso es formato, no espacio de más).
    expect(applyCaseMode("línea uno\nlínea dos", "spaces")).toBe("línea uno\nlínea dos");
  });
});
