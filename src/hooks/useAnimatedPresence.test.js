import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAnimatedPresence, useDelayedClose } from "./useAnimatedPresence";

describe("useAnimatedPresence", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("arranca oculto si isOpen es false", () => {
    const { result } = renderHook(() => useAnimatedPresence(false));
    expect(result.current.isRendered).toBe(false);
    expect(result.current.isLeaving).toBe(false);
  });

  it("se muestra al abrir y queda montado durante la salida", () => {
    const { result, rerender } = renderHook(
      ({ open }) => useAnimatedPresence(open),
      { initialProps: { open: true } }
    );
    expect(result.current.isRendered).toBe(true);
    expect(result.current.isLeaving).toBe(false);

    rerender({ open: false });
    expect(result.current.isRendered).toBe(true);
    expect(result.current.isLeaving).toBe(true);

    act(() => {
      vi.advanceTimersByTime(180);
    });
    expect(result.current.isRendered).toBe(false);
    expect(result.current.isLeaving).toBe(false);
  });

  it("cancela la salida si se vuelve a abrir antes del unmount", () => {
    const { result, rerender } = renderHook(
      ({ open }) => useAnimatedPresence(open),
      { initialProps: { open: true } }
    );

    rerender({ open: false });
    expect(result.current.isLeaving).toBe(true);

    rerender({ open: true });
    expect(result.current.isRendered).toBe(true);
    expect(result.current.isLeaving).toBe(false);

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.isRendered).toBe(true);
    expect(result.current.isLeaving).toBe(false);
  });
});

describe("useDelayedClose", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("llama a onClose una sola vez tras startClose, despues de exitMs", () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useDelayedClose(onClose));

    act(() => {
      result.current.startClose();
      result.current.startClose();
    });
    expect(result.current.isClosing).toBe(true);
    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(180);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("no llama a onClose si nunca se inicia el cierre", () => {
    const onClose = vi.fn();
    renderHook(() => useDelayedClose(onClose));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});
