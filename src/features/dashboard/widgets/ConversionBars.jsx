import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Percent } from 'lucide-react';
import { CHART_TICK, CHART_GRID } from './chartTheme';
import ChartTooltip from './ChartTooltip';
import ChartCard from './ChartCard';

const CURSOR_FILL = 'rgba(148,163,184,0.15)';

const barColor = (v) => (v >= 50 ? '#10B981' : v >= 25 ? '#D9A441' : '#EF4444');

/**
 * ConversionBars
 * Compara la tasa de conversión (%) de un grupo (estudio, provincia, etc.).
 * El color de cada barra indica el nivel de conversión. Clic en una barra filtra.
 */
export default function ConversionBars({ data, title, icon: Icon, onDrill, drillField, desc }) {
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
              margin={{ top: 0, right: 24, left: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray={CHART_GRID.strokeDasharray} stroke={CHART_GRID.stroke} horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={CHART_TICK} tickLine={false} axisLine={false} unit="%" />
              <YAxis type="category" dataKey="key" tick={CHART_TICK} tickLine={false} axisLine={false} width={130} />
              <Tooltip
                content={<ChartTooltip formatter={(value) => [`${value}%`, 'Conversión']} />}
                cursor={{ fill: CURSOR_FILL }}
              />
              <ReferenceLine x={50} stroke="var(--color-accent)" strokeDasharray="4 4" strokeOpacity={0.4} />
              <Bar
                dataKey="conversion"
                name="Conversión"
                radius={[0, 4, 4, 0]}
                barSize={20}
                onClick={handleClick}
                style={{ cursor: 'pointer', outline: 'none' }}
              >
                {data.map((d) => (
                  <Cell key={d.key} fill={barColor(d.conversion)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
