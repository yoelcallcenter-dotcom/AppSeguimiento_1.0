import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EjemplosCasos } from "./EjemplosCasos";
import * as useCasesModule from "../../hooks/useCases";

vi.mock("../../hooks/useCases", () => ({
  useCases: vi.fn(),
}));

vi.mock("../../utils/copyToClipboard", () => ({
  copyToClipboard: vi.fn().mockResolvedValue(true),
}));

const setCasosMock = vi.fn();

beforeEach(() => {
  setCasosMock.mockClear();
  vi.mocked(useCasesModule.useCases).mockReturnValue([[], setCasosMock]);
});

describe("EjemplosCasos", () => {
  it("muestra los 4 casos de ejemplo reales", () => {
    render(<EjemplosCasos showToast={() => {}} />);
    expect(screen.getByText("RAMIREZ EVELIN DAIANA")).toBeTruthy();
    expect(screen.getByText("BASSANO FRANCO GABRIEL")).toBeTruthy();
    expect(screen.getByText("CONTRERAS SAAVEDRA CARLOS EDUARDO")).toBeTruthy();
    expect(screen.getByText("LOPEZ CARLA CELESTE")).toBeTruthy();
  });

  it("muestra ART con código interno (88)", () => {
    render(<EjemplosCasos showToast={() => {}} />);
    expect(screen.getAllByText("PREVENCION (88)")).toHaveLength(1);
    expect(screen.getAllByText("LA SEGUNDA (88)")).toHaveLength(2);
    expect(screen.getAllByText("SWISS MEDICAL (88)")).toHaveLength(1);
  });

  it("muestra las citas con el horario programado", () => {
    render(<EjemplosCasos showToast={() => {}} />);
    expect(screen.getAllByText(/\(10:00-10:30\)/)).toHaveLength(2);
    expect(screen.getAllByText(/\(10:30-11:00\)/)).toHaveLength(1);
    expect(screen.getAllByText(/\(16:45-17:00\)/)).toHaveLength(1);
  });

  it("carga un caso individual al presionar Cargar", () => {
    render(<EjemplosCasos showToast={() => {}} />);
    const botones = screen.getAllByRole("button", { name: /Cargar/ });
    fireEvent.click(botones[0]);
    expect(setCasosMock).toHaveBeenCalledTimes(1);
  });

  it("carga todos los casos al presionar Cargar todos", () => {
    render(<EjemplosCasos showToast={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Cargar todos/ }));
    expect(setCasosMock).toHaveBeenCalledTimes(1);
  });

  it("copia el formato con los campos de la ficha", async () => {
    const showToast = vi.fn();
    render(<EjemplosCasos showToast={showToast} />);
    const botonCopiar = screen.getAllByRole("button", { name: /Copiar formato/ })[0];
    fireEvent.click(botonCopiar);
    const copyToClipboard = (await import("../../utils/copyToClipboard")).copyToClipboard;
    expect(copyToClipboard).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith("Formato copiado al portapapeles", "success");
  });
});