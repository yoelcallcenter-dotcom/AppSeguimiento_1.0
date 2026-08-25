import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { HINTS } from "./hintData";

const HelpContext = createContext(null);

const DISMISSED_KEY = "help_dismissed_hints";
const LEVEL_KEY = "help_user_level";

function loadDismissed() {
  try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]"); } catch { return []; }
}
function saveDismissed(ids) {
  try { localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids)); } catch {}
}
function loadLevel() {
  try { return localStorage.getItem(LEVEL_KEY) || "new"; } catch { return "new"; }
}
function saveLevel(l) {
  try { localStorage.setItem(LEVEL_KEY, l); } catch {}
}

export function HelpProvider({ children }) {
  const [dismissed, setDismissed] = useState(loadDismissed);
  const [userLevel, setUserLevel] = useState(loadLevel);
  const [context, setContext] = useState({ currentView: "", stats: {} });
  const prevViewRef = useRef("");

  const dismissHint = useCallback((id) => {
    setDismissed((prev) => {
      const next = prev.includes(id) ? prev : [...prev, id];
      saveDismissed(next);
      return next;
    });
  }, []);

  const updateContext = useCallback((partial) => {
    setContext((prev) => ({ ...prev, ...partial }));
  }, []);

  const activeHints = useMemo(() => {
    return HINTS
      .filter((h) => !dismissed.includes(h.id))
      .filter((h) => h.condition(context))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3);
  }, [dismissed, context]);

  useEffect(() => {
    if (context.currentView !== prevViewRef.current) {
      prevViewRef.current = context.currentView;
    }
  }, [context.currentView]);

  const value = useMemo(
    () => ({
      activeHints,
      dismissed,
      userLevel,
      setUserLevel: (l) => { setUserLevel(l); saveLevel(l); },
      dismissHint,
      updateContext,
      resetHints: () => { setDismissed([]); saveDismissed([]); },
    }),
    [activeHints, dismissed, userLevel, dismissHint, updateContext]
  );

  return <HelpContext.Provider value={value}>{children}</HelpContext.Provider>;
}

export function useHelp() {
  const ctx = useContext(HelpContext);
  if (!ctx) throw new Error("useHelp debe usarse dentro de un <HelpProvider>");
  return ctx;
}
