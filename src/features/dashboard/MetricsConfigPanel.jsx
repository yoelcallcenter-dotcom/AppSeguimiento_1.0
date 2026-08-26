import React, { useState } from 'react';
import { Settings, X, Plus, Trash2 } from 'lucide-react';
import { Btn } from '../../components/common/Btn';
import { BtnOutline } from '../../components/common/BtnOutline';
import { Toggle } from '../../components/common/Toggle';
import { ESTADOS } from '../../utils/constants';
import { getMetricDefs, getDefaultCategories, getDefaultAlerts } from './metricsEngine';

export function MetricsConfigPanel({ config, onSave, onClose }) {
  const metricsConfig = config.metrics || {};
  const metricDefs = getMetricDefs();

  const [categorias, setCategorias] = useState(() => metricsConfig.categorias || getDefaultCategories());
  const [visibleMetrics, setVisibleMetrics] = useState(() => metricsConfig.visible || Object.keys(metricDefs));
  const [alertas, setAlertas] = useState(() => metricsConfig.alertas || getDefaultAlerts());

  const toggleMetric = (id) => {
    setVisibleMetrics((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const updateCategoria = (cat, oldEstado, newEstado) => {
    setCategorias((prev) => {
      const next = { ...prev };
      // Remove from all categories
      for (const key of Object.keys(next)) {
        next[key] = next[key].filter((e) => e !== oldEstado);
      }
      // Add to target
      if (newEstado && !next[cat].includes(newEstado)) {
        next[cat] = [...next[cat], newEstado];
      }
      return next;
    });
  };

  const updateAlerta = (id, field, value) => {
    setAlertas((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleSave = () => {
    onSave({
      ...metricsConfig,
      categorias,
      visible: visibleMetrics,
      alertas,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-xl flex flex-col"
        style={{ maxHeight: '90vh', backgroundColor: 'var(--color-surface2)', border: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center justify-between p-4 pb-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Settings size={16} style={{ color: 'var(--color-accent)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Configuración del Dashboard</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-white/5" style={{ color: 'var(--color-text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-auto px-4 pb-2 space-y-5">
          {/* Métricas visibles */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>Métricas visibles</div>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(metricDefs).map((m) => (
                <Toggle
                  key={m.id}
                  checked={visibleMetrics.includes(m.id)}
                  onChange={() => toggleMetric(m.id)}
                  label={m.label}
                />
              ))}
            </div>
          </div>

          {/* Categorías */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>Categorías de estado</div>
            <div className="space-y-3">
              {Object.entries(categorias).map(([cat, estados]) => (
                <div key={cat}>
                  <div className="text-xs font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                    {cat === 'success' ? 'Éxito' : cat === 'lost' ? 'Pérdida' : cat === 'contact' ? 'Contacto' : 'Pendientes'}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {ESTADOS.map((e) => {
                      const isActive = estados.includes(e.v);
                      return (
                        <button
                          key={e.v}
                          onClick={() => updateCategoria(cat, isActive ? e.v : null, isActive ? null : e.v)}
                          className="text-[10px] px-2 py-1 rounded-full transition-colors"
                          style={{
                            backgroundColor: isActive ? `${e.accent}33` : 'var(--color-surface)',
                            color: isActive ? e.accent : 'var(--color-text-muted)',
                            border: `1px solid ${isActive ? e.accent : 'var(--color-border)'}`,
                          }}
                        >
                          {e.v}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alertas */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>Reglas de alerta</div>
            <div className="space-y-2">
              {Object.entries(alertas).map(([id, cfg]) => (
                <div key={id} className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: 'var(--color-surface)' }}>
                  <Toggle checked={cfg.active} onChange={(v) => updateAlerta(id, 'active', v)} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>{cfg.label}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Límite:</span>
                      <input
                        type="number"
                        value={cfg.threshold}
                        onChange={(e) => updateAlerta(id, 'threshold', Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-16 text-[10px] px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                        disabled={!cfg.active}
                      />
                      <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                        {id === 'casosSinReporte' ? 'casos' : '%'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 pt-2 flex-shrink-0" style={{ borderTop: '1px solid var(--color-border)' }}>
          <BtnOutline onClick={onClose} size="sm" color="var(--color-text-muted)">Cancelar</BtnOutline>
          <Btn onClick={handleSave} size="sm">Guardar configuración</Btn>
        </div>
      </div>
    </div>
  );
}
