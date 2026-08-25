/* =============================================================
 * Service Worker — AppSeguimiento
 * PWA offline-first + auto-update (refresco controlado).
 *
 * Estrategias:
 *  - Precache en install: app shell (index.html) + todos los
 *    assets hasheados listados en asset-manifest.json (emitido
 *    por react-scripts build) + manifest e iconos.
 *  - Navegaciones (HTML): network-first con fallback a la shell.
 *  - JS/CSS estáticos: cache-first con relleno bajo demanda.
 *  - Íconos/fonts: cache-first.
 *  - Otros (misma/mixta): cache-first con fallback a red.
 *
 * Auto-update: el SW se instala y se activa con skipWaiting +
 * clients.claim(). El cliente detecta la nueva versión vía
 * "updatefound" y ofrece recargar con un aviso (refresco
 * controlado). El mensaje SKIP_WAITING fuerza el salto de la
 * cola de espera para versiones intermedias.
 * ============================================================= */

const CACHE = "appseguimiento-v6";
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./icons/apple-touch-icon.png",
];

/* Precache robusto: descarga el manifiesto de assets de CRA y
 * agrega a la caché todos los archivos (sin fallar el install
 * si alguno no se puede bajar). */
async function precacheAppShell() {
  const cache = await caches.open(CACHE);
  const urls = new Set(PRECACHE_URLS);

  try {
    const manifest = await fetch("./asset-manifest.json");
    if (manifest.ok) {
      const data = await manifest.json();
      Object.keys(data.files || {}).forEach((key) => {
        urls.add(data.files[key]);
      });
    }
  } catch (error) {
    console.error("[SW] No se pudo precachear asset-manifest.json:", error);
  }

  await Promise.all(
    Array.from(urls).map(async (url) => {
      try {
        const response = await fetch(url, { cache: "no-cache" });
        if (response && response.ok) {
          await cache.put(url, response);
        }
      } catch (error) {
        console.warn(`[SW] No se pudo precachear: ${url}`, error);
      }
    })
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    precacheAppShell()
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error("[SW] Instalación con errores:", error);
        self.skipWaiting();
      })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

/* Mensajes del cliente */
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

/* Redirección: si la app se abrió por una URL alternativa
 * (por ejemplo tras un deploy), redirigir a la raíz para que
 * la navegación SPA funcione offline. */
function isNavigationRequest(request) {
  return (
    request.mode === "navigate" ||
    (request.method === "GET" &&
      request.headers.get("accept") &&
      request.headers.get("accept").includes("text/html"))
  );
}

async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    const copy = response.clone();
    const cache = await caches.open(CACHE);
    await cache.put(request.url, copy);
    return response;
  } catch (error) {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    const fallback = await cache.match("./index.html");
    if (fallback) return fallback;
    // Último recurso: una página offline estática.
    return new Response("Sin conexión", { status: 503, headers: { "Content-Type": "text/plain" } });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navegaciones: network-first con fallback a la shell.
  if (isNavigationRequest(request)) {
    event.respondWith(handleNavigation(request));
    return;
  }

  // Estáticos (JS/CSS/íconos/fonts): cache-first con relleno bajo demanda.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
