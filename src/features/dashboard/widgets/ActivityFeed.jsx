import React, { useState } from 'react';
import { History, ChevronDown, ChevronUp } from 'lucide-react';

function timeAgo(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `hace ${days} d`;
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

const MAX_VISIBLE = 5;

export default function ActivityFeed({ items, onSelectItem }) {
  const [showAll, setShowAll] = useState(false);
  const list = items || [];
  const visible = showAll ? list : list.slice(0, MAX_VISIBLE);

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <History size={18} style={{ color: 'var(--color-accent)' }} />
          <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Actividad reciente</span>
        </div>
        {list.length > MAX_VISIBLE && (
          <button
            type="button"
            onClick={() => setShowAll((s) => !s)}
            className="flex items-center gap-1 text-xs font-semibold hover:opacity-70 transition-opacity"
            style={{ color: 'var(--color-accent)' }}
          >
            {showAll ? (
              <>
                <ChevronUp size={13} /> Ver menos
              </>
            ) : (
              <>
                <ChevronDown size={13} /> Ver todo ({list.length})
              </>
            )}
          </button>
        )}
      </div>
      {list.length === 0 ? (
        <div className="text-sm py-6 text-center" style={{ color: 'var(--color-text-muted)' }}>Sin actividad reciente.</div>
      ) : (
        <div className="relative pl-5">
          <div className="absolute left-[7px] top-1 bottom-1 w-px" style={{ backgroundColor: 'var(--color-border)' }} />
          <div className="space-y-3">
            {visible.map((item) => (
              <button
                key={item.id}
                type="button"
                className="relative w-full text-left hover:opacity-70 transition-opacity"
                onClick={() => onSelectItem && onSelectItem(item)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: onSelectItem ? 'pointer' : 'default' }}
              >
                <span
                  className="absolute -left-5 top-1 w-3 h-3 rounded-full border-2"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: item.color || 'var(--color-border)',
                  }}
                />
                <div className="text-xs font-semibold truncate" style={{ color: 'var(--color-text)' }}>{item.titulo || item.title}</div>
                <div className="text-[11px] truncate" style={{ color: 'var(--color-text-muted)' }}>{item.detalle || item.detail}</div>
                <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{timeAgo(item.ts || item.timestamp)}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
