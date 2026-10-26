/**
 * liquidacionEngine.test.js (v1.10.4)
 * Pruebas obligatorias del prompt de Liquidaciones (Pruebas 1-8, 13 y 14).
 * El motor es puro: se prueba sin renderizar y sin tocar la UI.
 */

import { describe, it, expect } from "vitest";
import {
  calcularLiquidacion,
  seleccionarFirmas,
  esFirmaCaso,
  fechaFirmaDe,
  validarCierre,
  ajustesVacios,
  sugerirCategoria,
  ESTADO_BAJA,
  SIN_ESTUDIO,
} from "./liquidacionEngine";
import { REGLAS_LIQUIDACION_DEFECTO } from "./liquidacionReglas";

// Período de prueba: octubre 2026 (month es 0-based).
const PERIODO = { year: 2026, month: 9, fechaCierre: "2026-10-31" };
const HOY = new Date("2026-10-20T12:00:00");

/** Crea n casos firmados en el período para un estudio. */
function firmas(idBase, n, estudio = "gl caba") {
  return Array.from({ length: n }, (_, i) => ({
    id: `${idBase}-${i + 1}`,
    nombre: `Caso ${idBase}-${i + 1}`,
    estado: "Firmo",
    fechaFirma: "2026-10-10",
    reporteHistory: [],
    estudioJuridico: estudio,
    tipoIngreso: "",
  }));
}

/** Los primeros `bajas` casos pasan a estado Baja (firma anulada). */
function conBajas(casos, bajas) {
  return casos.map((c, i) => (i < bajas ? { ...c, estado: ESTADO_BAJA } : c));
}

/** Ajuste que clasifica TODOS los casos con la categoría dada. */
function catAll(casos, categoria) {
  const a = ajustesVacios();
  a.categoriaPorCaso = Object.fromEntries(casos.map((c) => [c.id, categoria]));
  return a;
}

const opts = (extra = {}) => ({ ...PERIODO, today: HOY, ...extra });

describe("Liquidaciones · mínimo de habilitación (Pruebas 1-5)", () => {
  it("P1: 18 firmas − 4 bajas = 14 netas → habilitado (paga las 14)", () => {
    const casos = conBajas(firmas("a", 18), 4);
    const liq = calcularLiquidacion(casos, opts({ ajustes: catAll(casos, "leve") }));
    const op = liq.operadores[0];
    expect(op.firmas).toBe(18);
    expect(op.bajas).toBe(4);
    expect(op.netas).toBe(14);
    expect(op.habilitado).toBe(true);
    expect(op.firmasLiquidables).toBe(14);
    // Las primeras 14 NO se descuentan: pagan las 14 netas × 10.000.
    expect(op.importe).toBe(14 * 10000);
    expect(liq.incompleto).toBe(false);
  });

  it("P2: 20 firmas − 5 bajas = 15 netas → habilitado (paga las 15)", () => {
    const casos = conBajas(firmas("b", 20), 5);
    const liq = calcularLiquidacion(casos, opts({ ajustes: catAll(casos, "leve") }));
    const op = liq.operadores[0];
    expect(op.netas).toBe(15);
    expect(op.habilitado).toBe(true);
    expect(op.importe).toBe(15 * 10000);
  });

  it("P3: 18 firmas − 5 bajas = 13 netas → NO habilitado, importe 0", () => {
    const casos = conBajas(firmas("c", 18), 5);
    const liq = calcularLiquidacion(casos, opts({ ajustes: catAll(casos, "leve") }));
    const op = liq.operadores[0];
    expect(op.netas).toBe(13);
    expect(op.habilitado).toBe(false);
    expect(op.firmasLiquidables).toBe(0);
    expect(op.importe).toBe(0);
  });

  it("P4: 14 firmas − 0 bajas = 14 netas → habilitado", () => {
    const casos = firmas("d", 14);
    const liq = calcularLiquidacion(casos, opts({ ajustes: catAll(casos, "leve") }));
    const op = liq.operadores[0];
    expect(op.netas).toBe(14);
    expect(op.habilitado).toBe(true);
    expect(op.importe).toBe(14 * 10000);
  });

  it("P5: 0 firmas y 0 bajas → sin habilitados, importe total 0 y advertencia de período vacío", () => {
    const liq = calcularLiquidacion([], opts());
    expect(liq.totales.firmas).toBe(0);
    expect(liq.totales.habilitados).toBe(0);
    expect(liq.totales.noHabilitados).toBe(0);
    expect(liq.totales.importeTotal).toBe(0);
    const v = validarCierre(liq);
    expect(v.advertencias.some((a) => a.includes("no tiene firmas"))).toBe(true);
  });
});

