import React from "react";

/**
 * ChartTooltip
 * Tooltip de recharts con estilos por variables del tema (funciona en
 * oscuro y claro). Evita el texto en color fijo (negro) que aparece cuando
 * las series usan <Cell> sin stroke, y no repite el nombre en label+serie.
 */
export default function ChartTooltip({ active, payload, label, labelFormatter, formatter }) {
  if (!active || !payload || payload.length === 0) return null;

  const labelText = labelFormatter ? labelFormatter(label, payload) : label;

  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface2)',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        padding: '6px 10px',
        fontSize: 12,
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {labelText !== null && labelText !== undefined && labelText !== '' && (
        <div
          style={{
            color: 'var(--color-text-muted)',
            fontSize: 11,
            fontWeight: 600,
            marginBottom: 4,
          }}
        >
          {labelText}
        </div>
      )}
      {payload.map((p) => {
        const [value, name] = formatter
          ? formatter(p.value, p.name, p)
          : [p.value, p.name];
        return (
          <div
            key={p.dataKey || p.name || String(p.value)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--color-text)',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                backgroundColor: p.color || p.fill || 'var(--color-accent)',
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            <span>{name}</span>
            <b>{value}</b>
          </div>
        );
      })}
    </div>
  );
}
