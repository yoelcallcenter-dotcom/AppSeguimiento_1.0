/**
 * bodyScrollLock.js
 * Bloqueo del scroll de fondo mientras hay modales/overlays abiertos.
 * Usa un contador para soportar varios overlays abiertos a la vez
 * (html + body para cubrir el scroll en todos los navegadores).
 * Al bloquear compensa el ancho de la barra de scroll con padding-right en
 * body para que la desaparición de la barra no desplace el layout (saltos).
 */

let lockCount = 0;
let savedBodyPaddingRight = "";

export function lockBodyScroll() {
  lockCount += 1;
  if (lockCount === 1) {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    savedBodyPaddingRight = document.body.style.paddingRight;
    if (scrollbarWidth > 0) {
      const current = parseFloat(window.getComputedStyle(document.body).paddingRight) || 0;
      document.body.style.paddingRight = `${current + scrollbarWidth}px`;
    }
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }
}

export function unlockBodyScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
    document.body.style.paddingRight = savedBodyPaddingRight;
    savedBodyPaddingRight = "";
  }
}

export function isBodyScrollLocked() {
  return lockCount > 0;
}
