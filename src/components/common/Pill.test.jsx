import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Pill } from "./Pill";
import useAppStore from "../../core/store/useAppStore";
import { getEstados } from "../../utils/catalogos";

// C03 (1.10.1): Pill usaba la constante ESTADOS (14 nombres fijos) como
// catálogo por defecto — un estado creado/renombrado en Configuración no se
// encontraba y el pill caía al accent de la última entrada del default (o
// gris). Ahora resuelve getEstados(config) desde la store (App.jsx espeja la
// config en setConfig). Se spinea getEstados para verificar el cableado,
// porque jsdom no resuelve las var() inline del estilo del pill.
vi.mock("../../utils/catalogos", async (importOriginal) => {
  const mod = await importOriginal();
  return { ...mod, getEstados: vi.fn(mod.getEstados) };
});

describe("Pill · C03 (1.10.1)", () => {
  beforeEach(() => {
    getEstados.mockClear();
    useAppStore.setState({ config: null });
  });
  afterEach(() => {
    useAppStore.setState({ config: null });
  });

  it("renderiza con la config nula usando los defaults (comportamiento previo)", () => {
    render(<Pill estado="Firmo" />);
    expect(screen.getByLabelText("Estado: Firmo")).toBeTruthy();
    expect(getEstados).toHaveBeenCalledWith({});
  });

  it("resuelve el catálogo desde config espejada en la store", () => {
    const config = {
      estados: [{ v: "Mi Estado", accent: "#FF00FF", peso: 1 }],
      estadosDeleted: [],
    };
    useAppStore.setState({ config });
    render(<Pill estado="Mi Estado" />);
    expect(screen.getByLabelText("Estado: Mi Estado")).toBeTruthy();
    expect(getEstados).toHaveBeenCalledWith(config);
  });

  it("el prop estados sigue teniendo prioridad sobre el catálogo de la store", () => {
    const config = { estados: [{ v: "DeConfig", accent: "#000", peso: 1 }] };
    useAppStore.setState({ config });
    const inyectados = [{ v: "DeProp", accent: "#FFF", peso: 1 }];
    render(<Pill estado="DeProp" estados={inyectados} />);
    expect(screen.getByLabelText("Estado: DeProp")).toBeTruthy();
    expect(getEstados).not.toHaveBeenCalled();
  });
});
