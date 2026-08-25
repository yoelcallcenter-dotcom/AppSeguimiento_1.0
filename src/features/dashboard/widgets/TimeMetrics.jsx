import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { CHART_TICK, CHART_GRID, TOOLTIP_STYLE, TOOLTIP_LABEL } from './chartTheme';
import ChartCard from './ChartCard';

const fmtFecha = (v) => {
  const [, mm, dd] = String(v || '').split('-');
  return dd && mm ? `${dd}/${mm}` : String(v || '');
};

const DESC_DEFAULT =
  'Evolución diaria de casos ingresados y firmas en los últimos 30 días hábiles. Cada semana se separa con una línea de referencia.';

export default function TimeMetrics({ data, desc }) {
  // Separador vertical al inicio de cada semana nueva (campo `semana`).
  const weekSeparators = (data || []).map((d, i) =>
    i > 0 && data[i - 1].semana !== d.semana ? d : null
  ).filter(Boolean);

  const right = (
    <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Solo días hábiles</span>
  );

  return (
    <ChartCard title="Evolución últimos 30 días" icon={TrendingUp} desc={desc || DESC_DEFAULT} right={right}>
      {!data || data.length === 0 ? (
        <div className="text-sm py-10 text-center" style={{ color: 'var(--color-text-muted)' }}>Sin datos</div>
      ) : (
        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray={CHART_GRID.strokeDasharray} stroke={CHART_GRID.stroke} />
              <XAxis dataKey="fecha" tick={CHART_TICK} tickLine={false} axisLine={false} interval={Math.max(0, Math.floor(data.length / 10))} tickFormatter={fmtFecha} />
              <YAxis tick={CHART_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelStyle={TOOLTIP_LABEL}
                labelFormatter={(v) => {
                  const p = (data || []).find((d) => d.fecha === v);
                  return p ? `Semana ${p.semana} · ${fmtFecha(v)}` : fmtFecha(v);
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: 'var(--color-text-muted)' }} />
              {weekSeparators.map((d) => (
                <ReferenceLine
                  key={`wk-${d.fecha}`}
                  x={d.fecha}
                  stroke="var(--color-accent)"
                  strokeOpacity={0.35}
                  strokeDasharray="4 4"
                  label={{ value: `S${d.semana}`, position: 'insideTopLeft', fill: 'var(--color-text-muted)', fontSize: 9 }}
                />
              ))}
              <Line type="monotone" dataKey="total" name="Casos" stroke="#D9A441" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="firmas" name="Firmas" stroke="#10B981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
