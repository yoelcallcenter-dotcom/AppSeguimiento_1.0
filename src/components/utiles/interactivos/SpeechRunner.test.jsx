import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { SpeechRunner } from "./SpeechRunner";
import {
  crearSpeechInteractivo,
  agregarPaso,
  actualizarPaso,
  agregarPregunta,
  agregarOpcion,
  actualizarOpcion,
  agregarCampo,
  agregarEstadoFinal,
} from "./interactiveSpeechModel";

/**
 * SpeechRunner.test.jsx (Release 1.11.0)
 * Cobertura por área del spec: navegación (avanzar/retroceder/ramificar/
 * saltar), respuesta sugerida + copiar, registro que sobrevive a navegar,
 * gates de obligatorios, panel de objeciones con retorno, aclaración
 * obligatoria, asignaciones (auto-fill solo en vacíos), finalización con
 * estado final y compatibilidad de llaves {OBJECION} (1.9.x).
 */

const objeciones = [
  { id: "o1", titulo: "No le interesa", contenido: "Explicar los beneficios." },
  { id: "o2", titulo: "Es muy caro", contenido: "Mencionar el plan de cuotas." },
];

// --- Fixtures en forma v1 (sin preguntas): el runner las normaliza al montar
const speechConLlave = {
  id: "s1",
  nombre: "Prueba",
  descripcion: "",
  startStepId: "p1",
  steps: [
    {
      id: "p1",
      titulo: "Apertura",
      contenido: "Si dice que no:\n{OBJECION:o1}",
      orden: 0,
      opciones: [],
    },
  ],
};

const speechSinLlave = {
  id: "s2",
  nombre: "Simple",
  descripcion: "",
  startStepId: "p1",
  steps: [
    { id: "p1", titulo: "", contenido: "Contenido plano.", orden: 0, opciones: [] },
  ],
};

// --- Fixtures construidos con el modelo v2 -------------------------------

/** 3 etapas: e1 con una pregunta de 2 opciones (una lineal, una con destino). */
function guionNavegacion() {
  let s = crearSpeechInteractivo({ nombre: "Llamada ART", descripcion: "Prueba" });
  s = agregarPaso(s);
  s = agregarPaso(s);
  const [e1, e2, e3] = s.steps.map((x) => x.id);
  s = actualizarPaso(s, e1, { titulo: "Apertura", contenido: "Hola, ¿puede hablar?" });
  s = actualizarPaso(s, e2, { titulo: "Desarrollo", contenido: "Cuénteme la lesión." });
  s = actualizarPaso(s, e3, { titulo: "Cierre", contenido: "Gracias." });
  s = agregarPregunta(s, e1, "¿Tiene un minuto?");
  const q = s.steps[0].preguntas[0].id;
  s = agregarOpcion(s, e1, "Sigue en línea", q);
  s = agregarOpcion(s, e1, "Salta al cierre", q);
  const opSalto = s.steps[0].preguntas[0].opciones[1].id;
  s = actualizarOpcion(s, e1, opSalto, { targetStepId: e3 });
  return s;
}

/** 2 etapas sin preguntas (slides) y un campo opcional en la primera. */
function guionConCampos() {
  let s = crearSpeechInteractivo({ nombre: "Con campos" });
  s = agregarPaso(s);
  s = actualizarPaso(s, s.steps[0].id, { titulo: "Apertura", contenido: "Hola" });
  s = actualizarPaso(s, s.steps[1].id, { titulo: "Cierre", contenido: "Chau" });
  s = agregarCampo(s, s.steps[0].id, { nombre: "Teléfono", tipo: "texto-corto" });
  return s;
}

/** Como la anterior pero con un campo obligatorio y uno opcional. */
function guionObligatorio() {
  let s = crearSpeechInteractivo({ nombre: "Obligatorios" });
  s = agregarPaso(s);
  s = actualizarPaso(s, s.steps[0].id, { titulo: "Apertura", contenido: "Hola" });
  s = actualizarPaso(s, s.steps[1].id, { titulo: "Cierre", contenido: "Chau" });
  s = agregarCampo(s, s.steps[0].id, {
    nombre: "Nombre del trabajador",
    tipo: "texto-corto",
    obligatorio: true,
  });
  s = agregarCampo(s, s.steps[0].id, { nombre: "Comentario", tipo: "texto-corto" });
  return s;
}

/** 1 etapa con dos estados finales configurables (§2.5). */
function guionEstados() {
  let s = crearSpeechInteractivo({ nombre: "Con estados" });
  s = agregarPaso(s);
  s = actualizarPaso(s, s.steps[0].id, { titulo: "Apertura", contenido: "Hola" });
  s = agregarEstadoFinal(s, "No contesta");
  s = agregarEstadoFinal(s, "Datos confirmados");
  return s;
}

