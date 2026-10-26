/**
 * liquidacionEngine.js
 * Motor de cálculo del módulo de Liquidaciones (v1.10.4).
 *
 * Funciones PURAS: no tocan React, Dexie ni localStorage, así que son
 * deterministas (mismos datos + mismas reglas = mismo resultado) y se prueban
 * sin renderizar la UI. Toda la fórmula vive acá; la vista solo consume
 * resultados y persiste ajustes.
 *
 * Reglas de negocio (1.10.4):
 * - firmasNetas = firmasTotales − bajas (bajas ≤ firmas: nunca negativo).
 * - El mínimo de netas es un requisito de HABILITACIÓN, NO una deducción:
 *   si netas >= mínimo se pagan TODAS las netas; si no, importe 0.
 * - Cada concepto liquidable (firma) conserva referencia al caso y su
 *   categoría; un caso puede generar DOS conceptos solo si se marca a mano.
 *
 * Modelo real disponible (revisión previa 1.10.4):
 * - La app es MONO-OPERADOR (perfil único en Mi Espacio): los casos NO tienen
 *   campo de operador. La agrupación de firmas usa `estudioJuridico` (unidad
 *   real del modelo, ya analizada en el Dashboard vía StudyBars) con fila
 *   "Sin estudio" para los casos sin asignar.
 * - La firma se representa con `fechaFirma` y/o estado en categoría success
 *   ("Firmo"); la fecha de la firma sigue la convención canónica de
 *   computeMetrics (último reporte; si no hay, fechaFirma).
 * - Existe estado "Baja" en el catálogo ESTADOS: una baja automática es un
 *   caso firmado en el período cuyo estado actual es "Baja" (firma anulada).
 *   Las bajas sin ese dato se registran a mano (ajuste) con validación
 *   anti-duplicado.
 * - La categoría económica (leve/grave/enfermedad profesional) NO existe como
 *   campo del caso: se clasifica a mano por concepto, con una pre-sugerencia
 *   visible y editable desde `tipoIngreso` cuando es inequívoca.
 */

import { CATEGORIAS_DEFAULT } from "../dashboard/metricsEngine";
import { reporteFechaIso } from "../dashboard/computeMetrics";
import { normalizeDate, isSameMonth } from "../../utils/dateFilters";
import { REGLAS_LIQUIDACION_DEFECTO, tarifaPara } from "./liquidacionReglas";

/** Estado del catálogo ESTADOS que identifica una baja (firma anulada). */
export const ESTADO_BAJA = "Baja";
/** Etiqueta del grupo de casos sin estudioJuridico (agrupador por defecto). */
export const SIN_ESTUDIO = "Sin estudio";

/** Ajustes vacíos (estructura persistida en el doc de liquidación). */
export function ajustesVacios() {
  return { categoriaPorCaso: {}, conceptosExtra: {}, bajasManuales: [] };
}

/**
 * ¿El caso cuenta como firma? Convención canónica de la app
 * (computeMetrics): estado en la categoría success, o tener fechaFirma.
 */
export function esFirmaCaso(caso, cats = CATEGORIAS_DEFAULT) {
  const success = cats?.success || ["Firmo"];
  return success.includes(caso?.estado) || !!caso?.fechaFirma;
}

/**
 * Fecha (ISO) de la firma de un caso: último reporte (convención canónica de
 * computeMetrics: el día en que se cargó el reporte de la firma); si no hay
 * reportes, fechaFirma; si no, null.
 */
export function fechaFirmaDe(caso, today = new Date()) {
  const reports = caso?.reporteHistory || [];
  if (reports.length > 0) {
    const iso = reporteFechaIso(reports[reports.length - 1].fecha, today);
    if (iso) return iso;
  }
  return normalizeDate(caso?.fechaFirma) || null;
}

/**
 * Selecciona las firmas del período: casos firmados cuya fecha de firma cae
 * en el mes/año elegido, y opcionalmente ANTES o IGUAL a la fecha de cierre
 * (límite temporal: nada posterior al cierre entra al cálculo).
 */
export function seleccionarFirmas(casos, { year, month, fechaCierre = null, cats = CATEGORIAS_DEFAULT, today = new Date() } = {}) {
  const lista = Array.isArray(casos) ? casos : [];
  const cierre = fechaCierre ? normalizeDate(fechaCierre) : null;
  const out = [];
  for (const caso of lista) {
    if (!esFirmaCaso(caso, cats)) continue;
    const iso = fechaFirmaDe(caso, today);
    if (!iso) continue;
    if (!isSameMonth(iso, month, year)) continue;
    if (cierre && iso > cierre) continue;
    out.push({ caso, fechaFirma: iso });
  }
  return out;
}

