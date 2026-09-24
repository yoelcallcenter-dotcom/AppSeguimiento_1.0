import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PdfExportModal } from "./PdfExportModal";

vi.mock("./useOperatorState", () => ({
  useOperatorState: vi.fn(() => ({
    profile: { displayName: "Test", company: "ART Test", zone: "Sur", workingDays: [1,2,3,4,5] },
    availability: {},
    goals: {},
    settings: {},
    credentials: [],
  })),
}));

vi.mock("./operatorMetrics", () => ({
  getDayState: vi.fn(() => ({ key: "in-workday", label: "En jornada" })),
  getDailyGoalProgress: vi.fn(() => ({
    cases: { enabled: true, current: 3, target: 5, met: false },
    reports: { enabled: true, current: 2, target: 3, met: false },
    firmas: { enabled: true, current: 1, target: 2, met: false },
  })),
  getMonthlyGoalProgress: vi.fn(() => ({
    cases: { current: 40, target: 100 },
    reports: { current: 25, target: 60 },
    signed: { current: 10, target: 14 },
  })),
  getRequiredDailyPace: vi.fn(() => ({ cases: 2.5, reports: 1.0, remainingDays: 10 })),
  getEffectiveWorkDays: vi.fn(() => ({ effective: 18, scheduled: 22, vacations: 2, holidays: 1, absences: 1, dayOffs: 0 })),
  getPerEffectiveDayMetrics: vi.fn(() => ({ casesPerDay: 2.0, reportsPerDay: 1.5 })),
  getAvailabilitySummary: vi.fn(() => ({ vacationDays: 2, holidayDays: 1, absenceDays: 1, dayOffDays: 0, totalDays: 4 })),
  getWeeklyGoalProgress: vi.fn(() => ({
    start: "2026-09-14",
    end: "2026-09-18",
    goals: [
      { key: "cases", label: "Casos", enabled: true, current: 14, target: 20, percent: 70, remaining: 6, met: false, status: "in-progress" },
      { key: "reports", label: "Reportes", enabled: true, current: 9, target: 10, percent: 90, remaining: 1, met: false, status: "near-completion" },
      { key: "signed", label: "Firmas", enabled: true, current: 5, target: 5, percent: 100, remaining: 0, met: true, status: "exceeded" },
    ],
  })),
  getDayPaceMetrics: vi.fn(() => ({
    casesToday: 4, reportsToday: 3, casesPerHour: 2.5, projectedCases: 12, avgCasesPerDay: 3.5, paceMessage: "En línea con tu promedio",
  })),
  getProximosEventos: vi.fn(() => [
    { event: { title: "Cita Juan Perez" }, timeLabel: "10:00", dayLabel: "Hoy" },
    { event: { title: "Reprogramación" }, timeLabel: "14:30", dayLabel: "Mañana" },
  ]),
}));

vi.mock("./operatorDefaults", () => ({
  DAY_STATES: { IN_WORKDAY: "in-workday", GOAL_MET: "goal-met" },
  DAY_LABELS: ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
}));

vi.mock("./operatorMessages", () => ({
  getDailyGreeting: vi.fn(() => "Hola Test"),
}));

vi.mock("../../components/common/Btn", () => ({
  Btn: ({ children, onClick, disabled, loading, icon: Icon, size, color, textColor, ...props }) => (
    <button onClick={onClick} disabled={disabled || loading} {...props}>
      {Icon && !loading && <Icon size={14} />}
      <span>{loading ? "Cargando..." : children}</span>
    </button>
  ),
  OutlineButton: ({ children, onClick, size, ...props }) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

describe("PdfExportModal", () => {
  const mockOnClose = vi.fn();
  const mockShowToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("no renderiza cuando open es false", () => {
    const { container } = render(
      <PdfExportModal open={false} onClose={mockOnClose} config={{}} casos={[]} showToast={mockShowToast} />
    );
    expect(container.textContent).not.toContain("Exportar Mi Espacio a PDF");
  });

  it("renderiza el modal cuando open es true", () => {
    render(
      <PdfExportModal open={true} onClose={mockOnClose} config={{}} casos={[]} showToast={mockShowToast} />
    );
    expect(screen.getByText("Exportar Mi Espacio a PDF")).toBeTruthy();
  });

  it("muestra las 10 secciones disponibles", () => {
    render(
      <PdfExportModal open={true} onClose={mockOnClose} config={{}} casos={[]} showToast={mockShowToast} />
    );
    expect(screen.getByText("Perfil del operador")).toBeTruthy();
    expect(screen.getByText("Jornada y objetivos diarios")).toBeTruthy();
    expect(screen.getByText("Métricas y ritmo")).toBeTruthy();
    expect(screen.getByText("Objetivos semanales")).toBeTruthy();
    expect(screen.getByText("Resumen del período")).toBeTruthy();
    expect(screen.getByText("Disponibilidad del mes")).toBeTruthy();
    expect(screen.getByText("Metas semanales")).toBeTruthy();
    expect(screen.getByText("Próximos eventos")).toBeTruthy();
    expect(screen.getByText("Estadísticas por día efectivo")).toBeTruthy();
    expect(screen.getByText("Configuración y jornada")).toBeTruthy();
  });

  it("deselecciona todo al hacer click en Deseleccionar todo", () => {
    render(
      <PdfExportModal open={true} onClose={mockOnClose} config={{}} casos={[]} showToast={mockShowToast} />
    );
    fireEvent.click(screen.getByText("Deseleccionar todo"));
    expect(screen.getByText("Seleccionar todo")).toBeTruthy();
  });

  it("selecciona todo al hacer click en Seleccionar todo", () => {
    render(
      <PdfExportModal open={true} onClose={mockOnClose} config={{}} casos={[]} showToast={mockShowToast} />
    );
    fireEvent.click(screen.getByText("Deseleccionar todo"));
    fireEvent.click(screen.getByText("Seleccionar todo"));
    expect(screen.getByText("Deseleccionar todo")).toBeTruthy();
  });

  it("cierra el modal al hacer click en Cancelar", () => {
    render(
      <PdfExportModal open={true} onClose={mockOnClose} config={{}} casos={[]} showToast={mockShowToast} />
    );
    fireEvent.click(screen.getByText("Cancelar"));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("deshabilita Generar PDF cuando nada seleccionado", () => {
    render(
      <PdfExportModal open={true} onClose={mockOnClose} config={{}} casos={[]} showToast={mockShowToast} />
    );
    fireEvent.click(screen.getByText("Deseleccionar todo"));
    const btn = screen.getByText("Generar PDF").closest("button");
    expect(btn.disabled).toBe(true);
  });

  it("cierra el modal al hacer click en el backdrop", () => {
    render(
      <PdfExportModal open={true} onClose={mockOnClose} config={{}} casos={[]} showToast={mockShowToast} />
    );
    fireEvent.click(screen.getByRole("dialog"));
    expect(mockOnClose).toHaveBeenCalled();
  });
});
