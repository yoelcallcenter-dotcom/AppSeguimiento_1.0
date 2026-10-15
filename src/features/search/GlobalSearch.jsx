import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import { Search, FileText, Calendar, User, X, Clock, Hash, AtSign, Building2, Scale, Shield, History, ClipboardList, Activity } from 'lucide-react';
import useAppStore from '../../core/store/useAppStore';
import casesDB from '../../core/db/casesDB';
import { readConfig, formatDateWithConfig, formatPhoneWithConfig } from '../../utils/configFormatters';
import { crearIndicesGlobal, buscarGlobal, buscarEntidades, condicionalSubtitle } from '../../utils/searchEngine';
import { reportError } from '../../core/error/reportError';
import { lockBodyScroll, unlockBodyScroll } from '../../utils/bodyScrollLock';
import { useDebounce } from '../../hooks/useDebounce';
import { useDialogA11y } from '../../hooks/useDialogA11y';

const HISTORIAL_KEY = 'global-search-history';
const RECENT_KEY = 'recent-entities-art-tracker';

const EMPTY_RESULTS = { cases: [], notes: [], events: [], reportes: [], historial: [], insurers: [], lawFirms: [], condicionales: [] };
const EMPTY_FLAT = [];

const TYPE_META = {
  case: { label: 'CASO', icon: User, color: 'var(--color-accent)' },
  note: { label: 'NOTA', icon: FileText, color: 'var(--color-success)' },
  event: { label: 'EVENTO', icon: Calendar, color: 'var(--chart-color-orange)' },
  reporte: { label: 'REPORTE', icon: ClipboardList, color: 'var(--chart-color-contact)' },
  historial: { label: 'HISTORIAL', icon: Activity, color: 'var(--chart-color-cases)' },
  insurer: { label: 'ASEGURADORA', icon: Building2, color: 'var(--chart-color-warning)' },
  lawFirm: { label: 'ESTUDIO', icon: Scale, color: 'var(--chart-color-cases)' },
  condicional: { label: 'CONDICIONAL', icon: Shield, color: 'var(--color-danger)' },
};

const cargarHistorial = () => {
  try { return JSON.parse(localStorage.getItem(HISTORIAL_KEY) || '[]'); } catch { return []; }
};

// X18 (1.10.1): los encabezados son decorativos dentro del listbox (solo
// pueden vivir options/group); role="presentation" evita que el lector de
// pantalla los anuncie como nodos del listbox.
const GroupHeader = React.memo(({ label }) => (
  <div role="presentation" className="px-3 py-1.5 text-ds-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
    {label}
  </div>
));

const ResultItem = React.memo(({ icon: Icon, title, subtitle, badge, color, onSelect }) => (
  <button
    onMouseDown={(e) => { e.preventDefault(); onSelect(); }}
    className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-white/5 transition-colors"
    style={{ borderBottom: '1px solid var(--color-border)' }}
  >
    <Icon size={14} style={{ color, flexShrink: 0 }} />
    <div className="min-w-0 flex-1">
      <div className="text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>{title}</div>
      <div className="text-ds-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{subtitle}</div>
    </div>
    <span
      className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5"
      // R02 (1.10.1): antes `color + '22'` concatenaba el sufijo alfa sobre
      // var(--…) generando un valor inválido (la decl se descartaba). Patrón
      // color-mix adoptado en 1.10.0.
      style={{ backgroundColor: `color-mix(in srgb, ${color} 13.3%, transparent)`, color }}
      aria-hidden="true"
    >
      {badge}
    </span>
  </button>
));

// X14 (1.10.1): pestaña de Útiles asociada a cada tipo de entidad, para que
// App pueda navegar al directorio correcto en vez de solo cambiar a 'utiles'.
const TAB_UTILES_POR_TIPO = {
  insurer: 'aseguradoras',
  lawFirm: 'mapeo',
  condicional: 'condicionales',
};

