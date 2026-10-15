import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  CalendarDays,
  CalendarRange,
  List,
  Plus,
  UserCircle2,
  Filter,
} from 'lucide-react';
// T4a/C03 (1.10.1): toolbar rediseñada sobre componentes comunes.
// - Se agrega BtnOutline (para "Hoy") y FilterChip (chips de vista /
//   disponibilidad); se deja de usar <button> suelto con estilos propios.
// - SubPills → FilterChip en los selectores de vista: mismos tokens y estado
//   activo, pero además expone aria-pressed por chip y conserva el
//   role="group" + aria-label="Vistas del calendario" que ya tenía (los tours
//   y la a11y buscan ese nombre).
// - Todos los controles quedan con animate-press vía Btn y con los mismos
//   aria-label ("Anterior"/"Siguiente") que ya usaban los tests/guías.
// T4c (1.10.1): nuevo chip "Filtros" en la toolbar — el panel de filtros deja
// de estar siempre visible (va oculto por defecto en CalendarView) y se abre
// desde acá. El chip es un FilterChip más (misma forma que Disponibilidad:
// rounded-full, tokens, aria-pressed) con aria-controls hacia el panel y un
// contador "(N)" de filtros activos SOLO cuando hay, para que ocultar el
// panel no esconda que hay filtros aplicados.
import { Btn } from '../../components/common/Btn';
import { BtnOutline } from '../../components/common/BtnOutline';
import { FilterChip } from '../../components/common/filters';

const VIEWS = [
  { id: 'day', label: 'Dia', icon: Calendar },
  { id: 'week', label: 'Semana', icon: CalendarRange },
  { id: 'month', label: 'Mes', icon: CalendarDays },
  { id: 'list', label: 'Lista', icon: List },
];

export default function CalendarToolbar({
  currentView,
  onViewChange,
  currentDate,
  onPrev,
  onNext,
  onToday,
  onAddEvent,
  showAvailability,
  onToggleAvailability,
  // T4c (1.10.1): estado/contador del panel de filtros (default defensivo:
  // callers viejos sin estas props siguen renderizando igual).
  showFilters = false,
  onToggleFilters,
  filtersActive = 0,
}) {
  const formatTitle = () => {
    const d = currentDate;
    switch (currentView) {
      case 'day':
        return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
      case 'week': {
        const start = new Date(d);
        start.setDate(d.getDate() - d.getDay());
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return `${start.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
      }
      case 'month':
        return d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
      case 'list':
        return 'Todos los eventos';
      default:
        return '';
    }
  };

  return (
    <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
      <div className="flex items-center gap-1">
        <Btn
          variant="ghost"
          size="sm"
          icon={ChevronLeft}
          ariaLabel="Anterior"
          onClick={onPrev}
        />
        <BtnOutline size="sm" onClick={onToday}>
          Hoy
        </BtnOutline>
        <Btn
          variant="ghost"
          size="sm"
          icon={ChevronRight}
          ariaLabel="Siguiente"
          onClick={onNext}
        />
        <span
          className="text-sm font-semibold ml-2 capitalize"
          style={{ color: 'var(--color-text)' }}
        >
          {formatTitle()}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {/* T4a/C03 (1.10.1): selectores de vista como FilterChip (chips con
            aria-pressed). Se conserva role="group" y el aria-label exacto que
            tenía SubPills: "Vistas del calendario". */}
        <div
          className="flex flex-wrap items-center gap-1"
          role="group"
          aria-label="Vistas del calendario"
        >
          {VIEWS.map(({ id, label, icon: Icon }) => (
            <FilterChip
              key={id}
              active={currentView === id}
              onClick={() => onViewChange(id)}
            >
              <Icon size={12} aria-hidden="true" />
              <span>{label}</span>
            </FilterChip>
          ))}
        </div>
        <FilterChip
          active={showAvailability}
          onClick={onToggleAvailability}
          title="Mostrar / ocultar disponibilidad personal"
          aria-label="Disponibilidad"
        >
          <UserCircle2 size={12} aria-hidden="true" />
          <span className="hidden sm:inline">Disponibilidad</span>
        </FilterChip>
        {/* T4c (1.10.1): apertura del panel de filtros. Mismo FilterChip que
            los chips vecinos (misma forma, misma altura, aria-pressed) y
            aria-controls/id hacia el panel para que la relación sea explícita.
            SIN aria-label: el nombre accesible lo forma el texto visible
            ("Filtros" / "Filtros (2)"), así el contador también se anuncia;
            el title cubre la descripción. El "(N)" solo aparece con filtros
            activos y va como texto (sin badges de formas nuevas, para no
            romper la consistencia del grupo). */}
        <FilterChip
          active={showFilters}
          onClick={onToggleFilters}
          title="Mostrar u ocultar filtros"
          aria-expanded={showFilters}
          aria-controls="cal-filtros-panel"
        >
          <Filter size={12} aria-hidden="true" />
          {/* Un ÚNICO nodo de texto: el nombre accesible del botón se arma
              con el contenido y con dos spans adyacentes quedaba "Filtros(2)"
              (sin espacio). Así el label visible y el accesible son
              "Filtros" / "Filtros (2)". */}
          <span>{filtersActive > 0 ? `Filtros (${filtersActive})` : 'Filtros'}</span>
        </FilterChip>
        <Btn onClick={onAddEvent} icon={Plus} size="sm">
          Nuevo evento
        </Btn>
      </div>
    </div>
  );
}
