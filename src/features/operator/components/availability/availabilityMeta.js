import { Sun, Flag, Stethoscope, CalendarOff } from "lucide-react";
import { formatearFechaLarga } from "../../operatorFormat";
import { ABSENCE_TYPES } from "../../operatorDefaults";

export const TAB_META = {
  vacaciones: { label: "Vacaciones", icon: Sun, empty: "Sin períodos de vacaciones cargados." },
  feriados: { label: "Feriados", icon: Flag, empty: "Sin feriados cargados." },
  inasistencias: { label: "Inasistencias", icon: Stethoscope, empty: "Sin inasistencias cargadas." },
  dias: { label: "Días no laborables", icon: CalendarOff, empty: "Sin días no laborables cargados." },
};

export const TAB_COLOR = {
  vacaciones: "var(--color-accent)",
  feriados: "var(--color-warning)",
  inasistencias: "var(--color-danger)",
  dias: "var(--color-text-muted)",
};

export function tabColor(tab) {
  return TAB_COLOR[tab] || "var(--color-text-muted)";
}

export function itemTitle(tab, item) {
  if (tab === "vacaciones") return "Vacaciones";
  if (tab === "feriados") return item.name || "Feriado";
  if (tab === "inasistencias") return ABSENCE_TYPES.find((t) => t.value === item.type)?.label || "Otro";
  return "Día no laborable";
}

export function itemSubtitle(tab, item) {
  return tab === "vacaciones"
    ? `${formatearFechaLarga(item.start)} — ${formatearFechaLarga(item.end)}`
    : formatearFechaLarga(item.date);
}

export function itemActive(tab, item, todayISO) {
  return item.end ? item.end >= todayISO : (item.date || "") >= todayISO;
}

export function itemStatusPill(tab) {
  if (tab === "vacaciones") return "FUERA";
  if (tab === "feriados") return "FERIADO";
  if (tab === "inasistencias") return "AUSENTE";
  return "NO LAB.";
}

export function listForTab(availability, tab) {
  return {
    vacaciones: availability.vacations || [],
    feriados: availability.holidays || [],
    inasistencias: availability.absences || [],
    dias: availability.customDaysOff || [],
  }[tab];
}