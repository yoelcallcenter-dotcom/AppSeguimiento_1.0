import React from "react";
import { describe, it, expect, vi } from "vitest";
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
