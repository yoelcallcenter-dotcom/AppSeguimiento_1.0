/**
 * dateUtils.test.js  (1.9.7 · fix B3)
 * Contrato de hoyISO()/toLocalDateStr(): el "hoy" de la app debe salir de los
 * componentes LOCALES del Date, nunca de toISOString() (UTC), que en zonas
 * UTC-negativas (ej. Argentina, UTC-3) adelanta el día entre las 21:00 y
 * medianoche. Este test falla si el código regresa a toISOString().
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { hoyISO, toLocalDateStr } from "./dateUtils";

describe("dateUtils · hoyISO / toLocalDateStr (1.9.7 fix B3)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("toLocalDateStr usa los componentes locales del Date (no UTC)", () => {
    expect(toLocalDateStr(new Date(2026, 0, 1, 23, 59, 59))).toBe("2026-01-01");
    expect(toLocalDateStr(new Date(2026, 11, 31, 0, 5))).toBe("2026-12-31");
    expect(toLocalDateStr(new Date(2026, 5, 15, 12, 0))).toBe("2026-06-15");
  });

  it("hoyISO devuelve el día local en los extremos de medianoche", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 23, 30));
    expect(hoyISO()).toBe("2026-01-01");
    vi.setSystemTime(new Date(2026, 0, 2, 0, 30));
    expect(hoyISO()).toBe("2026-01-02");
  });

  it("hoyISO es igual a toLocalDateStr(new Date())", () => {
    expect(hoyISO()).toBe(toLocalDateStr(new Date()));
  });

  it("siempre devuelve YYYY-MM-DD", () => {
    expect(hoyISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
