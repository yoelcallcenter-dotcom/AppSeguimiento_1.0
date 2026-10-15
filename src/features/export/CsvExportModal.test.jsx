import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CsvExportModal } from "./CsvExportModal";
import useAppStore from "../../core/store/useAppStore";

vi.mock("../../core/store/useAppStore", () => ({
  default: vi.fn(),
}));

const mockCasos = [
  { id: "1", nombre: "Juan Perez", telefono: "1234567890", estado: "Firmo", fecha: "2026-08-01", localidad: "CABA", aseguradora: "Sancor", estudioJuridico: "GL CABA" },
  { id: "2", nombre: "Maria Lopez", telefono: "0987654321", estado: "Pendiente", fecha: "2026-08-15", localidad: "Rosario", aseguradora: "Galeno", estudioJuridico: "GL Rosario" },
  { id: "3", nombre: "Pedro Gomez", telefono: "5555555555", estado: "Firmo", fecha: "2026-07-01", localidad: "CABA", aseguradora: "Sancor", estudioJuridico: "GL CABA" },
];

const mockConfig = {
  estados: [
    { v: "Firmo", accent: "#10B981", peso: 1 },
    { v: "Pendiente", accent: "#F59E0B", peso: 1 },
    { v: "Cita virtual", accent: "#6366F1", peso: 1 },
  ],
};

beforeEach(() => {
  useAppStore.mockImplementation((selector) => {
    const state = { cases: mockCasos, config: mockConfig };
    return selector(state);
  });
});

function getCount(container, number) {
  // 1.10.1: el total ahora lo renderiza FilterCounter con <b> (antes era un
  // <span class="font-bold"> en el copy del pie).
  return container.querySelector(`b`)?.textContent?.trim() === String(number);
}

