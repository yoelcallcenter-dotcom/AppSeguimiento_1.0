import React, { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { HelpProvider } from "../../help";
import { ThemeProvider } from "../../context/ThemeContext";
import { UXProvider } from "../../context/UXContext";
import { ConfiguracionView } from "./ConfiguracionView";
import { CONFIG_DEFAULT } from "../../utils/constants";

const noop = () => {};

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

function VistaConfig({ onCfg }) {
  const [cfg, setCfg] = useState({ ...CONFIG_DEFAULT });
  const setConfig = (next) => {
    setCfg(next);
    if (onCfg) onCfg(next);
  };
  return (
    <ThemeProvider>
      <HelpProvider>
        <ConfiguracionView
          config={cfg}
          setConfig={setConfig}
          pasos={[]}
          setPasos={noop}
          tips={[]}
          setTips={noop}
          links={[]}
          setLinks={noop}
          speechs={[]}
          setSpeechs={noop}
          speechsInteractivos={[]}
          setSpeechsInteractivos={noop}
          objeciones={[]}
          setObjeciones={noop}
          art={[]}
          setArt={noop}
          transito={[]}
          setTransito={noop}
          lesiones={{}}
          setLesiones={noop}
          mapeo={[]}
          setMapeo={noop}
          observacionesTransito={[]}
          setObservacionesTransito={noop}
          condicionales={[]}
          setCondicionales={noop}
          showToast={noop}
          casos={[]}
          onEliminarTodos={noop}
          setCasos={noop}
        />
      </HelpProvider>
    </ThemeProvider>
  );
}

const abrirPegadoDeFicha = () => {
  const grupos = screen.getByLabelText("Grupos de Configuración");
  fireEvent.click(within(grupos).getByText("Avanzado"));
  const secciones = screen.getByLabelText("Secciones de Configuración");
  fireEvent.click(within(secciones).getByText("Pegado de Ficha"));
};

const tipear = (input, texto) => {
  let escrito = "";
  for (const ch of texto) {
    escrito += ch;
    fireEvent.change(input, { target: { value: escrito } });
    expect(input.value).toBe(escrito);
  }
};

describe("ConfiguracionView", () => {
  it("UX/Navegación queda en el grupo Apariencia y no en Avanzado", () => {
    render(<VistaConfig />);
    const grupos = screen.getByLabelText("Grupos de Configuración");
    const secciones = screen.getByLabelText("Secciones de Configuración");

    fireEvent.click(within(grupos).getByText("Apariencia"));
    expect(within(secciones).getByText("UX/Navegación")).toBeTruthy();

    fireEvent.click(within(grupos).getByText("Avanzado"));
    expect(within(secciones).queryByText("UX/Navegación")).toBeNull();
    expect(within(secciones).getByText("Pegado de Ficha")).toBeTruthy();
  });

  it("Pegado de Ficha permite tipear keywords con comas y espacios", () => {
    let visto = null;
    render(<VistaConfig onCfg={(c) => (visto = c)} />);
    abrirPegadoDeFicha();

    const input = screen.getByLabelText("Palabras clave de NOMBRE");
    fireEvent.change(input, { target: { value: "" } });
    tipear(input, "obra, salud");
    fireEvent.blur(input);

    expect(input.value).toBe("obra, salud");
    const guardado = (visto.fichaFields || []).find((f) => f.id === "nombre");
    expect(guardado.keywords).toEqual(["obra", "salud"]);
  });

  it("eliminar un campo default no lo hace reaparecer y Restaurar lo devuelve", () => {
    let visto = null;
    render(<VistaConfig onCfg={(c) => (visto = c)} />);
    abrirPegadoDeFicha();

    expect(screen.getByLabelText("Destino de ART")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Eliminar ART"));
    expect(screen.queryByLabelText("Destino de ART")).toBeNull();
    expect(visto.fichaFieldsDeleted).toContain("art");
    expect(
      (visto.fichaFields || []).some((f) => f.id === "art")
    ).toBe(false);

    fireEvent.click(screen.getByText("Restaurar por defecto"));
    expect(screen.getByLabelText("Destino de ART")).toBeTruthy();
    expect(visto.fichaFieldsDeleted).toEqual([]);
  });

  it("Alineación de pestañas: sección en UX/Navegación con descripción y default Centro", () => {
    render(<VistaConfig />);
    const grupos = screen.getByLabelText("Grupos de Configuración");
    fireEvent.click(within(grupos).getByText("Apariencia"));
    const secciones = screen.getByLabelText("Secciones de Configuración");
    fireEvent.click(within(secciones).getByText("UX/Navegación"));

    const radiogroup = screen.getByLabelText("Alineación de pestañas");
    expect(within(radiogroup).getByText("Izquierda")).toBeTruthy();
    expect(within(radiogroup).getByText("Centro")).toBeTruthy();
    expect(within(radiogroup).getByText("Derecha")).toBeTruthy();
    expect(
      within(radiogroup).getByRole("radio", { name: "Centro" }).getAttribute("aria-checked")
    ).toBe("true");
    expect(
      screen.getByText("Define cómo se distribuyen las pestañas dentro del espacio disponible.")
    ).toBeTruthy();
  });

  it("Alineación de pestañas: cambiar a Derecha actualiza config.alineacionPestanas", () => {
    let visto = null;
    render(<VistaConfig onCfg={(c) => (visto = c)} />);
    const grupos = screen.getByLabelText("Grupos de Configuración");
    fireEvent.click(within(grupos).getByText("Apariencia"));
    const secciones = screen.getByLabelText("Secciones de Configuración");
    fireEvent.click(within(secciones).getByText("UX/Navegación"));

    const radiogroup = screen.getByLabelText("Alineación de pestañas");
    fireEvent.click(within(radiogroup).getByText("Derecha"));
    expect(visto.alineacionPestanas).toBe("derecha");

    fireEvent.click(within(radiogroup).getByText("Izquierda"));
    expect(visto.alineacionPestanas).toBe("izquierda");
  });

  it("Alineación de pestañas: Grupos y Secciones usan justifyContent por defecto (1.9.3)", () => {
    render(<VistaConfig />);
    expect(screen.getByLabelText("Grupos de Configuración").style.justifyContent).toBe(
      "space-between"
    );
    expect(screen.getByLabelText("Secciones de Configuración").style.justifyContent).toBe(
      "space-between"
    );
  });

  it("Alineación de pestañas: izquierda y derecha se reflejan en Grupos y Secciones (1.9.3)", () => {
    const izq = render(
      <UXProvider config={{ alineacionPestanas: "izquierda" }}>
        <VistaConfig />
      </UXProvider>
    );
    expect(screen.getByLabelText("Grupos de Configuración").style.justifyContent).toBe(
      "flex-start"
    );
    expect(screen.getByLabelText("Secciones de Configuración").style.justifyContent).toBe(
      "flex-start"
    );
    izq.unmount();

    render(
      <UXProvider config={{ alineacionPestanas: "derecha" }}>
        <VistaConfig />
      </UXProvider>
    );
    expect(screen.getByLabelText("Grupos de Configuración").style.justifyContent).toBe(
      "flex-end"
    );
    expect(screen.getByLabelText("Secciones de Configuración").style.justifyContent).toBe(
      "flex-end"
    );
  });
});
