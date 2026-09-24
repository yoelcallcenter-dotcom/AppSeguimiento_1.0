import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Save, Eye } from 'lucide-react';
import { createTemplate, updateTemplate } from '../../features/templates/templatesStore';
import { TEMPLATE_TYPES, TEMPLATE_TYPE_LABELS } from '../../features/templates/templateTypes';
import { AVAILABLE_VARIABLES, resolveVariables } from '../../features/templates/resolveVariables';
import { getTemplateCategories } from '../../utils/catalogos';
import { Btn } from '../common/Btn';
import { BtnOutline } from '../common/BtnOutline';
import { TextInput } from '../common/TextInput';
import { TextArea } from '../common/TextArea';

const TYPE_OPTIONS = Object.values(TEMPLATE_TYPES).map((t) => ({
  value: t,
  label: TEMPLATE_TYPE_LABELS[t],
}));

const ORIGEN_OPTIONS = [
  { value: 'Operador', label: 'Operador' },
  { value: 'Primera Atención', label: 'Primera Atención' },
  { value: 'Estudio Jurídico', label: 'Estudio Jurídico' },
];

const sampleContext = {
  caso: { nombre: 'ANA LOPEZ', telefono: '123456', aseguradora: 'Galeno ART', estudioJuridico: 'GL CABA', estado: 'Pendiente', localidad: 'CABA', profesion: 'Enfermera' },
  config: { operador: 'Juan Perez' },
};

