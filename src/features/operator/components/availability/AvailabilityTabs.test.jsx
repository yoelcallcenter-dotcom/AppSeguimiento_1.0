import React from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { UXProvider } from "../../../../context/UXContext";
import { AvailabilityTabs } from "./AvailabilityTabs";

function filaDeTabs(container) {
  return container.querySelector(".flex-wrap");
}

describe("AvailabilityTabs (alineación, 1.9.3)", () => {
  it("respeta alineacionPestanas=izquierda", () => {
    const { container } = render(
      <UXProvider config={{ alineacionPestanas: "izquierda" }}>
        <AvailabilityTabs availability={{}} tab="vacaciones" onTabChange={() => {}} />
      </UXProvider>
    );
    expect(filaDeTabs(container).style.justifyContent).toBe("flex-start");
  });

  it("respeta alineacionPestanas=derecha y el default centro", () => {
    const izq = render(
      <UXProvider config={{ alineacionPestanas: "derecha" }}>
        <AvailabilityTabs availability={{}} tab="vacaciones" onTabChange={() => {}} />
      </UXProvider>
    );
    expect(filaDeTabs(izq.container).style.justifyContent).toBe("flex-end");
    izq.unmount();

    const def = render(
      <AvailabilityTabs availability={{}} tab="vacaciones" onTabChange={() => {}} />
    );
    expect(filaDeTabs(def.container).style.justifyContent).toBe("space-between");
  });
});
