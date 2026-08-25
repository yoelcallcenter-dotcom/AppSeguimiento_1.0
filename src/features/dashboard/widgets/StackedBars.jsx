import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CHART_TICK, CHART_GRID } from './chartTheme';
import ChartTooltip from './ChartTooltip';
import ChartCard from './ChartCard';

const CURSOR_FILL = 'rgba(148,163,184,0.15)';

const SERIES = [
  { dataKey: 'success', name: 'Firmados', color: '#10B981' },
  { dataKey: 'contact', name: 'En contacto', color: '#60A5FA' },
  { dataKey: 'pending', name: 'Pendientes', color: '#FBBF24' },
  { dataKey: 'lost', name: 'Perdidos', color: '#EF4444' },
];

/**
 * StackedBars
 * Barras horizontales apiladas por categoría del pipeline (firmados, en
 * contacto, pendientes, perdidos) para un campo de agrupación genérico
 * (aseguradora, localidad, tipo de ingreso, etc.). Clic en una barra filtra.
 */
export default function StackedBars({ data, title, icon: Icon, onDrill, drillField, desc }) {
  const CATS = [...SERIES];

  const handleClick = (entry) => {
    if (entry && onDrill && drillField) onDrill({ tipo: drillField, valor: entry.key });
  };

  return (
    <ChartCard title={title} icon={Icon} desc={desc}>
      {!data || data.length === 0 ? (
        <div className="text-sm py-10 text-center" style={{ color: 'var(--color-text-muted)' }}>Sin datos</div>
      ) : (
        <div style={{ height: Math.max(200, data.length * 42) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray={CHART_GRID.strokeDasharray} stroke={CHART_GRID.stroke} horizontal={false} />
              <XAxis type="number" tick={CHART_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="key" tick={CHART_TICK} tickLine={false} axisLine={false} width={130} />
              <Tooltip
                content={<ChartTooltip labelFormatter={(l) => l} formatter={(value) => [String(value), 'casos']} />}
                cursor={{ fill: CURSOR_FILL }}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: 'var(--color-text-muted)' }} />
              {CATS.map((s) => (
                <Bar
                  key={s.dataKey}
                  dataKey={s.dataKey}
                  name={s.name}
                  stackId="a"
                  fill={s.color}
                  barSize={20}
                  radius={[0, 0, 0, 0]}
                  onClick={handleClick}
                  style={{ cursor: 'pointer', outline: 'none' }}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
