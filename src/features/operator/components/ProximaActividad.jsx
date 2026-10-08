import React, { useMemo } from "react";
import { Clock, ArrowRight, Calendar, CalendarClock } from "lucide-react";
import { getProximaActividad } from "../operatorMetrics";

export function ProximaActividad({ events, now, onVerCaso, onNavigateToEvent }) {
  const proxima = useMemo(
    () => getProximaActividad(events || [], now || new Date()),
    [events, now]
  );

  if (!proxima) return null;

  const { event, timeLabel, dayLabel, dateISO } = proxima;
  const caso = event.caseContext || null;
  const isCita = event.eventType === "cita";
  const isReprogramacion = event.eventType === "reprogramacion";

  const accentColor = isCita
    ? "var(--color-accent)"
    : isReprogramacion
      ? "var(--chart-color-warning)"
      : "var(--chart-color-orange)";

  return (
    <div
      className="rounded-lg px-4 py-3"
      style={{
        backgroundColor: "var(--color-surface)",
        border: `1px solid color-mix(in srgb, ${accentColor} 26.7%, transparent)`,
        borderTop: `3px solid ${accentColor}`,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Clock size={14} style={{ color: accentColor }} />
        <span className="text-xs font-semibold" style={{ color: accentColor }}>
          Próxima actividad
        </span>
        <span
          className="pill-compact ml-auto font-semibold"
          style={{ backgroundColor: `color-mix(in srgb, ${accentColor} 13.3%, transparent)`, color: accentColor }}
        >
          {dayLabel} · {timeLabel}
        </span>
      </div>

      <button
        type="button"
        onClick={() => {
          if (isCita || isReprogramacion) {
            onNavigateToEvent && onNavigateToEvent(event);
          } else if (caso && onVerCaso) {
            onVerCaso(caso);
          } else if (onNavigateToEvent) {
            onNavigateToEvent(event);
          }
        }}
        className="w-full text-left rounded-lg p-3 flex items-center gap-3 hover:opacity-70 transition-opacity"
        style={{ backgroundColor: "var(--color-surface2)" }}
      >
        <div
          className="flex items-center justify-center rounded-lg flex-shrink-0"
          style={{ backgroundColor: `color-mix(in srgb, ${accentColor} 13.3%, transparent)`, width: "40px", height: "40px" }}
        >
          {isCita || isReprogramacion ? (
            <CalendarClock size={18} style={{ color: accentColor }} />
          ) : (
            <Calendar size={18} style={{ color: accentColor }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate" style={{ color: "var(--color-text)" }}>
            {event.title || "Sin título"}
          </div>
          <div className="text-[11px] truncate" style={{ color: "var(--color-text-muted)" }}>
            {caso
              ? `${caso.nombre || "Caso"}${caso.estado ? " · " + caso.estado : ""}`
              : isReprogramacion
                ? "Cita reprogramada"
                : isCita
                  ? "Cita"
                  : event.startDate
                    ? event.startDate.slice(0, 10)
                    : ""}
          </div>
        </div>
        <ArrowRight size={14} className="flex-shrink-0" style={{ color: "var(--color-text-muted)" }} />
      </button>
    </div>
  );
}
