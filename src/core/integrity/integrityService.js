/**
 * integrityService.js
 * Servicio de integridad de datos (Release 1.3.3).
 *
 * - Verificación ligera al iniciar (configuración + preferencias): barata,
 *   nunca bloquea el arranque y solo informa problemas CRITICAL.
 * - Verificación completa bajo demanda (Diagnóstico): huérfanos, duplicados,
 *   historial y último backup válido.
 * - Log rotativo de eventos de integridad (máximo 50 entradas).
 *
 * Este servicio NUNCA modifica datos del usuario por su cuenta: solo detecta,
 * clasifica e informa. Las reparaciones son acciones explícitas de la UI.
 */

import appDB from '../db/appDB';
import casesDB from '../db/casesDB';
import { exportBackup } from '../../services/backupService';
import { getBackupHistory } from '../../services/autoBackup';
import { notifyChange, SYNC_EVENTS } from '../sync/syncService';
import { localStorageAdapter } from '../storage/localStorageAdapter';
import { ORDENES_DEFAULT } from '../store/useAppStore';
import {
  validateConfigIntegrity,
} from './dataValidation';
import {
  detectarHuerfanos,
  detectarDuplicadosCasos,
  repararPreferenciasPersistidas,
} from './referentialChecks';

const LOG_KEY = 'app_integrity_log';
const LAST_CHECK_KEY = 'app_integrity_last_check';
const VIEW_ORDERS_KEY = 'app-view-orders';
const MAX_LOG_ENTRIES = 50;
const LIMITE_PROBLEMAS = 100;

// ============================================================
// LOG ROTATIVO
// ============================================================
export function registrarEventoIntegridad(tipo, detalle = '') {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    const log = raw ? JSON.parse(raw) : [];
    const entrada = { ts: new Date().toISOString(), tipo, detalle: String(detalle).slice(0, 300) };
    const siguiente = [...log, entrada].slice(-MAX_LOG_ENTRIES);
    localStorage.setItem(LOG_KEY, JSON.stringify(siguiente));
    return entrada;
  } catch {
    return null;
  }
}

export function leerLogIntegridad() {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    const log = raw ? JSON.parse(raw) : [];
    return Array.isArray(log) ? [...log].reverse() : [];
  } catch {
    return [];
  }
}

export function ultimaVerificacion() {
  try {
    return localStorage.getItem(LAST_CHECK_KEY) || null;
  } catch {
    return null;
  }
}

// ============================================================
// SALVAGUARDA ANTES DE OPERACIONES CRÍTICAS
// ============================================================
/**
 * Crea un snapshot completo en Historial de backups con kind 'safeguard'
 * ("Seguridad"). Best-effort: si falla NO bloquea la operación principal,
 * pero el fallo queda registrado en el log de integridad.
 * @returns {Promise<{id: number|null}>}
 */
export async function salvaguardarOperacionCritica(motivo = 'operación crítica') {
  try {
    const backup = await exportBackup();
    const id = await appDB.auto_backups.add({
      timestamp: new Date().toISOString(),
      kind: 'safeguard',
      sizeKB: (() => {
        try { return Math.max(1, Math.round(JSON.stringify(backup).length / 1024)); } catch { return 1; }
      })(),
      counts: {
        cases: backup.data?.db?.cases?.length || 0,
        notes: backup.data?.db?.notes?.length || 0,
        events: backup.data?.db?.events?.length || 0,
      },
      backup,
    });
    registrarEventoIntegridad('salvaguarda', `Snapshot creado antes de ${motivo}`);
    return { id };
  } catch (err) {
    registrarEventoIntegridad('salvaguarda-fallo', `No se pudo crear snapshot antes de ${motivo}: ${err?.message || err}`);
    return { id: null };
  }
}

// ============================================================
// VERIFICACIONES
// ============================================================
function verificarConfiguracion() {
  let cruda = null;
  try {
    cruda = localStorageAdapter.get('config-art-tracker');
  } catch {
    cruda = null;
  }
  if (!cruda) {
    return { ok: true, warnings: [], nota: 'Sin configuración personalizada (se usan defaults)' };
  }
  const resultado = validateConfigIntegrity(cruda);
  return {
    ok: resultado.valid && !resultado.recoverable,
    warnings: resultado.warnings || [],
    errors: resultado.errors || [],
    normalizedData: resultado.normalizedData,
  };
}

function verificarPreferenciasOrden() {
  // Listas canónicas tomadas del estado inicial del store (única fuente).
  let persisted = null;
  try {
    const raw = localStorage.getItem(VIEW_ORDERS_KEY);
    persisted = raw ? JSON.parse(raw) : null;
  } catch {
    return { ok: false, problema: 'Las preferencias de orden no se pueden leer (JSON inválido)' };
  }
  if (!persisted) return { ok: true };

  const reparaciones = repararPreferenciasPersistidas(persisted, ORDENES_DEFAULT);
  return {
    ok: reparaciones.cambios.length === 0,
    reparaciones: reparaciones.cambios,
    reparado: reparaciones.patch,
  };
}

