import React, { useRef, useState } from "react";
import { AlertTriangle, Download, RefreshCw, Upload, Wrench, X } from "lucide-react";
import useSystemStatus from "../../core/status/systemStatusStore";
import {
  aceptarPerdidaDatos,
  confirmarRecuperacionDatos,
} from "../../core/status/storageHealth";
// v1.10.8: reparación profunda (drop de las bases), snapshot local y
// descripción del salvamento en la descarga.
import { repararAlmacenamientoLocal } from "../../core/status/storageRepair";
import {
  haySnapshotLocal,
  restaurarSnapshotLocal,
} from "../../services/autoBackup";
import {
  describirSalvage,
  downloadBackup,
  importBackup,
  parseBackupJSON,
} from "../../services/backupService";
import useAppStore from "../../core/store/useAppStore";

/**
 * StorageLossBanner (v1.10.6) — banner de EMERGENCIA fijo arriba, para los
 * dos fallos críticos de información detectados en producción (1.10.2):
 *
 *  A) storageLost: Chromium abortó las operaciones con "Data lost due to
 *     missing file" (los archivos de IndexedDB desaparecieron). Las vistas
 *     pueden mostrarse VACÍAS sin reflejar los datos reales. Acciones:
 *     recargar (reparación normal del navegador), restaurar desde un archivo
 *     de backup y descartar por la sesión.
 *
 *  B) dataAlarm: la DB volvió a leerse pero con MENOS datos que la última
 *     sesión (se recreó vacía tras la recarga). Acciones: restaurar desde
 *     archivo, descargar lo que queda y "Entendido" (aceptación explícita).
 *
 * A difiere de SystemStatusBanner (informativa, dentro del contenido) en que
 * esta es fija y no depende de la vista: la pérdida de datos exige verse
 * siempre, pase lo que pase en la pantalla.
 */
const ETIQUETAS_TABLA = { cases: "casos", notes: "notas", events: "eventos" };

/** Lee un File como texto: File.text() con respaldo FileReader (jsdom/legacy). */
function leerTextoArchivo(file) {
  if (file && typeof file.text === "function") return file.text();
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || ""));
    fr.onerror = () => reject(fr.error || new Error("No se pudo leer el archivo"));
    fr.readAsText(file);
  });
}

