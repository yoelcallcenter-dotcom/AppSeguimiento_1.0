import React, { createContext, useContext, useMemo } from 'react';

const UXContext = createContext({
  animations: true,
  microinteracciones: true,
  emptyStates: true,
  skeletonLoader: true,
  tooltipsMejorados: true,
  atajosTeclado: true,
});

export function UXProvider({ children, config }) {

  const value = useMemo(() => ({
    animations: config?.animaciones !== false,
    microinteracciones: config?.microinteracciones !== false,
    emptyStates: config?.emptyStates !== false,
    skeletonLoader: config?.skeletonLoader !== false,
    tooltipsMejorados: config?.tooltipsMejorados !== false,
    atajosTeclado: config?.atajosTeclado !== false,
    bajoConsumo: config?.bajoConsumo === true,
  }), [config]);

  return <UXContext.Provider value={value}>{children}</UXContext.Provider>;
}

export function useUX() {
  return useContext(UXContext);
}

export default UXContext;
