import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SpeechsView } from "./SpeechsView";

const noop = vi.fn();

const renderVista = (props = {}) =>
  render(
    <SpeechsView
      speechs={["SPEECH V.1: Hola"]}
      setSpeechs={noop}
      speechsInteractivos={[]}
      setSpeechsInteractivos={noop}
      showToast={noop}
      {...props}
    />
  );

describe("SpeechsView (pills Clásicos | Interactivos)", () => {
  it("muestra las dos pestañas y arranca en Clásicos", () => {
    renderVista();
    const pills = screen.getByLabelText("Secciones de Speechs");
    expect(pills).toBeTruthy();
    expect(screen.getByText("Clásicos")).toBeTruthy();
    expect(screen.getByText("Interactivos")).toBeTruthy();
    expect(screen.getByPlaceholderText("Escribe un nuevo speech...")).toBeTruthy();
    expect(
      screen.queryByText("No hay speechs interactivos. Creá uno con el botón de arriba.")
    ).toBeNull();
  });

  it("cambia a Interactivos y vuelve a Clásicos", () => {
    renderVista();
    fireEvent.click(screen.getByText("Interactivos"));
    expect(
      screen.getByText("No hay speechs interactivos. Creá uno con el botón de arriba.")
    ).toBeTruthy();
    expect(screen.queryByPlaceholderText("Escribe un nuevo speech...")).toBeNull();

    fireEvent.click(screen.getByText("Clásicos"));
    expect(screen.getByPlaceholderText("Escribe un nuevo speech...")).toBeTruthy();
    expect(
      screen.queryByText("No hay speechs interactivos. Creá uno con el botón de arriba.")
    ).toBeNull();
  });
});
