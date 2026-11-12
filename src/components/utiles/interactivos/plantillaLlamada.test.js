/**
 * plantillaLlamada.test.js (Release 1.11.3)
 *
 * Integración plantilla ↔ Modo llamada ↔ caso/historial. Cubre los escenarios
 * funcionales de la release: defaults automáticos, asociaciones explícitas,
 * recalculo de visibilidad, datos manuales incompatibles, guardado parcial,
 * confirmación explícita, mapeo al caso y snapshot histórico inmutable.
 */
import { describe, it, expect } from "vitest";
import { normalizarSpeech } from "./interactiveSpeechModel";
import {
  aplicarAsignaciones,
  avanzar,
  confirmarSesion,
  crearSesion,
  datosCasoDesdeRegistro,
  elegirOpcion,
  normalizarSesion,
  reconciliarRegistro,
  registroParaHistorial,
  resumenSesion,
  serializarSesion,
  setCampoRegistro,
  validarCierreSesion,
} from "./llamada/sesionLlamada";

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

function guion({ aceptaObligatorio = false } = {}) {
  return normalizarSpeech({
    id: "sp-plantilla",
    nombre: "Guion con plantilla",
    descripcion: "",
    archivado: false,
    version: 4,
    startStepId: "e1",
    estadosFinales: [],
    reglas: [],
    modulos: [],
    plantillaRegistro: {
      version: 1,
      nombre: "Registro de prueba",
      campos: [
        {
          id: "localidad",
          nombre: "Localidad",
          tipo: "texto-corto",
          obligatorio: false,
          opciones: [],
          porDefecto: "CABA",
          campoDestino: "localidad",
          pasoId: "e1",
        },
        {
          id: "tipo",
          nombre: "Tipo",
          tipo: "seleccion-unica",
          obligatorio: false,
          opciones: ["si", "no"],
          pasoId: "e1",
        },
        {
          id: "detalle",
          nombre: "Detalle",
          tipo: "texto-corto",
          obligatorio: false,
          opciones: [],
          pasoId: "e1",
          visibleSi: [{ campoId: "tipo", operador: "igual", valor: "si" }],
        },
        {
          id: "acepta",
          nombre: "Acepta derivación",
          tipo: "si-no",
          obligatorio: aceptaObligatorio,
          opciones: [],
          pasoId: null,
        },
        {
          id: "estudio",
          nombre: "Estudio",
          tipo: "seleccion-unica",
          obligatorio: false,
          opciones: ["A", "B"],
          campoDestino: "estudioJuridico",
          pasoId: null,
          visibleSi: [{ campoId: "acepta", operador: "igual", valor: "si" }],
        },
        {
          id: "resultado",
          nombre: "Resultado",
          tipo: "texto-corto",
          obligatorio: false,
          opciones: [],
          pasoId: null,
        },
      ],
    },
    steps: [
      {
        id: "e1",
        titulo: "Apertura",
        objetivo: "",
        contenido: "Hola",
        camposRegistro: [],
        preguntas: [
          {
            id: "q1",
            texto: "¿Confirma?",
            obligatoria: false,
            opciones: [
              opcion("o-si", "Sí", {
                targetStepId: "e2",
                asignaciones: [
                  { campoId: "tipo", valor: "si" },
                  { campoId: "detalle", valor: "derivado" },
                ],
              }),
              opcion("o-no", "No", { targetStepId: "e2" }),
            ],
          },
        ],
      },
      {
        id: "e2",
        titulo: "Cierre",
        objetivo: "",
        contenido: "Gracias",
        camposRegistro: [],
        preguntas: [
          {
            id: "q2",
            texto: "",
            obligatoria: false,
            opciones: [
              opcion("o-fin", "Finalizar", {
                finalizaLlamada: true,
                estadoFinalId: "",
              }),
            ],
          },
        ],
      },
    ],
  });
}

