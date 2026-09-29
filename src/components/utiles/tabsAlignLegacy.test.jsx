import React from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { UXProvider } from "../../context/UXContext";
import { LesionesView } from "./LesionesView";
import { ConversacionesSugeridasView } from "./ConversacionesSugeridasView";
import { PlantillasView } from "./PlantillasView";

const noop = () => {};

function filaDeCategorias(container) {
  const tab = container.querySelector(".category-tab");
  return tab ? tab.parentElement : null;
}

describe("Filas legacy .category-tab respetan la alineación (1.9.2)", () => {
  it("Lesiones: fila de categorías con flex-start", () => {
    const { container } = render(
      <UXProvider config={{ alineacionPestanas: "izquierda" }}>
        <LesionesView
          lesiones={{ "Accidente Laboral": [] }}
          setLesiones={noop}
          showToast={noop}
        />
      </UXProvider>
    );
    expect(filaDeCategorias(container).style.justifyContent).toBe("flex-start");
  });

  it("Conversaciones Sugeridas: fila de categorías con flex-end", () => {
    const { container } = render(
      <UXProvider config={{ alineacionPestanas: "derecha" }}>
        <ConversacionesSugeridasView config={{}} setConfig={noop} showToast={noop} />
      </UXProvider>
    );
    expect(filaDeCategorias(container).style.justifyContent).toBe("flex-end");
  });

  it("Plantillas: fila de filtros con space-between por defecto", () => {
    const { container } = render(
      <PlantillasView showToast={noop} config={{}} />
    );
    expect(filaDeCategorias(container).style.justifyContent).toBe("space-between");
  });
});

describe("Plantillas: la fila de filtros tiene ancho real para que la alineación opere (1.9.3)", () => {
  it("el contenedor de pills crece (grow) dentro del toolbar", () => {
    const { container } = render(<PlantillasView showToast={noop} config={{}} />);
    const fila = filaDeCategorias(container);
    expect(fila.classList.contains("grow")).toBe(true);
    expect(fila.classList.contains("flex")).toBe(true);
  });

  it("respeta alineacionPestanas=izquierda desde UXContext", () => {
    const { container } = render(
      <UXProvider config={{ alineacionPestanas: "izquierda" }}>
        <PlantillasView showToast={noop} config={{}} />
      </UXProvider>
    );
    expect(filaDeCategorias(container).style.justifyContent).toBe("flex-start");
  });
});
