import { describe, it, expect } from "vitest";
import { getEstados } from "./catalogos";
import { ESTADOS } from "./constants";

// C03 (1.10.1): antes getEstados re-agregaba SIEMPRE los defaults faltantes,
// así que borrar o renombrar un estado no se sostenía (el default volvía a
// aparecer al lado del nuevo o "Eliminar" no tenía efecto). Con
// `estadosDeleted` desaparece, siguiendo el patrón de tiposIngresoDeleted /
// fichaFieldsDeleted. Estos tests cubren el nuevo contrato.
describe("getEstados · C03 (1.10.1)", () => {
  it("sin config (o no-array) devuelve los defaults de siempre", () => {
    expect(getEstados()).toEqual(ESTADOS);
    expect(getEstados(undefined)).toEqual(ESTADOS);
    expect(getEstados({})).toEqual(ESTADOS);
  });

  it("compat: sin estadosDeleted sigue agregando defaults faltantes (actualizaciones)", () => {
    const res = getEstados({ estados: [{ v: "Firmo", accent: "#10B981", peso: 1 }] });
    expect(res[0].v).toBe("Firmo");
    expect(res).toHaveLength(ESTADOS.length);
    expect(res.some((e) => e.v === "Baja")).toBe(true);
  });

  it("NO re-agrega los defaults marcados en estadosDeleted (bug: reaparecían)", () => {
    const res = getEstados({
      estados: [{ v: "Firmado", accent: "#10B981", peso: 1 }],
      estadosDeleted: ["Firmo"],
    });
    expect(res.some((e) => e.v === "Firmo")).toBe(false);
    expect(res.some((e) => e.v === "Firmado")).toBe(true);
    // Los defaults NO borrados siguen agregándose (solo "Firmo" estaba tachado).
    expect(res.some((e) => e.v === "Baja")).toBe(true);
  });

  it("lista vacía: sana con defaults si nadie borró nada, pero respeta el borrado total", () => {
    expect(getEstados({ estados: [] })).toEqual(ESTADOS);
    expect(
      getEstados({ estados: [], estadosDeleted: ESTADOS.map((e) => e.v) })
    ).toEqual([]);
  });
});
