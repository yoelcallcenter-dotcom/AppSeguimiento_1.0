/**
 * bodyScrollLock.js
 * Bloqueo del scroll de fondo mientras hay modales/overlays abiertos.
 * Usa un contador para soportar varios overlays abiertos a la vez
 * (html + body para cubrir el scroll en todos los navegadores).
 */

let lockCount = 0;

export function lockBodyScroll() {
  lockCount += 1;
  if (lockCount === 1) {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }
}

export function unlockBodyScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  }
}

export function isBodyScrollLocked() {
  return lockCount > 0;
}
