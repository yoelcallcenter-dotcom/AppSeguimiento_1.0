import { computeMetrics } from "../dashboard/computeMetrics";
import {
  getPeriodRange,
  rangoAnteriorEquivalente,
  diasHabilesEnRango,
} from "../analytics/periodUtils";
import { computeResumenPeriodo } from "../analytics/analyticsEngine";
import { PERIODOS } from "../analytics/periodUtils";
import { escapeCSV, sanitizeCSV } from "../../utils/backup/csvUtils";

const sv = (v) => escapeCSV(String(v ?? ""));
const fila = (celdas) => celdas.map(sv).join(",") + "\n";
const pct = (num, den, decimales = 1) =>
  den ? ((num / den) * 100).toFixed(decimales) + "%" : "—";
const variacionPct = (actual, anterior) => {
  if (anterior == null) return "—";
  if (anterior === 0) return actual > 0 ? "+100%" : "0%";
  const v = ((actual - anterior) / anterior) * 100;
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
};
const SECCION = (titulo) => `### ${sanitizeCSV(titulo)}\n`;

function configBase(config = {}) {
  return {
    ...config,
    defaults: {
      horasJornada: 8,
      diasTrabajo: [1, 2, 3, 4, 5],
      ...(config.defaults || {}),
    },
  };
}

const isoDe = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return null;
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

