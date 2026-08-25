import React from "react";
import { Select } from "../common/Select";

export function OrdenamientoSelector({ orden, setOrden }) {
  const opciones = [
    { value: "fecha-desc", label: "Mas reciente" },
    { value: "fecha-asc", label: "Mas antiguo" },
    { value: "nombre-asc", label: "A-Z" },
    { value: "nombre-desc", label: "Z-A" },
  ];
  return (
    <Select
      value={orden}
      onChange={(e) => setOrden(e.target.value)}
      style={{ width: 140, padding: "4px 8px", fontSize: 10 }}
      aria-label="Ordenar casos"
    >
      {opciones.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}
