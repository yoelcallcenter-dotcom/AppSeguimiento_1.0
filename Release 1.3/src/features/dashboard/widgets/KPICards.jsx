import React from 'react';
import {
  Users, Activity, CheckCircle2, PenLine, XCircle, FileWarning, Percent, Timer,
} from 'lucide-react';

const CARDS = [
  { key: 'total', label: 'Casos totales', icon: Users, color: 'var(--color-accent)', drill: { tipo: 'grupo', valor: 'todos' } },
  { key: 'activos', label: 'Activos', icon: Activity, color: '#60A5FA', drill: { tipo: 'grupo', valor: 'activos' } },
  { key: 'cerrados', label: 'Cerrados', icon: CheckCircle2, color: '#34D399', drill: { tipo: 'grupo', valor: 'cerrados' } },
  { key: 'firmas', label: 'Firmas', icon: PenLine, color: '#10B981', drill: { tipo: 'grupo', valor: 'firmas' } },
  { key: 'perdidos', label: 'Perdidos', icon: XCircle, color: '#F87171', drill: { tipo: 'grupo', valor: 'perdidos' } },
  { key: 'sinReporte', label: 'Sin reporte', icon: FileWarning, color: '#FBBF24', drill: { tipo: 'grupo', valor: 'sinReporte' } },
  { key: 'tasaConversion', label: 'Conversión', icon: Percent, color: '#818CF8', format: 'percentage' },
  { key: 'avgResolutionDays', label: 'Resolución', icon: Timer, color: '#F97316', suffix: ' días' },
];

function formatValue(value, card) {
  if (card.format === 'percentage') return `${value}%`;
  if (card.suffix) return `${value}${card.suffix}`;
  return value;
}

export default function KPICards({ metrics, onDrill }) {
  if (!metrics || metrics.total === 0) {
    return (
      <div className="rounded-xl p-5 text-sm" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div style={{ color: 'var(--color-text-muted)' }}>Sin casos para el período seleccionado.</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
      {CARDS.map((card) => {
        const Icon = card.icon;
        const clickable = !!card.drill;
        return (
          <button
            key={card.key}
            type="button"
            onClick={() => clickable && onDrill && onDrill(card.drill)}
            className="rounded-xl p-4 text-left transition-all hover:-translate-y-0.5"
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
            <div className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
              {formatValue(metrics[card.key], card)}
            </div>
          </button>
        );
      })}
    </div>
  );
}
