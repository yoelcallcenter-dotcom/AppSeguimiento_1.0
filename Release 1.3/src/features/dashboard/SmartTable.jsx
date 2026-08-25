import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export const SmartTable = React.memo(({ title, columns, data, maxRows = 10, icon: Icon }) => {
  const [expanded, setExpanded] = useState(false);
  if (!data || data.length === 0) return null;

  const showAll = expanded || data.length <= maxRows;
  const rows = showAll ? data : data.slice(0, maxRows);
  const hasMore = data.length > maxRows;

  return (
    <div
      className="rounded-xl p-5 animate-fade-in"
      style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      {title && (
        <div className="flex items-center gap-2 mb-3">
          {Icon && <Icon size={14} style={{ color: 'var(--color-accent)' }} />}
          <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{title}</span>
          <span className="text-[10px] ml-auto" style={{ color: 'var(--color-text-muted)' }}>{data.length} registros</span>
        </div>
      )}
      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ backgroundColor: 'var(--color-surface2)' }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-3 py-2 text-left font-bold uppercase tracking-wider"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.key || i}
                style={{
                  backgroundColor: i % 2 ? 'var(--color-surface2)' : 'transparent',
                  borderTop: '1px solid var(--color-border)',
                }}
              >
                {columns.map((col) => {
                  let val = row[col.key];
                  if (col.format === 'percentage') val = `${val}%`;
                  else if (col.format === 'number' && typeof val === 'number') val = val.toLocaleString();
                  const isBold = col.bold || col.key === 'key';
                  return (
                    <td
                      key={col.key}
                      className={`px-3 py-2 whitespace-nowrap ${isBold ? 'font-semibold' : ''}`}
                      style={{
                        color: col.colorFn?.(row) || 'var(--color-text)',
                        maxWidth: col.maxWidth || 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {val ?? '—'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 mx-auto mt-2 text-[11px] font-semibold hover:opacity-70 transition-opacity"
          style={{ color: 'var(--color-accent)' }}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? 'Mostrar menos' : `Ver los ${data.length} registros`}
        </button>
      )}
    </div>
  );
});
