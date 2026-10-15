import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  fechaFirmaDe,
  countSignedInMonth,
  setEstadosSuccess,
  ESTADO_FIRMO,
} from "./operatorMetrics";

// C03 (1.10.1): fechaFirmaDe comparaba contra el literal "Firmo"; al renombrar
// ese estado en Configuración, el fallback (regla 2: último reporte si el caso
// está firmado) dejaba de matchear y las metas perdían firmas. Ahora se usa la
// categoría `success` vigente, que App inyecta con setEstadosSuccess().
describe("setEstadosSuccess · C03 (1.10.1)", () => {
  beforeEach(() => setEstadosSuccess(["Firmo"]));
  afterEach(() => setEstadosSuccess(["Firmo"]));

  it("mantiene el apodo exportado ESTADO_FIRMO para consumidores existentes", () => {
    expect(ESTADO_FIRMO).toBe("Firmo");
  });

  it("el fallback de fechaFirmaDe sigue a success cuando se renombra", () => {
    const caso = {
      estado: "Firmado",
      fechaFirma: null,
      reporteHistory: [{ fecha: "2026-10-10" }],
    };
    // Con la lista default ["Firmo"] no matchea el estado nuevo…
    expect(fechaFirmaDe(caso)).toBeNull();
    // …y con la categoría success migrada, sí.
    setEstadosSuccess(["Firmado"]);
    expect(fechaFirmaDe(caso)).toBe("2026-10-10");
  });

  it("regla 1 intacta: fechaFirma directa manda sin importar el estado", () => {
    expect(
      fechaFirmaDe({ estado: "Baja", fechaFirma: "2026-10-01", reporteHistory: [] })
    ).toBe("2026-10-01");
    setEstadosSuccess(["Otro"]);
    expect(
      fechaFirmaDe({ estado: "Baja", fechaFirma: "2026-10-01", reporteHistory: [] })
    ).toBe("2026-10-01");
  });

  it("countSignedInMonth (metas) cuenta el fallback solo con success vigente", () => {
    const casos = [
      { estado: "Firmado", fechaFirma: null, reporteHistory: [{ fecha: "05/10/2026" }] },
    ];
    expect(countSignedInMonth(casos, 2026, 9)).toBe(0);
    setEstadosSuccess(["Firmado"]);
    expect(countSignedInMonth(casos, 2026, 9)).toBe(1);
  });

  it("setEstadosSuccess ignora entradas inválidas (no rompe con undefined/lista vacía)", () => {
    setEstadosSuccess(undefined);
    setEstadosSuccess([]);
    expect(
      fechaFirmaDe({ estado: "Firmo", fechaFirma: null, reporteHistory: [{ fecha: "2026-10-10" }] })
    ).toBe("2026-10-10");
  });
});
