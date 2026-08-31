import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

// Importar estilos globales
import "./styles/globals.css";

// Inicializar sistema de tipografía (aplica preset + tamaño antes del primer
// render para evitar flash de fuente; no bloquea la app).
import { typographyManager } from "./core/typography/typographyManager";
typographyManager.init();

// Inicializar sistema de notificaciones
import { notificationService } from "./utils/notifications";
notificationService.init();

// Inicializar sistema de autodiagnóstico
import { setupGlobalErrorListeners } from "./core/error/reportError";
import { startWatchdog } from "./core/monitoring/watchdog";
setupGlobalErrorListeners();
startWatchdog();

// Registrar service worker (solo en producción) para operar offline / PWA.
// La detección de actualizaciones y el aviso al usuario se manejan en App.jsx.
import { registerPWA } from "./pwa/pwa";
registerPWA();

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
