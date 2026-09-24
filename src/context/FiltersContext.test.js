import { describe, it, expect } from "vitest";
import {
  aplicarFiltroGlobal,
  FILTRO_GLOBAL_DEFAULT,
  normalizarFiltroGlobal,
  normalizarValorFiltro,
} from "./FiltersContext";

const CASOS = [
  {
    id: 1,
    estado: "Firmo",
    aseguradora: "SANCOR",
    localidad: "MENDOZA",
    estudioJuridico: "GL MdP",
    provincia: "MENDOZA",
    tipoIngreso: "Derivación",
    telefono: "0261-112233",
    reporteHistory: [{ origen: "Llamada" }],
  },
  {
    id: 2,
    estado: "Pendiente",
    aseguradora: "GALICIA",
    localidad: "LA PLATA",
    estudioJuridico: "GL CABA",
    provincia: "BUENOS AIRES",
    tipoIngreso: "Web",
    telefono: "114455",
    reporteHistory: [],
  },
  {
    id: 3,
    estado: "Cita virtual",
    aseguradora: "SANCOR",
    localidad: "MENDOZA",
    estudioJuridico: "GL MdP",
    provincia: "MENDOZA",
    tipoIngreso: "Derivación",
    telefono: "26155",
    reporteHistory: [{ origen: "Mail" }, { origen: "WhatsApp" }],
  },
];

const ids = (fg) => aplicarFiltroGlobal(CASOS, fg).map((c) => c.id);

describe("normalizarValorFiltro", () => {
  it("devuelve el array tal cual", () => {
    expect(normalizarValorFiltro(["a", "b"])).toEqual(["a", "b"]);
    expect(normalizarValorFiltro([])).toEqual([]);
  });

  it("convierte el escalar legacy a array", () => {
    expect(normalizarValorFiltro("Firmo")).toEqual(["Firmo"]);
  });

  it('"todos" o vacío se consideran sin filtro', () => {
    expect(normalizarValorFiltro("todos")).toEqual([]);
    expect(normalizarValorFiltro(undefined)).toEqual([]);
    expect(normalizarValorFiltro("")).toEqual([]);
  });
});

describe("normalizarFiltroGlobal", () => {
  it("migra el shape escalar 1.8.7 al shape de arrays 1.8.8", () => {
    const out = normalizarFiltroGlobal({
      estado: "Firmo",
      aseguradora: "todos",
      localidad: "MENDOZA",
      telefono: "11",
    });
    expect(out.estado).toEqual(["Firmo"]);
    expect(out.aseguradora).toEqual([]);
    expect(out.localidad).toEqual(["MENDOZA"]);
    expect(out.telefono).toBe("11");
    expect(out.provincia).toEqual([]);
    expect(out.tipo).toEqual([]);
    expect(out.origen).toEqual([]);
    expect(out.estudio).toEqual([]);
  });

  it("devuelve el default con input inválido", () => {
    expect(normalizarFiltroGlobal(null)).toEqual(FILTRO_GLOBAL_DEFAULT);
    expect(normalizarFiltroGlobal("nope")).toEqual(FILTRO_GLOBAL_DEFAULT);
  });

  it("conserva los arrays ya normalizados", () => {
    const fg = { ...FILTRO_GLOBAL_DEFAULT, estado: ["Firmo", "Pendiente"] };
    expect(normalizarFiltroGlobal(fg).estado).toEqual(["Firmo", "Pendiente"]);
  });
});

describe("aplicarFiltroGlobal", () => {
  it("sin filtros devuelve todos los casos", () => {
    expect(ids(FILTRO_GLOBAL_DEFAULT)).toEqual([1, 2, 3]);
    expect(ids(null)).toEqual([1, 2, 3]);
  });

  it("OR dentro de una dimensión", () => {
    expect(ids({ ...FILTRO_GLOBAL_DEFAULT, estado: ["Firmo", "Pendiente"] })).toEqual([1, 2]);
  });

  it("AND entre dimensiones", () => {
    expect(
      ids({ ...FILTRO_GLOBAL_DEFAULT, estado: ["Firmo"], aseguradora: ["SANCOR"] })
    ).toEqual([1]);
    expect(
      ids({ ...FILTRO_GLOBAL_DEFAULT, estado: ["Firmo"], aseguradora: ["GALICIA"] })
    ).toEqual([]);
  });

  it("matchea sin distinguir mayúsculas ni espacios", () => {
    expect(ids({ ...FILTRO_GLOBAL_DEFAULT, estado: ["  Firmo  "] })).toEqual([1]);
  });

  it("filtra por estudioJuridico e tipoIngreso con las claves estudio/tipo", () => {
    expect(ids({ ...FILTRO_GLOBAL_DEFAULT, estudio: ["GL CABA"] })).toEqual([2]);
    expect(ids({ ...FILTRO_GLOBAL_DEFAULT, tipo: ["Derivación"] })).toEqual([1, 3]);
  });

  it("filtra por provincia", () => {
    expect(ids({ ...FILTRO_GLOBAL_DEFAULT, provincia: ["BUENOS AIRES"] })).toEqual([2]);
    expect(ids({ ...FILTRO_GLOBAL_DEFAULT, provincia: ["MENDOZA"] })).toEqual([1, 3]);
  });

  it("filtra por el origen del último reporte", () => {
    expect(ids({ ...FILTRO_GLOBAL_DEFAULT, origen: ["WhatsApp"] })).toEqual([3]);
    expect(ids({ ...FILTRO_GLOBAL_DEFAULT, origen: ["Llamada", "WhatsApp"] })).toEqual([1, 3]);
    expect(ids({ ...FILTRO_GLOBAL_DEFAULT, origen: ["Mail"] })).toEqual([]);
  });

  it("filtra por prefijo de teléfono", () => {
    expect(ids({ ...FILTRO_GLOBAL_DEFAULT, telefono: "114" })).toEqual([2]);
    expect(ids({ ...FILTRO_GLOBAL_DEFAULT, telefono: "0261" })).toEqual([1]);
  });

  it("acepta el shape escalar legacy", () => {
    expect(ids({ estado: "Firmo" })).toEqual([1]);
    expect(ids({ estado: "todos", provincia: "MENDOZA" })).toEqual([1, 3]);
  });

  it("devuelve [] si los casos no son un array", () => {
    expect(aplicarFiltroGlobal(undefined, FILTRO_GLOBAL_DEFAULT)).toEqual([]);
  });
});
