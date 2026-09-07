/**
 * a11y.js
 * Utilidades de accesibilidad para elementos clicables no nativos (div, tr,
 * span, li, etc.). Permite que los elementos con onClick sean operables por
 * teclado (Enter/Space), siguiendo los patrones WAI-ARIA de elementos
 * "button". Uso: <div {...accessibleClickProps(() => handle())} role="button">
 */

const KEYBOARD_ACTIVATION_KEYS = ["Enter", " "];

export function onKeyActivate(handler) {
  return (e) => {
    if (KEYBOARD_ACTIVATION_KEYS.includes(e.key)) {
      e.preventDefault();
      handler(e);
    }
  };
}

export function accessibleClickProps(handler, { label } = {}) {
  return {
    role: "button",
    tabIndex: 0,
    ...(label ? { "aria-label": label } : {}),
    onKeyDown: onKeyActivate(handler),
  };
}
