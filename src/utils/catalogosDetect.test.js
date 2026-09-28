import { describe, it, expect } from "vitest";
import {
  detectarTipoIngresoPorKeywords,
  getFichaFields,
  getTiposIngreso,
} from "./catalogos";
import { TIPOS_INGRESO_SUGERIDOS, DEFAULT_FICHA_FIELDS } from "./constants";

const configConKeywords = {
  tiposIngreso: [
    { v: "Accidente + Cirugía", keywords: ["cirugia", "operacion"], keywordsPriority: 2 },
    { v: "Accidente + Tratamiento", keywords: ["tratamiento"], keywordsPriority: 3 },
    { v: "Enfermedad Profesional", keywords: ["enfermedad"], keywordsPriority: 1 },
  ],
};

describe("detectarTipoIngresoPorKeywords", () => {
  it("detecta una coincidencia simple", () => {
    const r = detectarTipoIngresoPorKeywords(
      "NOMBRE: Juan\nLESION: Esguince con tratamiento prolongado",
      configConKeywords
    );
    expect(r.tipoIngreso).toBe("Accidente + Tratamiento");
  });

  it("es insensible a mayúsculas y acentos", () => {
    const r = detectarTipoIngresoPorKeywords(
      "Necesita una CIRUGÍA de rodilla",
      configConKeywords
    );
    expect(r.tipoIngreso).toBe("Accidente + Cirugía");
  });

  it("gana el tipo de menor keywordsPriority (1) sobre mayor", () => {
    const r = detectarTipoIngresoPorKeywords(
      "Enfermedad con tratamiento y cirugía",
      configConKeywords
    );
    expect(r.tipoIngreso).toBe("Enfermedad Profesional");
    expect(r.coincidencias.length).toBeGreaterThan(0);
  });

  it("devuelve null si no hay coincidencias", () => {
    const r = detectarTipoIngresoPorKeywords("NOMBRE: Ana\nLESION: Sin datos", configConKeywords);
    expect(r.tipoIngreso).toBeNull();
    expect(r.coincidencias).toEqual([]);
  });

  it("devuelve null con texto vacío", () => {
    expect(detectarTipoIngresoPorKeywords("", configConKeywords).tipoIngreso).toBeNull();
    expect(detectarTipoIngresoPorKeywords(undefined, configConKeywords).tipoIngreso).toBeNull();
    expect(detectarTipoIngresoPorKeywords(null, configConKeywords).tipoIngreso).toBeNull();
  });

  it("devuelve null si ningún tipo tiene palabras clave", () => {
    const sinKeywords = {
      tiposIngreso: TIPOS_INGRESO_SUGERIDOS.map((t) => ({ ...t, keywords: [] })),
    };
    const r = detectarTipoIngresoPorKeywords("cirugia total", sinKeywords);
    expect(r.tipoIngreso).toBeNull();
  });

  it("devuelve null si config no existe", () => {
    expect(detectarTipoIngresoPorKeywords("cualquier cosa", undefined).tipoIngreso).toBeNull();
  });

  it("usa prioridad 3 por defecto si falta keywordsPriority", () => {
    const cfg = {
      tiposIngreso: [
        { v: "A", keywords: ["alfombra"], keywordsPriority: 2 },
        { v: "B", keywords: ["berenjena"] },
      ],
    };
    const r = detectarTipoIngresoPorKeywords("alfombra y berenjena", cfg);
    expect(r.tipoIngreso).toBe("A");
  });

  it("en empate de prioridad gana el primer tipo de la lista", () => {
    const r = detectarTipoIngresoPorKeywords("tratamiento", configConKeywords);
    expect(r.tipoIngreso).toBe("Accidente + Tratamiento");
  });
});

describe("getTiposIngreso rehidratación", () => {
  it("convierte strings legacy en objetos con keywords de los defaults", () => {
    const tipos = getTiposIngreso({
      tiposIngreso: ["Accidente + Cirugía", "Accidente + Tratamiento"],
    });
    expect(tipos[0].v).toBe("Accidente + Cirugía");
    expect(Array.isArray(tipos[0].keywords)).toBe(true);
    expect(tipos[0].keywords.length).toBeGreaterThan(0);
    expect(tipos[0].keywordsPriority).toBe(1);
  });

  it("asigna keywords vacías a tipos sin equivalente default", () => {
    const tipos = getTiposIngreso({ tiposIngreso: ["Tipo Raro"] });
    expect(tipos[0].v).toBe("Tipo Raro");
    expect(tipos[0].keywords).toEqual([]);
    expect(tipos[0].keywordsPriority).toBe(3);
  });

  it("respeta keywords ya configuradas por el usuario", () => {
    const tipos = getTiposIngreso({
      tiposIngreso: [{ v: "Accidente + Cirugía", keywords: ["solo una"], keywordsPriority: 2 }],
    });
    expect(tipos[0].keywords).toEqual(["solo una"]);
    expect(tipos[0].keywordsPriority).toBe(2);
  });

  it("agrega los tipos default faltantes", () => {
    const tipos = getTiposIngreso({ tiposIngreso: ["Enfermedad Profesional"] });
    expect(tipos.some((t) => t.v === "Accidente in itinere")).toBe(true);
  });
});

describe("listas aditivas con eliminaciones persistentes", () => {
  it("getFichaFields repone los defaults faltantes sin tumbstones", () => {
    const lista = getFichaFields({
      fichaFields: [{ id: "zona", label: "ZONA", keywords: ["zona"], target: "localidad" }],
    });
    expect(lista).toHaveLength(DEFAULT_FICHA_FIELDS.length + 1);
    expect(lista.some((f) => f.id === "nombre")).toBe(true);
  });

  it("getFichaFields no repone los campos eliminados por el usuario", () => {
    const lista = getFichaFields({
      fichaFields: DEFAULT_FICHA_FIELDS.filter((d) => d.id !== "cita"),
      fichaFieldsDeleted: ["cita"],
    });
    expect(lista.some((f) => f.id === "cita")).toBe(false);
    expect(lista.some((f) => f.id === "nombre")).toBe(true);
    expect(lista).toHaveLength(DEFAULT_FICHA_FIELDS.length - 1);
  });

  it("getFichaFields con lista vacia solo conserva lo no eliminado", () => {
    const lista = getFichaFields({
      fichaFields: [],
      fichaFieldsDeleted: DEFAULT_FICHA_FIELDS.map((d) => d.id),
    });
    expect(lista).toEqual([]);
  });

  it("getTiposIngreso no repone los tipos sugeridos eliminados", () => {
    const borrado = TIPOS_INGRESO_SUGERIDOS[0].v;
    const tipos = getTiposIngreso({
      tiposIngreso: TIPOS_INGRESO_SUGERIDOS.slice(1),
      tiposIngresoDeleted: [borrado],
    });
    expect(tipos.some((t) => t.v === borrado)).toBe(false);
    expect(tipos).toHaveLength(TIPOS_INGRESO_SUGERIDOS.length - 1);
  });
});