import React from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { CalendarRange } from 'lucide-react';
import { CHART_TICK, CHART_GRID } from './chartTheme';
import ChartTooltip from './ChartTooltip';
import ChartCard from './ChartCard';

const CURSOR_FILL = 'rgba(148,163,184,0.15)';

const DESC_DEFAULT =
  'Casos ingresados y firmas acumuladas por semana (últimos 30 días hábiles), con la tasa de conversión semanal.';

/**
 * WeeklyTrend
 * Barras (casos y firmas) + línea de conversión (%) por semana.
 */
export default function WeeklyTrend({ data, desc }) {
  const d = data || [];

  return (
    <ChartCard title="Evolución semanal" icon={CalendarRange} desc={desc || DESC_DEFAULT}>
      {d.length === 0 ? (
        <div className="text-sm py-10 text-center" style={{ color: 'var(--color-text-muted)' }}>Sin datos</div>
      ) : (
        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={d} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray={CHART_GRID.strokeDasharray} stroke={CHART_GRID.stroke} />
              <XAxis dataKey="label" tick={CHART_TICK} tickLine={false} axisLine={false} />
              <YAxis yAxisId="izq" tick={CHART_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis yAxisId="der" orientation="right" domain={[0, 100]} tick={CHART_TICK} tickLine={false} axisLine={false} unit="%" />
              <Tooltip
                content={<ChartTooltip formatter={(value, name) => (name === 'Conversión' ? [`${value}%`, name] : [String(value), name])} />}
                cursor={{ fill: CURSOR_FILL }}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: 'var(--color-text-muted)' }} />
              <ReferenceLine yAxisId="der" y={50} stroke="var(--color-accent)" strokeDasharray="4 4" strokeOpacity={0.35} />
              <Bar yAxisId="izq" dataKey="total" name="Casos" fill="#D9A441" radius={[4, 4, 0, 0]} barSize={18} />
              <Bar yAxisId="izq" dataKey="firmas" name="Firmas" fill="#10B981" radius={[4, 4, 0, 0]} barSize={18} />
              <Line yAxisId="der" type="monotone" dataKey="conversion" name="Conversión" stroke="#818CF8" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
