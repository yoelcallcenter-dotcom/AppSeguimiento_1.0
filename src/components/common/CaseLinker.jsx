import React, { useState } from 'react';
import { X, Search, User, ExternalLink } from 'lucide-react';
import { PhoneLink } from './PhoneLink';

/**
 * CaseLinker
 * Buscador de casos para vincular (notas y eventos).
 *
 * 1.10.3 (rediseño modales de evento):
 *  - FIX del nombre repetido: el EventModal renderizaba una SEGUNDA lista de
 *    chips clicables con los nombres de los casos vinculados encima de este
 *    componente, mostrando cada caso dos veces. Ahora esta es la ÚNICA lista:
 *    los chips de casos seleccionados ganaron la acción "abrir" (prop opcional
 *    onOpenCase) además de "quitar", por lo que el nombre aparece una sola vez
 *    con ambas acciones a un clic.
 *  - El dropdown abre también vacío mostrando los primeros casos (antes solo
 *    aparecía al escribir), y se navega con ↑/↓ + Enter.
 *  - onOpenCase es opcional: en Notas (uso previo) los chips siguen solo
 *    quitando el vínculo, sin cambiar comportamiento.
 *  - Los botones de los chips ahora llevan type="button" (dentro del form del
 *    modal, un click sin eso disparaba el submit por accidente).
 */
export function CaseLinker({ casos = [], selectedIds = [], onChange, onOpenCase }) {
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  // Índice resaltado del dropdown para navegación con teclado.
  const [highlight, setHighlight] = useState(-1);

  const q = query.trim().toLowerCase();
  const filtered = casos
    .filter(
      (c) =>
        !selectedIds.includes(c.id) &&
        (!q ||
          (c.nombre || '').toLowerCase().includes(q) ||
          (c.telefono || '').toLowerCase().includes(q))
    )
    .slice(0, 8);

  const selectedCases = casos.filter((c) => selectedIds.includes(c.id));

  const addCase = (id) => {
    if (!selectedIds.includes(id)) {
      onChange([...selectedIds, id]);
    }
    setQuery('');
    setHighlight(-1);
    setShowDropdown(false);
  };

  const removeCase = (id) => {
    onChange(selectedIds.filter((i) => i !== id));
  };

  const handleKeyDown = (e) => {
    if (!showDropdown || filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => (h + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => (h <= 0 ? filtered.length - 1 : h - 1));
    } else if (e.key === 'Enter' && highlight >= 0) {
      e.preventDefault();
      addCase(filtered[highlight].id);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      {selectedCases.length === 0 ? (
        // Estado vacío amigable (1.10.3): antes no había indicación de nada.
        <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
          Sin casos vinculados — buscá por nombre o teléfono.
        </div>
      ) : (
        <div className="flex flex-wrap gap-1">
          {selectedCases.map((c) => (
            <span
              key={c.id}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-accent) 13.3%, transparent)',
                color: 'var(--color-accent)',
                border: '1px solid color-mix(in srgb, var(--color-accent) 26.7%, transparent)',
              }}
            >
              <User size={10} />
              {c.nombre || 'Sin nombre'}
              {onOpenCase && (
                <button
                  type="button"
                  onClick={() => onOpenCase(c)}
                  aria-label={`Abrir caso: ${c.nombre || 'Sin nombre'}`}
                  title="Abrir caso"
                  className="hover:opacity-70 transition-opacity"
                >
                  <ExternalLink size={10} />
                </button>
              )}
              <button
                type="button"
                onClick={() => removeCase(c.id)}
                aria-label={`Quitar vínculo: ${c.nombre || 'Sin nombre'}`}
                title="Quitar vínculo"
                className="hover:opacity-70 transition-opacity"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <div
          className="flex items-center gap-1 px-2 py-1 rounded"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <Search size={12} style={{ color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlight(-1);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar caso para vincular..."
            aria-label="Buscar caso para vincular"
            className="flex-1 bg-transparent border-none outline-none text-xs"
            style={{ color: 'var(--color-text)' }}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setHighlight(-1);
                setShowDropdown(false);
              }}
              aria-label="Limpiar búsqueda"
              className="p-1 rounded hover:opacity-80 transition-opacity cursor-pointer"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <X size={12} />
            </button>
          )}
        </div>
        {showDropdown && (
          <div
            className="absolute z-dropdown mt-1 w-full rounded-md shadow-lg max-h-48 overflow-y-auto"
            style={{
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
            }}
          >
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {q ? 'Sin resultados' : 'No hay más casos para vincular'}
              </div>
            ) : (
              filtered.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={(e) => {
                    // preventDefault: si no, el blur del input (setTimeout)
                    // y el click compiten y el caso se agregaba tarde.
                    e.preventDefault();
                    addCase(c.id);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs"
                  style={{
                    color: 'var(--color-text)',
                    borderBottom: '1px solid var(--color-border)',
                    // Resaltado de navegación con teclado (1.10.3).
                    backgroundColor:
                      highlight === i
                        ? 'color-mix(in srgb, var(--color-accent) 13.3%, transparent)'
                        : 'transparent',
                  }}
                >
                  <User size={12} style={{ color: 'var(--color-text-muted)' }} />
                  <span className="font-medium">{c.nombre || 'Sin nombre'}</span>
                  {c.estado && (
                    <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                      · {c.estado}
                    </span>
                  )}
                  {c.telefono && <PhoneLink telefono={c.telefono} />}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
