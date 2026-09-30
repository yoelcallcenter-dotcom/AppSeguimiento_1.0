import { describe, it, expect } from "vitest";
import {
  resolverObjeciones,
  buscarObjecion,
  llavesObjecion,
} from "./resolveObjeciones";

const objeciones = [
  { id: "o1", titulo: "No le interesa", contenido: "Explicar los beneficios." },
  { id: "o2", titulo: "Es muy caro", contenido: "" },
  { id: "o3", titulo: "", contenido: "Solo contenido sin título." },
];

describe("resolverObjeciones", () => {
  it("reemplaza la llave por título arriba y contenido debajo", () => {
    expect(resolverObjeciones("Dice {OBJECION:o1} y sigue.", objeciones)).toBe(
      "Dice No le interesa\nExplicar los beneficios. y sigue."
    );
  });

  it("matchea por id exacto", () => {
    expect(resolverObjeciones("{OBJECION:o3}", objeciones)).toBe(
      "Solo contenido sin título."
    );
  });

  it("fallback por título insensible a mayúsculas y acentos", () => {
    expect(resolverObjeciones("{OBJECION:no LE interesa}", objeciones)).toBe(
      "No le interesa\nExplicar los beneficios."
    );
  });

  it("si el contenido está vacío muestra solo el título", () => {
    expect(resolverObjeciones("{OBJECION:o2}", objeciones)).toBe("Es muy caro");
  });

  it("si el título está vacío muestra solo el contenido", () => {
    expect(resolverObjeciones("{OBJECION:o3}", objeciones)).toBe(
      "Solo contenido sin título."
    );
  });

  it("deja literal una llave desconocida", () => {
    expect(resolverObjeciones("Va {OBJECION:falta} acá", objeciones)).toBe(
      "Va {OBJECION:falta} acá"
    );
  });

  it("resuelve varias llaves en el mismo texto", () => {
    const texto = "{OBJECION:o2} y {OBJECION:o1}";
    expect(resolverObjeciones(texto, objeciones)).toBe(
      "Es muy caro y No le interesa\nExplicar los beneficios."
    );
  });

  it("sin objeciones cargadas no altera el texto", () => {
    expect(resolverObjeciones("{OBJECION:o1}", [])).toBe("{OBJECION:o1}");
  });

  it("tolera entradas no-string sin explotar", () => {
    expect(resolverObjeciones(undefined, objeciones)).toBeUndefined();
    expect(resolverObjeciones(null, objeciones)).toBeNull();
    expect(resolverObjeciones(42, objeciones)).toBe(42);
    expect(resolverObjeciones("sin llaves", objeciones)).toBe("sin llaves");
  });

  it("objeciones no-array no rompe", () => {
    expect(resolverObjeciones("{OBJECION:o1}", undefined)).toBe(
      "{OBJECION:o1}"
    );
  });
});

describe("buscarObjecion", () => {
  it("encuentra por id", () => {
    expect(buscarObjecion("o2", objeciones).titulo).toBe("Es muy caro");
  });

  it("encuentra por título normalizado", () => {
    expect(buscarObjecion("  ES MUY CARO ", objeciones).id).toBe("o2");
  });

  it("devuelve null cuando no existe", () => {
    expect(buscarObjecion("no-existe", objeciones)).toBeNull();
    expect(buscarObjecion("", objeciones)).toBeNull();
  });
});

describe("llavesObjecion", () => {
  it("extrae llaves únicas sin importar mayúsculas", () => {
    expect(
      llavesObjecion("{OBJECION:o1} {OBJECION:otra} {objecion:O1}")
    ).toEqual(["o1", "otra"]);
  });

  it("texto vacío o sin llaves devuelve lista vacía", () => {
    expect(llavesObjecion("")).toEqual([]);
    expect(llavesObjecion("texto plano")).toEqual([]);
    expect(llavesObjecion(undefined)).toEqual([]);
  });
});
