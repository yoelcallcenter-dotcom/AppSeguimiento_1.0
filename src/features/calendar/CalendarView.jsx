import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar } from 'lucide-react';
import { useCalendarService } from './calendarService';
import {
  createEvent,
  updateEvent,
  deleteEvent,
  getEventsByMonth,
  getEventsByDateRange,
  getAllEvents,
} from './calendarStore';
import CalendarToolbar from './CalendarToolbar';
import EventModal from './EventModal';
import TagsPills from '../../components/common/TagsPills';
import { EmptyState } from '../../components/common/EmptyState';
import { getAllNotes } from '../notes/notesStore';
import { reportError } from '../../core/error/reportError';
import useAppStore from '../../core/store/useAppStore';
import { getOperatorAvailability, getOperatorSettings } from '../operator/operatorStore';
import { getAvailabilityOn } from '../operator/operatorMetrics';
import { getEstadoAccent } from '../../utils/catalogos';
import { toLocalDateStr } from '../../utils/dateUtils';
import { EVENT_TYPES } from './calendarStore';

const PRIORITY_COLORS = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#EF4444',
};

// Etiquetas de tipo de evento (Sistema de Citas, 1.5.0)
const EVENT_TYPE_LABELS = {
  [EVENT_TYPES.CITA]: { label: 'Cita', key: 'cita' },
  [EVENT_TYPES.REPROGRAMACION]: { label: 'Reprog.', key: 'reprog' },
  [EVENT_TYPES.MANUAL]: null,
};

// Resuelve el color de un evento: prioridad como color principal, estado del caso como indicador secundario.
function resolveEventColor(evt, casos, config) {
  const priorityColor = PRIORITY_COLORS[evt.priority] || PRIORITY_COLORS.medium;
  if (evt.caseContext && evt.caseContext.estado) {
    return priorityColor;
  }
  const linkedCaseId = Array.isArray(evt.relatedCaseIds) ? evt.relatedCaseIds[0] : null;
  if (linkedCaseId) {
    const c = (casos || []).find((x) => x.id === linkedCaseId);
    if (c && c.estado) return priorityColor;
  }
  return priorityColor;
}

// Resuelve el color del estado del caso vinculado (indicador secundario).
function resolveCaseStateColor(evt, casos, config) {
  if (evt.caseContext && evt.caseContext.estado) {
    return getEstadoAccent(config, evt.caseContext.estado);
  }
  const linkedCaseId = Array.isArray(evt.relatedCaseIds) ? evt.relatedCaseIds[0] : null;
  if (linkedCaseId) {
    const c = (casos || []).find((x) => x.id === linkedCaseId);
    if (c && c.estado) return getEstadoAccent(config, c.estado);
  }
  return null;
}

// Muestra la etiqueta de tipo de evento en texto corto (para pills).
function eventTypeBadge(evt) {
  const info = EVENT_TYPE_LABELS[evt.eventType];
  if (!info) return null;
  return (
    <span
      className="inline-block text-[9px] font-bold uppercase tracking-wide mr-1 align-middle"
      style={{ opacity: 0.9 }}
    >
      [{info.label}]
    </span>
  );
}

const AVAILABILITY_COLORS = {
  vacation: 'var(--color-accent)',
  holiday: 'var(--color-warning)',
  absence: 'var(--color-danger)',
  dayOff: 'var(--color-text-muted)',
};

const AVAILABILITY_LABELS = {
  vacation: 'Vacaciones',
  holiday: 'Feriado',
  absence: 'Inasistencia',
  dayOff: 'Día no laborable',
};

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
const DIAS_SEMANA_CORTO = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function formatTime(isoStr) {
  if (!isoStr) return '';
  const parts = isoStr.split('T');
  if (parts.length < 2) return '';
  return parts[1].slice(0, 5);
}

function formatDate(isoStr) {
  if (!isoStr) return '';
  return isoStr.slice(0, 10);
}

function isSameDay(a, b) {
  return a.slice(0, 10) === b.slice(0, 10);
}

