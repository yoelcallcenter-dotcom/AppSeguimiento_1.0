import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CalendarFilters } from "./CalendarFilters";

const EVENTS = [
  {
    id: 1,
    priority: "high",
    eventType: "cita",
    caseContext: {
      estado: "Pendiente",
      aseguradora: "Sancor",
      estudioJuridico: "GL Morón",
    },
  },
  {
    id: 2,
    priority: "low",
    eventType: "manual",
    caseContext: {
      estado: "Firmo",
      aseguradora: "Galeno",
      estudioJuridico: "LD",
    },
  },
  { id: 3, priority: "medium", eventType: "manual", caseContext: null },
  {
    id: 4,
    priority: "high",
    eventType: "reprogramacion",
    caseContext: {
      estado: "Firmo",
      aseguradora: "Sancor",
      estudioJuridico: "GL Morón",
    },
  },
];

const EMPTY = {
  estados: [],
  prioridades: [],
  aseguradoras: [],
  estudios: [],
  tipos: [],
};

const byText = (expected) => (_, el) =>
  Boolean(el) && el.textContent.replace(/\s+/g, " ").trim() === expected;

describe("CalendarFilters", () => {
  it("renderiza los 5 grupos con un solo label por campo y el panel con nombre propio", () => {
    render(
      <CalendarFilters
        events={EVENTS}
        config={{}}
        filtros={EMPTY}
        onFiltrosChange={vi.fn()}
      />
    );
    // T4c/C03 (1.10.1): la cabecera de texto "Filtros" desaparece (ya vive en
    // el chip de la toolbar); el panel queda identificable como group con
    // nombre propio, que es lo que enlaza el aria-controls del chip.
    expect(screen.getByRole("group", { name: "Filtros del calendario" })).toBeTruthy();
    ["Estado", "Prioridad", "Aseguradora", "Estudio", "Tipo"].forEach(
      (label) => {
        expect(screen.getAllByText(label)).toHaveLength(1);
      }
    );
    expect(screen.getAllByText("Todos")).toHaveLength(3);
    expect(screen.getAllByText("Todas")).toHaveLength(2);
  });

  it("muestra el total de eventos tras aplicar los filtros", () => {
    const { rerender } = render(
      <CalendarFilters
        events={EVENTS}
        config={{}}
        filtros={EMPTY}
        onFiltrosChange={vi.fn()}
      />
    );
    expect(screen.getByText(byText("Total: 4 eventos"))).toBeTruthy();

    rerender(
      <CalendarFilters
        events={EVENTS}
        config={{}}
        filtros={{ ...EMPTY, prioridades: ["high"] }}
        onFiltrosChange={vi.fn()}
      />
    );
    expect(screen.getByText(byText("Total: 2 eventos"))).toBeTruthy();
  });

  it("muestra Limpiar filtros deshabilitado sin filtros y habilitado con filtros activos", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <CalendarFilters
        events={EVENTS}
        config={{}}
        filtros={EMPTY}
        onFiltrosChange={onChange}
      />
    );
    expect(
      screen.getByRole("button", { name: "Limpiar filtros" }).disabled
    ).toBe(true);

    rerender(
      <CalendarFilters
        events={EVENTS}
        config={{}}
        filtros={{ ...EMPTY, estados: ["Firmo"] }}
        onFiltrosChange={onChange}
      />
    );
    const active = screen.getByRole("button", { name: "Limpiar filtros" });
    expect(active.disabled).toBe(false);

    fireEvent.click(active);
    expect(onChange).toHaveBeenCalledWith(EMPTY);
  });
});
