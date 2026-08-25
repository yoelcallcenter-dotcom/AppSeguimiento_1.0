import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { MapPin } from 'lucide-react';
import { CHART_TICK, CHART_GRID } from './chartTheme';
import ChartTooltip from './ChartTooltip';
import ChartCard from './ChartCard';

const COLORS = ['#D9A441', '#60A5FA', '#34D399', '#F87171', '#818CF8', '#FBBF24', '#94A3B8', '#F97316', '#E11D48', '#10B981'];
const CURSOR_FILL = 'rgba(148,163,184,0.15)';

const DESC_DEFAULT =
  'Casos por provincia del estudio jurídico, ordenados de mayor a menor. Haz clic en una barra para filtrar la tabla.';

export default React.memo(function ProvinceBars({ data, onDrill, desc }) {
  return (
    <ChartCard title="Casos por provincia" icon={MapPin} desc={desc || DESC_DEFAULT}>
      {!data || data.length === 0 ? (
        <div className="text-sm py-10 text-center" style={{ color: 'var(--color-text-muted)' }}>Sin datos</div>
      ) : (
        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray={CHART_GRID.strokeDasharray} stroke={CHART_GRID.stroke} />
              <XAxis dataKey="key" tick={CHART_TICK} tickLine={false} axisLine={false} interval={0} angle={-25} textAnchor="end" height={60} />
              <YAxis tick={CHART_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                content={<ChartTooltip formatter={(value) => [`${value} casos`, 'Casos']} />}
                cursor={{ fill: CURSOR_FILL }}
              />
              <Bar
                dataKey="total"
                name="Casos"
                radius={[4, 4, 0, 0]}
                onClick={(entry) => onDrill && onDrill({ tipo: 'provincia', valor: entry.key })}
                style={{ cursor: 'pointer', outline: 'none' }}
              >
                {data.map((d, i) => (
                  <Cell key={d.key} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
});
