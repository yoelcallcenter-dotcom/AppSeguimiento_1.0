/**
 * LogroObjetivos.test.jsx  (1.9.7 · fix B2 → 1.10.1 · fix M25)
 *
 * 1.9.7 (B2): el filtro de mes partía c.fecha a mano con split("-"): una fecha
 * legada DD/MM/YYYY daba year=NaN y el caso se excluía del mes → la meta
 * mensual del Dashboard se sub-contaba. Usa normalizeDate.
 *
 * 1.10.1 (M25/M26): las firmas del período ya NO se cuentan como
 * max(0, Firmo − Baja) sobre la fecha de CREACIÓN; ahora son casos con fecha
 * de firma (fechaFirma → fallback último reporte si estado Firmo) dentro del
 * período, consistentes con las metas de Mi Espacio (countSignedInMonth) y con
 * MetaFirmasWidget. Se mantiene un caso legado DD/MM/YYYY para seguir cubriendo
 * el fix B2 (normalizeDate sobre fechaFirma legada).
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
  // Legado DD/MM/YYYY con fechaFirma legada → B2 (normalizeDate) + M25.
  { id: 1, nombre: "A", estado: "Firmo", fecha: "15/09/2026", fechaFirma: "15/09/2026" },
  // ISO firmado en septiembre SIN fechaFirma → fallback último reporte (M25).
  { id: 2, nombre: "B", estado: "Firmo", fecha: "2026-09-20", reporteHistory: [{ fecha: "2026-09-20" }] },
  // Creado en agosto pero FIRMADO en septiembre → cuenta (M26: fechaFirma manda).
  { id: 3, nombre: "C", estado: "Firmo", fecha: "2026-08-10", fechaFirma: "2026-09-05" },
  // Baja de septiembre: ya NO resta firmas ajenas (M25 elimina Firmo − Baja).
  { id: 4, nombre: "D", estado: "Baja", fecha: "2026-09-21" },
  // Firmo con fechaFirma de AGOSTO → no cuenta en septiembre.
  { id: 5, nombre: "E", estado: "Firmo", fecha: "2026-09-11", fechaFirma: "2026-08-30" },
];

describe("LogroObjetivos · firma en el período con fecha legada (1.9.7 fix B2 + 1.10.1 fix M25)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("cuenta las firmas del mes por fecha de firma, sin restar Bajas", () => {
    render(<LogroObjetivos casos={CASOS} onVerCaso={() => {}} />);
    // Firmas de septiembre por fechaFirma: id1 (15/09 legado), id2 (fallback
    // último reporte 20/09) e id3 (creado en agosto, firmado 05/09) = 3.
    // La Baja (id4) no resta y la firma de agosto (id5) queda fuera.
    // Con la fórmula vieja (Firmo−Baja por creación): 3 − 1 = 2 y id3 perdido.
    expect(
      screen.getByText(new RegExp(`^3 / ${META}$`))
    ).toBeTruthy();
  });

  it("excluye los casos cuya fecha de firma cae en otro mes", () => {
    const soloAgosto = [
      { id: 9, nombre: "X", estado: "Firmo", fecha: "2026-08-10", fechaFirma: "2026-08-10" },
    ];
    render(<LogroObjetivos casos={soloAgosto} onVerCaso={() => {}} />);
    // 0 firmas en septiembre (la firma de agosto no cuenta).
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
