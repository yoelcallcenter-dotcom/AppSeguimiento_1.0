import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FileText, Plus, Copy, Trash2, Power, Pencil, LayoutGrid, List, ArrowUpDown } from 'lucide-react';
import {
  getAllTemplates,
  deleteTemplate,
  duplicateTemplate,
  toggleTemplateActive,
} from '../../features/templates/templatesStore';
// 1.10.1: TYPE_COLORS vive en templateTypes.js para compartirse con el form
// (antes estaba definido solo acá y el form no podía usar la misma paleta).
import { TEMPLATE_TYPES, TEMPLATE_TYPE_LABELS, TEMPLATE_TYPE_ICONS, TYPE_COLORS } from '../../features/templates/templateTypes';
import { resolveVariables } from '../../features/templates/resolveVariables';
import { PlantillaForm } from './PlantillaForm';
import { Btn } from '../common/Btn';
import { BtnOutline } from '../common/BtnOutline';
import { Modal } from '../common/Modal';
import { SearchInput } from '../common/SearchInput';
import { EmptyState } from '../common/EmptyState';
import { Spinner } from '../common/Spinner';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { useJustifyPestanas } from '../common/UINav';

// Datos de ejemplo para la vista previa (mismo criterio que PlantillaForm).
const sampleContext = {
  caso: { nombre: 'ANA LOPEZ', telefono: '123456', aseguradora: 'Galeno ART', estudioJuridico: 'GL CABA', estado: 'Pendiente', localidad: 'CABA', profesion: 'Enfermera' },
  config: { operador: 'Juan Perez' },
};

// 1.10.1: badges de tipo y de estado (antes solo se insinuaba con opacidad
// 0.6 la plantilla pausada, sin etiqueta legible).
function TypeBadge({ type }) {
  const color = TYPE_COLORS[type] || 'var(--color-accent)';
  return (
    <span
      className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md flex-shrink-0"
      style={{ backgroundColor: `${color}14`, color, border: `1px solid ${color}22` }}
    >
      {TEMPLATE_TYPE_LABELS[type] || type}
    </span>
  );
}

function ActiveBadge({ active }) {
  if (active === false) {
    return (
      <span
        className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md flex-shrink-0"
        style={{ backgroundColor: 'var(--color-surface3)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
      >
        Pausada
      </span>
    );
  }
  return (
    <span
      className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md flex-shrink-0"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--color-success, #10B981) 13.3%, transparent)',
        color: 'var(--color-success, #10B981)',
        border: '1px solid color-mix(in srgb, var(--color-success, #10B981) 33%, transparent)',
      }}
    >
      Activa
    </span>
  );
}

// 1.10.1: contenido de la vista previa del modal, con variables resueltas
// sobre datos de ejemplo (así el usuario entiende qué hace la plantilla
// antes de meterse a editarla).
function PreviewContenido({ tpl }) {
  const resolved = resolveVariables(tpl.content || {}, sampleContext);
  const fila = (label, value) => (
    <div key={label}>
      <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </div>
      <div className="text-xs whitespace-pre-wrap mt-0.5" style={{ color: 'var(--color-text)' }}>
        {value || '—'}
      </div>
    </div>
  );
  switch (tpl.type) {
    case 'nota':
      return (
        <div className="space-y-3">
          {fila('Título', resolved.title)}
          {fila('Contenido', resolved.content)}
          {fila('Etiquetas', resolved.tags)}
        </div>
      );
    case 'reporte':
      return (
        <div className="space-y-3">
          {fila('Texto del reporte', resolved.texto)}
          {fila('Origen', resolved.origen)}
          {fila('Estado del caso al aplicar', tpl.content?.estado)}
        </div>
      );
    case 'evento':
      return (
        <div className="space-y-3">
          {fila('Título', resolved.title)}
          {fila('Descripción', resolved.description)}
          <div className="flex gap-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            <span>Prioridad: <b style={{ color: 'var(--color-text)' }}>{resolved.priority || 'medium'}</b></span>
            <span>Estado: <b style={{ color: 'var(--color-text)' }}>{resolved.status === 'confirmed' ? 'Confirmado' : 'Pendiente'}</b></span>
          </div>
        </div>
      );
    case 'comentario':
      return fila('Texto del comentario', resolved.texto);
    default:
      return null;
  }
}

