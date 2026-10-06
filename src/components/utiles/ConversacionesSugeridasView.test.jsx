import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ConversacionesSugeridasView } from "./ConversacionesSugeridasView";
import { DEFAULT_PLANTILLAS } from "../../utils/constants";
import { copyToClipboard } from "../../utils/copyToClipboard";

// 1.9.6: se mockea el portapapeles para poder asertar el texto copiado
// (con variables ya resueltas) sin tocar el clipboard real del entorno.
vi.mock("../../utils/copyToClipboard", () => ({
  copyToClipboard: vi.fn(async () => true),
}));

const KEY = "conversaciones_Accidente_Laboral";
const KEY_CUSTOM = "conversaciones_Custom";

const setMensajes = (mensajes, key = KEY) =>
  localStorage.setItem(key, JSON.stringify(mensajes));

describe("ConversacionesSugeridasView (1.9.6)", () => {
  beforeEach(() => {
    localStorage.removeItem(KEY);
    localStorage.removeItem(KEY_CUSTOM);
    copyToClipboard.mockClear();
  });
  afterEach(() => {
    localStorage.removeItem(KEY);
    localStorage.removeItem(KEY_CUSTOM);
  });

  const renderVista = (config = {}, showToast = () => {}) =>
    render(
      <ConversacionesSugeridasView
        config={config}
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
    renderVista({}, showToast);

    const campo = screen.getByPlaceholderText(/Nuevo mensaje/);
    fireEvent.change(campo, { target: { value: "Primera línea\nSegunda línea" } });
    fireEvent.click(screen.getByText("Agregar"));

    const guardados = JSON.parse(localStorage.getItem(KEY));
    expect(guardados).toContain("Primera línea\nSegunda línea");
    expect(showToast).toHaveBeenCalledWith("Mensaje agregado", "success");
    expect(campo.value).toBe("");
  });

  it("el chip {OPERADOR} inserta la llave en el textarea de alta", () => {
    renderVista({ operador: "Ana" });
    const campo = screen.getByPlaceholderText(/Nuevo mensaje/);
    fireEvent.click(
      screen.getAllByRole("button", { name: "{OPERADOR}" })[0]
    );
    expect(campo.value).toBe("{OPERADOR}");
  });

  it("el chip de una variable configurable inserta su llave", () => {
    renderVista({
      conversacionesVariables: [{ nombre: "HORARIO", valor: "de 9 a 18" }],
    });
    const campo = screen.getByPlaceholderText(/Nuevo mensaje/);
    fireEvent.click(screen.getAllByRole("button", { name: "{HORARIO}" })[0]);
    expect(campo.value).toBe("{HORARIO}");
  });

  it("copiar resuelve todas las variables configuradas (antes solo OPERADOR)", async () => {
    setMensajes(["Hola {OPERADOR}, te escribo {HORARIO} {NOMBRE}"]);
    renderVista({
      operador: "Ana",
      conversacionesVariables: [{ nombre: "HORARIO", valor: "de 9 a 18" }],
    });

    fireEvent.click(screen.getByTitle("Copiar mensaje"));
    expect(copyToClipboard).toHaveBeenCalledWith(
      "Hola Ana, te escribo de 9 a 18 {NOMBRE}"
    );
  });

  it("la vista previa resalta el valor resuelto", () => {
    setMensajes(["Saludos {HORARIO}"]);
    renderVista({ conversacionesVariables: [{ nombre: "HORARIO", valor: "9 a 18" }] });
    const resaltado = screen.getByText("9 a 18");
    expect(resaltado.tagName).toBe("STRONG");
  });

  it("avisa cuando hay variables sin valor configurado", () => {
    setMensajes(["Hola {NOMBRE}, soy {OPERADOR}"]);
    renderVista({ operador: "Ana" });
    expect(
      screen.getByText(/Hay variables sin valor configurado/)
    ).toBeTruthy();
  });

  it("copiar secuencia copia todos los mensajes resueltos de una vez", async () => {
    setMensajes(["Apertura {OPERADOR}", "Cierre"]);
    renderVista({ operador: "Ana" });

    fireEvent.click(screen.getByText("Copiar secuencia (2)"));
    expect(copyToClipboard).toHaveBeenCalledWith("Apertura Ana\n\nCierre");
  });

  it("reordenar con Bajar invierte el orden persistido", () => {
    setMensajes(["Primero", "Segundo"]);
    renderVista();

    const bajares = screen.getAllByTitle("Bajar");
    fireEvent.click(bajares[0]);
    expect(JSON.parse(localStorage.getItem(KEY))).toEqual(["Segundo", "Primero"]);
  });

  it("duplicar inserta una copia justo después del original", () => {
    setMensajes(["Único"]);
    renderVista();

    fireEvent.click(screen.getByTitle("Duplicar"));
    expect(JSON.parse(localStorage.getItem(KEY))).toEqual(["Único", "Único"]);
  });

  it("la búsqueda filtra los mensajes mostrados sin tocar el storage", () => {
    setMensajes(["Caso de accidente", "Referencia de un amigo"]);
    renderVista();

    const buscador = screen.getByPlaceholderText(/Buscar en esta categoría/);
    fireEvent.change(buscador, { target: { value: "referencia" } });

    expect(screen.queryByDisplayValue("Caso de accidente")).toBeNull();
    expect(screen.getByDisplayValue("Referencia de un amigo")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(KEY))).toHaveLength(2);
  });

  it("muestra el contador de caracteres del textarea de alta", () => {
    renderVista();
    expect(screen.getByText("0 caracteres")).toBeTruthy();
    const campo = screen.getByPlaceholderText(/Nuevo mensaje/);
    fireEvent.change(campo, { target: { value: "Hola a todos" } });
    expect(screen.getByText("12 caracteres")).toBeTruthy();
  });

  it("una categoría nueva arranca vacía y no ofrece Restaurar originales", () => {
    renderVista({ conversacionesCategorias: ["Custom"] });
    expect(screen.getByText("No hay mensajes para esta categoría.")).toBeTruthy();
    expect(screen.queryByText("Restaurar originales")).toBeNull();
    expect(localStorage.getItem(KEY_CUSTOM)).toBeNull();
  });

  it("Restaurar originales solo aparece en categorías originales y repone las plantillas", () => {
    setMensajes(["Mio"]);
    renderVista();

    expect(screen.getByText("Restaurar originales")).toBeTruthy();
    fireEvent.click(screen.getByText("Restaurar originales"));
    expect(JSON.parse(localStorage.getItem(KEY))).toEqual(DEFAULT_PLANTILLAS);
  });

  it("si la categoría activa desaparece, cae en la primera disponible", () => {
    renderVista({ conversacionesCategorias: ["Otra", "Referencia"] });
    // La default "Accidente Laboral" ya no existe en config: se usa "Otra"
    // (sin mensajes guardados → vacía) y su pestaña queda activa.
    expect(screen.getByText("No hay mensajes para esta categoría.")).toBeTruthy();
    expect(
      document.querySelector(".category-tab.active")?.textContent
    ).toBe("Otra");
  });
});
