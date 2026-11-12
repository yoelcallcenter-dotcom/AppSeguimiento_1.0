/**
 * plantillaRegistro.test.js (Release 1.11.3)
 *
 * Cubre el motor puro de plantillas: normalización, valores por defecto,
 * condiciones genéricas, validación de datos/configuración, resumen y mapeo.
 * Los escenarios de integración con el Modo llamada están en
 * `plantillaLlamada.test.js`.
 */
import { describe, it, expect } from "vitest";
import {
  asignacionesHuerfanas,
  crearCampoPlantilla,
  crearPlantilla,
  erroresPlantilla,
  erroresValorCampo,
  formatearValor,
  normalizarCampoPlantilla,
  normalizarValorCampo,
  resumenRegistro,
  validarRegistro,
  valorVacio,
  valoresPorDefecto,
  visibilidadCampos,
} from "./plantillaRegistro";

const campo = (id, extra = {}) => ({
  ...crearCampoPlantilla({ nombre: id, ...extra }),
  id,
});

describe("plantillaRegistro (motor puro)", () => {
  it("normaliza tipos válidos e inválidos sin ocultar el error", () => {
    const invalido = normalizarCampoPlantilla({
      id: "x",
      nombre: "Roto",
      tipo: "voodoo",
      obligatorio: false,
      opciones: [],
      descripcion: "",
      visibleSi: [],
      campoDestino: "",
      pasoId: null,
      orden: 0,
    });
    // El tipo roto se conserva para que la validación lo reporte.
    expect(invalido.tipo).toBe("voodoo");
    expect(erroresValorCampo({ tipo: "voodoo" }, "")).toEqual([]);
  });

  it("normaliza valores por tipo y detecta opciones/fechas/números inválidos", () => {
    expect(normalizarValorCampo({ tipo: "seleccion-multiple" }, "A, B ,,C")).toEqual([
      "A",
      "B",
      "C",
    ]);
    expect(normalizarValorCampo({ tipo: "casilla" }, "si")).toBe(true);
    expect(normalizarValorCampo({ tipo: "casilla" }, "no")).toBe(false);
    expect(normalizarValorCampo({ tipo: "si-no" }, "quizá")).toBe("");

    expect(
      erroresValorCampo({ tipo: "numero" }, "abc")
    ).toContain("Debe ser un número.");
    expect(
      erroresValorCampo({ tipo: "fecha" }, "31/12/2026")
    ).toContain("La fecha no tiene un formato válido (AAAA-MM-DD).");
    expect(
      erroresValorCampo({ tipo: "hora" }, "25:99")
    ).toContain("La hora no tiene un formato válido (HH:MM).");
    expect(
      erroresValorCampo(
        { tipo: "seleccion-unica", opciones: ["A", "B"] },
        "C"
      )
    ).toContain("Opción no contemplada: C.");
  });

  it("valorVacio distingue casilla, selección múltiple y si-no", () => {
    expect(valorVacio({ tipo: "casilla" }, false)).toBe(true);
    expect(valorVacio({ tipo: "casilla" }, true)).toBe(false);
    expect(valorVacio({ tipo: "seleccion-multiple" }, [])).toBe(true);
    expect(valorVacio({ tipo: "seleccion-multiple" }, ["A"])).toBe(false);
    expect(valorVacio({ tipo: "si-no" }, "si")).toBe(false);
    expect(valorVacio({ tipo: "si-no" }, "")).toBe(true);
  });

  it("aplica valores por defecto y los marca como automáticos", () => {
    const campos = [
      campo("a", { porDefecto: "Hola" }),
      campo("b", { tipo: "casilla", porDefecto: true }),
      campo("c", { porDefecto: "" }),
    ];
    const { registro, origen } = valoresPorDefecto(campos);
    expect(registro).toEqual({ a: "Hola", b: true });
    expect(origen).toEqual({ a: "auto", b: "auto" });
  });

  it("evalúa condiciones genéricas (AND) sin hardcodear ningún speech", () => {
    const campos = [
      campo("estado", { tipo: "seleccion-unica", opciones: ["si", "no"] }),
      campo("detalle", {
        visibleSi: [{ campoId: "estado", operador: "igual", valor: "si" }],
      }),
      campo("libre", {
        visibleSi: [{ campoId: "detalle", operador: "con-valor" }],
      }),
    ];
    expect(visibilidadCampos(campos, { estado: "no" })).toEqual({
      estado: true,
      detalle: false,
      libre: false,
    });
    expect(
      visibilidadCampos(campos, { estado: "si", detalle: "algo" })
    ).toEqual({ estado: true, detalle: true, libre: true });
  });

  it("valida obligatorios visibles y permite campos ocultos incompletos", () => {
    const campos = [
      campo("estado", { tipo: "seleccion-unica", opciones: ["si", "no"] }),
      campo("detalle", {
        obligatorio: true,
        visibleSi: [{ campoId: "estado", operador: "igual", valor: "si" }],
      }),
    ];
    const oculto = validarRegistro(campos, { estado: "no" });
    expect(oculto.errores).toEqual([]);
    expect(oculto.total).toBe(1);

    const visible = validarRegistro(campos, { estado: "si" });
    expect(visible.errores).toHaveLength(1);
    expect(visible.pendientes.map((c) => c.id)).toEqual(["detalle"]);
    expect(visible.completos).toBe(1);
    expect(visible.total).toBe(2);
    expect(visible.porcentaje).toBe(50);
  });

  it("reporta ids duplicados, campos sin nombre, default inválido y condiciones rotas", () => {
    const plantilla = crearPlantilla({
      campos: [
        campo("dup", { nombre: "Uno" }),
        campo("dup", { nombre: "Dos" }),
        campo("sin-nombre", { nombre: "" }),
        campo("fecha", { tipo: "fecha", porDefecto: "ayer" }),
        campo("cond", {
          visibleSi: [
            { campoId: "no-existe", operador: "igual", valor: "x" },
            { campoId: "dup", operador: "inventado", valor: "" },
          ],
        }),
        campo("destino", { campoDestino: "campo-inexistente" }),
      ],
    });
    const errores = erroresPlantilla(plantilla).join(" | ");
    expect(errores).toContain('identificadores duplicados: "dup"');
    expect(errores).toContain("no tiene nombre visible");
    expect(errores).toContain("valor predeterminado");
    expect(errores).toContain("operador inválido");
    expect(errores).toContain('referencia un campo inexistente ("no-existe")');
    expect(errores).toContain("campo de caso desconocido");
  });

  it("detecta asociaciones huérfanas sin inventar campos", () => {
    const opciones = [
      { id: "o1", asignaciones: [{ campoId: "ok", valor: "x" }] },
      { id: "o2", asignaciones: [{ campoId: "roto", valor: "y" }] },
    ];
    expect(asignacionesHuerfanas(opciones, [{ id: "ok" }])).toEqual([
      { opcionId: "o2", campoId: "roto" },
    ]);
  });

  it("el resumen distingue automático de manual y no muestra campos ocultos", () => {
    const campos = [
      campo("auto"),
      campo("manual"),
      campo("oculto", {
        visibleSi: [{ campoId: "auto", operador: "igual", valor: "no" }],
      }),
    ];
    const resumen = resumenRegistro(
      campos,
      { auto: "derivado", manual: "escrito", oculto: "x" },
      { auto: "auto", manual: "manual", oculto: "manual" }
    );
    expect(resumen.map((r) => r.campoId)).toEqual(["auto", "manual"]);
    expect(resumen[0].origen).toBe("auto");
    expect(resumen[1].origen).toBe("manual");
  });

  it("formatea valores legibles sin inventar datos", () => {
    expect(formatearValor({ tipo: "casilla" }, true)).toBe("Sí");
    expect(formatearValor({ tipo: "casilla" }, false)).toBe("");
    expect(formatearValor({ tipo: "si-no" }, "no")).toBe("No");
    expect(formatearValor({ tipo: "seleccion-multiple" }, ["A", "B"])).toBe(
      "A, B"
    );
    expect(formatearValor({ tipo: "texto-corto" }, "")).toBe("");
  });
});
