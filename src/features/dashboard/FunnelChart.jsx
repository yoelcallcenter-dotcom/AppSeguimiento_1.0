import React from 'react';
import { TrendingDown } from 'lucide-react';
import ChartCard from './widgets/ChartCard';

const DESC_DEFAULT =
  'Proporción de casos que avanza entre etapas del pipeline: ingresos, contactos, firmas y pérdidas.';

export const FunnelChart = React.memo(({ funnel, desc }) => {
  if (!funnel || funnel.length === 0) return null;

  const maxVal = Math.max(...funnel.map((f) => f.value), 1);

  return (
    <ChartCard title="Funnel de conversión" icon={TrendingDown} desc={desc || DESC_DEFAULT}>
      <div className="space-y-2">
        {funnel.map((etapa, i) => {
          const pct = (etapa.value / maxVal) * 100;
          return (
            <div key={etapa.id}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span style={{ color: 'var(--color-text-muted)' }}>{etapa.label}</span>
                <div className="flex items-center gap-2">
                  <b style={{ color: 'var(--color-text)' }}>{etapa.value.toLocaleString()}</b>
                  {i > 0 && (
                    <span className="text-[10px]" style={{ color: etapa.conversion < 50 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                      {etapa.conversion}%
                    </span>
                  )}
                </div>
              </div>
              <div className="w-full h-5 rounded-sm" style={{ backgroundColor: 'var(--color-surface2)' }}>
                <div
                  className="h-full rounded-sm transition-[width]"
                  style={{
                    width: `${Math.max(2, pct)}%`,
                    backgroundColor: i === funnel.length - 1 ? 'var(--color-success)' : 'var(--color-accent)',
                    opacity: 0.6 + (i / funnel.length) * 0.3,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
});
