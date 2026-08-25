import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BtnOutline } from "./BtnOutline";

export function Paginacion({
  paginaActual,
  totalPaginas,
  setPaginaActual,
  totalItems,
  itemLabel = "casos",
}) {
  if (totalPaginas <= 1) return null;

  return (
    <div className="flex items-center gap-3 mt-4 justify-center flex-wrap">
      <BtnOutline
        onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
        disabled={paginaActual === 1}
        size="sm"
        color="var(--color-text-muted)"
        icon={ChevronLeft}
      >
        Anterior
      </BtnOutline>
      <span className="text-sm" style={{ color: "var(--color-text)" }}>
        Página {paginaActual} de {totalPaginas}
        {totalItems !== undefined && (
          <span
            style={{ color: "var(--color-text-muted)", marginLeft: "0.5rem" }}
          >
            ({totalItems} {itemLabel})
          </span>
        )}
      </span>
      <BtnOutline
        onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
        disabled={paginaActual === totalPaginas}
        size="sm"
        color="var(--color-text-muted)"
        icon={ChevronRight}
      >
        Siguiente
      </BtnOutline>
    </div>
  );
}