describe("CsvExportModal", () => {
  const mockOnClose = vi.fn();
  const mockShowToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("no renderiza cuando open es false", () => {
    const { container } = render(<CsvExportModal open={false} onClose={mockOnClose} showToast={mockShowToast} />);
    expect(container.textContent).not.toContain("Exportar casos a CSV");
  });

  it("renderiza el modal cuando open es true", () => {
    const { container } = render(<CsvExportModal open={true} onClose={mockOnClose} showToast={mockShowToast} />);
    expect(container.textContent).toContain("Exportar casos a CSV");
    expect(getCount(container, 3)).toBe(true);
  });

  it("muestra pills de estados", () => {
    render(<CsvExportModal open={true} onClose={mockOnClose} showToast={mockShowToast} />);
    expect(screen.getByText("Firmo")).toBeTruthy();
    expect(screen.getByText("Pendiente")).toBeTruthy();
  });

  it("filtra por estado al hacer click en pill", () => {
    const { container } = render(<CsvExportModal open={true} onClose={mockOnClose} showToast={mockShowToast} />);
    fireEvent.click(screen.getByText("Firmo"));
    expect(getCount(container, 2)).toBe(true);
  });

  it("filtra por fecha desde", () => {
    const { container } = render(<CsvExportModal open={true} onClose={mockOnClose} showToast={mockShowToast} />);
    const dateInputs = screen.getAllByDisplayValue("");
    fireEvent.change(dateInputs[0], { target: { value: "2026-08-10" } });
    expect(getCount(container, 1)).toBe(true);
  });

  it("limpiar filtros resetea todo", () => {
    const { container } = render(<CsvExportModal open={true} onClose={mockOnClose} showToast={mockShowToast} />);
    fireEvent.click(screen.getByText("Firmo"));
    expect(getCount(container, 2)).toBe(true);
    fireEvent.click(screen.getByText("Limpiar filtros"));
    expect(getCount(container, 3)).toBe(true);
  });

  it("cierra el modal al hacer click en Cancelar (cierre animado 1.10.1)", async () => {
    // 1.10.1: Cancelar usa panelRef.startClose() (animación de 250 ms) como
    // el sidebar de Filtros; onClose se invoca al terminar la animación.
    render(<CsvExportModal open={true} onClose={mockOnClose} showToast={mockShowToast} />);
    fireEvent.click(screen.getByText("Cancelar"));
    await waitFor(() => expect(mockOnClose).toHaveBeenCalled());
  });

  it("cierra el modal al hacer click en el backdrop", async () => {
    render(<CsvExportModal open={true} onClose={mockOnClose} showToast={mockShowToast} />);
    fireEvent.click(screen.getByRole("dialog"));
    await waitFor(() => expect(mockOnClose).toHaveBeenCalled());
  });

  it("expone Aseguradora/Estudio/Localidad como MultiSelect (sin selects nativos 1.10.1)", () => {
    // 1.10.1 (rediseño): los filtros categóricos pasan a MultiSelect multi
    // (patrón FilterModal); ya no hay <select> nativos en el panel.
    render(<CsvExportModal open={true} onClose={mockOnClose} showToast={mockShowToast} />);
    expect(document.querySelectorAll("select").length).toBe(0);
    // El botón del MultiSelect de Aseguradora muestra el placeholder "Todas".
    const asegBtn = screen.getByText("Aseguradora").parentElement.querySelector("button");
    expect(asegBtn.textContent).toContain("Todas");
    // Al abrirlo lista las aseguradoras del fixture.
    fireEvent.click(asegBtn);
    expect(screen.getByRole("option", { name: "Sancor" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Galeno" })).toBeTruthy();
  });

  it("filtra por múltiples aseguradoras a la vez (multi-select 1.10.1)", () => {
    // 1.10.1 (rediseño): antes un <select> single no permitía exportar dos
    // aseguradoras juntas; ahora la selección es multi-valor.
    const { container } = render(<CsvExportModal open={true} onClose={mockOnClose} showToast={mockShowToast} />);
    const asegBtn = screen.getByText("Aseguradora").parentElement.querySelector("button");
    fireEvent.click(asegBtn);
    fireEvent.click(screen.getByRole("option", { name: "Sancor" }));
    // Sancor: casos 1 y 3.
    expect(getCount(container, 2)).toBe(true);
    fireEvent.click(screen.getByRole("option", { name: "Galeno" }));
    // Sancor + Galeno: los 3 casos del fixture.
    expect(getCount(container, 3)).toBe(true);
  });

  it("deshabilita boton exportar cuando no hay casos", () => {
    useAppStore.mockImplementation((selector) => {
      const state = { cases: [], config: mockConfig };
      return selector(state);
    });
    render(<CsvExportModal open={true} onClose={mockOnClose} showToast={mockShowToast} />);
    const btn = screen.getByText("Exportar CSV").closest("button");
    expect(btn.disabled).toBe(true);
  });

  it("muestra el toggle Casos | Analítico", () => {
    render(<CsvExportModal open={true} onClose={mockOnClose} showToast={mockShowToast} />);
    expect(screen.getByText("Detalle por caso")).toBeTruthy();
    expect(screen.getByText("Analítico (resumen)")).toBeTruthy();
  });

  it("el chip Analítico queda activo al seleccionarlo (1.10.1)", () => {
    // 1.10.1: el copy de pie ("Resume N caso(s)…") se reemplazó por el
    // FilterCounter estándar; el estado del toggle se verifica por
    // aria-pressed del chip.
    const { container } = render(<CsvExportModal open={true} onClose={mockOnClose} showToast={mockShowToast} />);
    fireEvent.click(screen.getByText("Analítico (resumen)"));
    const chip = screen.getByText("Analítico (resumen)").closest("button");
    expect(chip.getAttribute("aria-pressed")).toBe("true");
    // El contador del pie sigue mostrando el total filtrado (texto partido
    // entre nodos: "Total: " + <b> + " casos").
    expect(container.textContent).toContain("Total:");
  });

  it("footer en dos filas: contador+limpiar arriba, Cancelar+Exportar abajo (C02d)", () => {
    // C02d (1.10.1): antes todo era una sola fila justify-between con wrap;
    // a 320px los 3 botones se pisaban/cortaban contra el contador. Ahora
    // son dos filas y el contador ya no arrastra el pb-2.5 de las barras
    // apiladas (className="" en el pie).
    const { container } = render(<CsvExportModal open={true} onClose={mockOnClose} showToast={mockShowToast} />);
    fireEvent.click(screen.getByText("Firmo")); // activa "Limpiar filtros"

    const counterSpan = [...container.querySelectorAll("span")].find(
      (s) => s.textContent.startsWith("Total:")
    );
    expect(counterSpan).toBeTruthy();
    expect(counterSpan.className).not.toContain("pb-2.5");

    const rowFiltros = counterSpan.parentElement;
    expect(rowFiltros.textContent).toContain("Limpiar filtros");

    const exportBtn = screen.getByText("Exportar CSV").closest("button");
    const cancelBtn = screen.getByText("Cancelar").closest("button");
    // Ambos botones comparten la fila de acciones, distinta de la del contador.
    expect(exportBtn.parentElement).toBe(cancelBtn.parentElement);
    expect(exportBtn.parentElement).not.toBe(rowFiltros);
  });
});