export default function CalendarView({ showToast, onClose, casos = [], config, onVerCaso }) {
  const [view, setView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [notes, setNotes] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [availability] = useState(() => getOperatorAvailability());
  const [operatorSettings] = useState(() => getOperatorSettings());
  const [showAvailability, setShowAvailability] = useState(() => {
    const s = getOperatorSettings();
    return s.showAvailabilityInCalendar !== false;
  });

  const { checkUpcomingEvents } = useCalendarService();

  const loadEvents = useCallback(async () => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      let data;
      if (view === 'month') {
        data = await getEventsByMonth(year, month);
      } else if (view === 'list') {
        data = await getAllEvents();
      } else {
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0);
        data = await getEventsByDateRange(start.toISOString(), end.toISOString());
      }
      setEvents(data);
    } catch (error) {
      reportError(error, { operation: 'loadEvents' });
    } finally {
      setLoading(false);
    }
  }, [view, currentDate]);

  const loadNotes = useCallback(async () => {
    try {
      const data = await getAllNotes();
      setNotes(data);
    } catch (error) {
      reportError(error, { operation: 'loadNotes' });
    }
  }, []);

  useEffect(() => {
    loadEvents();
    loadNotes();
  }, [loadEvents, loadNotes]);

  useEffect(() => {
    const interval = setInterval(() => {
      checkUpcomingEvents();
    }, 60000);
    checkUpcomingEvents();
    return () => clearInterval(interval);
  }, [checkUpcomingEvents]);

  const eventsByDate = useMemo(() => {
    const map = {};
    for (const e of events) {
      const key = formatDate(e.startDate);
      if (!map[key]) map[key] = [];
      map[key].push(e);
    }
    return map;
  }, [events]);

  const navigate = useCallback((dir) => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      if (view === 'day') d.setDate(d.getDate() + dir);
      else if (view === 'week') d.setDate(d.getDate() + dir * 7);
      else if (view === 'month') d.setMonth(d.getMonth() + dir);
      return d;
    });
  }, [view]);

  const goToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const handleSaveEvent = useCallback(async (form) => {
    try {
      if (editingEvent) {
        await updateEvent(editingEvent.id, form);
        showToast('Evento actualizado', 'success');
      } else {
        const evt = await createEvent(form);
        if (evt.relatedNoteId) {
          showToast('Evento creado y vinculado a nota', 'success');
        } else {
          showToast('Evento creado', 'success');
        }
      }
      setModalOpen(false);
      setEditingEvent(null);
      loadEvents();
      useAppStore.getState().loadEvents();
    } catch (error) {
      showToast('Error al guardar el evento', 'error');
    }
  }, [editingEvent, showToast, loadEvents]);

  const handleEditEvent = useCallback((event) => {
    setEditingEvent(event);
    setModalOpen(true);
  }, []);

  const handleDeleteEvent = useCallback(async (id) => {
    try {
      await deleteEvent(id);
      showToast('Evento eliminado', 'info');
      setModalOpen(false);
      setEditingEvent(null);
      loadEvents();
      useAppStore.getState().loadEvents();
    } catch (error) {
      showToast('Error al eliminar el evento', 'error');
    }
  }, [showToast, loadEvents]);

  const handleAddEvent = useCallback(() => {
    setEditingEvent(null);
    setModalOpen(true);
  }, []);

  const handleEventDrop = useCallback(async (eventId, newDateStr) => {
    try {
      const event = events.find(e => e.id === eventId);
      if (!event) return;
      const oldStart = event.startDate;
      const newStart = newStartDate(oldStart, newDateStr);
      const newEnd = event.endDate ? newStartDate(event.endDate, newDateStr) : null;
      await updateEvent(eventId, { startDate: newStart, endDate: newEnd });
      showToast('Evento movido', 'success');
      loadEvents();
      useAppStore.getState().loadEvents();
    } catch (error) {
      showToast('Error al mover el evento', 'error');
    }
  }, [events, showToast, loadEvents]);

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const todayStr = toLocalDateStr(new Date());

    const cells = [];
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} className="p-1" />);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = eventsByDate[dateStr] || [];
      const isToday = dateStr === todayStr;
      const avail = showAvailability ? getAvailabilityOn(availability, dateStr) : null;
      const availState = avail
        ? avail.vacation
          ? { key: 'vacation', ...avail.vacation }
          : avail.holiday
            ? { key: 'holiday', ...avail.holiday }
            : avail.absence
              ? { key: 'absence', ...avail.absence }
              : avail.dayOff
                ? { key: 'dayOff', ...avail.dayOff }
                : null
        : null;

      cells.push(
        <div
          key={dateStr}
          className="rounded-md p-1 min-h-[80px] cursor-pointer transition-colors hover:bg-white/5"
          style={{
            backgroundColor: isToday
              ? 'var(--color-accent)11'
              : availState
                ? AVAILABILITY_COLORS[availState.key] + '11'
                : 'var(--color-surface)',
            border: `1px solid ${isToday ? 'var(--color-accent)' : availState ? AVAILABILITY_COLORS[availState.key] + '55' : 'var(--color-border)'}`,
          }}
          onClick={() => {
            setCurrentDate(new Date(year, month, day));
            setView('day');
          }}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault();
            const eventId = e.dataTransfer.getData('text/plain');
            if (eventId) handleEventDrop(eventId, dateStr);
          }}
        >
          <span
            className="text-xs font-semibold"
            style={{
              color: isToday ? 'var(--color-accent)' : 'var(--color-text-muted)',
            }}
          >
            {day}
          </span>
          {availState && (
            <div
              className="text-[9px] px-1 py-0.5 rounded mt-0.5 truncate font-semibold"
              style={{
                backgroundColor: AVAILABILITY_COLORS[availState.key] + '22',
                color: AVAILABILITY_COLORS[availState.key],
              }}
              title={AVAILABILITY_LABELS[availState.key]}
            >
              {AVAILABILITY_LABELS[availState.key]}
            </div>
          )}
          <div className="space-y-0.5 mt-0.5">
            {dayEvents.slice(0, 3).map(evt => {
              const color = resolveEventColor(evt, casos, config);
              const caseColor = resolveCaseStateColor(evt, casos, config);
              const cancelled = evt.status === 'cancelled';
              return (
                <div
                  key={evt.id}
                  draggable
                  onDragStart={e => e.dataTransfer.setData('text/plain', evt.id)}
                  onClick={e => { e.stopPropagation(); handleEditEvent(evt); }}
                  className={`text-[10px] px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 ${cancelled ? 'line-through' : ''}`}
                  style={{
                    backgroundColor: color + '33',
                    color,
                    borderLeft: `2px solid ${color}`,
                    opacity: cancelled ? 0.6 : 1,
                  }}
                >
                  {caseColor && <span className="inline-block w-1.5 h-1.5 rounded-full mr-0.5 align-middle" style={{ backgroundColor: caseColor }} />}
                  {formatTime(evt.startDate)} {eventTypeBadge(evt)} {evt.title}
                </div>
              );
            })}
            {dayEvents.length > 3 && (
              <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                +{dayEvents.length - 3} mas
              </span>
            )}
          </div>
        </div>
      );
    }
    return cells;
  };

  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    const todayStr = toLocalDateStr(new Date());
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d);
    }

    return (
      <div className="grid grid-cols-7 gap-1 flex-1">
        {days.map((d, idx) => {
          const dateStr = toLocalDateStr(d);
          const dayEvents = eventsByDate[dateStr] || [];
          const isToday = dateStr === todayStr;
          return (
            <div
              key={idx}
              className="flex flex-col rounded-md p-1"
              style={{
                backgroundColor: isToday ? 'var(--color-accent)11' : 'var(--color-surface2)',
                border: `1px solid ${isToday ? 'var(--color-accent)' : 'var(--color-border)'}`,
              }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const eventId = e.dataTransfer.getData('text/plain');
                if (eventId) handleEventDrop(eventId, dateStr);
              }}
            >
              <div className="text-center mb-1">
                <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  {DIAS_SEMANA[idx]}
                </div>
                <div
                  className="text-sm font-bold"
                  style={{ color: isToday ? 'var(--color-accent)' : 'var(--color-text)' }}
                >
                  {d.getDate()}
                </div>
              </div>
              <div className="space-y-0.5 overflow-y-auto flex-1">
                {dayEvents.map(evt => {
                  const color = resolveEventColor(evt, casos, config);
                  const caseColor = resolveCaseStateColor(evt, casos, config);
                  const cancelled = evt.status === 'cancelled';
                  return (
                    <div
                      key={evt.id}
                      draggable
                      onDragStart={e => e.dataTransfer.setData('text/plain', evt.id)}
                      onClick={() => handleEditEvent(evt)}
                      className={`text-[10px] px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 ${cancelled ? 'line-through' : ''}`}
                      style={{
                        backgroundColor: color + '33',
                        color,
                        borderLeft: `2px solid ${color}`,
                        opacity: cancelled ? 0.6 : 1,
                      }}
                    >
                      {caseColor && <span className="inline-block w-1.5 h-1.5 rounded-full mr-0.5 align-middle" style={{ backgroundColor: caseColor }} />}
                      {formatTime(evt.startDate)} {eventTypeBadge(evt)} {evt.title}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDayView = () => {
    const dateStr = toLocalDateStr(currentDate);
    const dayEvents = eventsByDate[dateStr] || [];
    const todayStr = toLocalDateStr(new Date());
    const isToday = dateStr === todayStr;

    const hours = [];
    for (let h = 0; h < 24; h++) {
      const hourStr = `${String(h).padStart(2, '0')}:00`;
      const hourEvents = dayEvents.filter(e => {
        const eh = formatTime(e.startDate);
        return eh && eh.startsWith(String(h).padStart(2, '0'));
      });

      hours.push(
        <div
          key={h}
          className="flex border-t min-h-[48px]"
          style={{ borderColor: 'var(--color-border)' }}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault();
            const eventId = e.dataTransfer.getData('text/plain');
            if (eventId) {
              const newDateStr = `${dateStr}T${hourStr}:00`;
              handleEventDrop(eventId, newDateStr);
            }
          }}
        >
          <div
            className="w-14 text-[10px] pt-1 pr-2 text-right flex-shrink-0"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {hourStr}
          </div>
          <div className="flex-1 relative min-h-[48px] p-0.5 space-y-0.5">
            {hourEvents.map(evt => {
              const color = resolveEventColor(evt, casos, config);
              const caseColor = resolveCaseStateColor(evt, casos, config);
              const cancelled = evt.status === 'cancelled';
              return (
                <div
                  key={evt.id}
                  draggable
                  onDragStart={e => e.dataTransfer.setData('text/plain', evt.id)}
                  onClick={() => handleEditEvent(evt)}
                  className={`text-xs px-2 py-1 rounded cursor-pointer hover:opacity-80 ${cancelled ? 'line-through' : ''}`}
                  style={{
                    backgroundColor: color + '33',
                    color,
                    borderLeft: `3px solid ${color}`,
                    opacity: cancelled ? 0.6 : 1,
                  }}
                >
                  <div className="font-semibold flex items-center gap-1">
                    {caseColor && <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: caseColor }} />}
                    {eventTypeBadge(evt)}
                    <span className="truncate">{evt.title}</span>
                  </div>
                  {evt.caseContext && evt.caseContext.nombre && (
                    <div className="text-[10px] opacity-80 truncate" style={{ color }}>
                      {evt.caseContext.nombre}
                    </div>
                  )}
                  {evt.description && (
                    <div className="text-[10px] opacity-70 truncate">{evt.description}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div
        className="rounded-md p-3 overflow-y-auto"
        style={{
          backgroundColor: isToday ? 'var(--color-accent)11' : 'var(--color-surface)',
          border: `1px solid ${isToday ? 'var(--color-accent)' : 'var(--color-border)'}`,
        }}
      >
        <div className="text-center mb-3">
          <div className="text-lg font-bold" style={{ color: isToday ? 'var(--color-accent)' : 'var(--color-text)' }}>
            {currentDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {dayEvents.length} evento{dayEvents.length !== 1 ? 's' : ''}
          </div>
        </div>
        {dayEvents.length === 0 && (
          <div className="text-center py-8 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Sin eventos para esta fecha
          </div>
        )}
        {hours}
      </div>
    );
  };

  const renderListView = () => {
    if (events.length === 0) {
      return (
        <EmptyState icon={Calendar} message="No hay eventos registrados" size="md" />
      );
    }

    const sorted = [...events].sort((a, b) => a.startDate.localeCompare(b.startDate));
    const rawEventsById = new Map(events.map((e) => [e.id, e]));
    return (
      <div className="space-y-1">
        {sorted.map(evt => {
          const color = resolveEventColor(evt, casos, config);
          const caseColor = resolveCaseStateColor(evt, casos, config);
          const cancelled = evt.status === 'cancelled';
          const original = evt.originalEventId ? rawEventsById.get(evt.originalEventId) : null;
          return (
            <div
              key={evt.id}
              className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${cancelled ? 'opacity-60' : ''}`}
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderLeft: `3px solid ${color}`,
              }}
              onClick={() => handleEditEvent(evt)}
            >
              <div className="text-xs text-center min-w-[40px]">
                <div style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                  {new Date(evt.startDate).getDate()}
                </div>
                <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  {new Date(evt.startDate).toLocaleDateString('es-AR', { month: 'short' })}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate flex items-center gap-1.5" style={{ color: 'var(--color-text)' }}>
                  {caseColor && <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: caseColor }} />}
                  {eventTypeBadge(evt)}
                  <span className={`truncate ${cancelled ? 'line-through' : ''}`}>{evt.title}</span>
                </div>
                {evt.caseContext && (evt.caseContext.nombre || evt.caseContext.aseguradora || evt.caseContext.estudio) && (
                  <div className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                    {[evt.caseContext.nombre, evt.caseContext.aseguradora, evt.caseContext.estudio]
                      .filter(Boolean).join(' · ')}
                  </div>
                )}
                {evt.description && (
                  <div className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                    {evt.description}
                  </div>
                )}
                {evt.eventType === EVENT_TYPES.REPROGRAMACION && original && (
                  <div className="text-[10px] truncate" style={{ color }}>
                    Reprograma: {original.title}
                  </div>
                )}
                {(evt.tags || []).length > 0 && (
                  <TagsPills tags={evt.tags} size="xs" showHash />
                )}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: color + '22',
                    color,
                  }}
                >
                  {evt.priority === 'low' ? 'Baja' : evt.priority === 'high' ? 'Alta' : 'Media'}
                </span>
                {formatTime(evt.startDate) && (
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {formatTime(evt.startDate)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-t-transparent rounded-full" style={{ borderColor: 'var(--color-accent)' }} />
        </div>
      );
    }

    switch (view) {
      case 'month':
        return (
          <div className="grid grid-cols-7 gap-1">
            {DIAS_SEMANA.map(d => (
              <div key={d} className="text-center text-[10px] font-semibold py-1" style={{ color: 'var(--color-text-muted)' }}>
                {d}
              </div>
            ))}
            {renderMonthView()}
          </div>
        );
      case 'week':
        return renderWeekView();
      case 'day':
        return renderDayView();
      case 'list':
        return renderListView();
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <CalendarToolbar
        currentView={view}
        onViewChange={setView}
        currentDate={currentDate}
        onPrev={() => navigate(-1)}
        onNext={() => navigate(1)}
        onToday={goToday}
        onAddEvent={handleAddEvent}
        showAvailability={showAvailability}
        onToggleAvailability={() => setShowAvailability((s) => !s)}
      />
      <div className="flex-1 overflow-auto">
        {renderContent()}
      </div>
      <EventModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingEvent(null); }}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        event={editingEvent}
        notes={notes}
        casos={casos}
        onVerCaso={onVerCaso}
      />
    </div>
  );
}

function newStartDate(oldIso, newDateStr) {
  const oldDate = oldIso.slice(0, 10);
  return oldIso.replace(oldDate, newDateStr);
}
