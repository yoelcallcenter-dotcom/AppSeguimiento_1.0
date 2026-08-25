import React, { useState, useCallback, useMemo } from 'react';
import { Upload, X, Check, AlertTriangle, ArrowRight, FileText, RefreshCw } from 'lucide-react';
import { Btn } from '../../components/common/Btn';
import { BtnOutline } from '../../components/common/BtnOutline';
import useAppStore from '../../core/store/useAppStore';
import { reportError } from '../../core/error/reportError';
import { parseReportesString, parseComentariosString, parseNotasString, parseAgendaString } from '../../utils/backup';
import { readConfig } from '../../utils/configFormatters';
import { normalizeDate } from '../../utils/dateFilters';
import { parseCSV as parseCSVShared } from '../../utils/csvParse';

const MAPPING_TEMPLATE_KEY = 'csv-mapping-template';

export function parseCSV(text) {
  return parseCSVShared(text, { repairColumns: true });
}

export const KNOWN_FIELDS = [
  { label: 'Nombre', field: 'nombre', match: ['nombre', 'name', 'apellido', 'paciente', 'cliente'] },
  { label: 'Teléfono', field: 'telefono', match: ['telefono', 'teléfono', 'tel', 'phone', 'celular', 'movil', 'cel'] },
  { label: 'Fecha', field: 'fecha', match: ['fecha', 'date'] },
  { label: 'Localidad', field: 'localidad', match: ['localidad', 'ciudad', 'city', 'poblacion', 'población', 'domicilio'] },
  { label: 'Aseguradora', field: 'aseguradora', match: ['aseguradora', 'art', 'seguro', 'insurance', 'compania', 'compañía'] },
  { label: 'Estado', field: 'estado', match: ['estado', 'status', 'state', 'situacion', 'situación'] },
  { label: 'Observaciones', field: 'observaciones', match: ['observaciones', 'observacion', 'observación'] },
  { label: 'Profesión', field: 'profesion', match: ['profesion', 'profesión', 'profession', 'ocupacion', 'ocupación', 'trabajo'] },
  { label: 'Ingreso', field: 'ingreso', match: ['ingreso', 'income'] },
  { label: 'Lesión', field: 'lesion', match: ['lesion', 'lesión', 'injury', 'diagnostico', 'diagnóstico', 'enfermedad'] },
  { label: 'Tipo Ingreso', field: 'tipoIngreso', match: ['tipoingreso', 'tipo_ingreso', 'tipo ingreso'] },
  { label: 'Cita', field: 'cita', match: ['cita', 'appointment'] },
  { label: 'Estudio Jurídico', field: 'estudioJuridico', match: ['estudiojuridico', 'estudio_juridico', 'estudio jurídico', 'estudio', 'abogado', 'lawyer'] },
  { label: 'Tags', field: 'tags', match: ['tags', 'tag', 'etiquetas', 'etiqueta', 'labels'] },
  { label: 'Reportes', field: 'reporteHistory', match: ['reportes', 'reporte', 'reports', 'historial'] },
  { label: 'Comentarios', field: 'comentarios', match: ['comentarios', 'comentario', 'comments'] },
  { label: 'Notas Vinculadas', field: 'notasVinculadas', match: ['notasvinculadas', 'notas_vinculadas', 'notas vinculadas'] },
  { label: 'Agenda Vinculada', field: 'agendaVinculada', match: ['agendavinculada', 'agenda_vinculada', 'agenda vinculada', 'eventos'] },
  { label: 'ID', field: 'id', match: ['id', 'identificador', 'identificacion', 'identificación'] },
];

export const FIELD_OPTIONS = [
  { value: '', label: '— Ignorar —' },
  { value: 'nombre', label: 'Nombre' },
  { value: 'telefono', label: 'Teléfono' },
  { value: 'fecha', label: 'Fecha' },
  { value: 'localidad', label: 'Localidad' },
  { value: 'aseguradora', label: 'Aseguradora' },
  { value: 'estado', label: 'Estado' },
  { value: 'observaciones', label: 'Observaciones' },
  { value: 'profesion', label: 'Profesión' },
  { value: 'ingreso', label: 'Ingreso' },
  { value: 'lesion', label: 'Lesión' },
  { value: 'tipoIngreso', label: 'Tipo Ingreso' },
  { value: 'cita', label: 'Cita' },
  { value: 'estudioJuridico', label: 'Estudio Jurídico' },
  { value: 'tags', label: 'Tags' },
  { value: 'reporteHistory', label: 'Reportes' },
  { value: 'comentarios', label: 'Comentarios' },
  { value: 'notasVinculadas', label: 'Notas Vinculadas' },
  { value: 'agendaVinculada', label: 'Agenda Vinculada' },
  { value: 'id', label: 'ID' },
];

