import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { soundSystem } from './soundSystem';

/**
 * Tests 1.10.1 (T18a): el default de notifSonido estaba invertido entre
 * soundSystem (`_enabled = notifSonido !== false` → ON por defecto) y
 * ruleEngine.shouldPlaySound (`notifSonido !== true` → OFF por defecto).
 * Se unifica el default en false: sin notifSonido explícito no suena.
 */
describe('soundSystem · T18a (1.10.1): default unificado notifSonido=false', () => {
  let spy;

  beforeEach(() => {
    // Tipo sin rate-limit previo: play() descarta llamadas repetidas en 1 s
    // por tipo, así que cada test usa uno distinto.
    spy = vi.spyOn(soundSystem, '_generateTone');
  });

  afterEach(() => {
    spy.mockRestore();
  });

  it('con notifSonido=false no reproduce', () => {
    soundSystem.configure({ notifSonido: false });
    soundSystem.play('error');
    expect(spy).not.toHaveBeenCalled();
  });

  it('con la clave ausente (config vacía) tampoco reproduce: default OFF unificado', () => {
    // Antes del fix quedaba habilitado (notifSonido !== false → true) y el
    // sonido dependía solo de que el gate de ruleEngine no lo frenara.
    soundSystem.configure({});
    soundSystem.play('warning');
    expect(spy).not.toHaveBeenCalled();
  });

  it('con notifSonido=true sí reproduce', () => {
    soundSystem.configure({ notifSonido: true, volumenNotificaciones: 0.5 });
    soundSystem.play('type-sound-on');
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
