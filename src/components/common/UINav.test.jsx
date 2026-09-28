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

  it("SubPills singleLine usa tab-strip con scroll visible y sin envolver", () => {
    const onSelect = vi.fn();
    render(<SubPills items={items} active="metas" onSelect={onSelect} singleLine />);
    const grupo = screen.getByRole("group");
    expect(grupo.className).toContain("tab-strip");
    expect(grupo.className).not.toContain("scrollbar-hide");
    expect(grupo.className).not.toContain("flex-wrap");
  });

  it("SubPills muestra separador con etiqueta al cambiar de grupo", () => {
    const agrupados = [
      { id: "a", label: "Speechs", group: "Textos" },
      { id: "b", label: "Objeciones", group: "Textos" },
      { id: "c", label: "Aseguradoras", group: "Directorios" },
    ];
    render(<SubPills items={agrupados} active="a" onSelect={vi.fn()} />);
    expect(screen.getByText("Directorios")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Aseguradoras/ })).toBeTruthy();
  });

  it("SubPills no separa items del mismo grupo ni al inicio", () => {
    const agrupados = [
      { id: "a", label: "Speechs", group: "Textos" },
      { id: "b", label: "Objeciones", group: "Textos" },
      { id: "c", label: "Pasos", group: "Textos" },
    ];
    const { container } = render(
      <SubPills items={agrupados} active="a" onSelect={vi.fn()} />
    );
    expect(screen.queryByText("Textos")).toBeNull();
    expect(container.querySelectorAll("button").length).toBe(3);
  });

  it("NavDock es accesible por aria-label", () => {
    const onSelect = vi.fn();
    render(<NavDock items={items} active="hoy" onSelect={onSelect} ariaLabel="Secciones" />);
    expect(screen.getByRole("group", { name: "Secciones" })).toBeTruthy();
  });

  it("SubPills usa alto fijo en todas las pills con o sin badge", () => {
    const mixto = [
      { id: "a", label: "Speechs" },
      { id: "b", label: "Objeciones", badge: 42 },
    ];
    const { container } = render(<SubPills items={mixto} active="a" onSelect={vi.fn()} />);
    const botones = container.querySelectorAll("button");
    expect(botones).toHaveLength(2);
    botones.forEach((b) => expect(b.className).toContain("h-[30px]"));
    expect(container.querySelector(".leading-none")).toBeTruthy();
  });

  it("NavDock usa alto fijo en las tabs de grupo con o sin badge", () => {
    const mixto = [
      { id: "a", label: "Textos" },
      { id: "b", label: "Otros", badge: 3 },
    ];
    const { container } = render(<NavDock items={mixto} active="a" onSelect={vi.fn()} />);
    const botones = container.querySelectorAll("button");
    expect(botones).toHaveLength(2);
    botones.forEach((b) => expect(b.className).toContain("h-[32px]"));
    expect(container.querySelector(".leading-none")).toBeTruthy();
  });
});