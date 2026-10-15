import useNotificationStore from "../core/notifications/notificationStore";
import { isEasterEggsEnabled } from "./uiSettings";

// 1.10.1 — Higiene P3 (código muerto; AUDITORIA_RELEASE_1.10.1 §8, cluster
// "easterEggs internals"): showEasterEgg, consoleMessage, flashRoot,
// highlightWidget, pulseElement y subtleBorderGlow perdieron el `export` porque
// 0 importadores en src/ (incl. *.test.*); siguen existiendo porque fireEgg y
// EFFECTS los usan internamente. Único export vivo: fireEgg (behaviorEngine.js:6).

const EGG_DURATION = 4000;
const EFFECT_DURATION = 280;

function applyClass(el, cls) {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth; // reinicia la animación si ya estaba aplicada
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), EFFECT_DURATION);
}

/**
 * Muestra un toast efímero usando el sistema de notificaciones existente
 * (ToastContainer), sin alert() y sin tocar el centro de notificaciones.
 * `opts.icon` es un componente React (lucide) que reemplaza el icono por tipo.
 */
function showEasterEgg(message, opts = {}) {
  if (!isEasterEggsEnabled()) return;
  const store = useNotificationStore.getState();
  store.addToast({
    message,
    type: "info",
    icon: opts.icon,
    duration: opts.duration || EGG_DURATION,
  });
}

/** Log contextual en consola, legible, sin emojis. */
function consoleMessage(text) {
  if (!isEasterEggsEnabled()) return;
  console.log(
    `%c[EasterEgg] ${text}`,
    "color:#818CF8;font-weight:600;font-size:12px;"
  );
}

/** Flash sutil sobre toda la app (solo para hiperactividad). */
function flashRoot() {
  applyClass(document.getElementById("root") || document.body, "ee-flash");
}

/** Resalta un widget puntual por su id (si existe). */
function highlightWidget(id) {
  applyClass(document.getElementById(id), "ee-highlight");
}

/** Pulso breve sobre un elemento por selector CSS (si existe). */
function pulseElement(selector) {
  applyClass(document.querySelector(selector), "ee-pulse");
}

/** Glow de borde sutil sobre un elemento por selector CSS (si existe). */
function subtleBorderGlow(selector) {
  applyClass(document.querySelector(selector), "ee-glow");
}

const EFFECTS = {
  flash: () => flashRoot(),
  highlight: (target) => highlightWidget(target && target.replace("#", "")),
  pulse: (target) => pulseElement(target || ".app-header"),
  glow: (target) => subtleBorderGlow(target || ".app-header"),
};

/**
 * Despacha un easter egg (resultado de behaviorEngine): toast con icono,
 * log en consola y, si aplica, un efecto visual leve.
 */
export function fireEgg(egg) {
  if (!isEasterEggsEnabled() || !egg) return;
  if (egg.message) showEasterEgg(egg.message, { icon: egg.icon });
  if (egg.console !== false) consoleMessage(egg.message || egg.id);
  if (egg.effect && EFFECTS[egg.effect]) EFFECTS[egg.effect](egg.effectTarget);
}
