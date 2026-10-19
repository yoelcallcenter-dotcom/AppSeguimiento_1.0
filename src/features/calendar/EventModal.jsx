import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, FileText, Flag, Link2, Tag, Trash2, Info } from 'lucide-react';
import { Btn } from '../../components/common/Btn';
import { BtnOutline } from '../../components/common/BtnOutline';
import { TextInput } from '../../components/common/TextInput';
import { TextArea } from '../../components/common/TextArea';
import { CaseLinker } from '../../components/common/CaseLinker';
import TagsPills from '../../components/common/TagsPills';
import { Modal } from '../../components/common/Modal';
import { TemplateSelector } from '../../components/common/TemplateSelector';
import { sanitizeString } from '../../utils/sanitize';
// v1.9.7 (fix B3): fecha por defecto de un evento nuevo en hora local (antes:
// toISOString en UTC, que tras las 21:00 proponía "mañana").
// 1.10.3: fechaCortaLabel/fechaRelativaLabel alimentan el preview en vivo.
import { hoyISO, fechaCortaLabel, fechaRelativaLabel } from '../../utils/dateUtils';

const PRIORITIES = [
  { value: 'low', label: 'Baja', color: '#10B981' },
  { value: 'medium', label: 'Media', color: '#F59E0B' },
  { value: 'high', label: 'Alta', color: '#EF4444' },
];

// 1.10.3: cada estado ganó color propio (antes era un select nativo sin
// lectura visual). El orden y los values son los mismos que consume el
// calendario ('pending' | 'confirmed' | 'completed' | 'cancelled').
const STATUSES = [
  { value: 'pending', label: 'Pendiente', color: '#F59E0B' },
  { value: 'confirmed', label: 'Confirmado', color: '#3B82F6' },
  { value: 'completed', label: 'Completado', color: '#10B981' },
  { value: 'cancelled', label: 'Cancelado', color: '#9CA3AF' },
];

// 1.10.3-rev2: estilo compartido de TODOS los inputs del form. La primera
// versión del rediseño mezclaba tamaños (mini-input de fecha fin, grids de 3
// columnas donde los date se cortaban) y eso se leía como UI improvisada.
const INPUT_STYLE = {
  backgroundColor: 'var(--color-surface2)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text)',
  height: '2.5rem',
};

