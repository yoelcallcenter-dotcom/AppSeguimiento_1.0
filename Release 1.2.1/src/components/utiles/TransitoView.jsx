import React, { useState, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Btn } from "../common/Btn";
import { TextInput } from "../common/TextInput";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { sanitizeString } from "../../utils/sanitize";
import { OPCIONES_TRANSITO } from "../../utils/constants";
import { STORAGE_KEYS } from "../../utils/backup/constants";
import { useStorage } from "../../hooks/useStorage";

export function TransitoView({
  aseguradorasTransito,
  observaciones,
  setObservaciones,
  showToast,
}) {
  const [nuevaObs, setNuevaObs] = useState("");
  // Selección de píldoras persistida: sobrevive cambios de vista y recargas,
  // y se incluye en backups al estar declarada en CONFIG_KEYS.
  const [seleccionadas, setSeleccionadas] = useStorage(
    STORAGE_KEYS.TRANSITO_SELECCION,
    []
  );
  const [confirmEliminar, setConfirmEliminar] = useState(null);
  const uid = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  // Claves válidas según las aseguradoras actuales: descarta selecciones huérfanas.
  const clavesValidas = useMemo(() => {
    const set = new Set();
    (aseguradorasTransito || []).forEach((a) =>
      OPCIONES_TRANSITO.forEach((op) => set.add(`${a.nombre}_${op}`))
    );
    return set;
  }, [aseguradorasTransito]);

  const seleccionActivas = useMemo(
    () =>
      ((Array.isArray(seleccionadas) && seleccionadas) || []).filter((k) =>
        clavesValidas.has(k)
      ),
    [seleccionadas, clavesValidas]
  );

  const toggleSeleccion = (nombre) => {
    setSeleccionadas((prev) => {
      const base = (Array.isArray(prev) ? prev : []).filter((k) =>
        clavesValidas.has(k)
      );
      return base.includes(nombre)
        ? base.filter((n) => n !== nombre)
        : [...base, nombre];
    });
  };
  const agregarObs = () => {
    const sanitized = sanitizeString(nuevaObs.trim());
    if (!sanitized) return;
    setObservaciones([...observaciones, { id: uid(), contenido: sanitized }]);
    setNuevaObs("");
    showToast("Observación agregada", "success");
  };
  const eliminarObs = (id) => {
    setObservaciones(observaciones.filter((o) => o.id !== id));
    setConfirmEliminar(null);
    showToast("Observación eliminada", "info");
  };
  const editarObs = (id, valor) => {
    const sanitized = sanitizeString(valor);
    setObservaciones(
      observaciones.map((o) =>
        o.id === id ? { ...o, contenido: sanitized } : o
      )
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <div
          className="text-sm font-semibold mb-2"
          style={{ color: "var(--color-text)" }}
        >
          Aseguradoras de Tránsito
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {aseguradorasTransito.map((a) => (
            <div
              key={a.id}
              className="rounded-lg p-3"
              style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div
                className="font-semibold text-sm mb-1.5"
                style={{ color: "var(--color-text)" }}
              >
                {sanitizeString(a.nombre)}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {OPCIONES_TRANSITO.map((op) => (
                  <button
                    key={op}
                    onClick={() => toggleSeleccion(`${a.nombre}_${op}`)}
                    className={`text-[10px] px-2 py-0.5 rounded-full transition-colors hover:opacity-70 ${
                      seleccionActivas.includes(`${a.nombre}_${op}`)
                        ? "bg-[var(--color-accent)] text-[#14181F]"
                        : "bg-[var(--color-surface2)] text-[var(--color-text-muted)]"
                    }`}
                    style={{ border: "1px solid var(--color-border)" }}
                  >
                    {op}
                  </button>
                ))}
              </div>
              {a.observaciones && (
                <div
                  className="text-xs mt-1.5"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Obs: {sanitizeString(a.observaciones)}
                </div>
              )}
            </div>
          ))}
          {aseguradorasTransito.length === 0 && (
            <div
              className="text-sm py-4 text-center col-span-2"
              style={{ color: "var(--color-text-muted)" }}
            >
              No hay aseguradoras de tránsito cargadas.
            </div>
          )}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <div
            className="text-sm font-semibold"
            style={{ color: "var(--color-text)" }}
          >
            Observaciones de Tránsito
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <TextInput
              placeholder="Nueva observación..."
              value={nuevaObs}
              onChange={(e) => setNuevaObs(e.target.value)}
              style={{ width: 250 }}
            />
            <Btn onClick={agregarObs} icon={Plus} size="sm">
              Agregar
            </Btn>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {observaciones.map((o) => (
            <div
              key={o.id}
              className="rounded-lg p-2 flex gap-2 items-center"
              style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              <TextInput
                value={o.contenido}
                onChange={(e) => editarObs(o.id, e.target.value)}
                className="flex-1"
              />
              <button
                onClick={() => setConfirmEliminar(o.id)}
                className="p-1 rounded hover:opacity-70 transition-opacity"
              >
                <Trash2 size={14} style={{ color: "var(--color-danger)" }} />
              </button>
            </div>
          ))}
          {observaciones.length === 0 && (
            <div
              className="text-xs py-4 text-center col-span-2"
              style={{ color: "var(--color-text-muted)" }}
            >
              Sin observaciones cargadas.
            </div>
          )}
        </div>
        <ConfirmDialog
          open={!!confirmEliminar}
          title="Eliminar observación"
          message="Seguro que quieres eliminar esta observación?"
          confirmLabel="Eliminar"
          confirmColor="var(--color-danger)"
          onCancel={() => setConfirmEliminar(null)}
          onConfirm={() => eliminarObs(confirmEliminar)}
        />
      </div>
    </div>
  );
}
