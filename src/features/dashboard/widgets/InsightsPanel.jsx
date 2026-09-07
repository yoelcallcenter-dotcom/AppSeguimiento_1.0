import React from 'react';
import { AlertTriangle, Info, CheckCircle2, ExternalLink } from 'lucide-react';

const SEVERITY = {
  danger: { color: 'var(--chart-color-danger)', icon: AlertTriangle, label: 'Crítico' },
  warning: { color: 'var(--chart-color-warning)', icon: AlertTriangle, label: 'Atención' },
  info: { color: 'var(--chart-color-contact)', icon: Info, label: 'Info' },
  success: { color: 'var(--chart-color-success)', icon: CheckCircle2, label: 'Positivo' },
};

export default React.memo(function InsightsPanel({ insights, onDrill }) {
  if (!insights || insights.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {insights.map((insight) => {
        const sev = SEVERITY[insight.severity] || SEVERITY.info;
        const Icon = sev.icon;
        const hasDrill = insight.drillAction && onDrill;

        return (
          <button
            key={insight.id}
            type="button"
            onClick={() => {
              if (hasDrill) {
                if (insight.drillAction.type === 'filtered_list' && insight.drillAction.filter) {
                  onDrill(insight.drillAction.filter);
                } else if (insight.drillAction.type === 'view_activity') {
                  onDrill({ tipo: 'actividad' });
                }
              }
            }}
            className="rounded-xl p-4 text-left transition-opacity hover:opacity-90"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid ' + sev.color + '44',
              borderLeft: '3px solid ' + sev.color,
              cursor: hasDrill ? 'pointer' : 'default',
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon size={15} style={{ color: sev.color }} />
              <span className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>{insight.titulo}</span>
              {hasDrill && <ExternalLink size={10} style={{ color: 'var(--color-text-muted)', marginLeft: 'auto' }} />}
            </div>
            <div className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{insight.detalle}</div>
          </button>
        );
      })}
    </div>
  );
});