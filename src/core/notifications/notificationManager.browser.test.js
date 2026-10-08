import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Notification API simulada (jsdom no la implementa) — 1.10.0 · feature B.
const created = [];
class MockNotification {
  static permission = 'granted';
  static requestPermission = vi.fn(async () => 'granted');
  constructor(title, options = {}) {
    this.title = title;
    this.options = options;
    created.push(this);
  }
  close = vi.fn();
}

import { notificationManager, requestBrowserPermission } from './notificationManager';

// Controla document.hidden (jsdom lo expone como getter en el prototype).
function setDocumentHidden(value) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => value });
}

describe('notificationManager · navegador (1.10.0 · feature B)', () => {
  beforeEach(() => {
    vi.stubGlobal('Notification', MockNotification);
    created.length = 0;
    MockNotification.permission = 'granted';
    notificationManager.configure({ notifEscritorio: true });
    setDocumentHidden(true); // por defecto: pestaña oculta
  });

  afterEach(() => {
    notificationManager.configure({ notifEscritorio: false });
    setDocumentHidden(false);
    vi.unstubAllGlobals();
  });

  it('notifica con prioridad high cuando la pestaña está oculta', () => {
    notificationManager._browserNotify({
      type: 'case',
      id: '1',
      title: 'Caso',
      message: 'aviso',
      priority: 'high',
    });
    expect(created).toHaveLength(1);
    expect(created[0].title).toBe('Caso');
    expect(created[0].options.body).toBe('aviso');
    expect(created[0].options.tag).toBe('app-case-1');
  });

  it('no notifica si la pestaña está visible', () => {
    setDocumentHidden(false);
    notificationManager._browserNotify({
      id: '1',
      title: 'x',
      message: 'y',
      priority: 'high',
    });
    expect(created).toHaveLength(0);
  });

  it('solo prioridad high/critical', () => {
    notificationManager._browserNotify({ id: '1', title: 'x', priority: 'medium' });
    notificationManager._browserNotify({ id: '2', title: 'x', priority: 'low' });
    expect(created).toHaveLength(0);
    notificationManager._browserNotify({ id: '3', title: 'x', priority: 'critical' });
    expect(created).toHaveLength(1);
    // Sin type → fallback 'notif' en el tag.
    expect(created[0].options.tag).toBe('app-notif-3');
  });

  it('sin permiso o con la opción off no notifica', () => {
    MockNotification.permission = 'default';
    notificationManager._browserNotify({ id: '1', title: 'x', priority: 'high' });
    expect(created).toHaveLength(0);

    MockNotification.permission = 'granted';
    notificationManager.configure({ notifEscritorio: false });
    notificationManager._browserNotify({ id: '1', title: 'x', priority: 'high' });
    expect(created).toHaveLength(0);
  });

  it('requestBrowserPermission respeta el estado del permiso', async () => {
    MockNotification.permission = 'granted';
    await expect(requestBrowserPermission()).resolves.toBe('granted');

    MockNotification.permission = 'denied';
    await expect(requestBrowserPermission()).resolves.toBe('denied');

    // Solo pide permiso si está en estado 'default'.
    MockNotification.permission = 'default';
    MockNotification.requestPermission.mockResolvedValueOnce('granted');
    await expect(requestBrowserPermission()).resolves.toBe('granted');
    expect(MockNotification.requestPermission).toHaveBeenCalledTimes(1);
  });
});
