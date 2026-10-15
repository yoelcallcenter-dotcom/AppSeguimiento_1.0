import React, { useMemo } from 'react';
import { RotateCcw } from 'lucide-react';
import { Btn } from '../../components/common/Btn';
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
    // T4c/C03 (1.10.1): panel COMPACTO y con identidad propia.
    // - Se elimina la cabecera "FILTROS" con icono: ya la tiene el chip de la
    //   toolbar que abre este panel (ahí vive la etiqueta, no acá).
    // - role="group" + nombre propio: el panel es referenciable por
    //   aria-controls (chip "Filtros") y por los tests.
    // - Fila única: cada grupo baja a flex-basis 118px (MultiSelect acepta
    //   minWidth configurable) para que los 5 grupos + Limpiar + Total quepan
    //   sin cortar palabras; el gap sigue siendo el gap-3 del FilterBar
    //   compartido (mismo espaciado que el resto de las barras de la app, sin
    //   superposiciones). Si el ancho físico no alcanza, el wrap del
    //   FilterBar mueve grupos ENTEROS a la segunda fila (nunca parten
    //   controles ni texto).
    <FilterBar
      role="group"
      aria-label="Filtros del calendario"
      className="px-3 py-2 rounded-md"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        marginBottom: 0,
      }}
    >
      {fields.map((field) => (
        <FilterGroup
          key={field.key}
          label={field.label}
          style={{ flex: '1 1 118px', minWidth: 118 }}
        >
          <MultiSelect
            id={`cal-${field.key}`}
            options={field.options}
            value={filtros[field.key]}
            onChange={(v) => update(field.key, v)}
            placeholder={field.all}
            minWidth={118}
          />
        </FilterGroup>
      ))}

      {/* T4a/C03 (1.10.1): "Limpiar filtros" pasa de <button> crudo a Btn
          (componente común, animate-press + variant outline = mismo aspecto
          neutral que antes: fondo transparente/borde --color-border).
          T4c (1.10.1): pasa a SOLO icono (igual que Anterior/Siguiente de la
          misma toolbar) para que la fila sea de un solo nivel; el nombre
          accesible "Limpiar filtros" (aria-label) y el title se conservan —
          los cubre CalendarFilters.test.jsx. */}
      <Btn
        type="button"
        onClick={limpiar}
        disabled={activeCount === 0}
        size="sm"
        variant="outline"
        icon={RotateCcw}
        ariaLabel="Limpiar filtros"
        title="Limpiar filtros"
      />

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
