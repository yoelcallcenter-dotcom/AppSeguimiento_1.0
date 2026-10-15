import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import useAppStore from './useAppStore';
import { notificationManager } from '../notifications/notificationManager';
import useNotificationStore from '../notifications/notificationStore';

/**
 * Tests 1.10.1 (T01): useAppStore.addToast debe delegar en
 * notificationManager.notify (canal central con gates de config) en lugar de
 * escribir directo en notificationStore, que era un bypass que ignoraba
 * notifInApp, notifMinToastPriority, frecuencia, modoNoMolestar, sonido,
 * escritorio y el Centro de notificaciones.
 */
describe('useAppStore.addToast · T01 (1.10.1): delega en notificationManager', () => {
  let spy;

  beforeEach(() => {
    localStorage.clear();
    useNotificationStore.setState({ notifications: [], toastQueue: [], persistentAlerts: [] });
    // destroy primero: init() es idempotente mientras _initialized sea true.
    notificationManager.destroy();
    spy = null;
  });

  afterEach(() => {
    if (spy) spy.mockRestore();
    notificationManager.destroy();
  });

  it('ruta el toast por notificationManager.notify con el payload mapeado', async () => {
    notificationManager.init({ notifInApp: true });
    spy = vi.spyOn(notificationManager, 'notify');

    useAppStore.getState().addToast('hola', 'warning', 5000);

    await vi.waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    const payload = spy.mock.calls[0][0];
    // Firma antigua (message, type, duration) mapeada al shape del manager.
    expect(payload).toMatchObject({
      title: '',
      message: 'hola',
      type: 'warning',
      duration: 5000,
    });
    // Y el toast efectivamente llega al contenedor del sistema central.
    await vi.waitFor(() =>
      expect(
        useNotificationStore.getState().toastQueue.some(
          (t) => t.message === 'hola' && t.duration === 5000
        )
      ).toBe(true)
    );
  });

  it('respeta notifInApp=false: el gate corta el toast (antes lo mostraba igual)', async () => {
    notificationManager.init({ notifInApp: false });

    useAppStore.getState().addToast('silenciado', 'info', 3000);

    await new Promise((r) => setTimeout(r, 20));
    expect(
      useNotificationStore.getState().toastQueue.some((t) => t.message === 'silenciado')
    ).toBe(false);
    // Sí entra al Centro (shouldNotify no depende de notifInApp): decisión de
    // producto ya existente del pipeline central.
    expect(
      useNotificationStore.getState().notifications.some((n) => n.message === 'silenciado')
    ).toBe(true);
  });

  it('aplica notifMinToastPriority en notify (T18b): el toast de baja prioridad no se pinta', async () => {
    // T18b (1.10.1): antes el umbral se calculaba en shouldNotify y se tiraba.
    // Con el addToast ya enrutado por notify, el gate vive en shouldShowToast
    // (notificationManager lo invoca antes de pintar): 'info' → prioridad low
    // → nivel 'baja' < 'grave' ⇒ sin toast, pero SÍ registro en el Centro
    // (comportamiento documentado en la UI: "el nivel bajo siempre va al Centro").
    notificationManager.init({ notifInApp: true, notifMinToastPriority: 'grave' });

    useAppStore.getState().addToast('nivel bajo', 'info', 3000);

    await new Promise((r) => setTimeout(r, 20));
    expect(
      useNotificationStore.getState().toastQueue.some((t) => t.message === 'nivel bajo')
    ).toBe(false);
    expect(
      useNotificationStore.getState().notifications.some((n) => n.message === 'nivel bajo')
    ).toBe(true);
  });

  it('manager sin inicializar cae al fallback directo (no se pierde el toast)', async () => {
    notificationManager.destroy();

    useAppStore.getState().addToast('fallback', 'error', 3000);

    await vi.waitFor(() =>
      expect(
        useNotificationStore.getState().toastQueue.some((t) => t.message === 'fallback')
      ).toBe(true)
    );
  });

  // C02b (1.10.1): el fallback anterior escribía el toast directo en
  // notificationStore sin pasar por shouldShowToast, así que con el manager
  // aún no inicializado el toggle ignorarLowPriority no se aplicaba y un
  // aviso de prioridad baja se pintaba igual (usuario: "el toggle no
  // funciona"). Ahora el fallback lee la config persistida y aplica el mismo
  // gate del pipeline central; la prioridad se deriva del type (info→low)
  // igual que en notify(), por lo que los errores (high) no se silencian.
  it('fallback (manager sin init) respeta ignorarLowPriority para prioridad baja (C02b)', async () => {
    notificationManager.destroy();
    localStorage.setItem(
      'config-art-tracker',
      JSON.stringify({ ignorarLowPriority: true })
    );

    useAppStore.getState().addToast('aviso de baja', 'info', 3000);
    await new Promise((r) => setTimeout(r, 30));
    expect(
      useNotificationStore.getState().toastQueue.some((t) => t.message === 'aviso de baja')
    ).toBe(false);

    // Un error (prioridad derivada 'high') NO debe quedar silenciado.
    useAppStore.getState().addToast('fallo serio', 'error', 3000);
    await vi.waitFor(() =>
      expect(
        useNotificationStore.getState().toastQueue.some((t) => t.message === 'fallo serio')
      ).toBe(true)
    );
  });
});
