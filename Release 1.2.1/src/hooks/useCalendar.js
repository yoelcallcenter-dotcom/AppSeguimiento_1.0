import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "calendario-eventos";

export function useCalendar(casoId = null) {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cargar eventos
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const filtrados = casoId
          ? parsed.filter((e) => e.casoId === casoId)
          : parsed;
        setEventos(filtrados);
      }
    } catch {}
    setLoading(false);
  }, [casoId]);

  const guardar = useCallback(
    (nuevos) => {
      try {
        const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        let actualizados;
        if (casoId) {
          const otros = all.filter((e) => e.casoId !== casoId);
          actualizados = [...otros, ...nuevos];
        } else {
          actualizados = nuevos;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(actualizados));
        setEventos(nuevos);
      } catch {}
    },
    [casoId]
  );

  const agregarEvento = useCallback(
    (data) => {
      const evento = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        ...data,
        casoId: casoId || null,
        creado: new Date().toISOString(),
        notificado: false,
      };
      const nuevos = [...eventos, evento];
      guardar(nuevos);
      return evento;
    },
    [eventos, guardar, casoId]
  );

  const eliminarEvento = useCallback(
    (id) => {
      const nuevos = eventos.filter((e) => e.id !== id);
      guardar(nuevos);
    },
    [eventos, guardar]
  );

  const actualizarEvento = useCallback(
    (id, updates) => {
      const nuevos = eventos.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      );
      guardar(nuevos);
    },
    [eventos, guardar]
  );

  const getEventosPorDia = useCallback(
    (fecha) => {
      const key =
        typeof fecha === "string" ? fecha : fecha.toISOString().slice(0, 10);
      return eventos.filter((e) => e.fecha === key);
    },
    [eventos]
  );

  const getEventosPorMes = useCallback(
    (year, month) => {
      const mesStr = `${year}-${String(month + 1).padStart(2, "0")}`;
      return eventos.filter((e) => e.fecha && e.fecha.startsWith(mesStr));
    },
    [eventos]
  );

  const notificar = useCallback(
    (id) => {
      const evento = eventos.find((e) => e.id === id);
      if (!evento) return;
      try {
        import("../core/notifications/notificationStore").then(({ default: store }) => {
          store.getState().addToast({
            title: `Recordatorio: ${evento.titulo}`,
            message: `Fecha: ${evento.fecha} ${evento.hora}\n${evento.descripcion || ""}`,
            type: "info",
            timestamp: Date.now(),
            duration: 6000,
          });
        });
      } catch {}
      actualizarEvento(id, { notificado: true });
    },
    [eventos, actualizarEvento]
  );

  return {
    eventos,
    loading,
    agregarEvento,
    eliminarEvento,
    actualizarEvento,
    getEventosPorDia,
    getEventosPorMes,
    notificar,
  };
}