/**
 * Pre-sugerencia de categoría desde el modelo real. SOLO se infiere cuando
 * `tipoIngreso` es inequívoco ("Enfermedad Profesional"); leve/grave no es
 * deducible de forma fiable de los campos del caso, así que queda null y el
 * usuario clasifica a mano (el cierre se bloquea con conceptos sin clasificar).
 */
export function sugerirCategoria(caso) {
  const tipo = (caso?.tipoIngreso || "").toLowerCase();
  if (tipo.includes("enfermedad profesional")) return "profesional";
  return null;
}

function buildConcepto(caso, { extra = false, categoria = null, reglas }) {
  const tarifa = tarifaPara(reglas, categoria);
  return {
    // Identidad estable del concepto dentro del período: base = id del caso;
    // segundo concepto (tránsito, marca manual) = id::transito.
    id: extra ? `${caso.id}::transito` : String(caso.id),
    casoId: caso.id,
    casoNombre: caso.nombre || "(sin nombre)",
    tipoConcepto: extra ? "transito" : "firma",
    categoria,
    tarifaUnitaria: tarifa,
    cantidad: 1,
    subtotal: tarifa == null ? null : tarifa * 1,
  };
}

/**
 * Calcula la liquidación de un período a partir de los casos + ajustes
 * manuales. Devuelve el documento serializable (se persiste tal cual, con
 * sus timestamps, al preparar/cerrar).
 *
 * opciones:
 * - year/month: mes del período (por fecha de firma).
 * - fechaCierre: límite temporal (inclusive).
 * - ajustes: { categoriaPorCaso, conceptosExtra, bajasManuales }.
 * - reglas: tarifas/umbral vigentes (snapshot al guardar).
 * - cats: categorías de estados (default: CATEGORIAS_DEFAULT).
 */
export function calcularLiquidacion(casos, opciones = {}) {
  const {
    year,
    month,
    fechaCierre = null,
    ajustes = ajustesVacios(),
    reglas = REGLAS_LIQUIDACION_DEFECTO,
    cats = CATEGORIAS_DEFAULT,
    today = new Date(),
  } = opciones;

  const catPorCaso = ajustes.categoriaPorCaso || {};
  const extras = ajustes.conceptosExtra || {};
  const bajasManualesIn = ajustes.bajasManuales || [];

  const seleccion = seleccionarFirmas(casos, { year, month, fechaCierre, cats, today });
  const seleccionIds = new Set(seleccion.map((x) => x.caso.id));

  // ---- Bajas automáticas: casos del período cuyo estado actual es "Baja".
  const idsBajaAuto = new Set(
    seleccion.filter((x) => x.caso.estado === ESTADO_BAJA).map((x) => x.caso.id)
  );

  // ---- Bajas manuales: validación anti-duplicado (Prueba 14).
  const advertencias = [];
  const bajasManuales = [];
  const vistosManual = new Set();
  for (const b of bajasManualesIn) {
    if (!b?.casoId || vistosManual.has(b.casoId)) {
      advertencias.push(`Baja manual duplicada ignorada (${b?.casoId || "sin caso"}).`);
      continue;
    }
    vistosManual.add(b.casoId);
    if (idsBajaAuto.has(b.casoId)) {
      advertencias.push(`Baja manual duplicada con la baja automática del caso ${b.casoId}: no se descuenta dos veces.`);
      continue;
    }
    if (!seleccionIds.has(b.casoId)) {
      advertencias.push(`Baja manual del caso ${b.casoId} fuera del período seleccionado: no descuenta.`);
      continue;
    }
    bajasManuales.push(b);
  }
  const idsBajaManual = new Set(bajasManuales.map((b) => b.casoId));

  // ---- Agrupación por estudio jurídico (agrupador real del modelo).
  const porEstudio = new Map();
  for (const { caso } of seleccion) {
    const estudio = (caso.estudioJuridico || "").trim() || SIN_ESTUDIO;
    if (!porEstudio.has(estudio)) porEstudio.set(estudio, []);
    porEstudio.get(estudio).push(caso);
  }

  let sinCategoria = 0;
  const operadores = [];
  for (const [estudio, cs] of porEstudio.entries()) {
    const conceptos = [];
    const bajasDetalle = [];
    let firmas = 0; // total de CONCEPTOS (un caso = 1; con 2do concepto = 2)
    let bajas = 0; // conceptos de casos bajados (se descuentan de los netos)

    for (const caso of cs) {
      const esBaja = idsBajaAuto.has(caso.id) || idsBajaManual.has(caso.id);
      const motivo = idsBajaAuto.has(caso.id) ? "automatica" : "manual";
      const categoria = catPorCaso[caso.id] ?? sugerirCategoria(caso);

      firmas += 1;
      if (esBaja) {
        bajas += 1;
        bajasDetalle.push({ casoId: caso.id, casoNombre: caso.nombre || "(sin nombre)", origen: motivo });
      } else {
        if (!categoria) sinCategoria += 1;
        conceptos.push(buildConcepto(caso, { categoria, reglas }));
      }

      // Segundo concepto (marca manual "tránsito" por caso): se contabiliza
      // por separado SOLO si el usuario lo habilitó (nunca automático).
      const extra = extras[caso.id];
      if (extra?.habilitado) {
        firmas += 1;
        if (esBaja) {
          bajas += 1;
          bajasDetalle.push({ casoId: caso.id, casoNombre: caso.nombre || "(sin nombre)", origen: motivo, extra: true });
        } else {
          const catExtra = extra.categoria || null;
          if (!catExtra) sinCategoria += 1;
          conceptos.push(buildConcepto(caso, { extra: true, categoria: catExtra, reglas }));
        }
      }
    }

    const netas = firmas - bajas;
    const habilitado = netas >= reglas.minimoFirmasNetas;
    const importe = habilitado
      ? conceptos.reduce((s, c) => s + (c.subtotal || 0), 0)
      : 0;
    const sinCatOperador = conceptos.filter((c) => !c.categoria).length;

    operadores.push({
      estudio,
      firmas,
      bajas,
      netas,
      habilitado,
      firmasLiquidables: habilitado ? netas : 0,
      importe,
      sinCategoria: sinCatOperador,
      conceptos,
      bajasDetalle,
    });
  }
  operadores.sort(
    (a, b) => b.importe - a.importe || a.estudio.localeCompare(b.estudio)
  );

  const totales = {
    firmas: operadores.reduce((s, o) => s + o.firmas, 0),
    bajas: operadores.reduce((s, o) => s + o.bajas, 0),
    netas: operadores.reduce((s, o) => s + o.netas, 0),
    habilitados: operadores.filter((o) => o.habilitado).length,
    noHabilitados: operadores.filter((o) => !o.habilitado).length,
    // Con conceptos sin clasificar el importe NO es fiable: se informa como
    // incompleto en vez de mostrar un cero o un total a medias (§5D).
    importeTotal: sinCategoria > 0 ? null : operadores.reduce((s, o) => s + o.importe, 0),
  };

  const incompleto = sinCategoria > 0;

  return {
    year,
    month,
    fechaCierre,
    reglasSnapshot: JSON.parse(JSON.stringify(reglas)),
    ajustes: {
      categoriaPorCaso: { ...catPorCaso },
      conceptosExtra: { ...extras },
      bajasManuales: bajasManuales.map((b) => ({ ...b })),
    },
    totales,
    operadores,
    advertencias,
    incompleto,
  };
}

