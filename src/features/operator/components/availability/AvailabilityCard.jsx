import React, { useState } from "react";
import { AvailabilityHeader } from "./AvailabilityHeader";
import { AvailabilityTabs } from "./AvailabilityTabs";
import { AvailabilityStatus, buildUpcoming } from "./AvailabilityStatus";
import { AvailabilityEditForm } from "./AvailabilityEditForm";
import { AvailabilityList } from "./AvailabilityList";
import { TAB_META, listForTab } from "./availabilityMeta";

export function AvailabilityCard({ availability, updateAvailability, showToast }) {
  const [tab, setTab] = useState("vacaciones");
  const [editing, setEditing] = useState(null);

  const list = listForTab(availability, tab);

  const setList = (key, newList) => {
    const patch = {};
    if (key === "vacaciones") patch.vacations = newList;
    if (key === "feriados") patch.holidays = newList;
    if (key === "inasistencias") patch.absences = newList;
    if (key === "dias") patch.customDaysOff = newList;
    updateAvailability(patch);
  };

  const removeItem = (id) => {
    setList(tab, list.filter((i) => i.id !== id));
    showToast("Eliminado", "info");
  };

  const upcoming = buildUpcoming(availability);

  const startNew = () => setEditing({ id: "nuevo" });

  return (
    <div
      className="rounded-lg p-4"
      style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      <AvailabilityHeader availability={availability} editing={editing} startNew={startNew} />

      <AvailabilityTabs
        availability={availability}
        tab={tab}
        onTabChange={(key) => { setTab(key); setEditing(null); }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Columna izquierda: resumen del estado o formulario de edición */}
        <div className="space-y-2">
          {editing ? (
            <AvailabilityEditForm
              key={editing ? `${tab}-${editing.id}` : tab}
              tab={tab}
              editing={editing}
              onCancel={() => setEditing(null)}
              onSave={(item) => {
                const exists = list.some((i) => i.id === item.id);
                setList(tab, exists ? list.map((i) => (i.id === item.id ? item : i)) : [item, ...list]);
                setEditing(null);
                showToast("Guardado", "success");
              }}
            />
          ) : (
            <AvailabilityStatus upcoming={upcoming} onTabChange={setTab} startNew={startNew} />
          )}
          <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
            {list.length} registro{list.length !== 1 ? "s" : ""} en {TAB_META[tab].label.toLowerCase()}.
          </div>
        </div>

        {/* Columna derecha: lista completa de la categoría activa */}
        <AvailabilityList availability={availability} tab={tab} onEdit={setEditing} onRemove={removeItem} />
      </div>
    </div>
  );
}

export default AvailabilityCard;