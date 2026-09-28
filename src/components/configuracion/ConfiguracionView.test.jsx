import React, { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { HelpProvider } from "../../help";
import { ThemeProvider } from "../../context/ThemeContext";
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
});