export function detectFieldMappings(headers) {
  const normalized = headers.map((h) => {
    const hNorm = h.toLowerCase().replace(/[^a-z0-9]/g, '');
    const match = KNOWN_FIELDS.find((kf) =>
      kf.match.some((kw) => hNorm === kw)
    );
    return { header: h, field: match ? match.field : null };
  });

  const usedFields = new Set();
  return normalized.map((m) => {
    if (m.field && usedFields.has(m.field)) return { ...m, field: null };
    if (m.field) usedFields.add(m.field);
    return m;
  });
}

function validateRows(rows, mappings, opts) {
  const { validarTelefono, validarDuplicados, existing } = opts || {};
  const fieldMap = {};
  mappings.forEach((m, i) => { if (m.field) fieldMap[m.field] = i; });
  const hasName = 'nombre' in fieldMap;
  const hasPhone = 'telefono' in fieldMap;

  const existingKeys = new Set();
  if (validarDuplicados && existing) {
    existing.forEach((c) => {
      const n = (c.nombre || '').trim().toLowerCase();
      const t = (c.telefono || '').trim().toLowerCase();
      if (n || t) existingKeys.add(`${n}|||${t}`);
    });
  }

  const seen = new Set();
  const errors = [];
  rows.forEach((row, i) => {
    if (hasName && !row[fieldMap.nombre]?.trim()) errors.push({ row: i + 2, msg: 'Nombre vacío' });
    if (validarTelefono !== false && hasPhone && !row[fieldMap.telefono]?.trim()) errors.push({ row: i + 2, msg: 'Teléfono vacío' });
    if (validarDuplicados) {
      const n = (row[fieldMap.nombre] || '').trim().toLowerCase();
      const t = (row[fieldMap.telefono] || '').trim().toLowerCase();
      const key = `${n}|||${t}`;
      if (key !== '|||' && (existingKeys.has(key) || seen.has(key))) {
        errors.push({ row: i + 2, msg: existingKeys.has(key) ? 'Ya existe un caso con este nombre y teléfono' : 'Duplicado en el archivo' });
      }
      if (key !== '|||') seen.add(key);
    }
  });
  return errors.slice(0, 50);
}

