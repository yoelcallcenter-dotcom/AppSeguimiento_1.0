/**
 * Setup de Vitest.
 * - Instala IndexedDB (fake-indexeddb) para testear módulos Dexie en Node.
 * - Poli-fill de localStorage para entornos que no lo implementan.
 * - Poli-fill en memoria de BroadcastChannel para testear syncService.
 */
import 'fake-indexeddb/auto';

// Poli-fill mínimo de localStorage por si el entorno no lo provee (node puro).
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(String(k), String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    key: (i) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
}

// Poli-fill de BroadcastChannel: entrega los mensajes de forma asíncrona a
// todos los canales con el mismo nombre (excepto al emisor).
class MockBroadcastChannel {
  static instances = [];

  constructor(name) {
    this.name = name;
    this.onmessage = null;
    MockBroadcastChannel.instances.push(this);
  }

  postMessage(data) {
    MockBroadcastChannel.instances
      .filter((i) => i !== this && i.name === this.name)
      .forEach((i) => {
        queueMicrotask(() => {
          if (typeof i.onmessage === 'function') i.onmessage({ data });
        });
      });
  }

  close() {
    MockBroadcastChannel.instances = MockBroadcastChannel.instances.filter(
      (i) => i !== this
    );
  }

  static reset() {
    MockBroadcastChannel.instances = [];
  }
}

if (typeof globalThis.BroadcastChannel === 'undefined') {
  globalThis.BroadcastChannel = MockBroadcastChannel;
}
