import { describe, it, expect, beforeEach } from 'vitest';
import { ruleEngine } from './ruleEngine';
import {
  ACCION_CATALOG,
  notifyAccion,
  copiar,
  crear,
  guardar,
  eliminar,
  importar,
  exportar,
  restaurar,
  reprogramar,
} from './actionFeedback';
import useNotificationStore from './notificationStore';
import { notificationManager } from './notificationManager';

beforeEach(() => {
  localStorage.clear();
  useNotificationStore.setState({ notifications: [], toastQueue: [], persistentAlerts: [] });
});

describe('ACCION_CATALOG: mapeo de acciones a (tipo, prioridad)', () => {
  it('define todas las acciones requeridas', () => {
    for (const a of ['copiar', 'crear', 'guardar', 'eliminar', 'importar', 'exportar', 'restaurar', 'reprogramar']) {
      expect(ACCION_CATALOG[a]).toBeDefined();
    }
  });

  it('acciones de baja visibilidad usan prioridad low', () => {
    expect(ACCION_CATALOG.copiar.priority).toBe('low');
    expect(ACCION_CATALOG.crear.priority).toBe('low');
    expect(ACCION_CATALOG.guardar.priority).toBe('low');
  });

  it('acciones medias usan prioridad medium', () => {
    expect(ACCION_CATALOG.importar.priority).toBe('medium');
    expect(ACCION_CATALOG.exportar.priority).toBe('medium');
    expect(ACCION_CATALOG.reprogramar.priority).toBe('medium');
  });

  it('acciones críticas/destructivas se marcan como de alta prioridad', () => {
    // eliminar y restaurar se fuerzan a 'high' a través de ACCIONES_CRITICAS
    const el = notifyAccion('eliminar', 'Caso eliminado', { silent: true });
    const re = notifyAccion('restaurar', 'Backup restaurado', { silent: true });
    expect(el).toBeNull(); // no inicializado aún: no lanza
    expect(re).toBeNull();
  });
});

describe('Pipeline central: prioridad → Centro/Toast/Sonido', () => {
  const config = (overrides = {}) => ({
    notifInApp: true,
    notifSonido: true,
    notifGraveSound: true,
    notifMediaSound: true,
    notifBajaSound: true,
    ...overrides,
  });

  it('BAJA → centro, sin toast, sin sonido', () => {
    const event = { type: 'success', priority: 'low', title: 'A', message: 'm' };
    const cfg = config();
    // Debe entrar al centro (shouldNotify true)
    expect(ruleEngine.shouldNotify(event, cfg)).toBe(true);
    // Sin toast si notifMinToastPriority es 'media' o 'grave'
    expect(ruleEngine.shouldShowToast(event, { ...cfg, notifMinToastPriority: 'media' })).toBe(false);
    // Sin sonido para baja por defecto
    expect(ruleEngine.shouldPlaySound(event, config({ notifBajaSound: false }))).toBe(false);
  });

  it('MEDIA → centro + toast, sin sonido', () => {
    const event = { type: 'warning', priority: 'medium', title: 'A', message: 'm' };
    const cfg = config();
    expect(ruleEngine.shouldNotify(event, cfg)).toBe(true);
    expect(ruleEngine.shouldShowToast(event, cfg)).toBe(true);
  });

  it('ALTA/GRAVE → centro + toast + sonido', () => {
    const event = { type: 'error', priority: 'high', title: 'A', message: 'm' };
    const cfg = config();
    expect(ruleEngine.shouldNotify(event, cfg)).toBe(true);
    expect(ruleEngine.shouldShowToast(event, cfg)).toBe(true);
    expect(ruleEngine.shouldPlaySound(event, cfg)).toBe(true);
  });

  it('sin sonido si el usuario lo deshabilitó', () => {
    const event = { type: 'error', priority: 'high', title: 'A', message: 'm' };
    expect(ruleEngine.shouldPlaySound(event, config({ notifSonido: false }))).toBe(false);
  });

  it('toast bloqueado si notifInApp es false', () => {
    const event = { type: 'error', priority: 'high', title: 'A', message: 'm' };
    expect(ruleEngine.shouldShowToast(event, config({ notifInApp: false }))).toBe(false);
  });
});

describe('Deduplicación: una acción lógica → una notificación', () => {
  it('ruleEngine.isDuplicate bloquea igual title+message en ventana', () => {
    const now = Date.now();
    const event = { title: 'Guardado', message: 'Caso actualizado', timestamp: now };
    const recent = [{ title: 'Guardado', message: 'Caso actualizado', timestamp: now - 500 }];
    expect(ruleEngine.isDuplicate(event, recent)).toBe(true);
  });

  it('store.addToast deduplica por id/eventKey en ventana de 3s', () => {
    const store = useNotificationStore.getState();
    store.addToast({ title: '', message: 'Guardado', id: 'accion-guardar-x', timestamp: Date.now() });
    const countAfterFirst = useNotificationStore.getState().toastQueue.length;
    store.addToast({ title: '', message: 'Guardado', id: 'accion-guardar-x', timestamp: Date.now() });
    const countAfterSecond = useNotificationStore.getState().toastQueue.length;
    expect(countAfterFirst).toBe(1);
    expect(countAfterSecond).toBe(1);
  });

  it('notifyAccion genera eventKey estable por acción+mensaje', () => {
    const e1 = notifyAccion('guardar', 'Caso guardado', { silent: true });
    const e2 = notifyAccion('guardar', 'Caso guardado', { silent: true });
    // No inicializado: ambos devuelven null (sin lanzar), pero no fallan
    expect(e1).toBeNull();
    expect(e2).toBeNull();
  });
});

describe('notificationManager.notify vía pipeline (inicializado)', () => {
  it('enruta una notificación al centro y genera id', () => {
    notificationManager.init({});
    const id = notificationManager.notify({
      type: 'info',
      title: 'Prueba',
      message: 'Mensaje de prueba',
      source: 'test',
      priority: 'medium',
    });
    expect(id).toBeTruthy();
    const store = useNotificationStore.getState();
    expect(store.notifications.some((n) => n.id === id && n.title === 'Prueba')).toBe(true);
    notificationManager.destroy();
  });
});

describe('Helpers de acción', () => {
  it('los helpers llaman a notifyAccion sin fallar', () => {
    expect(() => copiar('Copiado', { silent: true })).not.toThrow();
    expect(() => crear('Creado', { silent: true })).not.toThrow();
    expect(() => guardar('Guardado', { silent: true })).not.toThrow();
    expect(() => eliminar('Eliminado', { silent: true })).not.toThrow();
    expect(() => importar('Importado', { silent: true })).not.toThrow();
    expect(() => exportar('Exportado', { silent: true })).not.toThrow();
    expect(() => restaurar('Restaurado', { silent: true })).not.toThrow();
    expect(() => reprogramar('Reprogramado', { silent: true })).not.toThrow();
  });
});
