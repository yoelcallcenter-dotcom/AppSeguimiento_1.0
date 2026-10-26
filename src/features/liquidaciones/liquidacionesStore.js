/**
 * liquidacionesStore.js
 * Persistencia del módulo de Liquidaciones (v1.10.4) sobre appDB (Dexie).
 *
 * Dos tablas nuevas (AppData v11, aditivas — sin migración destructiva):
 * - `liquidaciones`: UN documento por período (id = periodoKey "YYYY-MM") con
 *   cabecera, snapshot de reglas, ajustes manuales, operadores con sus
 *   conceptos y totales. Estado 'preparacion' (recalculable) o 'cerrada'
 *   (instantánea congelada: tarifas posteriores no la tocan).
 * - `liquidacion_top`: participación manual en el top por (período, estudio),
 *   independiente del cierre: persiste al navegar/recargar y NO se copia
 *   entre períodos (id = "periodoKey::estudio"). v1.10.5: lleva además el
 *   puesto asignado manualmente (campo opcional, schemaless).
 *
 * v1.10.5 agrega además la tabla `liquidacion_config_history` (AppData v12),
 * el historial de auditoría de cambios de configuración (§7D).
 */

import appDB from "../../core/db/appDB";
import { reportError } from "../../core/error/reportError";

/** Clave de período: "YYYY-MM" (mes de las firmas, 0-based en el input). */
export function periodoKeyDe(year, month) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function topId(periodoKey, estudio) {
  return `${periodoKey}::${estudio}`;
}

/** Lee el documento de liquidación de un período (o null). */
export async function getLiquidacion(periodoKey) {
  try {
    return (await appDB.liquidaciones.get(periodoKey)) || null;
  } catch (err) {
    reportError(err, { origen: "liquidacionesStore.getLiquidacion", periodoKey });
    throw err;
  }
}

/**
 * Upsert del documento de liquidación (id = periodoKey). Congela updatedAt;
 * conserva createdAt si el doc ya existía (historial honesto).
 */
export async function guardarLiquidacion(doc) {
  try {
    const now = new Date().toISOString();
    const prev = await appDB.liquidaciones.get(doc.periodoKey);
    const row = {
      ...doc,
      id: doc.periodoKey,
      periodoKey: doc.periodoKey,
      createdAt: prev?.createdAt || now,
      updatedAt: now,
    };
    await appDB.liquidaciones.put(row);
    return row;
  } catch (err) {
    reportError(err, { origen: "liquidacionesStore.guardarLiquidacion", periodoKey: doc?.periodoKey });
    throw err;
  }
}

/** Top manual de un período: [{ id, periodoKey, estudio, enTop, updatedAt }]. */
export async function getTopDelPeriodo(periodoKey) {
  try {
    return await appDB.liquidacion_top.where("periodoKey").equals(periodoKey).toArray();
  } catch (err) {
    reportError(err, { origen: "liquidacionesStore.getTopDelPeriodo", periodoKey });
    throw err;
  }
}

/**
 * Marca/desmarca a un estudio como integrante del top DEL PERÍODO elegido.
 * Es una declaración manual (1.10.4 no verifica ranking): el registro guarda
 * también la fecha de modificación. Reemplaza el estado previo del mismo
 * (período, estudio) — nunca toca otros períodos.
 *
 * v1.10.5: `puesto` (§6F) es la asignación MANUAL de lugar dentro del top
 * (1..N). Es opcional y null = "pendiente de asignación". Se guarda en el
 * mismo registro (campo schemaless: no cambia índices de Dexie, sin bump de
 * versión). Nunca se asigna un puesto automáticamente.
 */
export async function setTopDelPeriodo(periodoKey, estudio, enTop, puesto = null) {
  try {
    const id = topId(periodoKey, estudio);
    const now = new Date().toISOString();
    if (!enTop) {
      await appDB.liquidacion_top.delete(id);
      return null;
    }
    const row = {
      id,
      periodoKey,
      estudio,
      enTop: true,
      // Lugar explícito o null (pendiente). Se fuerza a entero ≥ 1 si viene.
      puesto: Number.isInteger(Number(puesto)) && Number(puesto) >= 1 ? Math.floor(Number(puesto)) : null,
      updatedAt: now,
    };
    await appDB.liquidacion_top.put(row);
    return row;
  } catch (err) {
    reportError(err, { origen: "liquidacionesStore.setTopDelPeriodo", periodoKey, estudio });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// v1.10.5: historial de configuraciones (§7D — auditoría)
// ---------------------------------------------------------------------------

/**
 * Registra un cambio de la configuración de liquidaciones: fecha, campo,
 * valor anterior y valor nuevo (la app NO tiene autenticación: no se inventa
 * autor, sólo timestamps honestos).
 */
export async function registrarCambioConfig({ campo, valorAnterior, valorNuevo }) {
  try {
    const now = new Date().toISOString();
    const row = {
      fecha: now,
      campo: String(campo ?? ""),
      valorAnterior: typeof valorAnterior === "string" ? valorAnterior : JSON.stringify(valorAnterior ?? null),
      valorNuevo: typeof valorNuevo === "string" ? valorNuevo : JSON.stringify(valorNuevo ?? null),
      createdAt: now,
    };
    await appDB.liquidacion_config_history.add(row);
    return row;
  } catch (err) {
    reportError(err, { origen: "liquidacionesStore.registrarCambioConfig", campo });
    throw err;
  }
}

/** Últimos cambios de configuración registrados (más recientes primero). */
export async function getHistorialConfig(limite = 200) {
  try {
    const rows = await appDB.liquidacion_config_history.orderBy("fecha").reverse().toArray();
    return typeof limite === "number" && limite > 0 ? rows.slice(0, limite) : rows;
  } catch (err) {
    reportError(err, { origen: "liquidacionesStore.getHistorialConfig" });
    throw err;
  }
}