describe("Liquidaciones · categorías y subtotales (Prueba 6)", () => {
  it("P6: firmas de distintas categorías → subtotales y total correctos", () => {
    // Reglas con mínimo 3 para poder observar importes con pocas firmas.
    const reglas = { ...REGLAS_LIQUIDACION_DEFECTO, minimoFirmasNetas: 3 };
    const casos = [
      ...firmas("le", 1),
      ...firmas("gr", 1, "gl caba"),
      ...firmas("ep", 1, "gl caba"),
    ];
    casos[0].id = "caso-leve";
    casos[1].id = "caso-grave";
    casos[2].id = "caso-ep";
    const ajustes = ajustesVacios();
    ajustes.categoriaPorCaso = {
      "caso-leve": "leve",
      "caso-grave": "grave",
      "caso-ep": "profesional",
    };
    const liq = calcularLiquidacion(casos, opts({ reglas, ajustes }));
    const op = liq.operadores[0];
    expect(op.netas).toBe(3);
    expect(op.habilitado).toBe(true);
    const sub = Object.fromEntries(op.conceptos.map((c) => [c.casoId, c.subtotal]));
    expect(sub["caso-leve"]).toBe(10000);
    expect(sub["caso-grave"]).toBe(20000);
    expect(sub["caso-ep"]).toBe(20000);
    expect(op.importe).toBe(50000);
    expect(liq.totales.importeTotal).toBe(50000);
  });
});

describe("Liquidaciones · segundo concepto (Pruebas 7-8)", () => {
  it("P7: caso con dos firmas identificadas (marca manual tránsito) → dos conceptos por separado", () => {
    const reglas = { ...REGLAS_LIQUIDACION_DEFECTO, minimoFirmasNetas: 2 };
    const casos = [...firmas("x", 1), ...firmas("y", 1)];
    casos[0].id = "caso-doble";
    const ajustes = ajustesVacios();
    // Ojo con los ids reales del fixture: firmas("y", 1) genera "y-1".
    ajustes.categoriaPorCaso = { "caso-doble": "leve", "y-1": "leve" };
    ajustes.conceptosExtra = { "caso-doble": { habilitado: true, categoria: "grave" } };
    const liq = calcularLiquidacion(casos, opts({ reglas, ajustes }));
    const op = liq.operadores[0];
    expect(op.firmas).toBe(3); // 1 caso con 2 conceptos + 1 caso con 1
    const delDoble = op.conceptos.filter((c) => c.casoId === "caso-doble");
    expect(delDoble).toHaveLength(2);
    expect(delDoble.map((c) => c.id).sort()).toEqual(["caso-doble", "caso-doble::transito"]);
    expect(delDoble.find((c) => c.tipoConcepto === "transito").subtotal).toBe(20000);
    expect(op.importe).toBe(10000 + 20000 + 10000);
  });

  it("P8: caso sin información para distinguir dos firmas → un solo concepto (sin duplicados artificiales)", () => {
    const casos = firmas("z", 1);
    const liq = calcularLiquidacion(casos, opts());
    const op = liq.operadores[0];
    expect(op.firmas).toBe(1);
    expect(op.conceptos).toHaveLength(1);
  });
});

