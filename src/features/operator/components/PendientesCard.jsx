import React, { useMemo } from "react";
import {
  AlertTriangle,
  FileText,
  Clock,
  CalendarClock,
  RefreshCcw,
  Users,
  Target,
  Building2,
} from "lucide-react";
import { getPendientesDelDia } from "../../../core/alerts/attentionRules";

const PRIORITY_ORDER = { alta: 0, media: 1, baja: 2 };

const TYPE_META = {
  sin_info: { icon: AlertTriangle, color: "var(--chart-color-danger)", label: "Sin información" },
  reporte_pendiente: { icon: FileText, color: "var(--chart-color-danger)", label: "Reporte pendiente" },
  actividad_vencida: { icon: Clock, color: "var(--chart-color-danger)", label: "Actividad vencida" },
  cita_hoy: { icon: CalendarClock, color: "var(--chart-color-warning)", label: "Cita hoy" },
  reprogramacion_pendiente: { icon: RefreshCcw, color: "var(--chart-color-warning)", label: "Reprogramación" },
  seguimiento_pendiente: { icon: Users, color: "var(--chart-color-warning)", label: "Seguimiento" },
  meta_diaria: { icon: Target, color: "var(--chart-color-contact)", label: "Objetivo diario" },
  sin_estudio: { icon: Building2, color: "var(--chart-color-contact)", label: "Sin estudio" },
};

function PriorityBadge({ priority }) {
  const color =
    priority === "alta"
      ? "var(--chart-color-danger)"
      : priority === "media"
        ? "var(--chart-color-warning)"
        : "var(--chart-color-contact)";
  const label = priority === "alta" ? "Alta" : priority === "media" ? "Media" : "Baja";
  return (
    <span
      className="pill-compact flex-shrink-0 font-semibold"
      style={{ backgroundColor: color + "22", color }}
    >
      {label}
    </span>
  );
}

export function PendientesCard({ cases, events, notes, todayISO, goals, onVerCaso, onNavigateToEvent, onNavigateMetas }) {
  const items = useMemo(() => {
    if (!todayISO) return [];
    const all = getPendientesDelDia({
      cases: cases || [],
      events: events || [],
      notes: notes || [],
      todayISO,
      goals: goals || {},
    });
    return [...all].sort(
      (a, b) =>
        (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2)
    );
  }, [cases, events, notes, todayISO, goals]);

  if (items.length === 0) return null;

  return (
    <div
      className="rounded-lg px-4 py-3"
      style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Target size={14} style={{ color: "var(--chart-color-warning)" }} />
        <span className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
          Pendientes ({items.length})
        </span>
      </div>

      <div className="space-y-1">
        {items.map((item) => {
          const meta = TYPE_META[item.type] || { icon: Target, color: "var(--color-accent)", label: "Pendiente" };
          const Icon = meta.icon;

          const handleClick = () => {
            if (item.type === "meta_diaria" && onNavigateMetas) {
              onNavigateMetas();
            } else if (item.event && onNavigateToEvent) {
              onNavigateToEvent(item.event);
            } else if (item.caso && onVerCaso) {
              onVerCaso(item.caso);
            }
          };

          const clickable = Boolean(
            (item.type === "meta_diaria" && onNavigateMetas) ||
            (item.event && onNavigateToEvent) ||
            (item.caso && onVerCaso)
          );

          return (
            <button
              key={item.id}
              type="button"
              onClick={handleClick}
              disabled={!clickable}
              className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded text-xs hover:opacity-70 transition-opacity"
              style={{ backgroundColor: "var(--color-surface2)" }}
            >
              <span
                className="flex items-center justify-center rounded-full flex-shrink-0"
                style={{ backgroundColor: meta.color + "22", width: "28px", height: "28px" }}
                aria-hidden="true"
              >
                <Icon size={13} style={{ color: meta.color }} />
              </span>
              <span className="font-medium truncate flex-1" style={{ color: "var(--color-text)" }}>
                {item.title}
              </span>
              <span className="text-[10px] hidden xs:block sm:block flex-shrink-0 truncate max-w-[120px]" style={{ color: "var(--color-text-muted)" }}>
                {item.detail}
              </span>
              <PriorityBadge priority={item.priority} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
