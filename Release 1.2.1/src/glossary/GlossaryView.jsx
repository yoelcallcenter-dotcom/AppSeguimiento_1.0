import React, { useState, useMemo } from "react";
import { Search, BookOpen } from "lucide-react";
import { GLOSSARY_TERMS } from "./glossaryData";

export function GlossaryView() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return GLOSSARY_TERMS;
    const q = search.toLowerCase();
    return GLOSSARY_TERMS.filter(
      (t) =>
        t.term.toLowerCase().includes(q) ||
        t.definition.toLowerCase().includes(q) ||
        (t.example || "").toLowerCase().includes(q) ||
        (t.related || []).some((r) => r.toLowerCase().includes(q))
    );
  }, [search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen size={16} color="var(--color-accent)" />
        <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
          Glosario de terminos
        </span>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full"
          style={{ backgroundColor: "var(--color-accent)22", color: "var(--color-accent)" }}
        >
          {GLOSSARY_TERMS.length} terminos
        </span>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--color-text-muted)" }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar termino..."
          className="w-full input-optimized pl-8"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-sm py-8 text-center" style={{ color: "var(--color-text-muted)" }}>
          No se encontraron terminos que coincidan con la busqueda.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((t, i) => (
            <div
              key={i}
              className="rounded-lg p-3 transition-colors hover:bg-white/5"
              style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
              <div className="text-xs font-semibold" style={{ color: "var(--color-accent)" }}>
                {t.term}
              </div>
              <div className="text-xs leading-relaxed mt-0.5" style={{ color: "var(--color-text)" }}>
                {t.definition}
              </div>
              {t.example && (
                <div className="text-[10px] mt-1 italic" style={{ color: "var(--color-text-muted)" }}>
                  {t.example}
                </div>
              )}
              {t.related && t.related.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {t.related.map((r) => (
                    <span
                      key={r}
                      className="text-[9px] px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: "var(--color-accent)11", color: "var(--color-accent)" }}
                    >
                      {r}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
