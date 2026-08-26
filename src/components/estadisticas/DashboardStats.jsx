import React, { useMemo } from "react";
import { useTheme } from "../../context/ThemeContext";

export const DashboardStats = React.memo(({ casos }) => {
  const theme = useTheme();

  const stats = useMemo(() => {
    const total = casos.length;
    const pendientes = casos.filter(
      (c) =>
        c.estado === "Cita virtual" ||
        c.estado === "Cita presencial" ||
        c.estado === "Lo piensa" ||
        c.estado === "Pendiente"
    ).length;
    const firmas = casos.filter((c) => c.estado === "Firmo").length - casos.filter((c) => c.estado === "Baja").length;
    const noViables = casos.filter(
      (c) =>
        c.estado === "No le interesa" ||
        c.estado === "Tiene Abogado" ||
        c.estado === "Incontactable" ||
        c.estado === "No viable" ||
        c.estado === "Baja"
    ).length;
    const noResponde = casos.filter(
      (c) =>
        c.estado === "No responde" ||
        c.estado === "Reprogramado" ||
        c.estado === "2do Llamado"
    ).length;
    return { total, pendientes, firmas, noViables, noResponde };
  }, [casos]);

  const cards = [
    { label: "TOTAL", value: stats.total, color: "var(--color-primary)" },
    {
      label: "PENDIENTES",
      value: stats.pendientes,
      color: "var(--color-warning)",
    },
    {
      label: "FIRMAS",
      value: stats.firmas,
      color: theme.getEstadoColor("Firmo") || "var(--color-success)",
    },
    {
      label: "NO VIABLES",
      value: stats.noViables,
      color: theme.getEstadoColor("No viable") || "var(--color-danger)",
    },
    {
      label: "NO RESPONDE",
      value: stats.noResponde,
      color: theme.getEstadoColor("No responde") || "#F97316",
    },
  ];

  return (
    <div className="mb-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map((card, i) => (
          <div
            key={i}
            className="rounded-lg p-3 text-center"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="text-lg font-bold" style={{ color: card.color }}>
              {card.value}
            </div>
            <div
              className="text-[10px] uppercase tracking-wider"
              style={{ color: "var(--color-text-muted)" }}
            >
              {card.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
