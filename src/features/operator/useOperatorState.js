/**
 * useOperatorState.js
 * Hook que agrupa el estado del operador (perfil, disponibilidad, metas,
 * credenciales, preferencias) para la vista "Mi Espacio".
 */

import { useState, useEffect, useCallback } from "react";
import {
  getOperatorProfile,
  saveOperatorProfile,
  getOperatorAvailability,
  saveOperatorAvailability,
  getOperatorGoals,
  saveOperatorGoals,
  getOperatorCredentials,
  saveOperatorCredentials,
  addCredential,
  updateCredential,
  deleteCredential,
  getOperatorSettings,
  saveOperatorSettings,
  // v1.9.6 (fix metas): refresco en la misma pestaña.
  subscribeOperatorGoals,
} from "./operatorStore";

export function useOperatorState() {
  const [profile, setProfile] = useState(() => getOperatorProfile());
  const [availability, setAvailability] = useState(() => getOperatorAvailability());
  const [goals, setGoals] = useState(() => getOperatorGoals());
  const [credentials, setCredentials] = useState(() => getOperatorCredentials());
  const [settings, setSettings] = useState(() => getOperatorSettings());
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const onStorage = () => {
      setProfile(getOperatorProfile());
      setAvailability(getOperatorAvailability());
      setGoals(getOperatorGoals());
      setCredentials(getOperatorCredentials());
      setSettings(getOperatorSettings());
      setVersion((v) => v + 1);
    };
    window.addEventListener("storage", onStorage);
    // v1.9.6 (fix metas): el evento `storage` solo llega de OTRA pestaña;
    // cambios de metas hechos en esta misma pestaña (p.ej. Configuración →
    // "Guardar Meta") ahora notifican vía subscribeOperatorGoals y Mi Espacio
    // refresca sus metas al instante.
    const unsubscribe = subscribeOperatorGoals(onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      unsubscribe();
    };
  }, []);

  const updateProfile = useCallback((patch) => {
    const updated = saveOperatorProfile(patch);
    setProfile(updated);
    setVersion((v) => v + 1);
    return updated;
  }, []);

  const updateAvailability = useCallback((patch) => {
    const updated = saveOperatorAvailability(patch);
    setAvailability(updated);
    setVersion((v) => v + 1);
    return updated;
  }, []);

  const updateGoals = useCallback((patch) => {
    const updated = saveOperatorGoals(patch);
    setGoals(updated);
    setVersion((v) => v + 1);
    return updated;
  }, []);

  const updateSettings = useCallback((patch) => {
    const updated = saveOperatorSettings(patch);
    setSettings(updated);
    setVersion((v) => v + 1);
    return updated;
  }, []);

  const createCredential = useCallback((entry) => {
    const updated = addCredential(entry);
    setCredentials(updated);
    setVersion((v) => v + 1);
    return updated;
  }, []);

  const editCredential = useCallback((id, patch) => {
    const updated = updateCredential(id, patch);
    setCredentials(updated);
    setVersion((v) => v + 1);
    return updated;
  }, []);

  const removeCredential = useCallback((id) => {
    const updated = deleteCredential(id);
    setCredentials(updated);
    setVersion((v) => v + 1);
    return updated;
  }, []);

  const refresh = useCallback(() => {
    setProfile(getOperatorProfile());
    setAvailability(getOperatorAvailability());
    setGoals(getOperatorGoals());
    setCredentials(getOperatorCredentials());
    setSettings(getOperatorSettings());
    setVersion((v) => v + 1);
  }, []);

  return {
    profile,
    availability,
    goals,
    credentials,
    settings,
    version,
    updateProfile,
    updateAvailability,
    updateGoals,
    updateSettings,
    createCredential,
    editCredential,
    removeCredential,
    refresh,
  };
}