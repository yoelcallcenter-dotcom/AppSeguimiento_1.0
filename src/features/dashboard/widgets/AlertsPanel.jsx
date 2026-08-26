import React from 'react';
import { Bell, AlertTriangle, Clock, UserX, FileWarning, CheckCircle2 } from 'lucide-react';
import { EmptyState } from '../../../components/common/EmptyState';

const SEVERITY = {
  danger: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  warning: { color: '#FBBF24', bg: 'rgba(251,191,36,0.12)' },
  info: { color: '#60A5FA', bg: 'rgba(96,165,250,0.12)' },
};

export default function AlertsPanel({ metrics, onDrill }) {
  if (!metrics) return null;

  const items = [
    metrics.overdueCases.length > 0 && {
      key: 'vencidos',
      severity: metrics.overdueCases.length >= 5 ? 'danger' : 'warning',
      icon: Clock,
      titulo: `${metrics.overdueCases.length} casos vencidos`,
      detalle: 'Activos con más de 30 días sin resolución.',
      drill: { tipo: 'grupo', valor: 'activos' },
    },
    metrics.staleCases.length > 0 && {
      key: 'inactivos',
      severity: 'warning',
      icon: Clock,
      titulo: `${metrics.staleCases.length} casos sin actividad`,
      detalle: 'Más de 15 días sin actualizarse.',
      drill: { tipo: 'grupo', valor: 'activos' },
    },
    metrics.unassignedCases.length > 0 && {
      key: 'sinasignacion',
      severity: 'warning',
      icon: UserX,
      titulo: `${metrics.unassignedCases.length} casos sin estudio asignado`,
      detalle: 'Requieren asignación para gestionarse.',
      drill: { tipo: 'grupo', valor: 'sinAsignacion' },
    },
    metrics.sinReporte > 0 && {
      key: 'sinreporte',
      severity: 'info',
      icon: FileWarning,
      titulo: `${metrics.sinReporte} casos sin reporte`,
      detalle: 'No registran ningún reporte cargado.',
      drill: { tipo: 'grupo', valor: 'sinReporte' },
    },
  ].filter(Boolean);

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Bell size={18} style={{ color: 'var(--color-accent)' }} />
        <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Alertas</span>
      </div>
      {items.length === 0 ? (
        <EmptyState icon={CheckCircle2} message="Todo bajo control" submessage="Sin alertas activas" size="sm" />
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const Icon = item.icon;
            const sev = SEVERITY[item.severity] || SEVERITY.info;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onDrill && onDrill(item.drill)}
                className="w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors hover:opacity-90"
                style={{ backgroundColor: sev.bg, border: '1px solid ' + sev.color + '44' }}
              >
                <Icon size={16} style={{ color: sev.color, flexShrink: 0, marginTop: 2 }} />
                <div className="min-w-0">
                  <div className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{item.titulo}</div>
                  <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{item.detalle}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
