import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, X } from 'lucide-react';

/**
 * MultiSelect — selector múltiple con dropdown, checkboxes y pills de selección.
 * Diseño consistente con Select.jsx existente.
 *
 * @param {{ label?:string, id?:string, options:{value:string,label:string}[], value:string[], onChange:(selected:string[])=>void, placeholder?:string, className?:string }} props
 */
export function MultiSelect({
  label,
  id,
  options = [],
  value = [],
  onChange,
  placeholder = 'Todos',
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const toggle = useCallback((val) => {
    onChange(
      value.includes(val)
        ? value.filter((v) => v !== val)
        : [...value, val]
    );
  }, [value, onChange]);

  const clear = useCallback((e) => {
    e.stopPropagation();
    onChange([]);
  }, [onChange]);

  const selectedCount = value.length;

  return (
    <div
      ref={ref}
      className={`relative flex flex-col gap-1 ${className}`}
      style={{ minWidth: 150 }}
    >
      {label && (
        <label
          id={`${id}-label`}
          className="text-xs font-medium"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={label ? `${id}-label` : undefined}
        className="input-optimized flex items-center justify-between gap-2 text-left cursor-pointer"
        style={{
          minHeight: 34,
          paddingRight: '0.5rem',
        }}
      >
        <span
          className="truncate text-xs"
          style={{ color: selectedCount ? 'var(--color-text)' : 'var(--color-text-muted)' }}
        >
          {selectedCount === 0
            ? placeholder
            : `${selectedCount} seleccionado${selectedCount > 1 ? 's' : ''}`}
        </span>
        <span className="flex items-center gap-1 flex-shrink-0">
          {selectedCount > 0 && (
            <span
              onClick={clear}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clear(e); } }}
              className="flex items-center justify-center w-4 h-4 rounded-full"
              style={{ backgroundColor: 'var(--color-accent11)', color: 'var(--color-accent)' }}
              aria-label="Limpiar selección"
            >
              <X size={10} />
            </span>
          )}
          <ChevronDown
            size={14}
            style={{
              color: 'var(--color-text-muted)',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
              transition: 'transform 0.15s ease',
            }}
          />
        </span>
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute z-50 mt-1 w-full max-h-52 overflow-auto rounded-md shadow-lg"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          {options.length === 0 && (
            <div className="px-3 py-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Sin opciones
            </div>
          )}
          {options.map((opt) => {
            const isSelected = value.includes(opt.value);
            return (
              <label
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                className="flex items-center gap-2 px-3 py-1.5 cursor-pointer text-xs"
                style={{
                  color: 'var(--color-text)',
                  backgroundColor: isSelected ? 'var(--color-accent11)' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(opt.value)}
                  className="rounded"
                  style={{ accentColor: 'var(--color-accent)' }}
                />
                <span className="truncate">{opt.label}</span>
              </label>
            );
          })}
        </div>
      )}

      {selectedCount > 0 && (
        <div className="flex flex-wrap gap-1 mt-0.5">
          {value.map((val) => {
            const opt = options.find((o) => o.value === val);
            return (
              <span
                key={val}
                className="inline-flex items-center gap-1 text-[10px] font-medium rounded px-1.5 py-0.5 cursor-pointer"
                style={{
                  backgroundColor: 'var(--color-accent11)',
                  color: 'var(--color-accent)',
                }}
                onClick={() => toggle(val)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(val); } }}
                role="button"
                tabIndex={0}
                aria-label={`Quitar ${opt?.label || val}`}
              >
                {opt?.label || val}
                <X size={8} />
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MultiSelect;
