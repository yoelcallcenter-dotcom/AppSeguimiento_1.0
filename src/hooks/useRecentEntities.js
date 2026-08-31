/**
 * useRecentEntities.js — Hook para gestionar entidades recientes.
 * Almacena las últimas 10 entidades vistas (casos, aseguradoras, estudios, herramientas).
 * Persiste en localStorage bajo la key 'recent-entities-art-tracker'.
 */

import { useState, useCallback } from 'react';

const STORAGE_KEY = 'recent-entities-art-tracker';
const MAX_RECENTS = 10;

function loadRecent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveRecent(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // silently fail
  }
}

export function useRecentEntities() {
  const [recents, setRecents] = useState(() => loadRecent());

  const addRecent = useCallback((type, id, name) => {
    setRecents((prev) => {
      const entry = { type, id: id || null, name: name || '', ts: Date.now() };
      const filtered = prev.filter((r) => {
        if (type === 'case') return !(r.type === 'case' && String(r.id) === String(id));
        return !(r.type === type && r.name === name);
      });
      return [entry, ...filtered].slice(0, MAX_RECENTS);
    });
  }, []);

  // Save after state update, not inside the updater
  const addRecentAndSave = useCallback((type, id, name) => {
    addRecent(type, id, name);
    // Read the latest state after update by re-computing
    const updated = loadRecent();
    const entry = { type, id: id || null, name: name || '', ts: Date.now() };
    const filtered = updated.filter((r) => {
      if (type === 'case') return !(r.type === 'case' && String(r.id) === String(id));
      return !(r.type === type && r.name === name);
    });
    saveRecent([entry, ...filtered].slice(0, MAX_RECENTS));
  }, [addRecent]);

  const clearRecent = useCallback(() => {
    setRecents([]);
    saveRecent([]);
  }, []);

  const removeRecent = useCallback((type, id, name) => {
    setRecents((prev) => {
      const filtered = prev.filter((r) => {
        if (type === 'case') return !(r.type === 'case' && String(r.id) === String(id));
        return !(r.type === type && r.name === name);
      });
      saveRecent(filtered);
      return filtered;
    });
  }, []);

  return { recents, addRecent: addRecentAndSave, clearRecent, removeRecent };
}
