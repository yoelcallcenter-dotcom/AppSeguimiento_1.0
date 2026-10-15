import { describe, it, expect, beforeEach } from "vitest";
import { themeManager } from "./themeManager";

// C03 (1.10.1): dos bugs encadenados de colores de estado —
// 1) getEstadoColor terminaba en `|| '#6B7280'`, pero como el mapa SIEMPRE
//    tiene color (defaults incluidos) nunca devolvía falsy → los fallbacks
//    `theme.getEstadoColor(x) || e.accent` de CasoCard/PipelineBar/
//    PersonalizacionColores eran código muerto y un estado nuevo salía gris;
// 2) renombrar un estado dejaba la clave vieja huérfana en app-estado-colors
//    y el nombre nuevo sin variable CSS.
describe("themeManager · C03 (1.10.1)", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("style");
  });

  it("getEstadoColor devuelve undefined para un estado sin color (antes gris fijo)", () => {
    expect(themeManager.getEstadoColor("Estado inexistente")).toBeUndefined();
    // El default del catálogo sí resuelve.
    expect(themeManager.getEstadoColor("Firmo")).toBeTruthy();
  });

  it("renameEstadoColor mueve el color persistido y la variable CSS", () => {
    themeManager.setEstadoColor("Firmo", "#123456");
    themeManager.renameEstadoColor("Firmo", "Firmado");

    expect(themeManager.getEstadoColor("Firmado")).toBe("#123456");
    expect(
      document.documentElement.style.getPropertyValue("--color-estado-Firmado")
    ).toBe("#123456");
    // La variable vieja queda limpiada (el default ya no está en el mapa).
    expect(
      document.documentElement.style.getPropertyValue("--color-estado-Firmo")
    ).toBe("");
  });

  it("renameEstadoColor ignora casos sin sentido (mismo nombre o vacíos)", () => {
    const antes = document.documentElement.getAttribute("style");
    themeManager.renameEstadoColor("Firmo", "Firmo");
    themeManager.renameEstadoColor("", "X");
    themeManager.renameEstadoColor("Y", "");
    expect(document.documentElement.getAttribute("style")).toBe(antes);
  });
});
