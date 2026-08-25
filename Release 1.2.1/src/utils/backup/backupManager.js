import casesDB from '../../core/db/casesDB';
import { storageManager } from '../../core/storage/storageManager';
import { CONFIG_DEFAULT } from '../constants';
import { BACKUP_VERSION, STORAGE_KEYS, CONFIG_KEYS, MESSAGES } from './constants';
import { isValidCase, normalizeCase, deduplicateCases, validateConfigExport } from './validators';
import { parseCSVToCases, generateCSVFromCases } from './parsers';
import { isSameMonth } from '../dateFilters';

/**
 * Fusiona la configuración importada con los valores por defecto para que
 * un archivo con campos faltantes (config exportada de forma parcial) no
 * deje a la app sin claves esperadas (columnasVisibles, plantillas, etc.).
 * Los objetos anidados se fusionan en profundidad; lo importado siempre gana.
 */
function mergeConfigWithDefaults(imported) {
  const merged = { ...CONFIG_DEFAULT, ...imported };
  for (const key of Object.keys(CONFIG_DEFAULT)) {
    const base = CONFIG_DEFAULT[key];
    const value = imported[key];
    if (
      base &&
      value &&
      typeof base === "object" &&
      !Array.isArray(base) &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      merged[key] = { ...base, ...value };
    }
  }
  return merged;
}

export async function exportCasesToCSV(months = null) {
  try {
    const allCases = await casesDB.cases.toArray();

    if (!allCases || allCases.length === 0) {
      throw new Error(MESSAGES.NO_CASES);
    }

    let filteredCases = allCases;

    if (months && months.length > 0) {
      const monthObjects = months.map((m) => {
        const [year, month] = m.split('-').map(Number);
        return { year, month: month - 1 };
      });

      filteredCases = allCases.filter((c) =>
        monthObjects.some(({ year, month }) => isSameMonth(c.fecha, month, year))
      );

      if (filteredCases.length === 0) {
        throw new Error('No hay casos para los meses seleccionados');
      }
    }

    return generateCSVFromCases(filteredCases);
  } catch (error) {
    console.error('[BackupManager] Error exportando casos a CSV:', error);
    throw error;
  }
}

export async function importCasesFromCSV(csvData) {
  try {
    const cases = parseCSVToCases(csvData);
    const normalizedCases = cases.map(normalizeCase).filter(Boolean);

    if (normalizedCases.length === 0) {
      return {
        success: false,
        error: 'No se pudieron normalizar los casos del CSV. Verifica la estructura.',
      };
    }

    const deduplicated = deduplicateCases(normalizedCases);

    // Reemplazo total atómico (transacción Dexie).
    await casesDB.transaction('rw', casesDB.cases, async () => {
      await casesDB.cases.clear();
      if (deduplicated.length > 0) {
        await casesDB.cases.bulkPut(deduplicated);
      }
    });

    return { success: true, count: deduplicated.length, normalized: true };
  } catch (error) {
    console.error('[BackupManager] Error importando casos desde CSV:', error);
    return { success: false, error: error.message || MESSAGES.PARSE_ERROR };
  }
}

export async function exportConfigToJSON() {
  try {
    const configData = {};

    for (const key of CONFIG_KEYS) {
      const value = await storageManager.get(key, {});
      const cleanKey = key.replace('-art-tracker', '');
      configData[cleanKey] = value;
    }

    // Incluir conversaciones sugeridas (almacenadas con keys dinámicas)
    const conversaciones = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('conversaciones_')) {
        try {
          conversaciones[key] = JSON.parse(localStorage.getItem(key));
        } catch {
          conversaciones[key] = [];
        }
      }
    }
    if (Object.keys(conversaciones).length > 0) {
      configData.conversaciones = conversaciones;
    }

    const hasData = Object.values(configData).some(
      (v) => v && (Array.isArray(v) ? v.length > 0 : Object.keys(v).length > 0)
    );

    if (!hasData) {
      throw new Error(MESSAGES.NO_CONFIG);
    }

    const data = {
      version: BACKUP_VERSION,
      fechaExportacion: new Date().toISOString().slice(0, 10),
      configuracion: configData,
    };

    return JSON.stringify(data, null, 2);
  } catch (error) {
    console.error('[BackupManager] Error exportando configuración:', error);
    throw error;
  }
}

export async function importConfigFromJSON(jsonData, options = {}) {
  try {
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;

    const validation = validateConfigExport(data);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const config = validation.config;
    let importedCount = 0;

    // Filtro opcional de categorías (cleanKeys sin "-art-tracker").
    // Si se especifica, solo se importan esas claves.
    let categoriasPermitidas = null;
    if (options.categorias && typeof options.categorias === 'object') {
      categoriasPermitidas = new Set(
        Object.entries(options.categorias)
          .filter(([, enabled]) => enabled !== false)
          .map(([k]) => k)
      );
      if (categoriasPermitidas.size === 0) {
        return { success: false, error: 'No hay categorías seleccionadas para importar' };
      }
    }

    const keyMap = {};
    CONFIG_KEYS.forEach((key) => {
      const cleanKey = key.replace('-art-tracker', '');
      keyMap[cleanKey] = key;
    });

    for (const [cleanKey, value] of Object.entries(config)) {
      if (categoriasPermitidas && !categoriasPermitidas.has(cleanKey)) continue;
      const storageKey = keyMap[cleanKey];
      if (storageKey && value !== undefined && value !== null) {
        if (cleanKey === "config") {
          await storageManager.set(storageKey, mergeConfigWithDefaults(value));
        } else {
          await storageManager.set(storageKey, value);
        }
        importedCount++;
      }
    }

    // Restaurar conversaciones sugeridas
    if (
      (!categoriasPermitidas || categoriasPermitidas.has('conversaciones')) &&
      config.conversaciones && typeof config.conversaciones === 'object'
    ) {
      for (const [key, mensajes] of Object.entries(config.conversaciones)) {
        if (Array.isArray(mensajes)) {
          try {
            localStorage.setItem(key, JSON.stringify(mensajes));
            importedCount++;
          } catch (e) {
            console.warn('[BackupManager] Error restaurando conversaciones:', key, e);
          }
        }
      }
    }

    if (importedCount === 0) {
      return {
        success: false,
        error: 'No se encontraron datos de configuración válidos para importar',
      };
    }

    return { success: true, count: importedCount };
  } catch (error) {
    console.error('[BackupManager] Error importando configuración:', error);
    return { success: false, error: error.message || MESSAGES.PARSE_ERROR };
  }
}
