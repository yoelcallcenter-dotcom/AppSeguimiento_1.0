import { describe, it, expect } from 'vitest';
import {
  DASH_TAB_MAP,
  DASH_WIDGET_REGISTRY,
  DEFAULT_DASH_TAB_ORDER,
  DEFAULT_DASH_WIDGET_ORDER,
  getOrderedDashTabOrder,
  getOrderedDashWidgets,
} from './dashboardConfig';

describe('dashboardConfig', () => {
  it('define 7 tabs con icono y label propios', () => {
    expect(Object.keys(DASH_TAB_MAP)).toHaveLength(7);
    expect(DASH_TAB_MAP.resumen.label).toBe('Resumen');
    expect(DASH_TAB_MAP.rendimiento.icon).toBeDefined();
    expect(DASH_TAB_MAP.rendimiento.icon).not.toEqual(DASH_TAB_MAP.analitica.icon);
  });

  it('mantiene el orden por defecto de las pestañas', () => {
    expect(DEFAULT_DASH_TAB_ORDER).toEqual(Object.keys(DASH_TAB_MAP));
    expect(getOrderedDashTabOrder(undefined)).toEqual(DEFAULT_DASH_TAB_ORDER);
  });

  it('reordena pestañas respetando el set de valores', () => {
    const reversed = [...DEFAULT_DASH_TAB_ORDER].reverse();
    expect(getOrderedDashTabOrder(reversed)).toEqual(reversed);
  });

  it('registra 17 widgets en el tab resumen', () => {
    // v1.10.0 (feature A): se agregó metaFirmas → 16 → 17.
    const keys = Object.keys(DASH_WIDGET_REGISTRY.resumen);
    expect(keys).toHaveLength(17);
  });

  it('cada widget registrado tiene label, defaultOrder e icono', () => {
    Object.entries(DASH_WIDGET_REGISTRY).forEach(([tab, widgets]) => {
      Object.entries(widgets).forEach(([id, w]) => {
        expect(typeof w.label, `widget ${tab}.${id}`).toBe('string');
        expect(typeof w.defaultOrder, `widget ${tab}.${id}`).toBe('number');
        expect(w.icon, `widget ${tab}.${id} sin icono`).toBeDefined();
      });
    });
  });

  it('incluye proximasAcciones en el orden por defecto de resumen', () => {
    expect(DEFAULT_DASH_WIDGET_ORDER.resumen).toContain('proximasAcciones');
  });

  it('normaliza un orden legacy inyectando widgets faltantes', () => {
    const legacy = ['miDia', 'generalMetrics'];
    const next = getOrderedDashWidgets(legacy, 'resumen');
    legacy.forEach((id) => expect(next).toContain(id));
    Object.keys(DASH_WIDGET_REGISTRY.resumen).forEach((id) => expect(next).toContain(id));
    expect(next).toHaveLength(Object.keys(DASH_WIDGET_REGISTRY.resumen).length);
  });

  it('preserva el orden del usuario cuando están todos los widgets', () => {
    const reversed = [...DEFAULT_DASH_WIDGET_ORDER.resumen].reverse();
    expect(getOrderedDashWidgets(reversed, 'resumen')).toEqual(reversed);
  });

  it('soporta tab sin widgets devolviendo lista vacía', () => {
    expect(getOrderedDashWidgets(undefined, 'tabla')).toEqual([]);
  });

  it('descarta claves inválidas del orden persistido', () => {
    const next = getOrderedDashWidgets(['noExiste1', 'generalMetrics'], 'resumen');
    expect(next).not.toContain('noExiste1');
    expect(next).toContain('generalMetrics');
  });
});