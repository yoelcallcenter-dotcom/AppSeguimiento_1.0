# Arquitectura v1.0 - Seguimiento de Derivaciones

## 1. PROPOSITO GENERAL
Aplicacion web progresiva (PWA) para operadores de call center que gestionan casos de accidentes laborales (ART). Permite el seguimiento de prospectos desde el ingreso hasta la firma de indemnizacion, con herramientas de organizacion visual, reportes, estadisticas y configuracion avanzada, todo almacenado localmente en el navegador (IndexedDB via Dexie) sin dependencia de servidores externos.

## 2. TECNOLOGIAS Y DEPENDENCIAS
- React 18 con hooks y contextos
- Lucide React (v0.263.0) para iconos
- DOMPurify para sanitizacion de inputs
- CSS Modules + variables CSS nativas para temas
- Tailwind CSS (solo utilidades de layout)
- Dexie.js para IndexedDB
- Sin dependencias de Google (Drive, Calendar, APIs)

## 3. SISTEMA DE DISENO (PALETAS Y TIPOGRAFIA)

### 3.1 Tipografia
Familia principal: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

Tamanos base (variables CSS):
--font-size-base: 16px;
--font-size-xs: 0.65rem;
--font-size-sm: 0.75rem;
--font-size-md: 0.875rem;
--font-size-lg: 1rem;
--font-size-xl: 1.125rem;
--font-size-2xl: 1.25rem;
--font-size-3xl: 1.5rem;
--font-size-4xl: 2rem;

### 3.2 Paleta de colores base (modo oscuro por defecto)
--color-bg: #0f172a (Fondo principal)
--color-surface: #111827 (Superficie de cards/paneles)
--color-surface2: #1e293b (Superficie secundaria)
--color-surface3: #0f172a (Fondo de tablas)
--color-text: #e5e7eb (Texto principal)
--color-text-secondary: #94a3b8 (Texto secundario)
--color-text-muted: #6b7385 (Texto deshabilitado)
--color-border: #334155 (Bordes)
--color-border-light: #475569 (Bordes claros)
--color-accent: #FFBF00 (Acento - amarillo dorado)
--color-primary: #2563eb (Azul primario)
--color-secondary: #64748b (Gris secundario)
--color-success: #10b981 (Verde exito)
--color-danger: #ef4444 (Rojo error)
--color-warning: #f59e0b (Ambar advertencia)
--color-shadow: rgba(0,0,0,0.4) (Sombras)
--color-scrollbar: #334155 (Scrollbar)
--color-scrollbar-hover: #475569 (Scrollbar hover)

### 3.3 Modo claro
Se sobrescriben en [data-theme="light"] con valores invertidos (fondos claros, texto oscuro).

### 3.4 Colores por estado
Cada estado tiene color especifico via --color-estado-<estado>, gestionado por themeManager.

## 4. ARQUITECTURA DE CARPETAS (src/)
```
src/
+-- core/
|   +-- storage/
|   |   +-- storageManager.js
|   |   +-- localStorageAdapter.js
|   |   +-- casesDB.js (Dexie/IndexedDB)
|   +-- theme/
|   |   +-- themeManager.js
|   |   +-- themeTokens.js
|   +-- notes/
|   |   +-- notesManager.js
|   +-- cases/
|       +-- casesManager.js
+-- context/
|   +-- FontSizeContext.jsx
|   +-- ThemeContext.jsx
|   +-- FiltersContext.jsx
|   +-- CalendarContext.jsx
+-- hooks/
|   +-- useTheme.js, useFontSize.js, useStorage.js
|   +-- useBlocNotas.js, useAdvancedSearch.js
|   +-- useDebounce.js, useKeyboardShortcuts.js
|   +-- useCases.js (Dexie hook)
+-- services/
|   +-- StorageService.js
|   +-- EstudioService.js
+-- utils/
|   +-- constants.js, helpers.js, dateUtils.js
|   +-- sanitize.js, dateFilters.js, exportPDF.js
|   +-- notifications.js, backup/
|   +-- autodiagnostico/
|       +-- indexedDB.js, reportError.js, watchdog.js, validateData.js
+-- validators/
+-- components/
|   +-- common/ (Btn, Select, TextInput, TextArea, OverlayPanel, BlocNotas, etc.)
|   +-- calendar/ (CalendarView, CalendarEventModal)
|   +-- kanban/ (KanbanView, PipelineBar, CasoCard)
|   +-- tabla/ (TablaView)
|   +-- reportes/ (ReportesView)
|   +-- estadisticas/ (DashboardStats, LogroObjetivos, VistaMapa, etc.)
|   +-- utiles/ (UtilesView, SpeechsView, MapeoView, LesionesView, etc.)
|   +-- modales/ (VerCasoModal, CasoEditModal, ReporteRapidoModal)
|   +-- configuracion/ (ConfiguracionView, PersonalizacionColores, SystemLogs)
|   +-- ayuda/ (HelpPanel, FAQ, Glosario, FeedbackForm, TourInteractivo, etc.)
|   +-- ErrorBoundary.jsx
+-- styles/
|   +-- globals.css
+-- App.jsx
+-- index.js
```