/**
 * Verificación de integridad.
 * @param {{completo?: boolean}} opts
 * @returns {Promise<object>} informe estructurado.
 */
export async function runIntegrityCheck({ completo = false } = {}) {
  const informe = {
    timestamp: new Date().toISOString(),
    modo: completo ? 'completo' : 'ligero',
    config: null,
    preferencias: null,
    huerfanos: null,
    duplicados: null,
    historial: null,
    ultimoBackup: null,
    problemas: [],
  };
  const pushProblema = (nivel, mensaje) => {
    if (informe.problemas.length < LIMITE_PROBLEMAS) informe.problemas.push({ nivel, mensaje });
  };

  try {
    informe.config = verificarConfiguracion();
    if (informe.config.ok === false && informe.config.errors?.length) {
      pushProblema('critical', 'La configuración guardada tiene errores estructurales');
    } else if (informe.config.warnings?.length) {
      pushProblema('warning', `Configuración con valores reparados: ${informe.config.warnings.join('; ')}`);
    }
  } catch (err) {
    pushProblema('warning', `No se pudo revisar la configuración: ${err?.message || err}`);
  }

  try {
    informe.preferencias = verificarPreferenciasOrden();
    if (informe.preferencias.ok === false) {
      pushProblema('warning', informe.preferencias.problema);
    } else if (informe.preferencias.reparaciones?.length) {
      pushProblema('info', `Órdenes de secciones desactualizadas (${informe.preferencias.reparaciones.length}); se aplicará la corrección al reiniciar o puede restablecerlas desde acá`);
    }
  } catch (err) {
    pushProblema('warning', `No se pudieron revisar las preferencias: ${err?.message || err}`);
  }

  if (completo) {
    try {
      const [casos, notas, eventos] = await Promise.all([
        casesDB.cases.toArray(),
        appDB.notes.toArray(),
        appDB.events.toArray(),
      ]);
      informe.huerfanos = detectarHuerfanos({ casos, notas, eventos });
      if (informe.huerfanos.notasHuerfanas.length > 0) {
        pushProblema('warning', `${informe.huerfanos.notasHuerfanas.length} nota(s) apuntan a casos inexistentes`);
      }
      if (informe.huerfanos.eventosHuerfanos.length > 0) {
        pushProblema('warning', `${informe.huerfanos.eventosHuerfanos.length} evento(s) del calendario apuntan a casos inexistentes`);
      }

      informe.duplicados = detectarDuplicadosCasos(casos);
      if (informe.duplicados.tecnicos.length > 0) {
        pushProblema('critical', `${informe.duplicados.tecnicos.length} ID(s) de caso duplicados`);
      }
      if (informe.duplicados.posibles.length > 0) {
        pushProblema('warning', `${informe.duplicados.posibles.length} posible(s) caso duplicado (mismo nombre y teléfono)`);
      }

      // Muestra de sanidad del historial (estructura, no contenido).
      try {
        const eventosHist = await casesDB.case_history.limit(500).toArray();
        let invalidos = 0;
        for (const ev of eventosHist) {
          if (!ev || !ev.caseId || !ev.type || isNaN(new Date(ev.timestamp).getTime())) invalidos += 1;
        }
        informe.historial = { revisados: eventosHist.length, invalidos };
        if (invalidos > 0) pushProblema('warning', `${invalidos} evento(s) de historial con estructura incompleta (se conservan)`);
      } catch {
        informe.historial = { revisados: 0, invalidos: 0 };
      }
    } catch (err) {
      pushProblema('error', `No se pudo completar la verificación de datos: ${err?.message || err}`);
    }

    try {
      const historial = await getBackupHistory();
      const ultimo = historial?.[0];
      informe.ultimoBackup = ultimo
        ? { timestamp: ultimo.timestamp, kind: ultimo.kind, sizeKB: ultimo.sizeKB }
        : null;
      if (!ultimo) {
        pushProblema('warning', 'Todavía no existe ningún backup en el historial');
      }
    } catch (err) {
      pushProblema('warning', `No se pudo leer el historial de backups: ${err?.message || err}`);
    }
  }

  try {
    localStorage.setItem(LAST_CHECK_KEY, informe.timestamp);
    registrarEventoIntegridad(
      'verificacion',
      `${informe.modo}: ${informe.problemas.length} hallazgo(s)`
    );
  } catch { /* almacenamiento no disponible */ }

  return informe;
}

/**
 * Reparación manual segura: restablece las preferencias de orden a sus
 * defaults. Solo toca la clave 'app-view-orders'; los datos no se alteran.
 * El cambio se propaga a otras pestañas vía sincronización existente.
 * @returns {boolean} true si se restableció.
 */
export function restablecerPreferenciasOrden() {
  try {
    localStorage.removeItem(VIEW_ORDERS_KEY);
    registrarEventoIntegridad('reparacion', 'Preferencias de orden restablecidas a defaults');
    notifyChange(SYNC_EVENTS.DATA_CLEARED, { source: 'integrity-repair' });
    return true;
  } catch {
    return false;
  }
}
