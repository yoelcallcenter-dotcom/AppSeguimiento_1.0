import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ProductivityWidget } from "./ProductivityWidget";
import { setDailyTarget } from "./productivityStore";

/**
 * 1.9.6 (fix metas unificadas): el widget vive dentro de Dashboard (que está
 * envuelto en React.memo) y cachetaba getGoalsState con deps [dayISO]; con el
 * evento `storage` inútil en la misma pestaña, cambiar la meta en
 * Configuración no se reflejaba. Ahora se suscribe a subscribeOperatorGoals.
 */
beforeEach(() => localStorage.clear());

describe("ProductivityWidget (metas unificadas)", () => {
  it("refresca la meta diaria al cambiarla en la misma pestaña", () => {
    render(<ProductivityWidget />);

    expect(screen.getByText(/0 \/ 5 casos cargados/)).toBeTruthy();
    expect(screen.getByText(/Meta de reportes diaria, idéntica a Mi Espacio/)).toBeTruthy();

    act(() => {
      setDailyTarget(9);
    });

    expect(screen.getByText(/0 \/ 9 casos cargados/)).toBeTruthy();
  });
});