// Clipboard mock: captura las copias sin tocar el portapapeles real.
let writeText;
beforeEach(() => {
  writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(window.navigator, "clipboard", {
    value: { writeText },
    configurable: true,
    writable: true,
  });
});

describe("SpeechRunner (resolución de objeciones)", () => {
  it("resuelve la llave mostrando título arriba y contenido debajo", () => {
    render(<SpeechRunner speech={speechConLlave} onClose={() => {}} objeciones={objeciones} />);
    const bloque = screen.getByText(/Si dice que no:/);
    expect(bloque.textContent).toBe(
      "Si dice que no:\nNo le interesa\nExplicar los beneficios."
    );
  });

  it("la llave desconocida se muestra literal", () => {
    render(<SpeechRunner speech={speechConLlave} onClose={() => {}} objeciones={[]} />);
    expect(screen.getByText(/\{OBJECION:o1\}/)).toBeTruthy();
  });

  it("sin llaves el contenido se muestra tal cual", () => {
    render(<SpeechRunner speech={speechSinLlave} onClose={() => {}} objeciones={objeciones} />);
    expect(screen.getByText("Contenido plano.")).toBeTruthy();
  });
});

describe("SpeechRunner (navegación §2.1/§2.2)", () => {
  it("avanza, retrocede y ramifica sin perder el sentido del recorrido", () => {
    const speech = guionNavegacion();
    render(<SpeechRunner speech={speech} onClose={() => {}} objeciones={[]} />);

    expect(screen.getByText("ETAPA 1 / 3")).toBeTruthy();
    expect(screen.getByText("Apertura")).toBeTruthy();
    expect(screen.getByText("Atrás").closest("button").disabled).toBe(true);

    // Opción lineal: elegirla abre el área de respuesta; Continuar avanza.
    fireEvent.click(screen.getByText("Sigue en línea"));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("ETAPA 2 / 3")).toBeTruthy();
    expect(screen.getByText("Desarrollo")).toBeTruthy();

    // Atrás vuelve a la etapa anterior sin perder datos.
    fireEvent.click(screen.getByText("Atrás"));
    expect(screen.getByText("ETAPA 1 / 3")).toBeTruthy();
    expect(screen.getByText("Apertura")).toBeTruthy();

    // Ramificación: la opción con destino salta directo a la etapa 3.
    fireEvent.click(screen.getByText("Salta al cierre"));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("ETAPA 3 / 3")).toBeTruthy();
    expect(screen.getByText("Cierre")).toBeTruthy();
    expect(screen.queryByText("Desarrollo")).toBeNull();

    // Última etapa sin destino: Siguiente llega al fin del recorrido.
    fireEvent.click(screen.getByText("Siguiente"));
    expect(screen.getByText("Fin del recorro")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Finalizar llamada" })).toBeTruthy();
  });

  it("permite saltar a cualquier etapa con el selector del pie", () => {
    const speech = guionNavegacion();
    render(<SpeechRunner speech={speech} onClose={() => {}} objeciones={[]} />);

    fireEvent.change(screen.getByLabelText("Ir a etapa"), {
      target: { value: speech.steps[2].id },
    });
    expect(screen.getByText("ETAPA 3 / 3")).toBeTruthy();
    expect(screen.getByText("Cierre")).toBeTruthy();

    // El salto queda en el historial: se puede volver.
    fireEvent.click(screen.getByText("Atrás"));
    expect(screen.getByText("ETAPA 1 / 3")).toBeTruthy();
  });

  it("marca y reabre etapas completadas sin afectar el recorrido", () => {
    const speech = guionNavegacion();
    render(<SpeechRunner speech={speech} onClose={() => {}} objeciones={[]} />);

    fireEvent.click(screen.getByText("Marcar completada"));
    expect(screen.getByText("COMPLETADA")).toBeTruthy();
    expect(screen.getByText("Reabrir")).toBeTruthy();

    fireEvent.click(screen.getByText("Reabrir"));
    expect(screen.queryByText("COMPLETADA")).toBeNull();
    expect(screen.getByText("Marcar completada")).toBeTruthy();
    // Navegar sigue funcionando igual.
    fireEvent.click(screen.getByText("Sigue en línea"));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("ETAPA 2 / 3")).toBeTruthy();
  });
});

