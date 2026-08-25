/**
 * insightsEngine.js
 * Interpreta las métricas calculadas y genera conclusiones accionables
 * con severidad (danger/warning/info/success) para la UI.
 */

export function generateInsights(metrics) {
  const insights = [];
  if (!metrics || metrics.total === 0) return insights;

  const push = (severity, titulo, detalle) => {
    insights.push({ id: `ins-${insights.length}`, severity, titulo, detalle });
  };

  // Resolución
  if (metrics.cerrados > 0 && metrics.cerrados / metrics.total >= 0.7) {
    push('success', 'Buen nivel de resolución',
      `${metrics.cerrados} de ${metrics.total} casos están resueltos (${metrics.tasaCierre}%).`);
  }

  // Casos demorados
  if (metrics.overdueCases.length >= 5) {
    push('danger', 'Muchos casos demorados',
      `${metrics.overdueCases.length} casos activos superan los 30 días sin resolución. Revisá esas gestiones.`);
  } else if (metrics.overdueCases.length > 0) {
    push('warning', 'Casos con más de 30 días',
      `${metrics.overdueCases.length} casos activos llevan más de 30 días.`);
  }

  // Sin actividad reciente
  if (metrics.staleCases.length >= 5) {
    push('warning', 'Casos sin actualizar',
      `${metrics.staleCases.length} casos activos no registran actividad hace más de 15 días.`);
  } else if (metrics.staleCases.length > 0) {
    push('info', 'Casos sin actividad reciente',
      `${metrics.staleCases.length} casos activos llevan más de 15 días sin actualizarse.`);
  }

  // Sin asignación
  if (metrics.unassignedCases.length > 0) {
    push('warning', 'Casos sin asignación',
      `${metrics.unassignedCases.length} casos no tienen estudio jurídico asignado.`);
  }

  // Concentración geográfica
  const topProv = metrics.byProvince[0];
  if (topProv && topProv.share >= 50) {
    push('info', 'Alta concentración geográfica',
      `${topProv.key} concentra el ${topProv.share}% de los casos.`);
  }

  // Conversión
  if (metrics.total > 0 && metrics.tasaConversion < 15) {
    push('warning', 'Baja conversión',
      `Solo ${metrics.tasaConversion}% de los casos llegan a firma.`);
  } else if (metrics.tasaConversion >= 40) {
    push('success', 'Conversión destacada',
      `${metrics.tasaConversion}% de conversión a firma.`);
  }

  // Resolución lenta
  if (metrics.avgResolutionDays > 20) {
    push('warning', 'Resolución lenta',
      `El tiempo promedio hasta la firma es de ${metrics.avgResolutionDays} días.`);
  } else if (metrics.avgResolutionDays > 0) {
    push('info', 'Tiempo de resolución',
      `Las firmas se logran en ${metrics.avgResolutionDays} días en promedio.`);
  }

  // Sin reporte
  if (metrics.sinReporte > 0 && metrics.sinReporte / metrics.total >= 0.3) {
    push('warning', 'Muchos casos sin reporte',
      `${metrics.sinReporte} casos (${Math.round((metrics.sinReporte / metrics.total) * 100)}%) no tienen reporte cargado.`);
  }

  // Volumen del período
  if (metrics.total < 10) {
    push('info', 'Poco volumen en el período',
      `Hay ${metrics.total} casos en el período seleccionado. Las métricas son orientativas.`);
  }

  return insights;
}
