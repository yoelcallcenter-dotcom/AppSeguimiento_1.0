import React, { useState, useEffect, useCallback } from 'react';
import {
  getErrors,
  getErrorCount,
  clearErrors,
  exportErrors,
} from '../core/error/reportError';
import {
  Trash2,
  Download,
  AlertTriangle,
  AlertCircle,
  Clock,
  Zap,
  Database,
  Bug,
} from 'lucide-react';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { IntegridadPanel } from '../components/diagnostico/IntegridadPanel';

const TYPE_ICONS = {
  WINDOW_ONERROR: AlertTriangle,
  UNHANDLED_REJECTION: AlertCircle,
  UI_FREEZE: Clock,
  REACT_ERROR_BOUNDARY: Bug,
  DATA_ERROR: Database,
  RUNTIME_ERROR: Zap,
};

const TYPE_COLORS = {
  WINDOW_ONERROR: 'var(--color-danger)',
  UNHANDLED_REJECTION: 'var(--color-warning)',
  UI_FREEZE: 'var(--color-warning)',
  REACT_ERROR_BOUNDARY: 'var(--color-danger)',
  DATA_ERROR: 'var(--color-warning)',
  RUNTIME_ERROR: 'var(--color-text-muted)',
};

export function SystemLogs() {
  const [errors, setErrors] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);

  const loadErrors = useCallback(async () => {
    setLoading(true);
    try {
      const [list, total] = await Promise.all([
        getErrors(500),
        getErrorCount(),
      ]);
      setErrors(list);
      setCount(total);
    } catch (e) {
      console.error('[SystemLogs] Error loading logs:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadErrors(); }, [loadErrors]);

  const handleClear = async () => {
    await clearErrors();
    setConfirmClear(false);
    loadErrors();
  };

  const handleExport = async () => {
    await exportErrors();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Integridad de datos (1.3.3) */}
      <div
        className="rounded-lg p-4"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <IntegridadPanel />
      </div>

      <div
        className="rounded-lg p-4"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2
              className="text-lg font-bold"
              style={{ color: 'var(--color-text)' }}
            >
              Diagnóstico del Sistema
            </h2>
            <p
              className="text-xs mt-1"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {count} error{count !== 1 ? 'es' : ''} registrado{count !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              disabled={count === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors disabled:opacity-40"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                cursor: count === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              <Download size={14} />
              Exportar JSON
            </button>
            <button
              onClick={() => setConfirmClear(true)}
              disabled={count === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors disabled:opacity-40"
              style={{
                backgroundColor: 'var(--color-danger)',
                color: '#fff',
                border: 'none',
                cursor: count === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              <Trash2 size={14} />
              Limpiar
            </button>
          </div>
        </div>
      </div>

      <div
        className="rounded-lg overflow-hidden"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        {loading ? (
          <div className="p-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Cargando logs...
          </div>
        ) : errors.length === 0 ? (
          <div className="p-8 text-center">
            <AlertTriangle
              size={32}
              style={{ color: 'var(--color-success)', margin: '0 auto 0.5rem' }}
            />
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              Sin errores registrados
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              El sistema funciona correctamente.
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {errors.map((err) => {
              const Icon = TYPE_ICONS[err.type] || AlertTriangle;
              const color = TYPE_COLORS[err.type] || 'var(--color-text-muted)';
              return (
                <div
                  key={err.id}
                  className="p-3 hover:opacity-80 transition-colors"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <div className="flex items-start gap-3">
                    <Icon size={16} style={{ color, marginTop: '2px', flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="text-xs font-semibold uppercase tracking-wider"
                          style={{ color }}
                        >
                          {err.type}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {new Date(err.timestamp).toLocaleString('es-AR')}
                        </span>
                      </div>
                      <p
                        className="text-sm mt-0.5 break-words"
                        style={{ color: 'var(--color-text)' }}
                      >
                        {err.message}
                      </p>
                      {err.stack && (
                        <details className="mt-1">
                          <summary
                            className="text-xs cursor-pointer"
                            style={{ color: 'var(--color-text-muted)' }}
                          >
                            Ver stack trace
                          </summary>
                          <pre
                            className="mt-1 p-2 rounded text-xs overflow-auto max-h-40"
                            style={{
                              backgroundColor: 'var(--color-bg)',
                              color: 'var(--color-text-secondary)',
                              border: '1px solid var(--color-border)',
                              fontFamily: 'monospace',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-all',
                            }}
                          >
                            {err.stack}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="Limpiar registros"
        message="¿Estás seguro de eliminar todos los registros de error?"
        confirmLabel="Eliminar todo"
        confirmColor="var(--color-danger)"
        onConfirm={handleClear}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
}
