import { useEffect } from "react";

export function useKeyboardShortcuts({
  onNuevo,
  onReporte,
  onBuscar,
  onCerrarModal,
  onGuardar,
  onEliminar,
  onDuplicar,
  onCambiarVista,
  onExportar,
  onAyuda,
  enabled = true,
}) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e) => {
      // Ctrl + N: Nuevo caso
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        onNuevo?.();
      }

      // Ctrl + R: Cargar reporte
      if ((e.ctrlKey || e.metaKey) && e.key === "r") {
        e.preventDefault();
        onReporte?.();
      }

      // Ctrl + F: Buscar casos
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        onBuscar?.();
      }

      // Ctrl + S: Guardar datos
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        onGuardar?.();
      }

      // Ctrl + D: Duplicar caso
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        onDuplicar?.();
      }

      // Ctrl + E: Exportar seleccionados
      if ((e.ctrlKey || e.metaKey) && e.key === "e") {
        e.preventDefault();
        onExportar?.();
      }

      // Ctrl + H: Ayuda
      if ((e.ctrlKey || e.metaKey) && e.key === "h") {
        e.preventDefault();
        onAyuda?.();
      }

      // Ctrl + 1-5: Cambiar vista
      if (
        (e.ctrlKey || e.metaKey) &&
        ["1", "2", "3", "4", "5"].includes(e.key)
      ) {
        e.preventDefault();
        const vistas = [
          "dashboard",
          "kanban",
          "tabla",
          "reportes",
          "utiles",
        ];
        const index = parseInt(e.key) - 1;
        if (vistas[index]) onCambiarVista?.(vistas[index]);
      }

      // Escape: Cerrar modal
      if (e.key === "Escape") {
        onCerrarModal?.();
      }

      // Delete/Supr: Eliminar
      if (e.key === "Delete" || e.key === "Supr") {
        onEliminar?.();
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [
    onNuevo,
    onReporte,
    onBuscar,
    onCerrarModal,
    onGuardar,
    onEliminar,
    onDuplicar,
    onCambiarVista,
    onExportar,
    onAyuda,
    enabled,
  ]);
}