describe("SpeechRunner (respuesta sugerida y copia §2.3)", () => {
  it("muestra la respuesta sugerida con copia al portapapeles", async () => {
    const speech = guionNavegacion();
    const e1 = speech.steps[0].id;
    const opLinea = speech.steps[0].preguntas[0].opciones[0].id;
    const conSugerida = actualizarOpcion(speech, e1, opLinea, {
      respuestaSugerida: "Sí, está cubierto por la ART.",
      accion: "Escuchar sin interrumpir.",
      datosARegistrar: "Descripción de la lesión",
    });
    render(<SpeechRunner speech={conSugerida} onClose={() => {}} objeciones={[]} />);

    fireEvent.click(screen.getByText("Sigue en línea"));
    expect(screen.getByText("Respuesta sugerida")).toBeTruthy();
    expect(screen.getByText("Sí, está cubierto por la ART.")).toBeTruthy();
    expect(screen.getByText("Acción del operador")).toBeTruthy();
    expect(screen.getByText("Escuchar sin interrumpir.")).toBeTruthy();
    expect(screen.getByText("Datos a registrar")).toBeTruthy();
    // El destino de la opción queda visible para el operador.
    expect(screen.getByText(/Continúa en:/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Copiar respuesta sugerida" }));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith("Sí, está cubierto por la ART.")
    );
    // El botón confirma la copia visualmente.
    expect(screen.getByRole("button", { name: "Copiar respuesta sugerida" })).toBeTruthy();
  });

  it("las llaves {OBJECION} también se resuelven en la respuesta sugerida", () => {
    const speech = guionNavegacion();
    const e1 = speech.steps[0].id;
    const opLinea = speech.steps[0].preguntas[0].opciones[0].id;
    const conLlave = actualizarOpcion(speech, e1, opLinea, {
      respuestaSugerida: "Si insiste: {OBJECION:o2}",
    });
    render(<SpeechRunner speech={conLlave} onClose={() => {}} objeciones={objeciones} />);

    fireEvent.click(screen.getByText("Sigue en línea"));
    const respuesta = screen.getByText(/Si insiste:/);
    expect(respuesta.textContent).toBe(
      "Si insiste: Es muy caro\nMencionar el plan de cuotas."
    );
  });
});

describe("SpeechRunner (registro de llamada §3)", () => {
  it("el registro sobrevive a navegar y es editable desde el resumen", () => {
    const speech = guionConCampos();
    render(<SpeechRunner speech={speech} onClose={() => {}} objeciones={[]} />);

    fireEvent.change(screen.getByLabelText("Teléfono"), { target: { value: "12345" } });
    expect(screen.getByLabelText("Teléfono").value).toBe("12345");

    // Avanzar a la etapa 2 (los campos de la etapa 1 no se pintan acá).
    fireEvent.click(screen.getByText("Siguiente"));
    expect(screen.getByText("ETAPA 2 / 2")).toBeTruthy();
    expect(screen.queryByLabelText("Teléfono")).toBeNull();

    // Volver: el valor sigue intacto.
    fireEvent.click(screen.getByText("Atrás"));
    expect(screen.getByLabelText("Teléfono").value).toBe("12345");

    // Resumen editable: mismo valor y cambios reflejados en el área principal.
    fireEvent.click(screen.getByRole("button", { name: "Abrir resumen" }));
    const panel = screen.getByRole("dialog", { name: "Resumen de la llamada" });
    expect(within(panel).getByLabelText("Teléfono").value).toBe("12345");
    fireEvent.change(within(panel).getByLabelText("Teléfono"), {
      target: { value: "67890" },
    });
    expect(within(panel).getByLabelText("Teléfono").value).toBe("67890");

    fireEvent.click(within(panel).getByRole("button", { name: "Volver a la llamada" }));
    expect(screen.queryByRole("dialog", { name: "Resumen de la llamada" })).toBeNull();
    expect(screen.getByLabelText("Teléfono").value).toBe("67890");
  });

  it("los campos obligatorios bloquean el avance con la lista visible (sin escape)", () => {
    const speech = guionObligatorio();
    render(<SpeechRunner speech={speech} onClose={() => {}} objeciones={[]} />);

    fireEvent.click(screen.getByText("Siguiente"));
    const alerta = screen.getByRole("alert");
    expect(alerta.textContent).toContain("Nombre del trabajador");
    // El campo opcional NUNCA bloquea (§2.1).
    expect(alerta.textContent).not.toContain("Comentario");
    expect(screen.getByText("ETAPA 1 / 2")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Nombre del trabajador"), {
      target: { value: "Juan Pérez" },
    });
    fireEvent.click(screen.getByText("Siguiente"));
    expect(screen.getByText("ETAPA 2 / 2")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("las asignaciones de la opción autocompletan SOLO campos vacíos", () => {
    let s = crearSpeechInteractivo({ nombre: "Asignaciones" });
    s = agregarPaso(s);
    s = actualizarPaso(s, s.steps[0].id, { titulo: "Apertura", contenido: "Hola" });
    s = actualizarPaso(s, s.steps[1].id, { titulo: "Cierre", contenido: "Chau" });
    s = agregarCampo(s, s.steps[0].id, { nombre: "Hora solicitada", tipo: "hora" });
    s = agregarOpcion(s, s.steps[0].id, "Pide turno");
    const campoId = s.steps[0].camposRegistro[0].id;
    const opId = s.steps[0].preguntas[0].opciones[0].id;
    s = actualizarOpcion(s, s.steps[0].id, opId, {
      asignaciones: [{ campoId, valor: "10:30" }],
    });
    render(<SpeechRunner speech={s} onClose={() => {}} objeciones={[]} />);

    // Campo vacío → la asignación lo completa al continuar.
    fireEvent.click(screen.getByText("Pide turno"));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("ETAPA 2 / 2")).toBeTruthy();
    fireEvent.click(screen.getByText("Atrás"));
    expect(screen.getByLabelText("Hora solicitada").value).toBe("10:30");

    // Valor ya cargado → la asignación NO lo pisa.
    fireEvent.change(screen.getByLabelText("Hora solicitada"), {
      target: { value: "11:00" },
    });
    fireEvent.click(screen.getByText("Pide turno"));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByText("Atrás"));
    expect(screen.getByLabelText("Hora solicitada").value).toBe("11:00");
  });
});

describe("SpeechRunner (módulo de objeciones §2.4)", () => {
  it("búsqueda, copia, retorno al recorrido y registro de consultadas", async () => {
    const speech = guionNavegacion();
    render(<SpeechRunner speech={speech} onClose={() => {}} objeciones={objeciones} />);

    fireEvent.click(screen.getByRole("button", { name: "Abrir objeciones" }));
    const panel = screen.getByRole("dialog", { name: "Objeciones" });
    expect(within(panel).getByText("No le interesa")).toBeTruthy();
    expect(within(panel).getByText("Es muy caro")).toBeTruthy();

    // Búsqueda filtra por título/contenido y se limpia.
    fireEvent.change(within(panel).getByLabelText("Buscar objeción"), {
      target: { value: "caro" },
    });
    expect(within(panel).getByText("Es muy caro")).toBeTruthy();
    expect(within(panel).queryByText("No le interesa")).toBeNull();
    fireEvent.change(within(panel).getByLabelText("Buscar objeción"), {
      target: { value: "" },
    });
    expect(within(panel).getByText("No le interesa")).toBeTruthy();

    // Copiar una objeción (título + contenido) sin salir de la llamada.
    fireEvent.click(
      within(panel).getByRole("button", { name: "Copiar objeción: No le interesa" })
    );
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith("No le interesa\nExplicar los beneficios.")
    );

    // Retorno: el panel se cierra y el recorrido sigue en la misma etapa.
    fireEvent.click(within(panel).getByRole("button", { name: "Volver a la llamada" }));
    expect(screen.queryByRole("dialog", { name: "Objeciones" })).toBeNull();
    expect(screen.getByText("ETAPA 1 / 3")).toBeTruthy();

    // La objeción consultada queda en el resumen.
    fireEvent.click(screen.getByRole("button", { name: "Abrir resumen" }));
    const resumen = screen.getByRole("dialog", { name: "Resumen de la llamada" });
    expect(within(resumen).getByText("No le interesa")).toBeTruthy();
    expect(within(resumen).queryByText("Ninguna todavía.")).toBeNull();
  });
});