function buildCsvAnalitico(casos = [], config = {}, opts = {}) {
  const cfg = configBase(config);
  const hoy = opts?.fecha ? new Date(opts.fecha) : new Date();
  const workingDays = cfg?.jornada?.workingDays || cfg.defaults.diasTrabajo;
  const availability = opts?.availability || {};
  const rangoRaw = opts?.rango;
  const rango = rangoRaw?.startISO && rangoRaw?.endISO
    ? { id: rangoRaw.id || "personalizado", label: rangoRaw.label || "Período seleccionado", startISO: rangoRaw.startISO, endISO: rangoRaw.endISO }
    : {
        id: "anio",
        label: "Año actual",
        startISO: isoDe(new Date(hoy.getFullYear(), 0, 1)),
        endISO: isoDe(hoy),
      };

  const metrics = computeMetrics(casos, {}, cfg, { workingDays, availability });
  const resumenMes = computeResumenPeriodo(casos, rango, workingDays, cfg, availability);
  const rangoPrev = rangoAnteriorEquivalente(rango);
  const resumenPrev = rangoPrev
    ? computeResumenPeriodo(casos, rangoPrev, workingDays, cfg, availability)
    : null;
  const diasHabiles = diasHabilesEnRango(rango, workingDays, availability);
  const activos = metrics.activos ?? metrics.total ?? 0;
  const cerrados = metrics.cerrados ?? 0;
  const firmas = metrics.firmas ?? 0;
  const perdidos = metrics.perdidos ?? 0;
  const pendientes = metrics.pendientes ?? 0;
  const sinReporte = metrics.sinReporte ?? 0;
  const unassigned = metrics.unassigned ?? 0;
  const total = metrics.total ?? 0;
  const tasaConversion = metrics.tasaConversion ?? 0;
  const tasaCierre = metrics.tasaCierre ?? 0;
  const avgResolutionDays = metrics.avgResolutionDays ?? 0;
  const tender = metrics.seriesByDay ?? [];
  const byEstado = metrics.byStatus ?? [];
  const byEstudio = metrics.byStudy ?? [];
  const byAseguradora = metrics.byAseguradora ?? [];
  const byLocalidad = metrics.byLocalidad ?? [];

  let out = "";
  out += SECCION("KPIs");
  out += fila(["Métrico", "Valor"]);
  out += fila(["Casos totales", total]);
  out += fila(["Casos activos", activos]);
  out += fila(["Casos cerrados", cerrados]);
  out += fila(["Firmas", firmas]);
  out += fila(["Casos perdidos", perdidos]);
  out += fila(["Casos pendientes", pendientes]);
  out += fila(["Casos sin reporte", sinReporte]);
  out += fila(["Casos sin asignar", unassigned]);
  out += fila(["Tasa de conversión", pct(firmas, total)]);
  out += fila(["Tasa de cierre", pct(cerrados, total)]);
  out += fila(["Días hábiles efectivos en período", diasHabiles]);
  out += "\n";

  out += SECCION("Productividad");
  out += fila(["Métrico", "Valor"]);
  const resuelto = (cerrados || 0) + (perdidos || 0);
  out += fila(["Tasa de resolución", pct(resuelto, total)]);
  out += fila(["Promedio días resolución", avgResolutionDays]);
  out += "\n";

  out += SECCION("Conversión");
  out += fila(["Métrico", "Actual", "Período anterior"]);
  const firmasPrev = resumenPrev?.firmas ?? 0;
  out += fila(["Firmas", firmas, firmasPrev]);
  out += fila(["Tasa conversión", pct(firmas, total), firmasPrev ? pct(firmasPrev, resumenPrev?.casos || 0) : "—"]);
  out += "\n";

  out += SECCION("Estados");
  out += fila(["Estado", "Cantidad", "Porcentaje"]);
  byEstado
    .sort((a, b) => b.value - a.value)
    .forEach(({ name, value }) => {
      out += fila([String(name), Number(value) || 0, pct(Number(value), total)]);
    });
  out += "\n";

  out += SECCION("Estudios");
  out += fila(["Estudio", "Cantidad"]);
  byEstudio
    .sort((a, b) => b.total - a.total)
    .forEach(({ key, total: cantidad }) => out += fila([String(key), cantidad]));
  out += "\n";

  out += SECCION("Aseguradoras");
  out += fila(["Aseguradora", "Cantidad"]);
  byAseguradora
    .sort((a, b) => b.total - a.total)
    .forEach(({ key, total: cantidad }) => out += fila([String(key), cantidad]));
  out += "\n";

  out += SECCION("Localidades");
  out += fila(["Localidad", "Cantidad"]);
  byLocalidad
    .sort((a, b) => b.total - a.total)
    .forEach(({ key, total: cantidad }) => out += fila([String(key), cantidad]));
  out += "\n";

  out += SECCION("Tendencias");
  out += fila(["Fecha", "Casos"]);
  tender.forEach((d) => {
    const fecha = d?.fecha ?? d?.label ?? "—";
    const valor = d?.total ?? d?.casos ?? 0;
    out += fila([String(fecha), Number(valor) || 0]);
  });
  out += "\n";

  out += SECCION("Comparativas");
  out += fila(["Métrico", "Actual", "Anterior", "Variación"]);
  out += fila(["Casos", total, resumenPrev?.casos ?? 0, variacionPct(total, resumenPrev?.casos)]);
  out += fila(["Firmas", firmas, firmasPrev, variacionPct(firmas, firmasPrev)]);
  out += fila(["Cerrados", cerrados, resumenPrev?.cerrados ?? 0, variacionPct(cerrados, resumenPrev?.cerrados)]);
  out += "\n";

  out += SECCION("Períodos");
  out += fila(["Período", "Casos", "Firmas", "Conversión"]);
  (PERIODOS || []).forEach((p) => {
    const r = getPeriodRange(p.id, hoy);
    if (!r) return;
    const res = computeResumenPeriodo(casos, r, workingDays, cfg, availability);
    out += fila([
      p.id,
      res?.casos ?? 0,
      res?.firmas ?? 0,
      pct(res?.firmas || 0, res?.casos || 0),
    ]);
  });
  out += "\n";

  out += SECCION("Métricas");
  out += fila(["Métrica", "Valor"]);
  out += fila(["Casos sin reporte", sinReporte]);
  out += fila(["Casos sin asignar", unassigned]);
  out += fila(["Promedio días resolución", avgResolutionDays]);
  out += "\n";

  return out.trimEnd() + "\n";
}

export { buildCsvAnalitico };
export default buildCsvAnalitico;
