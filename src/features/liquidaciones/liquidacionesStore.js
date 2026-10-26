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
 *   entre períodos (id = "periodoKey::estudio").
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
 */
export async function setTopDelPeriodo(periodoKey, estudio, enTop) {
  try {
    const id = topId(periodoKey, estudio);
    const now = new Date().toISOString();
    if (!enTop) {
      await appDB.liquidacion_top.delete(id);
      return null;
    }
    const row = { id, periodoKey, estudio, enTop: true, updatedAt: now };
    await appDB.liquidacion_top.put(row);
    return row;
  } catch (err) {
    reportError(err, { origen: "liquidacionesStore.setTopDelPeriodo", periodoKey, estudio });
    throw err;
  }
}
