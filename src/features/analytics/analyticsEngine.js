/**
 * analyticsEngine.js
 * Motor de cálculo analítico de la capa de Insights (Release 1.3.2).
 * Funciones puras y determinísticas sobre los casos reales. Sin IA: cada
 * conclusión puede rastrearse hasta los números que la producen.
 *
 * Convenciones heredadas del Dashboard (para no duplicar definiciones):
 *  - Conversión = firmas / casos del mismo conjunto (metricsEngine).
 *  - Fecha de firma = fecha del último reporte cargado; si no hay reportes,
 *    fechaFirma (computeMetrics.buildSeries).
 */

import {
  INSIGHTS_CONFIG,
  DIAS_SEMANA,
} from "./insightsConfig";
import {
  getPeriodRange,
  rangoAnteriorEquivalente,
  diasHabilesEnRango,
  enRango,
  casosEnRango,
} from "./periodUtils";
import { CATEGORIAS_DEFAULT, groupBy } from "../dashboard/metricsEngine";
import { reporteFechaIso, isoWeekKey } from "../dashboard/computeMetrics";
import { normalizeDate } from "../../utils/dateFilters";
import {
  getWeeklyGoalProgress,
  getRequiredDailyPace,
} from "../operator/operatorMetrics";

const DAY_MS = 1000 * 60 * 60 * 24;

/** Categorías de pipeline con fallback seguro. */
function catsDe(config) {
  return { ...CATEGORIAS_DEFAULT, ...(config?.metrics?.categorias || {}) };
}

/** Fecha ISO (YYYY-MM-DD) asociada a la firma de un caso. */
export function fechaFirmaDe(caso, today = new Date()) {
  const reports = caso.reporteHistory || [];
  if (reports.length > 0) {
    const iso = reporteFechaIso(reports[reports.length - 1].fecha, today);
    if (iso) return iso;
  }
  return normalizeDate(caso.fechaFirma) || null;
}

function esFirma(caso, cats) {
  return cats.success.includes(caso.estado) || !!caso.fechaFirma;
}

/**
 * Resumen del período con comparación contra el período anterior equivalente.
 * La conversión usa el criterio del Dashboard sobre la cohorte creada en el
 * rango; el ritmo diario cuenta las firmas por su fecha real.
 */
export function computeResumenPeriodo(casos, rango, workingDays = [1, 2, 3, 4, 5], config = {}) {
  const cats = catsDe(config);
  const hoyISO = new Date().toISOString().slice(0, 10);

  const medir = (rg) => {
    const cohorte = casosEnRango(casos, rg);
    const firmasCohorte = cohorte.filter((c) => esFirma(c, cats));
    const firmasPorFecha = new Map();
    for (const c of casos) {
      if (!esFirma(c, cats)) continue;
      const fk = fechaFirmaDe(c);
      if (!fk || !enRango(fk, rg)) continue;
      firmasPorFecha.set(fk, (firmasPorFecha.get(fk) || 0) + 1);
    }
    // Los días hábiles no pueden exceder los transcurridos hasta hoy.
    const habilesTotales = diasHabilesEnRango(rg, workingDays);
    let habilesTranscurridos = habilesTotales;
    if (rg.endISO > hoyISO) {
      habilesTranscurridos = diasHabilesEnRango({ ...rg, endISO: hoyISO }, workingDays);
    }
    const totalFirmasFecha = [...firmasPorFecha.values()].reduce((a, b) => a + b, 0);
    return {
      casos: cohorte.length,
      firmas: firmasCohorte.length,
      conversion: cohorte.length > 0 ? Math.round((firmasCohorte.length / cohorte.length) * 100) : 0,
      firmasPorFecha,
      totalFirmasFecha,
      habiles: Math.max(1, habilesTranscurridos),
      promedioDiario: Math.round((totalFirmasFecha / Math.max(1, habilesTranscurridos)) * 10) / 10,
    };
  };

  const actual = medir(rango);
  const prevRango = rangoAnteriorEquivalente(rango);
  const previo = medir(prevRango);

  const variacionDe = (act, ant) => {
    if (ant <= 0) return null;
    return Math.round(((act - ant) / ant) * 100);
  };

  const diaSemana = computeDiaSemana(actual.firmasPorFecha, rango, workingDays);

  return {
    rango,
    rangoAnterior: prevRango,
    periodo: rango.label,
    casos: actual.casos,
    firmas: actual.firmas,
    conversion: actual.conversion,
    activos: casosEnRango(casos, rango).filter((c) =>
      [...cats.contact, ...cats.pending].includes(c.estado)
    ).length,
    promedioDiario: actual.promedioDiario,
    habiles: actual.habiles,
    previo: {
      casos: previo.casos,
      firmas: previo.firmas,
      conversion: previo.conversion,
      promedioDiario: previo.promedioDiario,
      label: prevRango.label,
    },
    variacion: {
      firmasPct: variacionDe(actual.firmas, previo.firmas),
      casosPct: variacionDe(actual.casos, previo.casos),
      conversionPuntos:
        actual.casos > 0 && previo.casos > 0 ? actual.conversion - previo.conversion : null,
    },
    diaSemana,
    suficientesDatos: actual.firmas >= INSIGHTS_CONFIG.muestra.comparacion ||
      actual.casos >= INSIGHTS_CONFIG.muestra.comparacion,
  };
}

