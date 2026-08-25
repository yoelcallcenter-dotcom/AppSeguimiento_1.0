import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..");

describe("PWA manifest", () => {
  const manifest = JSON.parse(
    readFileSync(join(ROOT, "public", "manifest.json"), "utf8")
  );

  it("es válido para instalación (campos obligatorios)", () => {
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.description).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.display).toBe("standalone");
    expect(manifest.theme_color).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(manifest.background_color).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(manifest.id).toBeTruthy();
  });

  it("incluye iconos 192/512 con propósito any y maskable", () => {
    const sizes = manifest.icons.map((i) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
    const purposes = manifest.icons.map((i) => i.purpose).join(" ");
    expect(purposes).toContain("any");
    expect(purposes).toContain("maskable");
    manifest.icons.forEach((icon) => {
      expect(icon.type).toBe("image/png");
      expect(icon.src).toBeTruthy();
    });
  });

  it("define shortcuts para acciones rápidas", () => {
    expect(Array.isArray(manifest.shortcuts)).toBe(true);
    expect(manifest.shortcuts.length).toBeGreaterThanOrEqual(1);
    manifest.shortcuts.forEach((s) => {
      expect(s.name).toBeTruthy();
      expect(s.url).toBeTruthy();
    });
  });
});

describe("Service Worker", () => {
  const sw = readFileSync(join(ROOT, "public", "sw.js"), "utf8");

  it("tiene los tres eventos clave", () => {
    expect(sw).toContain('addEventListener("install"');
    expect(sw).toContain('addEventListener("activate"');
    expect(sw).toContain('addEventListener("fetch"');
  });

  it("precachea desde asset-manifest.json y la app shell", () => {
    expect(sw).toContain("asset-manifest.json");
    expect(sw).toContain("index.html");
    expect(sw).toContain("caches.open");
  });

  it("habilita auto-update (skipWaiting + clients.claim + SKIP_WAITING)", () => {
    expect(sw).toContain("self.skipWaiting()");
    expect(sw).toContain("self.clients.claim()");
    expect(sw).toContain("SKIP_WAITING");
  });

  it("da fallback offline para navegaciones", () => {
    expect(sw).toContain("network-first");
    expect(sw).toContain("handleNavigation");
  });
});

describe("cliente PWA (initPWA)", () => {
  let registerMock;
  let windowLoadHandler;
  let pwaModule;

  async function loadPwaModule() {
    vi.resetModules();
    pwaModule = await import("./pwa");
    return pwaModule;
  }

  function installServiceWorkerMock(controller, workerStates = []) {
    const registration = {
      installing: null,
      waiting: null,
      listeners: {},
      addEventListener(type, cb) {
        this.listeners[type] = cb;
      },
    };
    registerMock = vi.fn(() => Promise.resolve(registration));
    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        controller,
        register: registerMock,
        getRegistration: vi.fn(() => Promise.resolve(null)),
      },
      configurable: true,
    });
    return registration;
  }

  beforeEach(async () => {
    vi.stubEnv("NODE_ENV", "production");
    window.addEventListener = vi.spyOn(window, "addEventListener");
    windowLoadHandler = undefined;
    window.addEventListener.mockImplementation((type, cb) => {
      if (type === "load") windowLoadHandler = cb;
    });
    await loadPwaModule();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("registra el service worker en producción", async () => {
    const registration = installServiceWorkerMock(null);
    pwaModule.initPWA();
    windowLoadHandler();
    await Promise.resolve();
    await Promise.resolve();
    expect(registerMock).toHaveBeenCalledWith("/sw.js");
    expect(registration.listeners.updatefound).toBeTruthy();
  });

  function makeWorker() {
    return {
      state: "installing",
      listeners: {},
      addEventListener(type, cb) {
        this.listeners[type] = cb;
      },
    };
  }

  async function simulateUpdate(registration, worker) {
    registration.installing = worker;
    registration.listeners.updatefound();
    worker.listeners.statechange({});
    worker.state = "installed";
    worker.listeners.statechange();
  }

  it("avisa offlineReady en la primera instalación", async () => {
    const registration = installServiceWorkerMock(null);
    const onOfflineReady = vi.fn();
    const onNeedRefresh = vi.fn();
    pwaModule.initPWA({ onNeedRefresh, onOfflineReady });
    windowLoadHandler();
    await Promise.resolve();
    await Promise.resolve();

    await simulateUpdate(registration, makeWorker());

    expect(onOfflineReady).toHaveBeenCalledTimes(1);
    expect(onNeedRefresh).not.toHaveBeenCalled();
  });

  it("avisa needRefresh cuando hay una versión nueva", async () => {
    const registration = installServiceWorkerMock({ state: "activated" });
    const onNeedRefresh = vi.fn();
    pwaModule.initPWA({ onNeedRefresh });
    windowLoadHandler();
    await Promise.resolve();
    await Promise.resolve();

    await simulateUpdate(registration, makeWorker());

    expect(onNeedRefresh).toHaveBeenCalledTimes(1);
  });

  it("no registra nada fuera de producción", async () => {
    vi.stubEnv("NODE_ENV", "development");
    installServiceWorkerMock(null);
    await loadPwaModule();
    pwaModule.initPWA();
    expect(registerMock).not.toHaveBeenCalled();
  });
});