export function mapRowToCase(row, mappings) {
  const caso = {};
  const hasExplicitId = mappings.some((m) => m.field === 'id' && m.field);
  mappings.forEach((m, i) => {
    if (m.field && row[i] !== undefined) {
      const val = row[i].trim();
      switch (m.field) {
        case 'tags':
          caso.tags = val ? val.split(/[;,]+/).map((t) => t.trim()).filter(Boolean) : [];
          break;
        case 'reporteHistory':
          caso.reporteHistory = parseReportesString(val);
          break;
        case 'comentarios':
          caso.comentarios = parseComentariosString(val);
          break;
        case 'notasVinculadas':
          caso.notasVinculadas = parseNotasString(val);
          break;
        case 'agendaVinculada':
          caso.agendaVinculada = parseAgendaString(val);
          break;
        default:
          caso[m.field] = val;
      }
    }
  });
  if (!hasExplicitId || !caso.id) {
    caso.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
  caso.fecha = normalizeDate(caso.fecha) || new Date().toISOString().slice(0, 10);
  caso.estado = caso.estado || 'Sin reporte';
  if (!Array.isArray(caso.tags)) caso.tags = [];
  if (!Array.isArray(caso.reporteHistory)) caso.reporteHistory = [];
  if (!Array.isArray(caso.comentarios)) caso.comentarios = [];
  if (!Array.isArray(caso.notasVinculadas)) caso.notasVinculadas = [];
  if (!Array.isArray(caso.agendaVinculada)) caso.agendaVinculada = [];
  caso.profesion = caso.profesion || '';
  caso.ingreso = caso.ingreso || '';
  caso.lesion = caso.lesion || '';
  caso.tipoIngreso = caso.tipoIngreso || '';
  caso.cita = caso.cita || '';
  caso.estudioJuridico = caso.estudioJuridico || '';
  caso.observaciones = caso.observaciones || '';
  caso.fechaFirma = normalizeDate(caso.fechaFirma);
  caso.alertaFirmaEnviada = false;
  caso.leido = true;
  return caso;
}

export default function CSVImporter({ onComplete }) {
  const appendCases = useAppStore((s) => s.appendCases);
  const addToast = useAppStore((s) => s.addToast);
  const casos = useAppStore((s) => s.casos);

  const [step, setStep] = useState('upload');
  const [rawText, setRawText] = useState('');
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [previewData, setPreviewData] = useState([]);

  const cfg = readConfig();

  const handleFile = useCallback((file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        setRawText(text);
        const { headers: h, rows: r } = parseCSV(text);
        if (h.length === 0) { addToast('CSV vacío o inválido', 'error'); return; }
        setHeaders(h);
        setRows(r);
        const autoMapeo = readConfig().importAutoMapeo || 'auto';
        let detected;
        if (autoMapeo === 'manual') {
          detected = h.map((header) => ({ header, field: null }));
        } else if (autoMapeo === 'template') {
          let template = [];
          try { template = JSON.parse(localStorage.getItem(MAPPING_TEMPLATE_KEY) || '[]'); } catch { template = []; }
          detected = h.map((header) => {
            const saved = template.find((t) => t.header === header);
            return { header, field: saved ? saved.field : null };
          });
        } else {
          detected = detectFieldMappings(h);
        }
        setMappings(detected);
        setPreviewData(r.slice(0, 5));
        setStep('mapping');
      } catch (err) {
        reportError({ type: 'import', message: 'Error parsing CSV', context: err });
        addToast('Error al leer el archivo', 'error');
      }
    };
    reader.readAsText(file);
  }, [addToast]);

  const handleMappingChange = useCallback((index, field) => {
    setMappings((prev) => {
      const next = [...prev];
      const oldField = next[index].field;
      if (oldField) {
        const conflictIdx = next.findIndex((m, i) => i !== index && m.field === field);
        if (conflictIdx >= 0) next[conflictIdx] = { ...next[conflictIdx], field: null };
      }
      next[index] = { ...next[index], field };
      return next;
    });
  }, []);

  const previewCases = useMemo(() => {
    return previewData.map((row) => mapRowToCase(row, mappings));
  }, [previewData, mappings]);

  const handleImport = useCallback(async () => {
    setImporting(true);
    try {
      const cases = rows.map((row) => mapRowToCase(row, mappings));
      const result = await appendCases(cases);
      addToast(`${result.added} casos importados${result.skipped > 0 ? ` (${result.skipped} duplicados omitidos)` : ""}`, 'success');
      onComplete?.();
      setStep('upload');
      setRawText('');
      setHeaders([]);
      setRows([]);
      setMappings([]);
    } catch (err) {
      reportError({ type: 'import', message: 'Import failed', context: err });
      addToast('Error al importar', 'error');
    } finally {
      setImporting(false);
    }
  }, [rows, mappings, appendCases, addToast, onComplete]);

  const handleValidate = useCallback(async () => {
    const current = readConfig();
    const errors = validateRows(rows, mappings, {
      validarTelefono: current.importValidarTelefono !== false,
      validarDuplicados: current.importValidarDuplicados !== false,
      existing: casos,
    });
    setValidationErrors(errors);
    if (errors.length > 0) {
      addToast(`${errors.length} errores encontrados`, 'warning');
      return;
    }
    if (current.importAutoMapeo === 'template') {
      try { localStorage.setItem(MAPPING_TEMPLATE_KEY, JSON.stringify(mappings)); } catch { /* ignore */ }
    }
    if (current.importMostrarPreview === false) {
      await handleImport();
      return;
    }
    setStep('preview');
  }, [rows, mappings, casos, addToast, handleImport]);

  const reset = useCallback(() => {
    setStep('upload');
    setRawText('');
    setHeaders([]);
    setRows([]);
    setMappings([]);
    setValidationErrors([]);
    setPreviewData([]);
  }, []);

  if (step === 'upload') {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div
          className="w-full max-w-md rounded-xl p-8 text-center cursor-pointer hover:opacity-80 transition-opacity"
          style={{ backgroundColor: 'var(--color-surface)', border: '2px dashed var(--color-border)' }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
          onClick={() => document.getElementById('csv-input')?.click()}
        >
          <Upload size={32} className="mx-auto mb-3" style={{ color: 'var(--color-accent)' }} />
          <div className="text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>Subir archivo CSV</div>
          <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Arrastra un archivo o haz click para seleccionar</div>
          <input id="csv-input" type="file" accept=".csv" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
        </div>
      </div>
    );
  }

  if (step === 'mapping') {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Mapear columnas</div>
            <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              {rows.length} filas detectadas — Asigna cada columna a un campo
            </div>
          </div>
          <BtnOutline onClick={reset} size="sm" color="var(--color-text-muted)" icon={RefreshCw}>Reiniciar</BtnOutline>
        </div>

        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {mappings.map((m, i) => (
            <div key={i} className="flex items-center gap-2 rounded px-3 py-2" style={{ backgroundColor: 'var(--color-surface2)' }}>
              <span className="text-xs font-medium w-32 truncate" style={{ color: 'var(--color-text)' }}>{m.header}</span>
              <ArrowRight size={12} style={{ color: 'var(--color-text-muted)' }} />
              <select
                value={m.field || ''}
                onChange={(e) => handleMappingChange(i, e.target.value || null)}
                className="flex-1 rounded px-2 py-1 text-xs"
                style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
              >
                {FIELD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}
                    disabled={opt.value && mappings.some((x, j) => j !== i && x.field === opt.value)}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {m.field && <Check size={12} style={{ color: 'var(--color-success)' }} />}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <BtnOutline onClick={reset} size="sm" color="var(--color-text-muted)">Cancelar</BtnOutline>
          <Btn onClick={handleValidate} size="sm" icon={Check}>Validar</Btn>
        </div>
      </div>
    );
  }

  if (step === 'preview') {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Vista previa</div>
            <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              {rows.length} casos a importar
            </div>
          </div>
        </div>

        {validationErrors.length > 0 && (
          <div
            className="rounded-lg p-3 flex items-start gap-2"
            style={{ backgroundColor: 'var(--color-danger)22', border: '1px solid var(--color-danger)44' }}
          >
            <AlertTriangle size={14} style={{ color: 'var(--color-danger)', flexShrink: 0, marginTop: 1 }} />
            <div>
              <div className="text-[10px] font-semibold" style={{ color: 'var(--color-danger)' }}>{validationErrors.length} errores</div>
              <div className="text-[9px] mt-1 space-y-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {validationErrors.slice(0, 5).map((e, i) => (
                  <div key={i}>Fila {e.row}: {e.msg}</div>
                ))}
                {validationErrors.length > 5 && <div>...y {validationErrors.length - 5} más</div>}
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid var(--color-border)' }}>
          <table className="w-full text-[10px]">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-surface2)' }}>
                <th className="px-2 py-1 text-left font-semibold" style={{ color: 'var(--color-text-muted)' }}>#</th>
                <th className="px-2 py-1 text-left font-semibold" style={{ color: 'var(--color-text-muted)' }}>Nombre</th>
                <th className="px-2 py-1 text-left font-semibold" style={{ color: 'var(--color-text-muted)' }}>Teléfono</th>
                <th className="px-2 py-1 text-left font-semibold" style={{ color: 'var(--color-text-muted)' }}>Estado</th>
                <th className="px-2 py-1 text-left font-semibold" style={{ color: 'var(--color-text-muted)' }}>Localidad</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 10).map((row, i) => {
                const c = mapRowToCase(row, mappings);
                return (
                  <tr key={i} style={{ borderTop: '1px solid var(--color-border)' }}>
                    <td className="px-2 py-1" style={{ color: 'var(--color-text-muted)' }}>{i + 1}</td>
                    <td className="px-2 py-1 font-medium" style={{ color: 'var(--color-text)' }}>{c.nombre || '—'}</td>
                    <td className="px-2 py-1" style={{ color: 'var(--color-text)' }}>{c.telefono || '—'}</td>
                    <td className="px-2 py-1"><span className="px-1.5 py-0.5 rounded text-[9px]" style={{ backgroundColor: 'var(--color-accent)22', color: 'var(--color-accent)' }}>{c.estado || '—'}</span></td>
                    <td className="px-2 py-1" style={{ color: 'var(--color-text)' }}>{c.localidad || '—'}</td>
                  </tr>
                );
              })}
              {rows.length > 10 && (
                <tr>
                  <td colSpan={5} className="px-2 py-2 text-center text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
                    ...y {rows.length - 10} filas más
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-2">
          <BtnOutline onClick={() => setStep('mapping')} size="sm" color="var(--color-text-muted)">Volver</BtnOutline>
          <Btn onClick={handleImport} size="sm" icon={Upload} disabled={importing}>
            {importing ? 'Importando...' : `Importar ${rows.length} casos`}
          </Btn>
        </div>
      </div>
    );
  }

  return null;
}
