import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { UltimosCasos } from "./UltimosCasos";

// Test M28 (1.10.1): el orden por new Date(c.fecha) crudo daba NaN con fechas
// legadas DD/MM/YYYY (new Date("15/07/2026") es Invalid Date en JS), lo que
// dejaba el sort indeterminado. Ahora se normaliza con normalizeDate antes de
// convertir a timestamp, con fallback 0 para fechas no parseables.
describe("UltimosCasos (M28: orden de fechas)", () => {
  const mk = (id, fecha) => ({ id, fecha, nombre: `Caso ${id}`, estado: "Activo" });

  it("ordena por fecha descendente mezclando ISO y legadas DD/MM/YYYY", () => {
    const casos = [
      mk(1, "2026-03-01"), // ISO
      mk(2, "15/07/2026"), // legada DD/MM/YYYY → 2026-07-15
      mk(3, "01/02/2026"), // legada → 2026-02-01 (la más vieja)
    ];
    render(<UltimosCasos casos={casos} onVerCaso={() => {}} />);
    expect(screen.getByText("Caso 2")).toBeTruthy();
    const orden = screen
      .getAllByRole("button")
      .map((el) => el.getAttribute("aria-label"));
    expect(orden[0]).toBe("Ver caso Caso 2");
    expect(orden[1]).toBe("Ver caso Caso 1");
    expect(orden[2]).toBe("Ver caso Caso 3");
  });

  it("envía las fechas no parseables al final sin romper el orden", () => {
    const casos = [
      mk(1, "no-fecha"),
      mk(2, "10/01/2026"),
      mk(3, ""),
    ];
    render(<UltimosCasos casos={casos} onVerCaso={() => {}} />);
    const orden = screen
      .getAllByRole("button")
      .map((el) => el.getAttribute("aria-label"));
    expect(orden[0]).toBe("Ver caso Caso 2");
    expect(orden[1]).toBe("Ver caso Caso 1");
    expect(orden[2]).toBe("Ver caso Caso 3");
  });

  it("respeta el límite de casos mostrados", () => {
    const casos = [
      mk(1, "2026-01-01"),
      mk(2, "2026-01-02"),
      mk(3, "2026-01-03"),
      mk(4, "2026-01-04"),
      mk(5, "2026-01-05"),
      mk(6, "2026-01-06"),
    ];
    render(<UltimosCasos casos={casos} onVerCaso={() => {}} limite={3} />);
    expect(screen.getAllByRole("button")).toHaveLength(3);
    expect(screen.getByText("Caso 6")).toBeTruthy();
  });

  it("muestra estado vacío cuando no hay casos", () => {
    render(<UltimosCasos casos={[]} onVerCaso={vi.fn()} />);
    expect(screen.getByText("No hay casos recientes")).toBeTruthy();
  });
});
