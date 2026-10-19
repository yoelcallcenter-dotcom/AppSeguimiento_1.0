import React, { useState, useEffect, useMemo, useCallback, useRef, useLayoutEffect } from 'react';
import { Calendar } from 'lucide-react';
import { Spinner } from '../../components/common/Spinner';
import { useCalendarService } from './calendarService';
import {
  createEvent,
  updateEvent,
  deleteEvent,
  getEvent,
  getEventsByMonth,
  getEventsByDateRange,
  getAllEvents,
} from './calendarStore';
import CalendarToolbar from './CalendarToolbar';
import { CalendarFilters, filtrarEventos } from './CalendarFilters';
import EventModal from './EventModal';
import TagsPills from '../../components/common/TagsPills';
import { EmptyState } from '../../components/common/EmptyState';
import { SectionHeader } from '../../components/configuracion/ui';
import { getAllNotes } from '../notes/notesStore';
import { reportError } from '../../core/error/reportError';
import useAppStore from '../../core/store/useAppStore';
import casesDB from '../../core/db/casesDB';
import { syncCitaEvent } from '../../core/cases/citaAutoEvents';
import { getOperatorAvailability, getOperatorSettings } from '../operator/operatorStore';
import { onKeyActivate } from '../../utils/a11y';
import { getAvailabilityOn } from '../operator/operatorMetrics';
import { getEstadoAccent } from '../../utils/catalogos';
import { toLocalDateStr } from '../../utils/dateUtils';
import { EVENT_TYPES } from './calendarStore';

// T4a/C03 (1.10.1): prioridades pasadas de HEX hardcodeado a tokens del tema.
// Antes: #10B981 / #F59E0B / #EF4444 — coincidían con el dark theme pero NO se
// adaptaban a tema claro ni a paletas de acento personalizadas. Mapeo directo
// (globals.css dark: --success #10B981, --warning #F59E0B, --danger #EF4444).
const PRIORITY_COLORS = {
  low: 'var(--color-success)',
  medium: 'var(--color-warning)',
  high: 'var(--color-danger)',
};

// Etiquetas de tipo de evento (Sistema de Citas, 1.5.0)
const EVENT_TYPE_LABELS = {
  [EVENT_TYPES.CITA]: { label: 'Cita', key: 'cita' },
  [EVENT_TYPES.REPROGRAMACION]: { label: 'Reprog.', key: 'reprog' },
  [EVENT_TYPES.MANUAL]: null,
};

// T4a/C03 (1.10.1): leyenda compacta (no existía en la vista). Los chips se
// colorean por PRIORIDAD y el TIPO se muestra como badge en mayúsculas que
// hereda el color del chip: la leyenda refleja EXACTAMENTE esos dos
// indicadores, sin inventar colores por tipo que la UI no usa. Tokens del
// tema, cero hex.
const LEGEND_PRIORITIES = [
  { key: 'high', label: 'Alta (A)', color: PRIORITY_COLORS.high },
  { key: 'medium', label: 'Media (M)', color: PRIORITY_COLORS.medium },
  { key: 'low', label: 'Baja (B)', color: PRIORITY_COLORS.low },
];
const LEGEND_TYPES = ['Cita', 'Reprogramación', 'Manual'];

// Resuelve el color de un evento: prioridad como color principal.
// T4a/C03 (1.10.1): CÓDIGO MUERTO eliminado — las ramas por caseContext /
// relatedCaseIds existían pero TODAS devolvían `priorityColor` (no decidían
// nada), y el parámetro `casoMap` se pasaba sin usarse. Queda la resolución
// directa; `casoMap` sigue vivo en resolveCaseStateColor (indicador secundario).
function resolveEventColor(evt) {
  return PRIORITY_COLORS[evt.priority] || PRIORITY_COLORS.medium;
}

