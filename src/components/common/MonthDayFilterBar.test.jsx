import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FiltersProvider } from "../../context/FiltersContext";
import { MonthDayFilterBar } from "./MonthDayFilterBar";

/**
 * 1.9.6 (fix bug: días sin casos en el filtro por día).
 * DayFilter debe mostrar SOLO los días que tienen casos en el mes. Antes,
 * MonthDayFilterBar agregaba también los días no disponibles de Mi Espacio
 * (feriados/ausencias/vacaciones) y, al seleccionarlos, la lista quedaba vacía
 * porque no había casos en esa fecha.
 */
function renderBar(casos) {
  return render(
    <FiltersProvider>
      <MonthDayFilterBar
        mesesDisponibles={["2026-09"]}
        total={casos.length}
        casos={casos}
        casosMes={casos}
      />
    </FiltersProvider>
  );
}

describe("MonthDayFilterBar", () => {
  beforeEach(() => localStorage.clear());

  it("muestra solo los días con casos y no los días no disponibles de Mi Espacio", () => {
    localStorage.setItem(
      "userOperatorAvailability",
      JSON.stringify({
        holidays: [{ date: "2026-09-20" }],
        absences: [{ start: "2026-09-07", end: "2026-09-08" }],
        vacations: [{ start: "2026-09-21", end: "2026-09-25" }],
        customDaysOff: [],
      })
    );
    // Una fecha ISO y una legada en DD/MM/YYYY (ambas = día 15 y 3 del mes).
    renderBar([
      { id: "1", fecha: "2026-09-15" },
      { id: "2", fecha: "03/09/2026" },
    ]);

    fireEvent.change(screen.getByLabelText("Filtrar por mes"), {
      target: { value: "2026-09" },
    });

    expect(screen.getByTitle("Día 3")).toBeTruthy();
    expect(screen.getByTitle("Día 15")).toBeTruthy();
    // Días no disponibles de Mi Espacio: NO deben renderizarse (regresión).
    expect(screen.queryByTitle("Día 7")).toBeNull();
    expect(screen.queryByTitle("Día 8")).toBeNull();
    expect(screen.queryByTitle("Día 20")).toBeNull();
    expect(screen.queryByTitle("Día 21")).toBeNull();
  });

  it("muestra 'Sin casos en el mes' cuando el mes seleccionado no tiene casos", () => {
    renderBar([{ id: "1", fecha: "2026-10-05" }]);

    fireEvent.change(screen.getByLabelText("Filtrar por mes"), {
      target: { value: "2026-09" },
    });

    expect(screen.getByText("Sin casos en el mes")).toBeTruthy();
  });
});
