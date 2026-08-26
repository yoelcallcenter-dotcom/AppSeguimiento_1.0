import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useClipboard } from "./useClipboard";

describe("useClipboard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    document.execCommand = vi.fn().mockReturnValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete document.execCommand;
  });

  it("devuelve copiado=false inicialmente", () => {
    const { result } = renderHook(() => useClipboard());
    expect(result.current.copiado).toBe(false);
  });

  it("copiar exitoso setea copiado=true", async () => {
    const { result } = renderHook(() => useClipboard());
    await act(async () => {
      await result.current.copiar("texto test");
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("texto test");
    expect(result.current.copiado).toBe(true);
  });

  it("copiado se resetea despues del timeout", async () => {
    const { result } = renderHook(() => useClipboard(1000));
    await act(async () => {
      await result.current.copiar("hola");
    });
    expect(result.current.copiado).toBe(true);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.copiado).toBe(false);
  });

  it("fallback a execCommand cuando clipboard API falla", async () => {
    navigator.clipboard.writeText.mockRejectedValueOnce(new Error("not allowed"));
    document.execCommand.mockReturnValue(true);
    const { result } = renderHook(() => useClipboard());
    let ok;
    await act(async () => {
      ok = await result.current.copiar("fallback text");
    });
    expect(ok).toBe(true);
    expect(result.current.copiado).toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith("copy");
  });

  it("fallback a execCommand cuando clipboard API no existe", async () => {
    delete navigator.clipboard;
    document.execCommand.mockReturnValue(true);
    const { result } = renderHook(() => useClipboard());
    let ok;
    await act(async () => {
      ok = await result.current.copiar("no api text");
    });
    expect(ok).toBe(true);
    expect(result.current.copiado).toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith("copy");
  });

  it("retorna false si clipboard API y fallback ambos fallan", async () => {
    navigator.clipboard.writeText.mockRejectedValueOnce(new Error("fail"));
    document.execCommand.mockReturnValue(false);
    const { result } = renderHook(() => useClipboard());
    let ok;
    await act(async () => {
      ok = await result.current.copiar("nope");
    });
    expect(ok).toBe(false);
    expect(result.current.copiado).toBe(false);
  });

  it("copiar retorna true en exito", async () => {
    const { result } = renderHook(() => useClipboard());
    let ok;
    await act(async () => {
      ok = await result.current.copiar("ok");
    });
    expect(ok).toBe(true);
  });

  it("llamadas multiples resetean el timer", async () => {
    const { result } = renderHook(() => useClipboard(500));
    await act(async () => {
      await result.current.copiar("primera");
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    await act(async () => {
      await result.current.copiar("segunda");
    });
    expect(result.current.copiado).toBe(true);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.copiado).toBe(false);
  });
});
