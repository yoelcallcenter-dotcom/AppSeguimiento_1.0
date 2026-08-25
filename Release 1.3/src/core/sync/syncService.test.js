import { describe, it, expect, vi } from 'vitest';
import {
  notifyChange,
  subscribeToChanges,
  createDebouncedNotifier,
  SYNC_CHANNEL_NAME,
  SYNC_EVENTS,
} from './syncService';

function createOtherTabChannel() {
  return new BroadcastChannel(SYNC_CHANNEL_NAME);
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('syncService', () => {
  it('notifyChange entrega el mensaje a canales de otras pestañas', async () => {
    const other = createOtherTabChannel();
    const received = [];
    other.onmessage = (event) => received.push(event.data);

    notifyChange(SYNC_EVENTS.CASES_UPDATED, { id: 'c1' });
    await flush();

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe(SYNC_EVENTS.CASES_UPDATED);
    expect(received[0].payload.id).toBe('c1');
    expect(received[0].timestamp).toBeTruthy();
  });

  it('subscribeToChanges recibe mensajes de otras pestañas y permite cancelar', async () => {
    const received = [];
    const unsubscribe = subscribeToChanges((event) => received.push(event));

    // Simula otra pestaña publicando directamente en el canal.
    const other = createOtherTabChannel();
    other.postMessage({ type: SYNC_EVENTS.NOTES_UPDATED, payload: { n: 1 }, timestamp: Date.now() });
    await flush();

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe(SYNC_EVENTS.NOTES_UPDATED);
    expect(received[0].source).toBe('sync');

    unsubscribe();
    other.postMessage({ type: SYNC_EVENTS.NOTES_UPDATED, payload: { n: 2 }, timestamp: Date.now() });
    await flush();

    expect(received).toHaveLength(1);
  });

  it('createDebouncedNotifier agrupa notificaciones de alta frecuencia', async () => {
    vi.useFakeTimers();
    try {
      const other = createOtherTabChannel();
      const received = [];
      other.onmessage = (event) => received.push(event.data);

      const notify = createDebouncedNotifier(SYNC_EVENTS.EVENTS_UPDATED, 100);
      notify({ n: 1 });
      notify({ n: 2 });
      notify({ n: 3 });

      await vi.advanceTimersByTimeAsync(150);

      expect(received).toHaveLength(1);
      expect(received[0].payload.n).toBe(3);
    } finally {
      vi.useRealTimers();
    }
  });
});
