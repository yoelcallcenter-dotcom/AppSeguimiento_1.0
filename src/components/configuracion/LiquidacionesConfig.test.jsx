/**
 * LiquidacionesConfig.test.jsx (v1.10.5)
 * UI de Configuración → Productividad → Liquidaciones (§12A/B/D del prompt 1.10.5):
 * navegación de sub-tabs, edición del mínimo, alta de categorías con
 * validación real, bloqueo de fondos que rompen la distribución de premios,
 * e historial con restauración confirmada. La auditoría se verifica sobre
 * Dexie real (fake-indexeddb) y los cambios sobre `config` sobre el setConfig
 * recibido por props.
 */

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { LiquidacionesConfig } from "./LiquidacionesConfig";
import appDB from "../../core/db/appDB";
import {
  registrarCambioConfig,
  getHistorialConfig,
} from "../../features/liquidaciones/liquidacionesStore";

beforeEach(async () => {
  cleanup();
  await appDB.liquidacion_config_history.clear();
});

function renderizar(config = {}) {
  const setConfig = vi.fn();
  const showToast = vi.fn();
  render(<LiquidacionesConfig config={config} setConfig={setConfig} showToast={showToast} />);
  return { setConfig, showToast };
}

describe("LiquidacionesConfig", () => {
  it("muestra las 5 sub-secciones y el contenido inicial de General y Tarifas", () => {
    renderizar({});
    ["General", "Tarifas", "Reglas de liquidación", "Premios", "Historial"].forEach((t) => {
      expect(screen.getByRole("tab", { name: t })).toBeTruthy();
    });
    // Tab General: mínimo por defecto 14 y modalidad explicada.
    expect(screen.getByLabelText("Mínimo de firmas para habilitar el cobro").value).toBe("14");
    expect(screen.getByText(/Modalidad vigente \(única implementada\)/)).toBeTruthy();

    // Tab Tarifas: las 3 categorías por defecto con sus importes.
    fireEvent.click(screen.getByRole("tab", { name: "Tarifas" }));
    expect(screen.getByLabelText("Tarifas por categoría")).toBeTruthy();
    expect(screen.getByLabelText("Tarifa de Lesión leve").value).toBe("10000");
    expect(screen.getByLabelText("Tarifa de Lesión grave").value).toBe("20000");
    expect(screen.getByLabelText("Tarifa de Enfermedad profesional").value).toBe("20000");
  });

  it("el mínimo editable persiste en la configuración y audita el cambio", async () => {
    const { setConfig, showToast } = renderizar({});
    const input = screen.getByLabelText("Mínimo de firmas para habilitar el cobro");
    fireEvent.change(input, { target: { value: "20" } });
    fireEvent.blur(input);

    await waitFor(() => expect(setConfig).toHaveBeenCalled());
    expect(setConfig.mock.calls.at(-1)[0].liquidaciones.minimoFirmasNetas).toBe(20);
    await waitFor(async () => {
      const rows = await getHistorialConfig();
      expect(rows.some((r) => r.campo === "minimoFirmasNetas" && r.valorNuevo === "20")).toBe(true);
    });
    expect(showToast.mock.calls.flat().some((m) => String(m).includes("guardado"))).toBe(true);
  });

  it("un mínimo inválido (no entero) se rechaza sin tocar la configuración", async () => {
    const { setConfig, showToast } = renderizar({});
    const input = screen.getByLabelText("Mínimo de firmas para habilitar el cobro");
    fireEvent.change(input, { target: { value: "1.5" } });
    fireEvent.blur(input);
    await waitFor(() =>
      expect(showToast.mock.calls.flat().some((m) => String(m).includes("entero"))).toBe(true)
    );
    expect(setConfig).not.toHaveBeenCalled();
  });

  it("da de alta una categoría válida con clave slug única y la audita", async () => {
    const { setConfig, showToast } = renderizar({});
    fireEvent.click(screen.getByRole("tab", { name: "Tarifas" }));
    fireEvent.change(screen.getByLabelText("Nombre de la nueva categoría"), {
      target: { value: "Lesión con secuela" },
    });
    fireEvent.change(screen.getByLabelText("Importe de la nueva categoría"), {
      target: { value: "35000" },
    });
    fireEvent.click(screen.getByText("Agregar categoría"));

    await waitFor(() => expect(setConfig).toHaveBeenCalled());
    const cats = setConfig.mock.calls.at(-1)[0].liquidaciones.categorias;
    const nueva = cats.find((c) => c.key === "lesion-con-secuela");
    expect(nueva).toBeTruthy();
    expect(nueva.tarifa).toBe(35000);
    expect(nueva.activa).toBe(true);
    expect(cats).toHaveLength(4);
    // El toast llega después del await de la auditoría (Dexie).
    await waitFor(() =>
      expect(showToast.mock.calls.flat().some((m) => String(m).includes("Categoría creada"))).toBe(true)
    );
    // Auditoría del cambio de la lista de categorías.
    await waitFor(async () => {
      const rows = await getHistorialConfig();
      expect(rows.some((r) => r.campo === "categorias")).toBe(true);
    });
  });

  it("rechaza el alta con tarifa negativa (sin guardar ni auditar)", async () => {
    const { setConfig, showToast } = renderizar({});
    fireEvent.click(screen.getByRole("tab", { name: "Tarifas" }));
    fireEvent.change(screen.getByLabelText("Nombre de la nueva categoría"), { target: { value: "Mala" } });
    fireEvent.change(screen.getByLabelText("Importe de la nueva categoría"), { target: { value: "-5" } });
    fireEvent.click(screen.getByText("Agregar categoría"));
    await waitFor(() =>
      expect(showToast.mock.calls.flat().some((m) => String(m).includes("negativo"))).toBe(true)
    );
    expect(setConfig).not.toHaveBeenCalled();
    expect(await getHistorialConfig()).toHaveLength(0);
  });

  it("bloquea un fondo que rompe la distribución fija de premios (§6E)", async () => {
    const { setConfig, showToast } = renderizar({});
    fireEvent.click(screen.getByRole("tab", { name: "Premios" }));
    const fondo = screen.getByLabelText("Fondo total de premios");
    expect(fondo.value).toBe("100000");
    fireEvent.change(fondo, { target: { value: "150000" } });
    fireEvent.blur(fondo);
    // 50.000+30.000+20.000 = 100.000 ≠ 150.000 y sin saldo parcial → error.
    await waitFor(() =>
      expect(showToast.mock.calls.flat().some((m) => String(m).includes("coincidir"))).toBe(true)
    );
    expect(setConfig).not.toHaveBeenCalled();
  });

  it("permite guardar un fondo válido con saldo parcial permitido", async () => {
    // Config inicial con saldo parcial ya permitido (el prop no se
    // retroalimenta con un setConfig mockeado; en la app real el padre
    // re-renderiza con la nueva config).
    const { setConfig } = renderizar({ liquidaciones: { premios: { permitirSaldoParcial: true } } });
    fireEvent.click(screen.getByRole("tab", { name: "Premios" }));
    expect(screen.getByLabelText("Permitir saldo sin asignar").checked).toBe(true);

    const fondo = screen.getByLabelText("Fondo total de premios");
    fireEvent.change(fondo, { target: { value: "150000" } });
    fireEvent.blur(fondo);
    // Suma 100.000 ≤ fondo 150.000 con saldo parcial → guardado válido.
    await waitFor(() =>
      expect(setConfig.mock.calls.at(-1)[0].liquidaciones.premios.fondo).toBe(150000)
    );
  });

  it("el historial lista los cambios y restaura con confirmación", async () => {
    await registrarCambioConfig({ campo: "minimoFirmasNetas", valorAnterior: "14", valorNuevo: "30" });
    const { setConfig } = renderizar({});
    fireEvent.click(screen.getByRole("tab", { name: "Historial" }));

    // Fila visible con campo en español y valores crudos.
    await waitFor(() => expect(screen.queryByText("Mínimo de firmas")).toBeTruthy());
    expect(screen.queryByText("30")).toBeTruthy();

    // Restaurar exige confirmación con resumen.
    fireEvent.click(screen.getByLabelText(/^Restaurar Mínimo de firmas/));
    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain("configuración vigente");
    fireEvent.click(screen.getByLabelText("Sí, restaurar"));

    // Se aplica el valor anterior como vigente (JSON.parse("14") → 14).
    await waitFor(() => expect(setConfig).toHaveBeenCalled());
    expect(setConfig.mock.calls.at(-1)[0].liquidaciones.minimoFirmasNetas).toBe(14);
    // La restauración genera su propia entrada de auditoría.
    await waitFor(async () => {
      const rows = await getHistorialConfig();
      expect(rows.filter((r) => r.campo === "minimoFirmasNetas").length).toBeGreaterThanOrEqual(2);
    });
  });
});
