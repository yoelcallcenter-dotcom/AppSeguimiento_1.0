import { escapeCSV, sanitizeCSV } from '../../utils/backup/csvUtils';

const HEADER = ['Nombre', 'Teléfono', 'Localidad', 'Estado', 'Último Reporte', 'Origen', 'Texto'];

/**
 * Construye las filas del CSV (función pura, testeable). Devuelve la fila de
 * encabezados seguida de una fila por caso.
 * @param {Array} casos - casos filtrados a exportar
 * @returns {Array<Array<string>>} filas ya escapadas/sanitizadas
 */
export function buildReporteCSV(casos) {
  const e = (v) => escapeCSV(sanitizeCSV(v));
  return [
    HEADER.map(e),
    ...(casos || []).map((c) => {
      const reportes = c.reporteHistory;
      const ultimo = reportes && reportes.length > 0 ? reportes[reportes.length - 1] : null;
      return [
        e(c.nombre),
        e(c.telefono),
        e(c.localidad),
        e(c.estado),
        e(ultimo?.fecha || ''),
        e(ultimo?.origen || ''),
        e(ultimo?.texto || ''),
      ];
    }),
  ];
}

/**
 * Exporta el listado filtrado de casos de un reporte guardado a CSV con BOM.
 * Nombre de archivo descriptivo: Reporte_{slug(nombre)}_{periodo}_{fecha}.csv
 * @param {Array} casos - casos filtrados a exportar
 * @param {string} nombreReporte - nombre del reporte guardado
 * @param {{ mes?: number, anio?: number }} periodo - mes/año capturados del reporte
 */
export function exportarReporteCSV(casos, nombreReporte, periodo = {}) {
  const filas = buildReporteCSV(casos);
  const csv = filas.map((f) => f.join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const slug = (nombreReporte || 'reporte').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);
  const periodoStr =
    periodo.anio && periodo.mes >= 0
      ? `${periodo.anio}-${String(periodo.mes + 1).padStart(2, '0')}`
      : 'todos';
  a.href = url;
  a.download = `Reporte_${slug}_${periodoStr}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}