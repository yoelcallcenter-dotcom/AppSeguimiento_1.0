import React, { useMemo } from 'react';
import { CalendarDays, Clock } from 'lucide-react';
import useAppStore from '../../../core/store/useAppStore';
import { WidgetWrapper } from './WidgetWrapper';

const CitasWidget = React.memo(function CitasWidget({ period }) {
  const events = useAppStore((s) => s.events);
  const cases = useAppStore((s) => s.cases);

  const citas = useMemo(() => {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return events
      .filter((e) => {
        if (e.status === 'cancelled') return false;
        const isCita = e.eventType === 'cita' || (e.tags || []).includes('cita');
        if (!isCita) return false;
        const start = new Date(e.startDate);
        return start >= now && start <= nextWeek;
      })
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
      .slice(0, 8);
  }, [events]);

  const caseMap = useMemo(() => {
    const map = {};
    cases.forEach((c) => { map[String(c.id)] = c; });
    return map;
  }, [cases]);

  return (
    <WidgetWrapper
      title="Citas proximas"
      icon={CalendarDays}
      period={period}
      empty={citas.length === 0}
      emptyMessage="Sin citas en los proximos 7 dias"
    >
      <div className="space-y-2">
        {citas.map((ev) => {
          const caso = (ev.relatedCaseIds || []).length > 0 ? caseMap[ev.relatedCaseIds[0]] : null;
          const fecha = new Date(ev.startDate);
          const dia = fecha.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
          const hora = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
          return (
            <div key={ev.id} className="flex items-center gap-3 py-2 px-3 rounded-lg" style={{ backgroundColor: 'var(--color-surface2)' }}>
              <Clock size={14} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>
                  {caso?.nombre || ev.title || 'Cita'}
                </div>
                <div className="text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                  {dia} {hora} {caso?.aseguradora ? `- ${caso.aseguradora}` : ''}
                </div>
              </div>
              {ev.status === 'confirmed' && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-success, #10B981)22', color: 'var(--color-success, #10B981)' }}>
                  OK
                </span>
              )}
            </div>
          );
        })}
      </div>
    </WidgetWrapper>
  );
});

export { CitasWidget };
