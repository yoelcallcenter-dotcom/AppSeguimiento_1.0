import React, { useState, useMemo } from "react";
import {
  PlusCircle,
  Edit3,
  ArrowRightLeft,
  Scale,
  Building2,
  PenTool,
  FileText,
  Calendar,
  ClipboardList,
  MessageSquare,
  History,
} from "lucide-react";
import {
  HISTORY_TYPES,
} from "../../core/cases/caseHistory";
import { getEstadoAccent } from "../../utils/catalogos";

const FILTROS = [
  { key: "todos", label: "Todos", types: null },
  {
    key: "estados",
    label: "Estados",
    types: [HISTORY_TYPES.STATUS_CHANGED],
  },
  {
    key: "firmas",
    label: "Firmas",
    types: [HISTORY_TYPES.FIRMA_REGISTERED],
  },
  { key: "notas", label: "Notas", types: [HISTORY_TYPES.NOTE_ADDED] },
  {
    key: "interacciones",
    label: "Interacciones",
    types: [HISTORY_TYPES.MANUAL_INTERACTION, HISTORY_TYPES.REPORT_ADDED],
  },
  {
    key: "general",
    label: "General",
    types: [
      HISTORY_TYPES.CASE_CREATED,
      HISTORY_TYPES.CASE_UPDATED,
      HISTORY_TYPES.ESTUDIO_CHANGED,
      HISTORY_TYPES.ASEGURADORA_CHANGED,
      HISTORY_TYPES.EVENT_LINKED,
    ],
  },
];

function iconoPorTipo(type) {
  switch (type) {
    case HISTORY_TYPES.CASE_CREATED:
      return PlusCircle;
    case HISTORY_TYPES.CASE_UPDATED:
      return Edit3;
    case HISTORY_TYPES.STATUS_CHANGED:
      return ArrowRightLeft;
    case HISTORY_TYPES.ESTUDIO_CHANGED:
      return Scale;
    case HISTORY_TYPES.ASEGURADORA_CHANGED:
      return Building2;
    case HISTORY_TYPES.FIRMA_REGISTERED:
      return PenTool;
    case HISTORY_TYPES.NOTE_ADDED:
      return FileText;
    case HISTORY_TYPES.EVENT_LINKED:
      return Calendar;
    case HISTORY_TYPES.REPORT_ADDED:
      return ClipboardList;
    case HISTORY_TYPES.MANUAL_INTERACTION:
      return MessageSquare;
    default:
      return History;
  }
}

function colorPorTipo(event, config) {
  if (event.type === HISTORY_TYPES.STATUS_CHANGED && event.metadata?.newValue) {
    return getEstadoAccent(config, event.metadata.newValue);
  }
  switch (event.type) {
    case HISTORY_TYPES.CASE_CREATED:
    case HISTORY_TYPES.FIRMA_REGISTERED:
      return "var(--color-success)";
    case HISTORY_TYPES.MANUAL_INTERACTION:
    case HISTORY_TYPES.REPORT_ADDED:
    case HISTORY_TYPES.NOTE_ADDED:
    case HISTORY_TYPES.EVENT_LINKED:
      return "var(--color-accent)";
    default:
      return "var(--color-text-muted)";
  }
}

function etiquetaDia(fecha, hoy) {
  const d = new Date(fecha);
  const soloDia = (x) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDias = Math.round((soloDia(hoy) - soloDia(d)) / 86400000);
  if (diffDias === 0) return "HOY";
  if (diffDias === 1) return "AYER";
  const largo = d.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
  });
  const anio = d.getFullYear() !== hoy.getFullYear() ? ` ${d.getFullYear()}` : "";
  return `${largo.toUpperCase()}${anio}`;
}

function formatearHora(fecha) {
  return new Date(fecha).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Timeline del caso: lista cronológica compacta (más reciente primero),
 * agrupada por día y con filtros por tipo de evento.
 * Los eventos llegan ya cargados desde el detalle del caso.
 */
export function CaseTimeline({ eventos, config }) {
  const [filtro, setFiltro] = useState("todos");

  const filtroActivo = FILTROS.find((f) => f.key === filtro) || FILTROS[0];

  const filtrados = useMemo(() => {
    if (!filtroActivo.types) return eventos;
    return eventos.filter((e) => filtroActivo.types.includes(e.type));
  }, [eventos, filtroActivo]);

  const grupos = useMemo(() => {
    const hoy = new Date();
    const map = new Map();
    for (const e of filtrados) {
      const key = new Date(e.timestamp).toDateString();
      if (!map.has(key)) map.set(key, { fecha: e.timestamp, items: [] });
      map.get(key).items.push(e);
    }
    return Array.from(map.values());
  }, [filtrados]);

  return (
    <div>
      {/* Filtros compactos */}
      <div className="flex flex-wrap gap-1 mb-2">
        {FILTROS.map((f) => {
          const activo = f.key === filtro;
          return (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className="text-[10px] font-semibold px-2 py-1 rounded-full transition-opacity hover:opacity-80"
              style={{
                backgroundColor: activo
                  ? "var(--color-accent)"
                  : "var(--color-surface)",
                color: activo ? "#14181F" : "var(--color-text-muted)",
                border: `1px solid ${
                  activo ? "var(--color-accent)" : "var(--color-border)"
                }`,
              }}
              aria-pressed={activo}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Estados vacíos */}
      {grupos.length === 0 && (
        <div
          className="text-center text-xs py-6 flex flex-col items-center gap-1"
          style={{ color: "var(--color-text-muted)" }}
        >
          <History size={24} className="opacity-30" />
          <span>
            {eventos.length === 0
              ? "Sin actividad registrada todavía."
              : "No hay eventos para este filtro."}
          </span>
        </div>
      )}

      {/* Grupos por día */}
      <div className="space-y-3">
        {grupos.map((g) => (
          <div key={g.fecha}>
            <div
              className="text-[9px] font-bold uppercase tracking-wider mb-1"
              style={{ color: "var(--color-text-muted)" }}
            >
              {etiquetaDia(g.fecha, new Date())}
            </div>
            <div
              className="pl-2"
              style={{ borderLeft: "2px solid var(--color-border)" }}
            >
              {g.items.map((e, i) => {
                const Icon = iconoPorTipo(e.type);
                const color = colorPorTipo(e, config);
                return (
                  <div
                    key={e.id || `${e.timestamp}-${i}`}
                    className="flex items-start gap-2 py-1"
                  >
                    <span
                      className="text-[10px] tabular-nums pt-0.5 flex-shrink-0 w-8"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {formatearHora(e.timestamp)}
                    </span>
                    <Icon
                      size={12}
                      className="flex-shrink-0 mt-[3px]"
                      style={{ color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-xs font-semibold leading-tight"
                        style={{ color: "var(--color-text)" }}
                      >
                        {e.title}
                      </div>
                      {e.description && (
                        <div
                          className="text-[11px] leading-snug break-words"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          {e.description}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
