import React, { useState } from "react";
import { Plus, Search } from "lucide-react";
import { NoteCard } from "./NoteCard";
import { Btn } from "./Btn";
import { TextInput } from "./TextInput";

export function NoteList({
  notes,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  searchable = true,
}) {
  const [search, setSearch] = useState("");

  const filteredNotes = search.trim()
    ? notes.filter(
        (n) =>
          n.title.toLowerCase().includes(search.toLowerCase()) ||
          n.content.toLowerCase().includes(search.toLowerCase())
      )
    : notes;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--color-text)" }}
          >
            Mis Notas
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: "var(--color-accent)22",
              color: "var(--color-accent)",
            }}
          >
            {notes.length}
          </span>
        </div>
        <Btn onClick={onCreateNote} icon={Plus} size="sm">
          Nueva nota
        </Btn>
      </div>

      {/* Búsqueda */}
      {searchable && (
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2"
            style={{ color: "var(--color-text-muted)" }}
          />
          <TextInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar notas..."
            className="pl-8"
          />
        </div>
      )}

      {/* Lista de notas */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {filteredNotes.length === 0 ? (
          <div
            className="text-center py-8 text-sm"
            style={{ color: "var(--color-text-muted)" }}
          >
            {search ? "No hay notas que coincidan" : "No hay notas guardadas"}
          </div>
        ) : (
          filteredNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onSelect={onSelectNote}
              onDelete={onDeleteNote}
            />
          ))
        )}
      </div>
    </div>
  );
}
