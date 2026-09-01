import React, { useState } from "react";
import { FileText, Link, X, ExternalLink } from "lucide-react";
import { Btn } from "../../components/common/Btn";
import { BtnOutline } from "../../components/common/BtnOutline";
import { TextInput } from "../../components/common/TextInput";
import { TextArea } from "../../components/common/TextArea";

/**
 * InlineNoteForm (Sistema de Citas, 1.5.0)
 * Forma compacta dentro del modal del caso para crear una nota vinculada
 * directamente al caso actual, sin salir del contexto.
 */
export default function InlineNoteForm({ caso, onCancel, onCreated, onOpenFull }) {
  const [titulo, setTitulo] = useState(`Nota - ${caso?.nombre || ""}`.trim().replace(/^Nota - $/, ""));
  const [contenido, setContenido] = useState("");
  const [saving, setSaving] = useState(false);

  const guardar = async () => {
    if (!caso || !caso.id) return;
    if (!titulo.trim()) {
      setTitulo("Nota");
    }
    setSaving(true);
    try {
      const { createNote } = await import("../../features/notes/notesStore");
      const note = await createNote({
        title: titulo.trim() || "Nota",
        content: contenido,
        tags: [],
        relatedCaseIds: [caso.id],
      });
      onCreated && onCreated(note);
    } catch (e) {
      console.warn("[InlineNoteForm] No se pudo crear la nota:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="rounded-lg p-3 space-y-2"
      style={{
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--color-text)" }}>
          <FileText size={14} color="var(--color-accent)" /> Nueva nota
        </div>
        <button
          onClick={onCancel}
          className="hover:opacity-70 transition-opacity"
          aria-label="Cerrar"
        >
          <X size={16} style={{ color: "var(--color-text-muted)" }} />
        </button>
      </div>

      <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
        <Link size={12} color="var(--color-accent)" />
        <span>
          Caso vinculado: <span className="font-semibold" style={{ color: "var(--color-text)" }}>{caso?.nombre || "—"}</span>
        </span>
      </div>

      <TextInput
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Título de la nota"
      />
      <TextArea
        rows={2}
        value={contenido}
        onChange={(e) => setContenido(e.target.value)}
        placeholder="Escribe el contenido de la nota..."
        className="w-full"
      />

      <div className="flex items-center justify-between pt-1">
        <button
          onClick={onOpenFull}
          className="text-[11px] flex items-center gap-1 hover:opacity-70 transition-opacity"
          style={{ color: "var(--color-accent)" }}
        >
          <ExternalLink size={12} /> Abrir editor completo
        </button>
        <div className="flex items-center gap-2">
          <BtnOutline size="sm" onClick={onCancel}>Cancelar</BtnOutline>
          <Btn size="sm" icon={FileText} onClick={guardar} loading={saving}>
            Crear nota
          </Btn>
        </div>
      </div>
    </div>
  );
}
