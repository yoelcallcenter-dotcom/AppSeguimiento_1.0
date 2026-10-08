import React, { useEffect, useMemo, useState } from 'react';
import { Target } from 'lucide-react';
import useAppStore from '../../../core/store/useAppStore';
import { WidgetWrapper } from './WidgetWrapper';
// v1.10.0 (fix): ruta correcta dos niveles arriba (el widget vive en
// features/dashboard/widgets/, no en features/dashboard/).
import {
  getOperatorGoals,
  subscribeOperatorGoals,
} from '../../operator/operatorStore';
import {
  getDailyGoalProgress,
  getMonthlyGoalProgress,
} from '../../operator/operatorMetrics';
import { hoyISO } from '../../../utils/dateUtils';

/**
 * MetaFirmasWidget (1.10.0 · feature A)
 * Widget del tab Resumen con la meta de firmas: progreso de HOY
 * (daily.firmas) y del MES EN CURSO (monthly.signed).
 *
 * Fuente de verdad: userOperatorGoals vía operatorStore (mismo criterio que
 * Mi Espacio/LogroObjetivos → sin contadores divergentes). Se suscribe a
 * subscribeOperatorGoals para refrescar en la misma pestaña al editar metas.
 * Fechas en hora local (hoyISO, fix 1.9.7) — nunca toISOString().
 */
function GoalRow({ label, data, unitLabel }) {
  // Meta deshabilitada: se informa cómo activarla (mismo copy que el
  // ProductivityWidget para reportes) en lugar de mostrar una barra en 0.
  if (!data.enabled) {
    return (
      <div className="rounded-lg p-2.5" style={{ backgroundColor: 'var(--color-surface2)' }}>
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{label}</span>
        </div>
        <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
          Meta deshabilitada — activarla en Mi Espacio → Metas
        </span>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{label}</span>
        <span className="text-xs tabular-nums" style={{ color: data.met ? 'var(--color-success)' : 'var(--color-accent)' }}>
          {data.current} / {data.target}
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-surface2)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${data.percent}%`,
            backgroundColor: data.met ? 'var(--color-success)' : 'var(--color-accent)',
          }}
        />
      </div>
      <div className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
        {unitLabel}
      </div>
    </div>
  );
}

const MetaFirmasWidget = React.memo(function MetaFirmasWidget() {
  const cases = useAppStore((s) => s.cases);
  // Estado local de goals: valor inicial + refresco en la misma pestaña.
  const [goals, setGoals] = useState(() => getOperatorGoals());
  useEffect(() => subscribeOperatorGoals(() => setGoals(getOperatorGoals())), []);

  const dayISO = hoyISO();

  const firmasHoy = useMemo(
    () => getDailyGoalProgress(goals, cases, dayISO).firmas,
    [goals, cases, dayISO]
  );

  const firmasMes = useMemo(() => {
    const now = new Date();
    return getMonthlyGoalProgress(goals, cases, now.getFullYear(), now.getMonth()).signed;
  }, [goals, cases]);

  return (
    <WidgetWrapper title="Meta de firmas" icon={Target}>
      <div className="space-y-4">
        <GoalRow label="Hoy" data={firmasHoy} unitLabel="Firmas del día" />
        <GoalRow label="Este mes" data={firmasMes} unitLabel="Firmas del mes en curso" />
      </div>
    </WidgetWrapper>
  );
});

export { MetaFirmasWidget };
