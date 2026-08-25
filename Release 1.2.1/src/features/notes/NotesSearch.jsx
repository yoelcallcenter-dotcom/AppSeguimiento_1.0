import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, FileText, Plus, CalendarPlus } from 'lucide-react';
import { lockBodyScroll, unlockBodyScroll } from '../../utils/bodyScrollLock';

export default function NotesSearch({ isOpen, onClose, notes, onSelectNote, onCreateNote }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
      lockBodyScroll();
    } else {
      unlockBodyScroll();
    }
    return () => unlockBodyScroll();
  }, [isOpen]);

  const results = useMemo(() => query.trim()
    ? notes.filter(n =>
        (n.title || '').toLowerCase().includes(query.toLowerCase()) ||
        (n.content || '').toLowerCase().includes(query.toLowerCase())
      )
    : notes.slice(0, 10),
  [query, notes]);

  useEffect(() => {
    const handleKey = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, results.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        handleSelect(results[selectedIndex]);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, selectedIndex, results]);

  const handleSelect = (note) => {
    onSelectNote(note.id);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-start justify-center pt-[15vh]"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="rounded-xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in"
        style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <Search size={16} style={{ color: 'var(--color-text-muted)' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            placeholder="Buscar notas o crear nueva..."
            className="flex-1 bg-transparent border-none outline-none text-sm"
            style={{ color: 'var(--color-text)' }}
          />
          <button
            onClick={() => {
              onCreateNote(query);
              onClose();
            }}
            className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded"
            style={{ backgroundColor: 'var(--color-accent)', color: '#14181F' }}
          >
            <Plus size={12} /> Nueva
          </button>
        </div>

        <div className="max-h-[300px] overflow-y-auto p-2 space-y-0.5">
          {results.length === 0 && (
            <div className="text-center py-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              <FileText size={24} className="mx-auto mb-2 opacity-40" />
              Sin resultados. Presiona Enter para crear.
            </div>
          )}
          {results.map((note, idx) => (
            <button
              key={note.id}
              onClick={() => handleSelect(note)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors"
              style={{
                backgroundColor: idx === selectedIndex ? 'var(--color-surface)' : 'transparent',
                color: idx === selectedIndex ? 'var(--color-accent)' : 'var(--color-text)',
              }}
            >
              <FileText size={14} style={{ color: idx === selectedIndex ? 'var(--color-accent)' : 'var(--color-text-muted)' }} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{note.title || 'Sin titulo'}</div>
                <div className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                  {note.content ? note.content.replace(/<[^>]*>/g, '').slice(0, 60) : '(vacio)'}
                </div>
              </div>
              <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                {(note.tags || []).slice(0, 1).join(', ')}
              </span>
            </button>
          ))}
        </div>

        <div className="px-4 py-2 border-t text-[10px]" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
          <span className="font-semibold" style={{ color: 'var(--color-accent)' }}>Enter</span> abrir &middot;
          <span className="font-semibold ml-1" style={{ color: 'var(--color-accent)' }}>Esc</span> cerrar &middot;
          <span className="font-semibold ml-1" style={{ color: 'var(--color-accent)' }}>Ctrl+K</span> buscar
        </div>
      </div>
    </div>
  );
}
