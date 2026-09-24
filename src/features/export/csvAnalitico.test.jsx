import { describe, it, expect, beforeEach, vi } from "vitest";
import { buildCsvAnalitico } from "./csvAnalitico";

const casos = [
  { id: "1", nombre: "Juan Perez", telefono: "123", estado: "Firmo", fecha: "2026-08-01", aseguradora: "Sancor", estudioJuridico: "GL CABA", localidad: "CABA" },
  { id: "2", nombre: "Maria Lopez", telefono: "456", estado: "Pendiente", fecha: "2026-08-15", aseguradora: "Galeno", estudioJuridico: "GL Rosario", localidad: "Rosario" },
  { id: "3", nombre: "Pedro Gomez", telefono: "789", estado: "Firmo", fecha: "2026-07-01", aseguradora: "Sancor", estudioJuridico: "GL CABA", localidad: "CABA" },
];

const cfg = {
  estados: [
    { v: "Firmo", accent: "#10B981", peso: 1 },
    { v: "Pendiente", accent: "#F59E0B", peso: 1 },
  ],
  defaults: { horasJornada: 8, diasTrabajo: [1, 2, 3, 4, 5] },
};

const fechaFija = new Date("2026-08-20T12:00:00");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("buildCsvAnalitico", () => {
  it("exporta un CSV con las secciones esperadas", () => {
    const csv = buildCsvAnalitico(casos, cfg, { fecha: fechaFija });
    expect(typeof csv).toBe("string");
    const secciones = ["KPIs", "Productividad", "Conversión", "Estados", "Estudios", "Aseguradoras", "Localidades", "Tendencias", "Comparativas", "Períodos", "Métricas"];
    secciones.forEach((s) => expect(csv).toContain(`### ${s}`));
  });

  it("contiene filas de KPIs y métricas", () => {
    const csv = buildCsvAnalitico(casos, cfg, { fecha: fechaFija });
    expect(csv).toContain("Casos totales,3");
    expect(csv).toContain("Tasa de conversión,66.7%");
    expect(csv).toContain("Métrico,Valor");
    expect(csv).toContain("Firmas,2");
  });

  it("no emite [object Object] en las distribuciones", () => {
    const csv = buildCsvAnalitico(casos, cfg, { fecha: fechaFija });
    expect(csv).not.toContain("[object Object]");
    expect(csv).toContain("Sancor,2");
    expect(csv).toContain("CABA,2");
  });

  it("no emite [object Object] en las distribuciones", () => {
    const csv = buildCsvAnalitico(casos, cfg, { fecha: fechaFija });
    expect(csv).not.toContain("[object Object]");
    expect(csv).toContain("Sancor,2");
    expect(csv).toContain("CABA,2");
  });

  it("termina con salto de línea y no tiene caracteres corruptos", () => {
    const csv = buildCsvAnalitico(casos, cfg, { fecha: fechaFija });
    expect(csv.endsWith("\n")).toBe(true);
    expect(csv).not.toMatch(/[^\x00-\x7F\u00E0-\u00FF\u2014]/);
  });

  it("respeta el rango de fechas provisto", () => {
    const rango = {
      id: "personalizado",
      label: "Agosto",
      startISO: "2026-08-01",
      endISO: "2026-08-31",
    };
    const csv = buildCsvAnalitico(casos, cfg, { fecha: fechaFija, rango });
    expect(csv).toContain("### Períodos");
  });

  it("maneja array vacío sin errores", () => {
    const csv = buildCsvAnalitico([], cfg, { fecha: fechaFija });
    expect(typeof csv).toBe("string");
    expect(csv).toContain("### KPIs");
  });
});