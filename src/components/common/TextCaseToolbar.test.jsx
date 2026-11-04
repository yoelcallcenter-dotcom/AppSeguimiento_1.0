import React, { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TextCaseToolbar } from "./TextCaseToolbar";

/**
 * TextCaseToolbar.test.jsx (v1.10.11)
 * Fija la toolbar de transformación de texto: los 6 botones con su título,
 * que cada clic aplica SU modo sobre el valor y devuelve el resultado por
 * onChange (string plano), y la guardia sin onChange.
 */
describe("TextCaseToolbar · transformación de texto (1.10.11)", () => {
  it("muestra los 6 modos con aria-label = título completo", () => {
    render(<TextCaseToolbar value="x" onChange={() => {}} />);
    [
      "MAYÚSCULAS",
      "minúsculas",
      "Tipo oración",
      "Tipo Título",
      "Alternar mayúsculas y minúsculas",
      "Quitar espacios de más",
    ].forEach((titulo) => {
      expect(screen.getByRole("button", { name: titulo })).toBeTruthy();
    });
    expect(screen.getByRole("group", { name: "Transformar texto" })).toBeTruthy();
  });

  it("cada botón transforma el valor completo y lo devuelve por onChange", () => {
    const onChange = vi.fn();
    render(<TextCaseToolbar value="hola MUNDO  espacios" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "MAYÚSCULAS" }));
    expect(onChange).toHaveBeenLastCalledWith("HOLA MUNDO  ESPACIOS");

    fireEvent.click(screen.getByRole("button", { name: "Tipo oración" }));
    expect(onChange).toHaveBeenLastCalledWith("Hola mundo  espacios");

    fireEvent.click(screen.getByRole("button", { name: "Quitar espacios de más" }));
    expect(onChange).toHaveBeenLastCalledWith("hola MUNDO espacios");
  });

  it("integrado con un stateful real: actualiza el valor paso a paso", () => {
    function Campo() {
      const [v, setV] = useState("PRIMERA LINEA\nsegunda");
      return (
        <>
          <output data-testid="salida">{v}</output>
          <TextCaseToolbar value={v} onChange={setV} ariaLabel="Formato del reporte" />
        </>
      );
    }
    render(<Campo />);

    fireEvent.click(screen.getByRole("button", { name: "Tipo oración" }));
    expect(screen.getByTestId("salida").textContent).toBe(
      "Primera linea\nSegunda"
    );
    fireEvent.click(screen.getByRole("button", { name: "Alternar mayúsculas y minúsculas" }));
    expect(screen.getByTestId("salida").textContent).toBe("pRiMeRa LiNeA\nsEgUnDa");
  });

  it("sin onChange no renderiza nada (guardia)", () => {
    const { container } = render(<TextCaseToolbar value="x" />);
    expect(container.innerHTML).toBe("");
  });
});
