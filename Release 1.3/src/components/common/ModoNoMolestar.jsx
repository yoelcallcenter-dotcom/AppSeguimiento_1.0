import React, { useState } from "react";
import { Bell, BellOff } from "lucide-react";

export function ModoNoMolestar({ onToggle }) {
  const [activo, setActivo] = useState(() => {
    return localStorage.getItem("modo-no-molestar") === "true";
  });

  const toggle = () => {
    const nuevo = !activo;
    setActivo(nuevo);
    localStorage.setItem("modo-no-molestar", String(nuevo));
    onToggle?.(nuevo);
  };

  return (
    <button
      onClick={toggle}
      className="relative p-1.5 rounded-md hover:bg-white/5 transition-colors"
      style={{
        color: activo ? "var(--color-danger)" : "var(--color-text-muted)",
      }}
      aria-label={
        activo ? "Activar notificaciones" : "Desactivar notificaciones"
      }
      title={
        activo ? "Modo No Molestar activado" : "Modo No Molestar desactivado"
      }
    >
      {activo ? <BellOff size={18} /> : <Bell size={18} />}
      {activo && (
        <span
          className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
          style={{ backgroundColor: "var(--color-danger)" }}
        />
      )}
    </button>
  );
}
