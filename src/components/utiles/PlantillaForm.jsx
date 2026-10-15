import React, { useState, useEffect, useRef, useCallback } from 'react';
// 1.10.1 (mejora del form): selector de tipo por chips (antes un <select>
// sin identidad), vista previa visible por defecto (antes oculta tras un
// toggle: la columna derecha quedaba vacía en desktop) y guardia de cambios
// sin guardar (antes Cancelar/back perdía lo tipeado sin avisar).
// T5 (unificación post-1.10.1): crear y editar usan la MISMA interfaz —
// antes al editar aparecía un badge estático + candado "El tipo no se puede
// cambiar al editar" con otra tipografía de label (dos interfaces distintas
// para la misma operación). Ahora los chips de tipo están activos en ambos
// modos; se elimina el candado (decisión del usuario: consistencia por sobre
// la inmutabilidad del tipo).
import { ArrowLeft, Save, Eye } from 'lucide-react';
import { createTemplate, updateTemplate } from '../../features/templates/templatesStore';
import {
  TEMPLATE_TYPES,
  TEMPLATE_TYPE_LABELS,
  TEMPLATE_TYPE_ICONS,
  TYPE_COLORS,
  TEMPLATE_TYPE_DESCRIPTIONS,
} from '../../features/templates/templateTypes';
import { AVAILABLE_VARIABLES, resolveVariables } from '../../features/templates/resolveVariables';
import { getTemplateCategories, getEstados } from '../../utils/catalogos';
import { Btn } from '../common/Btn';
import { BtnOutline } from '../common/BtnOutline';
import { TextInput } from '../common/TextInput';
import { TextArea } from '../common/TextArea';
import { ConfirmDialog } from '../common/ConfirmDialog';

const ORIGEN_OPTIONS = [
  { value: 'Operador', label: 'Operador' },
  { value: 'Primera Atención', label: 'Primera Atención' },
  { value: 'Estudio Jurídico', label: 'Estudio Jurídico' },
];

const sampleContext = {
  caso: { nombre: 'ANA LOPEZ', telefono: '123456', aseguradora: 'Galeno ART', estudioJuridico: 'GL CABA', estado: 'Pendiente', localidad: 'CABA', profesion: 'Enfermera' },
  config: { operador: 'Juan Perez' },
};

// 1.10.1: badge de tipo con la paleta compartida (TYPE_COLORS de
// templateTypes.js, misma fórmula que la lista de PlantillasView).
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

// 1.10.1: TextInput/TextArea ignoran la prop `label` (la pasan al DOM como
// atributo sin sentido y nunca renderizan la etiqueta visible) — por eso el
// form no mostraba rótulos, solo placeholders. Etiqueta manual, mismo estilo
// que "Categoría"/"Origen" del propio form.
function FieldLabel({ children }) {
  return (
    <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
      {children}
    </label>
  );
}

const EMPTY_FORM = { name: '', category: '', type: TEMPLATE_TYPES.NOTA, active: true, content: {} };

