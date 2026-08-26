import React from 'react';
import { Filter, Users, XCircle, MessageSquare, Eye } from 'lucide-react';

const ACCIONES = [
  { id: 'pendientes', label: 'Pendientes', icon: Users, filter: (c, ctx) => ctx.categorias.contact.includes(c.estado), color: 'var(--color-warning)' },
  { id: 'firmas', label: 'Firmas', icon: Eye, filter: (c, ctx) => ctx.categorias.success.includes(c.estado), color: 'var(--color-success)' },
  { id: 'perdidos', label: 'Perdidos', icon: XCircle, filter: (c, ctx) => ctx.categorias.lost.includes(c.estado), color: 'var(--color-danger)' },
  { id: 'sinReporte', label: 'Sin reporte', icon: MessageSquare, filter: (c) => !c.reporteHistory || c.reporteHistory.length === 0, color: 'var(--color-text-muted)' },
];

export const QuickActions = React.memo(({ casos, categorias, onFilter, activeFilter, onOpen }) => {
  return (
    <div
      className="rounded-xl p-4 animate-fade-in"
      style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Filter size={14} style={{ color: 'var(--color-accent)' }} />
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Acciones rápidas</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {ACCIONES.map((acc) => {
          const count = casos.filter((c) => acc.filter(c, { categorias })).length;
          const isActive = activeFilter === acc.id;
          return (
            <button
              key={acc.id}
              onClick={() => onFilter(isActive ? null : acc.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{
                backgroundColor: isActive ? `${acc.color}22` : 'var(--color-surface2)',
                color: isActive ? acc.color : 'var(--color-text)',
                border: `1px solid ${isActive ? acc.color : 'var(--color-border)'}`,
              }}
            >
              <acc.icon size={12} />
              {acc.label}
              <span className="text-[10px] ml-0.5 opacity-70">({count})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});
