import React, { useState } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within, act } from "@testing-library/react";
import { HelpProvider } from "../../help";
import { ThemeProvider } from "../../context/ThemeContext";
import { UXProvider } from "../../context/UXContext";
import { ConfiguracionView } from "./ConfiguracionView";
import { CONFIG_DEFAULT } from "../../utils/constants";

const noop = () => {};

window.matchMedia =
  window.matchMedia ||
  ((q) => ({
    matches: false,
    media: q,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
window.ResizeObserver =
  window.ResizeObserver ||
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

// 1.9.6: showToast ahora es parametrizable para poder asertar errores de
// validación del editor de Conversación Sugerida.
function VistaConfig({ onCfg, showToast = noop }) {
  const [cfg, setCfg] = useState({ ...CONFIG_DEFAULT });
  const setConfig = (next) => {
    setCfg(next);
    if (onCfg) onCfg(next);
  };
  return (
    <ThemeProvider>
      <HelpProvider>
        <ConfiguracionView
          config={cfg}
          setConfig={setConfig}
          pasos={[]}
          setPasos={noop}
          tips={[]}
          setTips={noop}
          links={[]}
          setLinks={noop}
          speechs={[]}
          setSpeechs={noop}
          speechsInteractivos={[]}
          setSpeechsInteractivos={noop}
          objeciones={[]}
          setObjeciones={noop}
          art={[]}
          setArt={noop}
          transito={[]}
          setTransito={noop}
          lesiones={{}}
          setLesiones={noop}
          mapeo={[]}
          setMapeo={noop}
          observacionesTransito={[]}
          setObservacionesTransito={noop}
          condicionales={[]}
          setCondicionales={noop}
          showToast={showToast}
          casos={[]}
          onEliminarTodos={noop}
          setCasos={noop}
        />
      </HelpProvider>
    </ThemeProvider>
  );
}

const abrirPegadoDeFicha = () => {
  const grupos = screen.getByLabelText("Grupos de Configuración");
  fireEvent.click(within(grupos).getByText("Avanzado"));
  const secciones = screen.getByLabelText("Secciones de Configuración");
  fireEvent.click(within(secciones).getByText("Pegado de Ficha"));
};

// 1.9.6: sección nueva en el grupo General.
const abrirConversaciones = () => {
  const secciones = screen.getByLabelText("Secciones de Configuración");
  fireEvent.click(within(secciones).getByText("Conversación Sugerida"));
};

// 1.9.6 (fix visual): sección Datos del grupo General (General es el grupo por
// defecto, igual que para Conversación Sugerida, así que no hace falta clickearlo).
const abrirDatos = () => {
  const secciones = screen.getByLabelText("Secciones de Configuración");
  fireEvent.click(within(secciones).getByText("Datos"));
};

const tipear = (input, texto) => {
  let escrito = "";
  for (const ch of texto) {
    escrito += ch;
    fireEvent.change(input, { target: { value: escrito } });
    expect(input.value).toBe(escrito);
  }
};

describe("ConfiguracionView", () => {
  it("UX/Navegación queda en el grupo Apariencia y no en Avanzado", () => {
    render(<VistaConfig />);
    const grupos = screen.getByLabelText("Grupos de Configuración");
    const secciones = screen.getByLabelText("Secciones de Configuración");

    fireEvent.click(within(grupos).getByText("Apariencia"));
    expect(within(secciones).getByText("UX/Navegación")).toBeTruthy();

    fireEvent.click(within(grupos).getByText("Avanzado"));
    expect(within(secciones).queryByText("UX/Navegación")).toBeNull();
    expect(within(secciones).getByText("Pegado de Ficha")).toBeTruthy();
  });

  it("Pegado de Ficha permite tipear keywords con comas y espacios", () => {
    let visto = null;
    render(<VistaConfig onCfg={(c) => (visto = c)} />);
    abrirPegadoDeFicha();

    const input = screen.getByLabelText("Palabras clave de NOMBRE");
    fireEvent.change(input, { target: { value: "" } });
    tipear(input, "obra, salud");
    fireEvent.blur(input);

    expect(input.value).toBe("obra, salud");
    const guardado = (visto.fichaFields || []).find((f) => f.id === "nombre");
    expect(guardado.keywords).toEqual(["obra", "salud"]);
  });

  it("eliminar un campo default no lo hace reaparecer y Restaurar lo devuelve", () => {
    let visto = null;
    render(<VistaConfig onCfg={(c) => (visto = c)} />);
    abrirPegadoDeFicha();

    expect(screen.getByLabelText("Destino de ART")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Eliminar ART"));
    expect(screen.queryByLabelText("Destino de ART")).toBeNull();
    expect(visto.fichaFieldsDeleted).toContain("art");
    expect(
      (visto.fichaFields || []).some((f) => f.id === "art")
    ).toBe(false);

    fireEvent.click(screen.getByText("Restaurar por defecto"));
    expect(screen.getByLabelText("Destino de ART")).toBeTruthy();
    expect(visto.fichaFieldsDeleted).toEqual([]);
  });

  it("Alineación de pestañas: sección en UX/Navegación con descripción y default Centro", () => {
    render(<VistaConfig />);
    const grupos = screen.getByLabelText("Grupos de Configuración");
    fireEvent.click(within(grupos).getByText("Apariencia"));
    const secciones = screen.getByLabelText("Secciones de Configuración");
    fireEvent.click(within(secciones).getByText("UX/Navegación"));

    const radiogroup = screen.getByLabelText("Alineación de pestañas");
    expect(within(radiogroup).getByText("Izquierda")).toBeTruthy();
    expect(within(radiogroup).getByText("Centro")).toBeTruthy();
    expect(within(radiogroup).getByText("Derecha")).toBeTruthy();
    expect(
      within(radiogroup).getByRole("radio", { name: "Centro" }).getAttribute("aria-checked")
    ).toBe("true");
    expect(
      screen.getByText("Define cómo se distribuyen las pestañas dentro del espacio disponible.")
    ).toBeTruthy();
  });

  it("Alineación de pestañas: cambiar a Derecha actualiza config.alineacionPestanas", () => {
    let visto = null;
    render(<VistaConfig onCfg={(c) => (visto = c)} />);
    const grupos = screen.getByLabelText("Grupos de Configuración");
    fireEvent.click(within(grupos).getByText("Apariencia"));
    const secciones = screen.getByLabelText("Secciones de Configuración");
    fireEvent.click(within(secciones).getByText("UX/Navegación"));

    const radiogroup = screen.getByLabelText("Alineación de pestañas");
    fireEvent.click(within(radiogroup).getByText("Derecha"));
    expect(visto.alineacionPestanas).toBe("derecha");

    fireEvent.click(within(radiogroup).getByText("Izquierda"));
    expect(visto.alineacionPestanas).toBe("izquierda");
  });

  it("Alineación de pestañas: Grupos y Secciones usan justifyContent por defecto (1.9.3)", () => {
    render(<VistaConfig />);
    expect(screen.getByLabelText("Grupos de Configuración").style.justifyContent).toBe(
      "space-between"
    );
    expect(screen.getByLabelText("Secciones de Configuración").style.justifyContent).toBe(
      "space-between"
    );
  });

  it("Alineación de pestañas: izquierda y derecha se reflejan en Grupos y Secciones (1.9.3)", () => {
    const izq = render(
      <UXProvider config={{ alineacionPestanas: "izquierda" }}>
        <VistaConfig />
      </UXProvider>
    );
    expect(screen.getByLabelText("Grupos de Configuración").style.justifyContent).toBe(
      "flex-start"
    );
    expect(screen.getByLabelText("Secciones de Configuración").style.justifyContent).toBe(
      "flex-start"
    );
    izq.unmount();

    render(
      <UXProvider config={{ alineacionPestanas: "derecha" }}>
        <VistaConfig />
      </UXProvider>
    );
    expect(screen.getByLabelText("Grupos de Configuración").style.justifyContent).toBe(
      "flex-end"
    );
    expect(screen.getByLabelText("Secciones de Configuración").style.justifyContent).toBe(
      "flex-end"
    );
  });
});

// 1.9.6: editor de categorías y variables de Útiles → Conversación Sugerida.
describe("ConfiguracionView · Conversación Sugerida (1.9.6)", () => {
  const KEY = "conversaciones_Accidente_Laboral";
  beforeEach(() => localStorage.removeItem(KEY));
  afterEach(() => localStorage.removeItem(KEY));

  it("lista las categorías con su conteo y OPERADOR como variable reservada", () => {
    localStorage.setItem(KEY, JSON.stringify(["a", "b", "c"]));
    render(<VistaConfig />);
    abrirConversaciones();

    expect(screen.getByLabelText("Variable reservada").disabled).toBe(true);
    expect(screen.getByDisplayValue("Accidente Laboral")).toBeTruthy();
    expect(screen.getAllByText(/mensajes$/).length).toBeGreaterThanOrEqual(4);
    // 3 mensajes en cada una de las 4 categorías originales.
    expect(screen.getAllByText("3 mensajes")).toHaveLength(4);
  });

  it("agregar categoría válida la agrega a config", () => {
    let visto = null;
    render(<VistaConfig onCfg={(c) => (visto = c)} />);
    abrirConversaciones();

    const input = screen.getByLabelText("Nueva categoría");
    fireEvent.change(input, { target: { value: "Gestiones" } });
    fireEvent.click(screen.getByText("Agregar categoría"));

    expect(visto.conversacionesCategorias).toContain("Gestiones");
    expect(input.value).toBe("");
  });

  it("agregar categoría duplicada muestra error y no la agrega", () => {
    const showToast = vi.fn();
    let visto = null;
    render(<VistaConfig onCfg={(c) => (visto = c)} showToast={showToast} />);
    abrirConversaciones();

    fireEvent.change(screen.getByLabelText("Nueva categoría"), {
      target: { value: "accidente laboral" },
    });
    fireEvent.click(screen.getByText("Agregar categoría"));

    expect(showToast).toHaveBeenCalledWith(
      expect.stringMatching(/Ya existe/),
      "error"
    );
    // setConfig nunca se invocó: config quedó intacta.
    expect(visto).toBeNull();
  });

  it("renombrar en blur migra los mensajes a la nueva clave", () => {
    localStorage.setItem(KEY, JSON.stringify(["m1"]));
    let visto = null;
    render(<VistaConfig onCfg={(c) => (visto = c)} />);
    abrirConversaciones();

    const input = screen.getByLabelText(
      "Nombre de la categoría Accidente Laboral"
    );
    fireEvent.change(input, { target: { value: "Accidente Nuevo" } });
    fireEvent.blur(input);

    expect(visto.conversacionesCategorias).toContain("Accidente Nuevo");
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(
      JSON.parse(localStorage.getItem("conversaciones_Accidente_Nuevo"))
    ).toEqual(["m1"]);
    localStorage.removeItem("conversaciones_Accidente_Nuevo");
  });

  it("eliminar categoría pide confirmación y borra sus mensajes", () => {
    localStorage.setItem(KEY, JSON.stringify(["m1", "m2"]));
    let visto = null;
    render(<VistaConfig onCfg={(c) => (visto = c)} />);
    abrirConversaciones();

    fireEvent.click(screen.getByLabelText("Eliminar Accidente Laboral"));
    expect(screen.getByText(/Se eliminarán los 2 mensajes/)).toBeTruthy();
    fireEvent.click(screen.getByText("Eliminar"));

    expect(visto.conversacionesCategorias).not.toContain("Accidente Laboral");
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("agregar variable normaliza el nombre y guarda el valor", () => {
    let visto = null;
    render(<VistaConfig onCfg={(c) => (visto = c)} />);
    abrirConversaciones();

    fireEvent.change(screen.getByLabelText("Nombre de la nueva variable"), {
      target: { value: "horario atencion" },
    });
    fireEvent.change(screen.getByLabelText("Valor de la nueva variable"), {
      target: { value: "de 9 a 18" },
    });
    fireEvent.click(screen.getByText("Agregar variable"));

    expect(visto.conversacionesVariables).toEqual([
      { nombre: "HORARIO_ATENCION", valor: "de 9 a 18" },
    ]);
  });

  it("el nombre de variable existente normaliza en vivo y OPERADOR no es borrable", () => {
    let visto = null;
    render(<VistaConfig onCfg={(c) => (visto = c)} />);
    abrirConversaciones();

    fireEvent.change(screen.getByLabelText("Nombre de la nueva variable"), {
      target: { value: "Empresa" },
    });
    fireEvent.click(screen.getByText("Agregar variable"));

    const nombre = screen.getByLabelText("Nombre de la variable");
    fireEvent.change(nombre, { target: { value: "otra cosa" } });
    expect(visto.conversacionesVariables[0].nombre).toBe("OTRA_COSA");

    expect(screen.queryByLabelText("Eliminar OPERADOR")).toBeNull();
  });

  // Fix visual 1.9.6: Configuración → Datos. Antes los labels cambiaban a
  // "Confirmar" (alterando el ancho y moviendo a los botones vecinos de la fila)
  // y las leyendas de confirmación aparecían DENTRO de la fila flex, empujando a
  // los demás botones. Estos tests blindan el comportamiento nuevo.
  describe("Datos (fix visual 1.9.6)", () => {
    it("confirmar mantiene el label fijo y la leyenda vive fuera de la fila", () => {
      render(<VistaConfig />);
      abrirDatos();

      fireEvent.click(screen.getByRole("button", { name: "Eliminar notas" }));

      // Label constante: el ancho del botón no cambia y no desplaza al vecino.
      expect(screen.getByRole("button", { name: "Eliminar notas" })).toBeTruthy();
      expect(screen.queryByRole("button", { name: "Confirmar" })).toBeNull();
      // La leyenda se comunica en una línea propia (ya dentro o fuera de la fila,
      // el text del botón es lo que garantiza que no haya movimiento).
      expect(
        screen.getByText("Haz clic en Eliminar notas de nuevo para confirmar")
      ).toBeTruthy();
    });

    it("'Importar' de Utiles es un botón BtnOutline con .btn-sm, no un <label> crudo", () => {
      render(<VistaConfig />);
      abrirDatos();

      // Antes era un <label> con borde 1px y padding propio (altura distinta al
      // resto de la sección); ahora hereda .btn-base/.btn-sm como todos.
      const btn = screen.getByRole("button", { name: "Importar" });
      expect(btn.className).toContain("btn-base");
      expect(btn.className).toContain("btn-sm");
    });

    it("'Seleccionar todos' y 'Limpiar selección' usan el componente Btn (btn-sm)", () => {
      render(<VistaConfig />);
      abrirDatos();

      // Antes eran <button> crudos con px-2 py-1 (una tercera altura en la página).
      expect(
        screen.getByRole("button", { name: "Seleccionar todos" }).className
      ).toContain("btn-sm");
      expect(
        screen.getByRole("button", { name: "Limpiar selección" }).className
      ).toContain("btn-sm");
    });

    // Respuesta visual del estado: outline en reposo → SOLID al armar la 2da
    // confirmación (fondo con color + sin borde), igual en todos los de doble clic.
    it("los botones de doble clic pasan de outline a solid al confirmar", async () => {
      render(<VistaConfig />);
      // Deja resolver dentro de act la promesa del efecto getBackupHistory del
      // montaje, para que su setState no escape al warnings "act(...)".
      await act(async () => {});
      abrirDatos();

      const notas = screen.getByRole("button", { name: "Eliminar notas" });
      expect(notas.style.backgroundColor).toBe("transparent");

      fireEvent.click(notas);

      const armado = screen.getByRole("button", { name: "Eliminar notas" });
      // Solid: el fondo deja de ser transparente (jsdom no conserva el var() del
      // borde en el shorthand, por eso se assertea el background y no el border).
      expect(armado.style.backgroundColor).not.toBe("transparent");
      expect(armado.title).toBe("Haz clic de nuevo para confirmar");

      // Mismo patrón en el botón de tres estados "Eliminar todos los datos".
      const todos = screen.getByRole("button", { name: "Eliminar todos los datos" });
      expect(todos.style.backgroundColor).toBe("transparent");
      fireEvent.click(todos);
      expect(
        screen.getByRole("button", { name: "Eliminar todos los datos" }).style
          .backgroundColor
      ).not.toBe("transparent");
    });
  });
});