describe("Liquidaciones · fechas y selección del período", () => {
  it("usa el último reporte como fecha de firma (convención canónica) y filtra por corte", () => {
    const casos = [
      {
        id: "r1",
        nombre: "Con reporte",
        estado: "Firmo",
        fechaFirma: "2026-09-01",
        reporteHistory: [{ fecha: "10/10/2026" }],
        estudioJuridico: "gl caba",
      },
    ];
    // La fecha de firma es la del reporte (10/10/2026), no fechaFirma (01/09).
    expect(fechaFirmaDe(casos[0], HOY)).toBe("2026-10-10");
    expect(seleccionarFirmas(casos, opts())).toHaveLength(1);
    // Corte antes de la firma: no entra.
    expect(seleccionarFirmas(casos, opts({ fechaCierre: "2026-10-09" }))).toHaveLength(0);
    // Caso sin fecha de firma no selecciona.
    expect(seleccionarFirmas([{ id: "s", estado: "Cita virtual", fechaFirma: null }], opts())).toHaveLength(0);
  });

  it("agrupa por estudio jurídico y usa 'Sin estudio' para los casos sin asignar", () => {
    const casos = [...firmas("g1", 1, "gl caba"), ...firmas("g2", 1, "")];
    casos[1].estudioJuridico = "";
    const liq = calcularLiquidacion(casos, opts());
    expect(liq.operadores.map((o) => o.estudio).sort()).toEqual(["gl caba", SIN_ESTUDIO].sort());
  });

  it("pre-sugiere 'profesional' desde tipoIngreso inequívoco y deja el resto sin clasificar", () => {
    expect(sugerirCategoria({ tipoIngreso: "Enfermedad Profesional" })).toBe("profesional");
    expect(sugerirCategoria({ tipoIngreso: "Accidente + Cirugía" })).toBeNull();
    const casos = firmas("p", 1);
    casos[0].tipoIngreso = "Enfermedad Profesional";
    const liq = calcularLiquidacion(casos, opts());
    expect(liq.operadores[0].conceptos[0].categoria).toBe("profesional");
    expect(liq.incompleto).toBe(false);
  });

  it("esFirmaCaso: estado success o fechaFirma presente", () => {
    expect(esFirmaCaso({ estado: "Firmo" })).toBe(true);
    expect(esFirmaCaso({ estado: "No responde", fechaFirma: "2026-10-10" })).toBe(true);
    expect(esFirmaCaso({ estado: "No responde", fechaFirma: null })).toBe(false);
  });
});

describe("Liquidaciones · datos incompletos (Prueba 13)", () => {
  it("P13: conceptos sin clasificar → importe total no confiable y cierre bloqueado", () => {
    const casos = firmas("i", 14); // alcanzaría el mínimo, pero sin categorías
    const liq = calcularLiquidacion(casos, opts());
    expect(liq.incompleto).toBe(true);
    expect(liq.totales.importeTotal).toBeNull();
    const v = validarCierre(liq);
    expect(v.ok).toBe(false);
    expect(v.errores.some((e) => e.includes("sin clasificar"))).toBe(true);
  });
});

