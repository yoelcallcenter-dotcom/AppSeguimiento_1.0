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
// 1.10.0 (auditoría): initialCfg permite inyectar config corrupta (p. ej.
// rulesCustom: [null]) para verificar que los guards no crashean la vista.
function VistaConfig({ onCfg, showToast = noop, initialCfg }) {
  const [cfg, setCfg] = useState({ ...CONFIG_DEFAULT, ...initialCfg });
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

// 1.10.0 (revisión): grupo y sección Notificaciones se llaman igual, por eso
// primero se clickea el grupo (que pinta sus secciones) y después la sección.
const abrirNotificaciones = () => {
  const grupos = screen.getByLabelText("Grupos de Configuración");
  fireEvent.click(within(grupos).getByText("Notificaciones"));
  const secciones = screen.getByLabelText("Secciones de Configuración");
  fireEvent.click(within(secciones).getByText("Notificaciones"));
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

// 1.10.0 (revisión del usuario): la UI de Reglas automáticas se rediseñó para
// ser menos técnica — dos bloques separados (lista + "Crear una regla"), frase
// natural, nombre autogenerado, chips de severidad y vista previa en vivo.
describe("ConfiguracionView · Reglas automáticas (revisión 1.10.0)", () => {
  it("la lista y el form son bloques separados: el form solo se abre con 'Nueva regla'", () => {
    render(<VistaConfig />);
    abrirNotificaciones();

    // Bloque 1: la lista con las reglas del motor en lenguaje llano.
    expect(screen.getByText(/Alertar si un caso no tiene telefono/)).toBeTruthy();
    expect(screen.getByText(/Crear evento automatico cuando un caso entra/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Nueva regla" })).toBeTruthy();
    // El form NO está a la vista (antes estaba siempre mezclado con la lista).
    expect(screen.queryByText("Crear una regla")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Nueva regla" }));

    // Bloque 2: la frase armable, sin campo de nombre técnico.
    expect(screen.getByText("Crear una regla")).toBeTruthy();
    expect(screen.getByText("Cuando")).toBeTruthy();
    expect(screen.getByLabelText("Campo de la regla")).toBeTruthy();
    expect(screen.getByLabelText("Condición de la regla")).toBeTruthy();
    // Sin campo de nombre técnico (el viejo placeholder "Nombre (ej: ...)"
    // ya no existe en el form; el interno se autogenera).
    expect(screen.queryByPlaceholderText(/Nombre \(/)).toBeNull();
    // Severidad en chips clicables (no en un Select técnico).
    expect(screen.getByRole("button", { name: "Aviso" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Error" }).getAttribute("aria-pressed")).toBe("false");
    // Vista previa en vivo.
    expect(screen.getByText("Así se va a ver")).toBeTruthy();
    expect(screen.getByText(/Escribí el mensaje del aviso/)).toBeTruthy();

    // Cancelar cierra el form sin tocar la config.
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByText("Crear una regla")).toBeNull();
  });

  it("crear una regla guarda rulesCustom con nombre autogenerado y la muestra como frase", () => {
    let visto = null;
    render(<VistaConfig onCfg={(c) => (visto = c)} />);
    abrirNotificaciones();
    fireEvent.click(screen.getByRole("button", { name: "Nueva regla" }));

    fireEvent.change(screen.getByLabelText("Valor a comparar"), {
      target: { value: "Pendiente" },
    });
    fireEvent.change(screen.getByLabelText("Mensaje del aviso"), {
      target: { value: "Falta el teléfono de {nombre}" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Error" }));
    fireEvent.click(screen.getByRole("button", { name: "Agregar regla" }));

    const nueva = (visto.rulesCustom || [])[0];
    expect(nueva.name).toMatch(/^propia-\d+$/);
    expect(nueva.field).toBe("estado");
    expect(nueva.operator).toBe("equals");
    expect(nueva.value).toBe("Pendiente");
    expect(nueva.message).toBe("Falta el teléfono de {nombre}");
    expect(nueva.severity).toBe("error");

    // El form se cierra y la regla queda en la lista como frase + mensaje.
    expect(screen.queryByText("Crear una regla")).toBeNull();
    expect(screen.getByText(/Cuando Estado es igual a "Pendiente"/)).toBeTruthy();
    expect(screen.getByText(/Falta el teléfono de \{nombre\}/)).toBeTruthy();
    expect(screen.getByText("Propia")).toBeTruthy();
  });

  it("sin valor o sin mensaje no crea la regla y explica el problema", () => {
    let visto = null;
    render(<VistaConfig onCfg={(c) => (visto = c)} />);
    abrirNotificaciones();
    fireEvent.click(screen.getByRole("button", { name: "Nueva regla" }));

    fireEvent.click(screen.getByRole("button", { name: "Agregar regla" }));
    expect(screen.getByText("Falta el valor a comparar.")).toBeTruthy();
    expect(visto).toBeNull();

    fireEvent.change(screen.getByLabelText("Valor a comparar"), {
      target: { value: "x" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Agregar regla" }));
    expect(screen.getByText("Falta el mensaje de la alerta.")).toBeTruthy();
    expect(visto).toBeNull();
  });

  it("el interruptor de una regla del motor persiste rulesEnabled", () => {
    let visto = null;
    render(<VistaConfig onCfg={(c) => (visto = c)} />);
    abrirNotificaciones();

    // 1.10.0 (auditoría H5): el aria-label ahora usa la descripción legible
    // de la regla en vez del name interno tipo slug.
    const toggle = screen.getByLabelText("Activar regla: Alertar si un caso no tiene telefono");
    expect(toggle.checked).toBe(true);
    fireEvent.click(toggle);
    expect(visto.rulesEnabled["case-sin-telefono-alert"]).toBe(false);
  });

  // 1.10.0 (auditoría H2): gt/lt convertía el valor con Number() sin validar →
  // "abc" se persistía como NaN y la regla nunca matcheaba (falla silenciosa).
  it("la regla numérica (gt/lt) valida el número y guarda value finito, aceptando coma decimal", () => {
    let visto = null;
    render(<VistaConfig onCfg={(c) => (visto = c)} />);
    abrirNotificaciones();
    fireEvent.click(screen.getByRole("button", { name: "Nueva regla" }));

    fireEvent.change(screen.getByLabelText("Condición de la regla"), {
      target: { value: "gt" },
    });
    fireEvent.change(screen.getByLabelText("Valor a comparar"), {
      target: { value: "abc" },
    });
    fireEvent.change(screen.getByLabelText("Mensaje del aviso"), {
      target: { value: "Demasiados casos" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Agregar regla" }));

    // No crea la regla y explica el problema (el form sigue abierto).
    expect(screen.getByText("Ingresá un número válido.")).toBeTruthy();
    expect(visto).toBeNull();
    expect(screen.getByText("Crear una regla")).toBeTruthy();

    // Con número válido (coma decimal → punto) sí la crea, con value numérico.
    fireEvent.change(screen.getByLabelText("Valor a comparar"), {
      target: { value: "10,5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Agregar regla" }));
    expect(visto).not.toBeNull();
    const nueva = (visto.rulesCustom || [])[0];
    expect(nueva.value).toBe(10.5);
    expect(Number.isFinite(nueva.value)).toBe(true);
  });

  // 1.10.0 (auditoría H3): entradas corruptas en rulesCustom (config editada a
  // mano o storage viejo) rompían el find/filter de la sección → crash del
  // panel de Configuración completo.
  it("rulesCustom con entradas corruptas (null) no rompe la sección", () => {
    render(<VistaConfig initialCfg={{ rulesCustom: [null] }} />);
    abrirNotificaciones();

    expect(screen.getByText(/Alertar si un caso no tiene telefono/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Nueva regla" })).toBeTruthy();
  });
});
