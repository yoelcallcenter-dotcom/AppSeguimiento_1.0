/**
 * ModoLlamada.test.jsx (Release 1.11.2)
 *
 * Cubre la pantalla nueva sobre el motor compartido:
 * - lectura de la etapa + un toque elige y muestra la respuesta sugerida;
 *   "Continuar" (pie) confirma el avance;
 * - gate de datos obligatorios antes de avanzar;
 * - breadcrumb del recorrido real;
 * - finalización revisada con estado final y aviso de derivación;
 * - paneles de instrucciones, objeciones y resumen;
 * - cambio de una respuesta anterior con confirmación de impacto;
 * - salida de 3 caminos (seguir, conservar, descartar) y guion cambiado.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { ModoLlamada } from "./ModoLlamada";
import {
  crearSpeechInteractivo,
  agregarPaso,
  actualizarPaso,
  agregarPregunta,
  agregarOpcion,
  actualizarOpcion,
  agregarCampo,
  agregarEstadoFinal,
} from "../interactiveSpeechModel";

const objeciones = [
  { id: "o1", titulo: "No le interesa", contenido: "Explicar los beneficios." },
  { id: "o2", titulo: "Es muy caro", contenido: "Mencionar el plan de cuotas." },
];

let writeText;
beforeEach(() => {
  writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(window.navigator, "clipboard", {
    value: { writeText },
    configurable: true,
    writable: true,
  });
});

/** 2 etapas: e1 pregunta con 2 opciones (una con respuesta sugerida), e2 cierre. */
function guionDosEtapas() {
  let s = crearSpeechInteractivo({ nombre: "Llamada ART", descripcion: "Guion de prueba" });
  s = agregarPaso(s); // el constructor parte de 1 etapa: esta agrega la segunda
  s = actualizarPaso(s, s.steps[0].id, {
    titulo: "Apertura",
    contenido: "Hola, ¿puede hablar?",
    objetivo: "Abrir la llamada",
  });
  s = actualizarPaso(s, s.steps[1].id, {
    titulo: "Desarrollo",
    contenido: "Cuénteme la lesión.",
  });
  const e1 = s.steps[0].id;
  s = agregarPregunta(s, e1, "¿Tiene un minuto?");
  const q = s.steps[0].preguntas[0].id;
  s = agregarOpcion(s, e1, "Sigue en línea", q);
  s = agregarOpcion(s, e1, "No puede hablar", q);
  const op = s.steps[0].preguntas[0].opciones[0].id;
  s = actualizarOpcion(s, e1, op, { respuestaSugerida: "Gracias por atenderme." });
  return s;
}

/** 3 etapas con respuestas confirmadas en e1 y e2 y rama alternativa en e1. */
function guionCambioDeRespuesta() {
  let s = crearSpeechInteractivo({ nombre: "Cambio" });
  s = agregarPaso(s);
  s = agregarPaso(s);
  const [e1, e2, e3] = s.steps.map((x) => x.id);
  s = actualizarPaso(s, e1, { titulo: "Apertura", contenido: "Hola" });
  s = actualizarPaso(s, e2, { titulo: "Desarrollo", contenido: "Contame" });
  s = actualizarPaso(s, e3, { titulo: "Cierre", contenido: "Chau" });
  s = agregarPregunta(s, e1, "¿Sigue?");
  const q1 = s.steps[0].preguntas[0].id;
  s = agregarOpcion(s, e1, "Sí", q1);
  s = agregarOpcion(s, e1, "No", q1);
  const opNo = s.steps[0].preguntas[0].opciones[1].id;
  s = actualizarOpcion(s, e1, opNo, { targetStepId: e3 });
  s = agregarPregunta(s, e2, "¿Algo más?");
  const q2 = s.steps[1].preguntas[0].id;
  s = agregarOpcion(s, e2, "Listo", q2);
  return s;
}

