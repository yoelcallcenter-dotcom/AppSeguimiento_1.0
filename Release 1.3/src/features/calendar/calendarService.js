import { getAllEvents, createEvent, updateEvent, deleteEvent } from './calendarStore';
import { reportError } from '../../core/error/reportError';
import { notificationService } from '../../utils/notifications';

export function useCalendarService() {
  async function checkUpcomingEvents() {
    try {
      const events = await getAllEvents();
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const currentHour = now.getHours();
      const currentMin = now.getHours() * 60 + now.getMinutes();

      for (const event of events) {
        if (!event.startDate) continue;
        const eventDate = event.startDate.slice(0, 10);
        if (eventDate !== todayStr) continue;

        const eventTimeParts = (event.startDate.slice(11, 16) || '09:00').split(':');
        const eventMinutes = parseInt(eventTimeParts[0]) * 60 + parseInt(eventTimeParts[1]);
        const diffMinutes = eventMinutes - currentMin;

        if (diffMinutes > 0 && diffMinutes <= 30 && !event._notified) {
          notificationService.show(
            `Proximo evento: ${event.title}`,
            `En ${diffMinutes} min - ${event.description || 'Sin descripcion'}`
          );
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
      notificationService.scheduleReminder(event);
    }
    return event;
  }

  return { checkUpcomingEvents, createEventWithNotification };
}
