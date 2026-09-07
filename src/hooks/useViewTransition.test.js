import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useViewTransition } from "./useViewTransition";

describe("useViewTransition", () => {
  let rafSpy;
  let scrollSpy;

  beforeEach(() => {
    if (typeof window.requestAnimationFrame === "undefined") {
      window.requestAnimationFrame = (cb) => {
        cb(Date.now());
        return 1;
      };
    }
    rafSpy = vi.spyOn(window, "requestAnimationFrame");
    scrollSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    Object.defineProperty(window, "scrollY", { value: 0, writable: true });
  });

  afterEach(() => {
    rafSpy.mockRestore();
    scrollSpy.mockRestore();
    vi.useRealTimers();
  });

  it("muestra la vista activa y no la anterior al inicio", () => {
    const { result } = renderHook(() => useViewTransition("dashboard"));
    expect(result.current.showView("dashboard")).toBe(true);
    expect(result.current.showView("kanban")).toBe(false);
  });

  it("mantiene la vista anterior montada durante la transicion y luego la desmonta", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ view }) => useViewTransition(view),
      { initialProps: { view: "dashboard" } }
    );

    act(() => {
      rerender({ view: "kanban" });
    });

    // Ambas vistas visibles durante la transicion
    expect(result.current.showView("dashboard")).toBe(true);
    expect(result.current.showView("kanban")).toBe(true);
    // La saliente lleva la clase de salida
    expect(result.current.classNameFor("dashboard")).toBe("view-transition-exit");
    expect(result.current.classNameFor("kanban")).toBe("view-transition-enter");

    act(() => {
      vi.runAllTimers();
    });

    // Tras la transicion, solo queda la nueva vista
    expect(result.current.showView("dashboard")).toBe(false);
    expect(result.current.showView("kanban")).toBe(true);
  });

  it("preserva la posicion de scroll de cada vista", () => {
    vi.useFakeTimers();

    Object.defineProperty(window, "scrollY", { value: 0, writable: true });

    const { result, rerender } = renderHook(
      ({ view }) => useViewTransition(view),
      { initialProps: { view: "dashboard" } }
    );

    // Simular scroll en dashboard
    Object.defineProperty(window, "scrollY", { value: 350, writable: true });

    act(() => {
      rerender({ view: "tabla" });
    });
    act(() => {
      vi.runAllTimers();
    });

    // Volver a dashboard: debería restaurar scroll 350
    scrollSpy.mockClear();
    act(() => {
      rerender({ view: "dashboard" });
    });
    act(() => {
      vi.runAllTimers();
    });

    expect(scrollSpy).toHaveBeenCalledWith(0, 350);
  });
});