/**
 * Validación previa al CIERRE (§5D): devuelve errores (bloquean) y
 * advertencias (informativas). Nunca cierra con errores críticos.
 */
export function validarCierre(liq) {
  const errores = [];
  const advertencias = [...(liq?.advertencias || [])];

  if (!liq?.fechaCierre) errores.push("Falta la fecha de cierre del período.");
  if (!liq?.totales) {
    errores.push("No hay datos calculados para el período.");
    return { ok: false, errores, advertencias };
  }
  if (liq.totales.firmas === 0) {
    advertencias.push("El período no tiene firmas: la liquidación quedará en cero.");
  }
  if (liq.incompleto) {
    errores.push("Hay conceptos sin clasificar: completá la categoría antes de cerrar.");
  }
  // Duplicados críticos: una baja manual que ya descontó el automático.
  const auto = new Set((liq.operadores || []).flatMap((o) => (o.bajasDetalle || []).filter((b) => b.origen === "automatica").map((b) => b.casoId)));
  for (const b of liq?.ajustes?.bajasManuales || []) {
    if (auto.has(b.casoId)) errores.push(`Baja duplicada del caso ${b.casoId}: el doble descuento bloquea el cierre.`);
  }
  // Conceptos duplicados: identidades repetidas dentro de un operador.
  for (const o of liq?.operadores || []) {
    const ids = (o.conceptos || []).map((c) => c.id);
    if (new Set(ids).size !== ids.length) {
      errores.push(`Conceptos duplicados en ${o.estudio}: revisar antes de cerrar.`);
    }
  }
  // Tarifas aplicables disponibles para las categorías usadas.
  for (const o of liq?.operadores || []) {
    for (const c of o.conceptos || []) {
      if (c.categoria && c.tarifaUnitaria == null) {
        errores.push(`Sin tarifa para la categoría "${c.categoria}" (${o.estudio}).`);
      }
    }
  }

  return { ok: errores.length === 0, errores, advertencias };
}
