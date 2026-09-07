import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { notificationManager } from "../core/notifications/notificationManager";
import { reportError } from "../core/error/reportError";

const CalendarContext = createContext(null);
const STORAGE_KEY = "calendar-events";

export function CalendarProvider({ children }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cargar eventos
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setEvents(JSON.parse(saved));
      }
    } catch (error) {
      reportError(error, { context: 'CalendarContext:loadEvents' });
    }
    setLoading(false);
  }, []);

  // Guardar eventos
  const saveEvents = useCallback((newEvents) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newEvents));
      setEvents(newEvents);
    } catch (error) {
      reportError(error, { context: 'CalendarContext:saveEvents' });
    }
  }, []);

  // Notificar evento (recordatorio programado o manual)
  const scheduleReminder = useCallback((eventData) => {
    if (!eventData) return null;
    const fecha = eventData.fecha || (eventData.startDate ? eventData.startDate.slice(0, 10) : '');
    if (!fecha) return null;

    const eventDate = new Date(`${fecha}T${eventData.hora || "09:00:00"}`);
    const timeDiff = eventDate.getTime() - Date.now();
    if (timeDiff <= 0) return null;

    const reminderTime = timeDiff - 3600000; // 1 hora antes
    if (reminderTime > 0 && reminderTime < 86400000 * 3) {
      return setTimeout(() => {
        notificationManager.notify({
          type: "info",
          title: `Recordatorio: ${eventData.titulo || eventData.title || ""}`,
          message: `Evento programado para ${fecha} ${eventData.hora || ""}`,
          source: "calendar",
        });
      }, reminderTime);
    }
    return null;
  }, []);

  // Agregar evento
  const addEvent = useCallback(
    (eventData) => {
      const newEvent = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        ...eventData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notificado: false,
      };
      const newEvents = [...events, newEvent];
      saveEvents(newEvents);

      // Notificar si hay recordatorio
      if (eventData.recordatorio) {
        scheduleReminder(newEvent);
      }

      return newEvent;
    },
    [events, saveEvents, scheduleReminder]
  );
  // Actualizar evento
  const updateEvent = useCallback(
    (id, updates) => {
      const newEvents = events.map((e) =>
        e.id === id
          ? { ...e, ...updates, updatedAt: new Date().toISOString() }
          : e
      );
      saveEvents(newEvents);
      return newEvents.find((e) => e.id === id);
    },
    [events, saveEvents]
  );

  // Eliminar evento
  const deleteEvent = useCallback(
    (id) => {
      const newEvents = events.filter((e) => e.id !== id);
      saveEvents(newEvents);
      return true;
    },
    [events, saveEvents]
  );

  // Obtener eventos por fecha
  const getEventsByDate = useCallback(
    (date) => {
      const dateStr =
        typeof date === "string" ? date : date.toISOString().slice(0, 10);
      return events.filter((e) => e.fecha === dateStr);
    },
    [events]
  );

  // Obtener eventos por mes
  const getEventsByMonth = useCallback(
    (year, month) => {
      const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
      return events.filter((e) => e.fecha && e.fecha.startsWith(monthStr));
    },
    [events]
  );

  // Obtener eventos por caso
  const getEventsByCase = useCallback(
    (casoId) => {
      return events.filter((e) => e.casoId === casoId);
    },
    [events]
  );

  // Notificar evento
  const notifyEvent = useCallback(
    (id) => {
      const event = events.find((e) => e.id === id);
      if (!event) return false;

      notificationManager.notify({
        type: "info",
        title: `Recordatorio: ${event.titulo || event.title || ""}`,
        message: `Fecha: ${event.fecha || event.startDate || ""} ${event.hora || ""}${event.descripcion ? `\n${event.descripcion}` : ""}`,
        source: "calendar",
      });

      updateEvent(id, { notificado: true });
      return true;
    },
    [events, updateEvent]
  );

  const value = {
    events,
    loading,
    addEvent,
    updateEvent,
    deleteEvent,
    getEventsByDate,
    getEventsByMonth,
    getEventsByCase,
    notifyEvent,
  };

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar() {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error("useCalendar must be used within a CalendarProvider");
  }
  return context;
}
