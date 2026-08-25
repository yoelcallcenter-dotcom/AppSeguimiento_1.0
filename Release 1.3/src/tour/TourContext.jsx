import React, { createContext, useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X, Check, Zap } from "lucide-react";
import { TOURS } from "./tours";
import { soundSystem } from "../core/notifications/soundSystem";
import { lockBodyScroll, unlockBodyScroll } from "../utils/bodyScrollLock";

const TourContext = createContext(null);

const STORAGE_PREFIX = "tour_completed_";

function isTourCompleted(tourId) {
  try { return localStorage.getItem(STORAGE_PREFIX + tourId) === "true"; } catch { return false; }
}

function markTourCompleted(tourId) {
  try { localStorage.setItem(STORAGE_PREFIX + tourId, "true"); } catch {}
}

const RETRY_DELAYS = [100, 200, 300, 500, 500, 800, 800, 1000, 1000, 1000];

function waitForElement(selector, maxRetries = 10) {
  return new Promise((resolve, reject) => {
    let attempt = 0;
    const check = () => {
      try {
        const el = document.querySelector(selector);
        if (el && el.offsetParent !== null) { resolve(el); return; }
      } catch {}
      if (++attempt >= maxRetries) {
        reject(new Error(`Elemento no encontrado: ${selector}`));
        return;
      }
      setTimeout(check, RETRY_DELAYS[attempt] || 1000);
    };
    check();
  });
}

function calculateTooltipPos(targetRect, tw) {
  const gap = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const th = 320;

  let top, left, arrow;

  if (targetRect.bottom + gap + th <= vh) {
    top = targetRect.bottom + gap;
    left = targetRect.left + targetRect.width / 2 - tw / 2;
    arrow = "top";
  } else if (targetRect.top - gap - th >= 0) {
    top = targetRect.top - gap - th;
    left = targetRect.left + targetRect.width / 2 - tw / 2;
    arrow = "bottom";
  } else if (targetRect.right + gap + tw <= vw) {
    top = targetRect.top + targetRect.height / 2 - th / 2;
    left = targetRect.right + gap;
    arrow = "left";
  } else if (targetRect.left - gap - tw >= 0) {
    top = targetRect.top + targetRect.height / 2 - th / 2;
    left = targetRect.left - gap - tw;
    arrow = "right";
  } else {
    top = targetRect.bottom + gap;
    left = targetRect.left + targetRect.width / 2 - tw / 2;
    arrow = "top";
  }

  left = Math.max(gap, Math.min(left, vw - tw - gap));
  top = Math.max(gap, Math.min(top, vh - th - gap));

  return { top, left, arrow };
}

