import React, { useState, useEffect, useCallback } from 'react';
import { Plus, CalendarPlus, History, Link, Save } from 'lucide-react';
import { Btn } from '../../components/common/Btn';
import { CaseLinker } from '../../components/common/CaseLinker';
import NotesEditor from './NotesEditor';
import NotesList from './NotesList';
import NotesSearch from './NotesSearch';
import {
  getAllNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
  getVersions,
  restoreVersion,
} from './notesStore';
import { useNotesService } from './notesService';
import { reportError } from '../../core/error/reportError';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { soundSystem } from '../../core/notifications/soundSystem';
import useAppStore from '../../core/store/useAppStore';

const SORT_OPTIONS = [
  { value: 'updated-desc', label: 'Actualizado reciente' },
  { value: 'updated-asc', label: 'Actualizado antiguo' },
  { value: 'created-desc', label: 'Creado reciente' },
  { value: 'created-asc', label: 'Creado antiguo' },
  { value: 'title-asc', label: 'Titulo A-Z' },
  { value: 'title-desc', label: 'Titulo Z-A' },
];

export default function NotesView({ showToast, onCreateEvent, casos = [], selectedNoteId, onSelectedNoteIdConsumed }) {
  const [sortOrder, setSortOrder] = useState(() => localStorage.getItem('notas-sort-order') || 'updated-desc');
  const [notes, setNotes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedNote, setSelectedNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [tagInput, setTagInput] = useState('');
  const [dirty, setDirty] = useState(false);

  const { createEventFromNote } = useNotesService();

  const sortNotes = useCallback((data, order) => {
    const sorted = [...data];
    switch (order) {
      case 'updated-desc': sorted.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)); break;
      case 'updated-asc': sorted.sort((a, b) => new Date(a.updatedAt || 0) - new Date(b.updatedAt || 0)); break;
      case 'created-desc': sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)); break;
      case 'created-asc': sorted.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)); break;
      case 'title-asc': sorted.sort((a, b) => (a.title || '').localeCompare(b.title || '')); break;
      case 'title-desc': sorted.sort((a, b) => (b.title || '').localeCompare(a.title || '')); break;
      default: break;
    }
    return sorted;
  }, []);

  const loadNotes = useCallback(async () => {
    try {
      const data = await getAllNotes();
      setNotes(sortNotes(data, sortOrder));
    } catch (error) {
      reportError(error, { operation: 'loadNotes' });
    } finally {
      setLoading(false);
    }
  }, [sortNotes, sortOrder]);

  const loadSelectedNote = useCallback(async (id) => {
    try {
      if (!id) { setSelectedNote(null); return; }
      const note = await getNote(id);
      setSelectedNote(note);
    } catch (error) {
      reportError(error, { operation: 'loadSelectedNote' });
    }
  }, []);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  useEffect(() => {
    if (selectedId) loadSelectedNote(selectedId);
  }, [selectedId, loadSelectedNote]);

  const handleSelect = useCallback((id) => {
    setSelectedId(id);
    loadSelectedNote(id);
    setShowHistory(false);
    setDirty(false);
  }, [loadSelectedNote]);

  const handleCreate = useCallback(async (title) => {
    try {
      const prelinkedCaseId = sessionStorage.getItem('nota-caso-vincular');
      const relatedCaseIds = prelinkedCaseId ? [prelinkedCaseId] : [];
      sessionStorage.removeItem('nota-caso-vincular');
      const note = await createNote({ title: title || 'Nueva nota', content: '', tags: [], relatedCaseIds });
      await loadNotes();
      useAppStore.getState().loadNotes();
      setSelectedId(note.id);
      setSelectedNote(note);
      setDirty(false);
      showToast('Nota creada', 'success');
    } catch (error) {
      showToast('Error al crear la nota', 'error');
    }
  }, [loadNotes, showToast]);

  const handleUpdate = useCallback((field, value) => {
    if (!selectedNote) return;
    setSelectedNote(prev => ({ ...prev, [field]: value }));
    setDirty(true);
  }, [selectedNote]);

  const handleSave = useCallback(async () => {
    if (!selectedNote) return;
    try {
      const updated = await updateNote(selectedNote.id, selectedNote);
      setSelectedNote(updated);
      const data = await getAllNotes();
      setNotes(sortNotes(data, sortOrder));
      useAppStore.getState().loadNotes();
      setDirty(false);
      soundSystem.playAction('save');
      showToast('Nota guardada', 'success');
    } catch (error) {
      showToast('Error al guardar', 'error');
    }
  }, [selectedNote, loadNotes, showToast, sortOrder]);

  const handleDelete = useCallback(async (id) => {
    try {
      await deleteNote(id);
      if (selectedId === id) {
        setSelectedId(null);
        setSelectedNote(null);
      }
      const data = await getAllNotes();
      setNotes(sortNotes(data, sortOrder));
      useAppStore.getState().loadNotes();
      showToast('Nota eliminada', 'info');
    } catch (error) {
      showToast('Error al eliminar la nota', 'error');
    }
  }, [selectedId, loadNotes, showToast, sortOrder]);

  const handleShowHistory = useCallback(async () => {
    if (!selectedNote) return;
    setShowHistory(!showHistory);
    if (!showHistory) {
      try {
        const data = await getVersions(selectedNote.id);
        setVersions(data);
      } catch (error) {
        reportError(error, { operation: 'handleShowHistory' });
      }
    }
  }, [selectedNote, showHistory]);

  const handleRestore = useCallback(async (versionId) => {
    try {
      const restored = await restoreVersion(versionId);
      setSelectedNote(restored);
      const data = await getAllNotes();
      setNotes(sortNotes(data, sortOrder));
      useAppStore.getState().loadNotes();
      setShowHistory(false);
      showToast('Version restaurada', 'success');
    } catch (error) {
      showToast('Error al restaurar', 'error');
    }
  }, [loadNotes, showToast, sortOrder]);

  const handleCreateEvent = useCallback(async () => {
    if (!selectedNote) return;
    try {
      const evt = await createEventFromNote(
        selectedNote.id,
        selectedNote.title,
        new Date().toISOString()
      );
      if (onCreateEvent) onCreateEvent(evt);
      showToast('Evento creado desde la nota', 'success');
    } catch (error) {
      showToast('Error al crear evento', 'error');
    }
  }, [selectedNote, createEventFromNote, onCreateEvent, showToast]);

  const handleAddTag = useCallback(async () => {
    if (!selectedNote || !tagInput.trim()) return;
    const newTags = [...(selectedNote.tags || []), tagInput.trim()];
    await handleUpdate('tags', newTags);
    setTagInput('');
  }, [selectedNote, tagInput, handleUpdate]);

  const handleRemoveTag = useCallback(async (tag) => {
    if (!selectedNote) return;
    const newTags = (selectedNote.tags || []).filter(t => t !== tag);
    await handleUpdate('tags', newTags);
  }, [selectedNote, handleUpdate]);

  const formatDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleString('es-AR');
  };

  useEffect(() => {
    if (selectedNoteId && notes.length > 0) {
      const noteExists = notes.some(n => n.id === selectedNoteId);
      if (noteExists) {
        setSelectedId(selectedNoteId);
        setShowHistory(false);
        if (onSelectedNoteIdConsumed) onSelectedNoteIdConsumed();
      }
    }
  }, [selectedNoteId, notes, onSelectedNoteIdConsumed]);

  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-6 h-6 border-2 border-t-transparent rounded-full" style={{ borderColor: 'var(--color-accent)' }} />
      </div>
    );
  }

  return (
    <div className="flex h-full gap-4">
      {/* Sidebar - Lista de notas */}
      <div className="w-80 flex-shrink-0 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            Notas ({notes.length})
          </span>
          <div className="flex items-center gap-1">
            <select
              value={sortOrder}
              onChange={(e) => { setSortOrder(e.target.value); localStorage.setItem('notas-sort-order', e.target.value); }}
              className="text-[10px] rounded px-1.5 py-1 border-none cursor-pointer"
              style={{ backgroundColor: 'var(--color-surface2)', color: 'var(--color-text-muted)' }}
              aria-label="Ordenar notas"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <Btn onClick={() => handleCreate()} icon={Plus} size="sm">
              Nueva
            </Btn>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <NotesList
            notes={notes}
            selectedId={selectedId}
            onSelect={handleSelect}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-w-0 flex flex-col">
        {!selectedNote ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-lg mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Selecciona o crea una nota
              </div>
              <Btn onClick={() => handleCreate()} icon={Plus} size="sm">
                Crear primera nota
              </Btn>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col space-y-3">
            {/* Title */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={selectedNote.title || ''}
                onChange={e => setSelectedNote(prev => ({ ...prev, title: e.target.value }))}
                onBlur={() => handleUpdate('title', selectedNote.title)}
                onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                placeholder="Titulo de la nota..."
                className="flex-1 text-lg font-bold bg-transparent border-none outline-none"
                style={{ color: 'var(--color-text)' }}
              />
              <div className="flex gap-1">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold transition-colors hover:opacity-85"
                  style={{ backgroundColor: dirty ? 'var(--color-accent)' : 'var(--color-surface2)', color: dirty ? '#14181F' : 'var(--color-text-muted)', border: '1px solid ' + (dirty ? 'var(--color-accent)' : 'var(--color-border)') }}
                  title="Guardar cambios"
                >
                  <Save size={14} /> Guardar
                </button>
                <button
                  onClick={handleShowHistory}
                  className="p-1.5 rounded hover:bg-white/5 transition-colors"
                  style={{ color: showHistory ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
                  title="Historial de versiones"
                >
                  <History size={16} />
                </button>
                <button
                  onClick={handleCreateEvent}
                  className="p-1.5 rounded hover:bg-white/5 transition-colors"
                  style={{ color: 'var(--color-text-muted)' }}
                  title="Crear evento desde nota"
                >
                  <CalendarPlus size={16} />
                </button>
              </div>
            </div>

            {/* Tags */}
            <div className="flex items-center gap-1 flex-wrap">
              {(selectedNote.tags || []).map(tag => (
                <span
                  key={tag}
                  className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full cursor-pointer hover:opacity-70"
                  style={{ backgroundColor: 'var(--color-accent)22', color: 'var(--color-accent)' }}
                  onClick={() => handleRemoveTag(tag)}
                >
                  {tag} <span className="text-[8px]">&times;</span>
                </span>
              ))}
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddTag(); }}
                  placeholder="Agregar tag..."
                  className="text-[10px] bg-transparent border-none outline-none w-20"
                  style={{ color: 'var(--color-text-muted)' }}
                />
                {tagInput && (
                  <button onClick={handleAddTag} className="text-[10px]" style={{ color: 'var(--color-accent)' }}>
                    +
                  </button>
                )}
              </div>
            </div>

            {/* Linked Cases */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                <Link size={10} /> Casos vinculados
              </div>
              <CaseLinker
                casos={casos}
                selectedIds={selectedNote.relatedCaseIds || []}
                onChange={(ids) => handleUpdate('relatedCaseIds', ids)}
              />
            </div>

            {/* Content Editor */}
            <div className="flex-1 overflow-y-auto">
              <NotesEditor
                content={selectedNote.content || ''}
                onChange={(html) => handleUpdate('content', html)}
              />
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-4 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              <span>Creada: {formatDate(selectedNote.createdAt)}</span>
              <span>Actualizada: {formatDate(selectedNote.updatedAt)}</span>
            </div>
          </div>
        )}
      </div>

      {/* History sidebar */}
      {showHistory && selectedNote && (
        <div
          className="w-60 flex-shrink-0 rounded-lg p-3 overflow-y-auto"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <div className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
            Historial ({versions.length})
          </div>
          {versions.length === 0 && (
            <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              Sin versiones anteriores
            </div>
          )}
          {versions.map(v => (
            <div
              key={v.id}
              className="rounded p-2 mb-1 cursor-pointer hover:bg-white/5 transition-colors"
              style={{ backgroundColor: 'var(--color-surface2)', border: '1px solid var(--color-border)' }}
              onClick={() => handleRestore(v.id)}
            >
              <div className="text-[10px] font-medium" style={{ color: 'var(--color-text)' }}>
                {v.title}
              </div>
              <div className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
                {formatDate(v.createdAt)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Command palette */}
      <NotesSearch
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        notes={notes}
        onSelectNote={handleSelect}
        onCreateNote={handleCreate}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar nota"
        message="Seguro que quieres eliminar esta nota?"
        confirmLabel="Eliminar"
        confirmColor="var(--color-danger)"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) handleDelete(confirmDelete);
          setConfirmDelete(null);
        }}
      />
    </div>
  );
}
