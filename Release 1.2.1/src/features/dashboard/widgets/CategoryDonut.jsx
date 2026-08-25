import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Filter } from 'lucide-react';
import { TOOLTIP_STYLE } from './chartTheme';
import ChartCard from './ChartCard';

const DESC_DEFAULT =
  'Casos según su categoría en el pipeline: activos, firmados, perdidos o sin reporte. Haz clic en una porción para filtrar la tabla.';

const DRILL = {
  activos: { tipo: 'grupo', valor: 'activos' },
  firmas: { tipo: 'grupo', valor: 'firmas' },
  perdidos: { tipo: 'grupo', valor: 'perdidos' },
  sinReporte: { tipo: 'grupo', valor: 'sinreporte' },
};

export default function CategoryDonut({ data, onDrill, desc }) {
  const total = useMemo(
    () => (data || []).reduce((acc, d) => acc + d.value, 0),
    [data]
  );

  const handleClick = (entry) => {
    const drill = DRILL[entry?.key];
    if (drill && onDrill) onDrill(drill);
  };

  return (
    <ChartCard title="Distribución por categoría" icon={Filter} desc={desc || DESC_DEFAULT}>
      {!data || data.length === 0 ? (
        <div className="text-sm py-10 text-center" style={{ color: 'var(--color-text-muted)' }}>Sin datos</div>
      ) : (
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="w-full md:w-1/2" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={80}
                  paddingAngle={2}
                  onClick={handleClick}
                  style={{ cursor: 'pointer', outline: 'none' }}
                >
                  {data.map((d) => (
                    <Cell key={d.key} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value) => [`${value} (${total > 0 ? Math.round((value / total) * 100) : 0}%)`, 'Casos']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full md:w-1/2 space-y-1">
            {data.map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() => handleClick(d)}
                className="w-full flex items-center gap-2 text-xs px-2 py-1 rounded hover:opacity-80 transition-opacity text-left"
                style={{ color: 'var(--color-text)' }}
              >
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                <span className="flex-1 truncate">{d.name}</span>
                <b>{d.value}</b>
                <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  {total > 0 ? Math.round((d.value / total) * 100) : 0}%
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </ChartCard>
  );
}
