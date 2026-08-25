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
} from 'lucide-react';
import { Btn } from '../../components/common/Btn';

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
        <button
          onClick={onPrev}
          className="p-1.5 rounded-md hover:bg-white/5 transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
          aria-label="Anterior"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={onToday}
          className="px-2 py-1 text-xs font-semibold rounded-md hover:bg-white/5 transition-colors"
          style={{ color: 'var(--color-accent)' }}
        >
          Hoy
        </button>
        <button
          onClick={onNext}
          className="p-1.5 rounded-md hover:bg-white/5 transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
          aria-label="Siguiente"
        >
          <ChevronRight size={18} />
        </button>
        <span
          className="text-sm font-semibold ml-2 capitalize"
          style={{ color: 'var(--color-text)' }}
        >
          {formatTitle()}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div
          className="flex items-center gap-0.5 p-0.5 rounded-md"
          style={{ backgroundColor: 'var(--color-surface)' }}
        >
          {VIEWS.map(v => {
            const Icon = v.icon;
            const isActive = currentView === v.id;
            return (
              <button
                key={v.id}
                onClick={() => onViewChange(v.id)}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors"
                style={{
                  backgroundColor: isActive ? 'var(--color-accent)' : 'transparent',
                  color: isActive ? '#14181F' : 'var(--color-text-muted)',
                }}
              >
                <Icon size={13} />
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            );
          })}
        </div>
        <button
          onClick={onToggleAvailability}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors"
          style={{
            backgroundColor: showAvailability ? 'var(--color-accent)22' : 'var(--color-surface)',
            color: showAvailability ? 'var(--color-accent)' : 'var(--color-text-muted)',
            border: '1px solid var(--color-border)',
          }}
          title="Mostrar / ocultar disponibilidad personal"
        >
          <UserCircle2 size={12} />
          <span className="hidden sm:inline">Disponibilidad</span>
        </button>
        <Btn onClick={onAddEvent} icon={Plus} size="sm">
          Nuevo evento
        </Btn>
      </div>
    </div>
  );
}
