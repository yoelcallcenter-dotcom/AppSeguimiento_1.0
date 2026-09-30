import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ConversacionesSugeridasView } from "./ConversacionesSugeridasView";

const KEY = "conversaciones_Accidente_Laboral";

describe("ConversacionesSugeridasView (1.9.4)", () => {
  beforeEach(() => localStorage.removeItem(KEY));
  afterEach(() => localStorage.removeItem(KEY));

  const renderVista = (showToast = () => {}) =>
    render(
      <ConversacionesSugeridasView
        config={{}}
        setConfig={() => {}}
        showToast={showToast}
      />
    );

  it("el campo Nuevo mensaje es un textarea multilínea", () => {
    renderVista();
    const campo = screen.getByPlaceholderText(/Nuevo mensaje/);
    expect(campo.tagName).toBe("TEXTAREA");
  });

  it("agrega un mensaje conservando los saltos de línea de Enter", () => {
    const showToast = vi.fn();
    renderVista(showToast);

    const campo = screen.getByPlaceholderText(/Nuevo mensaje/);
    fireEvent.change(campo, { target: { value: "Primera línea\nSegunda línea" } });
    fireEvent.click(screen.getByText("Agregar"));

    const guardados = JSON.parse(localStorage.getItem(KEY));
    expect(guardados).toContain("Primera línea\nSegunda línea");
    expect(showToast).toHaveBeenCalledWith("Mensaje agregado", "success");
    expect(campo.value).toBe("");
  });
});
