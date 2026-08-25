/**
 * operatorDefaults.js
 * Valores por defecto del módulo "Mi Espacio" (v1.2.0).
 * Todo el estado del operador usa estos defaults como base segura.
 */

export const OPERATOR_STORAGE_KEYS = {
  PROFILE: "userOperatorProfile",
  AVAILABILITY: "userOperatorAvailability",
  GOALS: "userOperatorGoals",
  CREDENTIALS: "userOperatorCredentials",
  SETTINGS: "userOperatorSettings",
};

export const DEFAULT_PROFILE = {
  fullName: "",
  displayName: "",
  initials: "",
  workSchedule: { start: "09:00", end: "17:00" },
  workingDays: [1, 2, 3, 4, 5],
};

export const DEFAULT_AVAILABILITY = {
  vacations: [],
  holidays: [],
  absences: [],
  customDaysOff: [],
};

export const DEFAULT_GOALS = {
  daily: {
    cases: { enabled: true, target: 5 },
    reports: { enabled: true, target: 5 },
  },
  monthly: {
    cases: { enabled: false, target: 300 },
    reports: { enabled: false, target: 100 },
    signed: { enabled: true, target: 14 },
  },
  custom: [],
};

export const DEFAULT_CREDENTIALS = {
  entries: [],
};

export const DEFAULT_OPERATOR_SETTINGS = {
  enabled: true,
  showDaySummary: true,
  dailyGoalsEnabled: true,
  monthlyGoalsEnabled: true,
  showPace: true,
  jornadaReminders: true,
  goalReminders: true,
  showAvailabilityInCalendar: true,
  goalMicroInteractions: true,
  personalSuggestions: true,
};

export const ABSENCE_TYPES = [
  { value: "enfermedad", label: "Enfermedad" },
  { value: "tramite", label: "Trámite" },
  { value: "personal", label: "Personal" },
  { value: "otro", label: "Otro" },
];

export const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export const DAY_STATES = {
  NOT_STARTED: "not-started",
  IN_WORKDAY: "in-workday",
  GOAL_MET: "goal-met",
  ENDED: "ended",
  VACATION: "vacation",
  HOLIDAY: "holiday",
  ABSENCE: "absence",
  DAY_OFF: "day-off",
};