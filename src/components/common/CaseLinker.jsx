import React, { useState } from 'react';
import { X, Search, User } from 'lucide-react';
import { PhoneLink } from './PhoneLink';

export function CaseLinker({ casos = [], selectedIds = [], onChange }) {
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const filtered = casos.filter(c =>
    !selectedIds.includes(c.id) &&
    ((c.nombre || '').toLowerCase().includes(query.toLowerCase()) ||
     (c.telefono || '').toLowerCase().includes(query.toLowerCase()))
  );

  const selectedCases = casos.filter(c => selectedIds.includes(c.id));

  const addCase = (id) => {
    if (!selectedIds.includes(id)) {
      onChange([...selectedIds, id]);
    }
    setQuery('');
    setShowDropdown(false);
  };

  const removeCase = (id) => {
    onChange(selectedIds.filter(i => i !== id));
  };

  return (
    <div className="flex flex-col gap-1.5">
      {selectedCases.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedCases.map(c => (
            <span key={c.id}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
              style={{
                backgroundColor: 'var(--color-accent)22',
                color: 'var(--color-accent)',
                border: '1px solid var(--color-accent)44',
              }}
            >
              <User size={10} />
              {c.nombre || 'Sin nombre'}
              <button onClick={() => removeCase(c.id)}
                className="hover:opacity-70 transition-opacity"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <div className="flex items-center gap-1 px-2 py-1 rounded"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <Search size={12} style={{ color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            placeholder="Buscar caso para vincular..."
            className="flex-1 bg-transparent border-none outline-none text-xs"
            style={{ color: 'var(--color-text)' }}
          />
        </div>
        {showDropdown && query && (
          <div className="absolute z-10 mt-1 w-full rounded-md shadow-lg max-h-48 overflow-y-auto"
            style={{
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
            }}
          >
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Sin resultados
              </div>
            ) : (
              filtered.slice(0, 8).map(c => (
                <button key={c.id}
                  onMouseDown={() => addCase(c.id)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:opacity-80 text-xs"
                  style={{ color: 'var(--color-text)', borderBottom: '1px solid var(--color-border)' }}
                >
                  <User size={12} style={{ color: 'var(--color-text-muted)' }} />
                  <span className="font-medium">{c.nombre || 'Sin nombre'}</span>
                  {c.telefono && (
                    <PhoneLink telefono={c.telefono} />
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
