/**
 * LogroObjetivos.test.jsx  (1.9.7 · fix B2)
 * El filtro de mes partía c.fecha a mano con split("-"): una fecha legada
 * DD/MM/YYYY daba year=NaN y el caso se excluía del mes → la meta mensual del
 * Dashboard se sub-contaba. Ahora usa normalizeDate.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { LogroObjetivos } from "./LogroObjetivos";
import { DEFAULT_GOALS } from "../../features/operator/operatorDefaults";

// selectedMonth es 0-based: 8 = Septiembre; el componente suma +1 al comparar.
vi.mock("../../context/FiltersContext", () => ({
  useFilters: () => ({ selectedMonth: 8, selectedYear: 2026 }),
}));

const META = DEFAULT_GOALS.monthly.signed.target;

const CASOS = [
  // Legado DD/MM/YYYY de septiembre → ANTES se excluía (fix B2).
  { id: 1, nombre: "A", estado: "Firmo", fecha: "15/09/2026" },
  // ISO de septiembre → siempre contó.
  { id: 2, nombre: "B", estado: "Firmo", fecha: "2026-09-20" },
  // Otro mes → no debe contar.
  { id: 3, nombre: "C", estado: "Firmo", fecha: "2026-08-10" },
  // Baja de septiembre resta de los firmados.
  { id: 4, nombre: "D", estado: "Baja", fecha: "2026-09-21" },
];

describe("LogroObjetivos · filtro de mes con fecha legada (1.9.7 fix B2)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("incluye los casos DD/MM/YYYY del mes en el conteo de firmados", () => {
    render(<LogroObjetivos casos={CASOS} onVerCaso={() => {}} />);
    // 2 Firmo de septiembre (legado + ISO) − 1 Baja = 1 firmado.
    // Sin fix: el legado se excluye → 1 − 1 = 0.
    expect(
      screen.getByText(new RegExp(`^1 / ${META}$`))
    ).toBeTruthy();
  });

  it("excluye los casos de otros meses", () => {
    const soloAgosto = [
      { id: 9, nombre: "X", estado: "Firmo", fecha: "2026-08-10" },
    ];
    render(<LogroObjetivos casos={soloAgosto} onVerCaso={() => {}} />);
    // 0 firmados en septiembre (agosto no cuenta).
    expect(
      screen.getByText(new RegExp(`^0 / ${META}$`))
    ).toBeTruthy();
  });

  it("muestra el estado vacío sin casos", () => {
    render(<LogroObjetivos casos={[]} onVerCaso={() => {}} />);
    expect(
      screen.getByText(/No hay casos cargados/)
    ).toBeTruthy();
  });
});
