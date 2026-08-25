import { useState, useEffect, useCallback } from "react";
import { storageManager } from "../core/storage/storageManager";

export function useBlocNotas(storageKey) {
  const [notas, setNotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveTimeout, setSaveTimeout] = useState(null);

  // Cargar notas
  useEffect(() => {
    const cargar = async () => {
      try {
        const data = await storageManager.get(storageKey, {
          global: [],
          porCaso: {},
        });
        setNotas(data.global || []);
      } catch (error) {
        console.error("Error cargando notas:", error);
        setNotas([]);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [storageKey]);

  // Guardar notas con debounce
  const guardarNotas = useCallback(
    (nuevasNotas) => {
      if (saveTimeout) clearTimeout(saveTimeout);
      const timeout = setTimeout(async () => {
        try {
          const data = await storageManager.get(storageKey, {
            global: [],
            porCaso: {},
          });
          data.global = nuevasNotas;
          await storageManager.set(storageKey, data);
        } catch (error) {
          console.error("Error guardando notas:", error);
        }
      }, 500);
      setSaveTimeout(timeout);
    },
    [storageKey, saveTimeout]
  );

  // Crear nota
  const crearNota = useCallback(
    ({ titulo = "", contenido = "", caseId = null } = {}) => {
      const nueva = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        titulo: titulo || `Nota ${notas.length + 1}`,
        contenido: contenido || "",
        caseId: caseId,
        fecha: new Date().toISOString(),
      };
      const nuevasNotas = [nueva, ...notas];
      setNotas(nuevasNotas);
      guardarNotas(nuevasNotas);
      return nueva;
    },
    [notas, guardarNotas]
  );

  // Actualizar nota
  const actualizarNota = useCallback(
    (id, updates) => {
      const nuevasNotas = notas.map((n) =>
        n.id === id ? { ...n, ...updates, fecha: new Date().toISOString() } : n
      );
      setNotas(nuevasNotas);
      guardarNotas(nuevasNotas);
    },
    [notas, guardarNotas]
  );

  // Eliminar nota
  const eliminarNota = useCallback(
    (id) => {
      const nuevasNotas = notas.filter((n) => n.id !== id);
      setNotas(nuevasNotas);
      guardarNotas(nuevasNotas);
    },
    [notas, guardarNotas]
  );

  // Obtener notas por caso
  const getNotasPorCaso = useCallback(
    (caseId) => {
      return notas.filter((n) => n.caseId === caseId);
    },
    [notas]
  );

  // Obtener todas las notas
  const getNotas = useCallback(() => {
    return [...notas];
  }, [notas]);

  return {
    notas,
    loading,
    crearNota,
    actualizarNota,
    eliminarNota,
    getNotas,
    getNotasPorCaso,
  };
}
