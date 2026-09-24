import React from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import { MultiSelect } from '../../../components/common/MultiSelect';
import { FilterBar, FilterGroup } from '../../../components/common/filters';
import { normalizarValorFiltro } from '../../../context/FiltersContext';

const DIMENSIONES = ['estado', 'aseguradora', 'localidad', 'estudio', 'provincia', 'tipo'];

export default function DashboardFilters({ filters, onChange, options, onReset }) {
  const set = (key) => (vals) => onChange({ ...filters, [key]: vals });

  const fields = [
    { label: 'Estado', key: 'estado', items: options?.estados || [], all: 'Todos los estados' },
    { label: 'Aseguradora', key: 'aseguradora', items: options?.aseguradoras || [], all: 'Todas las aseguradoras' },
    { label: 'Localidad', key: 'localidad', items: options?.localidades || [], all: 'Todas las localidades' },
    { label: 'Estudio', key: 'estudio', items: options?.estudios || [], all: 'Todos los estudios' },
    { label: 'Provincia', key: 'provincia', items: options?.provincias || [], all: 'Todas las provincias' },
    { label: 'Tipo', key: 'tipo', items: options?.tipos || [], all: 'Todos los tipos' },
  ];

  const hasActive = filters && DIMENSIONES.some((k) => normalizarValorFiltro(filters[k]).length > 0);

  return (
    <FilterBar>
      {fields.map((field) => {
        const { label, key, items, all } = field;
        return (
          <FilterGroup key={key} label={label}>
            <MultiSelect
              id={`df-${key}`}
              value={normalizarValorFiltro(filters?.[key])}
              onChange={set(key)}
              options={items.map((v) => ({ value: v, label: v }))}
              placeholder={all}
            />
          </FilterGroup>
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
    </FilterBar>
  );
}
