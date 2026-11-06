import { describe, it, expect } from "vitest";
import {
  TIPO_NODO,
  CLAVE_FIN,
  ALTO_NODO,
  ALTO_PUERTO,
  construirGrafo,
  nodoPorClave,
  clavesDeGrafo,
  layoutAutomatico,
  posicionesConLayout,
  podarLayout,
  conPosicionNodo,
  conLayoutCompleto,
  calcularVistaAjustada,
  centrarVistaEnNodo,
  altoNodo,
  esNodoDestino,
} from "./grafoSpeech";
import { crearEjemploART } from "../ejemploGuionART";

/**
 * grafoSpeech.test.js (Release 1.11.1)
 *
 * El grafo es una VISTA derivada del mismo guion. Estos tests fijan:
 * - el mapeo colapsado (etapa/pregunta/finalización, opciones como puertos),
 * - las reglas de conexión idénticas a resolverDestino,
 * - el layout opcional y su saneamiento,
 * - los guards de jsdom (medidas 0) en la vista ajustada.
 */

const speechDemo = {
  id: "demo",
  nombre: "Demo",
  version: 2,
  startStepId: "e1",
  estadosFinales: [{ id: "est1", nombre: "Cierre" }],
  modulos: [],
  reglas: [],
  steps: [
    {
      id: "e1",
      titulo: "Uno",
      contenido: "Hola",
      objetivo: "",
      camposRegistro: [],
      preguntas: [
        {
          id: "p1",
          texto: "¿Sí o no?",
          obligatoria: false,
          opciones: [
            { id: "o1", texto: "Sí", targetStepId: "e2" },
            {
              id: "o2",
              texto: "Cerrar",
              finalizaLlamada: true,
              estadoFinalId: "est1",
              targetStepId: "e3",
            },
            { id: "o3", texto: "Seguir", targetStepId: null },
          ],
        },
      ],
    },
    {
      id: "e2",
      titulo: "Dos",
      contenido: "",
      objetivo: "",
      camposRegistro: [],
      preguntas: [],
    },
    {
      id: "e3",
      titulo: "Tres",
      contenido: "",
      objetivo: "",
      camposRegistro: [],
      preguntas: [
        { id: "p3", texto: "Sin opciones", obligatoria: false, opciones: [] },
      ],
    },
  ],
};

