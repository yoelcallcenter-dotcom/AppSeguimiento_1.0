import React, { useEffect, useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import useAppStore from '../../../core/store/useAppStore';
import { WidgetWrapper } from './WidgetWrapper';
// v1.10.0 (fix): ruta correcta dos niveles arriba (el widget vive en
// features/dashboard/widgets/, no en features/dashboard/).
import {
  getOperatorGoals,
  getOperatorProfile,
  getOperatorAvailability,
  subscribeOperatorGoals,
} from '../../operator/operatorStore';
import { getGoalsHistory } from '../../operator/operatorMetrics';

/**
 * HistorialMetas30 (1.10.0 · feature E)
 * Muestra el cumplimiento de la meta diaria (la primera habilitada:
 * casos → reportes → firmas) en los últimos 30 días HÁBILES.
 *
 * 100% derivado (getGoalsHistory): sin estado nuevo en localStorage. Los días
 * no laborables/vacaciones quedan fuera del conjunto y no penalizan el %
 * (se informan como "excluidos"). Se aplica la meta VIGENTE a toda la
 * ventana, por eso el subtítulo aclara "meta vigente".
 */
const METRIC_LABELS = { cases: 'casos', reports: 'reportes', firmas: 'firmas' };

function Kpi({ label, value }) {
  return (
    <div className="flex flex-col items-center flex-1 min-w-0">
      <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--color-accent)' }}>
        {value}
      </span>
      <span className="text-[10px] text-center leading-tight" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </span>
    </div>
  );
}

const HistorialMetas30 = React.memo(function HistorialMetas30() {
  const cases = useAppStore((s) => s.cases);
  const [goals, setGoals] = useState(() => getOperatorGoals());
  // Refresco en la misma pestaña al editar metas (patrón 1.9.6).
  useEffect(() => subscribeOperatorGoals(() => setGoals(getOperatorGoals())), []);

  const history = useMemo(() => {
    const profile = getOperatorProfile();
    const availability = getOperatorAvailability();
    return getGoalsHistory(goals, cases, 30, {
      workingDays: profile?.workingDays,
      availability,
    });
  }, [goals, cases]);

  if (!history.metrica) {
    return (
      <WidgetWrapper title="Historial de metas (30 días)" icon={TrendingUp}>
        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          No hay metas diarias habilitadas — activarlas en Mi Espacio → Metas.
        </div>
      </WidgetWrapper>
    );
  }

  const label = METRIC_LABELS[history.metrica] || history.metrica;
  const maxPercent = Math.max(100, ...history.dias.map((d) => d.percent));

  return (
    <WidgetWrapper
      title="Historial de metas (30 días)"
      icon={TrendingUp}
      period="Meta vigente"
      empty={history.diasHabiles === 0}
      emptyMessage="Sin días hábiles en la ventana"
    >
      <div className="space-y-4">
        {/* KPIs: días hábiles, cumplidos, % de cumplimiento y promedio. */}
        <div className="flex justify-between gap-2">
          <Kpi label="Días hábiles" value={history.diasHabiles} />
          <Kpi label="Meta cumplida" value={history.diasCumplidos} />
          <Kpi label="% Cumplimiento" value={`${history.pctCumplimiento}%`} />
          <Kpi label={`Promedio (${label})`} value={history.promedio} />
        </div>

        {/* Serie diaria: una barra por día hábil (altura = % de la meta). */}
        <div>
          <div className="flex items-end gap-[2px] h-24">
            {history.dias.map((d) => (
              <div
                key={d.fecha}
                title={`${d.fecha}: ${d.current}/${d.target} ${label}${d.met ? ' — cumplida' : ''}`}
                className="flex-1 rounded-sm transition-all"
                style={{
                  height: `${Math.max(4, Math.round((d.percent / maxPercent) * 100))}%`,
                  backgroundColor: d.met ? 'var(--color-success)' : 'var(--color-accent)',
                  opacity: d.met ? 0.9 : 0.55,
                }}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
            <span>{history.dias[0]?.fecha || ''}</span>
            <span>
              {history.dias[history.dias.length - 1]?.fecha || ''}
              {history.excluidos > 0 ? ` · ${history.excluidos} no laborables/vacaciones excluidos` : ''}
            </span>
          </div>
        </div>

        <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
          Meta diaria de {label} · días no laborables y ausencias no penalizan el cumplimiento.
        </div>
      </div>
    </WidgetWrapper>
  );
});

export { HistorialMetas30 };
