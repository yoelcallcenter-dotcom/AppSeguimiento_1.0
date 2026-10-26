/**
 * liquidacionConfig.test.js (v1.10.5)
 * Pruebas de la configuración centralizada de Liquidaciones:
 * §12A Configuración general · §12B Tarifas · §12C Mínimo ·
 * §12D Premios · §12F Backup (export/import de la configuración).
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  getLiquidacionConfig,
  getReglas,
  validarCategoria,
  generarKeyCategoria,
  validarDistribucion,
  calcularPremioPuesto,
  validarConfigLiquidaciones,
  tarifaPara,
  getCategoriasActivas,
  CONFIG_LIQUIDACION_DEFECTO,
  PREMIOS_DEFECTO,
} from "./liquidacionReglas";
import { calcularLiquidacion, sugerirCategoria } from "./liquidacionEngine";
import { getLiquidacion, guardarLiquidacion } from "./liquidacionesStore";
import appDB from "../../core/db/appDB";
import { localStorageAdapter } from "../../core/storage/localStorageAdapter";
import { exportBackup, importBackup } from "../../services/backupService";

const PERIODO = { year: 2026, month: 9, fechaCierre: "2026-10-31" };

function casosFirmados(n) {
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

function ajusteLeve(casos, categoria = "leve") {
  const map = {};
  for (const c of casos) map[c.id] = categoria;
  return { categoriaPorCaso: map, conceptosExtra: {}, bajasManuales: [] };
}

// ---------------------------------------------------------------------------
// §12A — Configuración general
// ---------------------------------------------------------------------------

describe("config · general", () => {
  it("el valor predeterminado del mínimo es 14", () => {
    expect(getLiquidacionConfig({}).minimoFirmasNetas).toBe(14);
    expect(getReglas(undefined).minimoFirmasNetas).toBe(14);
    expect(CONFIG_LIQUIDACION_DEFECTO.minimoFirmasNetas).toBe(14);
  });

  it("el cambio del mínimo se refleja en las reglas vigentes", () => {
    const reglas = getReglas({ liquidaciones: { minimoFirmasNetas: 20 } });
    expect(reglas.minimoFirmasNetas).toBe(20);
    // El resto de las reglas conserva defaults (merge, no reemplazo).
    expect(reglas.tarifas.leve).toBe(10000);
    expect(reglas.premios.fondo).toBe(100000);
  });

  it("importa una configuración ANTIGUA sin la clave liquidaciones → defaults seguros", () => {
    const configVieja = { operador: "Yoel", formatoFecha: "DD/MM/YYYY" };
    expect(getLiquidacionConfig(configVieja)).toEqual(CONFIG_LIQUIDACION_DEFECTO);
    expect(getReglas(configVieja).minimoFirmasNetas).toBe(14);
    expect(validarConfigLiquidaciones(configVieja.liquidaciones).ok).toBe(true);
  });

  it("valores corruptos del mínimo caen a defaults (negativo o no entero)", () => {
    expect(getLiquidacionConfig({ liquidaciones: { minimoFirmasNetas: -3 } }).minimoFirmasNetas).toBe(14);
    expect(getLiquidacionConfig({ liquidaciones: { minimoFirmasNetas: 7.5 } }).minimoFirmasNetas).toBe(14);
    expect(getLiquidacionConfig({ liquidaciones: { minimoFirmasNetas: "20" } }).minimoFirmasNetas).toBe(20);
  });

  it("validarConfigLiquidaciones acepta clave ausente y rechaza estructuras corruptas", () => {
    expect(validarConfigLiquidaciones(null).ok).toBe(true);
    expect(validarConfigLiquidaciones(undefined).ok).toBe(true);
    expect(validarConfigLiquidaciones("no-objeto").ok).toBe(false);
    expect(validarConfigLiquidaciones({ minimoFirmasNetas: -1 }).ok).toBe(false);
    expect(validarConfigLiquidaciones({ minimoFirmasNetas: 2.5 }).ok).toBe(false);
    // Categorías con claves duplicadas.
    const dup = {
      categorias: [
        { key: "a", nombre: "A", tarifa: 1 },
        { key: "a", nombre: "B", tarifa: 2 },
      ],
    };
    expect(validarConfigLiquidaciones(dup).ok).toBe(false);
    // Tarifa inválida.
    expect(validarConfigLiquidaciones({ categorias: [{ key: "x", nombre: "X", tarifa: -5 }] }).ok).toBe(false);
    expect(validarConfigLiquidaciones({ premios: "roto" }).ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §12B — Tarifas
// ---------------------------------------------------------------------------

describe("config · tarifas", () => {
  it("valores por defecto: leve 10.000 · grave 20.000 · profesional 20.000", () => {
    const r = getReglas({});
    expect(r.tarifas.leve).toBe(10000);
    expect(r.tarifas.grave).toBe(20000);
    expect(r.tarifas.profesional).toBe(20000);
    // Independencia: profesional NO depende de ser el doble de leve.
    const r2 = getReglas({ liquidaciones: { categorias: [
      { key: "leve", nombre: "Lesión leve", tarifa: 7000, activa: true },
      { key: "grave", nombre: "Lesión grave", tarifa: 20000, activa: true },
      { key: "profesional", nombre: "Enfermedad profesional", tarifa: 33000, activa: true },
    ] } });
    expect(r2.tarifas.leve).toBe(7000);
    expect(r2.tarifas.profesional).toBe(33000);
  });

  it("una tarifa modificada llega al cálculo real (sin tocar el motor)", () => {
    const casos = casosFirmados(2);
    // Mínimo 1 para observar importes con pocas firmas (lo demás: defaults).
    const reglasA = getReglas({ liquidaciones: { minimoFirmasNetas: 1 } });
    const liqA = calcularLiquidacion(casos, { ...PERIODO, ajustes: ajusteLeve(casos), reglas: reglasA });
    expect(liqA.operadores[0].importe).toBe(20000); // 2 × 10.000

    const reglasB = getReglas({
      liquidaciones: {
        minimoFirmasNetas: 1,
        categorias: [
          { key: "leve", nombre: "Lesión leve", tarifa: 12345, activa: true },
          { key: "grave", nombre: "Lesión grave", tarifa: 20000, activa: true },
          { key: "profesional", nombre: "Enfermedad profesional", tarifa: 20000, activa: true },
        ],
      },
    });
    const liqB = calcularLiquidacion(casos, { ...PERIODO, ajustes: ajusteLeve(casos), reglas: reglasB });
    expect(liqB.operadores[0].importe).toBe(24690); // 2 × 12.345
  });

  it("una categoría nueva creada desde la configuración se puede usar en cálculos", () => {
    const casos = casosFirmados(1);
    const reglas = getReglas({
      liquidaciones: {
        minimoFirmasNetas: 1,
        categorias: [
          { key: "leve", nombre: "Lesión leve", tarifa: 10000, activa: true },
          { key: "grave", nombre: "Lesión grave", tarifa: 20000, activa: true },
          { key: "profesional", nombre: "Enfermedad profesional", tarifa: 20000, activa: true },
          { key: "secuela", nombre: "Lesión con secuela", tarifa: 35000, activa: true },
        ],
      },
    });
    const liq = calcularLiquidacion(casos, {
      ...PERIODO,
      reglas,
      ajustes: { categoriaPorCaso: { "f-1": "secuela" }, conceptosExtra: {}, bajasManuales: [] },
    });
    expect(liq.operadores[0].conceptos[0].categoria).toBe("secuela");
    expect(liq.operadores[0].importe).toBe(35000);
    expect(liq.incompleto).toBe(false);
  });

  it("desactivar una categoría: no se ofrece para nuevas clases pero su tarifa sigue resolviéndose", () => {
    const reglas = getReglas({
      liquidaciones: {
        categorias: [
          { key: "leve", nombre: "Lesión leve", tarifa: 10000, activa: false },
          { key: "grave", nombre: "Lesión grave", tarifa: 20000, activa: true },
        ],
      },
    });
    expect(getCategoriasActivas(reglas).map((c) => c.key)).toEqual(["grave"]);
    // Histórico: la tarifa de la categoría desactivada sigue disponible…
    expect(tarifaPara(reglas, "leve")).toBe(10000);
    // …pero una categoría inexistente queda "pendiente de revisión" (null).
    expect(tarifaPara(reglas, "fantasma")).toBeNull();
  });

  it("validarCategoria rechaza importes negativos, >2 decimales, sin nombre y claves duplicadas", () => {
    const cfg = getLiquidacionConfig({});
    expect(validarCategoria(cfg, { key: "nueva", nombre: "Nueva", tarifa: -100 }).ok).toBe(false);
    expect(validarCategoria(cfg, { key: "nueva", nombre: "Nueva", tarifa: 10.999 }).ok).toBe(false);
    expect(validarCategoria(cfg, { key: "nueva", nombre: "   ", tarifa: 100 }).ok).toBe(false);
    expect(validarCategoria(cfg, { key: "leve", nombre: "Otra", tarifa: 100 }).ok).toBe(false); // clave duplicada
    expect(validarCategoria(cfg, { key: "otra", nombre: "Lesión leve", tarifa: 100 }).ok).toBe(false); // nombre duplicado
    expect(validarCategoria(cfg, { key: "nueva", nombre: "Nueva", tarifa: 15000 }).ok).toBe(true);
    // En edición, la propia fila no se compara consigo misma.
    expect(validarCategoria(cfg, { key: "leve", nombre: "Lesión leve", tarifa: 9999 }, "leve").ok).toBe(true);
    // Clave con formato inválido.
    expect(validarCategoria(cfg, { key: "Clave Rara!", nombre: "X", tarifa: 1 }).ok).toBe(false);
  });

  it("generarKeyCategoria produce claves slug únicas", () => {
    const lista = getLiquidacionConfig({}).categorias; // keys: leve, grave, profesional
    // "lesion-leve" no colisiona con "leve": se usa tal cual…
    expect(generarKeyCategoria("Lesión con secuela", lista)).toBe("lesion-con-secuela");
    expect(generarKeyCategoria("Lesión leve", lista)).toBe("lesion-leve");
    // …y ante colisión real agrega el sufijo incremental.
    expect(generarKeyCategoria("Lesión leve", [{ key: "lesion-leve" }])).toBe("lesion-leve-2");
    expect(generarKeyCategoria("Lesión leve", [{ key: "lesion-leve" }, { key: "lesion-leve-2" }])).toBe("lesion-leve-3");
  });

  it("la pre-sugerencia de categoría solo aplica con la categoría activa", () => {
    const caso = { tipoIngreso: "Enfermedad Profesional" };
    expect(sugerirCategoria(caso)).toBe("profesional"); // legacy sin reglas
    const conActiva = getReglas({});
    expect(sugerirCategoria(caso, conActiva)).toBe("profesional");
    const sinActiva = getReglas({
      liquidaciones: {
        categorias: [
          { key: "leve", nombre: "L", tarifa: 1, activa: true },
          { key: "grave", nombre: "G", tarifa: 2, activa: true },
          { key: "profesional", nombre: "P", tarifa: 3, activa: false },
        ],
      },
    });
    expect(sugerirCategoria(caso, sinActiva)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §12C — Mínimo (con reglas de la configuración)
// ---------------------------------------------------------------------------

describe("config · mínimo de habilitación", () => {
  it("13 netas no habilita; 14 y 15 sí, pagando todas las netas", () => {
    const reglas = getReglas({}); // mínimo 14
    const calc = (n) => {
      const casos = casosFirmados(n);
      return calcularLiquidacion(casos, { ...PERIODO, reglas, ajustes: ajusteLeve(casos) });
    };
    const liq13 = calc(13);
    expect(liq13.operadores[0].habilitado).toBe(false);
    expect(liq13.operadores[0].importe).toBe(0);

    const liq14 = calc(14);
    expect(liq14.operadores[0].habilitado).toBe(true);
    expect(liq14.operadores[0].importe).toBe(14 * 10000); // se pagan TODAS

    const liq15 = calc(15);
    expect(liq15.operadores[0].habilitado).toBe(true);
    expect(liq15.operadores[0].importe).toBe(15 * 10000);
  });

  it("el mínimo configurable desplaza la habilitación", () => {
    const reglas = getReglas({ liquidaciones: { minimoFirmasNetas: 10 } });
    const casos = casosFirmados(10);
    const liq = calcularLiquidacion(casos, { ...PERIODO, reglas, ajustes: ajusteLeve(casos) });
    expect(liq.operadores[0].habilitado).toBe(true);
    expect(liq.operadores[0].importe).toBe(100000);
  });
});

// ---------------------------------------------------------------------------
// §12D — Premios
// ---------------------------------------------------------------------------

describe("config · premios", () => {
  it("fondo inicial 100.000 con distribución fija 50/30/20 válida", () => {
    expect(PREMIOS_DEFECTO.fondo).toBe(100000);
    const v = validarDistribucion(PREMIOS_DEFECTO);
    expect(v.ok).toBe(true);
    expect(v.saldo).toBe(0);
    expect(calcularPremioPuesto(PREMIOS_DEFECTO, 1)).toBe(50000);
    expect(calcularPremioPuesto(PREMIOS_DEFECTO, 2)).toBe(30000);
    expect(calcularPremioPuesto(PREMIOS_DEFECTO, 3)).toBe(20000);
    expect(calcularPremioPuesto(PREMIOS_DEFECTO, 9)).toBeNull();
  });

  it("distribución fija que excede el fondo → error (nunca se guarda en silencio)", () => {
    const v = validarDistribucion({
      fondo: 100000,
      modalidad: "fija",
      puestos: [
        { lugar: 1, valor: 60000 },
        { lugar: 2, valor: 40000 },
        { lugar: 3, valor: 20000 },
      ],
    });
    expect(v.ok).toBe(false);
    expect(v.errores[0]).toContain("supera el fondo");
  });

  it("distribución fija con saldo exige el toggle explícito y muestra el saldo", () => {
    const p = {
      fondo: 100000,
      modalidad: "fija",
      permitirSaldoParcial: false,
      puestos: [
        { lugar: 1, valor: 50000 },
        { lugar: 2, valor: 30000 },
      ],
    };
    expect(validarDistribucion(p).ok).toBe(false); // suma 80.000 sin permiso
    const conPermiso = validarDistribucion({ ...p, permitirSaldoParcial: true });
    expect(conPermiso.ok).toBe(true);
    expect(conPermiso.saldo).toBe(20000); // §6G: saldo visible
  });

  it("distribución porcentual que suma 100 % es válida y calcula sobre el fondo", () => {
    const p = {
      fondo: 100000,
      modalidad: "porcentual",
      puestos: [
        { lugar: 1, valor: 50 },
        { lugar: 2, valor: 30 },
        { lugar: 3, valor: 20 },
      ],
    };
    expect(validarDistribucion(p).ok).toBe(true);
    expect(calcularPremioPuesto(p, 1)).toBe(50000);
    expect(calcularPremioPuesto(p, 3)).toBe(20000);
  });

  it("distribución porcentual inválida (90 % sin saldo parcial) → error; con saldo → advertencia", () => {
    const base = {
      fondo: 100000,
      modalidad: "porcentual",
      puestos: [
        { lugar: 1, valor: 60 },
        { lugar: 2, valor: 30 },
      ],
    };
    expect(validarDistribucion(base).ok).toBe(false); // 90 % sin permiso
    const excede = validarDistribucion({
      ...base,
      puestos: [
        { lugar: 1, valor: 60 },
        { lugar: 2, valor: 50 },
      ],
    });
    expect(excede.ok).toBe(false); // 110 % nunca pasa
    const conSaldo = validarDistribucion({ ...base, permitirSaldoParcial: true });
    expect(conSaldo.ok).toBe(true);
    expect(conSaldo.saldo).toBe(10000); // 10 % de 100.000
    expect(conSaldo.advertencias[0]).toContain("sin asignar");
  });

  it("cambiar el fondo actualiza los premios porcentuales", () => {
    const p = {
      fondo: 200000,
      modalidad: "porcentual",
      puestos: [
        { lugar: 1, valor: 50 },
        { lugar: 2, valor: 30 },
        { lugar: 3, valor: 20 },
      ],
    };
    expect(calcularPremioPuesto(p, 1)).toBe(100000);
    expect(validarDistribucion(p).ok).toBe(true);
  });

  it("puestos con lugar repetido o valores negativos → error", () => {
    expect(
      validarDistribucion({
        fondo: 100000,
        modalidad: "fija",
        puestos: [
          { lugar: 1, valor: 50000 },
          { lugar: 1, valor: 30000 },
        ],
      }).ok
    ).toBe(false);
    expect(
      validarDistribucion({
        fondo: 100000,
        modalidad: "fija",
        puestos: [
          { lugar: 1, valor: -1 },
          { lugar: 2, valor: 100000 },
        ],
      }).ok
    ).toBe(false);
    expect(validarDistribucion({ fondo: 100000, modalidad: "fija", puestos: [] }).ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §12F — Backup de la configuración e histórico de liquidaciones
// ---------------------------------------------------------------------------

describe("config · backup", () => {
  beforeEach(async () => {
    await appDB.liquidaciones.clear();
    await appDB.liquidacion_top.clear();
    await appDB.liquidacion_config_history.clear();
    localStorage.clear();
  });

  it("roundtrip: config.liquidaciones e histórico de liquidaciones sobreviven export/import", async () => {
    localStorageAdapter.set("config-art-tracker", {
      operador: "Yoel",
      liquidaciones: { minimoFirmasNetas: 18, premios: { ...PREMIOS_DEFECTO, fondo: 150000 } },
    });
    await guardarLiquidacion({
      periodoKey: "2026-10",
      estado: "cerrada",
      cerradaEn: "2026-10-31T12:00:00.000Z",
      totales: { firmas: 14, bajas: 0, netas: 14, habilitados: 1, noHabilitados: 0, importeTotal: 140000 },
      operadores: [],
      advertencias: [],
      incompleto: false,
      reglasSnapshot: {},
      ajustes: { categoriaPorCaso: {}, conceptosExtra: {}, bajasManuales: [] },
    });

    const backup = await exportBackup();

    // Limpieza total: simula otra instalación.
    await appDB.liquidaciones.clear();
    await appDB.liquidacion_top.clear();
    await appDB.liquidacion_config_history.clear();
    localStorage.clear();

    const result = await importBackup(backup);
    expect(result.counts.cases ?? 0).toBeGreaterThanOrEqual(0);

    // Configuración de liquidaciones restaurada…
    const config = localStorageAdapter.get("config-art-tracker");
    expect(config.liquidaciones.minimoFirmasNetas).toBe(18);
    expect(getLiquidacionConfig(config).premios.fondo).toBe(150000);
    expect(getReglas(config).minimoFirmasNetas).toBe(18);

    // …y el histórico de liquidaciones cerradas también.
    const historica = await getLiquidacion("2026-10");
    expect(historica.estado).toBe("cerrada");
    expect(historica.totales.importeTotal).toBe(140000);
  });

  it("backup ANTIGUO (sin la clave liquidaciones) importa sin errores y activa defaults", async () => {
    localStorageAdapter.set("config-art-tracker", { operador: "Yoel", formatoFecha: "DD/MM/YYYY" });
    const backup = await exportBackup();

    localStorage.clear();
    await importBackup(backup);

    const config = localStorageAdapter.get("config-art-tracker");
    expect(config.liquidaciones).toBeUndefined(); // el backup no la traía…
    const cfg = getLiquidacionConfig(config);
    expect(cfg.minimoFirmasNetas).toBe(14); // …y los defaults seguros aplican
    expect(cfg.categorias).toHaveLength(3);
    expect(cfg.premios.fondo).toBe(100000);
    expect(validarConfigLiquidaciones(config.liquidaciones).ok).toBe(true);
  });
});
