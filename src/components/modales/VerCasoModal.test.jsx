import React from "react";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { VerCasoModal } from "./VerCasoModal";
import { CONFIG_DEFAULT } from "../../utils/constants";

/**
 * VerCasoModal.test.jsx — v1.10.11
 * Reescrito para el rediseño del modal del caso:
 * - las 4 secciones (Herramientas/Comentarios/Historial/Reportes) son un
 *   segmented control con role="tablist" (default Herramientas);
 * - se eliminó la sección Objeciones (props condicionales/speechs/objeciones
 *   ya no se pasan ni se muestran);
 * - se eliminó el ALTA de reportes (editar y borrado se conservan);
 * - se eliminaron las pills "+N" de casos con misma ART/estudio;
 * - los 13 labels del grid llevan icono;
 * - el input de edición de reporte tiene la toolbar de transformación.
 */

const noop = () => {};

const caso = {
  id: 1,
  nombre: "Caso Test",
  telefono: "3001112233",
  estado: "Cita virtual",
  fecha: "2026-09-01",
  aseguradora: "Galeno",
  estudioJuridico: "Estudio Alfa",
  profesion: "Chofer",
  lesion: "Esguince",
  observaciones: "Observación de prueba",
  comentarios: [],
  tags: [],
  // Con reporteHistory para poder probar el panel Reportes (1.10.11).
  reporteHistory: [
    { fecha: "01/09", texto: "Primer reporte del caso", origen: "Operador" },
  ],
};

const renderModal = (props = {}) =>
  render(
    <VerCasoModal
      caso={caso}
      config={CONFIG_DEFAULT}
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
      navigationStack={[]}
      onBackNavigation={noop}
      showToast={noop}
      {...props}
    />
  );

