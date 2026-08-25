import React, { useState } from "react";
import { Plus, Trash2, Briefcase } from "lucide-react";
import { TextInput } from "../common/TextInput";
import { Btn } from "../common/Btn";
import { sanitizeString } from "../../utils/sanitize";
import { uid } from "../../utils/dateUtils";
import { ConfirmDialog } from "../common/ConfirmDialog";

export function ProlegalView({ mapeo, setMapeo }) {
  const [confirmarEliminar, setConfirmarEliminar] = useState(null);

  const editar = (id, campo, valor) => {
    const v = sanitizeString(valor);
    setMapeo(mapeo.map((m) => (m.id === id ? { ...m, [campo]: v } : m)));
  };

  const agregar = () => {
    setMapeo([
      ...mapeo,
      { id: uid(), estudio: "", cargaProlegal: "", entrevistador: "" },
    ]);
  };

  const eliminar = (id) => {
    setMapeo(mapeo.filter((m) => m.id !== id));
    setConfirmarEliminar(null);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <div
          className="text-sm font-semibold"
          style={{ color: "var(--color-text)" }}
        >
          Prolegal
        </div>
      </div>
      <div
        className="text-xs mb-3"
        style={{ color: "var(--color-text-muted)" }}
      >
        Estudio Jurídico, carga Prolegal y entrevistador de cada estudio.
      </div>

      <div
        className="rounded-lg overflow-hidden"
        style={{ border: "1px solid var(--color-border)" }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: "var(--color-surface)" }}>
              <th
                className="text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "var(--color-text-muted)" }}
              >
                Estudio Jurídico
              </th>
              <th
                className="text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "var(--color-text-muted)" }}
              >
                Carga Prolegal
              </th>
              <th
                className="text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "var(--color-text-muted)" }}
              >
                Entrevistador
              </th>
              <th className="px-3 py-2.5" style={{ width: 44 }} />
            </tr>
          </thead>
          <tbody>
            {mapeo.map((m, i) => (
              <tr
                key={m.id}
                style={{
                  backgroundColor:
                    i % 2 ? "var(--color-surface2)" : "var(--color-surface3)",
                  borderTop: "1px solid var(--color-border)",
                }}
              >
                <td className="px-3 py-2 min-w-[200px]">
                  <TextInput
                    value={m.estudio}
                    onChange={(e) => editar(m.id, "estudio", e.target.value)}
                    placeholder="Estudio Jurídico"
                  />
                </td>
                <td className="px-3 py-2 min-w-[160px]">
                  <TextInput
                    value={m.cargaProlegal || ""}
                    onChange={(e) =>
                      editar(m.id, "cargaProlegal", e.target.value)
                    }
                    placeholder="Carga Prolegal"
                  />
                </td>
                <td className="px-3 py-2 min-w-[160px]">
                  <TextInput
                    value={m.entrevistador || ""}
                    onChange={(e) =>
                      editar(m.id, "entrevistador", e.target.value)
                    }
                    placeholder="Entrevistador"
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => setConfirmarEliminar(m)}
                    className="p-1.5 rounded transition-colors hover:bg-[var(--color-surface)]"
                    style={{ color: "var(--color-danger)" }}
                    aria-label="Eliminar estudio"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {mapeo.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-8 text-center text-sm"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  <Briefcase
                    size={20}
                    style={{ margin: "0 auto 8px", opacity: 0.4 }}
                  />
                  No hay estudios cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3">
        <Btn onClick={agregar} icon={Plus} size="sm">
          Agregar estudio
        </Btn>
      </div>

      <ConfirmDialog
        open={!!confirmarEliminar}
        title="Eliminar estudio"
        message={`¿Eliminar "${sanitizeString(
          confirmarEliminar?.estudio || "este estudio"
        )}"?`}
        confirmLabel="Eliminar"
        confirmColor="var(--color-danger)"
        onCancel={() => setConfirmarEliminar(null)}
        onConfirm={() => eliminar(confirmarEliminar.id)}
      />
    </div>
  );
}

export default ProlegalView;
