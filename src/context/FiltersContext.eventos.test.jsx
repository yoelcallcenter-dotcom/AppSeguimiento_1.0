import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import {
  FiltersProvider,
  useFilters,
  FILTRO_GLOBAL_DEFAULT,
} from "./FiltersContext";

function Probe() {
  const { filtroGlobal, quickFilter, setFiltroGlobal, setQuickFilter } =
    useFilters();
  return (
    <div>
      <span data-testid="fg">{JSON.stringify(filtroGlobal.estado)}</span>
      <span data-testid="qf">{quickFilter ? JSON.stringify(quickFilter.valor) : "null"}</span>
      <button
        onClick={() => {
          setFiltroGlobal({
            ...FILTRO_GLOBAL_DEFAULT,
            estado: ["Firmo", "Baja"],
          });
          setQuickFilter({ tipo: "estado", valor: "Firmo" });
        }}
      >
        sembrar
      </button>
    </div>
  );
}

// C03 (1.10.1): al renombrar/eliminar estados en Configuración se despachan
// eventos de ventana; el contexto los debe aplicar a su estado EN VIVO (si no,
// el effect de guardado re-pisaría localStorage con el nombre viejo).
describe("FiltersContext · migración de estados por eventos (C03, 1.10.1)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("app:estado-renombrado actualiza filtro global y rápido, y se persiste", async () => {
    render(
      <FiltersProvider>
        <Probe />
      </FiltersProvider>
    );
    fireEvent.click(screen.getByText("sembrar"));

    expect(screen.getByTestId("fg").textContent).toBe('["Firmo","Baja"]');
    expect(screen.getByTestId("qf").textContent).toBe('"Firmo"');

    act(() => {
      window.dispatchEvent(
        new CustomEvent("app:estado-renombrado", {
          detail: { prev: "Firmo", next: "Firmado" },
        })
      );
    });

    expect(screen.getByTestId("fg").textContent).toBe('["Firmado","Baja"]');
    expect(screen.getByTestId("qf").textContent).toBe('"Firmado"');

    // El effect de guardado corre con el estado ya migrado (no el viejo).
    await act(async () => {});
    const guardado = JSON.parse(localStorage.getItem("app-filters"));
    expect(guardado.filtroGlobal.estado).toEqual(["Firmado", "Baja"]);
    expect(guardado.quickFilter.valor).toBe("Firmado");
  });

  it("app:estado-eliminado saca el nombre del filtro y limpia el rápido", () => {
    render(
      <FiltersProvider>
        <Probe />
      </FiltersProvider>
    );
    fireEvent.click(screen.getByText("sembrar"));

    act(() => {
      window.dispatchEvent(
        new CustomEvent("app:estado-eliminado", { detail: { nombre: "Baja" } })
      );
    });

    expect(screen.getByTestId("fg").textContent).toBe('["Firmo"]');
    // El rápido apuntaba a "Firmo" (distinto del borrado) → queda intacto.
    expect(screen.getByTestId("qf").textContent).toBe('"Firmo"');

    act(() => {
      window.dispatchEvent(
        new CustomEvent("app:estado-eliminado", { detail: { nombre: "Firmo" } })
      );
    });
    expect(screen.getByTestId("fg").textContent).toBe("[]");
    expect(screen.getByTestId("qf").textContent).toBe("null");
  });

  it("los eventos sin detalle o repetidos no rompen el estado", () => {
    render(
      <FiltersProvider>
        <Probe />
      </FiltersProvider>
    );
    act(() => {
      window.dispatchEvent(new CustomEvent("app:estado-renombrado"));
      window.dispatchEvent(
        new CustomEvent("app:estado-renombrado", {
          detail: { prev: "Nada", next: "Nada" },
        })
      );
      window.dispatchEvent(new CustomEvent("app:estado-eliminado"));
    });
    expect(screen.getByTestId("fg").textContent).toBe("[]");
  });
});
