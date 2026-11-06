import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  crearHistorial,
  registrarCambio,
  puedeDeshacer,
  puedeRehacer,
  useHistorialSpeech,
  MAX_ENTRADAS_HISTORIAL,
} from "./historialSpeech";

/**
 * historialSpeech.test.js (Release 1.11.1)
 * Deshacer/rehacer local del constructor visual: snapshots, coalescencia de
 * tecleo, rehacer tras deshacer, cambios externos y límite de memoria.
 */

const s0 = { id: "s", nombre: "Uno", version: 2 };
const s1 = { id: "s", nombre: "Uno a", version: 2 };
const s2 = { id: "s", nombre: "Uno ab", version: 2 };

describe("historial puro", () => {
  it("registra cambios y descarta el futuro al volver a editar", () => {
    let h = crearHistorial(s0);
    h = registrarCambio(h, s1);
    h = registrarCambio(h, s2);
    expect(h.entradas.map((e) => e.speech)).toEqual([s0, s1, s2]);
    expect(h.indice).toBe(2);
    expect(puedeDeshacer(h)).toBe(true);
    expect(puedeRehacer(h)).toBe(false);
  });

  it("coalesce ráfagas de tecleo con la misma clave", () => {
    let h = crearHistorial(s0);
    h = registrarCambio(h, s1, "campo:nombre");
    h = registrarCambio(h, s2, "campo:nombre");
    expect(h.entradas).toHaveLength(2);
    expect(h.entradas[1]).toEqual({ speech: s2, clave: "campo:nombre" });
    // Al cambiar de campo sí se crea un paso nuevo.
    h = registrarCambio(h, { ...s2, descripcion: "x" }, "campo:descripcion");
    expect(h.entradas).toHaveLength(3);
  });

  it("ignora el mismo objeto y respeta el límite de entradas", () => {
    let h = crearHistorial(s0);
    expect(registrarCambio(h, s0)).toBe(h);
    for (let i = 1; i <= MAX_ENTRADAS_HISTORIAL + 10; i += 1) {
      h = registrarCambio(h, { ...s0, n: i });
    }
    expect(h.entradas).toHaveLength(MAX_ENTRADAS_HISTORIAL);
    expect(h.indice).toBe(MAX_ENTRADAS_HISTORIAL - 1);
  });
});

describe("useHistorialSpeech", () => {
  it("aplicar llama a onChange y deshacer/rehacer restauran snapshots", () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ speech, cambiar }) => useHistorialSpeech(speech, cambiar),
      { initialProps: { speech: s0, cambiar: onChange } }
    );

    act(() => result.current.aplicar(s1, { clave: "campo:nombre" }));
    expect(onChange).toHaveBeenCalledWith(s1);
    rerender({ speech: s1, cambiar: onChange });

    act(() => result.current.aplicar(s2, { clave: "campo:nombre" }));
    rerender({ speech: s2, cambiar: onChange });

    // Coalescencia: un solo paso de tecleo.
    expect(result.current.puedeDeshacer).toBe(true);
    act(() => result.current.deshacer());
    expect(onChange).toHaveBeenLastCalledWith(s0);
    expect(result.current.puedeRehacer).toBe(true);

    act(() => result.current.rehacer());
    expect(onChange).toHaveBeenLastCalledWith(s2);
  });

  it("registra cambios hechos fuera del constructor sin duplicar los propios", () => {
    const onChange = vi.fn();
    const externo = { id: "s", nombre: "Desde la cabecera", version: 2 };
    const { result, rerender } = renderHook(
      ({ speech }) => useHistorialSpeech(speech, onChange),
      { initialProps: { speech: s0 } }
    );
    expect(result.current.puedeDeshacer).toBe(false);

    // Cambio externo (por ejemplo el nombre editado en la cabecera).
    rerender({ speech: externo });
    expect(result.current.puedeDeshacer).toBe(true);

    act(() => result.current.deshacer());
    expect(onChange).toHaveBeenLastCalledWith(s0);
    expect(result.current.puedeRehacer).toBe(true);

    // Tras deshacer, aplicar un cambio nuevo descarta el futuro (rehacer).
    act(() => result.current.aplicar(externo));
    expect(result.current.puedeRehacer).toBe(false);
    expect(result.current.historial.entradas).toHaveLength(2);
  });

  it("acepta aplicar sin opciones (null) sin romper el historial", () => {
    // Regresión 1.11.1: conectar/eliminar/crear llaman `aplicar(nuevo, null)`.
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ speech }) => useHistorialSpeech(speech, onChange),
      { initialProps: { speech: s0 } }
    );
    expect(() => {
      act(() => result.current.aplicar(s1, null));
    }).not.toThrow();
    rerender({ speech: s1 });
    expect(onChange).toHaveBeenCalledWith(s1);
    expect(result.current.historial.entradas).toHaveLength(2);
    expect(result.current.historial.entradas[1].clave).toBe(null);
  });

  it("no hace nada si no hay pasos para deshacer o rehacer", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useHistorialSpeech(s0, onChange));
    act(() => result.current.deshacer());
    act(() => result.current.rehacer());
    expect(onChange).not.toHaveBeenCalled();
  });
});
