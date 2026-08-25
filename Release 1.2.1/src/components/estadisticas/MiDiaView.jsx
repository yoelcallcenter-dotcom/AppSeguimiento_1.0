import React, { useState, useMemo } from "react";
import { Calendar, Clock, AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { PillMemo } from "../common/Pill";

const INITIAL_SHOW = 3;

function CategoriaSection({ icon: Icon, label, count, color, casos, onVerCaso }) {
  const [expanded, setExpanded] = useState(false);
  if (count === 0) return null;

  const showAll = expanded || count <= INITIAL_SHOW;
  const visible = showAll ? casos : casos.slice(0, INITIAL_SHOW);
  const hasMore = count > INITIAL_SHOW;

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon size={12} style={{ color }} />
        <span className="text-[11px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
        <span className="text-[10px] ml-auto font-bold" style={{ color }}>{count}</span>
      </div>
      <div className="space-y-1">
        {visible.map((c) => (
          <div
            key={c.id}
            onClick={() => onVerCaso(c.id)}
            className="flex items-center gap-2 rounded px-2 py-1 cursor-pointer hover:bg-white/5 transition-colors"
            style={{ backgroundColor: 'var(--color-surface2)', border: '1px solid var(--color-border)' }}
          >
            <span className="text-[11px] flex-1 truncate" style={{ color: 'var(--color-text)' }}>{c.nombre || 'Sin nombre'}</span>
            <PillMemo estado={c.estado} small />
          </div>
        ))}
        {hasMore && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="flex items-center gap-1 mx-auto text-[10px] font-semibold hover:opacity-70 transition-opacity"
            style={{ color: 'var(--color-accent)' }}
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? 'Mostrar menos' : `Ver ${count} casos`}
          </button>
        )}
      </div>
    </div>
  );
}

export function MiDiaView({ casos, onVerCaso }) {
  const hoy = new Date().toISOString().slice(0, 10);
  const hoyLabel = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

  const { citasHoy, pendientes, sinReporte } = useMemo(() => {
    const citasHoy = [];
    const pendientes = [];
    const sinReporte = [];
    casos.forEach((c) => {
      if (c.cita && c.cita.includes(hoy)) {
        citasHoy.push(c);
        return;
      }
      const inactivo = Math.floor((new Date() - new Date(c.fecha || 0)) / (1000 * 60 * 60 * 24));
      if (['Cita virtual', 'Cita presencial', 'Lo piensa', 'Pendiente'].includes(c.estado) && inactivo > 3) {
        pendientes.push(c);
        return;
      }
      if (!c.reporteHistory || c.reporteHistory.length === 0) {
        sinReporte.push(c);
      }
    });
    return { citasHoy, pendientes, sinReporte };
  }, [casos, hoy]);

  const total = citasHoy.length + pendientes.length + sinReporte.length;

  if (total === 0) {
    return (
      <div className="text-center py-6">
        <CheckCircle size={24} className="mx-auto mb-2" style={{ color: 'var(--color-success)' }} />
        <div className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>¡Todo al día!</div>
        <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>No hay tareas pendientes para hoy</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
        <Calendar size={13} />
        <span className="capitalize">{hoyLabel}</span>
        <span className="ml-auto font-bold text-xs" style={{ color: 'var(--color-text)' }}>{total} tarea{total !== 1 ? 's' : ''}</span>
      </div>

      <CategoriaSection icon={Calendar} label="Citas hoy" count={citasHoy.length} color="var(--color-accent)" casos={citasHoy} onVerCaso={onVerCaso} />
      <CategoriaSection icon={Clock} label="Pendientes de seguimiento" count={pendientes.length} color="var(--color-warning)" casos={pendientes} onVerCaso={onVerCaso} />
      <CategoriaSection icon={AlertTriangle} label="Sin reporte" count={sinReporte.length} color="var(--color-danger)" casos={sinReporte} onVerCaso={onVerCaso} />
    </div>
  );
}
