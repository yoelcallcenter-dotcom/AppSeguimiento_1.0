import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NavDock, SubPills } from "./UINav";
import { Sun, Target } from "lucide-react";

const items = [
  { id: "hoy", label: "Hoy", icon: Sun },
  { id: "metas", label: "Mis metas", icon: Target },
];

describe("UINav", () => {
  it("NavDock renderiza los items y resalta el activo", () => {
    const onSelect = vi.fn();
    render(<NavDock items={items} active="hoy" onSelect={onSelect} />);
    expect(screen.getByRole("button", { name: /Hoy/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Mis metas/i })).toBeTruthy();
  });

  it("NavDock dispara onSelect al hacer clic", () => {
    const onSelect = vi.fn();
    render(<NavDock items={items} active="hoy" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: /Mis metas/i }));
    expect(onSelect).toHaveBeenCalledWith("metas");
  });

  it("SubPills renderiza y selecciona", () => {
    const onSelect = vi.fn();
    render(<SubPills items={items} active="metas" onSelect={onSelect} />);
    expect(screen.getByRole("button", { name: /Hoy/i })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Hoy/i }));
    expect(onSelect).toHaveBeenCalledWith("hoy");
  });

  it("SubPills muestra badges cuando están definidos", () => {
    const badged = [{ id: "a", label: "Aseguradoras", badge: 5 }];
    const onSelect = vi.fn();
    render(<SubPills items={badged} active="a" onSelect={onSelect} />);
    expect(screen.getByText("5")).toBeTruthy();
  });

  it("SubPills singleLine usa tab-strip sin envolver a segunda línea", () => {
    const onSelect = vi.fn();
    render(<SubPills items={items} active="metas" onSelect={onSelect} singleLine />);
    const grupo = screen.getByRole("group");
    expect(grupo.className).toContain("tab-strip");
    expect(grupo.className).toContain("scrollbar-hide");
    expect(grupo.className).not.toContain("flex-wrap");
  });

  it("NavDock es accesible por aria-label", () => {
    const onSelect = vi.fn();
    render(<NavDock items={items} active="hoy" onSelect={onSelect} ariaLabel="Secciones" />);
    expect(screen.getByRole("group", { name: "Secciones" })).toBeTruthy();
  });
});