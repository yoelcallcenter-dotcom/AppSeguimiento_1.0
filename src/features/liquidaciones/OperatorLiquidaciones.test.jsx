/**
 * OperatorLiquidaciones.test.jsx (v1.10.4 · ampliado v1.10.5)
 * Integración de la sub-sección de Liquidaciones: preparar la liquidación
 * desde la UI y registrar/verificar el toggle manual "Está en el top"
 * (persistencia real sobre Dexie, sin datos ficticios en la vista).
 * v1.10.5: asignación manual de puestos con persistencia y auto-recálculo
 * de las liquidaciones en preparación con la configuración vigente (§8).
 */

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import appDB from "../../core/db/appDB";
import { OperatorLiquidaciones } from "./OperatorLiquidaciones";
import { periodoKeyDe, getTopDelPeriodo, getLiquidacion } from "./liquidacionesStore";

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

  // -------------------------------------------------------------------------
  // v1.10.5: puestos manuales del top + auto-recálculo con config vigente
  // -------------------------------------------------------------------------

  it("v1.10.5: asigna puestos manuales del top con persistencia y anti-duplicado", async () => {
    render(<OperatorLiquidaciones casos={casosMock()} showToast={vi.fn()} config={{ liquidaciones: { minimoFirmasNetas: 1 } }} />);
    await preparar();

    // Marcar a los dos estudios en el top del período.
    fireEvent.click(screen.getByLabelText("Está en el top: gl caba"));
    fireEvent.click(screen.getByLabelText("Está en el top: gl moron"));
    await waitFor(() => expect(screen.queryByLabelText("Puesto de gl caba")).toBeTruthy());

    // Asignar puesto 2 a gl caba.
    fireEvent.change(screen.getByLabelText("Puesto de gl caba"), { target: { value: "2" } });
    await waitFor(async () => {
      const top = await getTopDelPeriodo(periodoKeyDe(2026, 9));
      expect(top.find((t) => t.estudio === "gl caba").puesto).toBe(2);
    });

    // Anti-duplicado: el puesto 2 aparece como ocupado para el otro operador…
    await waitFor(() => expect(screen.queryByText("Puesto 2 (ocupado)")).toBeTruthy());
    // …y gl moron toma el puesto 1 sin conflicto.
    fireEvent.change(screen.getByLabelText("Puesto de gl moron"), { target: { value: "1" } });
    await waitFor(async () => {
      const top = await getTopDelPeriodo(periodoKeyDe(2026, 9));
      expect(top.find((t) => t.estudio === "gl moron").puesto).toBe(1);
      expect(top.find((t) => t.estudio === "gl caba").puesto).toBe(2);
    });

    // El importe del premio se calcula con la distribución vigente (50/30/20
    // sobre $100.000): puesto 2 = $30.000, puesto 1 = $50.000.
    expect(screen.queryAllByText("$ 30.000").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("$ 50.000").length).toBeGreaterThan(0);
  });

  it("v1.10.5: una liquidación en preparación se recalcula con la configuración vigente", async () => {
    // Primera pasada: mínimo 1 y tarifas por defecto (profesional = $20.000).
    const toastA = vi.fn();
    const { unmount } = render(
      <OperatorLiquidaciones casos={casosMock()} showToast={toastA} config={{ liquidaciones: { minimoFirmasNetas: 1 } }} />
    );
    await preparar();
    expect(screen.queryAllByText("$ 20.000").length).toBeGreaterThan(0); // 1 firma × 20.000 por estudio

    // Nueva "sesión" con configuración distinta: profesional pasa a $33.000.
    unmount();
    const toastB = vi.fn();
    render(
      <OperatorLiquidaciones
        casos={casosMock()}
        showToast={toastB}
        config={{
          liquidaciones: {
            minimoFirmasNetas: 1,
            categorias: [
              { key: "leve", nombre: "Lesión leve", tarifa: 10000, activa: true },
              { key: "grave", nombre: "Lesión grave", tarifa: 20000, activa: true },
              { key: "profesional", nombre: "Enfermedad profesional", tarifa: 33000, activa: true },
            ],
          },
        }}
      />
    );

    // El documento en preparación se recalcula solo con las reglas nuevas
    // (carga + recálculo + persistencia encadenados sobre Dexie: margen alto
    // porque esta máquina satura con operaciones secuenciales).
    await waitFor(
      () => expect(screen.queryAllByText("$ 33.000").length).toBeGreaterThan(0),
      { timeout: 15000 }
    );
    expect(toastB.mock.calls.flat().some((m) => String(m).includes("recalculada con la configuración vigente"))).toBe(true);

    // Y el snapshot persistido quedó actualizado.
    const doc = await getLiquidacion(periodoKeyDe(2026, 9));
    expect(doc.estado).toBe("preparacion");
    expect(doc.reglasSnapshot.tarifas.profesional).toBe(33000);
    expect(doc.operadores.find((o) => o.estudio === "gl caba").importe).toBe(33000);
  });
});