## 5. FUNCIONALIDADES PRINCIPALES

### 5.1 Gestion de Casos (CRUD)
Creacion, edicion, eliminacion (doble confirmacion), cambio de estado por arrastre (Kanban) o selector. Almacenamiento via Dexie/IndexedDB.

### 5.2 Vistas Principales
Kanban, Tabla, Reportes, Estadisticas.

### 5.3 Utiles
Speechs, Objeciones, Conversaciones Sugeridas (con reemplazo de {OPERADOR}), Aseguradoras, Lesiones, Pasos, Tips, Links, Estudios Juridicos (Mapeo).

### 5.4 Configuracion
General, Apariencia (temas, colores), Columnas, Datos (backup), Diagnostico (SystemLogs).

### 5.5 Autodiagnostico
Sistema de monitoreo de errores con ErrorBoundary, reportError, watchdog y validador de datos.

### 5.6 Calendario Interno
Vista mensual, creacion/edicion de eventos, notificaciones, persistencia en IndexedDB.

## 6. ALMACENAMIENTO
- IndexedDB via Dexie para casos (tabla `cases`)
- localStorage para configuracion, utiles, notas y preferencias
- Backup manual en CSV (casos) y JSON (configuracion)

## 7. FILTROS GLOBALES
Contexto FiltersContext para mes/ano global.

## 8. SISTEMA DE NOTIFICACIONES

### 8.1 Arquitectura

El sistema sigue un patrón event-driven con 4 capas:

```
Evento App → EventBus → NotificationManager → RuleEngine
                                                   ↓
NotificationStore ← NotificationManager ← decide sí/no
      ↓                        ↓
  UI Layer               SoundSystem
  (Toast, Centro,        (Web Audio API)
   Campana, Alertas)
```

### 8.2 Capas

- **EventBus** (`src/core/events/eventBus.js`): Pub-sub centralizado con `emit()`, `on()`, `off()`. Define eventos tipados como `AppEvents.CASE_CREATED`, `AppEvents.ERROR_OCCURRED`.
- **RuleEngine** (`src/core/notifications/ruleEngine.js`): Deduplicación (ventana 2s), agrupación por source/title (ventana 5s), priorización (critical siempre, low configurable).
- **SoundSystem** (`src/core/notifications/soundSystem.js`): Reproduce tonos generados con Web Audio API (sin archivos .mp3 externos). Frecuencias por tipo (success: 880Hz, error: 220Hz, critical: 180Hz). Respeta config `notifSonido` y `volumenNotificaciones`.
- **NotificationManager** (`src/core/notifications/notificationManager.js`): Orquestador singleton. Se suscribe a todos los eventos de app en `init()`. Expone `notify()` para uso programático.
- **NotificationStore** (`src/core/notifications/notificationStore.js`): Zustand store con persistencia en localStorage (`app_notification_center`, cap 200). Estado: `notifications[]`, `toastQueue[]`, `persistentAlerts[]`, `showCenter`, `showBellDropdown`.

### 8.3 UI Components

- **ToastContainer**: Renderiza `toastQueue` desde el store. Auto-dismiss (4s normal, 8s critical). Posición fixed bottom-right.
- **NotificationBell**: Ícono de campana en header con badge de no leídas. Dropdown con últimas 5 + acciones (marcar leído, limpiar, ver todas).
- **NotificationCenter**: Panel lateral (slide-in derecho) con historial completo, filtros por tipo/estado, marcar leído/eliminar individual.
- **PersistentAlert**: Banner fijo superior para errores/advertencias críticas (sticky, requiere acción del usuario).
- **useNotify hook**: `useNotify()` expone `notify()`, `success()`, `error()`, `warning()`, `info()`.

### 8.4 Configuración
- `notifInApp`: toggles Toast y Centro de Notificaciones
- `notifSonido`: toggles SoundSystem
- `notifEscritorio`: toggles Browser Notification API
- `notifCambioEstado`, `notifReporte`, `notifEvento`, `notifBackup`, `notifError`: filtros por tipo
- `notifFrecuencia`: agrupación temporal
- `modoNoMolestar`: silencia todo
- `sonidoNotificaciones`: legacy, mapeado a `notifSonido`
- `volumenNotificaciones`: 0.0 a 1.0

### 8.5 Migración desde sistema legacy
El servicio anterior `notificationService` (`src/utils/notifications.js`) sigue funcionando para compatibilidad. El nuevo sistema convive sin conflictos. Se recomienda migrar llamadas a `notificationService.show()` hacia `notificationManager.notify()` o `eventBus.emit()` progresivamente.

## 9. INTERACCIONES Y UX
Overlays fullscreen (Config, Ayuda, Calendario, BlocNotas). Modales para edicion. Confirmacion en acciones destructivas. Atajos de teclado.

## 10. CALIDAD Y RENDIMIENTO
Componentes funcionales, memorizacion (React.memo, useMemo, useCallback), debounce en busqueda, paginacion, manejo de errores robusto.
