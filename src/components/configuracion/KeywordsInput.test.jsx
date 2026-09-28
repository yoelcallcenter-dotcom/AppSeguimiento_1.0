import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { KeywordsInput } from "./KeywordsInput";

const tipear = (input, texto) => {
  let escrito = "";
  for (const ch of texto) {
    escrito += ch;
    fireEvent.change(input, { target: { value: escrito } });
    expect(input.value).toBe(escrito);
  }
};

describe("KeywordsInput", () => {
  it("conserva comas y espacios mientras se tipea y normaliza al perder foco", () => {
    const onCommit = vi.fn();
    render(
      <KeywordsInput
        value={["nombre"]}
        onCommit={onCommit}
        ariaLabel="Palabras clave de prueba"
      />
    );
    const input = screen.getByLabelText("Palabras clave de prueba");
    fireEvent.change(input, { target: { value: "" } });
    tipear(input, "apellido y nombre, contacto");
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(["apellido y nombre", "contacto"]);
    expect(input.value).toBe("apellido y nombre, contacto");
  });

  it("no emite commit si al perder foco no cambió nada", () => {
    const onCommit = vi.fn();
    render(
      <KeywordsInput
        value={["obra", "social"]}
        onCommit={onCommit}
        ariaLabel="Palabras clave de prueba"
      />
    );
    const input = screen.getByLabelText("Palabras clave de prueba");
    fireEvent.focus(input);
    fireEvent.blur(input);
    expect(onCommit).not.toHaveBeenCalled();
    expect(input.value).toBe("obra, social");
  });

  it("sincroniza con un valor externo cuando no tiene foco", () => {
    const { rerender } = render(
      <KeywordsInput value={["a"]} onCommit={vi.fn()} ariaLabel="Palabras clave de prueba" />
    );
    const input = screen.getByLabelText("Palabras clave de prueba");
    rerender(
      <KeywordsInput value={["b", "c"]} onCommit={vi.fn()} ariaLabel="Palabras clave de prueba" />
    );
    expect(input.value).toBe("b, c");
  });
});
