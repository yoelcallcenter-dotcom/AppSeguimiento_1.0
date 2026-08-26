import React, { useState } from 'react';
import {
  Sparkles,
  Target,
  TrendingUp,
  Clock,
  Shield,
  Scale,
  Activity,
  Gauge,
  ChevronDown,
  ChevronRight,
  Info,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { CATEGORIAS_INSIGHT, ESTADO_VACIO } from '../insightsConfig';

const CATEGORIA_META = {
  [CATEGORIAS_INSIGHT.PRODUCTIVIDAD]: { icon: Gauge, label: 'Productividad' },
  [CATEGORIAS_INSIGHT.OBJETIVOS]: { icon: Target, label: 'Objetivos' },
  [CATEGORIAS_INSIGHT.TENDENCIA]: { icon: TrendingUp, label: 'Tendencia' },
  [CATEGORIAS_INSIGHT.HORARIOS]: { icon: Clock, label: 'Horarios' },
  [CATEGORIAS_INSIGHT.ASEGURADORAS]: { icon: Shield, label: 'Aseguradoras' },
  [CATEGORIAS_INSIGHT.ESTUDIOS]: { icon: Scale, label: 'Estudios' },
  [CATEGORIAS_INSIGHT.ACTIVIDAD]: { icon: Activity, label: 'Actividad' },
};

const SEVERITY = {
  success: { color: 'var(--color-success)', icon: CheckCircle2 },
  warning: { color: 'var(--color-warning)', icon: AlertTriangle },
  danger: { color: 'var(--color-danger)', icon: AlertTriangle },
  info: { color: 'var(--color-accent)', icon: Info },
};

const PRIORIDAD_LABEL = { 1: 'Prioritario', 2: 'Relevante', 3: 'Detalle' };

function InsightCard({ insight, expandido, onToggle }) {
  const meta = CATEGORIA_META[insight.categoria] || { icon: Sparkles, label: '' };
  const sev = SEVERITY[insight.severity] || SEVERITY.info;
  const CatIcon = meta.icon;
  const SevIcon = sev.icon;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: `1px solid ${sev.color}44`,
        borderLeft: `3px solid ${sev.color}`,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expandido}
        className="w-full text-left p-4 transition-opacity hover:opacity-90"
      >
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <CatIcon size={13} style={{ color: sev.color }} aria-hidden="true" />
          <span className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>
            {insight.titulo}
          </span>
          {insight.prioridad === 1 && (
            <span
              className="text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
              style={{ backgroundColor: `${sev.color}22`, color: sev.color }}
            >
              Prioritario
            </span>
          )}
          <span className="ml-auto text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
            {meta.label}
          </span>
          {expandido ? (
            <ChevronDown size={12} style={{ color: 'var(--color-text-muted)' }} />
          ) : (
            <ChevronRight size={12} style={{ color: 'var(--color-text-muted)' }} />
          )}
        </div>
        <div className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          {insight.detalle}
        </div>
      </button>

      {expandido && insight.base?.length > 0 && (
        <div
          className="px-4 pb-3 pt-2 animate-fade-in"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center gap-1 mb-1.5">
            <SevIcon size={10} style={{ color: sev.color }} aria-hidden="true" />
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              Datos comparados
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {insight.base.map((b, i) => (
              <div key={i} className="flex items-center justify-between gap-2 text-[10px]">
                <span style={{ color: 'var(--color-text-muted)' }}>{b.label}</span>
                <span className="font-semibold tabular-nums" style={{ color: 'var(--color-text)' }}>
                  {b.valor}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EstadoVacio({ motivo }) {
  const esSinDatos = motivo === ESTADO_VACIO.SIN_DATOS;
  return (
    <div
      className="rounded-xl p-5 text-center"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px dashed var(--color-border)',
      }}
    >
      <Sparkles size={20} className="mx-auto mb-2 opacity-40" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
      <div className="text-sm font-semibold mb-0.5" style={{ color: 'var(--color-text)' }}>
        {esSinDatos ? 'Todavía no hay datos para analizar' : 'Datos insuficientes para concluir'}
      </div>
      <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        {esSinDatos
          ? 'Cuando cargues casos vas a ver acá un análisis personal de tu actividad.'
          : 'Hay información, pero todavía no alcanza para generar conclusiones confiables. Continúa registrando actividad y los insights se desbloquean solos.'}
      </div>
    </div>
  );
}

/**
 * SmartInsightsPanel
 * Panel principal de insights: muestra primero el prioritario y luego el resto,
 * agrupados visualmente por prioridad. Cada tarjeta expande sus datos base.
 */
export default function SmartInsightsPanel({ estadoVacio, insights = [] }) {
  const [expandidoId, setExpandidoId] = useState(null);

  if (estadoVacio) return <EstadoVacio motivo={estadoVacio} />;
  if (!insights.length) return <EstadoVacio motivo={ESTADO_VACIO.DATOS_INSUFICIENTES} />;

  const destacado = insights.find((i) => i.prioridad === 1);
  const resto = insights.filter((i) => i !== destacado);

  return (
    <div className="space-y-3" role="list" aria-label="Insights del período">
      {destacado && (
        <InsightCard
          insight={destacado}
          expandido={expandidoId === destacado.id || insights.length === 1}
          onToggle={() => setExpandidoId(expandidoId === destacado.id ? null : destacado.id)}
        />
      )}
      {resto.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {resto.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              expandido={expandidoId === insight.id}
              onToggle={() => setExpandidoId(expandidoId === insight.id ? null : insight.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
