import { describe, it, expect } from "vitest";
import { parseFicha, extraerCampo, normalizarTexto } from "./helpers";

const FICHA = `NOMBRE: JUAN PEREZ
TELEFONO: 3515551234
LOCALIDAD: CORDOBA
ART: PREVENCION (ART 123)
INGRESO: Accidente laboral
LESION: Esguince de tobillo con cirugia
PROFESION: Maestro
CITA: 15/09/2026 10:00
OBSERVACIONES: Le aviso que no puede asistir
TAGS: urgente, derivado
COMENTARIOS: Primer contacto
Se pasa al abogado`;

describe("parseFicha", () => {
  it("extrae todos los campos de una ficha completa", () => {
    const c = parseFicha(FICHA);
    expect(c.nombre).toBe("JUAN PEREZ");
    expect(c.telefono).toBe("3515551234");
    expect(c.localidad).toBe("CORDOBA");
    expect(c.aseguradora).toBe("PREVENCION");
    expect(c.ingreso).toBe("Accidente laboral");
    expect(c.lesion).toBe("Esguince de tobillo con cirugia");
    expect(c.profesion).toBe("Maestro");
    expect(c.cita).toBe("15/09/2026 10:00");
    expect(c.observaciones).toBe("Le aviso que no puede asistir");
  });

  it("quita los datos entre paréntesis del campo ART", () => {
    expect(parseFicha(FICHA).aseguradora).toBe("PREVENCION");
  });

  it("parsea tags y comentarios", () => {
    const c = parseFicha(FICHA);
    expect(c.tags).toEqual(["urgente", "derivado"]);
    expect(c.comentarios.length).toBe(2);
    expect(c.comentarios[0].texto).toBe("Primer contacto");
    expect(c.comentarios[1].texto).toBe("Se pasa al abogado");
  });

  it("sugiere tipo de ingreso por lesión", () => {
    expect(parseFicha(FICHA).tipoIngreso).toBe("Accidente + Cirugía");
  });

  it("maneja texto vacío sin errores", () => {
    const c = parseFicha("");
    expect(c.nombre).toBe("");
    expect(c.tags).toEqual([]);
    expect(c.comentarios).toEqual([]);
    expect(c.tipoIngreso).toBe("");
  });

  it("detecta campos en muy mayúsculas", () => {
    const c = parseFicha("NOMBRE: MARIA LOPEZ\nLESION: REPOSO ABSOLUTO");
    expect(c.nombre).toBe("MARIA LOPEZ");
    expect(c.lesion).toBe("REPOSO ABSOLUTO");
  });

  it("adiciona HORARIO a las observaciones", () => {
    const c = parseFicha(
      "NOMBRE: RAMIREZ EVELIN DAIANA\nTELEFONO: 3416699834\nLOCALIDAD: ZAVALLA\nART: PREVENCION (88)\nCITA: 21/09 - (10:00-10:30)\nHORARIO: 10:00-10:30"
    );
    expect(c.aseguradora).toBe("PREVENCION");
    expect(c.observaciones).toBe("Horario confirmado: 10:00-10:30");
    expect(c.cita).toBe("21/09 - (10:00-10:30)");
  });

  it("conserva observaciones y agrega HORARIO aditivo", () => {
    const c = parseFicha(
      "NOMBRE: LOPEZ CARLA CELESTE\nTELEFONO: 1136044767\nART: LA SEGUNDA (88)\nOBSERVACIONES: Derivada a kinesiologia\nHORARIO: 16:45-17:00"
    );
    expect(c.aseguradora).toBe("LA SEGUNDA");
    expect(c.observaciones).toBe("Derivada a kinesiologia. Horario confirmado: 16:45-17:00");
  });
});

describe("extraerCampo", () => {
  it("extrae el valor de una etiqueta", () => {
    expect(extraerCampo("NOMBRE: Juan\nTELEFONO: 123", "NOMBRE")).toBe("Juan");
  });

  it("devuelve cadena vacía si la etiqueta no existe", () => {
    expect(extraerCampo("Solo texto", "NOMBRE")).toBe("");
  });

  it("corta el valor en la siguiente etiqueta en mayúsculas", () => {
    expect(extraerCampo("Direccion: una calle\nEDAD: 30", "Direccion")).toBe("una calle");
  });
});

describe("normalizarTexto", () => {
  it("minúsculas, recorta y quita acentos", () => {
    expect(normalizarTexto("  Ñandú CÓRDOBA  ")).toBe("nandu cordoba");
  });

  it("maneja null y undefined", () => {
    expect(normalizarTexto(null)).toBe("");
    expect(normalizarTexto(undefined)).toBe("");
  });
});