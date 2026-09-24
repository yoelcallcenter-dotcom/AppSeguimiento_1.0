import { describe, it, expect } from "vitest";
import { getProximaActividad, buildTodayTimeline, getDiasRestantesDelMes, getProximosEventos } from "./operatorMetrics";

describe("getProximaActividad", () => {
  const now = new Date("2026-09-07T09:00:00");

  it("devuelve null si no hay eventos", () => {
    expect(getProximaActividad([], now)).toBeNull();
  });

  it("ignora eventos cancelados o completados", () => {
    const events = [
      { id: 1, title: "Cancelado", startDate: "2026-09-07T10:00:00", status: "cancelled" },
      { id: 2, title: "Hecho", startDate: "2026-09-07T11:00:00", status: "completed" },
    ];
    expect(getProximaActividad(events, now)).toBeNull();
  });

  it("ignora eventos pasados y toma el próximo futuro de hoy", () => {
    const events = [
      { id: 1, title: "Pasado", startDate: "2026-09-07T08:00:00", status: "pending" },
      { id: 2, title: "Próximo", startDate: "2026-09-07T15:00:00", status: "pending" },
    ];
    const res = getProximaActividad(events, now);
    expect(res).not.toBeNull();
    expect(res.event.id).toBe(2);
    expect(res.timeLabel).toBe("15:00");
    expect(res.dayLabel).toBe("Hoy");
  });

  it("prioriza la cita sobre el resto del día", () => {
    const events = [
      { id: 1, title: "Evento", startDate: "2026-09-07T14:00:00", eventType: "manual" },
      { id: 2, title: "Cita", startDate: "2026-09-07T15:00:00", eventType: "cita" },
    ];
    const res = getProximaActividad(events, now);
    expect(res.event.id).toBe(2);
  });

  it("marca como Mañana un evento del día siguiente", () => {
    const events = [
      { id: 1, title: "Mañana", startDate: "2026-09-08T10:00:00", status: "pending" },
    ];
    const res = getProximaActividad(events, now);
    expect(res.dayLabel).toBe("Mañana");
  });
});

describe("getDiasRestantesDelMes", () => {
  it("calcula los días restantes del mes sin contar el actual", () => {
    expect(getDiasRestantesDelMes(new Date("2026-09-15T10:00:00"))).toBe(15);
    expect(getDiasRestantesDelMes(new Date("2026-09-30T10:00:00"))).toBe(0);
  });

  it("resuelve correctamente en un mes de 31 días", () => {
    expect(getDiasRestantesDelMes(new Date("2026-01-01T00:00:00"))).toBe(30);
  });

  it("devuelve 0 ante fechas inválidas", () => {
    expect(getDiasRestantesDelMes(new Date("invalida"))).toBe(0);
  });
});

describe("getProximosEventos", () => {
  const now = new Date("2026-09-07T09:00:00");

  it("devuelve vacío sin eventos", () => {
    expect(getProximosEventos([], now)).toEqual([]);
  });

  it("excluye cancelados, completados y pasados", () => {
    const events = [
      { id: 1, title: "Cancelado", startDate: "2026-09-07T10:00:00", status: "cancelled" },
      { id: 2, title: "Pasado", startDate: "2026-09-07T08:00:00", status: "pending" },
      { id: 3, title: "Hecho", startDate: "2026-09-08T10:00:00", status: "completed" },
    ];
    expect(getProximosEventos(events, now)).toEqual([]);
  });

  it("ordena cronológicamente y respeta el límite", () => {
    const events = [
      { id: 1, title: "Segundo", startDate: "2026-09-07T16:00:00" },
      { id: 2, title: "Primero", startDate: "2026-09-07T10:00:00" },
      { id: 3, title: "Tercero", startDate: "2026-09-08T09:00:00" },
    ];
    const res = getProximosEventos(events, now, 2);
    expect(res.map((r) => r.event.id)).toEqual([2, 1]);
  });

  it("etiqueta Hoy/Mañana según la diferencia de días", () => {
    const events = [
      { id: 1, title: "Hoy", startDate: "2026-09-07T15:00:00" },
      { id: 2, title: "Mañana", startDate: "2026-09-08T10:00:00" },
    ];
    const res = getProximosEventos(events, now);
    expect(res[0].dayLabel).toBe("Hoy");
    expect(res[0].timeLabel).toBe("15:00");
    expect(res[1].dayLabel).toBe("Mañana");
  });
});

describe("buildTodayTimeline", () => {
  const todayISO = "2026-09-07";

  const cases = [
    { id: 1, nombre: "Ana", estado: "Activo", createdAt: "2026-09-07T09:00:00", lastActivityAt: "2026-09-07T09:30:00", reporteHistory: [] },
    { id: 2, nombre: "Leo", estado: "Firmo", createdAt: "2026-08-01T09:00:00", lastActivityAt: "2026-08-01T09:00:00", reporteHistory: [] },
    { id: 3, nombre: "Max", estado: "Pendiente", createdAt: "2026-09-06T10:00:00", lastActivityAt: "2026-09-06T10:00:00", reporteHistory: [{ fecha: "2026-09-07" }] },
  ];

  const events = [
    { id: 1, title: "Cita Ana", startDate: "2026-09-07T11:00:00", eventType: "cita", relatedCaseIds: [1] },
    { id: 2, title: "Repro Leo", startDate: "2026-09-07T16:00:00", eventType: "reprogramacion" },
  ];

  const notes = [
    { id: 1, title: "Nota hoy", createdAt: "2026-09-07T12:00:00", updatedAt: "2026-09-07T12:00:00" },
    { id: 2, title: "Nota vieja", createdAt: "2026-08-01T12:00:00", updatedAt: "2026-08-01T12:00:00" },
  ];

  it("devuelve vacío sin todayISO", () => {
    expect(buildTodayTimeline([], [], [], "")).toEqual([]);
  });

  it("incluye eventos, casos del día, reportes y notas del día", () => {
    const items = buildTodayTimeline(cases, events, notes, todayISO);
    const types = items.map((i) => i.type);
    expect(types).toContain("cita");
    expect(types).toContain("reprogramacion");
    expect(types).toContain("caso");
    expect(types).toContain("reporte");
    expect(types).toContain("nota");
    // Leo no tiene actividad hoy -> no debería aparecer como "caso"
    expect(types.filter((t) => t === "caso").length).toBe(1);
  });

  it("excluye notas fuera de hoy", () => {
    const items = buildTodayTimeline([], [], notes, todayISO);
    expect(items.some((i) => i.type === "nota" && i.title === "Nota vieja")).toBe(false);
  });

  it("ordena cronológicamente por hora", () => {
    const items = buildTodayTimeline(cases, events, notes, todayISO);
    const times = items.map((i) => i.time).filter((t) => t);
    const minutes = times.map((t) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    });
    const sorted = [...minutes].sort((a, b) => a - b);
    expect(minutes).toEqual(sorted);
  });
});