describe("ModoLlamada (lectura y navegación)", () => {
  it("muestra la etapa, elige con un toque y confirma con Continuar", async () => {
    const speech = guionDosEtapas();
    render(<ModoLlamada speech={speech} objeciones={[]} onClose={() => {}} />);

    // Identidad del speech y posición real dentro del guion.
    expect(screen.getByRole("heading", { name: "Llamada ART" })).toBeTruthy();
    expect(screen.getByText("Etapa 1 de 2 del guion")).toBeTruthy();
    expect(screen.getByText("Hola, ¿puede hablar?")).toBeTruthy();
    expect(screen.getByText("¿Tiene un minuto?")).toBeTruthy();

    // La opción elegida muestra la respuesta sugerida y su destino.
    fireEvent.click(screen.getByText("Sigue en línea"));
    expect(screen.getByText("Respuesta sugerida")).toBeTruthy();
    expect(screen.getByText("Gracias por atenderme.")).toBeTruthy();
    expect(screen.getByText(/Continúa en:/)).toBeTruthy();

    // Copiar deja el texto en el portapapeles.
    fireEvent.click(screen.getByRole("button", { name: "Copiar respuesta sugerida" }));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith("Gracias por atenderme.")
    );

    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("Etapa 2 de 2 del guion")).toBeTruthy();
    expect(screen.getByText("Cuénteme la lesión.")).toBeTruthy();

    // Breadcrumb: solo etapas realmente visitadas.
    expect(screen.getByText("1. Apertura")).toBeTruthy();
    expect(screen.getByText("2. Desarrollo")).toBeTruthy();
    expect(screen.getByText("2 etapa(s) visitada(s)")).toBeTruthy();
  });

  it("bloquea el avance hasta completar los datos obligatorios", () => {
    let speech = crearSpeechInteractivo({ nombre: "Obligatorios" });
    speech = agregarPaso(speech);
    speech = actualizarPaso(speech, speech.steps[0].id, {
      titulo: "Apertura",
      contenido: "Hola",
    });
    speech = actualizarPaso(speech, speech.steps[1].id, {
      titulo: "Cierre",
      contenido: "Chau",
    });
    speech = agregarCampo(speech, speech.steps[0].id, {
      nombre: "Nombre del trabajador",
      tipo: "texto-corto",
      obligatorio: true,
    });
    render(<ModoLlamada speech={speech} objeciones={[]} onClose={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    // Sigue en la etapa 1 y el gate enumera el campo pendiente.
    expect(screen.getByText("Etapa 1 de 2 del guion")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain(
      "Complete los datos obligatorios antes de continuar:"
    );
    expect(screen.getByRole("alert").textContent).toContain("Nombre del trabajador");

    fireEvent.change(screen.getByLabelText("Nombre del trabajador"), {
      target: { value: "Ana Pérez" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByText("Etapa 2 de 2 del guion")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("ModoLlamada (finalización)", () => {
  it("exige revisar y confirmar el estado final; no auto-confirma", async () => {
    let speech = crearSpeechInteractivo({ nombre: "Con estados" });
    speech = actualizarPaso(speech, speech.steps[0].id, {
      titulo: "Apertura",
      contenido: "Hola",
    });
    speech = agregarEstadoFinal(speech, "No contesta");
    speech = agregarEstadoFinal(speech, "Derivación coordinada");

    const onGuardar = vi.fn();
    const onClose = vi.fn();
    render(
      <ModoLlamada
        speech={speech}
        objeciones={[]}
        onGuardar={onGuardar}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Finalizar" }));
    const dialogo = screen.getByRole("dialog", { name: "Finalizar llamada" });
    expect(
      within(dialogo).getByText(/Confirmá que el trabajador aceptó el estado registrado/)
    ).toBeTruthy();

    // Sin estado elegido no se puede confirmar.
    const confirmar = within(dialogo).getByRole("button", { name: "Finalizar llamada" });
    expect(confirmar.disabled).toBe(true);

    fireEvent.change(within(dialogo).getByLabelText("Estado final"), {
      target: { value: speech.estadosFinales[1].id },
    });
    expect(confirmar.disabled).toBe(false);
    fireEvent.click(confirmar);

    await waitFor(() =>
      expect(screen.getByText("Estado: Derivación coordinada")).toBeTruthy()
    );
    // La sesión finalizada se avisa al storage (se quita de pendientes).
    expect(onGuardar).toHaveBeenCalled();
    const ultima = onGuardar.mock.calls[onGuardar.mock.calls.length - 1][0];
    expect(ultima.finalizada).toBe(true);

    // Cerrar desde la pantalla final no abre el diálogo de salida.
    fireEvent.click(screen.getByRole("button", { name: "Cerrar llamada" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("ModoLlamada (paneles de apoyo)", () => {
  it("las instrucciones muestran descripción, objetivo y reglas del guion", () => {
    const speech = {
      ...guionDosEtapas(),
      reglas: ["No inventar disponibilidad."],
    };
    render(<ModoLlamada speech={speech} objeciones={[]} onClose={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Abrir instrucciones" }));
    const panel = screen.getByRole("dialog", { name: "Instrucciones" });
    expect(within(panel).getByText("Guion de prueba")).toBeTruthy();
    expect(within(panel).getByText("Abrir la llamada")).toBeTruthy();
    expect(within(panel).getByText("No inventar disponibilidad.")).toBeTruthy();
    expect(
      within(panel).getByText("Las opciones de esta etapa no abren módulos de apoyo.")
    ).toBeTruthy();
  });

  it("las objeciones se buscan, se copian y quedan marcadas como consultadas", async () => {
    render(
      <ModoLlamada speech={guionDosEtapas()} objeciones={objeciones} onClose={() => {}} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Abrir objeciones" }));
    const panel = screen.getByRole("dialog", { name: "Objeciones" });
    expect(within(panel).getByText("No le interesa")).toBeTruthy();

    fireEvent.change(within(panel).getByLabelText("Buscar objeción"), {
      target: { value: "caro" },
    });
    expect(within(panel).queryByText("No le interesa")).toBeNull();
    expect(within(panel).getByText("Es muy caro")).toBeTruthy();

    fireEvent.click(
      within(panel).getByRole("button", { name: "Copiar objeción: Es muy caro" })
    );
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        "Es muy caro\nMencionar el plan de cuotas."
      )
    );
    expect(within(panel).getByText("CONSULTADA")).toBeTruthy();

    // Volver al mismo punto no altera el recorrido.
    fireEvent.click(within(panel).getByRole("button", { name: "Volver a la llamada" }));
    expect(screen.getByText("Etapa 1 de 2 del guion")).toBeTruthy();
  });

  it("el resumen reúne el registro cargado y las notas en memoria", () => {
    let speech = crearSpeechInteractivo({ nombre: "Con campos" });
    speech = actualizarPaso(speech, speech.steps[0].id, {
      titulo: "Apertura",
      contenido: "Hola",
    });
    speech = agregarCampo(speech, speech.steps[0].id, {
      nombre: "Teléfono",
      tipo: "texto-corto",
    });
    render(<ModoLlamada speech={speech} objeciones={[]} onClose={() => {}} />);

    fireEvent.change(screen.getByLabelText("Teléfono"), { target: { value: "11223344" } });
    fireEvent.click(screen.getByRole("button", { name: "Abrir resumen" }));

    const panel = screen.getByRole("dialog", { name: "Resumen de la llamada" });
    expect(within(panel).getByLabelText("Teléfono").value).toBe("11223344");
    expect(within(panel).getByText("Ninguna todavía.")).toBeTruthy();

    fireEvent.change(within(panel).getByLabelText("Notas de la llamada"), {
      target: { value: "Llamar el lunes" },
    });
    fireEvent.click(within(panel).getByRole("button", { name: "Volver a la llamada" }));
    // Las notas quedan en la sesión (visibles al reabrir el resumen).
    fireEvent.click(screen.getByRole("button", { name: "Abrir resumen" }));
    const reabierto = screen.getByRole("dialog", { name: "Resumen de la llamada" });
    expect(within(reabierto).getByLabelText("Notas de la llamada").value).toBe(
      "Llamar el lunes"
    );
  });
});

describe("ModoLlamada (cambio de respuesta)", () => {
  it("pide confirmación, descarta respuestas posteriores y recalcula el camino", async () => {
    const speech = guionCambioDeRespuesta();
    render(<ModoLlamada speech={speech} objeciones={[]} onClose={() => {}} />);

    // Recorrido: e1 Sí → e2 Listo → e3.
    fireEvent.click(screen.getByText("Sí"));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("Etapa 2 de 3 del guion")).toBeTruthy();
    fireEvent.click(screen.getByText("Listo"));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("Etapa 3 de 3 del guion")).toBeTruthy();

    // Volver a la primera respuesta y cambiarla.
    fireEvent.click(screen.getByRole("button", { name: "Atrás" }));
    fireEvent.click(screen.getByRole("button", { name: "Atrás" }));
    expect(screen.getByText("Etapa 1 de 3 del guion")).toBeTruthy();
    fireEvent.click(screen.getByText("No"));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    const dialogo = screen.getByRole("dialog", { name: "Cambiar respuesta" });
    expect(within(dialogo).getByText(/Se descartarán/)).toBeTruthy();
    expect(
      within(dialogo).getByText(/Los datos que escribiste a mano nunca se borran/)
    ).toBeTruthy();

    fireEvent.click(
      within(dialogo).getByRole("button", { name: "Cambiar respuesta" })
    );

    // La rama "No" salta a e3 y la respuesta de e2 ya no existe en el camino.
    await waitFor(() =>
      expect(screen.getByText("Etapa 3 de 3 del guion")).toBeTruthy()
    );
    expect(screen.queryByText("2. Desarrollo")).toBeNull();

    // Atrás vuelve a e1 (no a la e2 descartada).
    fireEvent.click(screen.getByRole("button", { name: "Atrás" }));
    expect(screen.getByText("Etapa 1 de 3 del guion")).toBeTruthy();
  });
});

describe("ModoLlamada (salida segura)", () => {
  it("ofrece seguir, conservar o descartar sin guardar", async () => {
    const onClose = vi.fn();
    const onDescartar = vi.fn();
    const onGuardar = vi.fn();
    render(
      <ModoLlamada
        speech={guionDosEtapas()}
        objeciones={[]}
        onGuardar={onGuardar}
        onDescartar={onDescartar}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Salir del modo llamada" }));
    const dialogo = screen.getByRole("dialog", { name: "Salir de la llamada" });
    // Sin interacción no se habla de "datos cargados".
    expect(within(dialogo).getByText(/Todavía no hay datos/)).toBeTruthy();

    fireEvent.click(within(dialogo).getByRole("button", { name: "Seguir en la llamada" }));
    // El Modal anima su salida antes de desmontarse.
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Salir de la llamada" })).toBeNull()
    );
    expect(onGuardar).not.toHaveBeenCalled();

    // Con datos cargados, "Conservar y salir" delega el guardado al storage.
    fireEvent.click(screen.getByText("Sigue en línea"));
    fireEvent.click(screen.getByRole("button", { name: "Salir del modo llamada" }));
    const conDatos = screen.getByRole("dialog", { name: "Salir de la llamada" });
    expect(within(conDatos).getByText(/La llamada tiene datos cargados/)).toBeTruthy();
    expect(onGuardar).toHaveBeenCalled();

    fireEvent.click(within(conDatos).getByRole("button", { name: "Conservar y salir" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onDescartar).not.toHaveBeenCalled();
  });

  it("cancelar sin guardar descarta la sesión y cierra", () => {
    const onClose = vi.fn();
    const onDescartar = vi.fn();
    render(
      <ModoLlamada
        speech={guionDosEtapas()}
        objeciones={[]}
        onDescartar={onDescartar}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByText("Sigue en línea"));
    fireEvent.click(screen.getByRole("button", { name: "Salir del modo llamada" }));
    const dialogo = screen.getByRole("dialog", { name: "Salir de la llamada" });
    fireEvent.click(
      within(dialogo).getByRole("button", { name: "Cancelar sin guardar" })
    );

    expect(onDescartar).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("avisa al retomar si el guion cambió y permite ocultar el aviso", () => {
    render(
      <ModoLlamada
        speech={guionDosEtapas()}
        objeciones={[]}
        avisoGuionCambiado
        onClose={() => {}}
      />
    );

    expect(
      screen.getByText(/El guion cambió desde que empezó esta llamada/)
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Ocultar aviso de guion cambiado" })
    );
    expect(
      screen.queryByText(/El guion cambió desde que empezó esta llamada/)
    ).toBeNull();
  });
});
