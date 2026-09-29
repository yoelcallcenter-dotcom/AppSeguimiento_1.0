import { describe, it, expect } from 'vitest';
import config from '../../tailwind.config';

describe('tailwind.config (1.9.3)', () => {
  it('define el breakpoint xs para que las labels del header se muestren desde 480px', () => {
    expect(config.theme.extend.screens.xs).toBe('480px');
  });

  it('conserva las breakpoints por defecto de Tailwind', () => {
    expect(config.theme.extend.screens.sm).toBeUndefined();
    expect(config.screens).toBeUndefined();
  });
});
