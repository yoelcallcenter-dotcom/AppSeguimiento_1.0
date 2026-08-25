import React, { useState } from "react";
import { Plus, FileText, Upload, Trash2 } from "lucide-react";
import { Btn } from "../common/Btn";
import { BtnOutline } from "../common/BtnOutline";
import { TextInput } from "../common/TextInput";
import { TextArea } from "../common/TextArea";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { sanitizeString } from "../../utils/sanitize";
import { hoyISO } from "../../utils/dateUtils";

export function LesionesView({ lesiones, setLesiones, showToast }) {
  const [nuevaLesion, setNuevaLesion] = useState("");
  const [nuevaObservacion, setNuevaObservacion] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] =
    useState("Accidente Laboral");
  const [confirmEliminar, setConfirmEliminar] = useState(null);

  const categorias = [
    "Accidente Laboral",
    "Enfermedad Profesional",
    "No Viable",
  ];
  const uid = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  const agregar = () => {
    const sanitizedNombre = sanitizeString(nuevaLesion.trim());
    const sanitizedObs = sanitizeString(nuevaObservacion.trim());
    if (!sanitizedNombre) return;
    setLesiones({
      ...lesiones,
      [categoriaSeleccionada]: [
        ...(lesiones[categoriaSeleccionada] || []),
        { id: uid(), nombre: sanitizedNombre, observacion: sanitizedObs },
      ],
    });
    setNuevaLesion("");
    setNuevaObservacion("");
    showToast("Lesión agregada", "success");
  };

  const eliminar = (categoria, id) => {
    setLesiones({
      ...lesiones,
      [categoria]: (lesiones[categoria] || []).filter((l) => l.id !== id),
    });
    setConfirmEliminar(null);
    showToast("Lesión eliminada", "info");
  };

  const editar = (categoria, id, campo, valor) => {
    const sanitized = sanitizeString(valor);
    setLesiones({
      ...lesiones,
      [categoria]: (lesiones[categoria] || []).map((l) =>
        l.id === id ? { ...l, [campo]: sanitized } : l
      ),
    });
  };

  const exportar = () => {
    const data = JSON.stringify(lesiones, null, 2);
    const blob = new Blob([data], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lesiones_${hoyISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Exportación completada", "success");
  };

  const importar = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const keys = Object.keys(parsed);
        const nuevo = {};
        keys.forEach((k) => {
          if (Array.isArray(parsed[k])) {
            nuevo[k] = parsed[k].map((item) => ({
              id: uid(),
              nombre: sanitizeString(item.nombre || item || ""),
              observacion: sanitizeString(
                item.observacion || item.observaciones || ""
              ),
            }));
          }
        });
        setLesiones({ ...lesiones, ...nuevo });
        showToast("Lesiones importadas", "success");
      } catch {
        alert("El archivo no es un JSON válido.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {categorias.map((c) => (
          <button
            key={c}
            className={`category-tab ${
              categoriaSeleccionada === c ? "active" : ""
            }`}
            onClick={() => setCategoriaSeleccionada(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <TextInput
          placeholder="Nombre de la lesión"
          value={nuevaLesion}
          onChange={(e) => setNuevaLesion(e.target.value)}
          style={{ width: 220 }}
        />
        <TextInput
          placeholder="Observación"
          value={nuevaObservacion}
          onChange={(e) => setNuevaObservacion(e.target.value)}
          style={{ width: 220 }}
        />
        <Btn onClick={agregar} icon={Plus} size="sm">
          Agregar
        </Btn>
        <BtnOutline
          onClick={exportar}
          icon={FileText}
          size="sm"
          color="var(--color-accent)"
        >
          Exportar
        </BtnOutline>
        <label
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors hover:opacity-70"
          style={{
            backgroundColor: "transparent",
            border: "1px solid var(--color-accent)",
            color: "var(--color-accent)",
          }}
        >
          <Upload size={13} /> Importar
          <input
            type="file"
            accept=".json,application/json"
            onChange={importar}
            className="hidden"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div
          className="rounded-lg p-3"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div
            className="text-xs font-bold uppercase tracking-wider mb-2"
            style={{ color: "var(--color-accent)" }}
          >
            {categoriaSeleccionada}
          </div>
          <div className="space-y-2">
            {(lesiones[categoriaSeleccionada] || []).length === 0 ? (
              <div
                className="text-[11px] text-center py-4"
                style={{ color: "var(--color-text-muted)" }}
              >
                Sin lesiones en esta categoría
              </div>
            ) : (
              (lesiones[categoriaSeleccionada] || []).map((l) => (
                <div
                  key={l.id}
                  className="flex flex-col gap-1 p-2 rounded"
                  style={{
                    backgroundColor: "var(--color-surface2)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div className="flex gap-1 items-center">
                    <TextInput
                      value={l.nombre}
                      onChange={(e) =>
                        editar(
                          categoriaSeleccionada,
                          l.id,
                          "nombre",
                          e.target.value
                        )
                      }
                      className="flex-1"
                      placeholder="Nombre"
                    />
                    <button
                      onClick={() =>
                        setConfirmEliminar({
                          categoria: categoriaSeleccionada,
                          id: l.id,
                        })
                      }
                      className="p-1 rounded hover:opacity-70 transition-opacity"
                    >
                      <Trash2
                        size={14}
                        style={{ color: "var(--color-danger)" }}
                      />
                    </button>
                  </div>
                  <div className="flex gap-1">
                    <TextArea
                      value={l.observacion || ""}
                      onChange={(e) =>
                        editar(
                          categoriaSeleccionada,
                          l.id,
                          "observacion",
                          e.target.value
                        )
                      }
                      className="flex-1"
                      placeholder="Observación..."
                      rows={1}
                      style={{
                        fontSize: "12px",
                        padding: "4px 8px",
                        minHeight: "30px",
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmEliminar}
        title="Eliminar lesión"
        message="¿Seguro que quieres eliminar esta lesión?"
        confirmLabel="Eliminar"
        confirmColor="var(--color-danger)"
        onCancel={() => setConfirmEliminar(null)}
        onConfirm={() =>
          eliminar(confirmEliminar.categoria, confirmEliminar.id)
        }
      />
    </div>
  );
}
