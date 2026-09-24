import { describe, it, expect } from "vitest";
import { getOrderedMiEspacioKeys, MI_ESPACIO_KEYS, DEFAULT_MI_ESPACIO_ORDER } from "./miEspacioConfig";

describe("miEspacioConfig", () => {
  it("el orden por defecto contiene las 9 secciones sin repetir", () => {
    expect(DEFAULT_MI_ESPACIO_ORDER).toEqual([
      "hoy",
      "jornada",
      "proxima",
      "eventos",
      "pendientes",
      "productividad",
      "metas",
      "acciones",
      "accesos",
    ]);
    expect(new Set(DEFAULT_MI_ESPACIO_ORDER).size).toBe(MI_ESPACIO_KEYS.length);
  });

  it("normaliza un orden inválido sin lanzar errores", () => {
    expect(getOrderedMiEspacioKeys(null)).toEqual(MI_ESPACIO_KEYS);
  });

  it("descarta claves desconocidas y duplicados", () => {
    const order = getOrderedMiEspacioKeys(["hoy", "desconocida", "hoy", "metas", "acciones"]);
    expect(order).toEqual([
      "hoy",
      "metas",
      "acciones",
      "jornada",
      "proxima",
      "eventos",
      "pendientes",
      "productividad",
      "accesos",
    ]);
  });

  it("agrega las secciones faltantes y conserva el orden dado", () => {
    const order = getOrderedMiEspacioKeys(["productividad", "pendientes"]);
    expect(order.indexOf("productividad")).toBeLessThan(order.indexOf("pendientes"));
    expect(order).toHaveLength(MI_ESPACIO_KEYS.length);
  });

  it("inyecta 'eventos' en órdenes guardados previos a la separación", () => {
    const legacy = ["hoy", "jornada", "proxima", "pendientes", "productividad", "metas", "acciones", "accesos"];
    const order = getOrderedMiEspacioKeys(legacy);
    expect(order).toContain("eventos");
    expect(order).toHaveLength(MI_ESPACIO_KEYS.length);
    expect(order.indexOf("proxima")).toBeLessThan(order.indexOf("eventos"));
  });
});