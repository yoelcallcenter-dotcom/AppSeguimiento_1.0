import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, FileText, Calendar, User, X, Clock, Hash, AtSign, Building2, Scale, Shield, History } from 'lucide-react';
import useAppStore from '../../core/store/useAppStore';
import { readConfig, formatDateWithConfig, formatPhoneWithConfig } from '../../utils/configFormatters';
import { crearIndicesGlobal, buscarGlobal, buscarEntidades } from '../../utils/searchEngine';
import TagsPills from '../../components/common/TagsPills';
import { lockBodyScroll, unlockBodyScroll } from '../../utils/bodyScrollLock';

const HISTORIAL_KEY = 'global-search-history';
const RECENT_KEY = 'recent-entities-art-tracker';

const EMPTY_RESULTS = { cases: [], notes: [], events: [], insurers: [], lawFirms: [], condicionales: [] };
const EMPTY_FLAT = [];

const cargarHistorial = () => {
  try { return JSON.parse(localStorage.getItem(HISTORIAL_KEY) || '[]'); } catch { return []; }
};

const GroupHeader = React.memo(({ label }) => (
  <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
    {label}
  </div>
));

const ResultItem = React.memo(({ icon: Icon, title, subtitle, onSelect }) => (
  <button
    onMouseDown={(e) => { e.preventDefault(); onSelect(); }}
    className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-white/5 transition-colors"
    style={{ borderBottom: '1px solid var(--color-border)' }}
  >
    <Icon size={14} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
    <div className="min-w-0 flex-1">
      <div className="text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>{title}</div>
      <div className="text-[9px] truncate" style={{ color: 'var(--color-text-muted)' }}>{subtitle}</div>
    </div>
  </button>
));

