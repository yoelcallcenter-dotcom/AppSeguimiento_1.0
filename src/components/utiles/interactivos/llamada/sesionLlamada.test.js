/**
 * Test del motor de sesión del Modo llamada (Release 1.11.2).
 * Cubre los contratos que comparten la Vista rápida y la pantalla nueva:
 * gate de obligatorios, asignaciones, atrás, cambio conservador de respuesta,
 * finalización y retomado seguro contra el guion actual.
 */
import { describe, it, expect } from "vitest";
import {
  aplicarCambio,
  analizarCambio,
  atras,
  avanzar,
  crearSesion,
  elegirOpcion,
  finalizarSesion,
  normalizarSesion,
  reiniciarSesion,
  serializarSesion,
  setCampoRegistro,
} from "./sesionLlamada";

const campo = (id, nombre, extra = {}) => ({
  id,
  nombre,
  tipo: "texto",
  obligatorio: false,
  opciones: [],
  ...extra,
});

const opcion = (id, texto, extra = {}) => ({
  id,
  texto,
  targetStepId: null,
  orden: 0,
  respuestaSugerida: "",
  accion: "",
  datosARegistrar: "",
  asignaciones: [],
  requiereAclaracion: false,
  finalizaLlamada: false,
  estadoFinalId: "",
  moduloId: null,
  ...extra,
});

function guion() {
  return {
    id: "sp-1",
    nombre: "Guion de prueba",
    descripcion: "",
    version: 3,
    startStepId: "e1",
    estadosFinales: [
      { id: "fin-ok", nombre: "Derivación coordinada" },
      { id: "fin-no", nombre: "No desea derivación" },
    ],
    reglas: [],
    modulos: [],
    steps: [
      {
        id: "e1",
        titulo: "Apertura",
        objetivo: "",
        contenido: "Hola",
        camposRegistro: [campo("c1", "Nombre")],
        preguntas: [
          {
            id: "q1",
            texto: "¿Quiere seguir?",
            obligatoria: false,
            opciones: [
              opcion("a", "Sí", {
                targetStepId: "e2",
                asignaciones: [{ campoId: "c1", valor: "Automático" }],
              }),
              opcion("b", "No", { targetStepId: "e3" }),
            ],
          },
        ],
      },
      {
        id: "e2",
        titulo: "Datos",
        objetivo: "",
        contenido: "Contame más",
        camposRegistro: [campo("c2", "Detalle")],
        preguntas: [
          {
            id: "q2",
            texto: "¿Algo más?",
            obligatoria: false,
            opciones: [
              opcion("c", "Listo", {
                targetStepId: "e3",
                asignaciones: [{ campoId: "c2", valor: "Automático 2" }],
              }),
            ],
          },
        ],
      },
      {
        id: "e3",
        titulo: "Cierre",
        objetivo: "",
        contenido: "Gracias",
        camposRegistro: [],
        preguntas: [
          {
            id: "q3",
            texto: "",
            obligatoria: false,
            opciones: [
              opcion("f", "Finalizar", {
                finalizaLlamada: true,
                estadoFinalId: "fin-no",
              }),
            ],
          },
        ],
      },
    ],
  };
}

/** Lleva la sesión hasta e3 respondiendo a y c (con autos). */
function sesionHastaCierre() {
  const speech = guion();
  let s = crearSesion(speech);
  s = elegirOpcion(s, "a");
  s = avanzar(s, speech).sesion;
  s = elegirOpcion(s, "c");
  s = avanzar(s, speech).sesion;
  return { speech, sesion: s };
}

