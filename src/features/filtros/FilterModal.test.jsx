import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FilterModal } from "./FilterModal";

const CASOS = [
  {
    id: 1,
    estado: "Firmo",
    aseguradora: "SANCOR",
    localidad: "MENDOZA",
    estudioJuridico: "GL MdP",
    provincia: "MENDOZA",
    tipoIngreso: "Derivación",
    telefono: "0261-112233",
    reporteHistory: [{ origen: "Llamada" }],
  },
  {
    id: 2,
    estado: "Pendiente",
    aseguradora: "GALICIA",
    localidad: "LA PLATA",
    estudioJuridico: "GL CABA",
    provincia: "BUENOS AIRES",
    tipoIngreso: "Web",
    telefono: "114455",
    reporteHistory: [],
  },
  {
    id: 3,
    estado: "Cita virtual",
    aseguradora: "SANCOR",
    localidad: "MENDOZA",
    estudioJuridico: "GL MdP",
    provincia: "MENDOZA",
    tipoIngreso: "Derivación",
    telefono: "26155",
    reporteHistory: [{ origen: "Mail" }],
  },
];

describe("FilterModal (staging 1.8.9)", () => {
  const onClose = vi.fn();
  const onChange = vi.fn();
  const showToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderModal(props = {}) {
    return render(
      <FilterModal
        isOpen={true}
        onClose={onClose}
        opcionesCasos={CASOS}
        baseCasos={CASOS}
        onChange={onChange}
        showToast={showToast}
        {...props}
      />
    );
  }

  const telInput = () => screen.getByLabelText("Prefijo de telefono");
  const counter = () => screen.getByText(/Total:/).textContent;

  it("no renderiza el panel cuando isOpen es false", () => {
    const { container } = renderModal({ isOpen: false });
    expect(container.textContent).not.toContain("Filtros globales");
  });

  it("renderiza las secciones de filtro y el contador inicial", () => {
    renderModal();
    expect(screen.getByText("Filtros globales")).toBeTruthy();
    expect(screen.getByText("Todos los estados")).toBeTruthy();
    expect(counter()).toContain("Total: 3");
    expect(screen.getByRole("button", { name: /Aplicar Filtro/ }).disabled).toBe(
      true
    );
  });

  it("el borrador cambia el preview pero no se escribe hasta Aplicar Filtro", async () => {
    renderModal();
    fireEvent.change(telInput(), { target: { value: "0261" } });
    expect(counter()).toContain("Total: 1");
    expect(onChange).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: /Limpiar sección/ })
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Aplicar Filtro/ }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].telefono).toBe("0261");
    expect(showToast).toHaveBeenCalledWith(
      "Filtro aplicado: 1 caso",
      "info"
    );
  });

  it("Limpiar sección descarta el borrador y vuelve al preview completo", () => {
    renderModal();
    fireEvent.change(telInput(), { target: { value: "0261" } });
    expect(counter()).toContain("Total: 1");

    fireEvent.click(screen.getByRole("button", { name: /Limpiar sección/ }));
    expect(counter()).toContain("Total: 3");
    expect(screen.queryByRole("button", { name: /Limpiar sección/ })).toBeNull();
    expect(
      screen.getByRole("button", { name: /Aplicar Filtro/ }).disabled
    ).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("cierra sin aplicar al tocar X", async () => {
    renderModal();
    fireEvent.change(telInput(), { target: { value: "0261" } });
    fireEvent.click(screen.getByLabelText("Cerrar"));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onChange).not.toHaveBeenCalled();
  });

  it("cierra sin aplicar con Escape", async () => {
    renderModal();
    fireEvent.change(telInput(), { target: { value: "0261" } });
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onChange).not.toHaveBeenCalled();
  });

  it("el filtro aplicado se toma como nuevo punto de partida (sin diff no aplica)", async () => {
    const { rerender } = renderModal();
    fireEvent.change(telInput(), { target: { value: "0261" } });
    fireEvent.click(screen.getByRole("button", { name: /Aplicar Filtro/ }));
    expect(onChange).toHaveBeenCalledTimes(1);

    rerender(
      <FilterModal
        isOpen={true}
        onClose={onClose}
        opcionesCasos={CASOS}
        baseCasos={CASOS}
        filtroGlobal={{ telefono: "0261" }}
        onChange={onChange}
        showToast={showToast}
      />
    );
    expect(counter()).toContain("Total: 1");
    expect(
      screen.getByRole("button", { name: /Aplicar Filtro/ }).disabled
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /Aplicar Filtro/ }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
