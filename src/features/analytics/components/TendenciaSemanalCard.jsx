import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import ChartCard from '../../dashboard/widgets/ChartCard';

function TooltipActivo({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-2.5 py-1.5 text-[10px]"
      style={{
        backgroundColor: 'var(--color-surface2)',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text)',
      }}
    >
      <div className="font-semibold">{label}</div>
      <div>{payload[0].value} firma(s)</div>
    </div>
  );
}

/**
 * TendenciaSemanalCard
 * Gráfico de firmas por semana completa (lunes a domingo). La semana en curso
 * se excluye del análisis de tendencia porque aún está incompleta.
 * Requiere al menos 4 semanas para concluir dirección; si no, muestra la serie
 * sin conclusión (integridad analítica).
 */
export default function TendenciaSemanalCard({ tendencia, periodoLabel }) {
  if (!tendencia || !tendencia.puntos?.length) return null;
  const { puntos, tendencia: dir, muestraSuficiente } = tendencia;

  const Icon =
    dir?.direccion === 'ascendente' ? TrendingUp : dir?.direccion === 'descendente' ? TrendingDown : Minus;
  const colorDir =
    dir?.direccion === 'ascendente'
      ? 'var(--color-success)'
      : dir?.direccion === 'descendente'
        ? 'var(--color-danger)'
        : 'var(--color-text-muted)';
  const conclusion = !muestraSuficiente
    ? `Datos insuficientes para concluir (mínimo 4 semanas).`
    : dir?.direccion === 'estable'
      ? 'Sin cambios relevantes entre mitades del período.'
      : dir?.pct !== null && dir?.pct !== undefined
        ? `${dir.direccion === 'ascendente' ? '+' : ''}${dir.pct}% entre la primera y la segunda mitad.`
        : 'La actividad pasó de nula a activa entre mitades.';

  return (
    <ChartCard
      title="Tendencia semanal de firmas"
      icon={TrendingUp}
      desc={`Firmas por semana completa (lunes a domingo) dentro de ${periodoLabel || 'el análisis'}. La semana en curso no se incluye porque está incompleta. ${
        muestraSuficiente
          ? 'La comparación usa el promedio de la primera mitad contra el promedio de la segunda mitad de las semanas.'
          : ''
      }`}
      right={
        muestraSuficiente && (
          <span className="flex items-center gap-1 text-[10px] font-semibold ml-2" style={{ color: colorDir }}>
            <Icon size={11} aria-hidden="true" />
            {dir?.direccion === 'estable'
              ? 'Estable'
              : dir?.pct !== null && dir?.pct !== undefined
                ? `${dir.pct > 0 ? '+' : ''}${dir.pct}%`
                : dir.direccion}
          </span>
        )
      }
    >
      <div style={{ width: '100%', height: 160 }} role="img" aria-label={`Firmas por semana. ${conclusion}`}>
        <ResponsiveContainer>
          <BarChart data={puntos} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }}
              stroke="var(--color-border)"
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} stroke="var(--color-border)" />
            <Tooltip content={<TooltipActivo />} cursor={{ fill: 'var(--color-surface2)' }} />
            <Bar dataKey="firmas" radius={[3, 3, 0, 0]}>
              {puntos.map((p, i) => (
                <Cell key={i} fill="var(--color-accent)" opacity={i === puntos.length - 1 ? 1 : 0.55} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="text-[10px] mt-2 flex items-center gap-1" style={{ color: colorDir }}>
        <Icon size={10} aria-hidden="true" />
        {conclusion}
      </div>
    </ChartCard>
  );
}
