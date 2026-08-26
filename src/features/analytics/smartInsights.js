/**
 * smartInsights.js
 * Motor de insights determinístico (Release 1.3.2).
 * Recibe los cálculos de analyticsEngine y aplica reglas fijas para producir
 * conclusiones accionables con prioridad y datos de respaldo ("base").
 *
 * Reglas de integridad:
 *  - Ninguna conclusión se emite con muestra insuficiente (ver insightsConfig).
 *  - Una sola conclusión por tema: nunca se contradicen entre sí.
 *  - Las proyecciones siempre se expresan como estimación.
 *  - Los grupos con muestra pequeña se excluyen de rankings destacables.
 */

import {
  INSIGHTS_CONFIG,
  CATEGORIAS_INSIGHT,
  ESTADO_VACIO,
} from './insightsConfig';

let seq = 0;
function crearInsight({ categoria, prioridad = 3, severity = 'info', titulo, detalle, base = [] }) {
  seq += 1;
  return {
    id: `ins-${Date.now().toString(36)}-${seq}`,
    categoria,
    prioridad,
    severity,
    titulo,
    detalle,
    base,
  };
}

function pctTexto(pct) {
  if (pct === null || pct === undefined) return '';
  return `${pct > 0 ? '+' : ''}${pct}%`;
}

/**
 * Genera los insights del período a partir de los datos ya calculados.
 * @returns {{ estadoVacio: string|null, insights: Array }}
 */
