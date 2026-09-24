import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { TodayCenter } from "./TodayCenter";
import {
  DEFAULT_PROFILE,
  DEFAULT_AVAILABILITY,
  DEFAULT_GOALS,
  DEFAULT_CREDENTIALS,
  DEFAULT_OPERATOR_SETTINGS,
} from "./operatorDefaults";

const NOW = new Date("2026-09-15T10:00:00");
const TODAY = "2026-09-15";

function baseProps(overrides = {}) {
  return {
    profile: DEFAULT_PROFILE,
    availability: DEFAULT_AVAILABILITY,
    goals: DEFAULT_GOALS,
    cases: [],
    notes: [],
    events: [],
    dayState: { key: "in-workday", label: "En jornada" },
    daily: {
      cases: { enabled: true, current: 0, target: 5, met: false },
      reports: { enabled: true, current: 0, target: 5, met: false },
      firmas: { enabled: false, current: 0, target: 1, met: false },
    },
    pace: {},
    todayISO: TODAY,
    now: NOW,
    settings: DEFAULT_OPERATOR_SETTINGS,
    greeting: { text: "¡Buenos días!" },
    encouragement: null,
    metaDiariaCumplida: false,
    credentials: DEFAULT_CREDENTIALS,
    onChangeView: vi.fn(),
    onVerCaso: vi.fn(),
    onNavigateToEvent: vi.fn(),
    onNavigateMetas: vi.fn(),
    onNavigateAccesos: vi.fn(),
    onNuevoCaso: vi.fn(),
    onNuevoReporte: vi.fn(),
    onNuevaNota: vi.fn(),
    onNuevoEvento: vi.fn(),
    onBuscar: vi.fn(),
    onExportar: vi.fn(),
    ...overrides,
  };
}

describe("TodayCenter (centro de trabajo Hoy)", () => {
  afterEach(cleanup);

  it("muestra solo los bloques con contenido cuando no hay casos", () => {
    render(<TodayCenter {...baseProps()} />);

    expect(screen.getByText("¡Buenos días!")).toBeTruthy();
    expect(screen.getAllByText(/días restantes del mes/).length).toBeGreaterThan(0);
    expect(screen.getByText("Mi Jornada")).toBeTruthy();
    expect(screen.getByText("Metas")).toBeTruthy();
    expect(screen.getByText("Acciones rápidas")).toBeTruthy();
    expect(screen.getByText(/Accesos personales \(0\)/)).toBeTruthy();

    expect(screen.queryByText(/^Pendientes/)).toBeNull();
    expect(screen.queryByText("Productividad")).toBeNull();
  });

  it("muestra Pendientes y Productividad cuando hay casos del día", () => {
    const caso = {
      id: 1,
      nombre: "Juan Perez",
      estado: "En gestión",
      updatedAt: "2026-09-15T09:30:00",
    };
    const evento = {
      id: 7,
      title: "Llamada seguimiento",
      startDate: "2026-09-15T15:00:00",
      status: "pending",
      eventType: "manual",
    };
    render(
      <TodayCenter {...baseProps({ cases: [caso], events: [evento] })} />
    );

    expect(screen.getByText("Productividad")).toBeTruthy();
    expect(screen.getByText(/^Pendientes/)).toBeTruthy();
    expect(screen.getAllByText(/Llamada seguimiento/).length).toBeGreaterThan(0);
  });

  it("respeta el orden configurado en miEspacioOrder", () => {
    const settings = {
      ...DEFAULT_OPERATOR_SETTINGS,
      miEspacioOrder: ["accesos", "hoy"],
    };
    render(<TodayCenter {...baseProps({ settings })} />);

    const accesos = screen.getByText(/Accesos personales \(0\)/);
    const saludo = screen.getByText("¡Buenos días!");
    expect(accesos.compareDocumentPosition(saludo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});