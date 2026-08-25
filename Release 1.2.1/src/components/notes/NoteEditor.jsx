import React, { useState, useEffect, useRef } from "react";
import { Save, X, Link, Unlink, Trash2, FileText } from "lucide-react";
import { Btn } from "../common/Btn";
import { BtnOutline } from "../common/BtnOutline";
import { TextInput } from "../common/TextInput";
import { TextArea } from "../common/TextArea";

export function NoteEditor({ note, onSave, onDelete, onClose, casos = [] }) {
  const [title, setTitle] = useState(note?.title || "");
  const [content, setContent] = useState(note?.content || "");
  const [relatedCases, setRelatedCases] = useState(note?.caseIds || []);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const autoSaveTimer = useRef(null);

  useEffect(() => {
    // Auto-guardado cada 5 segundos
    if (isDirty) {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        handleSave(true);
      }, 5000);
    }
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [title, content, relatedCases, isDirty]);

  const handleSave = (silent = false) => {
    const noteData = {
      id: note?.id,
      title,
      content,
      caseIds: relatedCases,
    };
    onSave(noteData);
    setIsDirty(false);
    if (!silent) {
      // Mostrar toast de guardado
    }
  };

  const toggleCase = (caseId) => {
    setRelatedCases((prev) =>
      prev.includes(caseId)
        ? prev.filter((id) => id !== caseId)
        : [...prev, caseId]
    );
    setIsDirty(true);
  };

  const filteredCases = casos.filter(
    (c) =>
      c.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.telefono?.includes(searchTerm)
  );

  return (
    <div className="space-y-4">
      {/* Título */}
      <TextInput
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          setIsDirty(true);
        }}
        placeholder="Título de la nota..."
        className="w-full text-lg font-semibold"
        style={{ fontSize: "18px" }}
      />

      {/* Contenido */}
      <TextArea
        rows={8}
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          setIsDirty(true);
        }}
        placeholder="Escribe tu nota aquí..."
        className="w-full"
        style={{ minHeight: "200px" }}
      />

      {/* Casos relacionados */}
      <div
        className="rounded-lg p-3"
        style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-xs font-semibold"
            style={{ color: "var(--color-text-muted)" }}
          >
            Casos relacionados ({relatedCases.length})
          </span>
          <span
            className="text-xs"
            style={{ color: "var(--color-text-muted)" }}
          >
            {isDirty ? "Sin guardar" : "Guardado"}
          </span>
        </div>

        <TextInput
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar casos para vincular..."
          className="w-full mb-2"
        />

        <div className="max-h-32 overflow-y-auto space-y-1">
          {filteredCases.slice(0, 10).map((c) => {
            const isLinked = relatedCases.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggleCase(c.id)}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded text-xs transition-colors hover:bg-white/5"
                style={{
                  backgroundColor: isLinked
                    ? "var(--color-accent)22"
                    : "transparent",
                  color: isLinked ? "var(--color-accent)" : "var(--color-text)",
                }}
              >
                <span>{c.nombre || "Sin nombre"}</span>
                <span>{isLinked ? "Vinculado" : "Vincular"}</span>
              </button>
            );
          })}
          {filteredCases.length === 0 && (
            <span
              className="text-xs"
              style={{ color: "var(--color-text-muted)" }}
            >
              No hay casos para vincular
            </span>
          )}
        </div>
      </div>

      {/* Acciones */}
      <div className="flex justify-between gap-2">
        <div className="flex gap-2">
          {note?.id && (
            <BtnOutline
              onClick={() => onDelete(note.id)}
              icon={Trash2}
              size="sm"
              color="var(--color-danger)"
            >
              Eliminar
            </BtnOutline>
          )}
        </div>
        <div className="flex gap-2">
          <BtnOutline
            onClick={onClose}
            size="sm"
            color="var(--color-text-muted)"
          >
            Cerrar
          </BtnOutline>
          <Btn
            onClick={() => handleSave(false)}
            icon={Save}
            size="sm"
            color="var(--color-success)"
          >
            Guardar
          </Btn>
        </div>
      </div>
    </div>
  );
}