export function PlantillaForm({ template, onSave, onCancel, showToast, config = {} }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  // 1.10.1: la preview ahora arranca visible (antes el toggle estaba apagado
  // y la columna derecha quedaba vacía en desktop).
  const [showPreview, setShowPreview] = useState(true);
  // 1.10.1: guardia de cambios sin guardar — snapshot JSON del form inicial.
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const initialSnapshotRef = useRef(null);
  const titleRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (template) {
      const next = {
        name: template.name || '',
        category: template.category || '',
        type: template.type || TEMPLATE_TYPES.NOTA,
        active: template.active !== false,
        content: template.content || {},
      };
      setForm(next);
      initialSnapshotRef.current = JSON.stringify(next);
    } else {
      initialSnapshotRef.current = JSON.stringify(EMPTY_FORM);
    }
  }, [template]);

  const isDirty = () =>
    initialSnapshotRef.current !== null &&
    JSON.stringify(form) !== initialSnapshotRef.current;

  // 1.10.1: Cancelar/back con cambios sin guardar abre ConfirmDialog en lugar
  // de descartar en silencio.
  const handleCancel = useCallback(() => {
    if (isDirty()) setConfirmDiscard(true);
    else onCancel();
  }, [form, onCancel]);

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
            {/* 1.10.1: label manual + `ref` (no inputRef, que no estaba
                cableado: la inserción de variables en el cursor nunca
                funcionó y siempre iba al final). */}
            <div className="flex flex-col gap-1">
              <FieldLabel>Título por defecto</FieldLabel>
              <TextInput
                ref={titleRef}
                value={form.content.title || ''}
                onChange={(e) => updateContent('title', e.target.value)}
                placeholder="Ej: Seguimiento {NOMBRE}"
              />
            </div>
            <div className="flex flex-col gap-1">
              <FieldLabel>Contenido (HTML)</FieldLabel>
              <TextArea
                ref={contentRef}
                value={form.content.content || ''}
                onChange={(e) => updateContent('content', e.target.value)}
                rows={8}
                placeholder="Ej: Se realizó contacto con {NOMBRE}..."
              />
            </div>
          </>
        );
      case 'reporte':
        return (
          <>
            {/* 1.10.1: label manual + `ref` cableado (ver nota en 'nota'). */}
            <div className="flex flex-col gap-1">
              <FieldLabel>Texto del reporte</FieldLabel>
              <TextArea
                ref={contentRef}
                value={form.content.texto || ''}
                onChange={(e) => updateContent('texto', e.target.value)}
                rows={6}
                placeholder="Ej: Se habló con {NOMBRE}, tiene cita el {FECHA}..."
              />
            </div>
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
            {/* 1.10.1: la plantilla de reporte puede precargar también el
                estado del caso (opcional). Se aplica al usarla en Reporte
                rápido; en VerCasoModal no hay control de estado, se ignora. */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                Estado del caso (opcional)
              </label>
              <select
                value={form.content.estado || ''}
                onChange={(e) => updateContent('estado', e.target.value)}
                className="input-optimized text-xs"
              >
                <option value="">— Sin cambio —</option>
                {getEstados(config).map((e) => (
                  <option key={e.v} value={e.v}>{e.v}</option>
                ))}
              </select>
              <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                Al aplicar la plantilla en Reporte rápido, este estado se precarga en el selector.
              </span>
            </div>
          </>
        );
      case 'evento':
        return (
          <>
            {/* 1.10.1: labels manuales + `ref` cableado (ver caso 'nota'). */}
            <div className="flex flex-col gap-1">
              <FieldLabel>Título</FieldLabel>
              <TextInput
                ref={titleRef}
                value={form.content.title || ''}
                onChange={(e) => updateContent('title', e.target.value)}
                placeholder="Ej: Cita {NOMBRE}"
              />
            </div>
            <div className="flex flex-col gap-1">
              <FieldLabel>Descripción</FieldLabel>
              <TextArea
                ref={contentRef}
                value={form.content.description || ''}
                onChange={(e) => updateContent('description', e.target.value)}
                rows={4}
                placeholder="Ej: Reunión con {NOMBRE} sobre caso {ESTADO}..."
              />
            </div>
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
        // 1.10.1: label manual + `ref` cableado (ver caso 'nota').
        return (
          <div className="flex flex-col gap-1">
            <FieldLabel>Texto del comentario</FieldLabel>
            <TextArea
              ref={contentRef}
              value={form.content.texto || ''}
              onChange={(e) => updateContent('texto', e.target.value)}
              rows={4}
              placeholder="Ej: Se contactó a {NOMBRE}..."
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Header: volver + título (crear/editar) + badge del tipo. Sin hint
            de candado desde T5: el tipo es modificable en ambos modos. */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleCancel}
            className="p-1.5 rounded hover:bg-white/5"
            aria-label="Volver"
            title="Volver"
          >
            <ArrowLeft size={16} style={{ color: 'var(--color-text-muted)' }} />
          </button>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            {template ? 'Editar plantilla' : 'Nueva plantilla'}
          </h3>
          <TypeBadge type={form.type} />
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Columna izquierda: campos */}
          <div className="flex-1 space-y-3">
            {/* 1.10.1: label manual (TextInput ignora la prop label) + error
                de validación debajo del campo. */}
            <div className="flex flex-col gap-1">
              <FieldLabel>Nombre</FieldLabel>
              <TextInput
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Ej: Seguimiento telefónico"
              />
              {errors.name && <span className="text-[10px]" style={{ color: 'var(--color-danger)' }}>{errors.name}</span>}
            </div>

            {/* T5 (unificación): selector de tipo por chips con icono y color
                propio, idéntico en crear Y editar — antes al editar solo
                mostraba un badge estático y con otra tipografía de label
                (d interfaces distintas). Los chips están activos en ambos
                modos: al cambiar de tipo, el contenido cargado se conserva
                (las claves de otros tipos quedan guardadas y se ignoran hasta
                que se vuelven a necesitar, p.ej. si se vuelve al tipo original).
                El label usa FieldLabel (mismo estilo que "Nombre"/"Categoría";
                el de crear era uppercase 10px, distinto al resto del form). */}
            <div className="flex flex-col gap-1">
              <FieldLabel>Tipo</FieldLabel>
              <div className="flex gap-1.5 flex-wrap">
                {Object.values(TEMPLATE_TYPES).map((t) => {
                  const Icon = TEMPLATE_TYPE_ICONS[t];
                  const color = TYPE_COLORS[t] || 'var(--color-accent)';
                  const active = form.type === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => updateField('type', t)}
                      aria-pressed={active}
                      title={TEMPLATE_TYPE_DESCRIPTIONS[t]}
                      className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full transition-all hover:opacity-80"
                      style={{
                        backgroundColor: active ? `${color}14` : 'var(--color-surface2)',
                        color: active ? color : 'var(--color-text-muted)',
                        border: `1px solid ${active ? color : 'var(--color-border)'}`,
                      }}
                    >
                      <Icon size={10} />
                      {TEMPLATE_TYPE_LABELS[t]}
                    </button>
                  );
                })}
              </div>
              <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                {TEMPLATE_TYPE_DESCRIPTIONS[form.type]}
              </span>
            </div>

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
                    style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent) 6.7%, transparent)', color: 'var(--color-accent)' }}
                    title={`${v.description} — clic para insertar`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {renderContentFields()}
          </div>

          {/* Columna derecha: preview siempre visible por defecto y sticky
              en desktop (antes oculta tras el toggle: columna vacía). */}
          <div className="w-full lg:w-80 flex-shrink-0 space-y-3 lg:sticky lg:top-4 self-start">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                aria-pressed={showPreview}
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
                  <>
                    <div className="whitespace-pre-wrap" style={{ color: 'var(--color-text-muted)' }}>
                      {preview.texto || '(sin texto)'}
                    </div>
                    {form.content.estado && (
                      <div className="font-medium" style={{ color: 'var(--color-accent)' }}>
                        Estado al aplicar: {form.content.estado}
                      </div>
                    )}
                  </>
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
          <BtnOutline onClick={handleCancel} size="sm">
            Cancelar
          </BtnOutline>
        </div>
      </form>

      {/* 1.10.1: guardia de cambios sin guardar. Fuera del <form> para que
          sus botones no disparen el submit. */}
      <ConfirmDialog
        open={confirmDiscard}
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => { setConfirmDiscard(false); onCancel(); }}
        title="Descartar cambios"
        message="Hay cambios sin guardar en esta plantilla. ¿Descartarlos?"
        confirmLabel="Descartar"
        confirmColor="var(--color-danger)"
      />
    </>
  );
}

export default PlantillaForm;
