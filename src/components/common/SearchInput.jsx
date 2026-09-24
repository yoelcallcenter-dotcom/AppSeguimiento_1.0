import React, { useCallback, useRef } from "react";
import { Search, X } from "lucide-react";
import { TextInput } from "./TextInput";

/**
 * SearchInput
 * Cuadro de búsqueda estándar de la aplicación:
 *  - Ícono de lupa a la izquierda (posición/padding normalizados).
 *  - Botón "X" para limpiar el texto, visible solo cuando hay contenido.
 *  - Variante compacta vía `compact` (altura y tipografía reducidas).
 * Única fuente de verdad para los cuadros de búsqueda: elimina la
 * repetición del wrapper `relative` + ícono absoluto + clases `pl-8`.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = "Buscar...",
  className = "",
  style = {},
  autoFocus = false,
  compact = false,
  iconSize = 14,
  ...props
}) {
  const inputRef = useRef(null);

  const clear = useCallback(() => {
    onChange?.({ target: { value: "" } });
    inputRef.current?.focus?.();
  }, [onChange]);

  return (
    <div className="relative" style={style}>
      <Search
        size={iconSize}
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2"
        aria-hidden="true"
        style={{ color: "var(--color-text-muted)" }}
      />
      <TextInput
        ref={inputRef}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`${compact ? "pl-7 pr-7 text-[11px]" : "pl-8 pr-8"} ${className}`}
        {...props}
      />
      {value ? (
        <button
          type="button"
          onClick={clear}
          aria-label="Limpiar búsqueda"
          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded transition-colors hover:opacity-80"
          style={{ color: "var(--color-text-muted)" }}
        >
          <X size={compact ? 11 : 13} />
        </button>
      ) : null}
    </div>
  );
}

export default SearchInput;