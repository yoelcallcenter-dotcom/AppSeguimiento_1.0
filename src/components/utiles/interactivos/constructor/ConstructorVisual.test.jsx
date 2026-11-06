import React, { useState } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { ConstructorVisual } from "./ConstructorVisual";
import {
  crearSpeechInteractivo,
  agregarPaso,
  actualizarPaso,
  agregarPregunta,
  agregarOpcion,
  actualizarOpcion,
  agregarEstadoFinal,
} from "../interactiveSpeechModel";

/**
 * ConstructorVisual.test.jsx (Release 1.11.1)
 *
 * El constructor es una VISTA del mismo guion: cada test comprueba que la
 * interacción termina en el modelo real (`onChange`) y no en un estado
 * paralelo. Se cubre el flujo completo pedido en la release: seleccionar y
 * editar, conectar/desconectar, deshacer/rehacer, auto-organizar, validación
 * navegable, eliminación con referencias y vista previa sin persistencia.
 */

/** Guion de prueba: 3 etapas, 1 decisión con 2 respuestas y 1 finalización. */
function crearFixture() {
  let speech = crearSpeechInteractivo({
    nombre: "Guion visual",
    descripcion: "Fixture del constructor",
  });
  const e1 = speech.steps[0].id;
  speech = actualizarPaso(speech, e1, {
    titulo: "Uno",
    contenido: "Hola, soy el speech de la etapa uno.",
  });
  speech = agregarPregunta(speech, e1, "¿Sí o no?");
  const p1 = speech.steps[0].preguntas[0].id;
  speech = agregarOpcion(speech, e1, "Sí", p1);
  speech = agregarOpcion(speech, e1, "No", p1);

  speech = agregarPaso(speech);
  const e2 = speech.steps[1].id;
  speech = actualizarPaso(speech, e2, { titulo: "Dos", contenido: "Segunda etapa." });

  speech = agregarPaso(speech);
  const e3 = speech.steps[2].id;
  speech = actualizarPaso(speech, e3, { titulo: "Tres", contenido: "Tercera etapa." });

  speech = agregarEstadoFinal(speech, "Cierre");
  const est1 = speech.estadosFinales[0].id;

  const [o1, o2] = speech.steps[0].preguntas[0].opciones;
  // o1 apunta a la etapa 3 (sirve para el borrado con referencias).
  speech = actualizarOpcion(speech, e1, o1.id, { targetStepId: e3 });
  // o2 finaliza la llamada con el estado final.
  speech = actualizarOpcion(speech, e1, o2.id, {
    finalizaLlamada: true,
    estadoFinalId: est1,
  });

  return {
    speech,
    ids: { e1, e2, e3, p1, o1: o1.id, o2: o2.id, est1 },
  };
}

/**
 * Harness con estado: reproduce a InteractivosView. `onChange` recibe el mismo
 * objeto que el modelo devolvió y vuelve a entrar como prop, igual que el
 * guardado automático real.
 */
function Harness({ initial, onChange, ...rest }) {
  const [speech, setSpeech] = useState(initial);
  const manejar = (nuevo) => {
    setSpeech(nuevo);
    onChange(nuevo);
  };
  return (
    <ConstructorVisual speech={speech} onChange={manejar} {...rest} />
  );
}

function montar(extra = {}) {
  const fixture = crearFixture();
  const onChange = vi.fn();
  const util = render(
    <Harness
      initial={fixture.speech}
      onChange={onChange}
      showToast={vi.fn()}
      {...extra}
    />
  );
  return { ...fixture, onChange, ...util };
}

const ultimo = (onChange) => onChange.mock.calls[onChange.mock.calls.length - 1][0];