/**
 * Productividad por día de la semana dentro del rango (solo días laborales).
 * Un día excepcional aislado nunca se declara patrón: exige muestra mínima.
 */
export function computeDiaSemana(firmasPorFecha, rango, workingDays = [1, 2, 3, 4, 5]) {
  const wd = new Set(workingDays.length > 0 ? workingDays : [1, 2, 3, 4, 5]);
  const stats = {};
  for (let d = 0; d < 7; d++) {
    if (!wd.has(d)) continue;
    stats[d] = { dia: d, label: DIAS_SEMANA[d], total: 0, ocurrencias: 0 };
  }
  // Contar cuántas veces aparece cada día laboral en el rango.
  const cursor = new Date(rango.startISO + 'T00:00:00');
  const fin = new Date(rango.endISO + 'T00:00:00');
  while (cursor <= fin) {
    const d = cursor.getDay();
    if (stats[d]) stats[d].ocurrencias += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  // Sumar firmas reales por día (acepta Map u objeto plano).
  const entradasFirmas =
    firmasPorFecha instanceof Map
      ? [...firmasPorFecha.entries()]
      : Object.entries(firmasPorFecha || {});
  let totalFirmas = 0;
  for (const [iso, n] of entradasFirmas) {
    const d = new Date(iso + 'T00:00:00').getDay();
    if (!stats[d]) continue;
    stats[d].total += n;
    totalFirmas += n;
  }
  const porDia = Object.values(stats)
    .map((s) => ({
      ...s,
      promedio: s.ocurrencias > 0 ? Math.round((s.total / s.ocurrencias) * 10) / 10 : 0,
    }))
    .sort((a, b) => b.promedio - a.promedio);

  let mejorDia = null;
  const candidatos = porDia.filter(
    (s) =>
      s.total >= INSIGHTS_CONFIG.muestra.firmasPorDiaPatron &&
      s.promedio > 0 &&
      s.ocurrencias >= 2
  );
  const ordenado = [...candidatos].sort((a, b) => b.promedio - a.promedio);
  if (
    totalFirmas >= INSIGHTS_CONFIG.muestra.mejorDia &&
    ordenado.length > 0 &&
    ordenado[0].promedio > (ordenado[1]?.promedio || 0)
  ) {
    mejorDia = ordenado[0];
  }
  return { porDia, mejorDia, totalFirmas };
}

/**
 * Tendencia semanal de firmas (semanas completas, lunes a domingo).
 * Exige al menos INSIGHTS_CONFIG.muestra.tendenciaSemanas semanas; compara el
 * promedio de la primera mitad contra el de la segunda mitad (explicable).
 */
export function computeTendenciaSemanal(casos, config = {}, today = new Date(), semanas = INSIGHTS_CONFIG.semanasTendencia) {
  const cats = catsDe(config);
  const hoy = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dow = hoy.getDay();
  const offsetLunes = dow === 0 ? -6 : 1 - dow;

  // Semanas completas: la semana en curso se excluye del análisis.
  const inicio = new Date(hoy);
  inicio.setDate(inicio.getDate() + offsetLunes - 7 * semanas);
  const finUltimaCompleta = new Date(inicio);
  finUltimaCompleta.setDate(finUltimaCompleta.getDate() + 7 * semanas - 1);
  const inicioISO = `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, '0')}-${String(inicio.getDate()).padStart(2, '0')}`;
  const finISO = `${finUltimaCompleta.getFullYear()}-${String(finUltimaCompleta.getMonth() + 1).padStart(2, '0')}-${String(finUltimaCompleta.getDate()).padStart(2, '0')}`;

  const buckets = new Map();
  for (let i = 0; i < semanas; i++) {
    const d = new Date(inicio);
    d.setDate(d.getDate() + 7 * i);
    buckets.set(isoWeekKey(d), { label: `S${i + 1}`, firmas: 0, inicioISO: isoLocal(d) });
  }

  for (const c of casos) {
    if (!esFirma(c, cats)) continue;
    const fk = fechaFirmaDe(c);
    if (!fk || fk < inicioISO || fk > finISO) continue;
    const key = isoWeekKey(new Date(fk + 'T00:00:00'));
    const b = buckets.get(key);
    if (b) b.firmas += 1;
  }

  const puntos = [...buckets.values()].map((b, i) => ({ ...b, n: i + 1 }));
  const totalFirmasTendencia = puntos.reduce((a, p) => a + p.firmas, 0);
  const muestraSuficiente =
    puntos.length >= INSIGHTS_CONFIG.muestra.tendenciaSemanas &&
    totalFirmasTendencia >= INSIGHTS_CONFIG.muestra.mejorDia;

  let tendencia = null;
  if (muestraSuficiente) {
    const mitad = Math.floor(puntos.length / 2);
    const prom = (arr) => arr.reduce((a, b) => a + b.firmas, 0) / arr.length;
    const p1 = prom(puntos.slice(0, mitad));
    const p2 = prom(puntos.slice(mitad));
    let direccion = 'estable';
    let pct = null;
    if (p1 === 0 && p2 > 0) {
      direccion = 'ascendente';
    } else if (p1 > 0) {
      pct = Math.round(((p2 - p1) / p1) * 100);
      if (pct > INSIGHTS_CONFIG.umbral.normal) direccion = 'ascendente';
      else if (pct < -INSIGHTS_CONFIG.umbral.normal) direccion = 'descendente';
    }
    tendencia = {
      direccion,
      pct,
      primeraMitad: Math.round(p1 * 10) / 10,
      segundaMitad: Math.round(p2 * 10) / 10,
      semanasAnalizadas: puntos.length,
    };
  }

  return { puntos, tendencia, muestraSuficiente };
}

/**
 * Franjas horarias de actividad real, construidas SOLO con timestamps
 * confiables (creación de casos e interacciones/comentarios del período).
 * Si la muestra es insuficiente devuelve null (no se concluye nada).
 */
export function computeFranjasHorarias(casos, rango, today = new Date()) {
  const timestamps = [];
  for (const c of casos) {
    const creado = c.createdAt ? new Date(c.createdAt) : null;
    if (creado && !isNaN(creado.getTime()) && enRango(creado.toISOString().slice(0, 10), rango)) {
      timestamps.push(creado.getHours());
    }
    for (const com of c.comentarios || []) {
      const f = com?.fecha ? new Date(com.fecha) : null;
      if (f && !isNaN(f.getTime()) && enRango(f.toISOString().slice(0, 10), rango)) {
        timestamps.push(f.getHours());
      }
    }
  }
  if (timestamps.length < INSIGHTS_CONFIG.muestra.eventosHorario) return null;

  const inicios = INSIGHTS_CONFIG.franjasHorarias;
  const tamano = INSIGHTS_CONFIG.tamanoFranja;
  const franjas = inicios.map((h) => ({
    inicio: h,
    fin: h + tamano,
    label: `${String(h).padStart(2, '0')}:00 - ${String(h + tamano).padStart(2, '0')}:00`,
    total: 0,
  }));
  for (const h of timestamps) {
    const idx = inicios.lastIndexOf(Math.max(...inicios.filter((i2) => i2 <= h)));
    if (idx >= 0) franjas[idx].total += 1;
  }
  const conDatos = [...franjas].sort((a, b) => b.total - a.total);
  return {
    franjas,
    top: conDatos[0],
    baja: conDatos[conDatos.length - 1],
    totalEventos: timestamps.length,
    confiable: true,
  };
}

/**
 * Rendimiento por grupo (aseguradora o estudio jurídico) del período y su
 * evolución frente al período anterior equivalente. Cada fila indica si tiene
 * muestra suficiente para conclusions destacables.
 */
export function rendimientoPorGrupo(casos, rango, campo, config = {}) {
  const cats = catsDe(config);
  const prev = rangoAnteriorEquivalente(rango);
  // Reutiliza la agrupación estándar del Dashboard (metricsEngine.groupBy).
  const actuales = groupBy({ filtered: casosEnRango(casos, rango), cats }, campo, cats);
  const previos = groupBy({ filtered: casosEnRango(casos, prev), cats }, campo, cats);
  const mapPrev = new Map(previos.map((g) => [g.key, g]));

  return actuales.map((g) => {
    const p = mapPrev.get(g.key);
    const conversionPrev = p ? p.conversion : null;
    return {
      key: g.key,
      total: g.total,
      firmas: g.success,
      conversion: g.conversion,
      conversionPrev,
      evolucionPuntos:
        conversionPrev !== null ? g.conversion - conversionPrev : null,
      suficienteMuestra: g.total >= INSIGHTS_CONFIG.muestra.grupo,
    };
  });
}

/**
 * Promedio diario de firmas en los últimos N días (ventana deslizante que
 * termina ayer). Se usa como "ritmo habitual" independiente del selector.
 */
export function promedioPersonalReciente(casos, config = {}, today = new Date(), dias = INSIGHTS_CONFIG.promedioPersonalDias) {
  const cats = catsDe(config);
  const fin = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  fin.setDate(fin.getDate() - 1);
  const inicio = new Date(fin);
  inicio.setDate(inicio.getDate() - (dias - 1));
  const inicioISO = isoLocal(inicio);
  const finISO = isoLocal(fin);

  let firmas = 0;
  const diasConActividad = new Set();
  for (const c of casos) {
    if (!esFirma(c, cats)) continue;
    const fk = fechaFirmaDe(c);
    if (!fk || fk < inicioISO || fk > finISO) continue;
    firmas += 1;
    diasConActividad.add(fk);
  }
  const habiles = contarHabiles(inicio, fin, new Set([1, 2, 3, 4, 5]));
  return {
    firmas,
    dias,
    promedioDiario: habiles > 0 ? Math.round((firmas / habiles) * 10) / 10 : 0,
  };
}

function isoLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function contarHabiles(inicio, fin, wd) {
  let count = 0;
  const cursor = new Date(inicio);
  while (cursor <= fin) {
    if (wd.has(cursor.getDay())) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

/** Casos activos sin seguimiento reciente (actividad = updatedAt/lastActivityAt). */
export function casosSinSeguimiento(casos, config = {}, today = new Date()) {
  const cats = catsDe(config);
  const limite = INSIGHTS_CONFIG.diasSinSeguimiento;
  const limiteTs = today.getTime() - limite * DAY_MS;
  return casos.filter((c) => {
    if (![...cats.contact, ...cats.pending].includes(c.estado)) return false;
    const ts = c.lastActivityAt || c.updatedAt;
    if (!ts) return false;
    const t = new Date(ts).getTime();
    return !isNaN(t) && t < limiteTs;
  });
}

/**
 * Proyección de objetivos semanales y ritmo mensual requerido.
 * Reutiliza getWeeklyGoalProgress y getRequiredDailyPace (Mi Espacio).
 * Toda proyección se marca como estimación ("manteniendo el ritmo actual").
 */
export function proyeccionObjetivos({
  goals = {},
  casos = [],
  profile = {},
  availability = {},
  year,
  month,
  todayISO,
  workingDays,
}) {
  const wd = workingDays?.length ? workingDays : profile.workingDays || [1, 2, 3, 4, 5];
  const resultado = { semanales: [], ritmoMensual: null, proyecciones: [] };

  // Ritmo mensual requerido (función existente de Mi Espacio).
  try {
    resultado.ritmoMensual = getRequiredDailyPace(
      goals, casos, year, month, availability, wd, todayISO
    );
  } catch {
    resultado.ritmoMensual = null;
  }

  // Progreso semanal (función existente de Mi Espacio).
  let weekly;
  try {
    weekly = getWeeklyGoalProgress(goals, casos, wd, todayISO);
  } catch {
    return resultado;
  }
  resultado.semanales = weekly.goals.filter((g) => g.enabled);

  // Días hábiles restantes de la semana laboral (hasta el fin de semana definido).
  const hoy = normalizeDate(todayISO) || isoLocal(new Date());
  const cursor = new Date(hoy + 'T00:00:00');
  const finSemana = new Date(weekly.end + 'T00:00:00');
  const wdSet = new Set(wd);
  let restantes = 0;
  while (cursor <= finSemana) {
    if (wdSet.has(cursor.getDay())) restantes += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  resultado.diasHabilesRestantesSemana = restantes;

  // Ritmos recientes (últimos 14 días corridos sobre días hábiles).
  const hoyDate = new Date(hoy + 'T00:00:00');
  const inicio14 = new Date(hoyDate);
  inicio14.setDate(inicio14.getDate() - 13);
  const habiles14 = contarHabiles(inicio14, hoyDate, wdSet);

  const cats = catsDe({});
  let firmasRecientes = 0;
  let casosRecientes = 0;
  for (const c of casos) {
    const f = normalizeDate(c.fecha);
    if (f && f >= isoLocal(inicio14) && f <= hoy) casosRecientes += 1;
    if (esFirma(c, cats)) {
      const fk = fechaFirmaDe(c);
      if (fk && fk >= isoLocal(inicio14) && fk <= hoy) firmasRecientes += 1;
    }
  }
  const ritmoFirmas = habiles14 > 0 ? Math.round((firmasRecientes / habiles14) * 10) / 10 : 0;
  const ritmoCasos = habiles14 > 0 ? Math.round((casosRecientes / habiles14) * 10) / 10 : 0;

  // Proyección estimada por objetivo semanal activo no cumplido aún.
  for (const g of resultado.semanales) {
    if (!g.target || g.target <= 0) continue;
    const ritmo = g.key === 'cases' ? ritmoCasos : g.key === 'signed' ? ritmoFirmas : null;
    if (ritmo === null) continue;
    const proyeccionEstimada = g.current + Math.round(ritmo * restantes);
    resultado.proyecciones.push({
      key: g.key,
      label: g.label,
      current: g.current,
      target: g.target,
      percent: g.percent,
      met: g.met,
      status: g.status,
      restantesDias: restantes,
      ritmoDiario: ritmo,
      proyeccionEstimada,
      cumpliria: proyeccionEstimada >= g.target,
    });
  }

  return resultado;
}
