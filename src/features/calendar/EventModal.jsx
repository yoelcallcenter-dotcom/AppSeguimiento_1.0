import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Flag, AlignLeft, Link, User, Trash2, Tag, ExternalLink } from 'lucide-react';
import { Btn } from '../../components/common/Btn';
import { BtnOutline } from '../../components/common/BtnOutline';
import { TextInput } from '../../components/common/TextInput';
import { TextArea } from '../../components/common/TextArea';
import { CaseLinker } from '../../components/common/CaseLinker';
import TagsPills from '../../components/common/TagsPills';
import { sanitizeString } from '../../utils/sanitize';

const PRIORITIES = [
  { value: 'low', label: 'Baja', color: '#10B981' },
  { value: 'medium', label: 'Media', color: '#F59E0B' },
  { value: 'high', label: 'Alta', color: '#EF4444' },
];

const STATUSES = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'completed', label: 'Completado' },
  { value: 'cancelled', label: 'Cancelado' },
];

export default function EventModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  event,
  notes,
  casos = [],
  onVerCaso,
}) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    startTime: '09:00',
    endTime: '10:00',
    status: 'pending',
    priority: 'medium',
    relatedNoteId: null,
    relatedCaseIds: [],
    tags: [],
  });
  const [errors, setErrors] = useState({});
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    const prelinkedCaseId = sessionStorage.getItem('evento-caso-vincular');
    const prelinkedCaseIds = prelinkedCaseId ? [prelinkedCaseId] : [];
    sessionStorage.removeItem('evento-caso-vincular');

    if (event) {
      setForm({
        title: event.title || '',
        description: event.description || '',
        startDate: (event.startDate || '').slice(0, 10),
        endDate: (event.endDate || event.startDate || '').slice(0, 10),
        startTime: (event.startDate || '').slice(11, 16) || '09:00',
        endTime: (event.endDate || '').slice(11, 16) || '10:00',
        status: event.status || 'pending',
        priority: event.priority || 'medium',
        relatedNoteId: event.relatedNoteId || null,
        relatedCaseIds: event.relatedCaseIds?.length ? event.relatedCaseIds : prelinkedCaseIds,
        tags: Array.isArray(event.tags) ? event.tags : [],
      });
    } else {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      setForm({
        title: '',
        description: '',
        startDate: dateStr,
        endDate: dateStr,
        startTime: '09:00',
        endTime: '10:00',
        status: 'pending',
        priority: 'medium',
        relatedNoteId: null,
        relatedCaseIds: prelinkedCaseIds,
        tags: [],
      });
    }
    setErrors({});
    setTagInput('');
  }, [event, isOpen]);

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'El titulo es requerido';
    if (!form.startDate) errs.startDate = 'La fecha de inicio es requerida';
    if (form.endDate && form.endDate < form.startDate) errs.endDate = 'La fecha de fin no puede ser anterior a la de inicio';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      ...form,
      startDate: `${form.startDate}T${form.startTime}:00`,
      endDate: `${form.endDate || form.startDate}T${form.endTime}:00`,
    });
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAddTag = () => {
    const tag = sanitizeString(tagInput.trim());
    if (!tag) return;
    setForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags : [...prev.tags, tag],
    }));
    setTagInput('');
  };

  const handleRemoveTag = (tag) => {
    setForm(prev => ({ ...prev, tags: (prev.tags || []).filter(t => t !== tag) }));
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            {event ? 'Editar evento' : 'Nuevo evento'}
          </span>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/5" style={{ color: 'var(--color-text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>
              Titulo <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <div className="relative">
              <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
              <TextInput
                value={form.title}
                onChange={e => handleChange('title', e.target.value)}
                placeholder="Titulo del evento"
                className="pl-8"
              />
            </div>
            {errors.title && <span className="text-[10px]" style={{ color: 'var(--color-danger)' }}>{errors.title}</span>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>
                Fecha inicio
              </label>
              <input
                type="date"
                value={form.startDate}
                onChange={e => handleChange('startDate', e.target.value)}
                className="w-full rounded-md px-3 py-2 text-sm"
                style={{
                  backgroundColor: 'var(--color-surface2)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                  height: '2.5rem',
                }}
              />
              {errors.startDate && <span className="text-[10px]" style={{ color: 'var(--color-danger)' }}>{errors.startDate}</span>}
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>
                Hora inicio
              </label>
              <input
                type="time"
                value={form.startTime}
                onChange={e => handleChange('startTime', e.target.value)}
                className="w-full rounded-md px-3 py-2 text-sm"
                style={{
                  backgroundColor: 'var(--color-surface2)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                  height: '2.5rem',
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>
                Fecha fin
              </label>
              <input
                type="date"
                value={form.endDate}
                onChange={e => handleChange('endDate', e.target.value)}
                className="w-full rounded-md px-3 py-2 text-sm"
                style={{
                  backgroundColor: 'var(--color-surface2)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                  height: '2.5rem',
                }}
              />
              {errors.endDate && <span className="text-[10px]" style={{ color: 'var(--color-danger)' }}>{errors.endDate}</span>}
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>
                Hora fin
              </label>
              <input
                type="time"
                value={form.endTime}
                onChange={e => handleChange('endTime', e.target.value)}
                className="w-full rounded-md px-3 py-2 text-sm"
                style={{
                  backgroundColor: 'var(--color-surface2)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                  height: '2.5rem',
                }}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>
              Descripcion
            </label>
            <TextArea
              rows={3}
              value={form.description}
              onChange={e => handleChange('description', e.target.value)}
              placeholder="Descripcion del evento..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>
                Estado
              </label>
              <select
                value={form.status}
                onChange={e => handleChange('status', e.target.value)}
                className="w-full rounded-md px-3 py-2 text-sm"
                style={{
                  backgroundColor: 'var(--color-surface2)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                  height: '2.5rem',
                }}
              >
                {STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>
                Prioridad
              </label>
              <div className="flex gap-1 h-[2.5rem] items-center">
                {PRIORITIES.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => handleChange('priority', p.value)}
                    className="flex-1 h-full rounded text-xs font-semibold transition-colors"
                    style={{
                      backgroundColor: form.priority === p.value ? p.color + '33' : 'var(--color-surface2)',
                      border: `1px solid ${form.priority === p.value ? p.color : 'var(--color-border)'}`,
                      color: form.priority === p.value ? p.color : 'var(--color-text-muted)',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>
              <Tag size={12} className="inline mr-1" /> Etiquetas (#)
            </label>
            <TagsPills tags={form.tags || []} onRemove={handleRemoveTag} />
            <div className="flex gap-1 mt-1">
              <TextInput
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                placeholder="Nueva etiqueta..."
                className="flex-1"
                style={{ padding: '2px 8px', fontSize: 10, minWidth: 0 }}
              />
              <Btn type="button" onClick={handleAddTag} size="sm">Agregar</Btn>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>
              Vincular nota
            </label>
            <select
              value={form.relatedNoteId || ''}
              onChange={e => handleChange('relatedNoteId', e.target.value || null)}
              className="w-full rounded-md px-3 py-2 text-sm"
              style={{
                backgroundColor: 'var(--color-surface2)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
                height: '2.5rem',
              }}
            >
              <option value="">Sin vinculo</option>
              {(notes || []).map(n => (
                <option key={n.id} value={n.id}>{n.title || 'Sin titulo'}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>
              <User size={12} className="inline mr-1" /> Vincular casos
            </label>
            {/* Clickable links to linked cases */}
            {form.relatedCaseIds && form.relatedCaseIds.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1">
                {form.relatedCaseIds.map((caseId) => {
                  const linkedCase = casos.find((c) => String(c.id) === String(caseId));
                  if (!linkedCase) return null;
                  return (
                    <button
                      key={caseId}
                      type="button"
                      onClick={() => onVerCaso && onVerCaso(linkedCase)}
                      className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md hover:opacity-70 transition-opacity"
                      style={{
                        backgroundColor: 'var(--color-accent)22',
                        color: 'var(--color-accent)',
                        border: '1px solid var(--color-accent)44',
                      }}
                    >
                      <ExternalLink size={9} />
                      {linkedCase.nombre || 'Sin nombre'}
                    </button>
                  );
                })}
              </div>
            )}
            <CaseLinker
              casos={casos}
              selectedIds={form.relatedCaseIds || []}
              onChange={(ids) => handleChange('relatedCaseIds', ids)}
            />
          </div>

          <div className="flex justify-between gap-2 pt-2">
            <div>
              {event && onDelete && (
                <BtnOutline type="button" onClick={() => onDelete(event.id)} color="var(--color-danger)" size="sm" icon={Trash2}>
                  Eliminar
                </BtnOutline>
              )}
            </div>
            <div className="flex gap-2">
              <BtnOutline type="button" onClick={onClose} color="var(--color-text-muted)" size="sm">
                Cancelar
              </BtnOutline>
              <Btn type="submit" size="sm">
                {event ? 'Guardar cambios' : 'Crear evento'}
              </Btn>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
