import React, { useState, useMemo } from "react";
import { Search, ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import { FAQ_CATEGORIES } from "./faqData";

export function FAQView({ showToast }) {
  const [search, setSearch] = useState("");
  const [openItems, setOpenItems] = useState({});

  const toggleItem = (catIdx, itemIdx) => {
    const key = `${catIdx}-${itemIdx}`;
    setOpenItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return FAQ_CATEGORIES;
    const q = search.toLowerCase();
    return FAQ_CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) =>
          item.question.toLowerCase().includes(q) ||
          item.answer.toLowerCase().includes(q) ||
          (item.tags || []).some((t) => t.includes(q))
      ),
    })).filter((cat) => cat.items.length > 0);
  }, [search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <HelpCircle size={18} color="var(--color-accent)" />
        <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
          Preguntas Frecuentes
        </span>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full"
          style={{ backgroundColor: "var(--color-accent)22", color: "var(--color-accent)" }}
        >
          {FAQ_CATEGORIES.reduce((a, c) => a + c.items.length, 0)} preguntas
        </span>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--color-text-muted)" }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar en preguntas frecuentes..."
          className="w-full input-optimized pl-8"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-sm py-8 text-center" style={{ color: "var(--color-text-muted)" }}>
          No se encontraron preguntas que coincidan con la busqueda.
        </div>
      ) : (
        filtered.map((cat, catIdx) => (
          <div key={cat.id} className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
              {cat.label}
            </div>
            <div className="space-y-1">
              {cat.items.map((item, itemIdx) => {
                const key = `${catIdx}-${itemIdx}`;
                const isOpen = openItems[key];
                return (
                  <div
                    key={itemIdx}
                    className="rounded-lg overflow-hidden"
                    style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                  >
                    <button
                      onClick={() => toggleItem(catIdx, itemIdx)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
                    >
                      <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                        {item.question}
                      </span>
                      {isOpen ? (
                        <ChevronUp size={16} style={{ color: "var(--color-text-muted)" }} className="flex-shrink-0" />
                      ) : (
                        <ChevronDown size={16} style={{ color: "var(--color-text-muted)" }} className="flex-shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-3 text-xs leading-relaxed" style={{ color: "var(--color-text)" }}>
                        {item.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
