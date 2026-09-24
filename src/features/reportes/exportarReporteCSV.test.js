import { describe, it, expect } from "vitest";
import { buildReporteCSV } from "./exportarReporteCSV";

describe("buildReporteCSV", () => {
  it("devuelve encabezados con casos vacíos", () => {
    const filas = buildReporteCSV([]);
    expect(filas).toHaveLength(1);
    expect(filas[0].join(",")).toBe("Nombre,Teléfono,Localidad,Estado,Último Reporte,Origen,Texto");
  });

  it("construye una fila por caso con el último reporte", () => {
    const casos = [
      {
        nombre: "Juan, Pérez",
        telefono: "+54911123",
        localidad: "La Plata",
        estado: "Firmo",
        reporteHistory: [
          { fecha: "2026-06-01", texto: "Primer contacto", origen: "Operador" },
          { fecha: "2026-06-15", texto: "Firma, recibida", origen: "Operador" },
        ],
      },
    ];
    const filas = buildReporteCSV(casos);
    expect(filas).toHaveLength(2);
    expect(filas[1][0]).toBe('"Juan, Pérez"');
    expect(filas[1][1]).toBe("'+54911123");
    expect(filas[1][4]).toBe("2026-06-15");
    expect(filas[1][5]).toBe("Operador");
    expect(filas[1][6]).toBe('"Firma, recibida"');
  });

  it("maneja casos sin reporteHistory", () => {
    const casos = [{ nombre: "Sin reportes", reporteHistory: null }];
    const filas = buildReporteCSV(casos);
    expect(filas[1][4]).toBe("");
    expect(filas[1][6]).toBe("");
  });

  it("neutraliza inyección de fórmulas en nombre", () => {
    const casos = [{ nombre: "=cmd()", estado: "Activo" }];
    const filas = buildReporteCSV(casos);
    expect(filas[1][0]).toBe("'=cmd()");
  });

  it("maneja valores sin prefijo de riesgo (p.ej. ':') sin alterarlos", () => {
    const casos = [{ nombre: ":celda", estado: undefined, reporteHistory: [] }];
    const filas = buildReporteCSV(casos);
    expect(filas[1][0]).toBe(":celda");
    expect(filas[1][3]).toBe("");
  });
});