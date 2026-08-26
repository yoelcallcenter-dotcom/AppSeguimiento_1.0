import React from "react";
import { FileText, Trash2, Edit3, Calendar } from "lucide-react";

export function NoteCard({ note, onSelect, onDelete }) {
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

  const preview = note.content
    ? note.content.slice(0, 100) + (note.content.length > 100 ? "..." : "")
    : "Sin contenido";

  return (
    <div
      className="rounded-lg p-3 transition-shadow hover:shadow-lg cursor-pointer group"
      style={{
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
      }}
      onClick={() => onSelect(note)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <FileText size={14} color="var(--color-accent)" />
            <span
              className="text-sm font-semibold truncate"
              style={{ color: "var(--color-text)" }}
            >
              {note.title || "Sin título"}
            </span>
          </div>
          <div
            className="text-xs mt-1 line-clamp-2"
            style={{ color: "var(--color-text-muted)" }}
          >
            {preview}
          </div>
          <div
            className="text-[10px] mt-1.5 flex items-center gap-1"
            style={{ color: "var(--color-text-muted)" }}
          >
            <Calendar size={10} />
            {formatearFecha(note.updatedAt || note.createdAt)}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(note);
            }}
            className="p-1 rounded hover:bg-white/5 transition-colors"
            style={{ color: "var(--color-text-muted)" }}
          >
            <Edit3 size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("¿Eliminar esta nota?")) {
                onDelete(note.id);
              }
            }}
            className="p-1 rounded hover:bg-white/5 transition-colors"
            style={{ color: "var(--color-danger)" }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
