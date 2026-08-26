import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
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
  return container.querySelector(`span.font-bold`)?.textContent?.trim() === String(number);
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

  it("cierra el modal al hacer click en Cancelar", () => {
    render(<CsvExportModal open={true} onClose={mockOnClose} showToast={mockShowToast} />);
    fireEvent.click(screen.getByText("Cancelar"));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("cierra el modal al hacer click en el backdrop", () => {
    render(<CsvExportModal open={true} onClose={mockOnClose} showToast={mockShowToast} />);
    fireEvent.click(screen.getByRole("dialog"));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("renderiza select de aseguradora con opciones", () => {
    render(<CsvExportModal open={true} onClose={mockOnClose} showToast={mockShowToast} />);
    const selects = document.querySelectorAll("select");
    expect(selects.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Todas")).toBeTruthy();
    expect(screen.getByText("Sancor")).toBeTruthy();
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
});
