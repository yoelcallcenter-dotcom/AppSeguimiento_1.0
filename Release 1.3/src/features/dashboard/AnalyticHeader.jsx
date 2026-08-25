import React from 'react';
import { TrendingUp, TrendingDown, Target } from 'lucide-react';

export const AnalyticHeader = React.memo(({ metrics, filteredCases, insight }) => {
  const total = filteredCases.length;
  const conversion = metrics.tasaConversion?.value ?? 0;
  const firmas = metrics.firmas?.value ?? 0;

  return (
    <div
      className="rounded-xl p-5 animate-fade-in"
      style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>{total.toLocaleString()}</div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Casos totales</div>
          </div>
          <div className="w-px h-10" style={{ backgroundColor: 'var(--color-border)' }} />
          <div className="text-center">
            <div className="text-3xl font-bold" style={{ color: 'var(--color-success)' }}>{firmas.toLocaleString()}</div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Firmas</div>
          </div>
          <div className="w-px h-10" style={{ backgroundColor: 'var(--color-border)' }} />
          <div className="text-center">
            <div className="text-3xl font-bold" style={{ color: conversion > 20 ? 'var(--color-success)' : 'var(--color-warning)' }}>
              {conversion}%
            </div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Conversión</div>
          </div>
        </div>

        {insight && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
            style={{ backgroundColor: 'var(--color-surface2)', border: '1px solid var(--color-border)' }}
          >
            <Target size={14} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
            <span style={{ color: 'var(--color-text)' }}>{insight}</span>
          </div>
        )}
      </div>
    </div>
  );
});
