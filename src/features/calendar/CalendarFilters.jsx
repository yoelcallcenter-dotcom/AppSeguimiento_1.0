import React, { useMemo } from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import { MultiSelect } from '../../components/common/MultiSelect';
import { FilterBar, FilterGroup, FilterCounter } from '../../components/common/filters';
import { getEstados } from '../../utils/catalogos';
import { EVENT_TYPES } from './calendarStore';

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
];

const EVENT_TYPE_OPTIONS = [
  { value: EVENT_TYPES.MANUAL, label: 'Manual' },
  { value: EVENT_TYPES.CITA, label: 'Cita' },
  { value: EVENT_TYPES.REPROGRAMACION, label: 'Reprogramación' },
];

const INITIAL_FILTERS = {
  estados: [],
  prioridades: [],
  aseguradoras: [],
  estudios: [],
  tipos: [],
};

export function CalendarFilters({ events = [], config, filtros, onFiltrosChange }) {
  const activeCount =
    filtros.estados.length +
    filtros.prioridades.length +
    filtros.aseguradoras.length +
    filtros.estudios.length +
    filtros.tipos.length;

  const estadoOptions = useMemo(
    () => getEstados(config).map((e) => ({ value: e.v, label: e.v })),
    [config]
  );

  const aseguradoraOptions = useMemo(() => {
    const set = new Set();
    events.forEach((e) => {
      const ctx = e.caseContext;
      if (ctx?.aseguradora) set.add(ctx.aseguradora);
    });
    return Array.from(set)
      .sort()
      .map((a) => ({ value: a, label: a }));
  }, [events]);

  const estudioOptions = useMemo(() => {
    const set = new Set();
    events.forEach((e) => {
      const ctx = e.caseContext;
      if (ctx?.estudioJuridico) set.add(ctx.estudioJuridico);
    });
    return Array.from(set)
      .sort()
      .map((a) => ({ value: a, label: a }));
  }, [events]);

  const total = useMemo(
    () => filtrarEventos(events, filtros).length,
    [events, filtros]
  );

  const limpiar = () => onFiltrosChange(INITIAL_FILTERS);

  const update = (key, values) =>
    onFiltrosChange({ ...filtros, [key]: values });

  const fields = [
    { label: 'Estado', key: 'estados', options: estadoOptions, all: 'Todos' },
    { label: 'Prioridad', key: 'prioridades', options: PRIORITY_OPTIONS, all: 'Todas' },
    { label: 'Aseguradora', key: 'aseguradoras', options: aseguradoraOptions, all: 'Todas' },
    { label: 'Estudio', key: 'estudios', options: estudioOptions, all: 'Todos' },
    { label: 'Tipo', key: 'tipos', options: EVENT_TYPE_OPTIONS, all: 'Todos' },
  ];

  return (
    <FilterBar
      className="px-3 py-2 rounded-md"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        marginBottom: 0,
      }}
    >
      <span
        className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider pb-2.5"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <Filter size={12} />
        Filtros
      </span>

      {fields.map((field) => (
        <FilterGroup
          key={field.key}
          label={field.label}
          style={{ flex: '1 1 150px' }}
        >
          <MultiSelect
            id={`cal-${field.key}`}
            options={field.options}
            value={filtros[field.key]}
            onChange={(v) => update(field.key, v)}
            placeholder={field.all}
          />
        </FilterGroup>
      ))}

      <button
        type="button"
        onClick={limpiar}
        disabled={activeCount === 0}
        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          color: 'var(--color-text-muted)',
          border: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface2)',
        }}
      >
        <RotateCcw size={12} />
        Limpiar filtros
      </button>

      <FilterCounter total={total} label="evento" />
    </FilterBar>
  );
}

export function filtrarEventos(events, filtros) {
  if (
    !filtros.estados.length &&
    !filtros.prioridades.length &&
    !filtros.aseguradoras.length &&
    !filtros.estudios.length &&
    !filtros.tipos.length
  ) {
    return events;
  }
  return events.filter((evt) => {
    if (filtros.estados.length) {
      const ctxEstado = evt.caseContext?.estado;
      if (!ctxEstado || !filtros.estados.includes(ctxEstado)) return false;
    }
    if (filtros.prioridades.length && !filtros.prioridades.includes(evt.priority)) {
      return false;
    }
    if (filtros.aseguradoras.length) {
      const ctxAseg = evt.caseContext?.aseguradora;
      if (!ctxAseg || !filtros.aseguradoras.includes(ctxAseg)) return false;
    }
    if (filtros.estudios.length) {
      const ctxEst = evt.caseContext?.estudioJuridico;
      if (!ctxEst || !filtros.estudios.includes(ctxEst)) return false;
    }
    if (filtros.tipos.length && !filtros.tipos.includes(evt.eventType)) {
      return false;
    }
    return true;
  });
}

export default CalendarFilters;
