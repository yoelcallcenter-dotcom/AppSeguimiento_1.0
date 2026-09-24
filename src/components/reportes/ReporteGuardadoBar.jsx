import React, { useState, useMemo } from "react";
import { Save, Pencil, Copy, Trash2, Download, Bookmark } from "lucide-react";
import { Select } from "../common/Select";
import { FilterGroup } from "../common/filters";
import { ConfirmDialog } from "../common/ConfirmDialog";

/**
 * Barra de gestión de "Reportes guardados" para la vista Reportes.
 * Incluye el selector de reporte (aplicar), guardado del snapshot actual,
 * acciones por reporte (renombrar / duplicar / eliminar) con confirmación,
 * exportación CSV y el panel de filtros de la vista.
 */
export function ReporteGuardadoBar({
  reportes = [],
  seleccionadoId = null,
  filtros = {},
  onFiltrosChange,
  onApply,
  onSave,
  onRename,
  onDuplicate,
  onDelete,
  onExport,
  options = {},
  exportable = false,
}) {
  const [formTipo, setFormTipo] = useState(null); // null | 'nuevo' | 'renombrar'
  const [nombreInput, setNombreInput] = useState("");
  const [confirmTipo, setConfirmTipo] = useState(null); // null | 'delete' | 'replace'
  const [reemplazo, setReemplazo] = useState(null);

  const seleccionado = useMemo(
    () => reportes.find((r) => String(r.id) === String(seleccionadoId)) || null,
    [reportes, seleccionadoId]
  );

  const abrirNuevo = () => {
    setNombreInput("");
    setFormTipo("nuevo");
  };
  const abrirRenombrar = () => {
    if (!seleccionado) return;
    setNombreInput(seleccionado.nombre);
    setFormTipo("renombrar");
  };

  const confirmarForm = () => {
    const nombre = nombreInput.trim();
    if (!nombre) return;
    if (formTipo === "nuevo") {
      const existente = reportes.find(
        (r) => r.nombre.toLowerCase() === nombre.toLowerCase() && String(r.id) !== String(seleccionado?.id || '')
      );
      if (existente) {
        setReemplazo(existente);
        setConfirmTipo("replace");
        setFormTipo(null);
        return;
      }
      onSave(nombre, { reemplazarId: null });
      setFormTipo(null);
      setNombreInput("");
    } else if (formTipo === "renombrar" && seleccionado) {
      onRename(seleccionado.id, nombre);
      setFormTipo(null);
      setNombreInput("");
    }
  };

  const confirmarReemplazo = () => {
    const nombre = reemplazo?.nombre || nombreInput.trim();
    onSave(nombre, { reemplazarId: reemplazo?.id });
    setConfirmTipo(null);
    setReemplazo(null);
    setNombreInput("");
  };

  const confirmarEliminar = () => {
    if (seleccionado) onDelete(seleccionado.id);
    setConfirmTipo(null);
  };

  const set = (key) => (e) => onFiltrosChange({ ...filtros, [key]: e.target.value });

  const fields = [
    { label: "Estado", key: "estado", items: options.estados || [], all: "Todos los estados" },
    { label: "Aseguradora", key: "aseguradora", items: options.aseguradoras || [], all: "Todas las aseguradoras" },
    { label: "Localidad", key: "localidad", items: options.localidades || [], all: "Todas las localidades" },
    { label: "Estudio", key: "estudio", items: options.estudios || [], all: "Todos los estudios" },
    { label: "Tipo de ingreso", key: "tipo", items: options.tipos || [], all: "Todos los tipos" },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Bookmark size={14} style={{ color: "var(--color-text-muted)" }} />
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
          Reportes guardados
        </span>
      </div>

      {formTipo && (
        <div className="flex items-center gap-2">
          <input
            className="input-optimized"
            value={nombreInput}
            onChange={(e) => setNombreInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmarForm();
              if (e.key === "Escape") setFormTipo(null);
            }}
            placeholder={formTipo === "nuevo" ? "Nombre del reporte" : "Nuevo nombre"}
            aria-label={formTipo === "nuevo" ? "Nombre del reporte" : "Nuevo nombre"}
            autoFocus
          />
          <button type="button" className="btn-base btn-sm" onClick={confirmarForm} aria-label="Confirmar">
            Confirmar
          </button>
          <button
            type="button"
            className="btn-base btn-ghost btn-sm"
            onClick={() => {
              setFormTipo(null);
              setNombreInput("");
            }}
            aria-label="Cancelar"
          >
            Cancelar
          </button>
        </div>
      )}

      <div className="flex items-end gap-3 flex-wrap">
        <Select
          value={seleccionadoId ? String(seleccionadoId) : ""}
          onChange={(e) => onApply(e.target.value)}
          options={[
            { value: "", label: "— Ejecutar reporte —" },
            ...reportes.map((r) => ({ value: String(r.id), label: r.nombre })),
          ]}
        />

        <button
          type="button"
          className="btn-base btn-sm flex items-center gap-1.5"
          onClick={abrirNuevo}
          aria-label="Guardar filtros actuales como reporte"
        >
          <Save size={14} />
          Guardar actual
        </button>

        <button
          type="button"
          className="btn-base btn-ghost btn-sm flex items-center gap-1.5"
          onClick={abrirRenombrar}
          disabled={!seleccionado}
          aria-label="Renombrar reporte seleccionado"
        >
          <Pencil size={14} />
          Renombrar
        </button>

        <button
          type="button"
          className="btn-base btn-ghost btn-sm flex items-center gap-1.5"
          onClick={() => seleccionado && onDuplicate(seleccionado.id)}
          disabled={!seleccionado}
          aria-label="Duplicar reporte seleccionado"
        >
          <Copy size={14} />
          Duplicar
        </button>

        <button
          type="button"
          className="btn-base btn-sm flex items-center gap-1.5"
          onClick={() => setConfirmTipo("delete")}
          disabled={!seleccionado}
          style={{ backgroundColor: "var(--color-danger)", color: "var(--color-text-on-accent)" }}
          aria-label="Eliminar reporte seleccionado"
        >
          <Trash2 size={14} />
          Eliminar
        </button>

        <button
          type="button"
          className="btn-base btn-sm flex items-center gap-1.5"
          onClick={onExport}
          disabled={!exportable}
          aria-label="Exportar reporte a CSV"
        >
          <Download size={14} />
          Exportar CSV
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {fields.map((field) => {
          const { label, key, items, all } = field;
          return (
            <FilterGroup key={key} label={label}>
              <Select
                value={String(filtros?.[key] || "todos")}
                onChange={set(key)}
                options={[{ value: "todos", label: all }, ...items.map((v) => ({ value: v, label: v }))]}
              />
            </FilterGroup>
          );
        })}
      </div>

      <ConfirmDialog
        open={confirmTipo === "delete"}
        title="Eliminar reporte"
        message={`¿Eliminar el reporte "${seleccionado?.nombre || ""}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={confirmarEliminar}
        onCancel={() => setConfirmTipo(null)}
      />

      <ConfirmDialog
        open={confirmTipo === "replace"}
        title="Reemplazar reporte"
        message={`Ya existe un reporte llamado "${reemplazo?.nombre || ""}". ¿Desea reemplazarlo con los filtros actuales?`}
        confirmLabel="Reemplazar"
        onConfirm={confirmarReemplazo}
        onCancel={() => {
          setConfirmTipo(null);
          setReemplazo(null);
        }}
      />
    </div>
  );
}