describe("Liquidaciones · duplicados (Prueba 14)", () => {
  it("P14a: baja manual duplicada se detecta y no descuenta dos veces", () => {
    const casos = firmas("d1", 15);
    const ajustes = catAll(casos, "leve");
    ajustes.bajasManuales = [
      { id: "bm-1", casoId: "d1-1", motivo: "x" },
      { id: "bm-2", casoId: "d1-1", motivo: "x otra vez" },
    ];
    const liq = calcularLiquidacion(casos, opts({ ajustes }));
    const op = liq.operadores[0];
    expect(op.bajas).toBe(1); // solo una
    expect(liq.advertencias.some((a) => a.includes("duplicada"))).toBe(true);
  });

  it("P14b: baja manual sobre caso ya baja automática → no doble descuento", () => {
    const casos = conBajas(firmas("d2", 15), 1);
    const ajustes = catAll(casos, "leve");
    ajustes.bajasManuales = [{ id: "bm-3", casoId: "d2-1", motivo: "duplicada" }];
    const liq = calcularLiquidacion(casos, opts({ ajustes }));
    expect(liq.operadores[0].bajas).toBe(1);
    expect(liq.advertencias.some((a) => a.includes("no se descuenta dos veces"))).toBe(true);
  });

  it("P14c: la validación de cierre bloquea baja duplicada y conceptos duplicados", () => {
    const liqBaja = {
      fechaCierre: "2026-10-31",
      incompleto: false,
      totales: { firmas: 2, bajas: 0, netas: 2 },
      operadores: [],
      ajustes: {
        bajasManuales: [{ casoId: "x" }],
      },
      advertencias: [],
    };
    // Simula el caso peligroso: la baja manual coincide con una automática.
    liqBaja.operadores = [
      { estudio: "a", conceptos: [], bajasDetalle: [{ casoId: "x", origen: "automatica" }] },
    ];
    const v1 = validarCierre(liqBaja);
    expect(v1.ok).toBe(false);
    expect(v1.errores.some((e) => e.includes("duplicada"))).toBe(true);

    const liqConceptos = {
      fechaCierre: "2026-10-31",
      incompleto: false,
      totales: { firmas: 2, bajas: 0, netas: 2 },
      ajustes: { bajasManuales: [] },
      advertencias: [],
      operadores: [
        {
          estudio: "a",
          bajasDetalle: [],
          conceptos: [
            { id: "c1", casoId: "c1", categoria: "leve", tarifaUnitaria: 10000 },
            { id: "c1", casoId: "c1", categoria: "leve", tarifaUnitaria: 10000 },
          ],
        },
      ],
    };
    const v2 = validarCierre(liqConceptos);
    expect(v2.ok).toBe(false);
    expect(v2.errores.some((e) => e.includes("duplicados"))).toBe(true);
  });

  it("P14d: cierre válido sin inconsistencias pasa la validación", () => {
    const casos = conBajas(firmas("ok", 18), 4);
    const liq = calcularLiquidacion(casos, opts({ ajustes: catAll(casos, "leve") }));
    const v = validarCierre(liq);
    expect(v.ok).toBe(true);
    expect(v.errores).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// v1.10.5: efectos reales de la configuración central sobre el cálculo (§13)
// ---------------------------------------------------------------------------

describe("Liquidaciones · configuración central (v1.10.5)", () => {
  it("segundo concepto desactivado en configuración → las marcas existentes se ignoran con advertencia", () => {
    const reglasLegacy = { ...REGLAS_LIQUIDACION_DEFECTO, minimoFirmasNetas: 1 };
    const casos = firmas("s", 1);
    const ajustes = catAll(casos, "leve");
    ajustes.conceptosExtra = { "s-1": { habilitado: true, categoria: "grave" } };

    // Con la regla activa (default) el segundo concepto computa.
    const conExtra = calcularLiquidacion(casos, opts({ reglas: reglasLegacy, ajustes }));
    expect(conExtra.operadores[0].importe).toBe(10000 + 20000);

    // Con la regla apagada, la marca se IGNORA (no se duplica sola) y avisa.
    const sinExtra = calcularLiquidacion(
      casos,
      opts({
        reglas: { ...reglasLegacy, reglasConceptos: { permitirSegundoConcepto: false } },
        ajustes,
      })
    );
    expect(sinExtra.operadores[0].importe).toBe(10000); // solo el concepto principal
    expect(sinExtra.advertencias.some((a) => a.includes("Segundos conceptos desactivados"))).toBe(true);
  });

  it("categoría inexistente en la configuración → pendiente de revisión y cierre bloqueado (§4D)", () => {
    const casos = firmas("t", 1);
    // Reglas con lista de categorías que NO incluye "leve".
    const reglas = {
      categorias: [{ key: "grave", nombre: "Lesión grave", tarifa: 20000, activa: true }],
      minimoFirmasNetas: 1,
    };
    const ajustes = catAll(casos, "leve"); // clave que ya no existe
    const liq = calcularLiquidacion(casos, opts({ reglas, ajustes }));
    expect(liq.operadores[0].conceptos[0].tarifaUnitaria).toBeNull();
    expect(liq.operadores[0].conceptos[0].pendienteRevision).toBe(true);
    expect(liq.incompleto).toBe(true);
    expect(liq.totales.importeTotal).toBeNull();
    const v = validarCierre(liq);
    expect(v.ok).toBe(false);
  });

  it("bloquearCierreSinFirmas apagado (default) → advertencia; encendido → error de cierre", () => {
    const liq = calcularLiquidacion([], opts());
    const vDefault = validarCierre(liq);
    expect(vDefault.ok).toBe(true);
    expect(vDefault.advertencias.some((a) => a.includes("no tiene firmas"))).toBe(true);

    const conBloqueo = {
      ...liq,
      reglasSnapshot: { validaciones: { bloquearCierreSinFirmas: true } },
    };
    const vBloqueo = validarCierre(conBloqueo);
    expect(vBloqueo.ok).toBe(false);
    expect(vBloqueo.errores.some((e) => e.includes("solo períodos con firmas"))).toBe(true);
  });

  it("categoría desactivada NO se sugiere para nuevos conceptos (§4C)", () => {
    const casos = firmas("u", 1);
    casos[0].tipoIngreso = "Enfermedad Profesional";
    const reglas = {
      categorias: [
        { key: "leve", nombre: "L", tarifa: 10000, activa: true },
        { key: "grave", nombre: "G", tarifa: 20000, activa: true },
        { key: "profesional", nombre: "P", tarifa: 20000, activa: false },
      ],
      minimoFirmasNetas: 1,
    };
    const liq = calcularLiquidacion(casos, opts({ reglas }));
    expect(liq.operadores[0].conceptos[0].categoria).toBeNull();
    expect(liq.incompleto).toBe(true); // queda sin clasificar → el usuario decide
  });
});
