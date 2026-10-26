/**
 * OperatorLiquidaciones.test.jsx (v1.10.4)
 * Integración de la sub-sección de Liquidaciones: preparar la liquidación
 * desde la UI y registrar/verificar el toggle manual "Está en el top"
 * (persistencia real sobre Dexie, sin datos ficticios en la vista).
 */

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import appDB from "../../core/db/appDB";
import { OperatorLiquidaciones } from "./OperatorLiquidaciones";
import { periodoKeyDe, getTopDelPeriodo } from "./liquidacionesStore";

function casosMock() {
  return [
    {
      id: "u-1",
      nombre: "Juan Perez",
      estado: "Firmo",
      fechaFirma: "2026-10-10",
      reporteHistory: [],
      estudioJuridico: "gl caba",
      tipoIngreso: "Enfermedad Profesional",
    },
    {
      id: "u-2",
      nombre: "Ana Lopez",
      estado: "Firmo",
      fechaFirma: "2026-10-12",
      reporteHistory: [],
      estudioJuridico: "gl moron",
      tipoIngreso: "Enfermedad Profesional",
    },
  ];
}

// El período del view por defecto es el mes actual: se espera la carga
// inicial (el input no existe durante el spinner), se fija octubre 2026 y
// se prepara la liquidación.
async function preparar(view) {
  await waitFor(() => expect(screen.queryByLabelText("Período de liquidación")).toBeTruthy());
  fireEvent.change(screen.getByLabelText("Período de liquidación"), {
    target: { value: "2026-10" },
  });
  await waitFor(() => expect(screen.queryByText(/Sin liquidación preparada para Octubre 2026/i)).toBeTruthy());
  fireEvent.click(screen.getByText("Preparar liquidación"));
  await waitFor(() => expect(screen.queryByText("Liquidación por estudio")).toBeTruthy());
}

beforeEach(async () => {
  cleanup();
  await appDB.liquidaciones.clear();
  await appDB.liquidacion_top.clear();
});

describe("OperatorLiquidaciones", () => {
  it("prepara la liquidación del período seleccionado y muestra la tabla por estudio", async () => {
    render(<OperatorLiquidaciones casos={casosMock()} showToast={vi.fn()} config={{}} />);
    await preparar();
    expect(screen.queryByText("gl caba")).toBeTruthy();
    expect(screen.queryByText("gl moron")).toBeTruthy();
    expect(screen.queryByText("En preparación")).toBeTruthy();
  });

  it("el toggle 'Está en el top' persiste en el período elegido", async () => {
    render(<OperatorLiquidaciones casos={casosMock()} showToast={vi.fn()} config={{}} />);
    await preparar();

    const toggle = screen.getByLabelText("Está en el top: gl caba");
    fireEvent.click(toggle);

    await waitFor(async () => {
      const top = await getTopDelPeriodo(periodoKeyDe(2026, 9));
      expect(top.some((t) => t.estudio === "gl caba" && t.enTop)).toBe(true);
    });
    // El top de octubre no afecta a noviembre (período distinto).
    expect(await getTopDelPeriodo(periodoKeyDe(2026, 10))).toHaveLength(0);
  });

  it("muestra el estado vacío antes de preparar y deja el cierre deshabilitado", async () => {
    render(<OperatorLiquidaciones casos={[]} showToast={vi.fn()} config={{}} />);
    await waitFor(() => expect(screen.queryByText(/Sin liquidación preparada/i)).toBeTruthy());
    // Sin liquidación preparada el cierre existe pero queda deshabilitado.
    await waitFor(() => expect(screen.queryByLabelText("Período de liquidación")).toBeTruthy());
    expect(screen.getByText("Cerrar liquidación").closest("button").disabled).toBe(true);
  });
});
