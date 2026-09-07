import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Skeleton, { SkeletonText, SkeletonTable } from "./Skeleton";

describe("Skeleton", () => {
  it("renderiza un bloque con la clase shimmer por defecto", () => {
    const { container } = render(<Skeleton />);
    expect(container.querySelector(".animate-skeleton")).toBeTruthy();
  });

  it("respeta la variante text", () => {
    const { container } = render(<Skeleton variant="text" />);
    expect(container.querySelector(".animate-skeleton")).toBeTruthy();
  });

  it("aplica ancho y alto pasados", () => {
    const { container } = render(<Skeleton width={50} height={30} />);
    const el = container.querySelector(".animate-skeleton");
    expect(el.style.width).toBe("50px");
    expect(el.style.height).toBe("30px");
  });

  it("la variante avatar produce border-radius 50%", () => {
    const { container } = render(<Skeleton variant="avatar" />);
    const el = container.querySelector(".animate-skeleton");
    expect(el.style.borderRadius).toBe("50%");
  });

  it("variante list genera la cantidad de lineas indicada", () => {
    const { container } = render(<Skeleton variant="list" lines={5} />);
    const items = container.querySelectorAll(".animate-skeleton");
    expect(items.length).toBe(5);
  });

  it("es invisible para lectores de pantalla", () => {
    const { container } = render(<Skeleton />);
    expect(container.querySelector("[aria-hidden='true']") || container.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });
});

describe("SkeletonText", () => {
  it("genera las lineas solicitadas", () => {
    const { container } = render(<SkeletonText lines={4} />);
    expect(container.querySelectorAll(".animate-skeleton").length).toBe(4);
  });
});

describe("SkeletonTable", () => {
  it("genera filas y columnas (header + filas)", () => {
    const { container } = render(<SkeletonTable rows={3} cols={3} />);
    // 1 fila header + 3 filas => 4 filas de contenedores, cada una con 3 bloques
    const items = container.querySelectorAll(".animate-skeleton");
    expect(items.length).toBe(4 * 3);
  });
});
