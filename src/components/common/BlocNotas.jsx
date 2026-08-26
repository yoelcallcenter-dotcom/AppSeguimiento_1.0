import React, { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Edit3, Save, FileText } from "lucide-react";
import { Btn } from "./Btn";
import { BtnOutline } from "./BtnOutline";
import { TextInput } from "./TextInput";
import { TextArea } from "./TextArea";
import { ConfirmDialog } from "./ConfirmDialog";
import { sanitizeString } from "../../utils/sanitize";
import { useBlocNotas } from "../../hooks/useBlocNotas";

const STORAGE_KEY = "bloc-notas-data";

export function BlocNotas({ caseId = null }) {
  const {
    notas,
    loading,
    crearNota,
    actualizarNota,
    eliminarNota,
    getNotasPorCaso,
  } = useBlocNotas(STORAGE_KEY);
  const [editandoId, setEditandoId] = useState(null);
  const [confirmEliminar, setConfirmEliminar] = useState(null);

  // Obtener notas según contexto (global o por caso)
  const notasMostrar = caseId ? getNotasPorCaso(caseId) : notas;

  const handleCrear = useCallback(() => {
    const nueva = crearNota({ caseId });
    setEditandoId(nueva.id);
  }, [crearNota, caseId]);

  const handleActualizar = useCallback(
    (id, campo, valor) => {
      actualizarNota(id, { [campo]: sanitizeString(valor) });
    },
    [actualizarNota]
  );

  const handleEliminar = useCallback(
    (id) => {
      eliminarNota(id);
      setConfirmEliminar(null);
      if (editandoId === id) setEditandoId(null);
    },
    [eliminarNota, editandoId]
  );

  const formatearFecha = (fecha) => {
    if (!fecha) return "";
    const d = new Date(fecha);
    return d.toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div
          className="animate-spin w-6 h-6 border-2 border-t-transparent rounded-full"
          style={{ borderColor: "var(--color-accent)" }}
        />
      </div>
    );
  }

  return (
    <div
      className="rounded-lg p-4"
      style={{
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <div className="flex items-center gap-2">
          <FileText size={18} color="var(--color-accent)" />
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--color-text)" }}
          >
            Bloc de Notas {caseId && `- Caso`}
          </span>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: "var(--color-accent)22",
              color: "var(--color-accent)",
            }}
          >
            {notasMostrar.length} notas
          </span>
        </div>
        <Btn onClick={handleCrear} icon={Plus} size="sm">
          Nueva nota
        </Btn>
      </div>

      {notasMostrar.length === 0 ? (
        <div
          className="text-center py-8 rounded"
          style={{
            backgroundColor: "var(--color-surface2)",
            border: "1px solid var(--color-border)",
          }}
        >
          <FileText
            size={32}
            className="mx-auto mb-2 opacity-50"
            color="var(--color-text-muted)"
          />
          <div className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            No hay notas guardadas
          </div>
          <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Haz clic en "Nueva nota" para comenzar
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {notasMostrar.map((nota) => {
            const isEditing = editandoId === nota.id;

            return (
              <div
                key={nota.id}
                className="rounded-lg p-3 transition-shadow hover:shadow-lg"
                style={{
                  backgroundColor: "var(--color-surface2)",
                  border: `1px solid ${
                    isEditing ? "var(--color-accent)" : "var(--color-border)"
                  }`,
                }}
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <TextInput
                      value={nota.titulo}
                      onChange={(e) =>
                        handleActualizar(nota.id, "titulo", e.target.value)
                      }
                      placeholder="Título de la nota..."
                      className="w-full font-semibold"
                      style={{ fontSize: "14px" }}
                    />
                    <TextArea
                      rows={4}
                      value={nota.contenido}
                      onChange={(e) =>
                        handleActualizar(nota.id, "contenido", e.target.value)
                      }
                      placeholder="Escribe tu nota aquí..."
                      className="w-full"
                    />
                    <div className="flex gap-2">
                      <Btn
                        onClick={() => setEditandoId(null)}
                        icon={Save}
                        size="sm"
                        color="var(--color-success)"
                      >
                        Guardar
                      </Btn>
                      <BtnOutline
                        onClick={() => setEditandoId(null)}
                        size="sm"
                        color="var(--color-text-muted)"
                      >
                        Cancelar
                      </BtnOutline>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div
                        className="text-sm font-semibold truncate"
                        style={{ color: "var(--color-text)" }}
                      >
                        {nota.titulo || "Sin título"}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditandoId(nota.id)}
                          className="p-1 rounded hover:bg-white/5 transition-colors"
                          style={{ color: "var(--color-text-muted)" }}
                          aria-label="Editar nota"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmEliminar(nota.id)}
                          className="p-1 rounded hover:bg-white/5 transition-colors"
                          style={{ color: "var(--color-danger)" }}
                          aria-label="Eliminar nota"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div
                      className="text-xs whitespace-pre-wrap line-clamp-3"
                      style={{ color: "var(--color-text)" }}
                    >
                      {nota.contenido || "(Vacío)"}
                    </div>
                    <div
                      className="text-[10px] mt-1.5"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {formatearFecha(nota.fecha)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmEliminar}
        title="Eliminar nota"
        message="¿Seguro que quieres eliminar esta nota?"
        confirmLabel="Eliminar"
        confirmColor="var(--color-danger)"
        onCancel={() => setConfirmEliminar(null)}
        onConfirm={() => handleEliminar(confirmEliminar)}
      />
    </div>
  );
}