describe("construirGrafo", () => {
  it("colapsa el guion ART en 30 nodos (inicio, etapas, preguntas, estados y fin)", () => {
    const grafo = construirGrafo(crearEjemploART());
    const contar = (tipo) => grafo.nodos.filter((n) => n.tipo === tipo).length;

    expect(grafo.nodos).toHaveLength(30);
    expect(contar(TIPO_NODO.INICIO)).toBe(1);
    expect(contar(TIPO_NODO.ETAPA)).toBe(8);
    expect(contar(TIPO_NODO.PREGUNTA) + contar(TIPO_NODO.DECISION)).toBe(11);
    expect(contar(TIPO_NODO.FINAL)).toBe(9);
    expect(contar(TIPO_NODO.FIN)).toBe(1);
    // Las opciones NO son nodos: son puertos/aristas.
    expect(grafo.nodos.some((n) => n.key.includes("opcion"))).toBe(false);
  });

  it("resuelve destinos con las mismas reglas que el runner", () => {
    const grafo = construirGrafo(speechDemo);
    const pregunta = nodoPorClave(grafo, "pregunta:p1");
    expect(pregunta.tipo).toBe(TIPO_NODO.DECISION);
    expect(pregunta.salidas).toHaveLength(3);

    // 1) targetStepId válido → etapa.
    expect(pregunta.salidas[0]).toMatchObject({
      opcionId: "o1",
      tipo: "opcion",
      destinoKey: "etapa:e2",
    });
    // 2) finalizaLlamada GANA sobre el targetStepId (igual que el runner).
    expect(pregunta.salidas[1]).toMatchObject({
      opcionId: "o2",
      tipo: "final",
      destinoKey: "fin:est1",
      finalizaLlamada: true,
    });
    // 3) sin destino ni finalización → avance lineal (siguiente etapa).
    expect(pregunta.salidas[2]).toMatchObject({
      opcionId: "o3",
      tipo: "lineal",
      destinoKey: "etapa:e2",
    });

    // Una etapa sin preguntas avanza a la siguiente etapa.
    const aristaE2 = grafo.aristas.find((a) => a.desde === "etapa:e2");
    expect(aristaE2.hasta).toBe("etapa:e3");
  });

  it("resuelve destinoLabel aunque el destino se cree después del puerto", () => {
    // Los nodos se arman en orden: la etapa destino y el estado final se
    // agregan después de las salidas que los referencian. La segunda pasada
    // debe dejar el nombre real (el panel y los tooltips lo muestran).
    const grafo = construirGrafo(speechDemo);
    const pregunta = nodoPorClave(grafo, "pregunta:p1");
    expect(pregunta.salidas[0].destinoKey).toBe("etapa:e2");
    expect(pregunta.salidas[0].destinoLabel).toBe("Dos");
    expect(pregunta.salidas[1].destinoKey).toBe("fin:est1");
    expect(pregunta.salidas[1].destinoLabel).toBe("Cierre");
  });

  it("una pregunta sin opciones dibuja un único puerto Siguiente", () => {
    const grafo = construirGrafo(speechDemo);
    const pregunta = nodoPorClave(grafo, "pregunta:p3");
    expect(pregunta.salidas).toHaveLength(0);
    const siguiente = grafo.aristas.find(
      (a) => a.desde === "pregunta:p3" && a.etiqueta === "Siguiente"
    );
    expect(siguiente.hasta).toBe(CLAVE_FIN);
  });

  it("una finalización con estado inexistente cae en el Fin del guion", () => {
    const roto = {
      ...speechDemo,
      steps: speechDemo.steps.map((s) =>
        s.id !== "e1"
          ? s
          : {
              ...s,
              preguntas: [
                {
                  ...s.preguntas[0],
                  opciones: [
                    {
                      id: "o9",
                      texto: "Cierra",
                      finalizaLlamada: true,
                      estadoFinalId: "no-existe",
                    },
                  ],
                },
              ],
            }
      ),
    };
    const grafo = construirGrafo(roto);
    const salida = nodoPorClave(grafo, "pregunta:p1").salidas[0];
    expect(salida.tipo).toBe("final");
    expect(salida.destinoKey).toBe(CLAVE_FIN);
  });

  it("todas las aristas apuntan a nodos existentes y tienen id único", () => {
    const grafo = construirGrafo(crearEjemploART());
    const claves = clavesDeGrafo(grafo);
    grafo.aristas.forEach((a) => {
      expect(claves.has(a.desde)).toBe(true);
      expect(claves.has(a.hasta)).toBe(true);
    });
    expect(new Set(grafo.aristas.map((a) => a.id)).size).toBe(grafo.aristas.length);
  });

  it("marca entradas y solo Inicio/Etapa/Final/Fin son destinos", () => {
    const grafo = construirGrafo(speechDemo);
    expect(nodoPorClave(grafo, "inicio").entradas).toBe(0);
    expect(nodoPorClave(grafo, "etapa:e1").entradas).toBe(1);
    expect(nodoPorClave(grafo, "fin:est1").entradas).toBe(1);

    expect(esNodoDestino(nodoPorClave(grafo, "etapa:e1"))).toBe(true);
    expect(esNodoDestino(nodoPorClave(grafo, "pregunta:p1"))).toBe(false);
    expect(esNodoDestino(null)).toBe(false);
  });

  it("altoNodo crece con cada puerto y reserva uno para preguntas vacías", () => {
    const grafo = construirGrafo(speechDemo);
    expect(altoNodo(nodoPorClave(grafo, "pregunta:p1"))).toBe(
      ALTO_NODO + 3 * ALTO_PUERTO
    );
    expect(altoNodo(nodoPorClave(grafo, "pregunta:p3"))).toBe(
      ALTO_NODO + ALTO_PUERTO
    );
    expect(altoNodo(nodoPorClave(grafo, "etapa:e1"))).toBe(ALTO_NODO);
  });
});

