import React from "react";
import { Keyboard, Zap } from "lucide-react";

const ATAJOS = [
  {
    tecla: "Ctrl + N",
    accion: "Nuevo caso",
    descripcion: "Abre el formulario para crear un nuevo caso",
  },
  {
    tecla: "Ctrl + R",
    accion: "Cargar reporte",
    descripcion: "Abre el modal para cargar un reporte rapido",
  },
  {
    tecla: "Ctrl + F",
    accion: "Buscar casos",
    descripcion: "Enfoca el campo de busqueda de casos",
  },
  {
    tecla: "Ctrl + K",
    accion: "Busqueda global",
    descripcion: "Abre la paleta de busqueda de notas",
  },
  {
    tecla: "Ctrl + D",
    accion: "Duplicar caso",
    descripcion: "Duplica el caso seleccionado en la tabla",
  },
  {
    tecla: "Ctrl + E",
    accion: "Exportar seleccionados",
    descripcion: "Exporta los casos seleccionados a CSV",
  },
  {
    tecla: "Ctrl + S",
    accion: "Guardar datos",
    descripcion: "Guarda los cambios en el formulario actual",
  },
  {
    tecla: "Ctrl + H",
    accion: "Abrir ayuda",
    descripcion: "Abre el panel de ayuda y documentacion",
  },
  {
    tecla: "Ctrl + 1-5",
    accion: "Cambiar vista",
    descripcion: "Dashboard, Tablero, Tabla, Reportes y Utiles",
  },
  {
    tecla: "Escape",
    accion: "Cerrar modal",
    descripcion: "Cierra cualquier modal o ventana emergente",
  },
];

export function AtajosTeclado() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Keyboard size={16} color="var(--color-accent)" />
        <span
          className="text-sm font-semibold"
          style={{ color: "var(--color-text)" }}
        >
          Atajos de teclado
        </span>
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: "var(--color-accent)22",
            color: "var(--color-accent)",
          }}
        >
          {ATAJOS.length} atajos
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {ATAJOS.map((atajo, index) => (
          <div
            key={index}
            className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-white/5"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <span
              className="text-sm font-bold px-3 py-1 rounded"
              style={{
                backgroundColor: "var(--color-accent)22",
                color: "var(--color-accent)",
                fontFamily: "monospace",
              }}
            >
              {atajo.tecla}
            </span>
            <div className="flex-1">
              <div
                className="text-xs font-medium"
                style={{ color: "var(--color-text)" }}
              >
                {atajo.accion}
              </div>
              <div
                className="text-[10px]"
                style={{ color: "var(--color-text-muted)" }}
              >
                {atajo.descripcion}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div
        className="rounded-lg p-3"
        style={{
          backgroundColor: "var(--color-accent)11",
          border: "1px solid var(--color-accent)33",
        }}
      >
        <div className="flex items-center gap-2">
          <Zap size={14} color="var(--color-accent)" />
          <span
            className="text-xs font-medium"
            style={{ color: "var(--color-accent)" }}
          >
            Consejo:
          </span>
          <span className="text-xs" style={{ color: "var(--color-text)" }}>
            Usa estos atajos para trabajar mas rapido y ser mas productivo.
          </span>
        </div>
      </div>
    </div>
  );
}
