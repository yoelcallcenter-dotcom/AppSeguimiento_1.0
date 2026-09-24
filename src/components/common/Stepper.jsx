import React from 'react';
import { Check } from 'lucide-react';

/**
 * Stepper - Componente reutilizable de pasos.
 * @param {Array} steps - [{ label, icon?, description? }]
 * @param {number} currentStep - índice del paso actual (0-based)
 * @param {Function} onStepClick - callback(index) al hacer click en un paso
 * @param {string} orientation - 'horizontal' | 'vertical'
 */
export function Stepper({ steps = [], currentStep = 0, onStepClick, orientation = 'horizontal' }) {
  const isVertical = orientation === 'vertical';

  return (
    <div className={isVertical ? 'flex flex-col gap-0' : 'flex items-center gap-0'}>
      {steps.map((step, idx) => {
        const isCompleted = idx < currentStep;
        const isCurrent = idx === currentStep;
        const isPending = idx > currentStep;
        const Icon = step.icon;

        return (
          <React.Fragment key={idx}>
            <div
              className={`flex items-center gap-2 ${isVertical ? 'py-2' : ''} ${
                onStepClick && !isPending ? 'cursor-pointer' : ''
              }`}
              onClick={() => {
                if (onStepClick && !isPending) onStepClick(idx);
              }}
            >
              <div
                className="flex items-center justify-center rounded-full transition-all duration-200"
                style={{
                  width: 28,
                  height: 28,
                  flexShrink: 0,
                  backgroundColor: isCompleted
                    ? 'var(--color-success, #10B981)'
                    : isCurrent
                    ? 'var(--color-accent)'
                    : 'var(--color-surface2)',
                  color: isCompleted || isCurrent ? '#fff' : 'var(--color-text-muted)',
                  border: isPending ? '1.5px solid var(--color-border)' : 'none',
                }}
              >
                {isCompleted ? (
                  <Check size={14} strokeWidth={2.5} />
                ) : Icon ? (
                  <Icon size={14} />
                ) : (
                  <span className="text-[11px] font-semibold">{idx + 1}</span>
                )}
              </div>
              <div className={isVertical ? 'flex flex-col' : 'hidden sm:flex flex-col'}>
                <span
                  className="text-[11px] font-semibold leading-tight"
                  style={{
                    color: isCurrent
                      ? 'var(--color-accent)'
                      : isCompleted
                      ? 'var(--color-success, #10B981)'
                      : 'var(--color-text-muted)',
                  }}
                >
                  {step.label}
                </span>
                {step.description && (
                  <span className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
                    {step.description}
                  </span>
                )}
              </div>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={isVertical ? 'ml-[13px] py-1' : 'flex-1 mx-2'}
                style={{
                  width: isVertical ? 2 : undefined,
                  height: isVertical ? undefined : 2,
                  minHeight: isVertical ? 16 : 2,
                  backgroundColor: isCompleted ? 'var(--color-success, #10B981)' : 'var(--color-border)',
                  borderRadius: 999,
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default Stepper;