export function PlantillasView({ showToast, config = {} }) {
  const justifyPestanas = useJustifyPestanas();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [sortAsc, setSortAsc] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null);
  // 1.10.1: clic en una plantilla abre la vista previa (modal) en lugar de
  // el form de edición — antes se metía directo a editar sin ver qué hacía.
  const [preview, setPreview] = useState(null);

  const load = useCallback(async () => {
    try {
      const all = await getAllTemplates();
      setTemplates(all);
    } catch {
      showToast('Error al cargar plantillas', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = () => { setEditing(null); setShowForm(true); };
  const handleEdit = (tpl) => { setPreview(null); setEditing(tpl); setShowForm(true); };
  const handleSave = async () => { setShowForm(false); setEditing(null); await load(); };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteTemplate(confirmDelete.id);
      showToast('Plantilla eliminada', 'success');
      setConfirmDelete(null);
      await load();
    } catch {
      showToast('Error al eliminar', 'error');
    }
  };

  const handleDuplicate = async (id) => {
    try {
      await duplicateTemplate(id);
      showToast('Plantilla duplicada', 'success');
      await load();
    } catch {
      showToast('Error al duplicar', 'error');
    }
  };

  const handleToggle = async (id) => {
    try {
      await toggleTemplateActive(id);
      await load();
    } catch {
      showToast('Error al cambiar estado', 'error');
    }
  };

  const filtered = useMemo(() => {
    let list = filterType === 'all'
      ? templates
      : templates.filter((t) => t.type === filterType);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((t) =>
        t.name.toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      const cmp = (a.name || '').localeCompare(b.name || '');
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [templates, filterType, search, sortAsc]);

  const stats = useMemo(() => {
    const counts = {};
    for (const t of templates) {
      counts[t.type] = (counts[t.type] || 0) + 1;
    }
    return counts;
  }, [templates]);

  const activas = useMemo(() => templates.filter((t) => t.active !== false).length, [templates]);

  if (showForm) {
    return (
      <PlantillaForm
        template={editing}
        onSave={handleSave}
        onCancel={() => { setShowForm(false); setEditing(null); }}
        showToast={showToast}
        config={config}
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
          Plantillas
        </h3>
        <div className="flex items-center gap-2 text-[10px] flex-wrap" style={{ color: 'var(--color-text-muted)' }}>
          <span>{templates.length} total</span>
          <span>· {activas} activas</span>
          {Object.values(TEMPLATE_TYPES).map((type) => (
            stats[type] ? <span key={type}>· {stats[type]} {TEMPLATE_TYPE_LABELS[type]}</span> : null
          ))}
          {/* Contador filtrado: cuánto de todo estoy viendo. */}
          {filtered.length !== templates.length && (
            <span style={{ color: 'var(--color-accent)' }}>· Mostrando {filtered.length} de {templates.length}</span>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1 min-w-[160px]">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar plantillas..."
            compact
          />
        </div>

        {/* X11 (1.10.1): p-1 → p-1.5. Los toggles de vista eran p-1 + icono
            12px = 20px de target (<24px, WCAG 2.5.8); con p-1.5 = 24px. */}
        <div className="flex items-center gap-1" style={{ backgroundColor: 'var(--color-surface)', borderRadius: '6px', padding: '2px' }}>
          <button
            onClick={() => setViewMode('grid')}
            className="p-1.5 rounded transition-colors"
            style={{ backgroundColor: viewMode === 'grid' ? 'var(--color-accent)' : 'transparent', color: viewMode === 'grid' ? 'var(--color-text-on-accent)' : 'var(--color-text-muted)' }}
            title="Vista cuadrícula"
            aria-label="Vista cuadrícula"
            aria-pressed={viewMode === 'grid'}
          >
            <LayoutGrid size={12} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className="p-1.5 rounded transition-colors"
            style={{ backgroundColor: viewMode === 'list' ? 'var(--color-accent)' : 'transparent', color: viewMode === 'list' ? 'var(--color-text-on-accent)' : 'var(--color-text-muted)' }}
            title="Vista lista"
            aria-label="Vista lista"
            aria-pressed={viewMode === 'list'}
          >
            <List size={12} />
          </button>
        </div>

        <button
          onClick={() => setSortAsc(!sortAsc)}
          className="p-1.5 rounded transition-colors"
          style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-muted)' }}
          title={sortAsc ? 'Ordenar Z → A' : 'Ordenar A → Z'}
          aria-label={sortAsc ? 'Ordenar Z → A' : 'Ordenar A → Z'}
        >
          <ArrowUpDown size={12} />
        </button>

        <div className="flex gap-1 flex-wrap grow" style={{ justifyContent: justifyPestanas }}>
          <button
            onClick={() => setFilterType('all')}
            className={`category-tab ${filterType === 'all' ? 'active' : ''}`}
          >
            Todas
          </button>
          {Object.values(TEMPLATE_TYPES).map((type) => {
            const Icon = TEMPLATE_TYPE_ICONS[type];
            return (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`category-tab gap-1 ${filterType === type ? 'active' : ''}`}
              >
                <Icon size={10} />
                {TEMPLATE_TYPE_LABELS[type]}
              </button>
            );
          })}
        </div>

        <Btn icon={Plus} size="sm" onClick={handleCreate}>
          Nueva plantilla
        </Btn>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : templates.length === 0 ? (
        /* Empty state inicial con CTA: el usuario nuevo sabe qué hacer. */
        <div className="flex flex-col items-center gap-3 py-4">
          <EmptyState
            icon={FileText}
            message="No hay plantillas creadas. Con las plantillas reutilizás textos de reportes, notas y eventos sin reescribirlos."
            size="md"
          />
          <Btn icon={Plus} size="sm" onClick={handleCreate}>
            Crear la primera plantilla
          </Btn>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          message="No se encontraron plantillas"
          size="md"
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((tpl) => {
            const Icon = TEMPLATE_TYPE_ICONS[tpl.type] || FileText;
            const iconColor = TYPE_COLORS[tpl.type] || 'var(--color-accent)';
            const previewText = tpl.content?.content || tpl.content?.texto || tpl.content?.description || '';
            return (
              <div
                key={tpl.id}
                role="button"
                tabIndex={0}
                aria-label={`Ver detalle de la plantilla ${tpl.name}`}
                className="rounded-lg p-3 cursor-pointer group hover:shadow-lg transition-shadow"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  opacity: tpl.active === false ? 0.6 : 1,
                }}
                onClick={() => setPreview(tpl)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPreview(tpl); } }}
              >
                <div className="flex items-start justify-between mb-2 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon size={14} style={{ color: iconColor, flexShrink: 0 }} />
                    <span className="text-xs font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                      {tpl.name}
                    </span>
                  </div>
                  {/* X11 (1.10.1): p-1 → p-1.5 en botones de acción. */}
                  <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); handleEdit(tpl); }} title="Editar" aria-label={`Editar ${tpl.name}`} className="p-1.5 rounded hover:bg-white/5">
                      <Pencil size={12} style={{ color: 'var(--color-text-muted)' }} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleToggle(tpl.id); }} title={tpl.active === false ? 'Activar' : 'Pausar'} aria-label={`${tpl.active === false ? 'Activar' : 'Pausar'} ${tpl.name}`} className="p-1.5 rounded hover:bg-white/5">
                      <Power size={12} style={{ color: tpl.active === false ? 'var(--color-text-muted)' : 'var(--color-success, #10B981)' }} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDuplicate(tpl.id); }} title="Duplicar" aria-label={`Duplicar ${tpl.name}`} className="p-1.5 rounded hover:bg-white/5">
                      <Copy size={12} style={{ color: 'var(--color-text-muted)' }} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(tpl); }} title="Eliminar" aria-label={`Eliminar ${tpl.name}`} className="p-1.5 rounded hover:bg-white/5">
                      <Trash2 size={12} style={{ color: 'var(--color-danger, #EF4444)' }} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap mb-2">
                  <TypeBadge type={tpl.type} />
                  <ActiveBadge active={tpl.active} />
                  {tpl.category && (
                    <span className="text-[10px] rounded px-1.5 py-0.5" style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent) 6.7%, transparent)', color: 'var(--color-accent)' }}>
                      {tpl.category}
                    </span>
                  )}
                </div>
                {previewText && (
                  <p className="text-[10px] line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>
                    {previewText}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map((tpl) => {
            const Icon = TEMPLATE_TYPE_ICONS[tpl.type] || FileText;
            const iconColor = TYPE_COLORS[tpl.type] || 'var(--color-accent)';
            return (
              <div
                key={tpl.id}
                role="button"
                tabIndex={0}
                aria-label={`Ver detalle de la plantilla ${tpl.name}`}
                className="flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-white/[0.02] transition-colors group"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  opacity: tpl.active === false ? 0.6 : 1,
                }}
                onClick={() => setPreview(tpl)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPreview(tpl); } }}
              >
                <Icon size={16} style={{ color: iconColor, flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                    {tpl.name}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                    <TypeBadge type={tpl.type} />
                    <ActiveBadge active={tpl.active} />
                    {tpl.category && <span>· {tpl.category}</span>}
                  </div>
                </div>
                {/* X11 (1.10.1): p-1 → p-1.5 en los botones de acción
                    (icono 12px: 20px → 24px, WCAG 2.5.8 mínimo). */}
                <div className="flex items-center gap-1 flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); handleEdit(tpl); }} title="Editar" aria-label={`Editar ${tpl.name}`} className="p-1.5 rounded hover:bg-white/5">
                    <Pencil size={12} style={{ color: 'var(--color-text-muted)' }} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleToggle(tpl.id); }} title={tpl.active === false ? 'Activar' : 'Pausar'} aria-label={`${tpl.active === false ? 'Activar' : 'Pausar'} ${tpl.name}`} className="p-1.5 rounded hover:bg-white/5">
                    <Power size={12} style={{ color: tpl.active === false ? 'var(--color-text-muted)' : 'var(--color-success, #10B981)' }} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDuplicate(tpl.id); }} title="Duplicar" aria-label={`Duplicar ${tpl.name}`} className="p-1.5 rounded hover:bg-white/5">
                    <Copy size={12} style={{ color: 'var(--color-text-muted)' }} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(tpl); }} title="Eliminar" aria-label={`Eliminar ${tpl.name}`} className="p-1.5 rounded hover:bg-white/5">
                    <Trash2 size={12} style={{ color: 'var(--color-danger, #EF4444)' }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 1.10.1: vista previa en modal (variables resueltas con datos de
          ejemplo). Desde acá se puede entrar a editar. El Modal maneja
          Escape/portal/foco vía useModal (pila N17). */}
      <Modal
        isOpen={!!preview}
        onClose={() => setPreview(null)}
        title={preview ? preview.name : 'Vista previa'}
        icon={preview ? (TEMPLATE_TYPE_ICONS[preview.type] || FileText) : FileText}
        size="md"
        subheader={preview ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            <TypeBadge type={preview.type} />
            <ActiveBadge active={preview.active} />
            {preview.category && (
              <span className="text-[10px] rounded px-1.5 py-0.5" style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent) 6.7%, transparent)', color: 'var(--color-accent)' }}>
                {preview.category}
              </span>
            )}
          </div>
        ) : null}
        footer={preview ? (
          <>
            <BtnOutline size="sm" icon={Pencil} onClick={() => handleEdit(preview)}>
              Editar
            </BtnOutline>
            <Btn size="sm" onClick={() => setPreview(null)}>
              Cerrar
            </Btn>
          </>
        ) : null}
      >
        {preview && <PreviewContenido tpl={preview} />}
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar plantilla"
        message={`¿Eliminar la plantilla "${confirmDelete?.name}"?`}
      />
    </div>
  );
}

export default PlantillasView;