/** "HH:MM" a minutos desde medianoche, o null si es inválido. */
function hhmmToMin(hhmm) {
  const m = String(hhmm || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Minutos (positivos) a "HH:MM" con wrap de 24 h. */
function minToHHMM(total) {
  const t = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

/** Duración legible entre dos horas ("1 h", "1 h 30 min", "45 min"). */
function duracionLabel(start, end) {
  const s = hhmmToMin(start);
  const e = hhmmToMin(end);
  if (s === null || e === null || e <= s) return '';
  const d = e - s;
  const h = Math.floor(d / 60);
  const m = d % 60;
  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} h`;
  return `${m} min`;
}

/** Chip de color activo/inactivo (subheader y clasificación). */
function chipStyle(color, active) {
  return {
    backgroundColor: active ? `${color}22` : 'transparent',
    border: `1px solid ${active ? color : 'var(--color-border)'}`,
    color: active ? color : 'var(--color-text-muted)',
  };
}

/**
 * Tarjeta de sección (1.10.3): el form dejó de ser un bloque apilado sin
 * jerarquía; se agrupa en Cuándo / Detalles / Clasificación / Vinculaciones.
 * rev2: título en text-xs (no 10px) para no romper la escala tipográfica.
 */
function SectionCard({ icon: Icon, title, children }) {
  return (
    <section
      className="rounded-lg p-3"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div
        className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider mb-2"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <Icon size={13} />
        {title}
      </div>
      {children}
    </section>
  );
}

/** Label de campo (único patrón en todo el form). */
function FieldLabel({ htmlFor, children, required }) {
  return (
    <label htmlFor={htmlFor} className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>
      {children}
      {required && <span style={{ color: 'var(--color-danger)' }}> *</span>}
    </label>
  );
}

export default function EventModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  event,
  notes,
  casos = [],
  config = {},
  onVerCaso,
  initialData,
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
    eventType: 'manual',
    relatedReportId: null,
    originalEventId: null,
    caseContext: null,
  });
  const [errors, setErrors] = useState({});
  const [tagInput, setTagInput] = useState('');
  // 1.10.3: estado de guardado para el botón con loading.
  const [saving, setSaving] = useState(false);
  // 1.10.3: auto-cálculo de hora fin. durRef conserva la duración actual y
  // endTouchedRef recuerda si el usuario editó la hora fin a mano (si la
  // editó, mover la hora inicio ya no la pisa).
  const durRef = useRef(60);
  const endTouchedRef = useRef(false);

  useEffect(() => {
    const prelinkedCaseId = sessionStorage.getItem('evento-caso-vincular');
    const prelinkedCaseIds = prelinkedCaseId ? [prelinkedCaseId] : [];
    sessionStorage.removeItem('evento-caso-vincular');

    if (event) {
      const startTime = (event.startDate || '').slice(11, 16) || '09:00';
      const endTime = (event.endDate || '').slice(11, 16) || '10:00';
      setForm({
        title: event.title || '',
        description: event.description || '',
        startDate: (event.startDate || '').slice(0, 10),
        endDate: (event.endDate || event.startDate || '').slice(0, 10),
        startTime,
        endTime,
        status: event.status || 'pending',
        priority: event.priority || 'medium',
        relatedNoteId: event.relatedNoteId || null,
        relatedCaseIds: event.relatedCaseIds?.length ? event.relatedCaseIds : prelinkedCaseIds,
        tags: Array.isArray(event.tags) ? event.tags : [],
        eventType: event.eventType || 'manual',
        relatedReportId: event.relatedReportId || null,
        originalEventId: event.originalEventId || null,
        caseContext: event.caseContext || null,
      });
      const sm = hhmmToMin(startTime);
      const em = hhmmToMin(endTime);
      durRef.current = sm !== null && em !== null && em > sm ? em - sm : 60;
    } else {
      // v1.9.7 (fix B3): fecha por defecto del evento en hora local (antes:
      // now.toISOString() en UTC → tras las 21:00 proponía el día siguiente).
      const dateStr = (initialData?.startDate) || hoyISO();
      const startTime = initialData?.startTime || '09:00';
      const endTime = initialData?.endTime || '10:00';
      let caseContext = null;
      if (prelinkedCaseIds.length > 0) {
        const linked = (casos || []).find((c) => c.id === prelinkedCaseIds[0]);
        if (linked) {
          caseContext = {
            nombre: linked.nombre || '',
            estado: linked.estado || '',
            aseguradora: linked.aseguradora || '',
            estudioJuridico: linked.estudioJuridico || '',
            localidad: linked.localidad || '',
          };
        }
      }
      setForm({
        title: '',
        description: '',
        startDate: dateStr,
        endDate: dateStr,
        startTime,
        endTime,
        status: 'pending',
        priority: 'medium',
        relatedNoteId: null,
        relatedCaseIds: prelinkedCaseIds,
        tags: [],
        eventType: 'manual',
        relatedReportId: null,
        originalEventId: null,
        caseContext,
      });
      const sm = hhmmToMin(startTime);
      const em = hhmmToMin(endTime);
      durRef.current = sm !== null && em !== null && em > sm ? em - sm : 60;
    }
    // 1.10.3: cada apertura arranca con el fin "automático".
    endTouchedRef.current = false;
    setErrors({});
    setTagInput('');
    setSaving(false);
  }, [event, isOpen, initialData]);

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'El titulo es requerido';
    if (!form.startDate) errs.startDate = 'La fecha de inicio es requerida';
    if (form.endDate && form.endDate < form.startDate) errs.endDate = 'La fecha de fin no puede ser anterior a la de inicio';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave({
        ...form,
        startDate: `${form.startDate}T${form.startTime}:00`,
        endDate: `${form.endDate || form.startDate}T${form.endTime}:00`,
      });
    } finally {
      // Si onSave lanza, el modal vive igual y el botón vuelve a habilitarse.
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // 1.10.3: al tocar un campo se limpia su error (validación reactiva).
    setErrors(prev => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  // 1.10.3: al mover la hora inicio se arrastra la fin conservando la
  // duración (a menos que el usuario haya editado la fin a mano).
  const changeStartTime = (value) => {
    setForm(prev => {
      const next = { ...prev, startTime: value };
      if (!endTouchedRef.current) {
        const sm = hhmmToMin(value);
        if (sm !== null) next.endTime = minToHHMM(sm + durRef.current);
      }
      return next;
    });
  };

  // 1.10.3: edición manual de la hora fin: marca el fin como propio y guarda
  // la nueva duración para los próximos arrastres.
  const changeEndTime = (value) => {
    endTouchedRef.current = true;
    const sm = hhmmToMin(form.startTime);
    const em = hhmmToMin(value);
    if (sm !== null && em !== null && em > sm) durRef.current = em - sm;
    handleChange('endTime', value);
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

  const duration = duracionLabel(form.startTime, form.endTime);
  const relativo = fechaRelativaLabel(form.startDate);
  const statusMeta = STATUSES.find(s => s.value === form.status) || STATUSES[0];
  const priorityMeta = PRIORITIES.find(p => p.value === form.priority) || PRIORITIES[1];

  // 1.10.3: subheader con resumen en vivo — el evento mientras se edita.
  // rev2: se conserva tal cual (único bloque pedido mantener).
  const preview = (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className="text-sm font-semibold truncate"
        style={{ color: 'var(--color-text)', maxWidth: '16rem' }}
      >
        {form.title.trim() || 'Sin título'}
      </span>
      <span
        className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
        style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
      >
        <Calendar size={11} />
        {fechaCortaLabel(form.startDate) || '—'} · {form.startTime}–{form.endTime}
      </span>
      {relativo && (
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-accent) 13.3%, transparent)',
            color: 'var(--color-accent)',
          }}
        >
          {relativo}
        </span>
      )}
      <span
        className="text-xs font-semibold px-2 py-0.5 rounded-full"
        style={chipStyle(priorityMeta.color, true)}
      >
        {priorityMeta.label}
      </span>
      <span
        className="text-xs font-semibold px-2 py-0.5 rounded-full"
        style={chipStyle(statusMeta.color, true)}
      >
        {statusMeta.label}
      </span>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={event ? 'Editar evento' : 'Nuevo evento'}
      icon={Calendar}
      size="lg"
      zIndex="z-calendar-modal"
      closeOnOverlayClick
      subheader={preview}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {(form.eventType === 'cita' || form.eventType === 'reprogramacion') && (
          <div
            className="rounded-md p-2.5 text-xs flex items-start gap-2"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-accent) 6.7%, transparent)',
              border: '1px solid color-mix(in srgb, var(--color-accent) 26.7%, transparent)',
              color: 'var(--color-text)',
            }}
          >
            <Info size={14} style={{ color: 'var(--color-accent)', flexShrink: 0, marginTop: 1 }} />
            <span>
              {form.eventType === 'cita'
                ? 'Evento automático generado desde el campo CITA del caso. Se sincroniza automáticamente.'
                : 'Evento de reprogramación vinculado a un caso. Representa la nueva cita agendada.'}
            </span>
          </div>
        )}

        <TemplateSelector
          type="evento"
          caso={form.caseContext}
          config={config}
          onSelect={(resolved) => {
            const updates = {};
            if (resolved.title) updates.title = resolved.title;
            if (resolved.description) updates.description = resolved.description;
            if (resolved.priority) updates.priority = resolved.priority;
            if (resolved.status) updates.status = resolved.status;
            if (resolved.tags) updates.tags = resolved.tags;
            setForm(prev => ({ ...prev, ...updates }));
          }}
        />

        {/* 1.10.3-rev2: "Cuándo" — 2+2 columnas (los date/time a full ancho de
            su celda; la versión anterior usaba 3 columnas y los date se
            cortaban). Fecha fin degradada de "mini-input" a campo normal. */}
        <SectionCard icon={Clock} title="Cuándo">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel htmlFor="ev-startDate">Fecha inicio</FieldLabel>
              <input
                id="ev-startDate"
                type="date"
                value={form.startDate}
                onChange={(e) => {
                  const prevDate = form.startDate;
                  const nextDate = e.target.value;
                  handleChange('startDate', nextDate);
                  // Si la fecha fin seguía a la de inicio, la sigue (sin pisar
                  // una fin elegida a mano en otro día).
                  if (form.endDate === prevDate) handleChange('endDate', nextDate);
                }}
                className="w-full rounded-md px-3 py-2 text-sm"
                style={INPUT_STYLE}
              />
              {errors.startDate && <span role="alert" aria-live="polite" className="text-xs block mt-1" style={{ color: 'var(--color-danger)' }}>{errors.startDate}</span>}
            </div>
            <div>
              <FieldLabel htmlFor="ev-endDate">Fecha fin</FieldLabel>
              <input
                id="ev-endDate"
                type="date"
                value={form.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
                className="w-full rounded-md px-3 py-2 text-sm"
                style={INPUT_STYLE}
              />
              {errors.endDate && <span role="alert" aria-live="polite" className="text-xs block mt-1" style={{ color: 'var(--color-danger)' }}>{errors.endDate}</span>}
            </div>
            <div>
              <FieldLabel htmlFor="ev-startTime">Hora inicio</FieldLabel>
              <input
                id="ev-startTime"
                type="time"
                value={form.startTime}
                onChange={(e) => changeStartTime(e.target.value)}
                className="w-full rounded-md px-3 py-2 text-sm"
                style={INPUT_STYLE}
              />
            </div>
            <div>
              <FieldLabel htmlFor="ev-endTime">Hora fin</FieldLabel>
              <input
                id="ev-endTime"
                type="time"
                value={form.endTime}
                onChange={(e) => changeEndTime(e.target.value)}
                className="w-full rounded-md px-3 py-2 text-sm"
                style={INPUT_STYLE}
              />
            </div>
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
            {duration
              ? `Duración: ${duration} — al cambiar la hora de inicio, la de fin se ajusta sola.`
              : 'Al cambiar la hora de inicio, la de fin se ajusta sola.'}
          </p>
        </SectionCard>

        {/* 1.10.3: "Detalles" — título y descripción. */}
        <SectionCard icon={FileText} title="Detalles">
          <div className="space-y-2">
            <div>
              <FieldLabel htmlFor="ev-title" required>Titulo</FieldLabel>
              <TextInput
                id="ev-title"
                value={form.title}
                onChange={e => handleChange('title', e.target.value)}
                placeholder="Titulo del evento"
              />
              {errors.title && <span role="alert" aria-live="polite" className="text-xs block mt-1" style={{ color: 'var(--color-danger)' }}>{errors.title}</span>}
            </div>
            <div>
              <FieldLabel htmlFor="ev-description">Descripcion</FieldLabel>
              <TextArea
                id="ev-description"
                rows={3}
                value={form.description}
                onChange={e => handleChange('description', e.target.value)}
                placeholder="Descripcion del evento..."
              />
            </div>
          </div>
        </SectionCard>

        {/* 1.10.3-rev2: "Clasificación" — chips con tamaño propio y wrap (la
            versión anterior forzaba flex-1 en una fila fija y los labels
            largos se cortaban). Etiquetas en dos filas (pills + alta). */}
        <SectionCard icon={Flag} title="Clasificación">
          <div className="space-y-2">
            <div>
              <div className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Prioridad
              </div>
              <div
                role="group"
                aria-label="Prioridad"
                className="flex flex-wrap gap-1"
              >
                {PRIORITIES.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    aria-pressed={form.priority === p.value}
                    onClick={() => handleChange('priority', p.value)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
                    style={chipStyle(p.color, form.priority === p.value)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Estado
              </div>
              <div
                role="group"
                aria-label="Estado"
                className="flex flex-wrap gap-1"
              >
                {STATUSES.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    aria-pressed={form.status === s.value}
                    onClick={() => handleChange('status', s.value)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
                    style={chipStyle(s.color, form.status === s.value)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                <Tag size={12} /> Etiquetas (#)
              </div>
              <TagsPills tags={form.tags || []} onRemove={handleRemoveTag} />
              <div className="flex gap-1 mt-1">
                <TextInput
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                  placeholder="Nueva etiqueta..."
                  className="flex-1"
                  style={{ padding: '2px 8px', fontSize: 11, minWidth: 0 }}
                />
                <Btn type="button" onClick={handleAddTag} size="sm">Agregar</Btn>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* 1.10.3: "Vinculaciones" — el nombre del caso aparece UNA sola vez
            (fix: antes se duplicaba con los chips del propio modal). */}
        <SectionCard icon={Link2} title="Vinculaciones">
          <div className="space-y-2">
            <div>
              <div className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Casos vinculados
              </div>
              <CaseLinker
                casos={casos}
                selectedIds={form.relatedCaseIds || []}
                onChange={(ids) => handleChange('relatedCaseIds', ids)}
                onOpenCase={(c) => onVerCaso && onVerCaso(c)}
              />
            </div>
            <div>
              <FieldLabel htmlFor="ev-relatedNoteId">Nota vinculada</FieldLabel>
              <select
                id="ev-relatedNoteId"
                value={form.relatedNoteId || ''}
                onChange={e => handleChange('relatedNoteId', e.target.value || null)}
                className="w-full rounded-md px-3 py-2 text-sm"
                style={INPUT_STYLE}
              >
                <option value="">Sin vinculo</option>
                {(notes || []).map(n => (
                  <option key={n.id} value={n.id}>{n.title || 'Sin titulo'}</option>
                ))}
              </select>
            </div>
          </div>
        </SectionCard>

        {/* Footer propio (dentro del form para que el submit funcione). */}
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
            <Btn type="submit" size="sm" loading={saving}>
              {event ? 'Guardar cambios' : 'Crear evento'}
            </Btn>
          </div>
        </div>
      </form>
    </Modal>
  );
}
