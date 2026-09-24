import React, { useMemo } from 'react';
import { Shield } from 'lucide-react';
import useAppStore from '../../../core/store/useAppStore';
import { WidgetWrapper } from './WidgetWrapper';

const SUCCESS_STATES = ['Firmo'];

const AseguradorasWidget = React.memo(function AseguradorasWidget({ period, onFilter }) {
  const cases = useAppStore((s) => s.cases);

  const aseguradoras = useMemo(() => {
    const map = {};
    cases.forEach((c) => {
      const key = (c.aseguradora || '').trim();
      if (!key) return;
      if (!map[key]) map[key] = { key, total: 0, firmas: 0 };
      map[key].total += 1;
      if (SUCCESS_STATES.includes(c.estado)) map[key].firmas += 1;
    });
    return Object.values(map)
      .map((a) => ({ ...a, conversion: a.total > 0 ? Math.round((a.firmas / a.total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [cases]);

  const maxTotal = aseguradoras.length > 0 ? Math.max(...aseguradoras.map((a) => a.total)) : 1;

  return (
    <WidgetWrapper
      title="Aseguradoras"
      icon={Shield}
      period={period}
      empty={aseguradoras.length === 0}
      emptyMessage="Sin datos de aseguradoras"
    >
      <div className="space-y-3">
        {aseguradoras.map((a) => (
          <div
            key={a.key}
            className="cursor-pointer hover:bg-white/5 rounded-lg p-2 transition-colors"
            onClick={() => onFilter?.({ tipo: 'aseguradora', valor: a.key })}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>{a.key}</span>
              <span className="text-[10px] tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                {a.firmas}/{a.total} ({a.conversion}%)
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-surface2)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(a.total / maxTotal) * 100}%`,
                  backgroundColor: 'var(--color-accent)',
                  opacity: 0.8,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </WidgetWrapper>
  );
});

export { AseguradorasWidget };
