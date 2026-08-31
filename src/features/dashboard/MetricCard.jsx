import React, { useState } from 'react';
import { Info } from 'lucide-react';

export const MetricCard = React.memo(({ metric, icon: Icon, color, trend, onDrill }) => {
  const [showDesc, setShowDesc] = useState(false);
  const value = Number(metric.value ?? 0);
  const formatted = metric.format === 'percentage'
    ? `${value}%`
    : `${value.toLocaleString()}${metric.unit ? ` ${metric.unit}` : ''}`;
  const trendIcon = trend > 0 ? '\u2191' : trend < 0 ? '\u2193' : '';
  const trendColor = trend > 0 ? 'var(--color-success)' : trend < 0 ? 'var(--color-danger)' : 'var(--color-text-muted)';
  const clickable = !!onDrill;

  return (
    <div
      className="rounded-xl p-4 animate-fade-in"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        cursor: clickable ? 'pointer' : 'default',
      }}
      {...(clickable
        ? {
            role: 'button',
            tabIndex: 0,
            onClick: () => onDrill(metric),
            onKeyDown: (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onDrill(metric);
              }
            },
            title: 'Ver detalle en la tabla',
          }
        : {})}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
          {metric.label}
        </span>
        <span className="flex items-center gap-1">
          {metric.desc && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowDesc((s) => !s);
              }}
              className="p-0.5 rounded hover:opacity-70 transition-opacity"
              style={{ color: 'var(--color-text-muted)', cursor: 'pointer' }}
              aria-label={`Descripción de ${metric.label}`}
              title={showDesc ? 'Ocultar descripción' : 'Ver descripción'}
            >
              <Info size={12} />
            </button>
          )}
          {Icon && <Icon size={14} style={{ color: color || 'var(--color-accent)' }} />}
        </span>
      </div>
      <div className="font-metric text-2xl font-bold" style={{ color: color || 'var(--color-text)' }}>
        {formatted}
      </div>
      {trend !== undefined && trend !== 0 && (
        <div className="text-[10px] mt-0.5" style={{ color: trendColor }}>
          {trendIcon} {Math.abs(trend)}% vs período anterior
        </div>
      )}
      {showDesc && metric.desc && (
        <div className="text-[11px] mt-1.5 leading-snug animate-fade-in" style={{ color: 'var(--color-text-muted)' }}>
          {metric.desc}
        </div>
      )}
    </div>
  );
});
