import React, { useState } from 'react';
import { Info } from 'lucide-react';

/**
 * ChartCard
 * Contenedor estándar para los widgets gráficos de Analítica. Incluye el mismo
 * botón de descripción oculta (Info) que usa MetricCard en las tarjetas.
 */
export default function ChartCard({ title, icon: Icon, desc, right, children }) {
  const [showDesc, setShowDesc] = useState(false);

  return (
    <div
      className="rounded-xl p-5 animate-fade-in"
      style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon size={18} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />}
        <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{title}</span>
        {right}
        {desc && (
          <button
            type="button"
            onClick={() => setShowDesc((s) => !s)}
            className="p-0.5 rounded hover:opacity-70 transition-opacity ml-auto"
            style={{ color: 'var(--color-text-muted)', cursor: 'pointer' }}
            aria-label={`Descripción de ${title}`}
            title={showDesc ? 'Ocultar descripción' : 'Ver descripción'}
          >
            <Info size={13} />
          </button>
        )}
      </div>
      {showDesc && desc && (
        <div className="text-[11px] mb-3 leading-snug animate-fade-in" style={{ color: 'var(--color-text-muted)' }}>
          {desc}
        </div>
      )}
      {children}
    </div>
  );
}
