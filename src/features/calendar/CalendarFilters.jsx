import React, { useMemo } from 'react';
import { Filter, X } from 'lucide-react';
import { MultiSelect } from '../../components/common/MultiSelect';
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

  const limpiar = () => onFiltrosChange(INITIAL_FILTERS);

  const update = (key, values) =>
    onFiltrosChange({ ...filtros, [key]: values });

  return (
    <div
      className="flex flex-wrap items-end gap-3 px-3 py-2 rounded-md"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div className="flex items-center gap-1.5 mr-1">
        <Filter size={13} style={{ color: 'var(--color-text-muted)' }} />
        <span
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Filtros
        </span>
      </div>

      <MultiSelect
        id="cal-estado"
        label="Estado"
        options={estadoOptions}
        value={filtros.estados}
        onChange={(v) => update('estados', v)}
        placeholder="Todos"
      />

      <MultiSelect
        id="cal-prioridad"
        label="Prioridad"
        options={PRIORITY_OPTIONS}
        value={filtros.prioridades}
        onChange={(v) => update('prioridades', v)}
        placeholder="Todas"
      />

      <MultiSelect
        id="cal-aseguradora"
        label="Aseguradora"
        options={aseguradoraOptions}
        value={filtros.aseguradoras}
        onChange={(v) => update('aseguradoras', v)}
        placeholder="Todas"
      />

      <MultiSelect
        id="cal-estudio"
        label="Estudio"
        options={estudioOptions}
        value={filtros.estudios}
        onChange={(v) => update('estudios', v)}
        placeholder="Todos"
      />

      <MultiSelect
        id="cal-tipo"
        label="Tipo"
        options={EVENT_TYPE_OPTIONS}
        value={filtros.tipos}
        onChange={(v) => update('tipos', v)}
        placeholder="Todos"
      />

      {activeCount > 0 && (
        <button
          type="button"
          onClick={limpiar}
          className="flex items-center gap-1 text-[10px] font-medium rounded px-2 py-1 cursor-pointer"
          style={{
            backgroundColor: 'var(--color-danger11, rgba(239,68,68,0.1))',
            color: 'var(--color-danger, #EF4444)',
          }}
        >
          <X size={10} />
          {activeCount} activo{activeCount > 1 ? 's' : ''}
        </button>
      )}
    </div>
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
