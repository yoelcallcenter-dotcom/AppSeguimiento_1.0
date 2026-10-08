import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FiltersProvider } from "../../context/FiltersContext";
import { MonthDayFilterBar } from "./MonthDayFilterBar";
import { hoyISO } from "../../utils/dateUtils";

/**
 * 1.9.6 (fix bug: días sin casos en el filtro por día).
 * DayFilter debe mostrar SOLO los días que tienen casos en el mes. Antes,
 * MonthDayFilterBar agregaba también los días no disponibles de Mi Espacio
 * (feriados/ausencias/vacaciones) y, al seleccionarlos, la lista quedaba vacía
 * porque no había casos en esa fecha.
 *
 * 1.10.0 (revisión): `meses` es parametrizable para poder testear el marcador
 * de HOY con el mes real del sistema (el default sigue siendo 2026-09).
 */
function renderBar(casos, meses = ["2026-09"]) {
  return render(
    <FiltersProvider>
      <MonthDayFilterBar
        mesesDisponibles={meses}
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

  // 1.10.0 (revisión): "Solo de hoy" dejó de ser un chip en el header y ahora
  // es el marcador del día de HOY en la tira de días (estilo propio: punto +
  // negrita, distinto al de los días seleccionados).
  it("marca el día de HOY con data-tour propio cuando el mes es el actual", () => {
    const [y, m, d] = hoyISO().split("-").map(Number);
    const mesActual = `${y}-${String(m).padStart(2, "0")}`;
    const { container } = renderBar([{ id: "1", fecha: hoyISO() }], [mesActual]);

    fireEvent.change(screen.getByLabelText("Filtrar por mes"), {
      target: { value: mesActual },
    });

    const hoy = container.querySelector('[data-tour="dia-hoy"]');
    expect(hoy).toBeTruthy();
    expect(hoy.title).toContain("hoy");
    expect(hoy.getAttribute("aria-label")).toBe(`Día ${d} (hoy)`);
    // El clic sigue siendo el toggle de día habitual (atajo de "Solo de hoy").
    expect(hoy.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(hoy);
    expect(hoy.getAttribute("aria-pressed")).toBe("true");
  });

  it("no marca HOY si el mes seleccionado no es el actual", () => {
    // Mes anterior al actual: seguro que no es el de hoy en ninguna fecha.
    const [y, m] = hoyISO().split("-").map(Number);
    const ant = m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 };
    const valor = `${ant.y}-${String(ant.m).padStart(2, "0")}`;
    const { container } = renderBar([{ id: "1", fecha: `${valor}-15` }], [valor]);

    fireEvent.change(screen.getByLabelText("Filtrar por mes"), {
      target: { value: valor },
    });

    expect(screen.getByTitle("Día 15")).toBeTruthy();
    expect(container.querySelector('[data-tour="dia-hoy"]')).toBeNull();
  });
});
