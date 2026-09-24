import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { EmptyState } from '../../../components/common/EmptyState';
import { Spinner } from '../../../components/common/Spinner';

const WidgetWrapper = React.memo(function WidgetWrapper({
  title,
  icon: Icon,
  period,
  loading = false,
  error = null,
  empty = false,
  emptyMessage = 'Sin datos',
  children,
}) {
  if (loading) {
    return (
      <div className="rounded-xl p-5 animate-fade-in" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-2 mb-4">
          {Icon && <Icon size={18} style={{ color: 'var(--color-accent)' }} />}
          <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{title}</span>
          {period && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-surface2)', color: 'var(--color-text-muted)' }}>{period}</span>}
        </div>
        <div className="flex justify-center py-6"><Spinner /></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl p-5 animate-fade-in" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-2 mb-4">
          {Icon && <Icon size={18} style={{ color: 'var(--color-accent)' }} />}
          <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{title}</span>
          {period && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-surface2)', color: 'var(--color-text-muted)' }}>{period}</span>}
        </div>
        <div className="flex flex-col items-center gap-2 py-4">
          <AlertTriangle size={20} style={{ color: 'var(--color-danger)' }} />
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-5 animate-fade-in" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon size={18} style={{ color: 'var(--color-accent)' }} />}
        <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{title}</span>
        {period && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-surface2)', color: 'var(--color-text-muted)' }}>{period}</span>}
      </div>
      {empty ? <EmptyState message={emptyMessage} size="sm" /> : children}
    </div>
  );
});

export { WidgetWrapper };