describe("sesionLlamada (Release 1.11.2)", () => {
  it("crea la sesión en la etapa inicial sin marcarla como tocada", () => {
    const speech = guion();
    const s = crearSesion(speech);
    expect(s.pasoId).toBe("e1");
    expect(s.camino).toEqual([{ pasoId: "e1", preguntaIdx: 0 }]);
    expect(s.indice).toBe(0);
    expect(s.finalizada).toBe(false);
  });

  it("bloquea el avance con obligatorios pendientes y lo permite al completarlos", () => {
    const speech = {
      id: "sp-gate",
      version: 1,
      startStepId: "g1",
      steps: [
        {
          id: "g1",
          titulo: "Única",
          contenido: "",
          camposRegistro: [campo("req", "Dato obligatorio", { obligatorio: true })],
          preguntas: [{ id: "q", texto: "", obligatoria: false, opciones: [] }],
        },
      ],
    };
    let s = crearSesion(speech);
    let res = avanzar(s, speech);
    expect(res.evento.tipo).toBe("gate");
    expect(res.evento.pendientes).toEqual(["Dato obligatorio"]);
    expect(res.sesion).toBe(s);

    s = setCampoRegistro(s, "req", "ok");
    res = avanzar(s, speech);
    expect(res.evento.tipo).toBe("fin");
    expect(res.sesion.enFin).toBe(true);
  });

  it("aplica asignaciones sobre campos vacíos y las registra como autos", () => {
    const { speech, sesion } = sesionHastaCierre();
    expect(sesion.registro.c1).toBe("Automático");
    expect(sesion.registro.c2).toBe("Automático 2");
    expect(sesion.respuestas["e1|0"]).toEqual({
      opcionId: "a",
      autos: { c1: "Automático" },
    });
    expect(sesion.respuestas["e2|0"]).toEqual({
      opcionId: "c",
      autos: { c2: "Automático 2" },
    });
    expect(speech.steps).toHaveLength(3);
  });

  it("Atrás conserva las respuestas y limpia solo el borrador", () => {
    const { speech, sesion } = sesionHastaCierre();
    const atrasUna = atras(sesion);
    expect(atrasUna.pasoId).toBe("e2");
    expect(atrasUna.borradorOpcionId).toBe("");
    expect(atrasUna.respuestas["e1|0"].opcionId).toBe("a");
    expect(atrasUna.registro.c1).toBe("Automático");

    const atrasDos = atras(atrasUna);
    expect(atrasDos.pasoId).toBe("e1");
    expect(atrasDos.indice).toBe(0);
    expect(atrasDos.respuestas["e2|0"].opcionId).toBe("c");
    // Atrás desde la pantalla de fin vuelve a la última posición real.
    const enFin = atras({ ...sesion, enFin: true, pasoId: null });
    expect(enFin.pasoId).toBe("e3");
  });

  it("analiza el cambio de respuesta: respuestas posteriores y autos afectados", () => {
    const { speech, sesion } = sesionHastaCierre();
    const analisis = analizarCambio(sesion, speech, "e1|0", "b");
    expect(analisis.valido).toBe(true);
    expect(analisis.cambiaElCamino).toBe(true);
    // e2 tenía respuesta; e3 no (es la posición posterior al tramo que queda).
    expect(analisis.respuestasDescartadas).toBe(1);
    expect(analisis.camposAuto.sort()).toEqual(["c1", "c2"]);
    expect(analisis.camposManual).toEqual([]);

    // La misma opción no es un cambio.
    const mismo = analizarCambio(sesion, speech, "e1|0", "a");
    expect(mismo.cambiaElCamino).toBe(false);
  });

  it("aplicarCambio trunca el camino, descarta respuestas y limpia SOLO autos intactos", () => {
    const { speech } = sesionHastaCierre();
    // El operador editó c1 a mano: debe conservarse.
    let manual = setCampoRegistro(crearSesion(speech), "c1", "");
    manual = elegirOpcion(manual, "a");
    manual = avanzar(manual, speech).sesion;
    manual = setCampoRegistro(manual, "c1", "Escrito a mano");
    manual = elegirOpcion(manual, "c");
    manual = avanzar(manual, speech).sesion;

    const analisisManual = analizarCambio(manual, speech, "e1|0", "b");
    expect(analisisManual.camposManual).toEqual(["c1"]);
    expect(analisisManual.camposAuto).toEqual(["c2"]);

    const { sesion: cambiada, evento } = aplicarCambio(manual, speech, "e1|0", "b");
    expect(evento.tipo).toBe("avance");
    // La opción b salta a e3: e2 desaparece del camino.
    expect(cambiada.camino).toEqual([
      { pasoId: "e1", preguntaIdx: 0 },
      { pasoId: "e3", preguntaIdx: 0 },
    ]);
    expect(cambiada.pasoId).toBe("e3");
    expect(cambiada.respuestas["e2|0"]).toBeUndefined();
    expect(cambiada.respuestas["e1|0"].opcionId).toBe("b");
    // Lo escrito a mano se conserva; el auto posterior se limpia.
    expect(cambiada.registro.c1).toBe("Escrito a mano");
    expect(cambiada.registro.c2).toBeUndefined();
  });

  it("finaliza con estado y registra la opción en borrador", () => {
    const { speech, sesion } = sesionHastaCierre();
    const enCierre = elegirOpcion(sesion, "f");
    const final = finalizarSesion(enCierre, speech, "fin-ok");
    expect(final.finalizada).toBe(true);
    expect(final.estadoFinalId).toBe("fin-ok");
    expect(final.borradorOpcionId).toBe("");
    expect(final.respuestas["e3|0"].opcionId).toBe("f");
  });

  it("serializa y retoma contra el guion actual; avisa si cambió la versión", () => {
    const { speech, sesion } = sesionHastaCierre();
    const raw = JSON.parse(JSON.stringify(serializarSesion(sesion)));

    const ok = normalizarSesion(raw, speech);
    expect(ok.ok).toBe(true);
    expect(ok.guionCambiado).toBe(false);
    expect(ok.sesion.pasoId).toBe("e3");
    expect(ok.sesion.respuestas["e1|0"].opcionId).toBe("a");

    const cambiado = normalizarSesion(raw, { ...speech, version: 99 });
    expect(cambiado.ok).toBe(true);
    expect(cambiado.guionCambiado).toBe(true);

    expect(normalizarSesion(raw, { ...speech, id: "otro" }).ok).toBe(false);
    expect(normalizarSesion(raw, { ...speech, steps: [] }).ok).toBe(false);
    expect(normalizarSesion({ ...raw, v: 999 }, speech).ok).toBe(false);
  });

  it("reiniciar conserva la identidad de la llamada pendiente", () => {
    const { speech, sesion } = sesionHastaCierre();
    const reiniciada = reiniciarSesion(sesion, speech);
    expect(reiniciada.pasoId).toBe("e1");
    expect(reiniciada.camino).toHaveLength(1);
    expect(reiniciada.respuestas).toEqual({});
    expect(reiniciada.iniciadaEn).toBe(sesion.iniciadaEn);
  });
});
