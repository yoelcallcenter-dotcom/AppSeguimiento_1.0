import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useViewTransition } from "./useViewTransition";

const ORDER = ["dashboard", "kanban", "tabla"];

describe("useViewTransition", () => {
  let scrollSpy;

  beforeEach(() => {
    scrollSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    Object.defineProperty(window, "scrollY", { value: 0, writable: true });
  });

  afterEach(() => {
    scrollSpy.mockRestore();
    vi.useRealTimers();
  });

  it("muestra la vista activa sin clases de animacion al inicio", () => {
    const { result } = renderHook(() =>
      useViewTransition("dashboard", ORDER)
    );
    expect(result.current.showView("dashboard")).toBe(true);
    expect(result.current.showView("kanban")).toBe(false);
    expect(result.current.isHiddenView("dashboard")).toBe(false);
    expect(result.current.classNameFor("dashboard")).toBe("");
  });

  it("al terminar la transicion la vista activa queda sin clases (sin transform residual)", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ view }) => useViewTransition(view, ORDER),
      { initialProps: { view: "dashboard" } }
    );
    act(() => {
      rerender({ view: "kanban" });
    });
    act(() => {
      vi.runAllTimers();
    });
    expect(result.current.classNameFor("kanban")).toBe("");
    expect(result.current.classNameFor("dashboard")).toBe(
      "view-transition-hidden"
    );
  });

  it("mantiene la vista anterior visible durante la transicion y luego la oculta sin desmontarla", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ view }) => useViewTransition(view, ORDER),
      { initialProps: { view: "dashboard" } }
    );

    act(() => {
      rerender({ view: "kanban" });
    });

    // Ambas vistas visibles durante la transicion
    expect(result.current.showView("dashboard")).toBe(true);
    expect(result.current.showView("kanban")).toBe(true);
    // La saliente va hacia la izquierda, la entrante desde la derecha
    expect(result.current.classNameFor("dashboard")).toBe(
      "view-transition-exit view-exit-left"
    );
    expect(result.current.classNameFor("kanban")).toBe(
      "view-transition-enter view-enter-right"
    );

    act(() => {
      vi.runAllTimers();
    });

    // Tras la transicion la vista anterior queda montada pero oculta
    expect(result.current.showView("dashboard")).toBe(true);
    expect(result.current.isHiddenView("dashboard")).toBe(true);
    expect(result.current.classNameFor("dashboard")).toBe(
      "view-transition-hidden"
    );
    expect(result.current.showView("kanban")).toBe(true);
    expect(result.current.isHiddenView("kanban")).toBe(false);
  });

  it("conserva todas las vistas visitadas (ocultas) al navegar entre varias", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ view }) => useViewTransition(view, ORDER),
      { initialProps: { view: "dashboard" } }
    );

    act(() => {
      rerender({ view: "kanban" });
    });
    act(() => {
      vi.runAllTimers();
    });
    act(() => {
      rerender({ view: "tabla" });
    });
    act(() => {
      vi.runAllTimers();
    });
    act(() => {
      rerender({ view: "dashboard" });
    });
    act(() => {
      vi.runAllTimers();
    });

    expect(result.current.showView("dashboard")).toBe(true);
    expect(result.current.showView("kanban")).toBe(true);
    expect(result.current.showView("tabla")).toBe(true);
    expect(result.current.isHiddenView("kanban")).toBe(true);
    expect(result.current.isHiddenView("tabla")).toBe(true);
    expect(result.current.isHiddenView("dashboard")).toBe(false);
    expect(result.current.classNameFor("kanban")).toBe(
      "view-transition-hidden"
    );
  });

  it("al volver a una pestaña anterior la direccion se invierte (desde la izquierda)", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ view }) => useViewTransition(view, ORDER),
      { initialProps: { view: "tabla" } }
    );

    act(() => {
      rerender({ view: "dashboard" });
    });

    expect(result.current.classNameFor("dashboard")).toBe(
      "view-transition-enter view-enter-left"
    );
    expect(result.current.classNameFor("tabla")).toBe(
      "view-transition-exit view-exit-right"
    );

    act(() => {
      vi.runAllTimers();
    });
  });

  it("usa fundido como fallback cuando la vista no esta en el orden", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ view }) => useViewTransition(view, ORDER),
      { initialProps: { view: "dashboard" } }
    );

    act(() => {
      rerender({ view: "configuracion" });
    });

    expect(result.current.classNameFor("configuracion")).toBe(
      "view-transition-enter view-enter-fade"
    );
    expect(result.current.classNameFor("dashboard")).toBe(
      "view-transition-exit view-exit-fade"
    );

    act(() => {
      vi.runAllTimers();
    });
  });

  it("nunca manipula el scroll (al montar ni al cambiar de vista)", () => {
    vi.useFakeTimers();
    const { rerender } = renderHook(
      ({ view }) => useViewTransition(view, ORDER),
      { initialProps: { view: "dashboard" } }
    );
    expect(scrollSpy).not.toHaveBeenCalled();

    Object.defineProperty(window, "scrollY", { value: 400, writable: true });
    act(() => {
      rerender({ view: "kanban" });
    });
    act(() => {
      vi.runAllTimers();
    });
    act(() => {
      rerender({ view: "dashboard" });
    });

    expect(scrollSpy).not.toHaveBeenCalled();
  });
});
