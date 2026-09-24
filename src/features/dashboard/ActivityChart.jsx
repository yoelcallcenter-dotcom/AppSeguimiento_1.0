import React, { useMemo } from 'react';
import { Activity, X } from 'lucide-react';
import { sanitizeString } from '../../utils/sanitize';
import ChartCard from './widgets/ChartCard';
import { isWorkingDay, isUnavailableOn } from '../operator/operatorMetrics';

const DIAS_LAB = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie'];
const DESC_DEFAULT =
  'Casos ingresados en los últimos 7 días hábiles, comparados con la semana anterior. Haz clic en un día para ver los casos registrados.';

const Bar = React.memo(({ count, max, diaSemana, date, isFirstOfWeek, isSelected, onClick }) => {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-stretch gap-0" style={{ flex: 1 }}>
      {isFirstOfWeek && <div className="w-px self-stretch mx-0.5" style={{ backgroundColor: 'var(--color-border)' }} />}
      <button
        onClick={onClick}
        className="flex flex-col items-center gap-1 flex-1 rounded transition-opacity hover:opacity-80 py-1"
        style={{ backgroundColor: isSelected ? 'var(--color-accent)11' : 'transparent' }}
      >
        <div className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{count}</div>
        <div className="w-full flex-1 flex items-end" style={{ minHeight: '2rem' }}>
          <div
            className="w-full rounded-sm transition-[height]"
            style={{
              height: `${Math.max(8, pct)}%`,
              minHeight: 6,
              maxHeight: '100%',
              backgroundColor: count > 0 ? 'var(--color-accent)' : 'var(--color-border)',
              opacity: count > 0 ? 0.5 + (pct / 100) * 0.5 : 0.3,
            }}
          />
        </div>
        <div className="text-ds-xs leading-tight text-center" style={{ color: 'var(--color-text-muted)' }}>{diaSemana}<br/>{date.slice(-2)}</div>
      </button>
    </div>
  );
});

export const ActivityChart = React.memo(({ cases, selectedDay, onSelectDay, desc, workingDays, availability }) => {
  const { days, max, prevAvg, trend } = useMemo(() => {
    const today = new Date();
    const wd = workingDays || [1, 2, 3, 4, 5];
    const avail = availability || {};
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const esEfectivo = (d) => isWorkingDay(iso(d), wd) && !isUnavailableOn(avail, iso(d));
    const cara = (c, key) => (c.fecha || '').startsWith(key);
    const countOf = (key) => cases.filter((c) => cara(c, key)).length;

    const efectivos = [];
    let i = 0;
    while (efectivos.length < 14 && i < 47) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (esEfectivo(d)) efectivos.push(iso(d));
      i++;
    }
    const curKeys = efectivos.slice(-7);
    const prevKeys = efectivos.slice(0, -7);

    const days = curKeys.map((key) => {
      const d = new Date(key + 'T00:00:00');
      const diaSem = d.getDay();
      return { date: key, count: countOf(key), diaSemana: DIAS_LAB[diaSem - 1] || '' };
    });
    days.forEach((d) => { d.isFirstOfWeek = d.diaSemana === 'Lun'; });
    const max = Math.max(...days.map((d) => d.count), 1);

    const currentAvg = days.reduce((s, d) => s + d.count, 0) / days.length;
    const prevAvg = prevKeys.length > 0
      ? prevKeys.reduce((s, k) => s + countOf(k), 0) / prevKeys.length
      : 0;
    const trend = prevAvg > 0 ? Math.round(((currentAvg - prevAvg) / prevAvg) * 100) : 0;

    return { days, max, prevAvg, trend };
  }, [cases, workingDays, availability]);

  const dayCases = useMemo(() => {
    if (!selectedDay) return [];
    return cases.filter((c) => (c.fecha || '').startsWith(selectedDay));
  }, [cases, selectedDay]);

  const right = trend !== 0 ? (
    <span className="text-[10px]" style={{ color: trend > 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
      {trend > 0 ? '\u2191' : '\u2193'} {Math.abs(trend)}% vs período anterior
    </span>
  ) : null;

  return (
    <ChartCard title="Actividad (7 días)" icon={Activity} desc={desc || DESC_DEFAULT} right={right}>
      <div className="flex items-stretch gap-0" style={{ height: '10rem' }}>
        {days.map((d) => (
          <Bar
            key={d.date}
            date={d.date}
            count={d.count}
            max={max}
            diaSemana={d.diaSemana}
            isFirstOfWeek={d.isFirstOfWeek}
            isSelected={selectedDay === d.date}
            onClick={() => onSelectDay(selectedDay === d.date ? null : d.date)}
          />
        ))}
      </div>
      {selectedDay && (
        <div className="mt-3 space-y-1 max-h-32 overflow-y-auto animate-fade-in">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-accent)' }}>
              Casos del {selectedDay.slice(-2)}/{selectedDay.slice(5, 7)}
            </span>
            <button onClick={() => onSelectDay(null)} className="p-0.5 rounded hover:opacity-80" style={{ color: 'var(--color-text-muted)' }}>
              <X size={12} />
            </button>
          </div>
          {dayCases.map((c) => (
            <div key={c.id} className="text-xs flex items-center gap-2 px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-surface2)' }}>
              <span className="font-medium truncate flex-1" style={{ color: 'var(--color-text)' }}>{sanitizeString(c.nombre || 'Sin nombre')}</span>
              <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{sanitizeString(c.telefono || '')}</span>
            </div>
          ))}
          {dayCases.length === 0 && <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Sin casos registrados</div>}
        </div>
      )}
    </ChartCard>
  );
});
