/**
 * operatorStore.test.js  (1.9.7 · fix B5)
 * Canales de pub/sub del operador: en 1.9.6 solo las metas notificaban en la
 * misma pestaña; el Dashboard quedaba desactualizado al editar perfil o
 * disponibilidad. Ahora hay dos canales: subscribeOperatorGoals (metas) y
 * subscribeOperatorData (perfil/disponibilidad/preferencias).
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  saveOperatorProfile,
  saveOperatorAvailability,
  saveOperatorGoals,
  saveOperatorSettings,
  subscribeOperatorData,
  subscribeOperatorGoals,
} from "./operatorStore";

describe("operatorStore · pub/sub (1.9.7 fix B5)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saveOperatorAvailability notifica solo el canal de datos", () => {
    let data = 0;
    let goals = 0;
    const offData = subscribeOperatorData(() => data++);
    const offGoals = subscribeOperatorGoals(() => goals++);
    saveOperatorAvailability({ vacations: [] });
    expect(data).toBe(1);
    expect(goals).toBe(0);
    offData();
    offGoals();
  });

  it("saveOperatorProfile notifica el canal de datos", () => {
    let data = 0;
    const off = subscribeOperatorData(() => data++);
    saveOperatorProfile({ fullName: "Test Perfil" });
    expect(data).toBe(1);
    off();
  });

  it("saveOperatorSettings notifica el canal de datos", () => {
    let data = 0;
    const off = subscribeOperatorData(() => data++);
    saveOperatorSettings({ jornadaReminders: false });
    expect(data).toBe(1);
    off();
  });

  it("saveOperatorGoals notifica solo el canal de metas (no el de datos)", () => {
    let data = 0;
    let goals = 0;
    const offData = subscribeOperatorData(() => data++);
    const offGoals = subscribeOperatorGoals(() => goals++);
    saveOperatorGoals({});
    expect(goals).toBe(1);
    expect(data).toBe(0);
    offData();
    offGoals();
  });

  it("el unsubscribe deja de notificar", () => {
    let data = 0;
    const off = subscribeOperatorData(() => data++);
    off();
    saveOperatorProfile({ fullName: "Sin Suscriptores" });
    expect(data).toBe(0);
  });

  it("varios suscriptores reciben la notificación", () => {
    let a = 0;
    let b = 0;
    const offA = subscribeOperatorData(() => a++);
    const offB = subscribeOperatorData(() => b++);
    saveOperatorAvailability({ holidays: [] });
    expect(a).toBe(1);
    expect(b).toBe(1);
    offA();
    offB();
  });
});