export default function GlobalSearch({ onSelectCase, onSelectNote, onSelectEvent, onSelectEntity, condicionales = [], aseguradoras = [], mapeo = [] }) {
  const isOpen = useAppStore((s) => s.ui.globalSearchOpen);
  const setUIState = useAppStore((s) => s.setUIState);
  const cases = useAppStore((s) => s.cases);
  const notes = useAppStore((s) => s.notes);
  const events = useAppStore((s) => s.events);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [historial, setHistorial] = useState(cargarHistorial);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const [recientes, setRecientes] = useState([]);
  useEffect(() => {
    try { setRecientes(JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')); } catch { setRecientes([]); }
  }, [isOpen]);

  // Releer la configuración cada vez que se abre el buscador, para reflejar
  // cambios hechos en Configuración sin recargar la app.
  const cfg = useMemo(() => readConfig(), [isOpen]);

  const guardarEnHistorial = useCallback((q) => {
    if (!cfg.busquedaHistorial && cfg.busquedaHistorial !== undefined) return;
    const trimmed = (q || '').trim();
    if (!trimmed) return;
    setHistorial((prev) => {
      const next = [trimmed, ...prev.filter((h) => h.toLowerCase() !== trimmed.toLowerCase())];
      const max = parseInt(cfg.busquedaMaxHistorial) || 50;
      const sliced = next.slice(0, max);
      try { localStorage.setItem(HISTORIAL_KEY, JSON.stringify(sliced)); } catch {}
      return sliced;
    });
  }, [cfg.busquedaHistorial, cfg.busquedaMaxHistorial]);

  const close = useCallback(() => {
    setUIState({ globalSearchOpen: false });
    setQuery('');
  }, [setUIState]);

  const indices = useMemo(() => crearIndicesGlobal({ cases, notes, events, cfg }), [cases, notes, events, cfg]);
  const entityIndices = useMemo(() => ({ aseguradoras, mapeo, condicionales }), [aseguradoras, mapeo, condicionales]);

  const results = useMemo(() => {
    if (!query.trim()) return EMPTY_RESULTS;
    const core = buscarGlobal(indices, query);
    const entities = buscarEntidades(entityIndices, query);
    return { ...core, ...entities };
  }, [query, indices, entityIndices]);

  const flatResults = useMemo(() => {
    if (results === EMPTY_RESULTS) return EMPTY_FLAT;
    const flat = [];
    if (results.cases.length > 0) {
      flat.push({ type: 'header', label: 'Casos' });
      results.cases.forEach((c) => flat.push({ type: 'case', data: c }));
    }
    if (results.notes.length > 0) {
      flat.push({ type: 'header', label: 'Notas' });
      results.notes.forEach((n) => flat.push({ type: 'note', data: n }));
    }
    if (results.events.length > 0) {
      flat.push({ type: 'header', label: 'Eventos' });
      results.events.forEach((e) => flat.push({ type: 'event', data: e }));
    }
    if (results.insurers?.length > 0) {
      flat.push({ type: 'header', label: 'Aseguradoras' });
      results.insurers.forEach((i) => flat.push({ type: 'insurer', data: i }));
    }
    if (results.lawFirms?.length > 0) {
      flat.push({ type: 'header', label: 'Estudios Jurídicos' });
      results.lawFirms.forEach((lf) => flat.push({ type: 'lawFirm', data: lf }));
    }
    if (results.condicionales?.length > 0) {
      flat.push({ type: 'header', label: 'Condicionales' });
      results.condicionales.forEach((c) => flat.push({ type: 'condicional', data: c }));
    }
    return flat;
  }, [results]);

  const totalItems = useMemo(() => flatResults.filter((r) => r.type !== 'header').length, [flatResults]);

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

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      const handleKey = (e) => {
        if (e.key === 'Escape') { e.preventDefault(); close(); return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, totalItems - 1)); return; }
        if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); return; }
        if (e.key === 'Enter') {
          e.preventDefault();
          guardarEnHistorial(query);
          const idx = 0;
          let itemIdx = -1;
          for (const r of flatResults) {
            if (r.type !== 'header') itemIdx++;
            if (itemIdx === selectedIndex && r.type !== 'header') {
              handleSelect(r);
              return;
            }
          }
        }
      };
      window.addEventListener('keydown', handleKey);
      return () => window.removeEventListener('keydown', handleKey);
    }
  }, [isOpen, flatResults, selectedIndex, totalItems, close, guardarEnHistorial]);

  const handleSelect = useCallback((item) => {
    guardarEnHistorial(query);
    if (item.type === 'case' && onSelectCase) onSelectCase(item.data.id);
    if (item.type === 'note' && onSelectNote) onSelectNote(item.data.id);
    if (item.type === 'event' && onSelectEvent) onSelectEvent(item.data.id);
    if ((item.type === 'insurer' || item.type === 'lawFirm') && onSelectEntity) onSelectEntity(item.type === 'insurer' ? 'insurer' : 'lawFirm', item.data.nombre || item.data);
    if (item.type === 'condicional' && onSelectEntity) onSelectEntity('condicional', item.data.aseguradora);
    close();
  }, [onSelectCase, onSelectNote, onSelectEvent, onSelectEntity, close, guardarEnHistorial, query]);

  const getItemIndex = (flatIdx) => {
    let count = -1;
    for (let i = 0; i <= flatIdx; i++) {
      if (flatResults[i].type !== 'header') count++;
    }
    return count;
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-start justify-center pt-[12vh]"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={close}
    >
      <div
        className="rounded-xl w-full max-w-xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <Search size={16} style={{ color: 'var(--color-text-muted)' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar casos, notas, eventos... (#etiqueta / @comentario)"
            className="flex-1 bg-transparent border-none outline-none text-sm"
            style={{ color: 'var(--color-text)' }}
          />
          <span className="hidden sm:flex items-center gap-1 text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
            <span style={{ color: 'var(--color-accent)' }}><Hash size={10} />tag</span>
            <span style={{ color: 'var(--color-accent)' }}><AtSign size={10} />comentario</span>
          </span>
          <button onClick={close} className="p-1 rounded hover:bg-white/5" style={{ color: 'var(--color-text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        <div ref={listRef} className="max-h-[350px] overflow-y-auto">
          {!query.trim() ? (
            recientes.length > 0 ? (
              <div>
                <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                  <History size={10} /> Vistos recientemente
                </div>
                {recientes.slice(0, 5).map((r, i) => {
                  const rIcon = r.type === 'insurer' ? Building2 : r.type === 'lawFirm' ? Scale : User;
                  return (
                    <button
                      key={`r-${i}`}
                      onClick={() => onSelectEntity && onSelectEntity(r.type, r.name)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors text-xs"
                      style={{ color: 'var(--color-text)', borderBottom: '1px solid var(--color-border)' }}
                    >
                      <rIcon size={12} style={{ color: 'var(--color-accent)' }} />
                      <span className="font-medium">{r.name}</span>
                      <span className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>{r.type === 'insurer' ? 'Aseguradora' : r.type === 'lawFirm' ? 'Estudio' : 'Caso'}</span>
                    </button>
                  );
                })}
              </div>
            ) : historial.length > 0 && cfg.busquedaHistorial !== false ? (
              <div>
                <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                  <Clock size={10} /> Búsquedas recientes
                </div>
                {historial.map((h, i) => (
                  <button
                    key={`h-${i}`}
                    onClick={() => setQuery(h)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors text-xs"
                    style={{ color: 'var(--color-text)', borderBottom: '1px solid var(--color-border)' }}
                  >
                    <Clock size={12} style={{ color: 'var(--color-text-muted)' }} />
                    {h}
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
                <Search size={24} className="mx-auto mb-2 opacity-30" />
                Escribe para buscar en todos los datos
              </div>
            )
          ) : flatResults.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Sin resultados para "{query}"
            </div>
          ) : (
            flatResults.map((r, idx) => {
              if (r.type === 'header') return <GroupHeader key={`h-${idx}`} label={r.label} />;
              const itemIdx = getItemIndex(idx);
              const isSelected = itemIdx === selectedIndex;
              const content = (() => {
                if (r.type === 'case') {
                  const c = r.data;
                  const tags = (c.tags || []).slice(0, 3).map((t) => '#' + t).join(' ');
                  return { icon: User, title: c.nombre || 'Sin nombre', subtitle: `${c.estado || '—'} | ${formatPhoneWithConfig(c.telefono) || '—'} | ${c.localidad || ''}${tags ? ' | ' + tags : ''}` };
                }
                if (r.type === 'note') {
                  const n = r.data;
                  const tags = (n.tags || []).slice(0, 3).map((t) => '#' + t).join(' ');
                  const caseIds = n.relatedCaseIds || [];
                  const linkedCases = caseIds.length > 0
                    ? caseIds.map((cid) => {
                        const linked = cases.find((c) => String(c.id) === String(cid));
                        return linked?.nombre;
                      }).filter(Boolean).join(', ')
                    : '';
                  const relationText = linkedCases ? ` | Caso: ${linkedCases}` : '';
                  return { icon: FileText, title: n.title || 'Sin titulo', subtitle: `${tags || 'sin tags'} | ${formatDateWithConfig(n.updatedAt || n.createdAt || '')}${relationText}` };
                }
                if (r.type === 'event') {
                  const e = r.data;
                  const tags = (e.tags || []).slice(0, 3).map((t) => '#' + t).join(' ');
                  const caseIds = e.relatedCaseIds || [];
                  const linkedCases = caseIds.length > 0
                    ? caseIds.map((cid) => {
                        const linked = cases.find((c) => String(c.id) === String(cid));
                        return linked?.nombre;
                      }).filter(Boolean).join(', ')
                    : '';
                  const relationText = linkedCases ? ` | Caso: ${linkedCases}` : '';
                  return { icon: Calendar, title: e.title || 'Sin titulo', subtitle: `${formatDateWithConfig(e.startDate) || ''}${tags ? ' | ' + tags : ''} | ${e.status || ''}${relationText}` };
                }
                if (r.type === 'insurer') {
                  return { icon: Building2, title: r.data.nombre || r.data, subtitle: `${r.data.casesCount || 0} casos` };
                }
                if (r.type === 'lawFirm') {
                  return { icon: Scale, title: r.data.nombre || r.data, subtitle: `${r.data.casesCount || 0} casos` };
                }
                if (r.type === 'condicional') {
                  return { icon: Shield, title: r.data.aseguradora, subtitle: `${r.data.condicion} — ${r.data.estudioJuridico || ''}` };
                }
                return { icon: Search, title: '', subtitle: '' };
              })();
              return (
                <div
                  key={`r-${idx}`}
                  style={{ backgroundColor: isSelected ? 'var(--color-surface)' : 'transparent' }}
                  onMouseEnter={() => setSelectedIndex(itemIdx)}
                >
                  <ResultItem icon={content.icon} title={content.title} subtitle={content.subtitle} onSelect={() => handleSelect(r)} />
                </div>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 border-t flex gap-3 text-[9px]" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
          <span><span style={{ color: 'var(--color-accent)' }}>&uarr;&darr;</span> Navegar</span>
          <span><span style={{ color: 'var(--color-accent)' }}>Enter</span> Abrir</span>
          <span><span style={{ color: 'var(--color-accent)' }}>Esc</span> Cerrar</span>
        </div>
      </div>
    </div>
  );
}
