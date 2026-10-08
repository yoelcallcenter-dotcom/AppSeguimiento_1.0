import React, { useState, useEffect, useMemo } from 'react';
import { FileText, ChevronDown } from 'lucide-react';
import { getTemplatesByType } from '../../features/templates/templatesStore';
import { resolveVariables } from '../../features/templates/resolveVariables';
import { TEMPLATE_TYPE_ICONS, TEMPLATE_TYPE_LABELS } from '../../features/templates/templateTypes';

export function TemplateSelector({ type, caso, config, onSelect, className = '' }) {
  const [templates, setTemplates] = useState([]);
  const [open, setOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getTemplatesByType(type);
        if (!cancelled) setTemplates(list);
      } catch {
        // silent
      }
    })();
    return () => { cancelled = true; };
  }, [type]);

  const grouped = useMemo(() => {
    const groups = {};
    for (const tpl of templates) {
      const cat = tpl.category || 'Sin categoría';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(tpl);
    }
    return groups;
  }, [templates]);

  const hasMultipleCategories = Object.keys(grouped).length > 1;

  if (templates.length === 0) return null;

  const handleSelect = (tpl) => {
    const resolved = resolveVariables(tpl.content, { caso, config });
    onSelect(resolved, tpl);
    setOpen(false);
    setHoveredId(null);
  };

  const Icon = TEMPLATE_TYPE_ICONS[type] || FileText;

  const getPreview = (tpl) => {
    const c = tpl.content || {};
    return c.content || c.texto || c.description || c.title || '';
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[10px] font-medium rounded px-2 py-1 transition-colors"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--color-accent) 6.7%, transparent)',
          color: 'var(--color-accent)',
        }}
        title={`${templates.length} plantilla(s) disponible(s)`}
      >
        <Icon size={11} />
        Plantilla
        <ChevronDown size={10} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setHoveredId(null); }} />
          <div
            className="absolute left-0 top-full mt-1 z-50 min-w-[220px] max-h-[280px] overflow-y-auto rounded-md shadow-lg"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                {hasMultipleCategories && (
                  <div
                    className="px-3 py-1 text-[9px] font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--color-text-muted)', backgroundColor: 'var(--color-surface2)' }}
                  >
                    {category}
                  </div>
                )}
                {items.map((tpl) => {
                  const preview = getPreview(tpl);
                  return (
                    <div
                      key={tpl.id}
                      className="relative"
                      onMouseEnter={() => setHoveredId(tpl.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelect(tpl)}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 transition-colors"
                        style={{ color: 'var(--color-text)' }}
                      >
                        <div className="font-medium truncate">{tpl.name}</div>
                      </button>
                      {hoveredId === tpl.id && preview && (
                        <div
                          className="absolute left-full top-0 ml-2 w-56 p-2 rounded-md text-[10px] shadow-lg z-50 pointer-events-none"
                          style={{
                            backgroundColor: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text-muted)',
                          }}
                        >
                          <div className="font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                            {tpl.name}
                          </div>
                          <div className="line-clamp-3 whitespace-pre-wrap">
                            {preview}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default TemplateSelector;
