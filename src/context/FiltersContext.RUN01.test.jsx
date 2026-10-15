import React, { useEffect } from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import {
  FiltersProvider,
  useFilters,
  FILTRO_GLOBAL_DEFAULT,
} from "./FiltersContext";

/**
 * RUN-01 (1.10.1): los atajos PWA (#dashboard, #kanban, …) se aplican en un
 * efecto HIJO de App que corre ANTES que el restore de filtros del padre
 * FiltersProvider (React ejecuta efectos de hijos primero). Sin el guard, la
 * vista persistida en app-filters pisaba la del hash en arranque frío y el
 * atajo no abría nada. Este test replica ese orden de montaje.
 */

const VIEWS = ["dashboard", "kanban", "tabla", "reportes", "mi-espacio", "utiles"];

// Replica el efecto de App que aplica la vista según el hash (efecto hijo).
function HijoAplicaHash() {
  const { setSelectedView } = useFilters();
  useEffect(() => {
    const hash = window.location.hash.replace(/^#\/?/, "").toLowerCase();
    if (VIEWS.includes(hash)) setSelectedView(hash);
  }, [setSelectedView]);
  return <span data-testid="ok" />;
}

function VistaActual() {
  const { selectedView } = useFilters();
  return <span data-testid="vista">{selectedView}</span>;
}

const guardarFiltros = (selectedView) => {
  window.localStorage.setItem(
    "app-filters",
    JSON.stringify({ selectedView, filtroGlobal: {}, quickFilter: null })
  );
};

describe("RUN-01: atajo por hash no lo pisa el restore de selectedView", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.location.hash = "";
  });

  it("con hash de atajo gana la vista del hash (el hijo setea y el padre no restaura)", () => {
    guardarFiltros("mi-espacio");
    window.location.hash = "#dashboard";
    render(
      <FiltersProvider>
        <HijoAplicaHash />
        <VistaActual />
      </FiltersProvider>
    );
    expect(screen.getByTestId("vista").textContent).toBe("dashboard");
  });

  it("sin hash se comporta como antes: restaura la vista persistida 'mi-espacio'", () => {
    guardarFiltros("mi-espacio");
    render(
      <FiltersProvider>
        <HijoAplicaHash />
        <VistaActual />
      </FiltersProvider>
    );
    expect(screen.getByTestId("vista").textContent).toBe("mi-espacio");
  });

  it("hash que no es una vista no afecta el restore", () => {
    guardarFiltros("mi-espacio");
    window.location.hash = "#no-es-vista";
    render(
      <FiltersProvider>
        <HijoAplicaHash />
        <VistaActual />
      </FiltersProvider>
    );
    expect(screen.getByTestId("vista").textContent).toBe("mi-espacio");
  });

  it("el guard solo afecta la vista: el resto del estado sigue operando", () => {
    guardarFiltros("mi-espacio");
    window.location.hash = "#kanban";
    let ctx;
    function Captura() {
      ctx = useFilters();
      return null;
    }
    render(
      <FiltersProvider>
        <HijoAplicaHash />
        <Captura />
      </FiltersProvider>
    );
    // El guard no toca nada más: la vista gana por hash y el resto del
    // contexto queda usable (setters presentes, filtro global normalizado).
    expect(ctx.selectedView).toBe("kanban");
    expect(typeof ctx.setSelectedMonth).toBe("function");
    expect(ctx.filtroGlobal).toEqual(FILTRO_GLOBAL_DEFAULT);
  });
});

describe("useFilters", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.location.hash = "";
  });

  it("fuera del provider lanza error claro", () => {
    // Este caso garantiza que el provider siga siendo obligatorio.
    expect(() => {
      render(<VistaActual />);
    }).toThrow(/useFilters must be used within a FiltersProvider/);
  });
});
