import React, { useMemo } from "react";
import {
  Calendar,
  ClipboardList,
  FileText,
  RefreshCcw,
  StickyNote,
  Users,
} from "lucide-react";
import { buildTodayTimeline } from "../operatorMetrics";

const TYPE_META = {
  cita: { icon: Calendar, label: "Cita" },
  evento: { icon: ClipboardList, label: "Evento" },
  reprogramacion: { icon: RefreshCcw, label: "Reprogramación" },
  caso: { icon: Users, label: "Caso" },
  reporte: { icon: FileText, label: "Reporte" },
  nota: { icon: StickyNote, label: "Nota" },
};

function TipoBubble({ type, color }) {
  const meta = TYPE_META[type] || TYPE_META.evento;
  const Icon = meta.icon;
  return (
    <div
      className="flex items-center justify-center rounded-full flex-shrink-0"
      style={{ backgroundColor: color + "22", width: "30px", height: "30px" }}
      aria-hidden="true"
    >
      <Icon size={14} style={{ color }} />
    </div>
  );
}

export function TimelineActividades({ cases, events, notes, todayISO, onVerCaso, onNavigateToEvent }) {
  const items = useMemo(
    () => buildTodayTimeline(cases || [], events || [], notes || [], todayISO),
    [cases, events, notes, todayISO]
  );

  if (!items || items.length === 0) return null;

  return (
    <div
      className="rounded-lg px-4 py-3"
      style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <ClipboardList size={14} style={{ color: "var(--color-accent)" }} />
        <span className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
          Actividad de hoy ({items.length})
        </span>
      </div>

      <ol className="relative space-y-3 before:absolute before:left-[15px] before:top-1 before:bottom-1 before:w-px before:bg-[var(--color-border)]">
        {items.map((item, idx) => {
          const meta = TYPE_META[item.type] || TYPE_META.evento;
          const isLast = idx === items.length - 1;
          return (
            <li key={item.id} className="relative flex items-start gap-3">
              <div className="relative z-10 flex-shrink-0">
                <TipoBubble type={item.type} color={item.color} />
              </div>

              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold" style={{ color: item.color }}>
                    {item.time && item.time !== "" ? item.time : meta.label}
                  </span>
                  {!isLast && <span className="sr-only">·</span>}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (item.event && onNavigateToEvent) {
                      onNavigateToEvent(item.event);
                    } else if (item.caso && onVerCaso) {
                      onVerCaso(item.caso);
                    }
                  }}
                  className="mt-0.5 block w-full text-left hover:opacity-70 transition-opacity"
                  disabled={!item.event && !item.caso}
                >
                  <span className="block text-xs font-semibold truncate" style={{ color: "var(--color-text)" }}>
                    {item.title}
                  </span>
                  {item.detail && (
                    <span className="block text-[11px] truncate" style={{ color: "var(--color-text-muted)" }}>
                      {item.detail}
                    </span>
                  )}
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
