import React, { useState, useEffect, useCallback } from 'react';
import { Plus, CalendarPlus, History, Link, Save, ExternalLink, StickyNote } from 'lucide-react';
import { Btn } from '../../components/common/Btn';
// T4b/C03 (1.10.1): Select y EmptyState del set común — antes el orden era un
// <select> crudo y el estado vacío del editor un div textual suelto.
import { Select } from '../../components/common/Select';
import { EmptyState } from '../../components/common/EmptyState';
import { SectionHeader } from '../../components/configuracion/ui';
import { Skeleton, SkeletonText } from '../../components/common/Skeleton';
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
import { TemplateSelector } from '../../components/common/TemplateSelector';
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

export default function NotesView({ showToast, onCreateEvent, casos = [], config = {}, selectedNoteId, onSelectedNoteIdConsumed, onVerCaso }) {
  const [sortOrder, setSortOrder] = useState(() => localStorage.getItem('notas-sort-order') || 'updated-desc');
  const [notes, setNotes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedNote, setSelectedNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  // T4b/C03 (1.10.1): antes había un `confirmDelete` + ConfirmDialog que NUNCA
  // se abría (nadie llamaba setConfirmDelete; el borrado real lo confirma
  // NotesList con su propio estado) — código muerto. Se reemplaza por la
  // confirmación que faltaba: restaurar una versión pisaba el contenido sin
  // preguntar.
  const [confirmRestore, setConfirmRestore] = useState(null);
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
    // T4c (1.10.1): antes usaba toLocaleString completo (fecha+hora con
    // segundos: "1/10/2026, 10:00:00") que desbordaba la fila de metadata y
    // se cortaba. Ahora formato corto "dd/mm/aaaa hh:mm", el mismo criterio
    // de la lista de notas (consistencia entre paneles de la misma vista).
    const d = new Date(iso);
    return `${d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  useEffect(() => {
    if (selectedNoteId && notes.length > 0) {
      const noteExists = notes.some(n => n.id === selectedNoteId);
      if (noteExists) {
        setSelectedId(selectedNoteId);
        setShowHistory(false);
        if (onSelectedNoteIdConsumed) onSelectedNoteIdConsumed();
        // Scrollear la nota seleccionada dentro de la lista (1.7.2).
        setTimeout(() => {
          const el = document.querySelector(`[data-note-id="${String(selectedNoteId)}"]`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 60);
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
      <div className="flex gap-4">
        <div className="w-80 flex-shrink-0 space-y-3">
          <Skeleton width={60} height={14} />
          <Skeleton variant="list" lines={6} />
        </div>
        <div className="flex-1 space-y-2">
          <Skeleton width={120} height={18} />
          <SkeletonText lines={4} />
          <Skeleton variant="button" width={100} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      <SectionHeader
        icon={StickyNote}
        titulo="Bloc de Notas"
        descripcion="Registrá observaciones por caso, con eventos y historial."
        storageKey="notas"
      />
      <div className="flex flex-1 min-h-0 gap-4">
      {/* Sidebar - Lista de notas */}
      {/* T4c/C03 (1.10.1): header del sidebar en DOS filas. Antes título +
          Select (min-width 150) + botón "Nueva" competían en un w-80 (320px):
          el select y las opciones se cortaban a la mitad. Ahora fila 1 =
          contador + Nueva, fila 2 = orden a todo el ancho (todas las opciones
          del select entran sin truncar). */}
      <div className="w-80 flex-shrink-0 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            Notas ({notes.length})
          </span>
          <Btn onClick={() => handleCreate()} icon={Plus} size="sm">
            Nueva
          </Btn>
        </div>
        {/* T4b/C03 (1.10.1): componente Select común (input-optimized +
            chevron propio) en vez de <select> con estilos inline; el
            aria-label "Ordenar notas" y las opciones se conservan.
            T4c: va en su propio renglón a todo el ancho del sidebar. */}
        <Select
          value={sortOrder}
          onChange={(e) => { setSortOrder(e.target.value); localStorage.setItem('notas-sort-order', e.target.value); }}
          options={SORT_OPTIONS}
          aria-label="Ordenar notas"
          className="w-full mb-3"
        />
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
            {/* T4b/C03 (1.10.1): EmptyState del set común (icono + mensaje +
                CTA built-in con btn-accent) en vez del div textual — mismo
                patrón que NotesList/CalendarView. */}
            <EmptyState
              icon={StickyNote}
              message="Selecciona o crea una nota"
              ctaLabel="Crear primera nota"
              onCta={() => handleCreate()}
              size="md"
            />
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
                // T4c (1.10.1): min-w-0 para que el título nunca empuje ni
                // corte los botones de la derecha en paneles angostos.
                className="flex-1 min-w-0 text-lg font-bold bg-transparent border-none outline-none"
                style={{ color: 'var(--color-text)' }}
              />
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* T4b/C03 (1.10.1): Btn común en vez de <button> con styles
                    inline — mismos estados (acento cuando hay cambios sin
                    guardar / outline apagado) más animate-press y el flash
                    de éxito de Btn si handleSave devuelve promesa. */}
                <Btn
                  onClick={handleSave}
                  icon={Save}
                  size="sm"
                  variant={dirty ? 'accent' : 'outline'}
                  title="Guardar cambios"
                >
                  Guardar
                </Btn>
                {/* T4c/C03 (1.10.1): Historial y Crear evento pasan de
                    <button> crudos (p-1.5 rounded hover:bg-white/5 — forma y
                    hover distintos de Btn, e invisible en tema claro) a Btn
                    ghost sm: mismo cuerpo/altura que Guardar, animate-press y
                    hover del set común. Se conservan TITLES, aria-labels y
                    aria-pressed del historial (los usa NotesView.test). */}
                <Btn
                  onClick={handleShowHistory}
                  icon={History}
                  size="sm"
                  variant="ghost"
                  title="Historial de versiones"
                  ariaLabel="Historial de versiones"
                  aria-pressed={showHistory}
                  style={showHistory ? { color: 'var(--color-accent)' } : {}}
                />
                <Btn
                  onClick={handleCreateEvent}
                  icon={CalendarPlus}
                  size="sm"
                  variant="ghost"
                  title="Crear evento desde nota"
                  ariaLabel="Crear evento desde nota"
                />
              </div>
            </div>

            <TemplateSelector
              type="nota"
              config={config}
              onSelect={(resolved) => {
                setSelectedNote(prev => ({
                  ...prev,
                  title: resolved.title || prev.title,
                  content: resolved.content || prev.content,
                  tags: resolved.tags || prev.tags,
                }));
                setDirty(true);
              }}
            />

            {/* Tags */}
            <div className="flex items-center gap-1 flex-wrap">
              {(selectedNote.tags || []).map(tag => (
                <span
                  key={tag}
                  className="flex items-center gap-1 pill-sm cursor-pointer hover:opacity-70"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent) 13.3%, transparent)', color: 'var(--color-accent)' }}
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
                  // T4c (1.10.1): w-20 → w-28: con "Agregar tag..." a text-[10px]
                  // el placeholder se cortaba a la mitad.
                  className="text-[10px] bg-transparent border-none outline-none w-28"
                  style={{ color: 'var(--color-text-muted)' }}
                />
                {tagInput && (
                  <Btn
                    size="sm"
                    variant="ghost"
                    onClick={handleAddTag}
                    ariaLabel="Agregar tag"
                    title="Agregar tag"
                  >
                    +
                  </Btn>
                )}
              </div>
            </div>

            {/* Linked Cases */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                <Link size={10} /> Casos vinculados
              </div>
              {/* Clickable links to linked cases */}
              {selectedNote.relatedCaseIds && selectedNote.relatedCaseIds.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1">
                  {selectedNote.relatedCaseIds.map((caseId) => {
                    const linkedCase = casos.find((c) => String(c.id) === String(caseId));
                    if (!linkedCase) return null;
                    return (
                      <button
                        key={caseId}
                        onClick={() => onVerCaso && onVerCaso(linkedCase)}
                        // T4c (1.10.1): rounded-md (misma forma que los pills
                        // del repo; era rounded=4px) y nombre truncado con tope
                        // de ancho: un nombre largo ya no estira el chip y lo
                        // corta contra el borde del panel.
                        className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md max-w-[180px] hover:opacity-70 transition-opacity"
                        style={{
                          backgroundColor: 'color-mix(in srgb, var(--color-accent) 13.3%, transparent)',
                          color: 'var(--color-accent)',
                          border: '1px solid color-mix(in srgb, var(--color-accent) 26.7%, transparent)',
                        }}
                      >
                        <ExternalLink size={9} className="flex-shrink-0" />
                        <span className="truncate">{linkedCase.nombre || 'Sin nombre'}</span>
                      </button>
                    );
                  })}
                </div>
              )}
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
            {/* T4c (1.10.1): separada con borde superior y con wrap: antes una
                fila inline (gap-4, sin borde) con fechas largas desbordaba y
                se cortaba contra el borde del panel. */}
            <div
              className="flex flex-wrap gap-x-4 gap-y-1 pt-2 text-[10px]"
              style={{ color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)' }}
            >
              <span>Creada: {formatDate(selectedNote.createdAt)}</span>
              <span>Actualizada: {formatDate(selectedNote.updatedAt)}</span>
            </div>
          </div>
        )}
      </div>

      {/* History sidebar */}
      {showHistory && selectedNote && (
        <div
          // T4b/C03 (1.10.1): entra con slide del set de animaciones de
          // globals.css (antes aparecía de golpe).
          className="w-60 flex-shrink-0 rounded-lg p-3 overflow-y-auto animate-slide-in-right"
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
          {/* T4b/C03 (1.10.1): animate-stagger = fade-in escalonado por ítem
              (globals.css .animate-stagger > *). */}
          <div className="animate-stagger">
            {versions.map(v => (
              // T4b/C03 (1.10.1): era un div con onClick (no accesible y
              // restauraba de inmediato). Ahora es <button> que solo ABRE la
              // confirmación (restoreVersion pisaba título/contenido sin
              // preguntar y sin forma de cancelar).
              <button
                key={v.id}
                type="button"
                // T4c (1.10.1): rounded-md (forma estándar del repo) y título
                // con truncate: una versión con título largo ya no desbordaba
                // el ancho fijo del panel (w-60) y se cortaba a la mitad.
                className="w-full text-left rounded-md p-2 mb-1 cursor-pointer hover:opacity-80 transition-opacity"
                style={{ backgroundColor: 'var(--color-surface2)', border: '1px solid var(--color-border)' }}
                onClick={() => setConfirmRestore(v.id)}
              >
                <div className="text-[10px] font-medium truncate" style={{ color: 'var(--color-text)' }}>
                  {v.title}
                </div>
                <div className="text-ds-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                  {formatDate(v.createdAt)}
                </div>
              </button>
            ))}
          </div>
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

      {/* T4b/C03 (1.10.1): este ConfirmDialog era huérfano (abriría el borrado
          con confirmDelete, que nadie seteaba — el borrado real lo confirma
          NotesList). Ahora confirma la restauración de versión, que antes
          ejecutaba handleRestore directo desde el clic en el historial. */}
      <ConfirmDialog
        open={!!confirmRestore}
        title="Restaurar versión"
        message="Se reemplazarán el título y el contenido actuales por los de esta versión."
        confirmLabel="Restaurar"
        confirmColor="var(--color-accent)"
        onCancel={() => setConfirmRestore(null)}
        onConfirm={() => {
          const versionId = confirmRestore;
          setConfirmRestore(null);
          if (versionId) handleRestore(versionId);
        }}
      />
      </div>
    </div>
  );
}
