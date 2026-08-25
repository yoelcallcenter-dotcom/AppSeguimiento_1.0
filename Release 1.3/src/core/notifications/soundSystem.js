const SOUND_PRIORITY = {
  critical: 4,
  error: 3,
  warning: 2,
  success: 1,
  info: 1,
};

import { getProductivitySettings } from "../../features/productivity/productivityStore";

function microInteraccionesActivas() {
  try {
    return getProductivitySettings().interactionsEnabled !== false;
  } catch {
    return true;
  }
}

class SoundSystem {
  constructor() {
    this._enabled = true;
    this._volume = 0.5;
    this._lastPlayed = {};
    this._audioContext = null;
    this._soundFiles = {
      success: null,
      error: null,
      warning: null,
      critical: null,
      info: null,
    };
  }

  _ensureContext() {
    if (this._audioContext) return;
    try {
      this._audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
    } catch {
      this._audioContext = null;
    }
  }

  _generateTone(type) {
    this._ensureContext();
    if (!this._audioContext) return;
    const ctx = this._audioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const freq = { success: 880, error: 220, warning: 440, critical: 180, info: 660 }[type] || 440;
    const duration = { success: 0.15, error: 0.4, warning: 0.3, critical: 0.5, info: 0.1 }[type] || 0.15;
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(this._volume * 0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  _playSequence(notes, noteDuration = 0.09) {
    this._ensureContext();
    if (!this._audioContext) return;
    const ctx = this._audioContext;
    const start = ctx.currentTime;
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t = start + i * noteDuration;
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(this._volume * 0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + noteDuration);
      osc.start(t);
      osc.stop(t + noteDuration + 0.02);
    });
  }

  // Deslizamiento suave y armonioso para la entrada/salida de notificaciones.
  _playSlide() {
    this._ensureContext();
    if (!this._audioContext) return;
    const ctx = this._audioContext;
    const t = ctx.currentTime;
    const duration = 0.16;

    // Acorde armónico sutil en deslizamiento ascendente (Do5->Mi5 y Mi5->Sol5)
    const intervals = [
      { start: 523.25, end: 659.25 },
      { start: 659.25, end: 783.99 },
    ];

    intervals.forEach(({ start, end }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(start, t);
      osc.frequency.exponentialRampToValueAtTime(end, t + duration);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(this._volume * 0.03, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0005, t + duration);

      osc.start(t);
      osc.stop(t + duration + 0.02);
    });
  }

  // Sonidos cortos de feedback para acciones de la interfaz (no son notificaciones).
  playAction(name = "click") {
    if (!this._enabled) return;
    if (!microInteraccionesActivas()) return;

    const now = Date.now();
    const last = this._lastPlayed["action"] || 0;
    if (now - last < 250) return;
    this._lastPlayed["action"] = now;

    if (name === "slide") {
      this._playSlide();
      return;
    }

    const tones = {
      click: [[660]],
      create: [[660, 880]],
      save: [[523, 660]],
      delete: [[330, 220]],
      copy: [[880]],
      tour: [[523, 659, 784]],
      complete: [[659, 784, 988]],
    }[name] || [[660]];

    this._playSequence(tones[0], 0.09);
  }

  configure(config = {}) {
    this._enabled = config.notifSonido !== false;
    this._volume = config.volumenNotificaciones ?? 0.5;
  }

  play(type = "info") {
    if (!this._enabled) return;

    const now = Date.now();
    const last = this._lastPlayed[type] || 0;
    if (now - last < 1000) return;
    this._lastPlayed[type] = now;

    if (this._soundFiles[type]) {
      try {
        const audio = new Audio(this._soundFiles[type]);
        audio.volume = this._volume;
        audio.play().catch(() => {});
        return;
      } catch {}
    }

    this._generateTone(type);
  }

  registerSound(type, url) {
    this._soundFiles[type] = url;
  }

  setEnabled(enabled) {
    this._enabled = enabled;
  }

  setVolume(volume) {
    this._volume = Math.max(0, Math.min(1, volume));
  }
}

export const soundSystem = new SoundSystem();
