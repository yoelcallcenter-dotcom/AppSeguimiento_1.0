import React from "react";
import { CalendarClock, CalendarPlus } from "lucide-react";
import { BtnOutline } from "../../../../components/common/BtnOutline";
import { TAB_META } from "./availabilityMeta";
import { formatearFechaLarga } from "../../operatorFormat";
import { ABSENCE_TYPES } from "../../operatorDefaults";
// v1.9.7 (fix B3): día en hora local, no en UTC (ver OperatorView).
import { hoyISO } from "../../../../utils/dateUtils";

export function buildUpcoming(availability, limit = 4) {
  const todayISO = hoyISO();
  return [
    ...(availability.vacations || []).map((v) => ({ tab: "vacaciones", date: v.start, end: v.end, label: `Vacaciones hasta el ${formatearFechaLarga(v.end)}`, item: v })),
    ...(availability.holidays || []).map((h) => ({ tab: "feriados", date: h.date, label: h.name || "Feriado", item: h })),
    ...(availability.absences || []).map((a) => ({ tab: "inasistencias", date: a.date, label: ABSENCE_TYPES.find((t) => t.value === a.type)?.label || "Ausencia", item: a })),
    ...(availability.customDaysOff || []).map((d) => ({ tab: "dias", date: d.date, label: d.note || "Día no laborable", item: d })),
  ]
    .filter((e) => e.date && e.date >= todayISO)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit);
}

export function AvailabilityStatus({ upcoming, onTabChange, startNew }) {
  if (upcoming.length > 0) {
    return (
      <div
        className="p-3 rounded-md"
        style={{ backgroundColor: "var(--color-surface2)", border: "1px solid var(--color-accent)44" }}
      >
        <div className="flex items-center gap-1.5 text-xs font-semibold mb-2" style={{ color: "var(--color-accent)" }}>
          <CalendarClock size={13} /> Tu estado próximo
        </div>
        <div className="space-y-1.5">
          {upcoming.map((e, i) => {
            const Meta = TAB_META[e.tab];
            const Icon = Meta.icon;
            return (
              <button
                key={`${e.tab}-${e.item.id}-${i}`}
                onClick={() => onTabChange(e.tab)}
                className="w-full flex items-center gap-2 p-1.5 rounded text-left transition-colors hover:bg-white/5"
                title={`Ir a ${Meta.label.toLowerCase()}`}
              >
                <Icon size={12} className="flex-shrink-0" style={{ color: "var(--color-text-muted)" }} />
                <span className="text-[11px] font-semibold truncate" style={{ color: "var(--color-text)" }}>{e.label}</span>
                <span className="ml-auto text-[10px] whitespace-nowrap" style={{ color: "var(--color-text-muted)" }}>
                  desde {formatearFechaLarga(e.date)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      className="p-4 rounded-md text-center"
      style={{ backgroundColor: "var(--color-surface2)", border: "1px dashed var(--color-border)" }}
    >
      <div className="text-sm font-semibold mb-1" style={{ color: "var(--color-text)" }}>
        Disponibilidad al día
      </div>
      <div className="text-[11px] mb-2" style={{ color: "var(--color-text-muted)" }}>
        No hay vacaciones, feriados, ausencias ni días libres a futuro.
      </div>
      <BtnOutline size="sm" onClick={startNew}>
        <CalendarPlus size={14} /> Registrar primera entrada
      </BtnOutline>
    </div>
  );
}

export default AvailabilityStatus;