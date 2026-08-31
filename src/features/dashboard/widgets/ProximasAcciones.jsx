import React, { useMemo, useState } from 'react';
import { AlertTriangle, Calendar, Clock, FileText, User, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { getProximasAcciones } from '../../../core/alerts/attentionRules';

const ICON_MAP = {
  AlertTriangle,
  Calendar,
  Clock,
  FileText,
  User,
};

const SEVERITY_STYLES = {
  danger: { border: 'var(--color-danger)', bg: 'var(--color-danger)11', text: 'var(--color-danger)' },
  warning: { border: 'var(--color-warning)', bg: 'var(--color-warning)11', text: 'var(--color-warning)' },
  info: { border: 'var(--color-accent)', bg: 'var(--color-accent)11', text: 'var(--color-accent)' },
};

const INITIAL_SHOW = 5;

export default function ProximasAcciones({ cases, notes, events, onVerCaso, onNavigateToEvent, onNavigateFiltered }) {
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [expanded, setExpanded] = useState(false);

  const acciones = useMemo(
    () => getProximasAcciones(cases, notes, events, todayISO),
    [cases, notes, events, todayISO]
  );

  const visible = expanded ? acciones : acciones.slice(0, INITIAL_SHOW);

  function handleAction(accion) {
    if (!accion || !accion.action) return;
    const { type } = accion.action;
    if (type === 'open_case' && accion.action.caso && onVerCaso) {
      onVerCaso(accion.action.caso);
    } else if (type === 'open_event' && accion.action.event && onNavigateToEvent) {
      onNavigateToEvent(accion.action.event);
    }
  }

  if (acciones.length === 0) {
    return (
      <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Zap size={18} style={{ color: 'var(--color-success)' }} />
          <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Próximas acciones</span>
        </div>
        <div className="flex flex-col items-center py-6 gap-2">
          <div className="text-2xl">✓</div>
          <span className="text-sm font-medium" style={{ color: 'var(--color-success)' }}>Todo al día</span>
          <span className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>Sin acciones pendientes por ahora</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap size={18} style={{ color: 'var(--color-accent)' }} />
          <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Próximas acciones</span>
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: 'var(--color-accent)22', color: 'var(--color-accent)' }}
          >
            {acciones.length}
          </span>
        </div>
        {acciones.length > INITIAL_SHOW && (
          <button
            type="button"
            onClick={() => setExpanded((s) => !s)}
            className="flex items-center gap-1 text-xs font-semibold hover:opacity-70 transition-opacity"
            style={{ color: 'var(--color-accent)' }}
          >
            {expanded ? <><ChevronUp size={13} /> Ver menos</> : <><ChevronDown size={13} /> Ver todo</>}
          </button>
        )}
      </div>

      <div className="space-y-2">
        {visible.map((accion) => {
          const IconComponent = ICON_MAP[accion.icon] || AlertTriangle;
          const severity = SEVERITY_STYLES[accion.severity] || SEVERITY_STYLES.info;
          return (
            <button
              key={accion.id}
              type="button"
              onClick={() => handleAction(accion)}
              className="w-full flex items-start gap-3 p-2.5 rounded-lg text-left hover:opacity-75 transition-opacity"
              style={{
                backgroundColor: severity.bg,
                borderLeft: `3px solid ${severity.border}`,
              }}
            >
              <IconComponent size={14} className="mt-0.5 flex-shrink-0" style={{ color: severity.text }} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold truncate" style={{ color: 'var(--color-text)' }}>{accion.title}</div>
                <div className="text-[11px] truncate" style={{ color: 'var(--color-text-muted)' }}>{accion.detail}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
