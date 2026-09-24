import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AccesosCard } from "./AccesosCard";

const base = {
  credentials: {
    entries: [
      { id: 1, service: "ART Provincial", user: "j.paz" },
      { id: 2, service: "Portal SRT", user: "m.rojas" },
    ],
  },
  onNavigateAccesos: () => {},
};

describe("AccesosCard", () => {
  it("renderiza sin errores con entradas", () => {
    const { container } = render(<AccesosCard {...base} />);
    expect(container.querySelectorAll("button,div").length).toBeGreaterThan(0);
    expect(screen.getByText("ART Provincial")).toBeTruthy();
    expect(screen.getByText("Portal SRT")).toBeTruthy();
  });

  it("muestra estado vacio sin entradas", () => {
    render(<AccesosCard credentials={{ entries: [] }} onNavigateAccesos={() => {}} />);
    expect(screen.getByText(/sin accesos guardados/i)).toBeTruthy();
  });

  it("renderiza correctamente sin callback de navegacion", () => {
    const { container } = render(<AccesosCard credentials={base.credentials} />);
    expect(container.querySelectorAll(".flex").length).toBeGreaterThan(0);
  });
});