describe("SpeechRunner (aclaración y estados finales §2.2/§2.5)", () => {
  it("exige aclaración antes de continuar cuando la opción lo requiere", () => {
    let s = crearSpeechInteractivo({ nombre: "Aclaración" });
    s = agregarPaso(s);
    s = actualizarPaso(s, s.steps[0].id, { titulo: "Apertura", contenido: "Hola" });
    s = actualizarPaso(s, s.steps[1].id, { titulo: "Cierre", contenido: "Chau" });
    s = agregarOpcion(s, s.steps[0].id, "Necesito aclarar");
    const opId = s.steps[0].preguntas[0].opciones[0].id;
    s = actualizarOpcion(s, s.steps[0].id, opId, {
      requiereAclaracion: true,
      respuestaSugerida: "Espere que verifico.",
    });
    render(<SpeechRunner speech={s} onClose={() => {}} objeciones={[]} />);

    fireEvent.click(screen.getByText("Necesito aclarar"));
    expect(screen.getByText("Respuesta sugerida")).toBeTruthy();
    // Sin texto: Continuar bloqueado.
    expect(screen.getByRole("button", { name: "Continuar" }).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/Aclaración del trabajador/), {
      target: { value: "Sí, me confirmó el número" },
    });
    expect(screen.getByRole("button", { name: "Continuar" }).disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("ETAPA 2 / 2")).toBeTruthy();
  });

  it("finalizar la llamada registra el estado final elegido", async () => {
    const speech = guionEstados();
    render(<SpeechRunner speech={speech} onClose={() => {}} objeciones={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "Finalizar" }));
    const dialogo = screen.getByRole("dialog", { name: "Finalizar llamada" });
    fireEvent.change(within(dialogo).getByLabelText("Estado final"), {
      target: { value: speech.estadosFinales[0].id },
    });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Confirmar" }));

    expect(screen.getByText("Llamada finalizada")).toBeTruthy();
    expect(screen.getByText("Estado: No contesta")).toBeTruthy();
    // El diálogo anima su salida (180ms): esperar a que desaparezca.
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Finalizar llamada" })).toBeNull()
    );

    // El resumen muestra el estado final de la llamada.
    fireEvent.click(screen.getByRole("button", { name: "Ver resumen" }));
    const resumen = screen.getByRole("dialog", { name: "Resumen de la llamada" });
    expect(within(resumen).getByText("Llamada finalizada · No contesta")).toBeTruthy();
  });

  it("una opción con finalizaLlamada cierra desde el área con su estado precargado", () => {
    let s = guionEstados();
    s = agregarOpcion(s, s.steps[0].id, "No contesta y cuelga");
    const opId = s.steps[0].preguntas[0].opciones[0].id;
    s = actualizarOpcion(s, s.steps[0].id, opId, {
      finalizaLlamada: true,
      estadoFinalId: s.estadosFinales[0].id,
    });
    render(<SpeechRunner speech={s} onClose={() => {}} objeciones={[]} />);

    fireEvent.click(screen.getByText("No contesta y cuelga"));
    fireEvent.click(screen.getByRole("button", { name: "Finalizar llamada" }));

    const dialogo = screen.getByRole("dialog", { name: "Finalizar llamada" });
    // El estado de la opción viene precargado en el select.
    expect(within(dialogo).getByLabelText("Estado final").value).toBe(
      s.estadosFinales[0].id
    );
    fireEvent.click(within(dialogo).getByRole("button", { name: "Confirmar" }));
    expect(screen.getByText("Llamada finalizada")).toBeTruthy();
    expect(screen.getByText("Estado: No contesta")).toBeTruthy();
  });

  it("el cierre directo funciona cuando no hay datos en curso", () => {
    const onClose = vi.fn();
    const speech = guionConCampos();
    render(<SpeechRunner speech={speech} onClose={onClose} objeciones={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Cerrar llamada" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("el cierre con datos en curso pide confirmación antes de llamar a onClose", () => {
    const onClose = vi.fn();
    const speech = guionConCampos();
    render(<SpeechRunner speech={speech} onClose={onClose} objeciones={[]} />);
    fireEvent.change(screen.getByLabelText("Teléfono"), { target: { value: "123" } });

    fireEvent.click(screen.getByRole("button", { name: "Cerrar llamada" }));
    expect(onClose).not.toHaveBeenCalled(); // aún no cerró: pide confirmación

    const dialogo = screen.getByRole("dialog", { name: "Cerrar llamada" });
    expect(within(dialogo).getByText(/no se guardan al cerrar/)).toBeTruthy();
    fireEvent.click(within(dialogo).getByRole("button", { name: "Sí, cerrar" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("cancelar el cierre mantiene el runner visible y en la misma etapa", () => {
    const onClose = vi.fn();
    const speech = guionConCampos();
    render(<SpeechRunner speech={speech} onClose={onClose} objeciones={[]} />);
    fireEvent.change(screen.getByLabelText("Teléfono"), { target: { value: "123" } });

    fireEvent.click(screen.getByRole("button", { name: "Cerrar llamada" }));
    const dialogo = screen.getByRole("dialog", { name: "Cerrar llamada" });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }));

    expect(onClose).not.toHaveBeenCalled();
    // El modal sigue visible y el registro intacto (el key remonta el Modal
    // tras cancelar para recuperar la animación de salida).
    expect(screen.getByText("ETAPA 1 / 2")).toBeTruthy();
    expect(screen.getByLabelText("Teléfono").value).toBe("123");
  });
});
