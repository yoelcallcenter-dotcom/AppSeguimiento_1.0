import { describe, it, expect, beforeEach } from "vitest";
import { getGoalsState, setDailyTarget } from "./productivityStore";
import {
  getOperatorGoals,
  saveOperatorGoals,
  subscribeOperatorGoals,
} from "../operator/operatorStore";

/**
 * 1.9.6 (fix metas unificadas Dashboard ↔ Mi Espacio).
 * - userOperatorGoals es la fuente canónica; setDailyTarget debe escribir ahí
 *   y espejar las claves legacy (userProductivitySettings / userGoals).
 * - getGoalsState ya no toma dailyTarget del snapshot legado userGoals.
 * - La meta de reportes usa el target editable de Mi Espacio y el contador
 *   countReportsOnDay (antes: auto "día hábil anterior", valores distintos).
 * - subscribeOperatorGoals notifica cambios en la misma pestaña.
 */

const CASES_KEY = "app_casos-art-tracker";

function isoLocal(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function operatorGoals(overrides = {}) {
  return {
    daily: {
      cases: { enabled: true, target: 5 },
      reports: { enabled: true, target: 7 },
      firmas: { enabled: false, target: 1 },
    },
    weekly: {
      cases: { enabled: false, target: 25 },
      reports: { enabled: false, target: 25 },
      signed: { enabled: false, target: 5 },
    },
    monthly: {
      cases: { enabled: false, target: 300 },
      reports: { enabled: false, target: 100 },
      signed: { enabled: true, target: 14 },
    },
    custom: [],
    ...overrides,
  };
}

beforeEach(() => localStorage.clear());

describe("setDailyTarget (fuente canónica)", () => {
  it("escribe en userOperatorGoals y espeja las claves legacy", () => {
    setDailyTarget(7);

    const canonico = JSON.parse(localStorage.getItem("userOperatorGoals"));
    expect(canonico.daily.cases.target).toBe(7);
    expect(canonico.daily.cases.enabled).toBe(true);

    const settings = JSON.parse(localStorage.getItem("userProductivitySettings"));
    expect(settings.caseTarget).toBe(7);

    const legacy = JSON.parse(localStorage.getItem("userGoals"));
    expect(legacy.dailyTarget).toBe(7);
  });

  it("notifica a los suscriptores y deja de notificar al darse de baja", () => {
    let notificaciones = 0;
    const unsubscribe = subscribeOperatorGoals(() => {
      notificaciones += 1;
    });

    setDailyTarget(8);
    expect(notificaciones).toBe(1);

    unsubscribe();
    setDailyTarget(9);
    expect(notificaciones).toBe(1);
    // Aunque no notifique, la escritura canónica sigue ocurriendo.
    expect(getOperatorGoals().daily.cases.target).toBe(9);
  });
});

describe("getGoalsState (unificado con Mi Espacio)", () => {
  it("usa la meta de reportes de Mi Espacio y countReportsOnDay (no el día hábil anterior)", () => {
    localStorage.setItem("userOperatorGoals", JSON.stringify(operatorGoals()));
    localStorage.setItem(
      CASES_KEY,
      JSON.stringify([
        // 3 casos creados el día hábil anterior: la lógica vieja daba
        // reportsTarget = 3; con la unificación debe dar el target de Mi Espacio.
        { id: "c1", fecha: "2026-09-14", reporteHistory: [{ fecha: "2026-09-15" }] },
        { id: "c2", fecha: "2026-09-14", reporteHistory: [{ fecha: "2026-09-15" }] },
        { id: "c3", fecha: "2026-09-14", reporteHistory: [] },
        // 1 caso creado el día consultado.
        { id: "c4", fecha: "2026-09-15", reporteHistory: [] },
      ])
    );

    const goals = getGoalsState("2026-09-15");

    expect(goals.dailyTarget).toBe(5);
    expect(goals.reportsEnabled).toBe(true);
    expect(goals.reportsTarget).toBe(7); // meta editable de Mi Espacio (no 3)
    expect(goals.reportsDoneToday).toBe(2); // casos con reporte en el día
    expect(goals.casesLoadedToday).toBe(1);
    // prevDayISO ya no existe: la meta automática del día hábil anterior se
    // eliminó al unificar (era la fuente de la divergencia con Mi Espacio).
    expect(goals).not.toHaveProperty("prevDayISO");
  });

  it("reportes deshabilitados ⇒ target 0 y contador 0", () => {
    localStorage.setItem(
      "userOperatorGoals",
      JSON.stringify(
        operatorGoals({ daily: { cases: { enabled: true, target: 5 }, reports: { enabled: false, target: 9 }, firmas: { enabled: false, target: 1 } } })
      )
    );
    localStorage.setItem(
      CASES_KEY,
      JSON.stringify([{ id: "c1", fecha: "2026-09-14", reporteHistory: [{ fecha: "2026-09-15" }] }])
    );

    const goals = getGoalsState("2026-09-15");
    expect(goals.reportsEnabled).toBe(false);
    expect(goals.reportsTarget).toBe(0);
    expect(goals.reportsDoneToday).toBe(0);
  });

  it("ignora dailyTarget del snapshot legado userGoals (solo conserva contadores)", () => {
    localStorage.setItem(
      "userOperatorGoals",
      JSON.stringify(operatorGoals({ daily: { cases: { enabled: true, target: 5 }, reports: { enabled: true, target: 7 }, firmas: { enabled: false, target: 1 } } }))
    );
    // Clave legacy de productividad con el target vigente (5): es la que la
    // migración considera y la que todos los consumidores deben ver.
    localStorage.setItem("userProductivitySettings", JSON.stringify({ caseTarget: 5 }));
    // Snapshot legado de HOY con un target viejo: antes (override con
    // data.date === hoy) pisaba el valor con 99.
    localStorage.setItem(
      "userGoals",
      JSON.stringify({ date: isoLocal(), dailyTarget: 99, casesMovedToday: 2 })
    );

    const goals = getGoalsState();
    expect(goals.dailyTarget).toBe(5); // del meta vigente, no 99
    expect(goals.casesMovedToday).toBe(2); // contadores de micro-analítica OK
  });
});

describe("migración legacy (operatorStore)", () => {
  it("migra el target legacy pero respeta el enabled deshabilitado", () => {
    localStorage.setItem("userProductivitySettings", JSON.stringify({ caseTarget: 7 }));
    localStorage.setItem(
      "userOperatorGoals",
      JSON.stringify(operatorGoals({ daily: { cases: { enabled: false, target: 5 }, reports: { enabled: true, target: 7 }, firmas: { enabled: false, target: 1 } } }))
    );

    const goals = getOperatorGoals();
    expect(goals.daily.cases.target).toBe(7); // valor legacy migrado
    expect(goals.daily.cases.enabled).toBe(false); // fix: ya no se fuerza a true
  });
});

describe("saveOperatorGoals", () => {
  it("espeja el target a las claves legacy y notifica", () => {
    let notificaciones = 0;
    const unsubscribe = subscribeOperatorGoals(() => {
      notificaciones += 1;
    });

    const actual = getOperatorGoals();
    saveOperatorGoals({
      daily: { ...actual.daily, cases: { ...actual.daily.cases, target: 12 } },
    });
    unsubscribe();

    expect(notificaciones).toBe(1);
    expect(JSON.parse(localStorage.getItem("userProductivitySettings")).caseTarget).toBe(12);
    expect(JSON.parse(localStorage.getItem("userGoals")).dailyTarget).toBe(12);
  });
});