export function TourProvider({ children }) {
  const [state, setState] = useState({
    isActive: false,
    currentStep: 0,
    steps: [],
    tourId: null,
  });
  const [targetRect, setTargetRect] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0, arrow: "top" });
  const [animating, setAnimating] = useState(false);
  const [finished, setFinished] = useState(false);
  const highlightEl = useRef(null);
  const timerRef = useRef(null);
  const maskIdRef = useRef("tour-mask-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8));
  const stateRef = useRef(state);
  stateRef.current = state;

  const step = state.steps[state.currentStep] || null;
  const isLast = state.currentStep === state.steps.length - 1;
  const isFirst = state.currentStep === 0;

  const clearHighlight = useCallback(() => {
    if (highlightEl.current) {
      const el = highlightEl.current;
      el.style.outline = "";
      el.style.outlineOffset = "";
      el.style.zIndex = "";
      el.style.transition = "";
      el.style.boxShadow = "";
      highlightEl.current = null;
    }
  }, []);

  const applyHighlight = useCallback((el) => {
    clearHighlight();
    el.style.outline = "3px solid var(--color-accent)";
    el.style.outlineOffset = "6px";
    el.style.zIndex = "1001";
    el.style.transition = "box-shadow 0.3s ease";
    el.style.boxShadow = "0 0 24px rgba(217, 164, 65, 0.4)";
    highlightEl.current = el;
  }, [clearHighlight]);

  const endTour = useCallback(() => {
    clearHighlight();
    unlockBodyScroll();
    setState({ isActive: false, currentStep: 0, steps: [], tourId: null });
    setTargetRect(null);
    setFinished(false);
  }, [clearHighlight]);

  const measureAndScroll = useCallback(async () => {
    const s = stateRef.current;
    const currentStep = s.steps[s.currentStep];
    if (!currentStep) return;
    try {
      const el = await waitForElement(currentStep.selector);
      el.scrollIntoView({ behavior: "instant", block: "center" });
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
      applyHighlight(el);
      setTooltipPos(calculateTooltipPos(rect, 440));
    } catch (err) {
      console.warn(err.message);
      endTour();
    }
  }, [applyHighlight, endTour]);

  useEffect(() => {
    if (!state.isActive || finished) return;
    setAnimating(true);
    setTargetRect(null);
    clearHighlight();
    timerRef.current = setTimeout(async () => {
      await measureAndScroll();
      setAnimating(false);
    }, 150);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [state.currentStep, state.isActive, finished, clearHighlight, measureAndScroll]);

  useEffect(() => {
    if (!state.isActive || finished) return;
    const onUpdate = () => { clearTimeout(timerRef.current); timerRef.current = setTimeout(measureAndScroll, 150); };
    window.addEventListener("resize", onUpdate);
    window.addEventListener("scroll", onUpdate, { passive: true });
    return () => {
      window.removeEventListener("resize", onUpdate);
      window.removeEventListener("scroll", onUpdate);
      clearTimeout(timerRef.current);
    };
  }, [state.isActive, finished, measureAndScroll]);

  useEffect(() => {
    return () => { clearHighlight(); document.body.style.overflow = ""; };
  }, [clearHighlight]);

  const startTour = useCallback((tourId) => {
    const tour = TOURS[tourId];
    if (!tour) return;
    try { localStorage.removeItem(STORAGE_PREFIX + tourId); } catch {}
    setState({ isActive: true, currentStep: 0, steps: tour.steps, tourId });
    setFinished(false);
    setTargetRect(null);
    lockBodyScroll();
  }, []);

  const nextStep = useCallback(() => {
    if (isLast) {
      if (state.tourId) markTourCompleted(state.tourId);
      soundSystem.playAction("complete");
      setAnimating(true);
      clearHighlight();
      setFinished(true);
      setTimeout(() => endTour(), 400);
      return;
    }
    setAnimating(true);
    clearHighlight();
    setState((prev) => ({ ...prev, currentStep: prev.currentStep + 1 }));
  }, [isLast, state.tourId, clearHighlight, endTour]);

  const prevStep = useCallback(() => {
    if (isFirst) return;
    setAnimating(true);
    clearHighlight();
    setState((prev) => ({ ...prev, currentStep: prev.currentStep - 1 }));
  }, [isFirst, clearHighlight]);

  const overlayVisible = state.isActive && !finished;

  return (
    <TourContext.Provider value={{ startTour, endTour, isActive: state.isActive, tourCompleted: finished && !!state.tourId }}>
      {children}

      {overlayVisible && targetRect && step && (
        <svg
          className="fixed inset-0 z-[999] pointer-events-none"
          width="100%"
          height="100%"
          style={{ transition: "opacity 0.3s ease" }}
        >
          <defs>
            <mask id={maskIdRef.current}>
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={targetRect.left - 4}
                y={targetRect.top - 4}
                width={targetRect.width + 8}
                height={targetRect.height + 8}
                rx="12"
                fill="black"
              />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(0,0,0,0.5)" mask={`url(#${maskIdRef.current})`} />
        </svg>
      )}

      {overlayVisible && step && (
        <div
          className="fixed z-[1002]"
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
            maxWidth: "440px",
            width: "92%",
            opacity: animating ? 0 : 1,
            transform: animating ? "translateY(10px)" : "translateY(0)",
            transition: "opacity 0.25s ease, transform 0.3s ease",
          }}
        >
          <div
            className="rounded-xl p-5 shadow-2xl"
            style={{
              backgroundColor: "var(--color-surface2)",
              border: "2px solid var(--color-accent)",
              boxShadow: "0 8px 32px var(--color-shadow)",
            }}
          >
            <div
              className="absolute w-3 h-3 rotate-45"
              style={{
                backgroundColor: "var(--color-surface2)",
                borderTop: "2px solid var(--color-accent)",
                borderLeft: "2px solid var(--color-accent)",
                ...(tooltipPos.arrow === "top"
                  ? { top: "-7px", left: "calc(50% - 6px)" }
                  : tooltipPos.arrow === "bottom"
                  ? { bottom: "-7px", left: "calc(50% - 6px)" }
                  : tooltipPos.arrow === "left"
                  ? { left: "-7px", top: "calc(50% - 6px)" }
                  : { right: "-7px", top: "calc(50% - 6px)" }),
              }}
            />

            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "var(--color-accent)22", color: "var(--color-accent)" }}
                >
                  {state.currentStep + 1}/{state.steps.length}
                </span>
                <span className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                  {step.title}
                </span>
              </div>
              <button
                onClick={() => { clearHighlight(); endTour(); }}
                className="p-1 rounded hover:bg-white/5 transition-colors"
                style={{ color: "var(--color-text-muted)" }}
                aria-label="Cerrar tour"
              >
                <X size={18} />
              </button>
            </div>

            <div className="text-xs mb-3 leading-relaxed" style={{ color: "var(--color-text)" }}>
              {step.description}
            </div>

            <div
              className="rounded-md p-3 mb-3 space-y-1"
              style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
              <div className="text-[10px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                Pasos a seguir:
              </div>
              {step.details.map((detail, idx) => (
                <div key={idx} className="text-xs flex items-start gap-2" style={{ color: "var(--color-text)" }}>
                  <span style={{ color: "var(--color-accent)" }}>▸</span>
                  <span>{detail}</span>
                </div>
              ))}
            </div>

            {step.tips && (
              <div
                className="rounded-md p-3 mb-3 flex items-start gap-2"
                style={{ backgroundColor: "var(--color-accent)11", border: "1px solid var(--color-accent)33" }}
              >
                <Zap size={16} color="var(--color-accent)" className="flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-semibold" style={{ color: "var(--color-accent)" }}>Consejo: </span>
                  <span className="text-xs" style={{ color: "var(--color-text)" }}>{step.tips}</span>
                </div>
              </div>
            )}

            <div className="flex gap-1 mb-4">
              {state.steps.map((_, index) => (
                <div
                  key={index}
                  className="h-1 rounded-full flex-1 transition-all duration-300"
                  style={{
                    backgroundColor: index === state.currentStep ? "var(--color-accent)" : "var(--color-border)",
                    height: index === state.currentStep ? "3px" : "1px",
                  }}
                />
              ))}
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={prevStep}
                disabled={isFirst}
                className="text-xs font-semibold px-3 py-1.5 rounded disabled:opacity-40 transition-colors hover:bg-white/5"
                style={{ color: "var(--color-text-muted)" }}
              >
                <ChevronLeft size={14} className="inline mr-1" /> Anterior
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => { clearHighlight(); endTour(); }}
                  className="text-xs px-3 py-1.5 rounded transition-colors hover:bg-white/5"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Saltar
                </button>
                <button
                  onClick={nextStep}
                  className="flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 rounded transition-all hover:opacity-80"
                  style={{ backgroundColor: "var(--color-accent)", color: "#14181F" }}
                >
                  {isLast ? (
                    <><span>Finalizar</span> <Check size={14} /></>
                  ) : (
                    <><span>Siguiente</span> <ChevronRight size={14} /></>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {finished && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center animate-fade-in" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div
            className="rounded-xl p-6 text-center shadow-2xl animate-slide-up"
            style={{ backgroundColor: "var(--color-surface2)", border: "2px solid var(--color-accent)", maxWidth: "360px", width: "90%" }}
          >
            <Check size={40} className="mx-auto mb-3" style={{ color: "var(--color-accent)" }} />
            <div className="text-base font-bold mb-2" style={{ color: "var(--color-text)" }}>Tour completado</div>
            <div className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
              Ya estas listo para usar la aplicacion.
            </div>
            <button
              onClick={() => endTour()}
              className="text-xs font-semibold px-4 py-2 rounded transition-all hover:opacity-80"
              style={{ backgroundColor: "var(--color-accent)", color: "#14181F" }}
            >
              Empezar
            </button>
          </div>
        </div>
      )}
    </TourContext.Provider>
  );
}

export { TourContext };
