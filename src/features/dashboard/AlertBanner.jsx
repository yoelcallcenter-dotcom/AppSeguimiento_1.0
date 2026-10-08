import React from 'react';
import { AlertTriangle, Info, XCircle } from 'lucide-react';

const SEVERITY_CONFIG = {
  danger: { icon: XCircle, color: 'var(--color-danger)', bg: 'color-mix(in srgb, var(--color-danger) 6.7%, transparent)' },
  warning: { icon: AlertTriangle, color: 'var(--color-warning)', bg: 'color-mix(in srgb, var(--color-warning) 6.7%, transparent)' },
  info: { icon: Info, color: 'var(--color-accent)', bg: 'color-mix(in srgb, var(--color-accent) 6.7%, transparent)' },
};

export const AlertBanner = React.memo(({ alerts }) => {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((a) => {
        const cfg = SEVERITY_CONFIG[a.severity] || SEVERITY_CONFIG.info;
        const Icon = cfg.icon;
        return (
          <div
            key={a.id}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs animate-fade-in"
            style={{ backgroundColor: cfg.bg, border: `1px solid color-mix(in srgb, ${cfg.color} 20%, transparent)` }}
          >
            <Icon size={14} style={{ color: cfg.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--color-text)' }}>
              <b style={{ color: cfg.color }}>{a.label}</b>: {a.actual}{a.unidad} (límite: {a.threshold}{a.unidad})
            </span>
          </div>
        );
      })}
    </div>
  );
});
