import React, { useState } from "react";
import { Send, Trash2, User, Clock, MessageCircle } from "lucide-react";
import { Btn } from "../common/Btn";
import { TextArea } from "../common/TextArea";
import { Select } from "../common/Select";
import { ConfirmDialog } from "../common/ConfirmDialog";

export function ComentariosUI({
  comentarios = [],
  onAdd,
  onDelete,
  showToast,
  usuario = "Usuario",
  loading = false,
  tiposInteraccion = null,
}) {
  const [nuevoComentario, setNuevoComentario] = useState("");
  const [tipoInteraccion, setTipoInteraccion] = useState("");
  const [confirmEliminar, setConfirmEliminar] = useState(null);

  const handleAdd = () => {
    const text = nuevoComentario.trim();
    if (!text) {
      if (showToast) showToast("Escribe un comentario", "warning");
      return;
    }
    // Llamar a onAdd con el texto (y el tipo de interacción si aplica)
    onAdd(text, tipoInteraccion || "");
    setNuevoComentario("");
    setTipoInteraccion("");
  };

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

  const getInitials = (nombre) => {
    return (nombre || "U").charAt(0).toUpperCase();
  };

  const getColor = (id) => {
    const colors = [
      "#3B82F6",
      "#6366F1",
      "#8B5CF6",
      "#EC4899",
      "#F43F5E",
      "#F97316",
      "#F59E0B",
      "#10B981",
      "#059669",
      "#14B8A6",
    ];
    const index = (id || 0).toString().length % colors.length;
    return colors[index];
  };

  const handleConfirmDelete = () => {
    if (confirmEliminar !== null) {
      onDelete(confirmEliminar);
      setConfirmEliminar(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Lista de comentarios estilo burbujas */}
      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
        {comentarios && comentarios.length > 0 ? (
          comentarios.map((c, i) => {
            const color = getColor(c.id || i);
            const autor = c.usuario || usuario;
            const fecha = c.fecha || c.fechaIngreso || new Date().toISOString();

            return (
              <div
                key={c.id || i}
                className="flex items-start gap-2 animate-fade-in"
              >
                {/* Avatar */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{
                    backgroundColor: color + "33",
                    color: color,
                    border: `2px solid ${color}55`,
                  }}
                >
                  {getInitials(autor)}
                </div>

                {/* Burbuja de comentario */}
                <div
                  className="flex-1 rounded-lg p-3"
                  style={{
                    backgroundColor: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-xs font-semibold"
                        style={{ color: "var(--color-accent)" }}
                      >
                        {autor}
                      </span>
                      {c.tipo && (
                        <span
                          className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{
                            backgroundColor: "var(--color-accent)22",
                            color: "var(--color-accent)",
                          }}
                        >
                          {c.tipo}
                        </span>
                      )}
                      <span
                        className="text-[10px] flex items-center gap-1"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        <Clock size={10} />
                        {formatearFecha(fecha)}
                      </span>
                    </div>
                    <button
                      onClick={() => setConfirmEliminar(c.id || i)}
                      className="p-1 rounded hover:bg-white/5 transition-colors flex-shrink-0"
                      style={{ color: "var(--color-text-muted)" }}
                      aria-label="Eliminar comentario"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div
                    className="text-sm mt-1 leading-relaxed whitespace-pre-wrap"
                    style={{ color: "var(--color-text)" }}
                  >
                    {c.texto}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div
            className="text-center py-8 text-sm flex flex-col items-center gap-2"
            style={{ color: "var(--color-text-muted)" }}
          >
            <MessageCircle size={32} className="opacity-30" />
            <span>No hay comentarios</span>
            <span className="text-xs">Agrega uno escribiendo abajo</span>
          </div>
        )}
      </div>

      {/* Input para nuevo comentario */}
      {tiposInteraccion && tiposInteraccion.length > 0 && (
        <Select
          value={tipoInteraccion}
          onChange={(e) => setTipoInteraccion(e.target.value)}
          options={[
            { value: "", label: "Interacción (opcional)…" },
            ...tiposInteraccion.map((t) => ({ value: t, label: t })),
          ]}
          aria-label="Tipo de interacción"
        />
      )}
      <div className="flex gap-2 items-end mt-2">
        <TextArea
          rows={2}
          className="flex-1"
          placeholder="Escribe un comentario..."
          value={nuevoComentario}
          onChange={(e) => setNuevoComentario(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleAdd();
            }
          }}
          style={{ minHeight: "2.5rem" }}
          disabled={loading}
        />
        <Btn
          onClick={handleAdd}
          icon={Send}
          size="sm"
          disabled={!nuevoComentario.trim() || loading}
          color="var(--color-accent)"
        >
          Enviar
        </Btn>
      </div>

      {/* ConfirmDialog para eliminar */}
      <ConfirmDialog
        open={confirmEliminar !== null}
        title="Eliminar comentario"
        message="¿Seguro que quieres eliminar este comentario?"
        confirmLabel="Eliminar"
        confirmColor="var(--color-danger)"
        onCancel={() => setConfirmEliminar(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