export function StorageLossBanner() {
  const storageLost = useSystemStatus((s) => s.storageLost);
  const dataAlarm = useSystemStatus((s) => s.dataAlarm);
  // Descarte SOLO de la sesión (estado local): si la pérdida persiste, en la
  // próxima recarga el estado vuelve a montarse y el banner reaparece.
  const [descartado, setDescartado] = useState(false);
  const [restaurando, setRestaurando] = useState(false);
  // v1.10.8: reparación profunda con confirmación en dos pasos (destructiva).
  const [confirmReparar, setConfirmReparar] = useState(false);
  const [reparando, setReparando] = useState(false);
  const fileRef = useRef(null);

  const showToast = (msg, type, duration) =>
    useAppStore.getState().addToast(msg, type, duration);

  const abrirSelectorArchivo = () => fileRef.current && fileRef.current.click();

  const handleArchivo = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo
    if (!file) return;
    setRestaurando(true);
    try {
      const texto = await leerTextoArchivo(file);
      const parsed = await parseBackupJSON(texto);
      // v1.10.8 (bug 1.10.6): se le pasaba el WRAPPER de parseBackupJSON a
      // importBackup (validaba "no es un backup" y fallaba SIEMPRE); ahora se
      // importa el backup real y el mismatch de checksum queda a criterio del
      // usuario (mismo contrato de parseBackupJSON).
      if (!parsed.backup) {
        throw new Error(parsed.error || "El archivo no es un backup válido.");
      }
      const res = await importBackup(parsed.backup, {
        omitirChecksum: parsed.checksumMismatch === true,
      });
      // Limpia pérdida/alarma y sincroniza la huella (ver storageHealth).
      confirmarRecuperacionDatos(res && res.counts);
      const detalleSalvage = describirSalvage(parsed.backup.salvage);
      showToast(
        detalleSalvage
          ? `Backup restaurado con datos PARCIALES (${detalleSalvage}).`
          : "Backup restaurado correctamente.",
        detalleSalvage ? "warning" : "success",
        8000
      );
    } catch (err) {
      // Si la DB sigue ilegible, el restore falla a propósito: se guía al
      // usuario a recargar primero (no se pierde el archivo elegido).
      showToast(
        `No se pudo restaurar el backup: ${err?.message || err}. Si el almacenamiento sigue dañado, recargá la app, probá «Reparar base de datos» y volvé a intentar.`,
        "error",
        10000
      );
    } finally {
      setRestaurando(false);
    }
  };

  const handleDescargar = async () => {
    try {
      const r = await downloadBackup();
      const detalle = describirSalvage(r && r.salvage);
      showToast(
        detalle
          ? `Backup PARCIAL descargado con lo legible (${detalle}).`
          : "Backup descargado.",
        detalle ? "warning" : "success",
        detalle ? 10000 : 4000
      );
    } catch (err) {
      showToast(
        `No se pudo descargar el backup: ${err?.message || err}.`,
        "error",
        8000
      );
    }
  };

  // v1.10.8: snapshot local (localStorage) — restore aun con la base muerta.
  const handleRestaurarSnapshot = async () => {
    setRestaurando(true);
    try {
      const r = await restaurarSnapshotLocal();
      if (!r.ok) throw new Error(r.error || "No hay snapshot local.");
      confirmarRecuperacionDatos(r.counts);
      showToast("Snapshot local restaurado correctamente.", "success", 6000);
    } catch (err) {
      showToast(
        `No se pudo restaurar el snapshot local: ${err?.message || err}.`,
        "error",
        10000
      );
    } finally {
      setRestaurando(false);
    }
  };

  // v1.10.8: reparación profunda — dos pasos (el segundo es el destructivo).
  const handleReparar = async () => {
    if (!confirmReparar) {
      setConfirmReparar(true);
      return;
    }
    setReparando(true);
    try {
      const r = await repararAlmacenamientoLocal();
      // Éxito: la reparación YA disparó la recarga de la página; no hay nada
      // más que hacer acá (en jsdom el reload es un no-op y se llega igual).
      if (r && r.ok) return;
      showToast(
        r && r.bloqueado
          ? "No se pudo reparar: la base sigue abierta en otra pestaña. Cerrá TODAS las pestañas de la app e intentá de nuevo."
          : `No se pudo reparar la base de datos: ${(r && r.error) || "error desconocido"}. Cerrá otras pestañas de la app y volvé a intentar.`,
        "error",
        12000
      );
    } catch (err) {
      showToast(
        `No se pudo reparar la base de datos: ${err?.message || err}.`,
        "error",
        12000
      );
    } finally {
      setReparando(false);
      setConfirmReparar(false);
    }
  };

  if (descartado) return null;
  const esPerdida = !!storageLost;
  const esAlarma = !esPerdida && !!dataAlarm;
  if (!esPerdida && !esAlarma) return null;

  const titulo = esPerdida
    ? "Se perdió el acceso al almacenamiento local"
    : "Posible pérdida de datos";

  const mensaje = esPerdida
    ? "El navegador informó que los archivos de la base de datos local desaparecieron o están dañados. Las listas pueden mostrarse vacías o incompletas: NO reflejan tus datos reales. No cierres la app sin intentar recuperarlos."
    : `La base de datos está activa pero tiene menos datos que la última sesión (${
        (dataAlarm.perdidas || [])
          .map(
            (p) =>
              `${ETIQUETAS_TABLA[p.tabla] || p.tabla}: ${p.antes} → ${p.ahora}`
          )
          .join(", ") || "conteos inferiores"
      }). Tus datos anteriores no están visibles. Si tenés un backup descargado, restauralo desde acá.`;

  return (
    <div
      role="alert"
      className="fixed top-0 left-0 right-0 z-banner px-4 py-3"
      style={{
        backgroundColor:
          "color-mix(in srgb, var(--color-danger) 14%, var(--color-surface2))",
        borderBottom: "1px solid var(--color-danger)",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      <div className="max-w-[1400px] mx-auto flex items-start gap-3">
        <AlertTriangle
          size={18}
          className="flex-shrink-0 mt-0.5"
          style={{ color: "var(--color-danger)" }}
        />
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--color-text)" }}
          >
            {titulo}
          </p>
          <p
            className="text-xs mt-0.5"
            style={{ color: "var(--color-text-muted)" }}
          >
            {mensaje}
          </p>

          {/* Acciones */}
          <div
            className="flex flex-wrap items-center gap-2 mt-2"
            style={{ justifyContent: "flex-start" }}
          >
            {esPerdida && (
              <>
                {/* Con salvamento (1.10.8) la descarga SÍ funciona con la base
                    dañada: es la acción prioritaria ANTES de reparar. */}
                <button
                  onClick={handleDescargar}
                  disabled={restaurando}
                  className="btn-base btn-outline btn-sm"
                >
                  <Download size={14} className="mr-1.5" />
                  Descargar lo disponible
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="btn-base btn-primary btn-sm"
                >
                  <RefreshCw size={14} className="mr-1.5" />
                  Recargar la app
                </button>
                {confirmReparar ? (
                  <>
                    <button
                      onClick={handleReparar}
                      disabled={reparando}
                      className="btn-base btn-danger btn-sm"
                    >
                      <Wrench size={14} className="mr-1.5" />
                      {reparando ? "Reparando…" : "Sí, borrar y recrear la base"}
                    </button>
                    <button
                      onClick={() => setConfirmReparar(false)}
                      className="btn-base btn-outline btn-sm"
                      disabled={reparando}
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleReparar}
                    disabled={reparando}
                    className="btn-base btn-danger btn-sm"
                  >
                    <Wrench size={14} className="mr-1.5" />
                    Reparar base de datos
                  </button>
                )}
              </>
            )}
            <button
              onClick={abrirSelectorArchivo}
              disabled={restaurando}
              className="btn-base btn-danger btn-sm"
            >
              <Upload size={14} className="mr-1.5" />
              {restaurando ? "Restaurando…" : "Restaurar desde archivo"}
            </button>
            {haySnapshotLocal() && (
              <button
                onClick={handleRestaurarSnapshot}
                disabled={restaurando}
                className="btn-base btn-outline btn-sm"
              >
                <Upload size={14} className="mr-1.5" />
                Restaurar snapshot local
              </button>
            )}
            {esAlarma && (
              <>
                <button
                  onClick={handleDescargar}
                  className="btn-base btn-outline btn-sm"
                >
                  <Download size={14} className="mr-1.5" />
                  Descargar lo disponible
                </button>
                <button
                  onClick={() => aceptarPerdidaDatos()}
                  className="btn-base btn-outline btn-sm"
                >
                  Entendido, continuar
                </button>
              </>
            )}
          </div>

          {/* Ayuda: causas y pasos a seguir */}
          <details
            className="mt-2 text-xs"
            style={{ color: "var(--color-text-muted)" }}
          >
            <summary className="cursor-pointer select-none">
              ¿Por qué pasó esto y qué hago?
            </summary>
            <p className="mt-1">
              Causas habituales: limpieza de disco o antivirus sobre los
              archivos del navegador, un perfil de navegador en una carpeta
              sincronizada (OneDrive/Dropbox), cierre brusco o corrupción del
              perfil. Pasos: 1) <strong>Descargar lo disponible</strong> (con
              datos parciales si hay tablas dañadas); 2) probá{" "}
              <strong>Recargar la app</strong>; 3) si los datos no vuelven,{" "}
              <strong>Reparar base de datos</strong> (borra y recrea la base
              local — requiere confirmación —) y recién ahí{" "}
              <strong>Restaurar desde archivo</strong> o{" "}
              <strong>Restaurar snapshot local</strong>; 4) revisá
              Configuración → Sistema → Diagnóstico para el detalle.
            </p>
          </details>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          onChange={handleArchivo}
        />
        <button
          onClick={() => setDescartado(true)}
          className="flex-shrink-0 p-1 rounded-md hover:bg-white/5"
          style={{ color: "var(--color-text-muted)" }}
          aria-label="Descartar aviso de pérdida de datos (solo esta sesión)"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

export default StorageLossBanner;
