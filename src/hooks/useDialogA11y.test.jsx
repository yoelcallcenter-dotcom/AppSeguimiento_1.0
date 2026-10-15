import React, { useRef, useEffect, useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useDialogA11y, __resetEscapeStack } from "./useDialogA11y";

/**
 * N17 (1.10.1): Escape pasa a una pila global en fase capture. Antes cada
 * diálogo (y useKeyboardShortcuts en App) tenía su listener de document:
 * UN solo Escape cerraba todas las capas a la vez (rompía useModalStack).
 * Ahora solo actúa el TOPE de la pila (LIFO) y el evento se cancela para el
 * resto de listeners.
 */

// Diálogo mínimo con useDialogA11y y su propio onEscape.
function Dialogo({ onEscape, label, abierto = true }) {
  const ref = useRef(null);
  useDialogA11y(ref, abierto, { onEscape });
  if (!abierto) return null;
  return (
    <div ref={ref} data-testid={label}>
      <button type="button">Cerrar</button>
    </div>
  );
}

describe("useDialogA11y: pila de Escape (N17)", () => {
  beforeEach(() => {
    __resetEscapeStack();
    window.localStorage.clear();
    window.location.hash = "";
  });

  it("solo cierra el diálogo TOPE de la pila (LIFO)", () => {
    const cerrarInferior = vi.fn();
    const cerrarSuperior = vi.fn();
    render(
      <>
        <Dialogo label="inferior" onEscape={cerrarInferior} />
        <Dialogo label="superior" onEscape={cerrarSuperior} />
      </>
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(cerrarSuperior).toHaveBeenCalledTimes(1);
    expect(cerrarInferior).not.toHaveBeenCalled();
  });

  it("al cerrarse el tope, el siguiente Escape cierra el siguiente de la pila", () => {
    const cerrarInferior = vi.fn();
    const cerrarSuperior = vi.fn();
    function App({ mostrarSuperior }) {
      return (
        <>
          <Dialogo label="inferior" onEscape={cerrarInferior} />
          {mostrarSuperior && (
            <Dialogo label="superior" onEscape={cerrarSuperior} />
          )}
        </>
      );
    }
    const { rerender } = render(<App mostrarSuperior={true} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(cerrarSuperior).toHaveBeenCalledTimes(1);
    rerender(<App mostrarSuperior={false} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(cerrarInferior).toHaveBeenCalledTimes(1);
    expect(cerrarSuperior).toHaveBeenCalledTimes(1);
  });

  it("cancela el evento: los listeners bubble de document no se enteran", () => {
    const bubble = vi.fn();
    document.addEventListener("keydown", bubble);
    render(<Dialogo label="unico" onEscape={vi.fn()} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(bubble).not.toHaveBeenCalled();
    document.removeEventListener("keydown", bubble);
  });

  it("teclas distintas de Escape no cierran nada ni cancelan el evento", () => {
    const cerrar = vi.fn();
    const bubble = vi.fn();
    document.addEventListener("keydown", bubble);
    render(<Dialogo label="unico" onEscape={cerrar} />);
    fireEvent.keyDown(document, { key: "Enter" });
    expect(cerrar).not.toHaveBeenCalled();
    expect(bubble).toHaveBeenCalled();
    document.removeEventListener("keydown", bubble);
  });

  it("sin onEscape registrado no entra a la pila", () => {
    // Un diálogo sin onEscape no debe bloquear Escape para los demás.
    const cerrarCapaSuperior = vi.fn();
    render(
      <>
        <Dialogo label="sin-escape" onEscape={undefined} />
        <Dialogo label="con-escape" onEscape={cerrarCapaSuperior} />
      </>
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(cerrarCapaSuperior).toHaveBeenCalledTimes(1);
  });
});
