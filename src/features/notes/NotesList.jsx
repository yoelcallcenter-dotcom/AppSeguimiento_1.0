import React, { useState, useMemo } from 'react';
import { Search, Trash2, Clock, Tag, FileText } from 'lucide-react';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { TextInput } from '../../components/common/TextInput';
import { EmptyState } from '../../components/common/EmptyState';

export default function NotesList({
  notes,
  selectedId,
  onSelect,
  onDelete,
  onSearch,
}) {
  const [query, setQuery] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filtered = useMemo(() => {
    let list = [...notes];
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      list = list.filter(n =>
        (n.title || '').toLowerCase().includes(q) ||
        (n.content || '').toLowerCase().includes(q) ||
        (n.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [notes, query]);

  const handleSearch = (value) => {
    setQuery(value);
    if (onSearch) onSearch(value);
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const getPreview = (content) => {
    if (!content) return '(vacio)';
    const text = content.replace(/<[^>]*>/g, '');
    return text.slice(0, 100) + (text.length > 100 ? '...' : '');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="relative mb-3">
        <Search
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--color-text-muted)' }}
        />
        <TextInput
          value={query}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Buscar notas..."
          className="pl-8 text-sm"
        />
      </div>

      <div className="flex-1 overflow-y-auto space-y-1">
        {filtered.length === 0 && (
          <EmptyState
            icon={FileText}
            message={query ? 'Sin resultados' : 'Sin notas'}
            submessage={query ? 'Probá con otro termino' : 'Crea una nueva para comenzar'}
            size="sm"
          />
        )}
        {filtered.map(note => {
          const isSelected = note.id === selectedId;
          return (
            <div
              key={note.id}
              className="rounded-md p-2.5 cursor-pointer transition-colors hover:bg-white/5"
              style={{
                backgroundColor: isSelected ? 'var(--color-accent)11' : 'var(--color-surface)',
                border: `1px solid ${isSelected ? 'var(--color-accent)' : 'var(--color-border)'}`,
              }}
              onClick={() => onSelect(note.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div
                    className="text-sm font-semibold truncate"
                    style={{ color: isSelected ? 'var(--color-accent)' : 'var(--color-text)' }}
                  >
                    {note.title || 'Sin titulo'}
                  </div>
                  <div className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {getPreview(note.content)}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                      <Clock size={10} />
                      {formatDate(note.updatedAt)}
                    </div>
                    {(note.tags || []).length > 0 && (
                      <div className="flex items-center gap-1">
                        <Tag size={10} style={{ color: 'var(--color-accent)' }} />
                        {(note.tags || []).slice(0, 2).map(t => (
                          <span
                            key={t}
                            className="text-[10px] px-1 py-0.5 rounded"
                            style={{ backgroundColor: 'var(--color-accent)22', color: 'var(--color-accent)' }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-0.5 flex-shrink-0">
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmDelete(note.id); }}
                    className="p-1 rounded hover:bg-white/5 transition-colors"
                    style={{ color: 'var(--color-danger)' }}
                    title="Eliminar nota"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar nota"
        message="Seguro que quieres eliminar esta nota? No se puede deshacer."
        confirmLabel="Eliminar"
        confirmColor="var(--color-danger)"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) onDelete(confirmDelete);
          setConfirmDelete(null);
        }}
      />
    </div>
  );
}
