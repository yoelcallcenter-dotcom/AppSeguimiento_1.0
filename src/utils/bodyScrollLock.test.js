import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

function setScrollbar(width) {
  Object.defineProperty(window, "innerWidth", { value: 1000 + width, configurable: true, writable: true });
  Object.defineProperty(document.documentElement, "clientWidth", { value: 1000, configurable: true });
}

describe("bodyScrollLock", () => {
  let lockBodyScroll;
  let unlockBodyScroll;
  let isBodyScrollLocked;

  beforeEach(async () => {
    vi.resetModules();
    ({ lockBodyScroll, unlockBodyScroll, isBodyScrollLocked } = await import("./bodyScrollLock"));
    document.body.style.overflow = "";
    document.body.style.paddingRight = "";
    document.documentElement.style.overflow = "";
    setScrollbar(17);
  });

  afterEach(() => {
    setScrollbar(0);
  });

  it("bloquea overflow en html y body y compensa padding-right con el ancho de la barra", () => {
    lockBodyScroll();
    expect(document.documentElement.style.overflow).toBe("hidden");
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.body.style.paddingRight).toBe("17px");
    expect(isBodyScrollLocked()).toBe(true);
  });

  it("sin barra de scroll no agrega padding", () => {
    setScrollbar(0);
    lockBodyScroll();
    expect(document.body.style.paddingRight).toBe("");
    expect(document.body.style.overflow).toBe("hidden");
    unlockBodyScroll();
    expect(document.body.style.paddingRight).toBe("");
  });

  it("preserva el padding-right previo del body y lo restaura al desbloquear", () => {
    document.body.style.paddingRight = "8px";
    lockBodyScroll();
    expect(document.body.style.paddingRight).toBe("25px");
    unlockBodyScroll();
    expect(document.body.style.paddingRight).toBe("8px");
    expect(document.documentElement.style.overflow).toBe("");
    expect(isBodyScrollLocked()).toBe(false);
  });

  it("locks anidados: solo el ultimo unlock restaura overflow y padding", () => {
    lockBodyScroll();
    lockBodyScroll();
    unlockBodyScroll();
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.body.style.paddingRight).toBe("17px");
    expect(isBodyScrollLocked()).toBe(true);
    unlockBodyScroll();
    expect(document.body.style.overflow).toBe("");
    expect(document.documentElement.style.overflow).toBe("");
    expect(document.body.style.paddingRight).toBe("");
    expect(isBodyScrollLocked()).toBe(false);
  });

  it("unlock sin lock previo no genera valores negativos", () => {
    unlockBodyScroll();
    expect(isBodyScrollLocked()).toBe(false);
    lockBodyScroll();
    expect(document.body.style.overflow).toBe("hidden");
    unlockBodyScroll();
    expect(document.body.style.overflow).toBe("");
  });
});
