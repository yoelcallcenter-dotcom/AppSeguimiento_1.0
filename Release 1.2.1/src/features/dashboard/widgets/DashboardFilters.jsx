import React from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import { Select } from '../../../components/common/Select';

export default function DashboardFilters({ filters, onChange, options, onReset }) {
  const set = (key) => (e) => onChange({ ...filters, [key]: e.target.value });

  const fields = [
    { label: 'Estado', key: 'estado', items: options?.estados || [], all: 'Todos los estados' },
    { label: 'Estudio', key: 'estudio', items: options?.estudios || [], all: 'Todos los estudios' },
    { label: 'Provincia', key: 'provincia', items: options?.provincias || [], all: 'Todas las provincias' },
    { label: 'Tipo', key: 'tipo', items: options?.tipos || [], all: 'Todos los tipos' },
  ];

  const hasActive =
    filters &&
    (filters.estado !== 'todos' ||
      filters.estudio !== 'todos' ||
      filters.provincia !== 'todos' ||
      filters.tipo !== 'todos');

  return (
    <div className="flex items-end gap-3 flex-wrap">
      {fields.map((field) => {
        const { label, key, items } = field;
        return (
        <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 150 }}>
          <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</label>
          <Select
            value={String(filters?.[key] || 'todos')}
            onChange={set(key)}
            options={[
              { value: 'todos', label: field.all },
              ...items.map((v) => ({ value: v, label: v })),
            ]}
          />
        </div>
        );
      })}
      {hasActive && (
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors"
          style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface2)' }}
        >
          <RotateCcw size={12} />
          Limpiar filtros
        </button>
      )}
      <span className="flex items-center gap-1 text-xs pb-2.5" style={{ color: 'var(--color-text-muted)' }}>
        <Filter size={12} />
        Filtros analíticos
      </span>
    </div>
  );
}
