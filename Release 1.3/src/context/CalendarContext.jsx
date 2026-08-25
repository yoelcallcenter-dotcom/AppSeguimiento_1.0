import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { notificationService } from "../utils/notifications";

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
      console.error("Error loading calendar events:", error);
    }
    setLoading(false);
  }, []);

  // Guardar eventos
  const saveEvents = useCallback((newEvents) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newEvents));
      setEvents(newEvents);
    } catch (error) {
      console.error("Error saving calendar events:", error);
    }
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
        notificationService.scheduleReminder(newEvent);
      }

      return newEvent;
    },
    [events, saveEvents]
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

      notificationService.show(
        `Recordatorio: ${event.titulo}`,
        `Fecha: ${event.fecha} ${event.hora || ""}\n${event.descripcion || ""}`
      );

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
