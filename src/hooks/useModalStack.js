import { useMemo } from "react";

export function useModalStack({ verCaso, modalCaso, modalReporte }) {
  return useMemo(() => {
    const order = [];
    if (verCaso) order.push("verCaso");
    if (modalCaso) order.push("edit");
    if (modalReporte) order.push("reporte");
    const stacked = order.length > 1;
    return {
      order,
      stacked,
      verCasoCovered: stacked,
      childZ: stacked ? "z-submodal" : "z-modal",
    };
  }, [verCaso, modalCaso, modalReporte]);
}