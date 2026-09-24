import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { copyToClipboard } from "./copyToClipboard";

describe("copyToClipboard", () => {
  let execSpy;

  beforeEach(() => {
    document.execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("usa navigator.clipboard.writeText cuando está disponible", async () => {
    const result = await copyToClipboard("hola");
    expect(result).toBe(true);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("hola");
  });

  it("devuelve false si navigator.clipboard no existe", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    const result = await copyToClipboard("texto");
    expect(result).toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith("copy");
  });

  it("usa fallback si writeText lanza error", async () => {
    navigator.clipboard.writeText.mockRejectedValueOnce(new Error("denied"));
    const result = await copyToClipboard("algo");
    expect(result).toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith("copy");
  });

  it("devuelve false si fallback también falla", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    document.execCommand.mockReturnValue(false);
    const result = await copyToClipboard("nada");
    expect(result).toBe(false);
  });
});