describe("layout del constructor", () => {
  it("auto-organiza asignando posición a todos los nodos", () => {
    const grafo = construirGrafo(speechDemo);
    const posiciones = layoutAutomatico(grafo);
    grafo.nodos.forEach((n) => {
      expect(posiciones[n.key]).toBeTruthy();
      expect(Number.isFinite(posiciones[n.key].x)).toBe(true);
      expect(Number.isFinite(posiciones[n.key].y)).toBe(true);
    });
  });

  it("las posiciones guardadas mandan sobre el layout automático", () => {
    const grafo = construirGrafo(speechDemo);
    const posiciones = posicionesConLayout(grafo, {
      version: 1,
      nodos: { "etapa:e1": { x: 5, y: 7 } },
    });
    expect(posiciones["etapa:e1"]).toEqual({ x: 5, y: 7 });
    // El resto sigue auto-organizado.
    expect(posiciones["etapa:e2"]).toBeTruthy();
  });

  it("poda claves huérfanas y sanea posiciones inválidas", () => {
    const grafo = construirGrafo(speechDemo);
    const layout = podarLayout(grafo, {
      version: 1,
      nodos: {
        "etapa:e1": { x: 1, y: 2 },
        fantasma: { x: 0, y: 0 },
        "etapa:e2": { x: "no", y: 2 },
      },
    });
    expect(layout).toEqual({ version: 1, nodos: { "etapa:e1": { x: 1, y: 2 } } });
  });

  it("conPosicionNodo no bumpea versión ni fecha y redondea decimales", () => {
    const speech = {
      ...speechDemo,
      version: 2,
      fechaModificacion: "2026-01-01T00:00:00.000Z",
      layout: { version: 1, nodos: {}, vista: { x: 10, y: 20, zoom: 1.5 } },
    };
    const nuevo = conPosicionNodo(speech, "etapa:e1", { x: 10.6, y: 20.2 });
    expect(nuevo.version).toBe(2);
    expect(nuevo.fechaModificacion).toBe("2026-01-01T00:00:00.000Z");
    expect(nuevo.layout.nodos["etapa:e1"]).toEqual({ x: 11, y: 20 });
    expect(nuevo.layout.vista).toEqual({ x: 10, y: 20, zoom: 1.5 });
  });

  it("conLayoutCompleto reemplaza nodos y conserva la vista", () => {
    const speech = {
      ...speechDemo,
      layout: { version: 1, nodos: {}, vista: { x: 1, y: 2, zoom: 0.8 } },
    };
    const nuevo = conLayoutCompleto(speech, { "etapa:e1": { x: 3, y: 4 } });
    expect(nuevo.layout.nodos).toEqual({ "etapa:e1": { x: 3, y: 4 } });
    expect(nuevo.layout.vista).toEqual({ x: 1, y: 2, zoom: 0.8 });
  });
});

describe("vista ajustada (tolerante a jsdom)", () => {
  it("sin medidas devuelve una vista usable en vez de dividir por cero", () => {
    const grafo = construirGrafo(speechDemo);
    const posiciones = layoutAutomatico(grafo);
    expect(calcularVistaAjustada(posiciones, grafo, 0, 0)).toEqual({
      x: 48,
      y: 48,
      zoom: 1,
    });
  });

  it("con medidas calcula un zoom dentro de los límites", () => {
    const grafo = construirGrafo(speechDemo);
    const posiciones = layoutAutomatico(grafo);
    const vista = calcularVistaAjustada(posiciones, grafo, 1200, 900);
    expect(vista.zoom).toBeGreaterThanOrEqual(0.25);
    expect(vista.zoom).toBeLessThanOrEqual(1.1);
    expect(Number.isFinite(vista.x)).toBe(true);
    expect(Number.isFinite(vista.y)).toBe(true);
  });

  it("centrar un nodo no altera la vista si el lienzo no tiene medidas", () => {
    const grafo = construirGrafo(speechDemo);
    const posiciones = layoutAutomatico(grafo);
    const vista = { x: 1, y: 2, zoom: 1 };
    expect(
      centrarVistaEnNodo(posiciones, nodoPorClave(grafo, "etapa:e1"), vista, 0, 0)
    ).toEqual(vista);
  });
});
