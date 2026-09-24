import React, { useMemo } from 'react';
import { RefreshCw, Clock } from 'lucide-react';
import useAppStore from '../../../core/store/useAppStore';
import { WidgetWrapper } from './WidgetWrapper';

const ReprogramacionesWidget = React.memo(function ReprogramacionesWidget({ period, onVerCaso }) {
  const cases = useAppStore((s) => s.cases);

  const reprogramaciones = useMemo(() => {
    return cases
      .filter((c) => c.estado === 'Reprogramado')
      .sort((a, b) => {
        const aDate = a.lastActivityAt || a.updatedAt || '';
        const bDate = b.lastActivityAt || b.updatedAt || '';
        return bDate.localeCompare(aDate);
      })
      .slice(0, 8);
  }, [cases]);

  return (
    <WidgetWrapper
      title="Reprogramaciones"
      icon={RefreshCw}
      period={period}
      empty={reprogramaciones.length === 0}
      emptyMessage="Sin reprogramaciones pendientes"
    >
      <div className="space-y-2">
        {reprogramaciones.map((c) => {
          const lastReport = (c.reporteHistory || [])[0];
          const fecha = lastReport?.fecha || c.fecha || '—';
          return (
            <div
              key={c.id}
              className="flex items-center gap-3 py-2 px-3 rounded-lg cursor-pointer hover:bg-white/5 transition-colors"
              style={{ backgroundColor: 'var(--color-surface2)' }}
              onClick={() => onVerCaso?.(c)}
            >
              <RefreshCw size={14} style={{ color: 'var(--color-warning, #F59E0B)', flexShrink: 0 }} />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>
                  {c.nombre || 'Sin nombre'}
                </div>
                <div className="text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                  {c.aseguradora || '—'} | {c.localidad || '—'} | {fecha}
                </div>
              </div>
              <Clock size={12} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
            </div>
          );
        })}
      </div>
    </WidgetWrapper>
  );
});

export { ReprogramacionesWidget };
