import { describe, it, expect } from "vitest";
import { getPendientesDelDia } from "./attentionRules";

const TODAY = "2026-09-07";

function caso(overrides = {}) {
  return {
    id: "c1",
    nombre: "Ana López",
    telefono: "1155550001",
    fecha: "2026-09-07",
    estudioJuridico: "Estudio A",
    estado: "Activo",
    ...overrides,
  };
}

function evento(overrides = {}) {
  return {
    id: "e1",
    title: "Evento",
    startDate: "2026-09-07T10:00:00",
    eventType: "manual",
    status: "pending",
    ...overrides,
  };
}

describe("getPendientesDelDia", () => {
  it("devuelve [] si no se pasa todayISO", () => {
    expect(getPendientesDelDia({ cases: [caso()] })).toEqual([]);
  });

  it("genera pendiente de prioridad alta por falta de información", () => {
    const pend = getPendientesDelDia({
      cases: [{ ...caso(), telefono: "", nombre: "" }],
      todayISO: TODAY,
    });
    const p = pend.find((x) => x.type === "sin_info");
    expect(p).toBeDefined();
    expect(p.priority).toBe("alta");
    expect(p.detail).toContain("teléfono");
  });

  it("genera pendiente de reporte para caso activo sin reportes", () => {
    const pend = getPendientesDelDia({
      cases: [caso({ reporteHistory: [] })],
      todayISO: TODAY,
    });
    expect(pend.some((x) => x.type === "reporte_pendiente")).toBe(true);
  });

  it("NO genera pendiente de reporte para caso con reporte", () => {
    const pend = getPendientesDelDia({
      cases: [caso({ reporteHistory: [{ fecha: "2026-09-06", texto: "x" }] })],
      todayISO: TODAY,
    });
    expect(pend.some((x) => x.type === "reporte_pendiente")).toBe(false);
  });

  it("genera pendiente de actividad vencida para evento pasado sin completar", () => {
    const pend = getPendientesDelDia({
      cases: [caso()],
      events: [evento({ id: "e1", startDate: "2026-09-05T10:00:00", status: "pending" })],
      todayISO: TODAY,
    });
    expect(pend.some((x) => x.type === "actividad_vencida")).toBe(true);
  });

  it("genera pendiente de cita hoy de prioridad media", () => {
    const pend = getPendientesDelDia({
      cases: [caso({ reporteHistory: [{ fecha: "2026-09-06", texto: "x" }] })],
      events: [evento({ id: "e1", eventType: "cita", startDate: "2026-09-07T14:00:00" })],
      todayISO: TODAY,
    });
    const p = pend.find((x) => x.type === "cita_hoy");
    expect(p).toBeDefined();
    expect(p.priority).toBe("media");
  });

  it("genera pendiente de meta diaria pendiente de prioridad baja", () => {
    const pend = getPendientesDelDia({
      cases: [caso({ reporteHistory: [{ fecha: "2026-09-06", texto: "x" }] })],
      todayISO: TODAY,
      goals: { daily: { cases: { enabled: true, target: 5, current: 2 } } },
    });
    const p = pend.find((x) => x.type === "meta_diaria");
    expect(p).toBeDefined();
    expect(p.priority).toBe("baja");
    expect(p.detail).toContain("2/5");
  });

  it("NO genera meta diaria si el objetivo ya se cumplió", () => {
    const pend = getPendientesDelDia({
      cases: [caso({ reporteHistory: [{ fecha: "2026-09-06", texto: "x" }] })],
      todayISO: TODAY,
      goals: { daily: { cases: { enabled: true, target: 5, current: 5 } } },
    });
    expect(pend.some((x) => x.type === "meta_diaria")).toBe(false);
  });

  it("no excede el máximo de 8 pendientes", () => {
    const cases = Array.from({ length: 12 }, (_, i) =>
      caso({ id: `c${i}`, nombre: `Caso ${i}`, reporteHistory: [] })
    );
    const pend = getPendientesDelDia({ cases, todayISO: TODAY });
    expect(pend.length).toBeLessThanOrEqual(8);
  });
});