describe("ConstructorVisual", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dibuja el guion como nodos y muestra la validación del borrador", () => {
    montar();

    expect(screen.getByText(/7 nodos/)).toBeTruthy();
    expect(screen.getByText("Validación")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Seleccionar nodo Etapa: Uno" })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "Seleccionar nodo Decisión: ¿Sí o no?",
      })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Seleccionar nodo Finalización: Cierre" })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Seleccionar nodo Fin: Fin del guion" })
    ).toBeTruthy();
  });

  it("selecciona una etapa y edita su título en el modelo real", () => {
    const { onChange } = montar();

    fireEvent.click(
      screen.getByRole("button", { name: "Seleccionar nodo Etapa: Uno" })
    );
    const input = screen.getByLabelText("Título del paso");
    expect(input.value).toBe("Uno");

    fireEvent.change(input, { target: { value: "Uno editado" } });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(ultimo(onChange).steps[0].titulo).toBe("Uno editado");
    // El lienzo se actualiza con el mismo dato (no hay copia paralela).
    expect(
      screen.getByRole("button", {
        name: "Seleccionar nodo Etapa: Uno editado",
      })
    ).toBeTruthy();
  });

  it("conecta una respuesta a otra etapa desde el puerto del nodo", () => {
    const { onChange, ids } = montar();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Seleccionar nodo Decisión: ¿Sí o no?",
      })
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Conectar respuesta 1: Sí" })
    );
    expect(screen.getByRole("status").textContent).toContain(
      "Elegí una etapa, finalización o el Fin del guion como destino"
    );

    fireEvent.click(screen.getByRole("button", { name: "Conectar con Dos" }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const opcion = ultimo(onChange).steps[0].preguntas[0].opciones.find(
      (op) => op.id === ids.o1
    );
    expect(opcion.targetStepId).toBe(ids.e2);
    expect(opcion.finalizaLlamada).toBe(false);
  });

  it("desconecta una respuesta desde el puerto y la deja en avance automático", () => {
    const { onChange, ids } = montar();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Seleccionar nodo Decisión: ¿Sí o no?",
      })
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Desconectar respuesta 1" })
    );

    const opcion = ultimo(onChange).steps[0].preguntas[0].opciones.find(
      (op) => op.id === ids.o1
    );
    expect(opcion.targetStepId).toBe(null);
    expect(opcion.finalizaLlamada).toBe(false);
    expect(opcion.estadoFinalId).toBe(null);
  });

  it("deshacer y rehacer revierten y restauran la edición de la etapa", () => {
    const { onChange } = montar();

    fireEvent.click(
      screen.getByRole("button", { name: "Seleccionar nodo Etapa: Uno" })
    );
    fireEvent.change(screen.getByLabelText("Título del paso"), {
      target: { value: "Uno editado" },
    });
    expect(ultimo(onChange).steps[0].titulo).toBe("Uno editado");

    fireEvent.click(screen.getByRole("button", { name: "Deshacer" }));
    expect(ultimo(onChange).steps[0].titulo).toBe("Uno");

    fireEvent.click(screen.getByRole("button", { name: "Rehacer" }));
    expect(ultimo(onChange).steps[0].titulo).toBe("Uno editado");
  });

  it("auto-organizar guarda un layout completo sin tocar el contenido", () => {
    const { onChange, speech } = montar();

    fireEvent.click(screen.getByRole("button", { name: "Auto-organizar" }));

    const nuevo = ultimo(onChange);
    expect(nuevo.layout.version).toBe(1);
    expect(Object.keys(nuevo.layout.nodos)).toHaveLength(7);
    expect(nuevo.steps).toEqual(speech.steps);
  });

  it("navega desde una advertencia al nodo que la origina", () => {
    montar();

    const advertencia = screen.getByRole("button", {
      name: /Ir a la advertencia: El paso 2 .* no tiene preguntas/,
    });
    fireEvent.click(advertencia);

    // El inspector muestra la etapa 2 seleccionada, no solo el panel genérico.
    const input = screen.getByLabelText("Título del paso");
    expect(input.value).toBe("Dos");
  });

  it("elimina una etapa con referencias y permite quitarlas del recorrido", () => {
    const { onChange, ids } = montar();

    fireEvent.click(
      screen.getByRole("button", { name: "Seleccionar nodo Etapa: Tres" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Eliminar etapa" }));

    const dialogo = screen.getByRole("dialog");
    expect(within(dialogo).getByText(/Nuevo destino de las referencias/)).toBeTruthy();
    expect(
      within(dialogo).getByText(/1 respuesta\(s\) de otras etapas apuntan/)
    ).toBeTruthy();

    fireEvent.click(
      within(dialogo).getByRole("button", { name: "Eliminar" })
    );

    const nuevo = ultimo(onChange);
    expect(nuevo.steps.some((s) => s.id === ids.e3)).toBe(false);
    expect(nuevo.steps).toHaveLength(2);
    const opcion = nuevo.steps[0].preguntas[0].opciones.find(
      (op) => op.id === ids.o1
    );
    expect(opcion.targetStepId).toBe(null);
  });

  it("abre la vista previa del borrador y la cierra sin confirmar", () => {
    montar();

    // El botón del toolbar convive con los de los paneles: se usa el primero.
    fireEvent.click(
      screen.getAllByRole("button", { name: "Probar recorrido" })[0]
    );

    expect(screen.getByText("Vista previa")).toBeTruthy();
    expect(screen.getByText("SIN GUARDAR")).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: "Cerrar vista previa" })
    );
    expect(screen.queryByText("SIN GUARDAR")).toBe(null);
  });

  it("permite recorrer un borrador con errores en la vista previa", () => {
    const fixture = crearFixture();
    const roto = actualizarOpcion(
      fixture.speech,
      fixture.ids.e1,
      fixture.ids.o1,
      { texto: "" }
    );
    const onChange = vi.fn();
    render(<Harness initial={roto} onChange={onChange} showToast={vi.fn()} />);

    // El error se muestra en la barra y en el panel, pero NO impide abrir la
    // simulación (el borrador se sigue guardando).
    expect(screen.getAllByText(/1 error\(es\)/).length).toBeGreaterThan(0);
    fireEvent.click(
      screen.getAllByRole("button", { name: "Probar recorrido" })[0]
    );
    expect(screen.getByText("Vista previa")).toBeTruthy();
    expect(screen.getByText(/borrador con 1 error\(es\)/)).toBeTruthy();
    expect(
      screen.queryByText("Este speech tiene errores y no puede ejecutarse.")
    ).toBe(null);
  });

  it("crea una etapa nueva desde la barra y la deja seleccionada", () => {
    const { onChange } = montar();

    fireEvent.click(screen.getByRole("button", { name: "Nueva etapa" }));

    const nuevo = ultimo(onChange);
    expect(nuevo.steps).toHaveLength(4);
    // Sin título todavía: el inspector muestra el campo vacío de la nueva etapa.
    expect(screen.getByLabelText("Título del paso").value).toBe("");
  });
});
