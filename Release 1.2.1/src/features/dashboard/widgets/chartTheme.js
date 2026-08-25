/**
 * chartTheme.js
 * Estilos compartidos para los gráficos recharts, coherentes con el
 * design system (tema oscuro/claro).
 */

export const CHART_TICK = { fill: 'var(--color-text-muted)', fontSize: 11 };
export const CHART_GRID = {
  stroke: 'var(--color-border)',
  strokeDasharray: '3 3',
};
export const TOOLTIP_STYLE = {
  backgroundColor: 'var(--color-surface2)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  color: 'var(--color-text)',
  fontSize: 12,
};
export const TOOLTIP_LABEL = { color: 'var(--color-text-muted)', fontSize: 11 };
