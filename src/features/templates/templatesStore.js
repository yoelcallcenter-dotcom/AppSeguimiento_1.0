import appDB from '../../core/db/appDB';
import { reportError } from '../../core/error/reportError';
import { touchVersion, assertNoConflict } from '../../core/db/versioning';
import { notifyChange, SYNC_EVENTS } from '../../core/sync/syncService';

export async function createTemplate(data) {
  try {
    const template = touchVersion({
      name: data.name || 'Sin nombre',
      category: data.category || '',
      type: data.type || 'nota',
      content: data.content || {},
      active: data.active !== false,
      createdAt: new Date().toISOString(),
    });
    const id = await appDB.templates.add(template);
    notifyChange(SYNC_EVENTS.TEMPLATES_UPDATED, { action: 'create', id });
    return { ...template, id };
  } catch (error) {
    reportError(error, { operation: 'createTemplate' });
    throw error;
  }
}

export async function updateTemplate(id, updates) {
  try {
    const existing = await appDB.templates.get(id);
    if (!existing) throw new Error(`Template ${id} not found`);
    assertNoConflict(updates, existing);
    const merged = touchVersion({ ...existing, ...updates });
    await appDB.templates.put(merged);
    notifyChange(SYNC_EVENTS.TEMPLATES_UPDATED, { action: 'update', id });
    return merged;
  } catch (error) {
    reportError(error, { operation: 'updateTemplate', id });
    throw error;
  }
}

export async function deleteTemplate(id) {
  try {
    await appDB.templates.delete(id);
    notifyChange(SYNC_EVENTS.TEMPLATES_UPDATED, { action: 'delete', id });
    return true;
  } catch (error) {
    reportError(error, { operation: 'deleteTemplate', id });
    throw error;
  }
}

export async function getTemplateById(id) {
  try {
    return await appDB.templates.get(id);
  } catch (error) {
    reportError(error, { operation: 'getTemplateById', id });
    return null;
  }
}

export async function getAllTemplates() {
  try {
    return await appDB.templates.orderBy('name').toArray();
  } catch (error) {
    reportError(error, { operation: 'getAllTemplates' });
    return [];
  }
}

export async function getTemplatesByType(type) {
  try {
    return await appDB.templates
      .where('type')
      .equals(type)
      .filter((t) => t.active !== false)
      .toArray();
  } catch (error) {
    reportError(error, { operation: 'getTemplatesByType', type });
    return [];
  }
}

export async function duplicateTemplate(id) {
  try {
    const original = await appDB.templates.get(id);
    if (!original) throw new Error(`Template ${id} not found`);
    const { id: _id, createdAt, updatedAt, version, ...rest } = original;
    return await createTemplate({
      ...rest,
      name: `${rest.name} (copia)`,
    });
  } catch (error) {
    reportError(error, { operation: 'duplicateTemplate', id });
    throw error;
  }
}

export async function toggleTemplateActive(id) {
  try {
    const existing = await appDB.templates.get(id);
    if (!existing) throw new Error(`Template ${id} not found`);
    return await updateTemplate(id, { active: !existing.active });
  } catch (error) {
    reportError(error, { operation: 'toggleTemplateActive', id });
    throw error;
  }
}
