/**
 * liquidacionesStore.test.js (v1.10.4)
 * Persistencia de liquidaciones y top manual (Pruebas 9-12 del prompt).
 * Usa Dexie real sobre fake-indexeddb (src/test/setup.js).
 */

import { describe, it, expect, beforeEach } from "vitest";
import appDB from "../../core/db/appDB";
import {
  periodoKeyDe,
  getLiquidacion,
  guardarLiquidacion,
  getTopDelPeriodo,
  setTopDelPeriodo,
  registrarCambioConfig,
  getHistorialConfig,
} from "./liquidacionesStore";
import { calcularLiquidacion, ajustesVacios } from "./liquidacionEngine";
import { REGLAS_LIQUIDACION_DEFECTO } from "./liquidacionReglas";

const PERIODO = { year: 2026, month: 9, fechaCierre: "2026-10-31" };

function casosLeves(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: `f-${i + 1}`,
    nombre: `Caso ${i + 1}`,
    estado: "Firmo",
    fechaFirma: "2026-10-10",
    reporteHistory: [],
    estudioJuridico: "gl caba",
    tipoIngreso: "",
  }));
}

function ajusteLeve(casos) {
  const a = ajustesVacios();
  a.categoriaPorCaso = Object.fromEntries(casos.map((c) => [c.id, "leve"]));
  return a;
}

beforeEach(async () => {
  await appDB.liquidaciones.clear();
  await appDB.liquidacion_top.clear();
  await appDB.liquidacion_config_history.clear();
});

describe("liquidacionesStore", () => {
  it("construye la clave de período YYYY-MM", () => {
    expect(periodoKeyDe(2026, 9)).toBe("2026-10");
    expect(periodoKeyDe(2026, 11)).toBe("2026-12");
  });

  it("P9: el cierre conserva los importes originales aunque cambien las tarifas", async () => {
    const casos = casosLeves(18);
    const liq1 = calcularLiquidacion(casos, {
      ...PERIODO,
      ajustes: ajusteLeve(casos),
      reglas: REGLAS_LIQUIDACION_DEFECTO,
    });
    await guardarLiquidacion({
      periodoKey: periodoKeyDe(2026, 9),
      estado: "cerrada",
      cerradaEn: new Date().toISOString(),
      ...liq1,
    });

    // Tarifas posteriores al cierre (distinto universo de reglas).
    const liq2 = calcularLiquidacion(casos, {
      ...PERIODO,
      ajustes: ajusteLeve(casos),
      reglas: { ...REGLAS_LIQUIDACION_DEFECTO, tarifas: { leve: 99999, grave: 1, profesional: 1 } },
    });
    expect(liq2.operadores[0].importe).not.toBe(liq1.operadores[0].importe);

    // El doc cerrado NO se toca: conserva reglas e importes originales.
    const guardada = await getLiquidacion(periodoKeyDe(2026, 9));
    expect(guardada.estado).toBe("cerrada");
    expect(guardada.reglasSnapshot.tarifas.leve).toBe(10000);
    expect(guardada.operadores[0].importe).toBe(liq1.operadores[0].importe);
    expect(guardada.totales.importeTotal).toBe(liq1.totales.importeTotal);
  });

  it("P10: el estado manual del top persiste y es del período elegido", async () => {
    const pk = periodoKeyDe(2026, 9);
    await setTopDelPeriodo(pk, "gl caba", true);
    const top = await getTopDelPeriodo(pk);
    expect(top).toHaveLength(1);
    expect(top[0].estudio).toBe("gl caba");
    expect(top[0].enTop).toBe(true);
    expect(top[0].updatedAt).toBeTruthy();
    // Desmarcar elimina el registro.
    await setTopDelPeriodo(pk, "gl caba", false);
    expect(await getTopDelPeriodo(pk)).toHaveLength(0);
  });

  it("P11: cambiar de período no copia el top del período anterior", async () => {
    await setTopDelPeriodo(periodoKeyDe(2026, 9), "gl caba", true);
    const topNov = await getTopDelPeriodo(periodoKeyDe(2026, 10));
    expect(topNov).toHaveLength(0);
    expect(await getTopDelPeriodo(periodoKeyDe(2026, 9))).toHaveLength(1);
  });

  it("P12: al 'recargar' (nueva lectura) se recuperan los datos persistidos", async () => {
    const pk = periodoKeyDe(2026, 9);
    const casos = casosLeves(14);
    const liq = calcularLiquidacion(casos, { ...PERIODO, ajustes: ajusteLeve(casos) });
    const saved = await guardarLiquidacion({ periodoKey: pk, estado: "preparacion", ...liq });
    await setTopDelPeriodo(pk, "gl caba", true);

    // Nuevas lecturas (simulan recarga de la app).
    const doc = await getLiquidacion(pk);
    const top = await getTopDelPeriodo(pk);
    expect(doc.totales.firmas).toBe(saved.totales.firmas);
    expect(doc.operadores[0].habilitado).toBe(true);
    expect(doc.createdAt).toBeTruthy();
    expect(top[0].estudio).toBe("gl caba");
  });

  it("guardarLiquidacion hace upsert por período (no duplica documentos)", async () => {
    const pk = periodoKeyDe(2026, 9);
    await guardarLiquidacion({ periodoKey: pk, estado: "preparacion", totales: { firmas: 1 } });
    const second = await guardarLiquidacion({ periodoKey: pk, estado: "preparacion", totales: { firmas: 5 } });
    const all = await appDB.liquidaciones.toArray();
    expect(all).toHaveLength(1);
    expect(second.totales.firmas).toBe(5);
  });

  // -------------------------------------------------------------------------
  // v1.10.5: puesto manual en el top + historial de auditoría de configuración
  // -------------------------------------------------------------------------

  it("v1.10.5: el puesto manual del top persiste y se limpia al desmarcar", async () => {
    const pk = periodoKeyDe(2026, 9);
    await setTopDelPeriodo(pk, "gl caba", true, 2);
    const top = await getTopDelPeriodo(pk);
    expect(top[0].puesto).toBe(2);
    // Un valor inválido queda como null (pendiente), nunca 0 ni negativo.
    await setTopDelPeriodo(pk, "otro estudio", true, 0);
    expect((await getTopDelPeriodo(pk)).find((t) => t.estudio === "otro estudio").puesto).toBeNull();
    // Desmarcar elimina el registro completo (incluido el puesto).
    await setTopDelPeriodo(pk, "gl caba", false);
    expect(await getTopDelPeriodo(pk)).toHaveLength(1);
  });

  it("v1.10.5: el historial de configuración registra fecha, campo y valores", async () => {
    await registrarCambioConfig({ campo: "minimoFirmasNetas", valorAnterior: 14, valorNuevo: 18 });
    await registrarCambioConfig({ campo: "premios", valorAnterior: { fondo: 100000 }, valorNuevo: { fondo: 150000 } });
    const rows = await getHistorialConfig();
    expect(rows).toHaveLength(2);
    // Orden: el más reciente primero (misma fecha ISO → el último registrado).
    expect(rows[0].campo).toBe("premios");
    expect(rows[1].campo).toBe("minimoFirmasNetas");
    expect(rows[0].valorNuevo).toBe(JSON.stringify({ fondo: 150000 }));
    expect(rows[0].valorAnterior).toBe(JSON.stringify({ fondo: 100000 }));
    expect(rows[0].fecha).toBeTruthy();
    // El límite recorta los más antiguos.
    expect(await getHistorialConfig(1)).toHaveLength(1);
  });
});