export function generarInsightsAnaliticos({
  totalCasos = 0,
  resumen,
  tendencia,
  horas,
  aseguradoras = [],
  estudios = [],
  sinSeguimientoCount = 0,
  promedioPersonal,
  proyeccion,
}) {
  const insights = [];
  if (!totalCasos) {
    return { estadoVacio: ESTADO_VACIO.SIN_DATOS, insights };
  }

  const cfg = INSIGHTS_CONFIG;
  const M = cfg.muestra;
  const U = cfg.umbral;

  // ============================================================
  // OBJETIVOS — ritmo insuficiente y proyecciones semanales
  // ============================================================
  if (proyeccion) {
    for (const p of proyeccion.proyecciones || []) {
      const unidad = p.key === 'cases' ? 'casos' : p.key === 'signed' ? 'firmas' : p.label.toLowerCase();
      if (p.met) {
        insights.push(crearInsight({
          categoria: CATEGORIAS_INSIGHT.OBJETIVOS,
          prioridad: 3,
          severity: 'success',
          titulo: `Objetivo semanal de ${unidad} cumplido`,
          detalle: `Llevás ${p.current} de ${p.target} ${unidad} esta semana.`,
          base: [
            { label: 'Progreso actual', valor: `${p.current}/${p.target}` },
            { label: 'Completado', valor: `${p.percent}%` },
          ],
        }));
        continue;
      }
      if (p.restantesDias <= 0) continue;

      if (!p.cumpliria) {
        const faltante = Math.max(0, p.target - p.current);
        const necesarioDiario = Math.ceil(faltante / p.restantesDias);
        insights.push(crearInsight({
          categoria: CATEGORIAS_INSIGHT.OBJETIVOS,
          prioridad: 1,
          severity: 'warning',
          titulo: `Ritmo insuficiente para la meta semanal de ${unidad}`,
          detalle: `Manteniendo tu ritmo actual (~${p.ritmoDiario} ${unidad}/día hábil) llegarías a ~${p.proyeccionEstimada}. Necesitarías ~${necesarioDiario} por día en los ${p.restantesDias} día(s) hábil(es) que quedan para llegar a ${p.target}.`,
          base: [
            { label: 'Progreso actual', valor: `${p.current}/${p.target}` },
            { label: 'Ritmo reciente', valor: `~${p.ritmoDiario} por día hábil` },
            { label: 'Días hábiles restantes', valor: String(p.restantesDias) },
            { label: 'Proyección estimada', valor: `~${p.proyeccionEstimada}` },
          ],
        }));
      } else if (p.percent < 100) {
        insights.push(crearInsight({
          categoria: CATEGORIAS_INSIGHT.OBJETIVOS,
          prioridad: 2,
          severity: 'success',
          titulo: `En camino: objetivo semanal de ${unidad}`,
          detalle: `Según tu rendimiento reciente, podrías alcanzar aproximadamente ${p.proyeccionEstimada} ${unidad} esta semana (meta: ${p.target}). Es una estimación: mantiene tu ritmo actual.`,
          base: [
            { label: 'Progreso actual', valor: `${p.current}/${p.target}` },
            { label: 'Ritmo reciente', valor: `~${p.ritmoDiario} por día hábil` },
            { label: 'Días hábiles restantes', valor: String(p.restantesDias) },
            { label: 'Proyección estimada', valor: `~${p.proyeccionEstimada}` },
          ],
        }));
      }
    }

    // Ritmo mensual requerido (solo si hay meta mensual activa con días restantes).
    const pace = proyeccion.ritmoMensual;
    if (pace && pace.cases !== null && pace.remainingDays > 0) {
      insights.push(crearInsight({
        categoria: CATEGORIAS_INSIGHT.OBJETIVOS,
        prioridad: 2,
        severity: 'info',
        titulo: 'Ritmo sugerido para la meta mensual',
        detalle: `Te conviene cargar aproximadamente ${Math.ceil(pace.cases)} casos por día hábil para cumplir la meta mensual (${pace.remainingDays} día(s) hábil(es) restantes este mes).`,
        base: [
          { label: 'Ritmo necesario', valor: `~${Math.ceil(pace.cases)} casos/día` },
          { label: 'Días hábiles restantes', valor: String(pace.remainingDays) },
        ],
      }));
    }
  }

  // ============================================================
  // PRODUCTIVIDAD — dos reglas independientes (no se anidan)
  // ============================================================

  // a) Variación de firmas vs período anterior equivalente.
  if (
    resumen &&
    resumen.variacion.firmasPct !== null &&
    resumen.firmas >= M.comparacion &&
    resumen.previo.firmas >= M.comparacion
  ) {
    const pct = resumen.variacion.firmasPct;
    const magnitud = Math.abs(pct);
    if (magnitud >= U.significativo) {
      const subio = pct > 0;
      insights.push(crearInsight({
        categoria: CATEGORIAS_INSIGHT.PRODUCTIVIDAD,
        prioridad: magnitud >= U.fuerte ? 1 : 2,
        severity: subio ? 'success' : 'warning',
        titulo: subio
          ? `Tus firmas aumentaron ${pct}%`
          : `Tus firmas bajaron ${Math.abs(pct)}%`,
        detalle: `Pasaste de ${resumen.previo.firmas} a ${resumen.firmas} firmas comparando períodos equivalentes (${resumen.previo.label} vs ${resumen.periodo}).`,
        base: [
          { label: resumen.periodo, valor: `${resumen.firmas} firmas` },
          { label: resumen.previo.label, valor: `${resumen.previo.firmas} firmas` },
          { label: 'Variación', valor: pctTexto(pct) },
        ],
      }));
    }
  }

  // b) Promedio diario del período vs ritmo habitual (ventana de 30 días).
  if (
    resumen &&
    promedioPersonal &&
    promedioPersonal.promedioDiario > 0 &&
    resumen.promedioDiario > 0
  ) {
    const diffPct = Math.round(
      ((resumen.promedioDiario - promedioPersonal.promedioDiario) /
        promedioPersonal.promedioDiario) * 100
    );
    if (Math.abs(diffPct) >= U.normal) {
      const arriba = diffPct > 0;
      insights.push(crearInsight({
        categoria: CATEGORIAS_INSIGHT.PRODUCTIVIDAD,
        prioridad: 2,
        severity: arriba ? 'success' : 'warning',
        titulo: arriba
          ? `Estás un ${diffPct}% por encima de tu ritmo habitual`
          : `Estás un ${Math.abs(diffPct)}% por debajo de tu ritmo habitual`,
        detalle: `Promedio diario del período: ${resumen.promedioDiario} firmas por día hábil. Tu promedio de los últimos ${promedioPersonal.dias} días: ${promedioPersonal.promedioDiario}.`,
        base: [
          { label: 'Período actual', valor: `${resumen.promedioDiario} firmas/día` },
          { label: `Promedio últimos ${promedioPersonal.dias} días`, valor: `${promedioPersonal.promedioDiario} firmas/día` },
          { label: 'Diferencia', valor: pctTexto(diffPct) },
        ],
      }));
    }
  }

  // ============================================================
  // TENDENCIA — múltiples puntos temporales (semanas completas)
  // ============================================================
  if (tendencia && tendencia.tendencia) {
    const t = tendencia.tendencia;
    if (t.direccion === 'ascendente' || t.direccion === 'descendente') {
      const subio = t.direccion === 'ascendente';
      const magnitud = t.pct !== null ? Math.abs(t.pct) : U.fuerte;
      insights.push(crearInsight({
        categoria: CATEGORIAS_INSIGHT.TENDENCIA,
        prioridad: magnitud >= U.fuerte ? 1 : 2,
        severity: subio ? 'success' : 'warning',
        titulo: subio
          ? 'Tendencia ascendente en tus firmas'
          : 'Tendencia descendente en tus firmas',
        detalle:
          t.pct !== null
            ? `Comparando las últimas ${t.semanasAnalizadas} semanas completas, el promedio pasó de ${t.primeraMitad} a ${t.segundaMitad} firmas por semana (${pctTexto(t.pct)}).`
            : `Comparando las últimas ${t.semanasAnalizadas} semanas completas, pasaste de un promedio de ${t.primeraMitad} a ${t.segundaMitad} firmas por semana.`,
        base: [
          { label: `Promedio primeras ${Math.floor(t.semanasAnalizadas / 2)} semanas`, valor: `${t.primeraMitad} firmas/semana` },
          { label: `Promedio últimas ${Math.ceil(t.semanasAnalizadas / 2)} semanas`, valor: `${t.segundaMitad} firmas/semana` },
          ...(t.pct !== null ? [{ label: 'Variación', valor: pctTexto(t.pct) }] : []),
        ],
      }));
    }
    // Consistencia: todas las semanas dentro de ±25% del promedio.
    const pts = tendencia.puntos.map((p) => p.firmas);
    const totalSemanal = pts.reduce((a, b) => a + b, 0);
    if (pts.length >= M.tendenciaSemanas && totalSemanal >= M.mejorDia) {
      const media = totalSemanal / pts.length;
      const estable = media > 0 && pts.every((v) => Math.abs(v - media) <= media * 0.25);
      if (estable) {
        insights.push(crearInsight({
          categoria: CATEGORIAS_INSIGHT.TENDENCIA,
          prioridad: 3,
          severity: 'info',
          titulo: 'Rendimiento estable',
          detalle: `Tus últimas ${pts.length} semanas se mantienen dentro de un rango acotado (±25% del promedio de ${Math.round(media * 10) / 10} firmas).`,
          base: [
            { label: 'Semanas analizadas', valor: String(pts.length) },
            { label: 'Promedio semanal', valor: `${Math.round(media * 10) / 10} firmas` },
            { label: 'Rango', valor: `${Math.min(...pts)}–${Math.max(...pts)} firmas` },
          ],
        }));
      }
    }
  }

  // ============================================================
  // HORARIOS — solo con timestamps confiables y muestra suficiente
  // ============================================================
  if (horas && horas.top && horas.totalEventos >= M.eventosHorario && horas.top.total > 0) {
    insights.push(crearInsight({
      categoria: CATEGORIAS_INSIGHT.HORARIOS,
      prioridad: 3,
      severity: 'info',
      titulo: 'Concentración horaria de tu actividad',
      detalle: `Tu mayor actividad del período se concentra entre las ${horas.top.label.split(' - ')[0]} y las ${horas.top.label.split(' - ')[1]} (${horas.top.total} de ${horas.totalEventos} registros con hora).`,
      base: [
        { label: 'Franja con más actividad', valor: horas.top.label },
        { label: 'Registros en esa franja', valor: `${horas.top.total} de ${horas.totalEventos}` },
        { label: 'Fuente', valor: 'Horas de creación de casos e interacciones' },
      ],
    }));
  }

  // ============================================================
  // ASEGURADORAS Y ESTUDIOS — con muestra mínima obligatoria
  // ============================================================
  const promedioConversionGeneral = (grupos) => {
    const validos = grupos.filter((g) => g.suficienteMuestra);
    if (validos.length === 0) return null;
    const totales = validos.reduce((a, g) => a + g.total, 0);
    const firmas = validos.reduce((a, g) => a + g.firmas, 0);
    return totales > 0 ? Math.round((firmas / totales) * 100) : null;
  };

  const insightsDeGrupos = (grupos, categoria, sustantivo) => {
    const suficientes = grupos.filter((g) => g.suficienteMuestra);
    if (suficientes.length === 0) return;

    // Mayor volumen (con contexto de conversión).
    const top = [...suficientes].sort((a, b) => b.total - a.total)[0];
    insights.push(crearInsight({
      categoria,
      prioridad: 3,
      severity: 'info',
      titulo: `Mayor volumen: ${top.key}`,
      detalle: `${top.key} acumula ${top.total} casos en el período, con una conversión de ${top.conversion}%.`,
      base: [
        { label: 'Casos', valor: String(top.total) },
        { label: 'Firmas', valor: String(top.firmas) },
        { label: 'Conversión', valor: `${top.conversion}%` },
      ],
    }));

    // Mejor conversión solo si hay al menos 2 grupos con muestra comparable.
    if (suficientes.length >= 2) {
      const promGeneral = promedioConversionGeneral(suficientes);
      const mejorConv = [...suficientes]
        .filter((g) => promGeneral !== null && g.conversion - promGeneral >= U.conversionPuntos)
        .sort((a, b) => b.conversion - a.conversion)[0];
      if (mejorConv) {
        insights.push(crearInsight({
          categoria,
          prioridad: 3,
          severity: 'success',
          titulo: `Mejor conversión: ${mejorConv.key}`,
          detalle: `${mejorConv.key} convierte un ${mejorConv.conversion}%, por encima del ${promGeneral}% promedio de ${sustantivo}s con volumen comparable.`,
          base: [
            { label: mejorConv.key, valor: `${mejorConv.conversion}% (${mejorConv.firmas}/${mejorConv.total})` },
            { label: 'Promedio general', valor: `${promGeneral}%` },
          ],
        }));
      }
    }

    // Caída relevante de conversión vs período anterior.
    const caida = suficientes.find(
      (g) =>
        g.evolucionPuntos !== null &&
        g.evolucionPuntos <= -U.significativo
    );
    if (caida) {
      insights.push(crearInsight({
        categoria,
        prioridad: 2,
        severity: 'warning',
        titulo: `Cayó la conversión de ${caida.key}`,
        detalle: `${caida.key} pasó de ${caida.conversionPrev}% a ${caida.conversion}% de conversión respecto del período anterior (${caida.evolucionPuntos} puntos).`,
        base: [
          { label: 'Conversión actual', valor: `${caida.conversion}%` },
          { label: 'Conversión período anterior', valor: `${caida.conversionPrev}%` },
          { label: 'Evolución', valor: `${caida.evolucionPuntos} puntos` },
        ],
      }));
    }
  };

  insightsDeGrupos(aseguradoras, CATEGORIAS_INSIGHT.ASEGURADORAS, 'aseguradora');
  insightsDeGrupos(estudios, CATEGORIAS_INSIGHT.ESTUDIOS, 'estudio');

  // Contexto adicional para el estudio top: derivaciones vs conversión.
  if (estudios.length >= 2) {
    const suficientes = estudios.filter((e) => e.suficienteMuestra);
    if (suficientes.length >= 2) {
      const top = [...estudios].sort((a, b) => b.total - a.total)[0];
      const prom = promedioConversionGeneral(estudios);
      if (prom !== null && top.conversion < prom - U.conversionPuntos) {
        insights.push(crearInsight({
          categoria: CATEGORIAS_INSIGHT.ESTUDIOS,
          prioridad: 2,
          severity: 'info',
          titulo: `${top.key}: mucho volumen, conversión baja`,
          detalle: `El estudio ${top.key} es el que más derivaciones recibe del período (${top.total} casos), pero su conversión (${top.conversion}%) está por debajo del promedio general (${prom}%).`,
          base: [
            { label: 'Derivaciones', valor: String(top.total) },
            { label: 'Conversión del estudio', valor: `${top.conversion}%` },
            { label: 'Promedio general', valor: `${prom}%` },
          ],
        }));
      }
    }
  }

  // ============================================================
  // ACTIVIDAD — inactividad personal y casos estancados
  // ============================================================
  if (sinSeguimientoCount >= 5) {
    insights.push(crearInsight({
      categoria: CATEGORIAS_INSIGHT.ACTIVIDAD,
      prioridad: 2,
      severity: 'warning',
      titulo: 'Casos sin seguimiento reciente',
      detalle: `${sinSeguimientoCount} casos activos no registran actividad hace más de ${cfg.diasSinSeguimiento} días.`,
      base: [
        { label: 'Casos afectados', valor: String(sinSeguimientoCount) },
        { label: 'Umbral', valor: `${cfg.diasSinSeguimiento} días` },
      ],
    }));
  }

  // Orden final: prioridad ascendente (1 = más importante), luego categoría.
  insights.sort((a, b) => {
    if (a.prioridad !== b.prioridad) return a.prioridad - b.prioridad;
    return a.categoria.localeCompare(b.categoria);
  });

  const limitados = insights.slice(0, INSIGHTS_CONFIG.maxInsights);
  const estadoVacio =
    limitados.length === 0 ? ESTADO_VACIO.DATOS_INSUFICIENTES : null;

  return { estadoVacio, insights: limitados };
}
