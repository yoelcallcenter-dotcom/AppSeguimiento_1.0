import React from 'react';
import { TrendingUp, TrendingDown, Minus, CalendarDays, PenLine, Percent, Gauge } from 'lucide-react';

function ChipVariacion({ pct, puntos = false }) {
  if (pct === null || pct === undefined) {
    return (
      <span className="text-[10px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
        Sin comparación
      </span>
    );
  }
  const Icon = pct > 0 ? TrendingUp : pct < 0 ? TrendingDown : Minus;
  const color =
    pct > 0 ? 'var(--color-success)' : pct < 0 ? 'var(--color-danger)' : 'var(--color-text-muted)';
  return (
    <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color }}>
      <Icon size={10} aria-hidden="true" />
      {puntos
        ? `${pct > 0 ? '+' : ''}${pct} pts`
        : `${pct > 0 ? '+' : ''}${pct}%`}
      <span className="hidden md:inline font-normal" style={{ color: 'var(--color-text-muted)' }}>
        vs período anterior
      </span>
    </span>
  );
}

/**
 * ResumenPeriodo
 * Franja de resumen analítico del período seleccionado. Todos los valores
 * provienen de computeResumenPeriodo (períodos equivalentes garantizados).
 */
export default function ResumenPeriodo({ resumen }) {
  if (!resumen) return null;

  const mejorDia = resumen.diaSemana?.mejorDia;

  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Período */}
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
            <CalendarDays size={9} aria-hidden="true" /> Período
          </div>
          <div className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{resumen.periodo}</div>
          <div className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
            {resumen.habiles} día(s) hábil(es)
          </div>
        </div>

        {/* Casos */}
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Casos</div>
          <div className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{resumen.casos}</div>
          <ChipVariacion pct={resumen.variacion.casosPct} />
        </div>

        {/* Firmas */}
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
            <PenLine size={9} aria-hidden="true" /> Firmas
          </div>
          <div className="text-sm font-bold" style={{ color: 'var(--color-success)' }}>{resumen.firmas}</div>
          <ChipVariacion pct={resumen.variacion.firmasPct} />
        </div>

        {/* Conversión */}
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
            <Percent size={9} aria-hidden="true" /> Conversión
          </div>
          <div className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{resumen.conversion}%</div>
          {resumen.variacion.conversionPuntos !== null && resumen.previo.conversion !== undefined ? (
            <ChipVariacion pct={resumen.variacion.conversionPuntos} puntos />
          ) : (
            <span className="text-[10px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>Sin comparación</span>
          )}
        </div>

        {/* Promedio diario */}
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
            <Gauge size={9} aria-hidden="true" /> Promedio diario
          </div>
          <div className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
            {String(resumen.promedioDiario).replace('.', ',')}
            <span className="text-[9px] font-medium" style={{ color: 'var(--color-text-muted)' }}> firmas/día</span>
          </div>
          <div className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
            hábil · antes: {String(resumen.previo.promedioDiario).replace('.', ',')}
          </div>
        </div>

        {/* Mejor día */}
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Mejor día</div>
          {mejorDia ? (
            <>
              <div className="text-sm font-bold" style={{ color: 'var(--color-accent)' }}>{mejorDia.label}</div>
              <div className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
                {String(mejorDia.promedio).replace('.', ',')} firmas/día en promedio
              </div>
            </>
          ) : (
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Sin patrón aún</div>
          )}
        </div>
      </div>
    </div>
  );
}
