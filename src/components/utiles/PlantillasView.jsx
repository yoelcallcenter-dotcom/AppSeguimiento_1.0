import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FileText, Plus, Copy, Trash2, Power, Pencil, LayoutGrid, List, ArrowUpDown } from 'lucide-react';
import {
  getAllTemplates,
  deleteTemplate,
  duplicateTemplate,
  toggleTemplateActive,
} from '../../features/templates/templatesStore';
import { TEMPLATE_TYPES, TEMPLATE_TYPE_LABELS, TEMPLATE_TYPE_ICONS } from '../../features/templates/templateTypes';
import { PlantillaForm } from './PlantillaForm';
import { Btn } from '../common/Btn';
import { SearchInput } from '../common/SearchInput';
import { EmptyState } from '../common/EmptyState';
import { Spinner } from '../common/Spinner';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { useJustifyPestanas } from '../common/UINav';

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
  const handleEdit = (tpl) => { setEditing(tpl); setShowForm(true); };
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
          {Object.values(TEMPLATE_TYPES).map((type) => (
            stats[type] ? <span key={type}>· {stats[type]} {TEMPLATE_TYPE_LABELS[type]}</span> : null
          ))}
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

        <div className="flex items-center gap-1" style={{ backgroundColor: 'var(--color-surface)', borderRadius: '6px', padding: '2px' }}>
          <button
            onClick={() => setViewMode('grid')}
            className="p-1 rounded transition-colors"
            style={{ backgroundColor: viewMode === 'grid' ? 'var(--color-accent)' : 'transparent', color: viewMode === 'grid' ? 'var(--color-text-on-accent)' : 'var(--color-text-muted)' }}
            title="Vista cuadrícula"
          >
            <LayoutGrid size={12} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className="p-1 rounded transition-colors"
            style={{ backgroundColor: viewMode === 'list' ? 'var(--color-accent)' : 'transparent', color: viewMode === 'list' ? 'var(--color-text-on-accent)' : 'var(--color-text-muted)' }}
            title="Vista lista"
          >
            <List size={12} />
          </button>
        </div>

        <button
          onClick={() => setSortAsc(!sortAsc)}
          className="p-1.5 rounded transition-colors"
          style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-muted)' }}
          title={sortAsc ? 'A → Z' : 'Z → A'}
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
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          message={templates.length === 0 ? 'No hay plantillas creadas' : 'No se encontraron plantillas'}
          size="md"
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((tpl) => {
            const Icon = TEMPLATE_TYPE_ICONS[tpl.type] || FileText;
            const preview = tpl.content?.content || tpl.content?.texto || tpl.content?.description || '';
            return (
              <div
                key={tpl.id}
                className="rounded-lg p-3 cursor-pointer group hover:shadow-lg transition-shadow"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  opacity: tpl.active === false ? 0.6 : 1,
                }}
                onClick={() => handleEdit(tpl)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon size={14} style={{ color: 'var(--color-accent)' }} />
                    <span className="text-xs font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                      {tpl.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); handleToggle(tpl.id); }} title={tpl.active === false ? 'Activar' : 'Desactivar'} className="p-0.5 rounded hover:bg-white/5">
                      <Power size={11} style={{ color: tpl.active === false ? 'var(--color-text-muted)' : 'var(--color-success, #10B981)' }} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDuplicate(tpl.id); }} title="Duplicar" className="p-0.5 rounded hover:bg-white/5">
                      <Copy size={11} style={{ color: 'var(--color-text-muted)' }} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(tpl); }} title="Eliminar" className="p-0.5 rounded hover:bg-white/5">
                      <Trash2 size={11} style={{ color: 'var(--color-danger, #EF4444)' }} />
                    </button>
                  </div>
                </div>
                {tpl.category && (
                  <span className="text-[10px] rounded px-1.5 py-0.5 mb-2 inline-block" style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent) 6.7%, transparent)', color: 'var(--color-accent)' }}>
                    {tpl.category}
                  </span>
                )}
                {preview && (
                  <p className="text-[10px] line-clamp-2 mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    {preview}
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
            return (
              <div
                key={tpl.id}
                className="flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-white/[0.02] transition-colors group"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  opacity: tpl.active === false ? 0.6 : 1,
                }}
                onClick={() => handleEdit(tpl)}
              >
                <Icon size={16} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                    {tpl.name}
                  </div>
                  <div className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                    <span>{TEMPLATE_TYPE_LABELS[tpl.type]}</span>
                    {tpl.category && <span>· {tpl.category}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); handleToggle(tpl.id); }} title={tpl.active === false ? 'Activar' : 'Desactivar'} className="p-1 rounded hover:bg-white/5">
                    <Power size={12} style={{ color: tpl.active === false ? 'var(--color-text-muted)' : 'var(--color-success, #10B981)' }} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDuplicate(tpl.id); }} title="Duplicar" className="p-1 rounded hover:bg-white/5">
                    <Copy size={12} style={{ color: 'var(--color-text-muted)' }} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(tpl); }} title="Eliminar" className="p-1 rounded hover:bg-white/5">
                    <Trash2 size={12} style={{ color: 'var(--color-danger, #EF4444)' }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
