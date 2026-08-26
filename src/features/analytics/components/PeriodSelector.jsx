import React from 'react';
import { CalendarRange } from 'lucide-react';
import { PERIODOS } from '../periodUtils';

/**
 * PeriodSelector
 * Selector compacto de período para la capa de Insights. Reutilizable.
 * El valor seleccionado se marca con aria-pressed para accesibilidad.
 */
export default function PeriodSelector({ value, onChange }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <CalendarRange size={13} style={{ color: 'var(--color-text-muted)' }} aria-hidden="true" />
      {PERIODOS.map((p) => {
        const activo = p.id === value;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            aria-pressed={activo}
            className={`text-[10px] font-semibold px-2 py-1 rounded-full transition-opacity hover:opacity-80 whitespace-nowrap ${
              activo ? '' : 'hidden sm:inline-block'
            }`}
            style={{
              backgroundColor: activo ? 'var(--color-accent)' : 'var(--color-surface)',
              color: activo ? '#14181F' : 'var(--color-text-muted)',
              border: `1px solid ${activo ? 'var(--color-accent)' : 'var(--color-border)'}`,
            }}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
