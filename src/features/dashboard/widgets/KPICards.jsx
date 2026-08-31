import React from 'react';
import {
  Users, Activity, CheckCircle2, PenLine, XCircle, FileWarning, Percent, Timer,
  TrendingUp, TrendingDown, Minus, BarChart3,
} from 'lucide-react';
import { EmptyState } from '../../../components/common/EmptyState';

const CARDS = [
  { key: 'total', label: 'Casos totales', icon: Users, color: 'var(--color-accent)', drill: { tipo: 'grupo', valor: 'todos' } },
  { key: 'activos', label: 'Activos', icon: Activity, color: '#60A5FA', drill: { tipo: 'grupo', valor: 'activos' } },
  { key: 'cerrados', label: 'Cerrados', icon: CheckCircle2, color: '#34D399', drill: { tipo: 'grupo', valor: 'cerrados' } },
  { key: 'firmas', label: 'Firmas', icon: PenLine, color: '#10B981', drill: { tipo: 'grupo', valor: 'firmas' } },
  { key: 'perdidos', label: 'Perdidos', icon: XCircle, color: '#F87171', drill: { tipo: 'grupo', valor: 'perdidos' } },
  { key: 'sinReporte', label: 'Sin reporte', icon: FileWarning, color: '#FBBF24', drill: { tipo: 'grupo', valor: 'sinReporte' } },
  { key: 'tasaConversion', label: 'Conversión', icon: Percent, color: '#818CF8', format: 'percentage' },
  { key: 'avgResolutionDays', label: 'Resolución', icon: Timer, color: '#F97316', suffix: ' días', inverse: true },
];

function formatValue(value, card) {
  if (card.format === 'percentage') return `${value}%`;
  if (card.suffix) return `${value}${card.suffix}`;
  return value;
}

function getTrend(current, previous, inverse = false) {
  if (previous == null || previous === 0) return null;
  const diff = current - previous;
  const pct = Math.round((Math.abs(diff) / Math.abs(previous)) * 100);
  if (diff === 0) return { type: 'equal', pct: 0 };
  const positive = inverse ? diff < 0 : diff > 0;
  return { type: positive ? 'up' : 'down', pct };
}

export default function KPICards({ metrics, onDrill, prevMetrics }) {
  if (!metrics || metrics.total === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        message="Sin casos para el periodo seleccionado."
        size="sm"
      />
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
      {CARDS.map((card) => {
        const Icon = card.icon;
        const clickable = !!card.drill;
        const current = metrics[card.key];
        const prev = prevMetrics ? prevMetrics[card.key] : null;
        const trend = getTrend(current, prev, card.inverse);

        return (
          <button
            key={card.key}
            type="button"
            onClick={() => clickable && onDrill && onDrill(card.drill)}
            className="rounded-xl p-4 text-left transition-transform hover:-translate-y-0.5"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              cursor: clickable ? 'pointer' : 'default',
            }}
            title={clickable ? 'Ver detalle en la tabla' : undefined}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                {card.label}
              </span>
              <Icon size={14} style={{ color: card.color }} />
            </div>
            <div className="font-metric text-xl font-bold" style={{ color: 'var(--color-text)' }}>
              {formatValue(current, card)}
            </div>
            {trend && (
              <div className="flex items-center gap-1 mt-1">
                {trend.type === 'up' && <TrendingUp size={10} style={{ color: '#34D399' }} />}
                {trend.type === 'down' && <TrendingDown size={10} style={{ color: '#F87171' }} />}
                {trend.type === 'equal' && <Minus size={10} style={{ color: 'var(--color-text-muted)' }} />}
                <span
                  className="text-[9px] font-medium"
                  style={{
                    color: trend.type === 'equal'
                      ? 'var(--color-text-muted)'
                      : trend.type === 'up' ? '#34D399' : '#F87171',
                  }}
                >
                  {trend.pct > 0 ? `${trend.type === 'down' ? '-' : '+'}${trend.pct}%` : 'Sin cambio'}
                </span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
