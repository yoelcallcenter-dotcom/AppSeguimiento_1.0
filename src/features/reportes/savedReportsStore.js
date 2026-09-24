import appDB from '../../core/db/appDB';
import { reportError } from '../../core/error/reportError';
import { touchVersion, assertNoConflict } from '../../core/db/versioning';

const DEFAULT_SNAPSHOT = {
  mes: undefined,
  anio: undefined,
  dias: [],
  estado: 'todos',
  localidad: 'todos',
  aseguradora: 'todos',
  estudio: 'todos',
  tipo: 'todos',
  busqueda: '',
  busquedaFiltro: 'todos',
};

export async function createReport(nombre, snapshot) {
  try {
    const report = touchVersion({
      nombre: (nombre || '').trim() || 'Sin nombre',
      snapshot: { ...DEFAULT_SNAPSHOT, ...snapshot },
      createdAt: new Date().toISOString(),
    });
    const id = await appDB.saved_reports.add(report);
    return { ...report, id };
  } catch (error) {
    reportError(error, { operation: 'createReport' });
    throw error;
  }
}

export async function updateReport(id, updates) {
  try {
    const existing = await appDB.saved_reports.get(id);
    if (!existing) throw new Error(`Report ${id} not found`);
    assertNoConflict(updates, existing);
    const merged = touchVersion({ ...existing, ...updates });
    await appDB.saved_reports.put(merged);
    return merged;
  } catch (error) {
    reportError(error, { operation: 'updateReport', id });
    throw error;
  }
}

export async function deleteReport(id) {
  try {
    await appDB.saved_reports.delete(id);
    return true;
  } catch (error) {
    reportError(error, { operation: 'deleteReport', id });
    throw error;
  }
}

export async function getReportById(id) {
  try {
    return await appDB.saved_reports.get(id);
  } catch (error) {
    reportError(error, { operation: 'getReportById', id });
    return null;
  }
}

export async function getAllReports() {
  try {
    return await appDB.saved_reports.orderBy('nombre').toArray();
  } catch (error) {
    reportError(error, { operation: 'getAllReports' });
    return [];
  }
}

export async function duplicateReport(id) {
  try {
    const original = await appDB.saved_reports.get(id);
    if (!original) throw new Error(`Report ${id} not found`);
    const { id: _id, createdAt, updatedAt, version, ...rest } = original;
    return await createReport(
      `${rest.nombre || 'Sin nombre'} (copia)`,
      rest.snapshot || {}
    );
  } catch (error) {
    reportError(error, { operation: 'duplicateReport', id });
    throw error;
  }
}
