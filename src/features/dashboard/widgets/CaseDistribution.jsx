import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { CircleDot } from 'lucide-react';
import { TOOLTIP_STYLE } from './chartTheme';
import ChartCard from './ChartCard';

const MAX_SLICES = 10;

const DESC_DEFAULT =
  'Distribución de casos según su estado en el pipeline. Haz clic en una porción o en una etiqueta para filtrar la tabla.';

export default function CaseDistribution({ data, onDrill, desc }) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const sorted = [...data].sort((a, b) => b.value - a.value);
    if (sorted.length <= MAX_SLICES) return sorted;
    const top = sorted.slice(0, MAX_SLICES - 1);
    const rest = sorted.slice(MAX_SLICES - 1);
    const otros = rest.reduce((acc, r) => acc + r.value, 0);
    return [...top, { name: 'Otros', value: otros, color: '#94A3B8' }];
  }, [data]);

  const total = chartData.reduce((acc, d) => acc + d.value, 0);

  return (
    <ChartCard title="Distribución por estado" icon={CircleDot} desc={desc || DESC_DEFAULT}>
      {chartData.length === 0 ? (
        <div className="text-sm py-10 text-center" style={{ color: 'var(--color-text-muted)' }}>Sin datos</div>
      ) : (
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="w-full md:w-1/2" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={80}
                  paddingAngle={2}
                  onClick={(entry) => onDrill && entry?.name !== 'Otros' && onDrill({ tipo: 'estado', valor: entry.name })}
                  style={{ cursor: 'pointer', outline: 'none' }}
                >
                  {chartData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value) => [`${value} (${total > 0 ? Math.round((value / total) * 100) : 0}%)`, 'Casos']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full md:w-1/2 space-y-1 max-h-[220px] overflow-y-auto">
            {chartData.map((d) => (
              <button
                key={d.name}
                type="button"
                onClick={() => d.name !== 'Otros' && onDrill && onDrill({ tipo: 'estado', valor: d.name })}
                className="w-full flex items-center gap-2 text-xs px-2 py-1 rounded hover:opacity-80 transition-opacity text-left"
                style={{ color: 'var(--color-text)' }}
              >
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                <span className="flex-1 truncate">{d.name}</span>
                <b>{d.value}</b>
              </button>
            ))}
          </div>
        </div>
      )}
    </ChartCard>
  );
}
