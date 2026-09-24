import React, { useMemo } from "react";
import { CalendarClock, Calendar, RefreshCcw, Clock } from "lucide-react";
import { getProximosEventos } from "../operatorMetrics";

export function ProximosEventos({ events, now, limit = 5, onNavigateToEvent }) {
  const items = useMemo(
    () => getProximosEventos(events || [], now || new Date(), limit),
    [events, now, limit]
  );

  if (items.length === 0) return null;

  return (
    <div
      className="rounded-lg px-4 py-3"
      style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <CalendarClock size={14} style={{ color: "var(--color-accent)" }} />
        <span className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
          Próximos eventos ({items.length})
        </span>
      </div>

      <div className="space-y-1">
        {items.map(({ event, dayLabel, timeLabel }) => {
          const isCita = event.eventType === "cita";
          const isRepro = event.eventType === "reprogramacion";
          const color = isCita
            ? "var(--color-accent)"
            : isRepro
              ? "var(--chart-color-warning)"
              : "var(--chart-color-orange)";
          const Icon = isCita || isRepro ? Calendar : Clock;

          return (
            <button
              key={event.id}
              type="button"
              onClick={() => onNavigateToEvent && onNavigateToEvent(event)}
              className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded text-xs hover:opacity-70 transition-opacity"
              style={{ backgroundColor: "var(--color-surface2)" }}
            >
              <span
                className="flex items-center justify-center rounded-full flex-shrink-0"
                style={{ backgroundColor: color + "22", width: "28px", height: "28px" }}
                aria-hidden="true"
              >
                {isRepro ? <RefreshCcw size={13} style={{ color }} /> : <Icon size={13} style={{ color }} />}
              </span>
              <span className="font-medium truncate flex-1" style={{ color: "var(--color-text)" }}>
                {event.title || "Sin título"}
              </span>
              <span
                className="pill-compact font-semibold flex-shrink-0"
                style={{ backgroundColor: color + "22", color }}
              >
                {dayLabel} · {timeLabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ProximosEventos;