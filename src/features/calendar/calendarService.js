import { createEvent, updateEvent, deleteEvent, getEventsByDateRange } from './calendarStore';
import { reportError } from '../../core/error/reportError';
import { notificationManager } from '../../core/notifications/notificationManager';
import { toLocalDateStr } from '../../utils/dateUtils';

export function useCalendarService() {
  async function checkUpcomingEvents() {
    try {
      const now = new Date();
      const todayStr = toLocalDateStr(now);
      const currentHour = now.getHours();
      const currentMin = now.getHours() * 60 + now.getMinutes();

      // Optimización 1.6.6: consultar solo los eventos de hoy por rango de fecha
      // (antes se leía la tabla completa cada 60s).
      const events = await getEventsByDateRange(`${todayStr}T00:00:00`, `${todayStr}T23:59:59.999`);

      for (const event of events) {
        if (!event.startDate) continue;
        const eventDate = event.startDate.slice(0, 10);
        if (eventDate !== todayStr) continue;

        const eventTimeParts = (event.startDate.slice(11, 16) || '09:00').split(':');
        const eventMinutes = parseInt(eventTimeParts[0]) * 60 + parseInt(eventTimeParts[1]);
        const diffMinutes = eventMinutes - currentMin;

        if (diffMinutes > 0 && diffMinutes <= 30 && !event._notified) {
          notificationManager.notify({
            type: "info",
            title: `Proximo evento: ${event.title}`,
            message: `En ${diffMinutes} min - ${event.description || 'Sin descripcion'}`,
            source: "calendar",
          });
          await updateEvent(event.id, { _notified: true });
        }
      }
    } catch (error) {
      reportError(error, { operation: 'checkUpcomingEvents' });
    }
  }

  async function createEventWithNotification(data) {
    const event = await createEvent(data);
    const diffMs = new Date(event.startDate).getTime() - Date.now();
    if (diffMs > 0 && diffMs < 86400000) {
      scheduleReminder(event);
    }
    return event;
  }

  function scheduleReminder(eventData) {
    if (!eventData) return null;
    const fecha = eventData.startDate ? eventData.startDate.slice(0, 10) : '';
    if (!fecha) return null;
    const eventDate = new Date(eventData.startDate);
    const timeDiff = eventDate.getTime() - Date.now();
    if (timeDiff <= 0) return null;
    const reminderTime = timeDiff - 3600000;
    if (reminderTime > 0 && reminderTime < 86400000 * 3) {
      return setTimeout(() => {
        notificationManager.notify({
          type: "info",
          title: `Recordatorio: ${eventData.title || ''}`,
          message: `Evento programado para ${fecha}`,
          source: "calendar",
        });
      }, reminderTime);
    }
    return null;
  }

  return { checkUpcomingEvents, createEventWithNotification };
}
