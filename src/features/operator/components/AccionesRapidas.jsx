import React from "react";
import {
  PlusCircle,
  FileText,
  StickyNote,
  CalendarPlus,
  Search,
  Download,
} from "lucide-react";

const ACCIONES = [
  { key: "nuevoCaso", label: "Nuevo caso", icon: PlusCircle, color: "var(--color-success)", action: "onNuevoCaso" },
  { key: "reporte", label: "Reporte", icon: FileText, color: "var(--color-accent)", action: "onNuevoReporte" },
  { key: "nota", label: "Nota", icon: StickyNote, color: "var(--chart-color-cases)", action: "onNuevaNota" },
  { key: "evento", label: "Evento", icon: CalendarPlus, color: "var(--chart-color-orange)", action: "onNuevoEvento" },
  { key: "buscar", label: "Buscar", icon: Search, color: "var(--chart-color-contact)", action: "onBuscar" },
  { key: "exportar", label: "Exportar", icon: Download, color: "var(--color-success)", action: "onExportar" },
];

export function AccionesRapidas({ onNuevoCaso, onNuevoReporte, onNuevaNota, onNuevoEvento, onBuscar, onExportar }) {
  const handlers = {
    onNuevoCaso,
    onNuevoReporte,
    onNuevaNota,
    onNuevoEvento,
    onBuscar,
    onExportar,
  };

  const disponibles = ACCIONES.filter((a) => handlers[a.action]);

  if (disponibles.length === 0) return null;

  return (
    <div
      className="rounded-lg px-4 py-3"
      style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 12h4l2-7 4 14 2-7h4" />
        </svg>
        <span className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
          Acciones rápidas
        </span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {disponibles.map(({ key, label, icon: Icon, color, action }) => (
          <button
            key={key}
            type="button"
            onClick={() => handlers[action] && handlers[action]()}
            className="flex flex-col items-center justify-center gap-1.5 px-2 py-3 rounded-xl text-xs font-semibold transition-opacity hover:opacity-70"
            style={{
              backgroundColor: "var(--color-surface2)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
            }}
          >
            <Icon size={20} strokeWidth={2} style={{ color }} />
            <span className="text-[10px]">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