describe("VerCasoModal · segmented control de secciones (1.10.11)", () => {
  it("muestra 4 tabs con conteos, Herramientas por default y sus acciones rápidas", () => {
    renderModal();

    // Un solo tablist con los 4 tabs y aria-selected correcto.
    expect(screen.getByRole("tablist", { name: "Secciones del caso" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Herramientas (0)" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Comentarios (0)" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Historial (0)" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Reportes (1)" })).toBeTruthy();
    expect(
      screen.getByRole("tab", { name: "Herramientas (0)" }).getAttribute("aria-selected")
    ).toBe("true");

    // El panel visible es Herramientas y contiene Notas/Calendario.
    const panel = screen.getByRole("tabpanel");
    expect(panel.id).toBe("panel-herramientas");
    expect(within(panel).getByText("Notas")).toBeTruthy();
    expect(within(panel).getByText("Calendario")).toBeTruthy();

    // Ancla del paso 15 del tour (antes muerta: no existía en el DOM).
    expect(document.querySelector('[data-tour="herramientas"]')).toBeTruthy();

    // Pie: Editar / Reporte / Eliminar / Cerrar (sin Notas/Calendario).
    const editar = screen.getByText("Editar").closest("button");
    const pie = editar.parentElement.parentElement;
    expect(within(pie).getByText("Reporte")).toBeTruthy();
    expect(within(pie).getByText("Eliminar")).toBeTruthy();
    expect(within(pie).getByText("Cerrar")).toBeTruthy();
    expect(within(pie).queryByText("Notas")).toBeNull();
    expect(within(pie).queryByText("Calendario")).toBeNull();
  });

  it("al cambiar de tab solo se ve el panel elegido", () => {
    renderModal();

    fireEvent.click(screen.getByRole("tab", { name: "Comentarios (0)" }));
    expect(
      screen.getByRole("tab", { name: "Comentarios (0)" }).getAttribute("aria-selected")
    ).toBe("true");
    expect(
      screen.getByRole("tab", { name: "Herramientas (0)" }).getAttribute("aria-selected")
    ).toBe("false");
    expect(screen.getByPlaceholderText("Escribe un comentario...")).toBeTruthy();
    expect(screen.queryByText("Notas")).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "Historial (0)" }));
    expect(screen.queryByPlaceholderText("Escribe un comentario...")).toBeNull();
    expect(screen.getByRole("tabpanel").id).toBe("panel-historial");

    fireEvent.click(screen.getByRole("tab", { name: "Herramientas (0)" }));
    expect(screen.getByRole("tabpanel").id).toBe("panel-herramientas");
    expect(within(screen.getByRole("tabpanel")).getByText("Notas")).toBeTruthy();
  });

  it("no lista objeciones ni props relacionadas aunque se las pase", () => {
    renderModal({
      objeciones: [
        { id: "o1", titulo: "No toma Galeno", contenido: "Estudio Alfa no toma Galeno" },
      ],
      condicionales: [
        { id: "c1", estudio: "Estudio Alfa", aseguradora: "Galeno", condicion: "no-toma" },
      ],
      speechs: ["Speech que menciona Galeno"],
    });

    expect(screen.queryByText(/Objeciones/)).toBeNull();
    expect(screen.queryByText(/Condicionales/)).toBeNull();
    expect(screen.queryByText(/Speechs/)).toBeNull();
  });

  it("el panel Reportes edita y borra pero no permite dar de alta", () => {
    renderModal();
    fireEvent.click(screen.getByRole("tab", { name: "Reportes (1)" }));

    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getByText("Primer reporte del caso")).toBeTruthy();
    // Sin formulario de alta: ni input "Agregar novedad..." ni botón Agregar.
    expect(within(panel).queryByPlaceholderText("Agregar novedad...")).toBeNull();
    expect(within(panel).queryByRole("button", { name: "Agregar" })).toBeNull();
    // Edición y borrado siguen disponibles.
    expect(within(panel).getByRole("button", { name: "Editar reporte" })).toBeTruthy();
    expect(within(panel).getByRole("button", { name: "Eliminar reporte" })).toBeTruthy();
  });

  it("al editar un reporte aparece la toolbar de transformación de texto", () => {
    renderModal();
    fireEvent.click(screen.getByRole("tab", { name: "Reportes (1)" }));
    fireEvent.click(screen.getByRole("button", { name: "Editar reporte" }));

    expect(screen.getByRole("group", { name: "Formato del reporte en edición" })).toBeTruthy();

    const input = screen.getByPlaceholderText("Texto del reporte...");
    fireEvent.change(input, { target: { value: "hola mundo" } });
    fireEvent.click(screen.getByRole("button", { name: "MAYÚSCULAS" }));
    expect(screen.getByPlaceholderText("Texto del reporte...").value).toBe("HOLA MUNDO");
  });

  it("no muestra pills +N de casos con misma ART/estudio (1.10.11)", () => {
    const otro = { ...caso, id: 2, nombre: "Otro Caso" };
    // 'casos' ya no es prop del modal: se pasa para probar que se ignora.
    renderModal({ casos: [caso, otro] });

    expect(screen.queryByText("+1")).toBeNull();
    expect(document.querySelectorAll(".pill-compact").length).toBe(0);
    // El valor de Aseguradora se muestra como texto puro.
    expect(screen.getByText("Aseguradora")).toBeTruthy();
    expect(screen.getByText("Galeno")).toBeTruthy();
  });

  it("los labels del grid de información llevan icono (1.10.11)", () => {
    renderModal();

    ["Nombre", "Teléfono", "Localidad", "Aseguradora", "Lesión", "Observaciones"].forEach(
      (label) => {
        const span = screen.getByText(label);
        expect(span.querySelector("svg"), `icono en label "${label}"`).toBeTruthy();
      }
    );
  });

  it("el botón Cerrar del pie invoca onClose", async () => {
    const onClose = vi.fn();
    renderModal({ onClose });

    fireEvent.click(screen.getByText("Cerrar"));

    await waitFor(() => expect(onClose).toHaveBeenCalled(), { timeout: 2000 });
  });
});