export function PlantillaForm({ template, onSave, onCancel, showToast, config = {} }) {
  const [form, setForm] = useState({
    name: '',
    category: '',
    type: 'nota',
    active: true,
    content: {},
  });
  const [errors, setErrors] = useState({});
  const [showPreview, setShowPreview] = useState(false);
  const titleRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (template) {
      setForm({
        name: template.name || '',
        category: template.category || '',
        type: template.type || 'nota',
        active: template.active !== false,
        content: template.content || {},
      });
    }
  }, [template]);

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const updateContent = (field, value) => setForm((prev) => ({
    ...prev, content: { ...prev.content, [field]: value },
  }));

  const insertVariable = useCallback((varLabel) => {
    const activeEl = document.activeElement;
    const isTitle = activeEl === titleRef.current;
    const isContent = activeEl === contentRef.current;
    if (isTitle) {
      const el = titleRef.current;
      const pos = el.selectionStart || 0;
      const val = form.content.title || '';
      updateContent('title', val.slice(0, pos) + varLabel + val.slice(pos));
    } else if (isContent) {
      const el = contentRef.current;
      const pos = el.selectionStart || 0;
      const fieldKey = form.type === 'reporte' ? 'texto' : form.type === 'comentario' ? 'texto' : 'content';
      const val = form.content[fieldKey] || '';
      updateContent(fieldKey, val.slice(0, pos) + varLabel + val.slice(pos));
    } else {
      const fieldKey = form.type === 'reporte' ? 'texto' : form.type === 'comentario' ? 'texto' : 'content';
      const val = form.content[fieldKey] || '';
      updateContent(fieldKey, val + varLabel);
    }
  }, [form.type, form.content, updateContent]);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'El nombre es requerido';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      if (template) {
        await updateTemplate(template.id, form);
        showToast('Plantilla actualizada', 'success');
      } else {
        await createTemplate(form);
        showToast('Plantilla creada', 'success');
      }
      onSave();
    } catch {
      showToast('Error al guardar plantilla', 'error');
    }
  };

  const preview = resolveVariables(form.content || {}, sampleContext);

  const renderContentFields = () => {
    switch (form.type) {
      case 'nota':
        return (
          <>
            <TextInput
              label="Título por defecto"
              inputRef={titleRef}
              value={form.content.title || ''}
              onChange={(e) => updateContent('title', e.target.value)}
              placeholder="Ej: Seguimiento {NOMBRE}"
            />
            <TextArea
              label="Contenido (HTML)"
              inputRef={contentRef}
              value={form.content.content || ''}
              onChange={(e) => updateContent('content', e.target.value)}
              rows={8}
              placeholder="Ej: Se realizó contacto con {NOMBRE}..."
            />
          </>
        );
      case 'reporte':
        return (
          <>
            <TextArea
              label="Texto del reporte"
              inputRef={contentRef}
              value={form.content.texto || ''}
              onChange={(e) => updateContent('texto', e.target.value)}
              rows={6}
              placeholder="Ej: Se habló con {NOMBRE}, tiene cita el {FECHA}..."
            />
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Origen</label>
              <select
                value={form.content.origen || 'Operador'}
                onChange={(e) => updateContent('origen', e.target.value)}
                className="input-optimized text-xs"
              >
                {ORIGEN_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </>
        );
      case 'evento':
        return (
          <>
            <TextInput
              label="Título"
              inputRef={titleRef}
              value={form.content.title || ''}
              onChange={(e) => updateContent('title', e.target.value)}
              placeholder="Ej: Cita {NOMBRE}"
            />
            <TextArea
              label="Descripción"
              inputRef={contentRef}
              value={form.content.description || ''}
              onChange={(e) => updateContent('description', e.target.value)}
              rows={4}
              placeholder="Ej: Reunión con {NOMBRE} sobre caso {ESTADO}..."
            />
            <div className="flex gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Prioridad</label>
                <select value={form.content.priority || 'medium'} onChange={(e) => updateContent('priority', e.target.value)} className="input-optimized text-xs">
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                </select>
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Estado</label>
                <select value={form.content.status || 'pending'} onChange={(e) => updateContent('status', e.target.value)} className="input-optimized text-xs">
                  <option value="pending">Pendiente</option>
                  <option value="confirmed">Confirmado</option>
                </select>
              </div>
            </div>
          </>
        );
      case 'comentario':
        return (
          <TextArea
            label="Texto del comentario"
            inputRef={contentRef}
            value={form.content.texto || ''}
            onChange={(e) => updateContent('texto', e.target.value)}
            rows={4}
            placeholder="Ej: Se contactó a {NOMBRE}..."
          />
        );
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onCancel} className="p-1 rounded hover:bg-white/5">
          <ArrowLeft size={16} style={{ color: 'var(--color-text-muted)' }} />
        </button>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
          {template ? 'Editar plantilla' : 'Nueva plantilla'}
        </h3>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Columna izquierda: campos */}
        <div className="flex-1 space-y-3">
          <TextInput
            label="Nombre"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="Ej: Seguimiento telefónico"
          />
          {errors.name && <span className="text-[10px]" style={{ color: 'var(--color-danger)' }}>{errors.name}</span>}

          <div className="flex gap-3">
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Categoría</label>
              <select value={form.category} onChange={(e) => updateField('category', e.target.value)} className="input-optimized text-xs">
                <option value="">Sin categoría</option>
                {getTemplateCategories(config).map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Tipo</label>
              <select value={form.type} onChange={(e) => updateField('type', e.target.value)} className="input-optimized text-xs" disabled={!!template}>
                {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Variables clickeables */}
          <div
            className="rounded-md p-2.5 text-xs space-y-1.5"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <div className="font-semibold" style={{ color: 'var(--color-text-muted)' }}>
              Variables — hacé clic para insertar
            </div>
            <div className="flex flex-wrap gap-1">
              {AVAILABLE_VARIABLES.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => insertVariable(v.label)}
                  className="text-[10px] rounded px-1.5 py-0.5 cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: 'var(--color-accent11)', color: 'var(--color-accent)' }}
                  title={`${v.description} — clic para insertar`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {renderContentFields()}
        </div>

        {/* Columna derecha: preview */}
        <div className="w-full lg:w-80 flex-shrink-0 space-y-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-1 text-[10px] font-medium rounded px-2 py-1"
              style={{
                backgroundColor: showPreview ? 'var(--color-accent)' : 'var(--color-surface)',
                color: showPreview ? 'var(--color-text-on-accent)' : 'var(--color-text-muted)',
              }}
            >
              <Eye size={11} />
              Preview
            </button>
          </div>

          {showPreview && (
            <div
              className="rounded-md p-3 text-xs space-y-2"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <div className="font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                Vista previa (con datos de ejemplo)
              </div>
              {form.type === 'nota' && (
                <>
                  <div className="font-bold" style={{ color: 'var(--color-text)' }}>
                    {preview.title || '(sin título)'}
                  </div>
                  <div className="whitespace-pre-wrap" style={{ color: 'var(--color-text-muted)' }}>
                    {preview.content || '(sin contenido)'}
                  </div>
                </>
              )}
              {form.type === 'reporte' && (
                <div className="whitespace-pre-wrap" style={{ color: 'var(--color-text-muted)' }}>
                  {preview.texto || '(sin texto)'}
                </div>
              )}
              {form.type === 'evento' && (
                <>
                  <div className="font-bold" style={{ color: 'var(--color-text)' }}>
                    {preview.title || '(sin título)'}
                  </div>
                  <div className="whitespace-pre-wrap" style={{ color: 'var(--color-text-muted)' }}>
                    {preview.description || '(sin descripción)'}
                  </div>
                </>
              )}
              {form.type === 'comentario' && (
                <div className="whitespace-pre-wrap" style={{ color: 'var(--color-text-muted)' }}>
                  {preview.texto || '(sin texto)'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Btn type="submit" icon={Save} size="sm">
          {template ? 'Guardar cambios' : 'Crear plantilla'}
        </Btn>
        <BtnOutline onClick={onCancel} size="sm">
          Cancelar
        </BtnOutline>
      </div>
    </form>
  );
}

export default PlantillaForm;
