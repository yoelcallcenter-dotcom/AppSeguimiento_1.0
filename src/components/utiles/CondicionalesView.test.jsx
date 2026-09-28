import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CondicionalesView } from "./CondicionalesView";

const condicionales = [
  { id: "c1", estudio: "Estudio Alfa", aseguradora: "Galeno", condicion: "no-toma", observacion: "No recibe" },
  { id: "c2", estudio: "Estudio Alfa", aseguradora: "Omint", condicion: "condicion", observacion: "Con aval" },
  { id: "c3", estudio: "Estudio Beta", aseguradora: "Galeno", condicion: "condicion", observacion: "" },
];

function renderVista(props = {}) {
  return render(
    <CondicionalesView
      condicionales={condicionales}
      setCondicionales={vi.fn()}
      mapeo={[{ id: "m1", estudio: "Estudio Alfa" }, { id: "m2", estudio: "Estudio Beta" }]}
      aseguradoras={["Galeno", "Omint"]}
      showToast={vi.fn()}
      {...props}
    />
  );
}

describe("CondicionalesView", () => {
  it("renderiza una única tabla con su título de sección", () => {
    renderVista();
    expect(screen.getAllByRole("table")).toHaveLength(1);
    expect(screen.getByText("Condicionales de Estudios Jurídicos")).toBeTruthy();
    expect(screen.getByText(/Estudios que no toman todas las aseguradoras/)).toBeTruthy();
    expect(screen.getByText("3 registradas")).toBeTruthy();
  });

  it("muestra los grupos colapsados por defecto y los expande al hacer clic", () => {
    renderVista();
    expect(screen.queryAllByRole("cell", { name: "Galeno" })).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: /Estudio Alfa/ }));
    expect(screen.getAllByRole("cell", { name: "Galeno" })).toHaveLength(1);
    expect(screen.getAllByRole("cell", { name: "Omint" })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /Estudio Beta/ }));
    expect(screen.getAllByRole("cell", { name: "Galeno" })).toHaveLength(2);
  });

  it("expandir todo muestra todas las filas manteniendo una sola tabla", () => {
    renderVista();
    fireEvent.click(screen.getByText("Expandir todo"));
    expect(screen.getAllByRole("table")).toHaveLength(1);
    expect(screen.getAllByRole("cell", { name: "Galeno" })).toHaveLength(2);
    expect(screen.getByText("Colapsar todo")).toBeTruthy();
  });

  it("muestra el indicador de 'no toman' junto al título", () => {
    renderVista();
    expect(screen.getByText("1 no toman")).toBeTruthy();
  });
});
