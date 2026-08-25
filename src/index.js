import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

// Importar estilos globales
import "./styles/globals.css";

// Fuentes locales (sin dependencia de Google Fonts ni red externa)
import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/500.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";
import "@fontsource/montserrat/800.css";

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
