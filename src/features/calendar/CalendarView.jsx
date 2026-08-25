import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { getAllNotes } from '../notes/notesStore';
import { reportError } from '../../core/error/reportError';
import useAppStore from '../../core/store/useAppStore';
import { getOperatorAvailability, getOperatorSettings } from '../operator/operatorStore';
import { getAvailabilityOn } from '../operator/operatorMetrics';

const PRIORITY_COLORS = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#EF4444',
};

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

export default function CalendarView({ showToast, onClose, casos = [] }) {
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
    const todayStr = new Date().toISOString().slice(0, 10);

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
            {dayEvents.slice(0, 3).map(evt => (
              <div
                key={evt.id}
                draggable
                onDragStart={e => e.dataTransfer.setData('text/plain', evt.id)}
                onClick={e => { e.stopPropagation(); handleEditEvent(evt); }}
                className="text-[10px] px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80"
                style={{
                  backgroundColor: PRIORITY_COLORS[evt.priority] + '33',
                  color: PRIORITY_COLORS[evt.priority],
                  borderLeft: `2px solid ${PRIORITY_COLORS[evt.priority]}`,
                }}
              >
                {formatTime(evt.startDate)} {evt.title}
              </div>
            ))}
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
    const todayStr = new Date().toISOString().slice(0, 10);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d);
    }

    return (
      <div className="grid grid-cols-7 gap-1 flex-1">
        {days.map((d, idx) => {
          const dateStr = d.toISOString().slice(0, 10);
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
                {dayEvents.map(evt => (
                  <div
                    key={evt.id}
                    draggable
                    onDragStart={e => e.dataTransfer.setData('text/plain', evt.id)}
                    onClick={() => handleEditEvent(evt)}
                    className="text-[10px] px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80"
                    style={{
                      backgroundColor: PRIORITY_COLORS[evt.priority] + '33',
                      color: PRIORITY_COLORS[evt.priority],
                      borderLeft: `2px solid ${PRIORITY_COLORS[evt.priority]}`,
                    }}
                  >
                    {formatTime(evt.startDate)} {evt.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDayView = () => {
    const dateStr = currentDate.toISOString().slice(0, 10);
    const dayEvents = eventsByDate[dateStr] || [];
    const todayStr = new Date().toISOString().slice(0, 10);
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
            {hourEvents.map(evt => (
              <div
                key={evt.id}
                draggable
                onDragStart={e => e.dataTransfer.setData('text/plain', evt.id)}
                onClick={() => handleEditEvent(evt)}
                className="text-xs px-2 py-1 rounded cursor-pointer hover:opacity-80"
                style={{
                  backgroundColor: PRIORITY_COLORS[evt.priority] + '33',
                  color: PRIORITY_COLORS[evt.priority],
                  borderLeft: `3px solid ${PRIORITY_COLORS[evt.priority]}`,
                }}
              >
                <div className="font-semibold">{evt.title}</div>
                {evt.description && (
                  <div className="text-[10px] opacity-70 truncate">{evt.description}</div>
                )}
              </div>
            ))}
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
        <div className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
          No hay eventos registrados
        </div>
      );
    }

    const sorted = [...events].sort((a, b) => a.startDate.localeCompare(b.startDate));
    return (
      <div className="space-y-1">
        {sorted.map(evt => (
          <div
            key={evt.id}
            className="flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-white/5 transition-colors"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderLeft: `3px solid ${PRIORITY_COLORS[evt.priority]}`,
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
              <div className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                {evt.title}
              </div>
              {evt.description && (
                <div className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                  {evt.description}
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
                  backgroundColor: PRIORITY_COLORS[evt.priority] + '22',
                  color: PRIORITY_COLORS[evt.priority],
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
        ))}
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
      />
    </div>
  );
}

function newStartDate(oldIso, newDateStr) {
  const oldDate = oldIso.slice(0, 10);
  return oldIso.replace(oldDate, newDateStr);
}