export default function GlobalSearch({ onSelectCase, onSelectNote, onSelectEvent, onSelectEntity, onNavigateUtiles, condicionales = [], aseguradoras = [], mapeo = [] }) {
  const isOpen = useAppStore((s) => s.ui.globalSearchOpen);
  const setUIState = useAppStore((s) => s.setUIState);
  const cases = useAppStore((s) => s.cases);
  const notes = useAppStore((s) => s.notes);
  const events = useAppStore((s) => s.events);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [historial, setHistorial] = useState(cargarHistorial);
  const [historialCasos, setHistorialCasos] = useState([]);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  // X10 (1.10.1): el diálogo ahora usa el hook estándar de a11y (igual que
  // ConfirmDialog/Modal): trampa de Tab, foco inicial y restauración al cerrar.
  const dialogRef = useRef(null);

  // X04 (1.10.1): la consulta se debouncea a 300ms, igual que el header
  // (App.jsx:642 y FiltersContext.jsx:153 con useDebounce). El input sigue
  // controlado y tipeable en vivo, pero recién el valor debounceado dispara
  // buscarGlobal + buscarEntidades, que hoy recorren casos/notas/eventos,
  // reportes y TODO case_history: sin esto cada tecla re-corria el motor
  // completo sobre el historial indexado.
  const debouncedQuery = useDebounce(query, 300);

  // Indización del historial de casos (case_history) cuando se abre la búsqueda.
  // Se carga una sola vez por apertura: los índices solo se recalculan cuando
  // cambian los datos relevantes (casos, notas, eventos, configuración o historial).
  useEffect(() => {
    if (!isOpen) return undefined;
    let activo = true;
    setHistorialCasos([]);
    casesDB.case_history.toArray()
      .then((rows) => { if (activo) setHistorialCasos(rows); })
      .catch((err) => reportError(err, { context: 'GlobalSearch:loadCaseHistory' }));
    return () => { activo = false; };
  }, [isOpen]);

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

  const indices = useMemo(
    () => crearIndicesGlobal({ cases, notes, events, cfg, historial: historialCasos }),
    [cases, notes, events, cfg, historialCasos]
  );
  // S11b (1.10.1): se pasan los casos para que buscarEntidades calcule el
  // casesCount real de aseguradoras/estudios (antes "0 casos" siempre).
  const entityIndices = useMemo(
    () => ({ aseguradoras, mapeo, condicionales, cases }),
    [aseguradoras, mapeo, condicionales, cases]
  );

  const results = useMemo(() => {
    if (!debouncedQuery.trim()) return EMPTY_RESULTS;
    const core = buscarGlobal(indices, debouncedQuery);
    const entities = buscarEntidades(entityIndices, debouncedQuery);
    return { ...core, ...entities };
  }, [debouncedQuery, indices, entityIndices]);

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
    if (results.reportes?.length > 0) {
      flat.push({ type: 'header', label: 'Reportes' });
      results.reportes.forEach((r) => flat.push({ type: 'reporte', data: r }));
    }
    if (results.historial?.length > 0) {
      flat.push({ type: 'header', label: 'Historial' });
      results.historial.forEach((h) => flat.push({ type: 'historial', data: h }));
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

  useLayoutEffect(() => {
    if (!isOpen) return undefined;
    setQuery('');
    setSelectedIndex(0);
    // X10 (1.10.1): el foco inicial (y la restauración al cerrar) lo gestiona
    // useDialogA11y; antes se hackeaba con setTimeout(50) sobre el input.
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [isOpen]);

  // X10 (1.10.1): trampa de Tab + foco inicial/restauración + Escape, con el
  // mismo hook que usan ConfirmDialog/Modal (antes el role="dialog" no tenía
  // gestor de foco ni trampa: el Tab salía al fondo de la página).
  useDialogA11y(dialogRef, isOpen, { onEscape: close });

  // El cursor vuelve a 0 cuando cambia la lista de resultados (query debounceada),
  // no en cada tecla: así no se "salta" mientras el debounce resuelve.
  useEffect(() => {
    setSelectedIndex(0);
  }, [debouncedQuery]);

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

  // X14 (1.10.1): navegación mínima a la entidad elegida. App hoy pasa un
  // onSelectEntity que IGNORA tipo+nombre (solo setSelectedView('utiles')),
  // así que el resultado nunca llegaba al directorio concreto. Este handler
  // resuelve internamente el tab de Útiles correspondiente y:
  //   - si App pasa `onNavigateUtiles(tab, nombre)` → navega al tab exacto;
  //   - si no, cae en retrocompatibilidad con el prop legado onSelectEntity
  //     (mantiene el comportamiento actual de ir a 'utiles').
  const handleSelectEntidad = useCallback((tipo, nombre) => {
    const tab = TAB_UTILES_POR_TIPO[tipo];
    if (onNavigateUtiles) {
      onNavigateUtiles(tab, nombre, tipo);
      return;
    }
    if (onSelectEntity) onSelectEntity(tipo, nombre);
  }, [onNavigateUtiles, onSelectEntity]);

  const handleSelect = useCallback((item) => {
    guardarEnHistorial(query);
    if (item.type === 'case' && onSelectCase) onSelectCase(item.data.id);
    if (item.type === 'note' && onSelectNote) onSelectNote(item.data.id);
    if (item.type === 'event' && onSelectEvent) onSelectEvent(item.data.id);
    if ((item.type === 'reporte' || item.type === 'historial') && item.data.caseId !== undefined && onSelectCase) {
      onSelectCase(item.data.caseId);
    }
    if (item.type === 'insurer' || item.type === 'lawFirm') {
      handleSelectEntidad(item.type, item.data.nombre || item.data);
    }
    if (item.type === 'condicional') {
      handleSelectEntidad('condicional', item.data.aseguradora || item.data.estudio);
    }
    close();
  }, [onSelectCase, onSelectNote, onSelectEvent, handleSelectEntidad, close, guardarEnHistorial, query]);

  const getItemIndex = (flatIdx) => {
    let count = -1;
    for (let i = 0; i <= flatIdx; i++) {
      if (flatResults[i].type !== 'header') count++;
    }
    return count;
  };

  // X18 (1.10.1): el rol listbox solo aplica cuando hay resultados (el panel
  // de recientes/histórico es de botones, no opciones, y no debe mentirle a
  // la API de a11y con un listbox vacío).
  const hayOpciones = Boolean(debouncedQuery.trim()) && flatResults.some((r) => r.type !== 'header');

  if (!isOpen) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Búsqueda global"
      className="fixed inset-0 z-search flex items-start justify-center pt-[10vh]"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={close}
    >
      <div
        className="rounded-xl w-full max-w-3xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3.5 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <Search size={16} style={{ color: 'var(--color-text-muted)' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar casos, notas, eventos, reportes, historial... (#etiqueta / @comentario)"
            className="flex-1 bg-transparent border-none outline-none text-sm"
            style={{ color: 'var(--color-text)' }}
            // X18 (1.10.1): el cursor de flechas antes solo se comunicaba por
            // color de fondo; ahora el input declara el listbox y la opción
            // activa para lectores de pantalla.
            role="combobox"
            aria-expanded={hayOpciones}
            aria-controls="gs-listbox"
            aria-autocomplete="list"
            aria-activedescendant={hayOpciones ? `gs-opt-${selectedIndex}` : undefined}
            aria-label="Buscar en casos, notas, eventos, reportes, historial y entidades"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Limpiar búsqueda"
              className="p-1 rounded hover:bg-white/5 transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <X size={14} />
            </button>
          )}
          {debouncedQuery.trim() && totalItems > 0 && (
            <span
              className="hidden sm:inline-flex items-center text-[10px] font-semibold rounded-full px-2 py-0.5 whitespace-nowrap"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent) 13.3%, transparent)', color: 'var(--color-accent)' }}
            >
              {totalItems} resultado{totalItems !== 1 ? 's' : ''}
            </span>
          )}
          <span className="hidden sm:flex items-center gap-1 text-ds-xs" style={{ color: 'var(--color-text-muted)' }}>
            <span className="flex items-center" style={{ color: 'var(--color-accent)' }}><Hash size={10} />tag</span>
            <span className="flex items-center" style={{ color: 'var(--color-accent)' }}><AtSign size={10} />comentario</span>
          </span>
          <button onClick={close} className="p-1 rounded hover:bg-white/5" style={{ color: 'var(--color-text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        <div
          ref={listRef}
          className="max-h-[420px] overflow-y-auto"
          // X18 (1.10.1): contenedor de resultados como listbox real; cada fila
          // es una option con id/aria-selected y el input la referencia.
          id="gs-listbox"
          role={hayOpciones ? 'listbox' : undefined}
          aria-label="Resultados de búsqueda"
        >
          {!debouncedQuery.trim() ? (
            recientes.length > 0 ? (
              <div>
                <div className="px-3 py-1.5 text-ds-xs font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                  <History size={10} /> Vistos recientemente
                </div>
                {recientes.slice(0, 5).map((r, i) => {
                  const rIcon = r.type === 'insurer' ? Building2 : r.type === 'lawFirm' ? Scale : User;
                  return (
                    <button
                      key={`r-${i}`}
                      onClick={() => handleSelectEntidad(r.type, r.name)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors text-xs"
                      style={{ color: 'var(--color-text)', borderBottom: '1px solid var(--color-border)' }}
                    >
                      <rIcon size={12} style={{ color: 'var(--color-accent)' }} />
                      <span className="font-medium">{r.name}</span>
                      <span className="text-ds-xs" style={{ color: 'var(--color-text-muted)' }}>{r.type === 'insurer' ? 'Aseguradora' : r.type === 'lawFirm' ? 'Estudio' : 'Caso'}</span>
                    </button>
                  );
                })}
              </div>
            ) : historial.length > 0 && cfg.busquedaHistorial !== false ? (
              <div>
                <div className="px-3 py-1.5 text-ds-xs font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
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
              Sin resultados para "{debouncedQuery}"
            </div>
          ) : (
            flatResults.map((r, idx) => {
              if (r.type === 'header') return <GroupHeader key={`h-${idx}`} label={r.label} />;
              const itemIdx = getItemIndex(idx);
              const isSelected = itemIdx === selectedIndex;
              const meta = TYPE_META[r.type] || { label: 'BUSCAR', icon: Search, color: 'var(--color-accent)' };
              const content = (() => {
                if (r.type === 'case') {
                  const c = r.data;
                  const tags = (c.tags || []).slice(0, 3).map((t) => '#' + t).join(' ');
                  return { title: c.nombre || 'Sin nombre', subtitle: `${c.estado || '—'} | ${formatPhoneWithConfig(c.telefono) || '—'} | ${c.localidad || ''}${tags ? ' | ' + tags : ''}` };
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
                  return { title: n.title || 'Sin titulo', subtitle: `${tags || 'sin tags'} | ${formatDateWithConfig(n.updatedAt || n.createdAt || '')}${relationText}` };
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
                  return { title: e.title || 'Sin titulo', subtitle: `${formatDateWithConfig(e.startDate) || ''}${tags ? ' | ' + tags : ''} | ${e.status || ''}${relationText}` };
                }
                if (r.type === 'reporte') {
                  const rep = r.data;
                  return {
                    title: rep.texto || 'Reporte',
                    subtitle: `${rep.fecha ? '[' + rep.fecha + '] ' : ''}${rep.origen || ''} | Caso: ${rep.caseNombre}`,
                  };
                }
                if (r.type === 'historial') {
                  const h = r.data;
                  return {
                    title: h.title || 'Registro de historial',
                    subtitle: `${formatDateWithConfig(h.timestamp) || ''} | Caso: ${h.caseNombre}`,
                  };
                }
                if (r.type === 'insurer') {
                  // S11b (1.10.1): casesCount ahora lo calcula buscarEntidades
                  // con los casos reales (antes el campo no existía y decía
                  // "0 casos" siempre).
                  const n = r.data.casesCount || 0;
                  return { title: r.data.nombre || r.data, subtitle: `${n} caso${n === 1 ? '' : 's'}` };
                }
                if (r.type === 'lawFirm') {
                  const n = r.data.casesCount || 0;
                  return { title: r.data.nombre || r.data, subtitle: `${n} caso${n === 1 ? '' : 's'}` };
                }
                if (r.type === 'condicional') {
                  // S11b (1.10.1): el modelo real guarda .estudio (no el
                  // inexistente .estudioJuridico) y la condición como código
                  // ('no-toma' | 'condicion'); condicionalSubtitle compone
                  // "No toma|Con condiciones — <estudio>".
                  return { title: r.data.aseguradora || 'Sin aseguradora', subtitle: condicionalSubtitle(r.data) };
                }
                return { title: '', subtitle: '' };
              })();
              return (
                <div
                  key={`r-${idx}`}
                  // X18 (1.10.1): opción del listbox; el id la vincula con
                  // aria-activedescendant del input (cursor por flechas).
                  id={`gs-opt-${itemIdx}`}
                  role="option"
                  aria-selected={isSelected}
                  style={{ backgroundColor: isSelected ? 'var(--color-surface)' : 'transparent' }}
                  onMouseEnter={() => setSelectedIndex(itemIdx)}
                >
                  <ResultItem
                    icon={meta.icon}
                    title={content.title}
                    subtitle={content.subtitle}
                    badge={meta.label}
                    color={meta.color}
                    onSelect={() => handleSelect(r)}
                  />
                </div>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 border-t flex gap-3 text-ds-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
          <span><span style={{ color: 'var(--color-accent)' }}>&uarr;&darr;</span> Navegar</span>
          <span><span style={{ color: 'var(--color-accent)' }}>Enter</span> Abrir</span>
          <span><span style={{ color: 'var(--color-accent)' }}>Esc</span> Cerrar</span>
        </div>
      </div>
    </div>
  );
}
