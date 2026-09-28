import React from "react";
import { render, fireEvent, waitFor, screen, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";

window.matchMedia =
  window.matchMedia ||
  ((q) => ({
    matches: false,
    media: q,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
window.ResizeObserver =
  window.ResizeObserver ||
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
window.IntersectionObserver =
  window.IntersectionObserver ||
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  };
window.requestIdleCallback =
  window.requestIdleCallback || ((cb) => setTimeout(() => cb({ timeRemaining: () => 50 }), 50));
window.cancelIdleCallback = window.cancelIdleCallback || clearTimeout;
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});
window.scrollTo = window.scrollTo || (() => {});

const errors = [];
const origError = console.error;
console.error = (...a) => {
  errors.push(a.map((x) => (x instanceof Error ? x.stack : String(x))).join(" "));
};
window.addEventListener("error", (e) => errors.push(String(e.error || e.message)));
window.addEventListener("unhandledrejection", (e) => errors.push(String(e.reason)));

const wait = async (ms) => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
};

const click = (sel) => {
  const el = typeof sel === "string" ? document.querySelector(sel) : sel;
  if (!el) throw new Error(`falta elemento: ${sel}`);
  fireEvent.click(el);
};

const severeErrors = () =>
  errors.filter((e) => /not a function|Element type is invalid|Hooks|Cannot read|undefined/.test(e));

describe("App smoke", () => {
  it("recorre app completa sin excepciones", async () => {
    localStorage.setItem("app-onboarding-done", "true");
    const { default: App } = await import("./App");
    const mounted = render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );

    const tabs = ["mi-espacio", "dashboard", "kanban", "tabla", "reportes", "utiles"];
    for (const id of tabs) {
      await waitFor(() => expect(document.querySelector(`[data-tour="${id}"]`), id).toBeTruthy(), {
        timeout: 15000,
      });
      click(`[data-tour="${id}"]`);
      await wait(700);
    }

    const groupSel = '[aria-label="Grupos de Útiles"] button';
    const pillSel = '[aria-label="Secciones de Útiles"] button';
    await waitFor(
      () => expect(document.querySelectorAll(groupSel).length, "grupos de Utiles").toBeGreaterThan(0),
      { timeout: 35000 }
    );
    const groupCount = document.querySelectorAll(groupSel).length;
    for (let g = 0; g < groupCount; g++) {
      const groups = document.querySelectorAll(groupSel);
      if (groups[g]) {
        fireEvent.click(groups[g]);
        await wait(400);
      }
      const pills = document.querySelectorAll(pillSel);
      for (const pill of pills) {
        fireEvent.click(pill);
        await wait(400);
      }
    }

    click('[data-tour="configuracion"]');
    await wait(1500);
    const fichaTab = screen.queryByText(/Pegado de Ficha/);
    if (fichaTab) {
      fireEvent.click(fichaTab);
      await wait(600);
    }
    const grepErrors = severeErrors();
    expect(grepErrors, "ERRORES TRAS CONFIG:\n" + grepErrors.join("\n---\n")).toEqual([]);

    click('[data-tour="ayuda"]');
    await wait(1000);
    click('[data-tour="calendario"]');
    await wait(1200);
    click('[data-tour="notas"]');
    await wait(1200);
    click('[data-tour="filtros-globales"]');
    await wait(800);
    click('button[aria-label^="Notificaciones"]');
    await wait(600);

    const mid = severeErrors();
    expect(mid, "ERRORES TRAS OVERLAYS:\n" + mid.join("\n---\n")).toEqual([]);

    mounted.unmount();

    const noop = () => {};
    const { CONFIG_DEFAULT } = await import("./utils/constants");
    const caso = {
      id: 1,
      nombre: "Caso Smoke",
      telefono: "3001112233",
      estado: "Cita virtual",
      fecha: "2026-09-01",
      tags: ["test"],
      comentarios: [],
    };

    const { VerCasoModal } = await import("./components/modales/VerCasoModal");
    const r1 = render(
      <VerCasoModal
        caso={caso}
        config={CONFIG_DEFAULT}
        casos={[caso]}
        onClose={noop}
        onEdit={noop}
        covered={false}
        onComentarios={noop}
        onActualizarCaso={noop}
        onDelete={noop}
        onNuevaNota={noop}
        onNuevoEvento={noop}
        onReporteRapido={noop}
        onNavigateToNote={noop}
        onNavigateToEvent={noop}
        onNavigateInsurer={noop}
        onNavigateLawFirm={noop}
        navigationStack={[]}
        onBackNavigation={noop}
        showToast={noop}
        condicionales={[]}
        speechs={[]}
        objeciones={[]}
      />
    );
    await wait(600);
    r1.unmount();

    const { CasoEditModal } = await import("./components/modales/CasoEditModal");
    const r2 = render(
      <CasoEditModal
        caso={caso}
        casos={[caso]}
        mapeo={[]}
        config={CONFIG_DEFAULT}
        onConfigChange={noop}
        onSave={noop}
        onDelete={noop}
        stacked={false}
        onClose={noop}
        onNuevaNota={noop}
        onNuevoEvento={noop}
        showToast={noop}
      />
    );
    await wait(600);
    r2.unmount();

    const { ReporteRapidoModal } = await import("./components/modales/ReporteRapidoModal");
    const r3 = render(
      <ReporteRapidoModal
        casos={[caso]}
        casoInicial={null}
        estadoInicial={null}
        config={CONFIG_DEFAULT}
        onGuardar={noop}
        onClose={noop}
        stacked={false}
        showToast={noop}
      />
    );
    await wait(600);
    r3.unmount();

    const final = severeErrors();
    expect(final, "ERRORES FINALES:\n" + final.join("\n---\n")).toEqual([]);
    console.error = origError;
  }, 180000);
});
