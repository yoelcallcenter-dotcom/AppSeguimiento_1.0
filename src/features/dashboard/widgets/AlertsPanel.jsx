import React, { useMemo, useState } from 'react';
import { Bell, AlertTriangle, Clock, UserX, FileWarning, CheckCircle2, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { EmptyState } from '../../../components/common/EmptyState';
import { getCasesNeedingAttention } from '../../../core/alerts/attentionRules';

const SEVERITY = {
  danger: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  warning: { color: '#FBBF24', bg: 'rgba(251,191,36,0.12)' },
  info: { color: '#60A5FA', bg: 'rgba(96,165,250,0.12)' },
};

const GROUP_ICONS = {
  stale: Clock,
  sinReporte: FileWarning,
  unassigned: UserX,
  overdueEvent: AlertTriangle,
};

const GROUP_LABELS = {
  stale: 'Sin actividad',
  sinReporte: 'Sin reporte',
  unassigned: 'Sin estudio',
  overdueEvent: 'Eventos vencidos',
};

const GROUP_DRILL = {
  stale: { tipo: 'grupo', valor: 'activos' },
  sinReporte: { tipo: 'grupo', valor: 'sinReporte' },
  unassigned: { tipo: 'grupo', valor: 'sinAsignacion' },
  overdueEvent: { tipo: 'grupo', valor: 'activos' },
};

const INITIAL_SHOW = 3;

export default function AlertsPanel({ metrics, cases, notes, events, onDrill, onVerCaso }) {
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [expandedGroups, setExpandedGroups] = useState({});

  const attentionItems = useMemo(() => {
    if (!cases || !events) return [];
    return getCasesNeedingAttention(cases, notes, events, todayISO);
  }, [cases, notes, events, todayISO]);

  const groupedItems = useMemo(() => {
    const groups = {};
    for (const item of attentionItems) {
      const group = item.group || 'stale';
      if (!groups[group]) groups[group] = [];
      groups[group].push(item);
    }
    return groups;
  }, [attentionItems]);

  const summaryItems = useMemo(() => {
    if (!metrics) return [];
    return [
      metrics.overdueCases.length > 0 && {
        key: 'vencidos',
        severity: metrics.overdueCases.length >= 5 ? 'danger' : 'warning',
        icon: Clock,
        titulo: `${metrics.overdueCases.length} casos vencidos`,
        detalle: 'Activos con más de 30 días sin resolución.',
        drill: { tipo: 'grupo', valor: 'activos' },
        group: 'stale',
      },
      metrics.staleCases.length > 0 && {
        key: 'inactivos',
        severity: 'warning',
        icon: Clock,
        titulo: `${metrics.staleCases.length} casos sin actividad`,
        detalle: 'Más de 15 días sin actualizarse.',
        drill: { tipo: 'grupo', valor: 'activos' },
        group: 'stale',
      },
      metrics.unassignedCases.length > 0 && {
        key: 'sinasignacion',
        severity: 'warning',
        icon: UserX,
        titulo: `${metrics.unassignedCases.length} casos sin estudio asignado`,
        detalle: 'Requieren asignación para gestionarse.',
        drill: { tipo: 'grupo', valor: 'sinAsignacion' },
        group: 'unassigned',
      },
      metrics.sinReporte > 0 && {
        key: 'sinreporte',
        severity: 'info',
        icon: FileWarning,
        titulo: `${metrics.sinReporte} casos sin reporte`,
        detalle: 'No registran ningún reporte cargado.',
        drill: { tipo: 'grupo', valor: 'sinReporte' },
        group: 'sinReporte',
      },
    ].filter(Boolean);
  }, [metrics]);

  function toggleGroup(group) {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  }

  if (summaryItems.length === 0 && attentionItems.length === 0) {
    return (
      <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Bell size={18} style={{ color: 'var(--color-accent)' }} />
          <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Alertas</span>
        </div>
        <EmptyState icon={CheckCircle2} message="Todo bajo control" submessage="Sin alertas activas" size="sm" />
      </div>
    );
  }

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Bell size={18} style={{ color: 'var(--color-accent)' }} />
        <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Alertas</span>
        {attentionItems.length > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-danger)22', color: 'var(--color-danger)' }}>
            {attentionItems.length}
          </span>
        )}
      </div>

      <div className="space-y-3">
        {summaryItems.map((item) => {
          const Icon = item.icon;
          const sev = SEVERITY[item.severity] || SEVERITY.info;
          const groupItems = groupedItems[item.group] || [];
          const isExpanded = expandedGroups[item.group];
          const visibleItems = isExpanded ? groupItems : groupItems.slice(0, INITIAL_SHOW);
          const GroupIcon = GROUP_ICONS[item.group] || Clock;

          return (
            <div key={item.key}>
              <button
                type="button"
                onClick={() => onDrill && onDrill(item.drill)}
                className="w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors hover:opacity-90"
                style={{ backgroundColor: sev.bg, border: '1px solid ' + sev.color + '44' }}
              >
                <Icon size={16} style={{ color: sev.color, flexShrink: 0, marginTop: 2 }} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{item.titulo}</div>
                  <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{item.detalle}</div>
                </div>
              </button>

              {groupItems.length > 0 && (
                <div className="ml-4 mt-1 space-y-1">
                  {visibleItems.map((attentionItem) => {
                    const caso = attentionItem.caso;
                    if (!caso) return null;
                    return (
                      <button
                        key={caso.id}
                        type="button"
                        onClick={() => onVerCaso && onVerCaso(caso)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:opacity-70 transition-opacity"
                        style={{ backgroundColor: 'var(--color-surface2)' }}
                      >
                        <ExternalLink size={10} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                        <span className="text-[11px] font-medium truncate" style={{ color: 'var(--color-text)' }}>
                          {caso.nombre || 'Sin nombre'}
                        </span>
                        <span className="text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                          — {attentionItem.reasonDetail}
                        </span>
                      </button>
                    );
                  })}
                  {groupItems.length > INITIAL_SHOW && (
                    <button
                      type="button"
                      onClick={() => toggleGroup(item.group)}
                      className="flex items-center gap-1 text-[10px] font-semibold hover:opacity-70 transition-opacity"
                      style={{ color: 'var(--color-accent)' }}
                    >
                      {isExpanded ? <><ChevronUp size={10} /> Ver menos</> : <><ChevronDown size={10} /> Ver {groupItems.length - INITIAL_SHOW} más</>}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
