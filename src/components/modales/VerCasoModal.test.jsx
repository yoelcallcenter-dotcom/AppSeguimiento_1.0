import React from "react";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { VerCasoModal } from "./VerCasoModal";
import { CONFIG_DEFAULT } from "../../utils/constants";

const noop = () => {};

const caso = {
  id: 1,
  nombre: "Caso Test",
  telefono: "3001112233",
  estado: "Cita virtual",
  fecha: "2026-09-01",
  aseguradora: "Galeno",
  estudioJuridico: "Estudio Alfa",
  comentarios: [],
  tags: [],
};

const renderModal = (props = {}) =>
  render(
    <VerCasoModal
      caso={caso}
      config={CONFIG_DEFAULT}
      casos={[caso]}
      onClose={noop}
      onEdit={noop}
      covered={false}
      onComentarios={noop}
      onActualizarCaso={noop}
      onDelete={noop}
      onNuevaNota={noop}
      onNuevoEvento={noop}
      onReporteRapido={noop}
      onNavigateToNote={noop}
      onNavigateToEvent={noop}
      onNavigateInsurer={noop}
      onNavigateLawFirm={noop}
      navigationStack={[]}
      onBackNavigation={noop}
      showToast={noop}
      condicionales={[
        { id: "c1", estudio: "Estudio Alfa", aseguradora: "Galeno", condicion: "no-toma", observacion: "" },
      ]}
      speechs={["Speech que menciona Galeno y Estudio Alfa"]}
      {...props}
    />
  );

describe("VerCasoModal · sección Herramientas (1.9.4)", () => {
  it("muestra Notas y Calendario dentro de Herramientas y Cerrar en el pie", () => {
    renderModal();

    const seccionHerramientas = screen.getByText("Herramientas").parentElement;
    expect(within(seccionHerramientas).getByText("Notas")).toBeTruthy();
    expect(within(seccionHerramientas).getByText("Calendario")).toBeTruthy();

    const editar = screen.getByText("Editar").closest("button");
    const pie = editar.parentElement.parentElement;
    expect(within(pie).getByText("Reporte")).toBeTruthy();
    expect(within(pie).getByText("Eliminar")).toBeTruthy();
    expect(within(pie).getByText("Cerrar")).toBeTruthy();
    expect(within(pie).queryByText("Notas")).toBeNull();
    expect(within(pie).queryByText("Calendario")).toBeNull();
  });

  it("no lista condicionales ni speechs relacionados, pero sí objeciones", () => {
    renderModal({
      objeciones: [
        { id: "o1", titulo: "No toma Galeno", contenido: "Estudio Alfa no toma Galeno" },
      ],
    });

    expect(screen.queryByText(/Condicionales \(/)).toBeNull();
    expect(screen.queryByText(/Speechs \(/)).toBeNull();
    expect(screen.getByText("Objeciones (1)")).toBeTruthy();
  });

  it("el botón Cerrar del pie invoca onClose", async () => {
    const onClose = vi.fn();
    renderModal({ onClose });

    fireEvent.click(screen.getByText("Cerrar"));

    await waitFor(() => expect(onClose).toHaveBeenCalled(), { timeout: 2000 });
  });
});
