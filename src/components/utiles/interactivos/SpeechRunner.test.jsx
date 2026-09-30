import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SpeechRunner } from "./SpeechRunner";

const objeciones = [
  { id: "o1", titulo: "No le interesa", contenido: "Explicar los beneficios." },
  { id: "o2", titulo: "Es muy caro", contenido: "Mencionar el plan de cuotas." },
];

const speechConLlave = {
  id: "s1",
  nombre: "Prueba",
  descripcion: "",
  startStepId: "p1",
  steps: [
    {
      id: "p1",
      titulo: "Apertura",
      contenido: "Si dice que no:\n{OBJECION:o1}",
      orden: 0,
      opciones: [],
    },
  ],
};

const speechSinLlave = {
  id: "s2",
  nombre: "Simple",
  descripcion: "",
  startStepId: "p1",
  steps: [
    { id: "p1", titulo: "", contenido: "Contenido plano.", orden: 0, opciones: [] },
  ],
};

describe("SpeechRunner (resolución de objeciones)", () => {
  it("resuelve la llave mostrando título arriba y contenido debajo", () => {
    render(<SpeechRunner speech={speechConLlave} onClose={() => {}} objeciones={objeciones} />);
    const bloque = screen.getByText(/Si dice que no:/);
    expect(bloque.textContent).toBe(
      "Si dice que no:\nNo le interesa\nExplicar los beneficios."
    );
  });

  it("la llave desconocida se muestra literal", () => {
    render(<SpeechRunner speech={speechConLlave} onClose={() => {}} objeciones={[]} />);
    expect(screen.getByText(/\{OBJECION:o1\}/)).toBeTruthy();
  });

  it("sin llaves el contenido se muestra tal cual", () => {
    render(<SpeechRunner speech={speechSinLlave} onClose={() => {}} objeciones={objeciones} />);
    expect(screen.getByText("Contenido plano.")).toBeTruthy();
  });
});
