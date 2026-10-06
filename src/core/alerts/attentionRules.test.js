/**
 * attentionRules.test.js  (1.9.7 · fix B4)
 * getDayClosureData (cierre de jornada de Mi Espacio) comparaba createdAt y
 * reporteHistory.fecha con slice(0,10) crudo contra todayISO: una fecha legada
 * DD/MM/YYYY nunca coincidía y el cierre mostraba "0 casos / 0 firmas" con
 * datos migrados.
 */
import { describe, it, expect } from "vitest";
import { getDayClosureData } from "./attentionRules";

const HOY = "2026-09-15";

describe("getDayClosureData (1.9.7 fix B4)", () => {
  it("devuelve null sin casos o sin todayISO", () => {
    expect(getDayClosureData(null, [], [], null, HOY)).toBeNull();
    expect(getDayClosureData([], [], [], null, undefined)).toBeNull();
  });

  it("cuenta los casos activos de hoy con fecha legada DD/MM/YYYY", () => {
    const cases = [
      { id: "a", nombre: "A", estado: "Activo", createdAt: "15/09/2026", reporteHistory: [] },
      { id: "b", nombre: "B", estado: "Activo", createdAt: "2026-09-14", reporteHistory: [] },
    ];
    const res = getDayClosureData(cases, [], [], null, HOY);
    expect(res.casosTrabajados).toBe(1);
    expect(res.casosActivos.map((c) => c.id)).toEqual(["a"]);
    expect(res.fecha).toBe(HOY);
  });

  it("cuenta la última actividad con lastActivityAt en formato datetime ISO", () => {
    const cases = [
      { id: "a", nombre: "A", estado: "Activo", lastActivityAt: "2026-09-15T18:30:00", reporteHistory: [] },
    ];
    const res = getDayClosureData(cases, [], [], null, HOY);
    expect(res.casosTrabajados).toBe(1);
  });

  it("cuenta las firmas de hoy con reporte legado (DD/MM) y con datetime ISO", () => {
    const cases = [
      { id: "a", nombre: "A", estado: "Firmo", reporteHistory: [{ fecha: "15/09/2026" }] },
      { id: "b", nombre: "B", estado: "Firmo", reporteHistory: [{ fecha: "2026-09-15T14:30:00" }] },
      { id: "c", nombre: "C", estado: "Firmo", reporteHistory: [{ fecha: "2026-09-10" }] },
      { id: "d", nombre: "D", estado: "Firmo", reporteHistory: [] },
    ];
    const res = getDayClosureData(cases, [], [], { firmas: 2, casos: 1 }, HOY);
    expect(res.firmasRegistradas).toBe(2);
    expect(res.goalProgress.firmas.resultado).toBe(2);
    expect(res.goalProgress.firmas.objetivo).toBe(2);
    expect(res.goalProgress.firmas.completado).toBe(true);
  });

  it("no cuenta casos de otros días", () => {
    const cases = [
      { id: "x", nombre: "X", estado: "Activo", createdAt: "2026-09-01", reporteHistory: [{ fecha: "2026-09-01" }] },
    ];
    const res = getDayClosureData(cases, [], [], null, HOY);
    expect(res.casosTrabajados).toBe(0);
    expect(res.firmasRegistradas).toBe(0);
  });
});