describe("plantilla en el Modo llamada", () => {
  it("crea la sesión con los valores predeterminados marcados como automáticos", () => {
    const speech = guion();
    const sesion = crearSesion(speech);
    expect(sesion.registro.localidad).toBe("CABA");
    expect(sesion.origen.localidad).toBe("auto");
    expect(sesion.registro.detalle).toBeUndefined();
  });

  it("la respuesta aplica asociaciones explícitas a campos de la plantilla", () => {
    const speech = guion();
    let sesion = crearSesion(speech);
    sesion = elegirOpcion(sesion, "o-si");
    const resultado = avanzar(sesion, speech);
    expect(resultado.evento.tipo).toBe("avance");
    expect(resultado.sesion.registro.tipo).toBe("si");
    expect(resultado.sesion.registro.detalle).toBe("derivado");
    expect(resultado.sesion.origen.tipo).toBe("auto");
    expect(resultado.sesion.origen.detalle).toBe("auto");
  });

  it("una asociación automática no pisa un dato escrito a mano", () => {
    const speech = guion();
    const op = speech.steps[0].preguntas[0].opciones[0];
    const manual = aplicarAsignaciones(
      speech,
      "e1",
      op,
      { detalle: "escrito por el operador" },
      { detalle: "manual" }
    );
    expect(manual.registro.detalle).toBe("escrito por el operador");

    const auto = aplicarAsignaciones(
      speech,
      "e1",
      op,
      { detalle: "derivado viejo" },
      { detalle: "auto" }
    );
    expect(auto.registro.detalle).toBe("derivado");
  });

  it("recalcula visibilidad al cambiar respuestas: limpia autos y conserva manuales", () => {
    const speech = guion();
    const auto = reconciliarRegistro(
      speech,
      { tipo: "no", detalle: "derivado" },
      { detalle: "auto" }
    );
    expect(auto.registro.detalle).toBeUndefined();
    expect(auto.incompatibles).toEqual([]);

    const manual = reconciliarRegistro(
      speech,
      { tipo: "no", detalle: "escrito" },
      { detalle: "manual" }
    );
    expect(manual.registro.detalle).toBe("escrito");
    expect(manual.incompatibles).toContain("detalle");
  });

  it("el flag de incompatibles se actualiza al editar un campo manualmente", () => {
    const speech = guion();
    let sesion = crearSesion(speech);
    sesion = setCampoRegistro(sesion, "tipo", "si", speech);
    sesion = setCampoRegistro(sesion, "detalle", "manual", speech);
    expect(sesion.origen.detalle).toBe("manual");
    expect(sesion.incompatibles).not.toContain("detalle");

    sesion = setCampoRegistro(sesion, "tipo", "no", speech);
    expect(sesion.registro.detalle).toBe("manual");
    expect(sesion.incompatibles).toContain("detalle");
  });

  it("valida obligatorios visibles y permite guardado parcial explícito", () => {
    const speech = guion({ aceptaObligatorio: true });
    let sesion = crearSesion(speech);

    const validacion = validarCierreSesion(speech, sesion);
    expect(validacion.pendientes.map((c) => c.id)).toContain("acepta");

    const rechazado = confirmarSesion(sesion, speech);
    expect(rechazado.evento.tipo).toBe("registro-incompleto");
    expect(rechazado.evento.pendientes.map((c) => c.id)).toContain("acepta");

    const parcial = confirmarSesion(sesion, speech, { permitirParcial: true });
    expect(parcial.evento.tipo).toBe("registro-confirmado");
    expect(parcial.evento.parcial).toBe(true);
    expect(parcial.sesion.confirmada).toBe(true);
  });

  it("confirma el registro y mapea SÓLO los campos con destino explícito", () => {
    const speech = guion();
    let sesion = crearSesion(speech);
    sesion = setCampoRegistro(sesion, "acepta", "si", speech);
    sesion = setCampoRegistro(sesion, "estudio", "A", speech);
    sesion = setCampoRegistro(sesion, "resultado", "interesado", speech);

    const { evento, sesion: confirmada } = confirmarSesion(sesion, speech);
    expect(evento.tipo).toBe("registro-confirmado");
    expect(evento.parcial).toBe(false);
    expect(evento.datosCaso).toEqual({
      localidad: "CABA",
      estudioJuridico: "A",
    });
    expect(datosCasoDesdeRegistro(speech, confirmada)).toEqual({
      localidad: "CABA",
      estudioJuridico: "A",
    });
  });

  it("no mapea campos ocultos ni valores vacíos", () => {
    const speech = guion();
    let sesion = crearSesion(speech);
    sesion = setCampoRegistro(sesion, "acepta", "si", speech);
    // `estudio` sigue visible pero vacío; `detalle` está oculto.
    const datos = datosCasoDesdeRegistro(speech, sesion);
    expect(datos).toEqual({ localidad: "CABA" });
  });

  it("el resumen distingue automático/manual y respeta visibilidad", () => {
    const speech = guion();
    let sesion = crearSesion(speech);
    sesion = setCampoRegistro(sesion, "tipo", "si", speech);
    sesion = setCampoRegistro(sesion, "detalle", "manual", speech);

    const resumen = resumenSesion(speech, sesion);
    const localidad = resumen.find((r) => r.campoId === "localidad");
    const detalle = resumen.find((r) => r.campoId === "detalle");
    expect(localidad.origen).toBe("auto");
    expect(detalle.origen).toBe("manual");
    expect(detalle.texto).toBe("manual");
  });

  it("el snapshot de historial conserva speech id, versión y datos aunque el guion cambie", () => {
    const speech = guion();
    let sesion = crearSesion(speech);
    sesion = setCampoRegistro(sesion, "resultado", "ok", speech);
    const confirmada = confirmarSesion(sesion, speech).sesion;
    const snapshot = registroParaHistorial(speech, confirmada, {
      estadoFinal: "Derivación coordinada",
    });
    expect(snapshot.speechId).toBe("sp-plantilla");
    expect(snapshot.speechVersion).toBe(4);
    expect(snapshot.estadoFinal).toBe("Derivación coordinada");
    expect(snapshot.datos.find((d) => d.campoId === "resultado").texto).toBe("ok");

    // Editar el guion después NO altera el snapshot ya generado.
    speech.version = 99;
    expect(snapshot.speechVersion).toBe(4);
    expect(snapshot.datos.find((d) => d.campoId === "resultado").texto).toBe("ok");
  });

  it("retoma una sesión serializada reconstruyendo defaults y origen sin perder datos", () => {
    const speech = guion();
    let sesion = crearSesion(speech);
    sesion = setCampoRegistro(sesion, "resultado", "manual", speech);
    const serializada = serializarSesion(sesion);
    const retomada = normalizarSesion(serializada, speech);

    expect(retomada.ok).toBe(true);
    expect(retomada.sesion.registro.resultado).toBe("manual");
    expect(retomada.sesion.registro.localidad).toBe("CABA");
    expect(retomada.sesion.origen.resultado).toBe("manual");
    expect(retomada.sesion.origen.localidad).toBe("auto");
  });
});
