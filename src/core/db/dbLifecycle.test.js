import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupDexieLifecycle } from './dbLifecycle';

describe('setupDexieLifecycle', () => {
  let mockDb;

  beforeEach(() => {
    mockDb = {
      on: vi.fn(),
      close: vi.fn(),
    };
    vi.restoreAllMocks();
  });

  it('registra handler blocked', () => {
    setupDexieLifecycle(mockDb, { name: 'test' });
    expect(mockDb.on).toHaveBeenCalledWith('blocked', expect.any(Function));
  });

  it('registra handler versionchange', () => {
    setupDexieLifecycle(mockDb, { name: 'test' });
    expect(mockDb.on).toHaveBeenCalledWith('versionchange', expect.any(Function));
  });

  it('blocked cierra la conexión', () => {
    setupDexieLifecycle(mockDb, { name: 'test' });
    const blockedHandler = mockDb.on.mock.calls.find((c) => c[0] === 'blocked')[1];
    blockedHandler();
    expect(mockDb.close).toHaveBeenCalled();
  });

  it('versionchange cierra la conexión', () => {
    setupDexieLifecycle(mockDb, { name: 'test' });
    const versionChangeHandler = mockDb.on.mock.calls.find((c) => c[0] === 'versionchange')[1];
    versionChangeHandler();
    expect(mockDb.close).toHaveBeenCalled();
  });
});