// Resuelve el color del estado del caso vinculado (indicador secundario).
function resolveCaseStateColor(evt, casoMap, config) {
  if (evt.caseContext && evt.caseContext.estado) {
    return getEstadoAccent(config, evt.caseContext.estado);
  }
  const linkedCaseId = Array.isArray(evt.relatedCaseIds) ? evt.relatedCaseIds[0] : null;
  if (linkedCaseId) {
    const c = casoMap ? casoMap.get(linkedCaseId) : null;
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

const PRIORITY_LABELS = { low: 'B', medium: 'M', high: 'A' };

function priorityBadge(evt) {
  const color = PRIORITY_COLORS[evt.priority] || PRIORITY_COLORS.medium;
  return (
    <span
      className="inline-block text-[8px] font-bold rounded px-0.5 mr-0.5 align-middle leading-none"
      // T4a/C03 (1.10.1): `color + '33'` (alfa hex) es inválido sobre
      // var(--token) y dejaba el fondo vacío → color-mix 20% (convención
      // del repo: sufijo 33 ≈ 20%).
      style={{ backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)`, color }}
      title={`Prioridad: ${evt.priority === 'low' ? 'Baja' : evt.priority === 'high' ? 'Alta' : 'Media'}`}
    >
      {PRIORITY_LABELS[evt.priority] || 'M'}
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
// T4a/C03 (1.10.1): se eliminó DIAS_SEMANA_CORTO — declarada y jamás usada
// (código muerto; la vista mes/semana usan DIAS_SEMANA).

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

// T4a/C03 (1.10.1): se eliminó isSameDay(a, b) — función sin ningún llamador
// (código muerto; la comparación de días se hace con todayStr/toLocalDateStr).

// onActualizarCaso (1.10.1, F20): prop OPCIONAL. Recibe el objeto caso COMPLETO
// con el campo `cita` ya actualizado tras un drag&drop de un evento tipo CITA.
// Cuando está presente, la orquestación (persistir el caso + syncCitaEvent +
// refrescar el store de casos) vive en App.jsx; CalendarView solo calcula la
// nueva cita y notifica. Si NO está presente, se usa el update directo de
// casesDB como fallback (ver handleEventDrop) hasta que App.jsx la cablee.
export default function CalendarView({ showToast, onClose, casos = [], config, onVerCaso, initialEventId, onInitialEventConsumed, onActualizarCaso }) {
  const [view, setView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [notes, setNotes] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [availability] = useState(() => getOperatorAvailability());
  // T4a/C03 (1.10.1): se eliminó el estado `operatorSettings` — se inicializaba
  // con getOperatorSettings() pero jamás se leía (código muerto). El único dato
  // que se usaba (showAvailabilityInCalendar) se lee abajo en su propio useState.
  const [showAvailability, setShowAvailability] = useState(() => {
    const s = getOperatorSettings();
    return s.showAvailabilityInCalendar !== false;
  });
  const [filtros, setFiltros] = useState({ estados: [], prioridades: [], aseguradoras: [], estudios: [], tipos: [] });
  const [pendingCreate, setPendingCreate] = useState(null);

  // T4c/C03 (1.10.1): el panel de filtros NO está siempre visible — el chip
  // "Filtros" de la toolbar lo abre/cierra (default cerrado, para que la
  // vista gane la altura que ocupaba la barra permanente). Se guarda solo en
  // memoria: como los propios filtros se resetean al salir de la vista, la
  // preferencia abierta tampoco tiene sentido que persista.
  const [filtersOpen, setFiltersOpen] = useState(false);

  // 1.10.3-rev4 (scroll del calendario): se mide el espacio REAL del
  // contenedor en vez de estimarlo con un cálculo fijo de viewport. El
  // cálculo anterior restaba también los gaps space-y-4 y la leyenda, que
  // viven DENTRO del root: el alto resultante quedaba ~70px por debajo de
  // lo disponible, la página scrolleaba (barra al final: la leyenda) y las
  // filas del mes caían a su mínimo → días "comprimidos". Ahora
  // minHeight = viewport − top real (header + padding del main, medidos con
  // getBoundingClientRect) − padding inferior. Si el contenido entra, la
  // vista llena ese espacio sin barra y las filas se estiran; si excede
  // (viewport muy bajo, filtros abiertos), el root crece y el scroll lo da
  // una sola vez la página.
  const rootRef = useRef(null);
  const [altoDisponible, setAltoDisponible] = useState(null);
  useLayoutEffect(() => {
    const medir = () => {
      const el = rootRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      // 24px = padding inferior del main (sm:p-6); piso de 420px para
      // viewports muy bajos (ahí scrollea la página, nunca se recorta).
      setAltoDisponible(Math.max(Math.round(window.innerHeight - top - 24), 420));
    };
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, []);
  // Contador de filtros aplicados, para el "(N)" del chip de la toolbar:
  // con el panel oculto sigue viéndose que hay filtros activos.
  const filtersActive = useMemo(
    () =>
      Object.values(filtros).reduce(
        (n, arr) => n + (Array.isArray(arr) ? arr.length : 0),
        0
      ),
    [filtros]
  );

  // T4a/C03 (1.10.1): reloj de la vista DÍA (línea de hora actual). Estado
  // único refrescado cada 60 s con cleanup — sin dependencias en el effect, así
  // que no re-dispara loadEvents (depende de view/currentDate) ni de los toasts.
  // Declarado a nivel de componente (nunca dentro de condición/switch).
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const { checkUpcomingEvents } = useCalendarService();

  // Optimización 1.6.6: un único Map de casos reutilizado por todos los eventos
  // (evita el .find() lineal por cada evento en cada render).
  const casoMap = useMemo(() => new Map((casos || []).map((c) => [c.id, c])), [casos]);
  // Optimización 1.6.6: la fecha de hoy es estable durante toda la sesión de vista.
  const todayStr = useMemo(() => toLocalDateStr(new Date()), []);

  const eventosFiltrados = useMemo(
    () => filtrarEventos(events, filtros),
    [events, filtros]
  );

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
        // 1.10.1 (E03): antes se usaba new Date(...).toISOString(), que convertía
        // a UTC y truncaba/desfasaba el límite superior (en UTC-3 el fin de mes
        // quedaba como "…T03:00Z" y excluía eventos con hora del último día).
        // Además el rango era SIEMPRE el mes de currentDate, con lo que una
        // semana que cruza de mes no cargaba los días del mes anterior.
        // Ahora el rango es el realmente visible (día / domingo..sábado) en
        // strings LOCALES, sin pasar por UTC.
        const { start, end } = visibleRangeLocal(currentDate, view);
        data = await getEventsByDateRange(start, end);
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
    for (const e of eventosFiltrados) {
      const key = formatDate(e.startDate);
      if (!map[key]) map[key] = [];
      map[key].push(e);
    }
    return map;
  }, [eventosFiltrados]);

  // Optimización 1.6.6: orden y mapa de eventos de la vista lista memoizados
  // (no se reordenan en cada render).
  const listaOrdenada = useMemo(
    () => [...eventosFiltrados].sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [eventosFiltrados]
  );
  const rawEventsById = useMemo(
    () => new Map(events.map((e) => [e.id, e])),
    [events]
  );

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

  // Navegación directa a un evento desde la Búsqueda Global (1.7.2):
  // busca el evento por id (aunque esté en otro mes) y abre su modal de edición.
  useEffect(() => {
    if (!initialEventId) return undefined;
    let activo = true;
    getEvent(initialEventId).then((evt) => {
      if (!activo || !evt) return;
      if (onInitialEventConsumed) onInitialEventConsumed();
      const start = new Date(evt.startDate);
      if (!isNaN(start.getTime())) setCurrentDate(start);
      handleEditEvent(evt);
      loadEvents();
    });
    return () => { activo = false; };
  }, [initialEventId, handleEditEvent, loadEvents, onInitialEventConsumed]);

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
    setPendingCreate(null);
    setModalOpen(true);
  }, []);

  const handleEventDrop = useCallback(async (eventId, newDateStr) => {
    try {
      const event = events.find(e => e.id === eventId);
      if (!event) return;
      const oldStart = event.startDate;
      const newStart = newStartDate(oldStart, newDateStr);
      const newEnd = event.endDate ? newStartDate(event.endDate, newDateStr) : null;

      // CITA: actualizar campo cita del caso y dejar syncCitaEvent manejar la sincronización.
      if (event.eventType === EVENT_TYPES.CITA && Array.isArray(event.relatedCaseIds) && event.relatedCaseIds.length) {
        const caseId = event.relatedCaseIds[0];
        const caso = (casos || []).find(c => String(c.id) === String(caseId));
        if (caso) {
          // 1.10.1 (E01): la cita se construye SIN pasar por new Date() sobre un
          // ISO posiblemente corrupto (antes "NaN/NaN" y syncCitaEvent BORRABA el
          // evento de cita). Toda la selección del fin vive en resolveCitaFromDrop
          // (exportada y testeada); acá solo se valida el resultado.
          const nuevaCita = resolveCitaFromDrop(newStart, newEnd, event);
          if (!nuevaCita) {
            // Resultado inválido: no se toca el caso ni se llama a syncCitaEvent
            // (un cita inválida haría borrar el evento automático).
            showToast('No se pudo reprogramar la cita: fecha inválida', 'error');
            reportError(new Error('Cita inválida tras drag&drop'), {
              operation: 'handleEventDrop.cita',
              eventId,
              newStart,
              newEnd,
            });
            return;
          }
          const casoActualizado = { ...caso, cita: nuevaCita };
          if (typeof onActualizarCaso === 'function') {
            // 1.10.1 (F20): camino orquestado — App.jsx persiste el caso,
            // corre syncCitaEvent y refresca los casos. CalendarView solo
            // notifica y recarga sus propios eventos.
            await onActualizarCaso(casoActualizado);
          } else {
            // FALLBACK (solo mientras App.jsx no cablee onActualizarCaso):
            // update directo en casesDB + sync local. AVISO: duplica lógica de
            // guardado que debería centralizarse en App.jsx (F20). Eliminar
            // esta rama una vez la prop esté cableada.
            await casesDB.cases.update(String(caseId), { cita: nuevaCita });
            await syncCitaEvent(casoActualizado, { config });
          }
          // Mantener el evento de cita en la nueva fecha/hora también en DB
          // (syncCitaEvent se encarga del evento automático; acá solo se avisa).
          showToast(`Cita reprogramada: ${nuevaCita}`, 'success');
          loadEvents();
          useAppStore.getState().loadEvents();
          return;
        }
      }

      // Evento manual / reprogramacion: actualizar directamente.
      await updateEvent(eventId, { startDate: newStart, endDate: newEnd });
      showToast('Evento movido', 'success');
      loadEvents();
      useAppStore.getState().loadEvents();
    } catch (error) {
      showToast('Error al mover el evento', 'error');
      reportError(error, { operation: 'handleEventDrop', eventId });
    }
  }, [events, casos, config, showToast, loadEvents, onActualizarCaso]);

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const cells = [];
    for (let i = 0; i < firstDay; i++) {
      // 1.10.3-rev2: la celda fantasma antes del día 1 era un div invisible
      // (p-1 sin fondo ni borde) y la cuadrícula se veía rota. Ahora lleva
      // el mismo fondo/borde que una celda normal y se estira con las filas.
      cells.push(
        <div
          key={`empty-${i}`}
          className="rounded-lg"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            opacity: 0.5,
          }}
        />
      );
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = eventsByDate[dateStr] || [];
      const isToday = dateStr === todayStr;
      // T4a/C03 (1.10.1): índice de día de la semana 0..6 calculado sin crear
      // Date (firstDay = domingo del 1º del mes), para teñir sábados/domingos.
      const dow = (firstDay + day - 1) % 7;
      const isWeekend = dow === 0 || dow === 6;
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

      // T4a/C03 (1.10.1): la celda pasa a `rounded-lg` (8px, radio estándar del
      // repo) y pierde `hover:bg-white/5`, que NO aplicaba nunca: el fondo va en
      // style inline y un estilo inline gana sobre cualquier clase. El hover real
      // lo aporta la capa absoluta con group-hover (ver comentario más abajo).
      // 1.10.3-rev2: min-h bajó de 80px a 64px para que 6 filas de semana + el
      // encabezado quepan en laptops (768px de alto) SIN barra de desplazamiento;
      // las pills igual scrollean dentro de la celda (ver contenedor flex-1).
      cells.push(
        <div
          key={dateStr}
          role="button"
          tabIndex={0}
          aria-label={`Ver día ${day}/${month + 1}/${year}`}
          className="group relative flex flex-col rounded-lg p-1 min-h-[64px] cursor-pointer transition-colors"
          style={{
            backgroundColor: isToday
              ? 'color-mix(in srgb, var(--color-accent) 6.7%, transparent)'
              : availState
                // 1.10.1 (R02/H1): var(--token) no acepta sufijo alfa
                // (color + '11' dejaba la declaración vacía). Se reescribe con
                // color-mix siguiendo la convención adoptada en 1.10.0
                // (11→6.7%, 55→33.3%, 22→13.3%).
                ? `color-mix(in srgb, ${AVAILABILITY_COLORS[availState.key]} 6.7%, transparent)`
                : isWeekend
                  // T4a/C03 (1.10.1): fin de semana teñido con token (mezcla
                  // sobre la superficie: se ve en tema oscuro Y claro; antes el
                  // sábado/domingo era indistinguible de un día hábil).
                  ? 'color-mix(in srgb, var(--color-surface) 92%, var(--color-text-muted))'
                  : 'var(--color-surface)',
            border: `1px solid ${isToday ? 'var(--color-accent)' : availState ? `color-mix(in srgb, ${AVAILABILITY_COLORS[availState.key]} 33.3%, transparent)` : 'var(--color-border)'}`,
          }}
          onClick={(e) => {
            if (e.target.closest('[data-event-pill]')) return;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            setPendingCreate({ startDate: dateStr, startTime: '09:00', endTime: '10:00' });
            setEditingEvent(null);
            setModalOpen(true);
          }}
          onKeyDown={onKeyActivate(() => {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            setPendingCreate({ startDate: dateStr, startTime: '09:00', endTime: '10:00' });
            setEditingEvent(null);
            setModalOpen(true);
          })}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault();
            const eventId = e.dataTransfer.getData('text/plain');
            if (eventId) handleEventDrop(eventId, dateStr);
          }}
        >
          {/* T4a/C03 (1.10.1): capa de HOVER de la celda. El color base vive en
              style inline (gana sobre cualquier `hover:bg-*`), así que el hover se
              resuelve con una capa absoluta cuya visibilidad controla group-hover
              (utility core) y cuyo tinte es un color-mix por token → funciona en
              tema oscuro y claro. pointer-events-none para no tapar clicks/drops;
              los hijos van con `relative` para quedar encima de la capa. */}
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-lg opacity-0 transition-opacity duration-fast group-hover:opacity-100 pointer-events-none"
            style={{ backgroundColor: 'color-mix(in srgb, var(--color-text) 5%, transparent)' }}
          />
          <span
            className="relative text-xs font-semibold"
            style={{
              color: isToday ? 'var(--color-accent)' : 'var(--color-text-muted)',
            }}
          >
            {day}
          </span>
          {availState && (
            <div
              className="relative text-[9px] px-1 py-0.5 rounded mt-0.5 truncate font-semibold"
              style={{
                // 1.10.1 (R02/H1): sufijo '22' sobre var() era inválido → color-mix (13.3%).
                backgroundColor: `color-mix(in srgb, ${AVAILABILITY_COLORS[availState.key]} 13.3%, transparent)`,
                color: AVAILABILITY_COLORS[availState.key],
              }}
              title={AVAILABILITY_LABELS[availState.key]}
            >
              {AVAILABILITY_LABELS[availState.key]}
            </div>
          )}
          {/* 1.10.3-rev2: las pills scrollean DENTRO de la celda (flex-1 +
              min-h-0) en vez de estirar la fila del grid. */}
          <div className="relative space-y-0.5 mt-0.5 overflow-y-auto flex-1 min-h-0">
            {dayEvents.slice(0, 3).map(evt => {
              const color = resolveEventColor(evt);
              const caseColor = resolveCaseStateColor(evt, casoMap, config);
              const cancelled = evt.status === 'cancelled';
              return (
                <div
                  key={evt.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Editar evento ${evt.title || ''}`}
                  draggable
                  onDragStart={e => e.dataTransfer.setData('text/plain', evt.id)}
                  onClick={e => { e.stopPropagation(); handleEditEvent(evt); }}
                  onKeyDown={e => { e.stopPropagation(); onKeyActivate(() => handleEditEvent(evt))(e); }}
                  // T4a/C03 (1.10.1): chip tipo pill con radio 8px y transición
                  // de opacidad (antes `rounded` 4px). El alfa deja de ser un
                  // sufijo hex ('33') —inválido sobre var(--token)— y pasa a
                  // color-mix 20%. La opacidad inline SOLO se pinta si el evento
                  // está cancelado: con `opacity: 1` en línea el hover:opacity-80
                  // no llegaba a aplicar nunca (el inline gana sobre la clase).
                  className={`text-[10px] px-1 py-0.5 rounded-lg truncate cursor-pointer transition-opacity hover:opacity-80 ${cancelled ? 'line-through' : ''}`}
                  style={{
                    backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)`,
                    color,
                    borderLeft: `2px solid ${color}`,
                    ...(cancelled ? { opacity: 0.6 } : {}),
                  }}
                >
                  {caseColor && <span className="inline-block w-1.5 h-1.5 rounded-full mr-0.5 align-middle" style={{ backgroundColor: caseColor }} />}
                  {priorityBadge(evt)} {formatTime(evt.startDate)} {eventTypeBadge(evt)} {evt.title}
                  {evt.caseContext?.nombre && <span className="text-[9px] opacity-70 ml-0.5">{evt.caseContext.nombre}</span>}
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
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d);
    }

    return (
      // 1.10.3-rev2: h-full contra el contenedor scrolleable (que ahora sí
      // tiene altura) + auto-rows-fr → las 7 columnas llenan la pantalla y
      // el scroll es interno por columna. Antes `flex-1` no hacía nada (el
      // padre no era flex) y las columnas colgaban del contenido.
      <div className="grid grid-cols-7 gap-1 h-full auto-rows-fr">
        {days.map((d, idx) => {
          const dateStr = toLocalDateStr(d);
          const dayEvents = eventsByDate[dateStr] || [];
          const isToday = dateStr === todayStr;
          // T4a/C03 (1.10.1): 0=domingo, 6=sábado → columna de fin de semana
          // teñida con token (antes era indistinguente de un día hábil).
          const isWeekend = idx === 0 || idx === 6;
          return (
            <div
              key={idx}
              // T4a/C03 (1.10.1): radio 8px + capa de hover (group-hover), igual
              // que la celda del mes — el fondo base sigue en style inline.
              className="group relative flex flex-col rounded-lg p-1"
              style={{
                backgroundColor: isToday
                  ? 'color-mix(in srgb, var(--color-accent) 6.7%, transparent)'
                  : isWeekend
                    ? 'color-mix(in srgb, var(--color-surface2) 92%, var(--color-text-muted))'
                    : 'var(--color-surface2)',
                border: `1px solid ${isToday ? 'var(--color-accent)' : 'var(--color-border)'}`,
              }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const eventId = e.dataTransfer.getData('text/plain');
                if (eventId) handleEventDrop(eventId, dateStr);
              }}
            >
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-lg opacity-0 transition-opacity duration-fast group-hover:opacity-100 pointer-events-none"
                style={{ backgroundColor: 'color-mix(in srgb, var(--color-text) 5%, transparent)' }}
              />
              <div className="relative text-center mb-1">
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
              {/* 1.10.3-rev2: min-h-0 para que flex-1+overflow funcionen en
                  columna (sin él el scroll se iba al contenedor general). */}
              <div className="relative space-y-0.5 overflow-y-auto flex-1 min-h-0">
                {dayEvents.map(evt => {
                  const color = resolveEventColor(evt);
                  const caseColor = resolveCaseStateColor(evt, casoMap, config);
                  const cancelled = evt.status === 'cancelled';
                  return (
                    <div
                      key={evt.id}
                      data-event-pill
                      role="button"
                      tabIndex={0}
                      aria-label={`Editar evento ${evt.title || ''}`}
                      draggable
                      onDragStart={e => e.dataTransfer.setData('text/plain', evt.id)}
                      onClick={() => handleEditEvent(evt)}
                      onKeyDown={onKeyActivate(() => handleEditEvent(evt))}
                      // T4a/C03 (1.10.1): chip con radio 8px y alfa por color-mix
                      // 20% (antes `rounded` 4px + sufijo hex '33'); la opacidad
                      // inline solo se aplica si está cancelado para que
                      // hover:opacity-80 funcione (el inline gana sobre la clase).
                      className={`text-[10px] px-1 py-0.5 rounded-lg truncate cursor-pointer transition-opacity hover:opacity-80 ${cancelled ? 'line-through' : ''}`}
                      style={{
                        backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)`,
                        color,
                        borderLeft: `2px solid ${color}`,
                        ...(cancelled ? { opacity: 0.6 } : {}),
                      }}
                    >
                      {caseColor && <span className="inline-block w-1.5 h-1.5 rounded-full mr-0.5 align-middle" style={{ backgroundColor: caseColor }} />}
                      {priorityBadge(evt)} {formatTime(evt.startDate)} {eventTypeBadge(evt)} {evt.title}
                      {evt.caseContext?.nombre && <span className="text-[9px] opacity-70 ml-0.5">{evt.caseContext.nombre}</span>}
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
    const isToday = dateStr === todayStr;

    const hours = [];
    for (let h = 0; h < 24; h++) {
      const hourStr = `${String(h).padStart(2, '0')}:00`;
      // T4a/C03 (1.10.1): fila que lleva la línea de HORA ACTUAL (solo si la
      // vista apunta a hoy). `now` viene del estado con refresh cada 60 s.
      const isNowRow = isToday && h === now.getHours();
      const hourEvents = dayEvents.filter(e => {
        const eh = formatTime(e.startDate);
        return eh && eh.startsWith(String(h).padStart(2, '0'));
      });

      hours.push(
        <div
          key={h}
          className="flex border-t min-h-[48px] relative"
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
              const color = resolveEventColor(evt);
              const caseColor = resolveCaseStateColor(evt, casoMap, config);
              const cancelled = evt.status === 'cancelled';
              return (
                <div
                  key={evt.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Editar evento ${evt.title || ''}`}
                  draggable
                  onDragStart={e => e.dataTransfer.setData('text/plain', evt.id)}
                  onClick={() => handleEditEvent(evt)}
                  onKeyDown={onKeyActivate(() => handleEditEvent(evt))}
                  // T4a/C03 (1.10.1): chip de vista día con radio 8px, alfa por
                  // color-mix 20% (antes sufijo hex '33' sobre var(--token), que
                  // dejaba el fondo vacío) y opacidad inline solo si cancelado
                  // para que hover:opacity-80 surta efecto.
                  className={`text-xs px-2 py-1 rounded-lg cursor-pointer transition-opacity hover:opacity-80 ${cancelled ? 'line-through' : ''}`}
                  style={{
                    backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)`,
                    color,
                    borderLeft: `3px solid ${color}`,
                    ...(cancelled ? { opacity: 0.6 } : {}),
                  }}
                >
                  <div className="font-semibold flex items-center gap-1">
                    {caseColor && <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: caseColor }} />}
                    {priorityBadge(evt)}
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
          {/* T4a/C03 (1.10.1): línea de HORA ACTUAL (mejora chica) — solo en la
              fila de la hora en curso y solo si la vista apunta a hoy. Se posiciona
              por porcentaje dentro de la fila (minutos/60) y se re-calcula con el
              estado `now` (refresh cada 60 s, con cleanup). Sin timer propio en el
              render: determinista al montar y actualizado por el intervalo del
              componente. Puntos/línea con tokens → se ve en tema oscuro y claro. */}
          {isNowRow && (
            <div
              aria-hidden="true"
              data-testid="linea-hora-actual"
              className="absolute left-0 right-0 z-10 flex items-center gap-1 pointer-events-none"
              style={{
                top: `${(now.getMinutes() / 60) * 100}%`,
                transform: 'translateY(-50%)',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: 'var(--color-accent)' }}
              />
              <span
                className="flex-1 h-px"
                style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent) 65%, transparent)' }}
              />
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        className="rounded-lg p-3 overflow-y-auto"
        style={{
          backgroundColor: isToday ? 'color-mix(in srgb, var(--color-accent) 6.7%, transparent)' : 'var(--color-surface)',
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
        {/* T4a/C03 (1.10.1): vacío de la vista día con el componente común
            EmptyState (antes un <div> suelto con texto propio). La grilla de
            horas de abajo se mantiene igual: sigue siendo destino de drop y
            clic para crear eventos. */}
        {dayEvents.length === 0 && (
          <EmptyState icon={Calendar} message="Sin eventos para este día" size="sm" />
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

    const sorted = listaOrdenada;
    return (
      <div className="space-y-1">
        {sorted.map(evt => {
          const color = resolveEventColor(evt);
          const caseColor = resolveCaseStateColor(evt, casoMap, config);
          const cancelled = evt.status === 'cancelled';
          const original = evt.originalEventId ? rawEventsById.get(evt.originalEventId) : null;
          return (
            <div
              key={evt.id}
              role="button"
              tabIndex={0}
              aria-label={`Ver evento ${evt.title || ''}`}
              // T4a/C03 (1.10.1): hover sutil en la fila de la vista lista
              // (antes solo transition-colors sin cambio de estilo) — el alfa del
              // chip de prioridad pasa de sufijo hex '22' a color-mix 13.3%.
              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-opacity hover:opacity-80 ${cancelled ? 'opacity-60' : ''}`}
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderLeft: `3px solid ${color}`,
              }}
              onClick={() => handleEditEvent(evt)}
              onKeyDown={onKeyActivate(() => handleEditEvent(evt))}
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
                  className="pill-sm"
                  style={{
                    // T4a/C03 (1.10.1): `color + '22'` (alfa hex) no aplica sobre
                    // var(--token) → color-mix 13.3% (convención del repo: 22→13.3%).
                    backgroundColor: `color-mix(in srgb, ${color} 13.3%, transparent)`,
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
          <Spinner size={24} />
        </div>
      );
    }

    switch (view) {
      case 'month':
        // 1.10.3-rev2 (distribución): el encabezado de días sale del grid de
        // celdas (antes era la primera fila del mismo grid y auto-rows-fr le
        // daba ~100px de alto a una fila de texto). Ahora el header mide solo
        // lo que necesita y las celdas se reparten el alto disponible con
        // filas iguales (flex-1 + auto-rows-fr) en vez de colgar del min-h.
        return (
          <div className="flex flex-col h-full">
            <div className="grid grid-cols-7 gap-1">
              {DIAS_SEMANA.map(d => (
                <div key={d} className="text-center text-xs font-semibold py-1.5 uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 flex-1 auto-rows-fr min-h-0">
              {renderMonthView()}
            </div>
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
        // 1.10.3-rev4 (distribución + anti-doble-scrollbar): la altura YA NO es
    // un cálculo fijo de viewport. `altoDisponible` (useLayoutEffect arriba)
    // = viewport − top real del root (header + padding del main, medidos con
    // getBoundingClientRect) − padding inferior: la vista ocupa exactamente
    // el espacio que su contenedor le da, sin barra de página y con las
    // filas estiradas. Si el contenido (filtros abiertos, viewport muy bajo)
    // excede ese mínimo, el root crece con él y el scroll lo da una sola vez
    // la página — nunca dos barras. Nota: no escribir clases completas con
    // calc entre backticks en comentarios o docs: Tailwind las escanea como
    // candidatas y un valor con puntos o puntos suspensivos rompe
    // postcss-calc al minificar el CSS.
    <div
      ref={rootRef}
      className="flex flex-col space-y-4"
      style={altoDisponible ? { minHeight: altoDisponible } : undefined}
    >
      <SectionHeader
        icon={Calendar}
        titulo="Calendario"
        descripcion="Organizá tus eventos, citas y disponibilidad."
        storageKey="calendario"
      />
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
        showFilters={filtersOpen}
        onToggleFilters={() => setFiltersOpen((o) => !o)}
        filtersActive={filtersActive}
      />
      {/* T4c/C03 (1.10.1): panel condicional + animate-fade-in (el id es el
          destino del aria-controls del chip "Filtros" de la toolbar). */}
      {filtersOpen && (
        <div id="cal-filtros-panel" className="animate-fade-in">
          <CalendarFilters
            events={events}
            config={config}
            filtros={filtros}
            onFiltrosChange={setFiltros}
          />
        </div>
      )}
      {/* 1.10.3-rev3 (anti-doble-scrollbar): sin overflow propio. El raíz
          tiene min-h (no altura fija), así que si sobra espacio la caja se
          estira y la grilla llena la pantalla SIN barra alguna; si el
          contenido excede, la caja crece con él y el scroll lo da la página
          una sola vez. Antes el overflow-auto acá generaba una barra interna
          además de la de la página. */}
      <div className="flex-1">
        {renderContent()}
      </div>
      {/* T4a/C03 (1.10.1): LEYENDA compacta — no existía en la vista. Dos
          grupos que reflejan lo que los chips realmente muestran: PRIORIDAD
          (color del chip: baja→success, media→warning, alta→danger) y TIPO
          (badge en mayúsculas que hereda el color del chip). Todo con tokens
          del tema; sin hex y sin colores inventados por tipo. */}
      <div
        role="group"
        aria-label="Leyenda del calendario"
        className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-2 text-[10px]"
        style={{ color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)' }}
      >
        <span className="font-bold uppercase tracking-wider" aria-hidden="true">
          Leyenda
        </span>
        {LEGEND_PRIORITIES.map(p => (
          <span key={p.key} className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: p.color }}
              aria-hidden="true"
            />
            {p.label}
          </span>
        ))}
        <span
          className="w-px h-3 flex-shrink-0"
          style={{ backgroundColor: 'var(--color-border)' }}
          aria-hidden="true"
        />
        {LEGEND_TYPES.map(t => (
          <span key={t} className="font-bold uppercase tracking-wide" style={{ color: 'var(--color-text)' }}>
            {t}
          </span>
        ))}
      </div>
      <EventModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingEvent(null); setPendingCreate(null); }}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        event={editingEvent}
        notes={notes}
        casos={casos}
        config={config}
        onVerCaso={onVerCaso}
        initialData={pendingCreate}
      />
    </div>
  );
}

/**
 * 1.10.1 (E01): reescrito por completo.
 *
 * ANTES: `oldIso.replace(oldDate, newDateStr)` con newDateStr = "YYYY-MM-DDT HH:MM:00"
 * (drop en vista día) sobre un oldIso que ya tenía hora producía un ISO con
 * DOBLE "T" ("…T14:00:00T09:30:00.000Z") → new Date() inválido → "NaN/NaN" en
 * el campo cita y syncCitaEvent borraba el evento de cita del caso.
 *
 * AHORA: se reemplazan fecha Y hora por completo preservando el sufijo del
 * oldIso (segundos/ms/Z). Si el oldIso es all-day (sin "T") y el destino trae
 * hora, se devuelve "fechaT hora:00". Si el resultado no es una fecha válida,
 * se devuelve el oldIso original (nunca un string corrupto).
 *
 * @param {string} oldIso ISO original del evento (con o sin hora).
 * @param {string} newDateStr destino del drop: "YYYY-MM-DD" (mes/semana) o
 *        "YYYY-MM-DDTHH:MM:00" (vista día).
 * @returns {string} nuevo ISO seguro.
 */
export function newStartDate(oldIso, newDateStr) {
  const old = String(oldIso || '');
  const dest = String(newDateStr || '');
  // Parte de destino: fecha siempre; hora HH:MM solo si viene con "T".
  const destMatch = dest.match(/^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?/);
  if (!destMatch) return old;
  const newDate = destMatch[1];
  const newHour = destMatch[2] || null;

  // Sufijo del oldIso: todo lo posterior a "HH:MM" (":00", ":00.000Z", "Z"…).
  const oldMatch = old.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(.*)$/);
  const oldSuffix = oldMatch ? oldMatch[1] : null;

  let result;
  if (newHour) {
    // Destino con hora (vista día): hora nueva + sufijo del original si lo hay.
    result = `${newDate}T${newHour}${oldSuffix !== null ? oldSuffix : ':00'}`;
  } else if (oldMatch) {
    // Destino solo-fecha (mes/semana) sobre evento con hora: conservar hora+sufijo.
    result = `${newDate}${old.slice(10)}`;
  } else {
    // All-day sobre all-day: solo cambia la fecha.
    result = newDate;
  }

  // Validación: nunca devolver un ISO inválido al store.
  if (isNaN(new Date(result).getTime())) return old;
  return result;
}

/**
 * 1.10.1 (E01): construye el string CITA ("DD/MM - (HH:MM a HH:MM)") a partir
 * de los ISO resultantes del drop, SIN pasar por new Date() (que daba
 * "NaN/NaN" con el ISO corrupto del bug E01). Devuelve null si fecha u hora
 * no son válidas o si fin <= inicio (misma regla que parseCita: un cita con
 * fin <= inicio no es parseable y syncCitaEvent BORRARÍA el evento). En ese
 * caso el caller NO debe tocar el caso ni llamar a syncCitaEvent.
 *
 * @param {string} newStart ISO de inicio ya corregido por newStartDate.
 * @param {string|null} newEnd ISO de fin (opcional).
 * @returns {string|null}
 */
export function buildCitaFromDrop(newStart, newEnd) {
  // Formato que genera el repo para eventos: "YYYY-MM-DDTHH:MM(:SS…)?".
  const startMatch = String(newStart || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})/);
  if (!startMatch || isNaN(new Date(newStart).getTime())) return null;
  const [, , month, day, tIni] = startMatch;
  const endMatch = String(newEnd || newStart).match(/T(\d{2}:\d{2})/);
  const tFin = endMatch ? endMatch[1] : tIni;
  if (isNaN(new Date(newEnd || newStart).getTime())) return null;
  // Misma restricción que parseCita (citaParser): fin debe ser > inicio.
  if (hhmmToMin(tFin) <= hhmmToMin(tIni)) return null;
  // Mismo formato canónico que formatCita (citaParser): "DD/MM - (HH:MM a HH:MM)".
  return `${day}/${month} - (${tIni} a ${tFin})`;
}

/** Convierte "HH:MM" a minutos (espejo mínimo del privado de citaParser). */
function hhmmToMin(hhmm) {
  const [h, m] = String(hhmm || '').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * 1.10.1 (E01): calcula el string CITA resultante de un drag&drop de un evento
 * tipo CITA, probando los fin candidatos en orden:
 *
 *   1) newEnd: conserva el mismo estilo/sufijo que newStart y, en vistas
 *      mes/semana, mantiene la hora original del fin del evento.
 *   2) withPreservedDuration: duración original del evento aplicada a la nueva
 *      hora — necesario en vista DÍA, donde el drop pone inicio y fin en el
 *      MISMO slot y parseCita exige fin > inicio ("(14:00 a 14:00)" → null →
 *      syncCitaEvent BORRARÍA el evento de cita).
 *
 * Devuelve null si ningún candidato es parseable (all-day sin hora, ISOs
 * corruptos, duración negativa): en ese caso el caller NO debe tocar el caso
 * ni llamar a syncCitaEvent.
 *
 * Riesgo conocido: si el ISO del evento trae sufijo Z y la duración cruza la
 * medianoche en otra zona horaria, el fin puede quedar fuera del mismo día; se
 * prefiere no mover la cita a fallar en silencio (el caller avisa por toast).
 *
 * @param {string} newStart ISO de inicio ya corregido por newStartDate.
 * @param {string|null} newEnd ISO de fin resultante del drop.
 * @param {{ startDate: string, endDate?: string|null }} evento evento original.
 * @returns {string|null}
 */
export function resolveCitaFromDrop(newStart, newEnd, evento) {
  const candidatosFin = [
    newEnd,
    newStart && newStart.includes('T')
      ? withPreservedDuration(newStart, evento.startDate, evento.endDate)
      : null,
  ];
  for (const fin of candidatosFin) {
    if (!fin) continue;
    const cita = buildCitaFromDrop(newStart, fin);
    if (cita) return cita;
  }
  return null;
}

/**
 * 1.10.1 (E01): parsea un ISO como "reloj de pared" usando los componentes
 * HH:MM del propio string e ignorando el sufijo Z/offset.
 *
 * Motivo: new Date('…T14:00Z') en UTC-3 (America/Buenos_Aires) se lee como
 * 11:00 local; sumarle la duración y volver a formatear con getters LOCALES
 * producía un fin ANTES del inicio ("12:00" frente a un inicio "14:00"), y
 * buildCitaFromDrop lo rechazaba. Parsear como wall-clock mantiene el cálculo
 * consistente con el string que se muestra/almacena, sin importar la zona.
 *
 * @param {string} iso "YYYY-MM-DDTHH:MM(:SS)?" (con o sin Z).
 * @returns {Date|null} Date LOCAL con esos componentes, o null.
 */
function parseWallClock(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6] || 0));
}

/**
 * 1.10.1 (E01): devuelve un ISO local "YYYY-MM-DDTHH:MM:00" desplazado desde
 * newStart conservando la duración original del evento (oldStart→oldEnd).
 *
 * Motivo: en vista día el drop asigna el mismo slot de hora a inicio y fin;
 * para las CITAS eso produciría "(14:00 a 14:00)" → parseCita → null →
 * syncCitaEvent borraba el evento. Si la duración no es utilizable (all-day,
 * ISOs rotos), usa 1 hora por defecto.
 *
 * 1.10.1: los cálculos son wall-clock (parseWallClock) para no desfasar las
 * horas de los ISO con sufijo Z en zonas UTC negativas.
 *
 * @param {string} newStart ISO válido CON hora.
 * @param {string} oldStart ISO original de inicio.
 * @param {string|null} oldEnd ISO original de fin.
 * @returns {string|null}
 */
export function withPreservedDuration(newStart, oldStart, oldEnd) {
  const s0 = parseWallClock(oldStart);
  const e0 = parseWallClock(oldEnd || oldStart);
  const dur = (s0 && e0 && e0.getTime() > s0.getTime()) ? e0.getTime() - s0.getTime() : 3600000;
  const base = parseWallClock(newStart);
  if (!base) return null;
  const d = new Date(base.getTime() + dur);
  if (isNaN(d.getTime())) return null;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${toLocalDateStr(d)}T${hh}:${mm}:00`;
}

/**
 * 1.10.1 (E03): rango [inicio, fin] de un mes en strings LOCALES (sin toISOString,
 * que convertía a UTC y truncaba el último día en zonas UTC-negativas).
 * Límite superior = fin de día local "T23:59:59.999" (incluye eventos con hora
 * del último día vía comparación lexicográfica en getEventsByDateRange).
 *
 * @param {number} year
 * @param {number} month índice 0-based (igual que Date#getMonth).
 * @returns {{ start: string, end: string }}
 */
export function monthRangeLocal(year, month) {
  const mm = String(month + 1).padStart(2, '0');
  const lastDay = getDaysInMonth(year, month);
  return {
    start: `${year}-${mm}-01`,
    end: `${year}-${mm}-${String(lastDay).padStart(2, '0')}T23:59:59.999`,
  };
}

/**
 * 1.10.1 (E03): rango [inicio, fin] REALMENTE visible en las vistas día y
 * semana, en strings LOCALES (sin toISOString/UTC).
 *
 *  - Día: el propio día, con upper bound "T23:59:59.999" para incluir eventos
 *    con hora de ese día (comparación lexicográfica en getEventsByDateRange).
 *  - Semana: domingo..sábado de la semana de `date`, cubriendo AMBOS meses
 *    cuando la semana cruza de mes (antes el rango era el mes de currentDate y
 *    los días del mes anterior quedaban sin cargar: un evento del 30 caía
 *    invisible en la vista semanal del 1º).
 *
 * El mismo cálculo de domingo..sábado se replica en renderWeekView; si cambia
 * uno, debe cambiar el otro (riesgo de rango visible ≠ celdas renderizadas).
 *
 * @param {Date} date fecha de referencia de la vista.
 * @param {'day'|'week'} view
 * @returns {{ start: string, end: string }}
 */
export function visibleRangeLocal(date, view) {
  const day0 = toLocalDateStr(date);
  if (view === 'day') {
    return { start: day0, end: `${day0}T23:59:59.999` };
  }
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - date.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  const s = toLocalDateStr(startOfWeek);
  const e = toLocalDateStr(endOfWeek);
  return { start: s, end: `${e}T23:59:59.999` };
}
