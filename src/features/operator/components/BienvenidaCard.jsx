import React from "react";
import { Sparkles, CalendarDays, CalendarClock, Trophy, MessagesSquare, ArrowRight } from "lucide-react";
import { getDiasRestantesDelMes, getProximaActividad } from "../operatorMetrics";

export function BienvenidaCard({ profile, now, greeting, encouragement, metaDiariaCumplida, events, onVerCaso, onNavigateToEvent }) {
  const diasRestantes = getDiasRestantesDelMes(now);
  const proxima = getProximaActividad(events || [], now || new Date());

  const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const dayLabel = days[now.getDay()];
  const formattedDate = `${now.getDate()} de ${now.toLocaleDateString("es-AR", { month: "long" })}`;
  const formattedTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")} hs`;

  const goToProxima = () => {
    if (!proxima) return;
    const event = proxima.event;
    const isCitaOrRepro = event.eventType === "cita" || event.eventType === "reprogramacion";
    if ((isCitaOrRepro || !event.caseContext) && onNavigateToEvent) {
      onNavigateToEvent(event);
    } else if (event.caseContext && onVerCaso) {
      onVerCaso(event.caseContext);
    } else if (onNavigateToEvent) {
      onNavigateToEvent(event);
    }
  };

  return (
    <div
      className="rounded-lg p-4"
      style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles size={16} className="flex-shrink-0" style={{ color: "var(--color-accent)" }} aria-hidden="true" />
          <span className="text-sm font-bold truncate" style={{ color: "var(--color-accent)" }}>
            {greeting.text}
          </span>
        </div>
        <span className="text-[11px] whitespace-nowrap" style={{ color: "var(--color-text-muted)" }}>
          {dayLabel} {formattedDate} · {formattedTime}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span
          className="inline-flex items-center gap-1.5 pill-compact font-semibold"
          style={{ backgroundColor: "var(--color-surface2)", color: "var(--color-text)", border: "1px solid var(--color-border)" }}
        >
          <CalendarDays size={12} style={{ color: "var(--color-accent)" }} aria-hidden="true" />
          {diasRestantes} {diasRestantes === 1 ? "día restante" : "días restantes"} del mes
        </span>

        {proxima && (
          <button
            type="button"
            onClick={goToProxima}
            className="inline-flex items-center gap-1.5 pill-compact font-semibold transition-opacity hover:opacity-70"
            style={{
              backgroundColor: "var(--color-accent)22",
              color: "var(--color-accent)",
              border: "1px solid var(--color-accent)44",
            }}
          >
            <CalendarClock size={12} aria-hidden="true" />
            Próxima: {proxima.event.title || "Sin título"} · {proxima.dayLabel} {proxima.timeLabel}
            <ArrowRight size={11} aria-hidden="true" />
          </button>
        )}
      </div>

      {(metaDiariaCumplida || encouragement) && (
        <div className="mt-3 space-y-2">
          {metaDiariaCumplida && (
            <div
              className="rounded-md px-3 py-2 flex items-center gap-2 animate-fade-in"
              style={{ backgroundColor: "var(--color-success)11", border: "1px solid var(--color-success)44" }}
              role="status"
            >
              <Trophy size={15} className="flex-shrink-0" style={{ color: "var(--color-success)" }} />
              <div className="text-xs font-bold" style={{ color: "var(--color-success)" }}>
                ¡Meta diaria cumplida! Completaste tus objetivos de casos y reportes de hoy.
              </div>
            </div>
          )}
          {encouragement && (
            <div
              className="rounded-md px-3 py-2 flex items-start gap-2 animate-fade-in"
              style={{ backgroundColor: "var(--color-warning)11", border: "1px solid var(--color-warning)44" }}
              role="status"
            >
              <MessagesSquare size={15} className="flex-shrink-0 mt-0.5" style={{ color: "var(--color-warning)" }} />
              <div className="text-xs font-semibold" style={{ color: "var(--color-warning)" }}>
                {encouragement.text}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BienvenidaCard;