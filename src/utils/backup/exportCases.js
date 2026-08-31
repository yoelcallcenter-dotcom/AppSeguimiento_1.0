import casesDB from '../../core/db/casesDB';
import appDB from '../../core/db/appDB';
import { isSameMonth } from '../dateFilters';
import { CSV_HEADERS } from './constants';
import { escapeCSV, sanitizeCSV } from './csvUtils';

export async function exportCasesToCSV(months = null) {
  const allCases = await casesDB.cases.toArray();

  if (!allCases || allCases.length === 0) {
    throw new Error('No hay casos para exportar');
  }

  let filteredCases = allCases;

  if (months && months.length > 0) {
    const monthObjects = months.map((m) => {
      const [year, month] = m.split('-').map(Number);
      return { year, month: month - 1 };
    });

    filteredCases = allCases.filter((c) =>
      monthObjects.some(({ year, month }) =>
        isSameMonth(c.fecha, month, year)
      )
    );

    if (filteredCases.length === 0) {
      throw new Error('No hay casos para los meses seleccionados');
    }
  }

  const formatearReportes = (reportes) => {
    if (!reportes || reportes.length === 0) return '';
    return reportes.map((r) => `(${r.fecha}) ${r.texto}`).join(' // ');
  };

  const formatearComentarios = (comentarios) => {
    if (!comentarios || comentarios.length === 0) return '';
    return comentarios.map((c) => `(${c.fecha}) ${c.texto}`).join(' // ');
  };

  const serializarNotas = (notas) => {
    if (!notas || notas.length === 0) return '';
    return notas.map((n) => `${n.titulo || n.title || ''}: ${n.contenido || n.content || ''} (${n.fecha || ''})`).join(' // ');
  };

  const serializarAgenda = (eventos) => {
    if (!eventos || eventos.length === 0) return '';
    return eventos.map((e) => {
      const fecha = e.fecha || (e.startDate ? e.startDate.slice(0, 10) : '');
      return `${e.titulo || e.title || ''} (${fecha})`;
    }).join(' // ');
  };

  const getNotasPorCaso = async (caseId) => {
    try {
      const all = await appDB.notes.toArray();
      return all.filter((n) => (n.relatedCaseIds || []).includes(caseId));
    } catch { return []; }
  };

  const getEventosPorCaso = async (caseId) => {
    try {
      const all = await appDB.events.toArray();
      return all.filter((e) => (e.relatedCaseIds || []).includes(caseId));
    } catch { return []; }
  };

  const getHistorialPorCaso = async (caseId) => {
    try {
      const all = await casesDB.case_history.toArray();
      return all.filter((h) => h.caseId === caseId);
    } catch { return []; }
  };

  const serializarHistorial = (eventos) => {
    if (!eventos || eventos.length === 0) return '';
    return eventos.map((e) => {
      const fecha = e.timestamp ? new Date(e.timestamp).toISOString().slice(0, 16).replace('T', ' ') : '';
      return `${fecha}|${e.type || ''}|${e.title || ''}|${e.description || ''}`;
    }).join('; ');
  };

  const rows = await Promise.all(filteredCases.map(async (c) => {
    const notas = c.notasVinculadas || (await getNotasPorCaso(c.id));
    const agenda = c.agendaVinculada || (await getEventosPorCaso(c.id));
    const historial = await getHistorialPorCaso(c.id);
    return [
      c.id || '',
      c.fecha || '',
      c.nombre || '',
      c.telefono || '',
      c.localidad || '',
      c.aseguradora || '',
      c.profesion || '',
      c.ingreso || '',
      c.lesion || '',
      c.tipoIngreso || '',
      c.cita || '',
      c.estado || '',
      c.estudioJuridico || '',
      c.observaciones || '',
      (c.tags || []).join('; '),
      formatearReportes(c.reporteHistory || []),
      formatearComentarios(c.comentarios || []),
      serializarNotas(notas),
      serializarAgenda(agenda),
      serializarHistorial(historial),
    ].map((v) => escapeCSV(sanitizeCSV(v || '')));
  }));

  return [CSV_HEADERS.join(','), ...rows.map((row) => row.join(','))].join('\n');
}
