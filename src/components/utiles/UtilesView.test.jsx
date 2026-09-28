import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { UtilesView } from "./UtilesView";

const noop = vi.fn();

const baseProps = {
  config: {},
  setConfig: noop,
  pasos: [],
  setPasos: noop,
  tips: [],
  setTips: noop,
  links: [],
  setLinks: noop,
  speechs: [],
  setSpeechs: noop,
  objeciones: [],
  setObjeciones: noop,
  art: [],
  setArt: noop,
  transito: [],
  setTransito: noop,
  lesiones: {},
  setLesiones: noop,
  mapeo: [],
  setMapeo: noop,
  observacionesTransito: [],
  setObservacionesTransito: noop,
  condicionales: [],
  setCondicionales: noop,
  casos: [],
  showToast: noop,
};

const renderVista = () => render(<UtilesView {...baseProps} />);

describe("UtilesView (navegación por grupos)", () => {
  it("renderiza los tres grupos de secciones", () => {
    renderVista();
    const grupos = screen.getByLabelText("Grupos de Útiles");
    const labels = within(grupos)
      .getAllByRole("button")
      .map((b) => b.textContent);
    expect(labels).toEqual(["Textos", "Directorios", "Otros"]);
  });

  it("muestra solo las secciones del grupo activo (Textos por defecto)", () => {
    renderVista();
    const pills = screen.getByLabelText("Secciones de Útiles");
    expect(within(pills).getByText("Speechs")).toBeTruthy();
    expect(within(pills).getByText("Pasos a Seguir")).toBeTruthy();
    expect(within(pills).queryByText("Condicionales")).toBeNull();
    expect(within(pills).queryByText("Aseguradoras")).toBeNull();
    expect(screen.getByText(/Libretos de comunicación/)).toBeTruthy();
  });

  it("cambiar de grupo muestra solo sus secciones y selecciona la primera", () => {
    renderVista();
    fireEvent.click(screen.getByText("Directorios"));
    const pills = screen.getByLabelText("Secciones de Útiles");
    expect(within(pills).getByText("Aseguradoras")).toBeTruthy();
    expect(within(pills).queryByText("Speechs")).toBeNull();
    expect(screen.getByText(/Directorio de aseguradoras/)).toBeTruthy();
  });

  it("clic en una sub-sección del grupo cambia a esa sección", () => {
    renderVista();
    fireEvent.click(screen.getByText("Otros"));
    const pills = screen.getByLabelText("Secciones de Útiles");
    fireEvent.click(within(pills).getByText("Plantillas"));
    expect(
      screen.getByText(/Plantillas de documentos para reutilizar/)
    ).toBeTruthy();
  });
});
