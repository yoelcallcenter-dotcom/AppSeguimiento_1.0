import { create } from "zustand";
import { getProductivitySettings } from "../../features/productivity/productivityStore";

/**
 * celebrationStore.js
 * Estado de las animaciones de felicitacion (confeti + mensaje).
 * Se activa con celebrate() y se desactiva sola tras unos segundos.
 */

const DURATION = 3400;

let timer = null;

const useCelebrationStore = create((set) => ({
  active: false,
  message: "",
  sound: true,
  pieces: 48,

  celebrate: (message = "", options = {}) => {
    try {
      if (getProductivitySettings().interactionsEnabled === false) return;
    } catch {
      /* configuración no disponible: seguir */
    }
    if (timer) clearTimeout(timer);
    set({
      active: true,
      message,
      sound: options.sound !== false,
      pieces: options.pieces || 48,
    });
    timer = setTimeout(() => {
      set({ active: false, message: "", sound: true, pieces: 48 });
      timer = null;
    }, DURATION);
  },

  dismiss: () => {
    if (timer) clearTimeout(timer);
    timer = null;
    set({ active: false, message: "", sound: true, pieces: 48 });
  },
}));

export default useCelebrationStore;
