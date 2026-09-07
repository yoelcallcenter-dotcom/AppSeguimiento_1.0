/**
 * docsContent.js
 * ARCHIVO GENERADO AUTOMÁTICAMENTE por scripts/build-docs.js.
 * No editar a mano: se regenera en cada `npm start` / `npm run build`.
 * Las vistas de documentación importan estos contenidos desde src/docs,
 * por lo que siempre muestran los archivos correspondientes de src/docs/.
 */

export const DOC_README = `# AppSeguimiento

**Versión 1.6.8** — Sistema de gestión de casos ART (aseguradoras de riesgo de trabajo) para seguimiento de derivaciones, diseñado para operadores de call center. Aplicación **offline-first / PWA** con datos 100% locales.

## Stack tecnológico

- **React 18** (Create React App / react-scripts 5)
- **Zustand 5** — estado global
- **Dexie 4 / IndexedDB** — persistencia local (casos, notas, eventos, backups)
- **Tailwind CSS 3** + CSS variables (theming completo)
- **Recharts** — gráficos del dashboard
- **Tiptap** — editor de notas enriquecido
- **lucide-react** — íconos
- **Fuse.js** — búsqueda difusa
- **DOMPurify** — sanitización de HTML
- **Vitest** + jsdom + fake-indexeddb — testing

## Características principales

### Mi Espacio (personal)
- Abre siempre en Mi Espacio, con bienvenida destacada y saludos según día y hora.
- Perfil del operador: nombre, rol, empresa, localidad, contacto y jornada habitual.
- Resumen de la jornada, disponibilidad (vacaciones, feriados, inasistencias) y metas personales diarias/mensuales con ritmo necesario.
- Accesos y credenciales personales (solo locales, nunca se exportan).

### Gestión de Casos
- **Kanban**: arrastrar casos entre estados (Cita virtual, No responde, Firmo, etc.).
- **Tabla**: ordenar, filtrar y seleccionar casos con columnas personalizables.
- **Reportes**: historial completo de reportes por caso.
- **Calendario**: eventos vinculados a casos, reprogramación y citas.
- **Bloc de Notas**: notas enriquecidas (Tiptap) con vínculo a casos.
- **Búsqueda global** (\`GlobalSearch\`): búsqueda en tiempo real por nombre, teléfono, localidad, \`#etiquetas\` y \`@comentarios\`.

### Estadísticas y Analítica
- Dashboard multi-pestaña (Analítica, Resumen, Rendimiento, Geografía, Estudios, Estados).
- KPIs, insights automáticos, distribución por estado/categoría, tendencia 30 días, barras apiladas, tipos de ingreso y evolución.
- Logro de objetivos, funnel de conversión, mapa por localidad, próximos eventos.
- Pestañas, widgets y métricas configurables.

### Útiles
- **Speechs**: guiones predefinidos con copia al portapapeles y edición directa.
- **Objeciones**, **Conversaciones Sugeridas** (con variables \`{OPERADOR}\`), **Aseguradoras** (ART y Tránsito), **Lesiones**, **Pasos a Seguir**, **Tips**, **Links útiles**.
- **Estudios Jurídicos**: mapeo por localidad con filtros y condicionales agrupados por estudio.

### Ayuda y Tours
- Tour interactivo completo que recorre todas las funcionalidades.
- Acerca de Vistas, FAQ, Glosario, Guía de Usuario y guía imprimible (PDF/TXT).

### Personalización
- Temas: Oscuro, Claro o Personalizado.
- Tamaño de fuente: Pequeño, Mediano o Grande.
- Colores base (Primario, Secundario, Terciario) que generan toda la paleta, y colores por estado de caso.

### Almacenamiento y Backup
- Todo se guarda localmente en el navegador (IndexedDB vía Dexie).
- Backup completo: exportar/importar datos (casos, notas, eventos, configuración) en JSON, con auto-backups y migración de esquema.
- Funciona completamente sin conexión.

## Sistema de Notificaciones

### Arquitectura

\`\`\`
src/core/events/
└── eventBus.js             # Pub-sub centralizado (emit/on/off)

src/core/notifications/
├── notificationStore.js    # Zustand store global de notificaciones
├── notificationManager.js  # Orquestador: recibe eventos, decide qué notificar
├── ruleEngine.js           # Motor: dedup, agrupación, prioridad
├── actionFeedback.js       # Catálogo de acciones de feedback (copiar, crear, guardar…)
└── soundSystem.js          # Motor de sonido (Web Audio API)

src/components/notifications/
├── ToastContainer.jsx      # Toasts efímeros (auto-dismiss)
├── NotificationBell.jsx    # Campana con badge + dropdown
├── NotificationCenter.jsx  # Panel lateral con historial completo + filtros
└── PersistentAlert.jsx     # Alertas persistentes (warning/error)
\`\`\`

### Flujo de Datos

1. **Evento de app** → \`eventBus.emit(AppEvents.XXX, data)\`
2. **NotificationManager** recibe el evento, lo normaliza y evalúa con RuleEngine.
3. **RuleEngine** decide: ¿es duplicado? ¿se agrupa? ¿modo no molestar?
4. **NotificationStore** guarda la notificación (estado + localStorage).
5. **SoundSystem** reproduce sonido si está habilitado.
6. **ToastContainer** renderiza toast si notificaciones in-app están activas.
7. **NotificationBell** actualiza el badge de no leídas.
8. **NotificationCenter** muestra el historial persistente.

Prioridades: **BAJA** (Centro, sin toast, sin sonido) · **MEDIA** (Centro + toast, sin sonido) · **ALTA/GRAVE** (Centro + toast + sonido). Deduplicación por \`eventKey\`.

### Uso desde componentes

\`\`\`jsx
import { useNotify } from '../../hooks/useNotify';

function MiComponente() {
  const { notify, success, error, warning, info } = useNotify();

  const handleClick = () => {
    success('Operación exitosa', 'Los datos se guardaron correctamente');
  };
}
\`\`\`

### Uso desde cualquier lugar (sin hook)

\`\`\`js
import { notificationManager } from '../../core/notifications/notificationManager';

notificationManager.notify({
  type: 'error',
  title: 'Error de sincronización',
  message: 'No se pudieron guardar los datos',
  priority: 'high',
});
\`\`\`

### Configuración y persistencia

- Se gestiona en **Configuración → Notificaciones**: canales (In-App, Sonido), tipos, frecuencia de agrupación y modo No molestar.
- Las notificaciones se almacenan en localStorage bajo \`app_notification_center\` (límite 200) y sobreviven a recargas.

## Sistema de Temas

Centralizado en \`src/core/theme/\` con arquitectura de tokens:

\`\`\`
src/core/theme/
├── themeTokens.js       # Tokens de color (dark/light) + mapeo a CSS vars
├── themeManager.js      # Singleton que aplica temas y persiste en localStorage
└── colorUtils.js        # Utilidades de color (mezcla, generación de paletas)
\`\`\`

\`themeManager.init()\` carga el tema guardado y aplica cada valor como CSS variable en \`<html>\`. Para tema personalizado, los colores base pasan por \`generatePalette()\` para generar la paleta completa.

**Variables clave**: \`--color-bg\`, \`--color-surface\`, \`--color-surface2\`, \`--color-text\`, \`--color-text-muted\`, \`--color-accent\`, \`--color-border\`, \`--color-primary\`, \`--color-secondary\`, \`--color-success\`, \`--color-warning\`, \`--color-danger\`, \`--color-estado-*\` (por estado de caso).

**Sistema de botones** (\`src/components/common/Btn.jsx\`): \`Btn\` con variantes \`solid\`, \`outline\`, \`ghost\`, y atajos \`PrimaryButton\`, \`SecondaryButton\`, \`OutlineButton\`. Tamaños \`sm\`/\`md\`/\`lg\`; estados hover (lift + opacity), active (press), disabled y focus-visible (ring).

## Estructura de la UI

\`\`\`
src/
├── components/
│   ├── common/           # Btn, Modal, ConfirmDialog, EmptyState, Spinner, Skeleton,
│   │                     # OverlayPanel, Paginacion,
│   │                     # DayFilter, MonthDayFilterBar, etc.
│   ├── notifications/    # NotificationBell, NotificationCenter, PersistentAlert, ToastContainer
│   ├── kanban/ tabla/ reportes/ estadisticas/ modales/ calendar/ entities/
│   ├── configuracion/ utiles/ ayuda/ diagnostico/
├── core/
│   ├── theme/            # themeTokens, themeManager, colorUtils
│   ├── store/            # useAppStore (Zustand global)
│   ├── db/               # appDB, casesDB, indexedDB, versioning, dbLifecycle
│   ├── notifications/    # notificationStore/Manager/RuleEngine, actionFeedback, soundSystem
│   ├── events/           # eventBus pub-sub
│   ├── sync/             # sincronización entre pestañas (BroadcastChannel)
│   ├── alerts/ rules/ integrity/ entities/ cases/ status/ i18n/ error/ monitoring/ storage/
├── context/              # ThemeContext, FiltersContext, CalendarContext, UXContext, etc.
├── hooks/                # useModal, useDialogA11y, useViewTransition, useDebounce,
│                         # useKeyboardShortcuts, useNotify, useCalendar, etc.
├── features/             # dashboard, operator ("Mi Espacio"), calendar, notes, search, export
├── services/             # backupService, autoBackup, EstudioService, StorageService
├── utils/                # backups/, csvUtils, csvParse, exportPDF, searchEngine, etc.
├── styles/globals.css    # CSS global con variables, temas, utilidades y animaciones
└── test/                 # Suite de tests (Vitest + jsdom + fake-indexeddb)
\`\`\`

## Comandos

| Comando | Qué hace |
|---|---|
| \`npm install\` | Instala dependencias |
| \`npm start\` | Dev server (regenera docs) |
| \`npm run build\` | Build de producción a \`build/\` |
| \`npm run test:run\` | Suite completa con Vitest (una pasada) |
| \`npm run test\` | Vitest en modo watch |
| \`npx vitest run <archivo>\` | Un solo archivo de test |

## Atajos de Teclado

| Atajo | Acción |
|-------|--------|
| \`Ctrl + N\` | Nuevo caso |
| \`Ctrl + R\` | Cargar reporte |
| \`Ctrl + F\` | Buscar casos |
| \`Ctrl + S\` | Guardar datos |
| \`Ctrl + D\` | Duplicar caso |
| \`Ctrl + E\` | Exportar seleccionados |
| \`Ctrl + H\` | Abrir ayuda |
| \`Ctrl + K\` | Búsqueda global |
| \`Ctrl + 1-5\` | Cambiar vista |
| \`Escape\` | Cerrar modal |

---

## PWA: Instalación y uso offline

La aplicación es una **Progressive Web App (PWA)**: se instala como una app nativa,
funciona **sin conexión** y se **actualiza sola** cuando hay una nueva versión.

### Cómo instalar en PC (Windows/Linux)

1. Abrí la app en **Chrome** o **Edge** (servida por **HTTPS**).
2. Hacé click en el botón **"Instalar"** que aparece en la barra superior.
3. Confirmá en el diálogo del navegador. Queda un acceso en el escritorio o el menú de inicio.

> También podés usar el menú del navegador → **"Instalar AppSeguimiento"**.

### Cómo instalar en celular (Android)

1. Abrí la app en Chrome.
2. Tocá **"Instalar"** en la barra superior, o el menú ⋮ → **"Agregar a pantalla de inicio"**.
3. Confirmá. El icono queda en la pantalla de inicio y abre a pantalla completa.

### Cómo instalar en iPhone/iPad (iOS)

1. Abrí la app en **Safari**.
2. Tocá el botón **Compartir** → **"Agregar a pantalla de inicio"** y confirmá.
3. La app abre a pantalla completa desde el icono.

### Actualizaciones y uso offline

- La app detecta automáticamente una nueva versión y ofrece **"Nueva versión disponible"** con botón **Actualizar**.
- Podés ignorarlo y seguir trabajando; se vuelve a ofrecer la próxima vez.
- Los datos nunca se pierden: se guardan localmente (IndexedDB).
- Una vez cargada, la app **funciona completamente sin conexión**. El banner de estado muestra si estás en línea / sin conexión.

### Shortcuts (íconos de acción rápida)

Al instalar en Android se agregan accesos directos: **Panel principal** y **Nuevo caso**.

---

## Deploy

### Vercel

\`\`\`bash
npm run build
# Build command: npm run build
# Output directory: build
# Framework preset: Create React App
\`\`\`

### Netlify

\`\`\`bash
npm run build
# Public directory: build
# Build command: npm run build
# SPA fallback: /*  →  /index.html
\`\`\`

### Servidor propio (Nginx / Caddy / host estático)

\`\`\`bash
npm run build
# Subí el contenido de /build
\`\`\`

**Importante para la PWA:**
- Servir por **HTTPS** (o localhost) — obligatorio para service workers.
- Configurar el servidor para que \`asset-manifest.json\` y \`sw.js\` no se cacheaden de forma agresiva (\`Cache-Control: no-cache\`).
- Para Vercel/Netlify no hace falta nada extra.

### Probar localmente

\`\`\`bash
npm run build
npx serve -s build      # o: npm run preview
# Abrir http://localhost:5000
\`\`\`

El service worker solo se activa en el build de producción (\`npm run build\`).

---

## Documentación

- **Changelog**: todas las novedades desde 1.6.0 en adelante en \`src/docs/CHANGELOG.md\` (y su copia \`public/docs/CHANGELOG.md\`).
- **Contexto técnico del proyecto**: \`PROJECT_CONTEXT.md\` (arquitectura, comandos, gestión de datos y versiones).
`;

export const DOC_CHANGELOG = `# Changelog

Todas las novedades, correcciones y mejoras de AppSeguimiento (antes "Seguimiento de Derivaciones").

Nomenclatura de versiones:
- 1.0.0 — Release principal
- 1.0.x — Bug fixes y cambios de UI sin alterar funciones
- 1.x.0 — Funciones nuevas o correcciones graves

## [1.6.8] - Auditoría final, QA y estabilización

### Eliminación de código muerto (FASE 1)

- Eliminados 11 archivos sin uso en producción: \`common/Input.jsx\` (reemplazado por \`TextInput\`), \`common/EditableForm.jsx\` (+ su test), \`common/ShortcutsHelp.jsx\`, \`common/SelectorTema.jsx\`, \`common/ModoNoMolestar.jsx\`, \`common/BlocNotas.jsx\`, \`common/Card.jsx\`, \`common/NoteList.jsx\`, \`common/NoteCard.jsx\`, el hook \`hooks/useBlocNotas.js\` y toda la carpeta \`components/notes/\` (supersedida por \`features/notes/\`).

### Paleta de gráficos centralizada (FASE 2)

- Nuevos tokens CSS \`--chart-color-*\` en \`globals.css\` (cases, signed, contact, danger, warning, success, danger-light, conversion, muted, orange, rose, cursor + fondos de severidad).
- Migrados a los tokens: \`KPICards\`, \`ProvinceBars\`, \`TypeBars\`, \`StudyBars\`, \`StackedBars\`, \`WeeklyTrend\`, \`TimeMetrics\`, \`ConversionBars\`, \`AlertsPanel\`, \`InsightsPanel\`, \`CaseDistribution\` y \`computeMetrics\` (~70 valores hex/rgba).
- Corregida inconsistencia de paleta en \`computeMetrics\` (\`#FB923C\` → \`--chart-color-orange\`, alineado con los widgets).

### Reporte de errores consolidado (FASE 3)

- Los \`console.warn\`/\`console.error\` de flujos de producción en \`App.jsx\`, \`InlineEventForm\`, \`InlineNoteForm\`, \`caseHistory\`, \`CalendarContext\`, \`backupManager\` y \`typographyManager\` migran al sistema centralizado \`reportError()\` (con \`silent: true\` donde el usuario ya está notificado o la degradación es esperada).
- Se conservan los logs intencionales: \`TourContext\` (flujo esperado del tour), \`dbLifecycle\` (detalles de multipestaña) y el fallback de \`reportError\` mismo.

### Documentación actualizada (FASE 4)

- Tour interactivo: corregidos los contadores (13/14 → 17 pasos) en \`ComoUsarView\` y \`guideData\`.
- README: atajos \`Ctrl + 1-7\` → \`Ctrl + 1-5\` (coherente con \`AtajosTeclado\`); eliminadas referencias a componentes eliminados (\`ShortcutsHelp\`, \`EditableForm\`, \`components/notes/\`) en el árbol de estructura.
- \`EjemplosCasos\`: badge de tags migrado de \`text-[9px]\` a \`text-ds-xs\` (pendiente de 1.6.7).

### Versionado (FASE 5)

- Bump a **1.6.8** en \`package.json\`, \`package-lock.json\`, \`src/core/version.js\` y los tres README. \`PROJECT_CONTEXT.md\` actualizado (versión, baseline, historial y árbol de componentes).

### Verificación (FASE 6)

- Suite completa de tests (Vitest) y build de producción sin errores.

## [1.6.7] - Accesibilidad, Responsive y robustez

### Formularios accesibles (FASE 1)

- \`Field\`: asocia el \`<label>\` con su control mediante \`htmlFor\`/\`id\`, con id único generado con \`useId()\` (o \`id\` explícito opcional). Asociados los labels de \`EventModal\`, \`CsvExportModal\` y \`FeedbackForm\`; \`Select\` propaga \`id\`.
- \`Modal\` expone \`aria-labelledby\` hacia el título (id generado con \`useId()\`).

### Modales (FASE 2)

- \`CasoEditModal\`, \`VerCasoModal\` y \`ReporteRapidoModal\`: cierre con Escape y bloqueo de scroll de fondo, sin depender del setup global del wrapper \`Modal\`.

### Operables por teclado (FASE 3)

- Nuevo helper \`src/utils/a11y.js\` (\`onKeyActivate\`/\`accessibleClickProps\`): Enter/Espacio activan acciones en elementos no nativos.
- Aplicado en filas y encabezados ordenables de \`TablaView\`, celdas y chips de \`CalendarView\`, segmentos de \`PipelineBar\`, artículos de dashboard/notas/speechs, drop zone de \`CSVImporter\` (convertida en \`<label>\`) y resaltados de \`VerCasoModal\`.

### ARIA (FASE 4)

- Errores de formulario anunciados con \`role="alert"\` + \`aria-live\` (\`CasoEditModal\`, \`EditableForm\`, \`EventModal\`).
- Estado de controles con \`aria-pressed\` (prioridad del evento, estados de exportación CSV, toggles de exportación PDF, filtros de \`PipelineBar\`).
- Colapsables de \`VerCasoModal\` con \`aria-expanded\`; búsqueda global como \`role="dialog"\` + \`aria-modal\`.
- Tablas con \`aria-label\`, \`scope="col"\`, \`aria-sort\` y checkboxes con \`aria-label\`; botones de solo ícono con \`aria-label\`.

### Contraste (FASE 5)

- \`--text-muted\` ajustado para contraste: \`#B0B8C4\` en oscuro y \`#5B6370\` en claro; los textos sobre fondo accent usan \`--text-on-accent\`.

### Tipografía (FASE 6)

- Migrados los \`text-[9px]\` visibles a \`text-ds-xs\` (12px) y los \`fontSize\` inline sueltos a tokens del Design System (\`--font-size-ds-xs\`, \`--font-size-ds-sm\`, \`--fs-title\`).
- Se conservan los badges/pills decorativos y el calendario mensual denso para no romper el layout.

### Responsive y robustez (FASE 7 y 8)

- \`SmartTable\`: contenedor con \`overflow-x-auto\` (la tabla ya no se recorta en pantallas angostas) y empty state con \`EmptyState\` cuando no hay datos.
- Kanban: el selector de orden de columna gana área táctil mínima en \`@media (pointer: coarse)\`; \`.text-xs\` sube a \`0.7rem\` en pantallas ≤768px.
- \`ComentariosUI\`: evita renderizar "Invalid Date" con fechas inválidas.

### Tests de accesibilidad (FASE 9)

- Nueva suite \`src/test/a11y.test.jsx\` (15 tests): asociación Field label→input, Escape/ARIA del \`Modal\`, \`onKeyActivate\`, errores con \`aria-live\` y prioridad con \`aria-pressed\` en \`EventModal\`, empty state de \`SmartTable\`. Total de la suite: 506 tests.

## [1.6.6] - Optimización y rendimiento

### Persistencia y filtros (FASE 2)

- \`useStorage\`: guardado debounced 500ms (evita una escritura a localStorage por keystroke) con persistencia final al desmontar.
- \`FiltersContext\`: la búsqueda (\`searchQuery\`) se persiste con debounce de 300ms; el resto de los filtros (mes, año, día, vista) se siguen guardando de forma inmediata.

### Stores (FASE 3)

- \`Celebration\`: selectores granulares (\`active\`, \`message\`, \`pieces\`, \`dismiss\`) para no re-renderizar por cambios de otras claves del store.
- \`useAppStore\`: estabilidad de referencias en mutaciones frecuentes (\`updateCase\`, \`updateNote\`, \`updateEvent\`, \`addNote\`, \`addEvent\`). Si el dato resultante no cambió (misma referencia), el array no se recrea y los consumidores no se re-renderizan innecesariamente.

### Cálculos y consultas (FASE 5)

- \`CasoEditModal\`: chequeo de duplicado y datalists (aseguradoras y estudios) memoizados (solo se recalculan cuando cambian sus dependencias).
- \`CalendarView\`: un único \`caseMap\` (Map) reutilizado por todos los eventos (reemplaza el \`.find()\` lineal por evento), \`todayStr\` memoizado y orden/mapa de la vista lista memoizados.
- \`calendarService\`: \`checkUpcomingEvents\` ahora consulta solo los eventos de hoy por rango de fecha (antes leía la tabla completa cada 60s).
- \`metricsEngine\`: \`computeFunnel\` procesa el embudo en una sola pasada sobre los casos (pasadas O(n·m) → O(n)).

### Renderizado de listas (FASE 4)

- \`TablaView\`: fila extraída a \`TablaRow\` (React.memo); se memoizan el slice de la página, las columnas visibles y los callbacks de selección.
- \`KanbanView\`: columna extraída a \`KanbanColumn\` (React.memo); agrupación por estado y callbacks memoizados.
- \`NotificationCenter\`: item extraído a \`NotificationItem\` (React.memo) para no re-renderizar todas las notificaciones al cambiar una o el filtro.

### Carga bajo demanda (FASE 6)

- \`CaseTimeline\` (VerCasoModal), \`PdfExportModal\` (OperatorView) e \`IntegridadPanel\` (SystemLogs) ahora se cargan de forma perezosa (chunk separado) solo cuando se necesitan.

### Dashboard (FASE 8)

- Handlers estables (\`handleActivitySelect\`, \`handleNavigateToEvent\`) para los widgets; \`KPICards\`, \`InsightsPanel\`, \`ProximasAcciones\` y \`ActivityFeed\` memorizados.

### Perfilado (FASE 1)

- \`@welldone-software/why-did-you-render\` instalado como devDependency; \`src/wdyr.js\` (solo en desarrollo, conmutable por \`WDYR=0\`) vigila \`TablaRow\`, \`CasoCard\`, \`KanbanColumn\` y \`NotificationItem\`.

## [1.6.5] - Navegación fluida y coherente

### Header estable (FASE 1)

- Header multi-fila estabilizado: la franja de pestañas ya no se recalcula ni re-anima al cambiar de vista (eliminado el re-disparo de \`animate-stagger\`); las pestañas se desbordan con scroll horizontal sin romper línea (\`tab-strip\` + \`scrollbar-hide\`).
- Eliminado código muerto inalcanzable: vistas \`configuracion\` y \`como-usar\` fuera del arreglo de pestañas y su lazy import de \`ComoUsarView\`.

### Transiciones entre vistas (FASE 2)

- Nuevo \`useViewTransition\`: fondo crossfade (la vista anterior queda montada durante la transición y se desmonta al terminar), con preservación de la posición de scroll por vista y clases \`view-transition-enter\`/\`view-transition-exit\`.

### Modales y overlays unificados (FASE 3)

- Nuevo wrapper \`Modal.jsx\` + hook \`useModal\`: trampa de foco, cierre con Escape, bloqueo de scroll de fondo (ref-counted) y cierre por backdrop, con animación de entrada/salida unificada y prop \`zIndex\`.
- \`useDialogA11y\` ahora acepta \`onEscape\` y restaura el foco al desmontar.
- Migrados a comportamiento unificado: \`EventModal\` (wrapper \`<Modal>\`), \`NotificationCenter\` (Escape, foco, \`slide-out-right\`), \`ConfirmDialog\` (Escape, bloqueo de scroll, sin cierre por backdrop), \`ShortcutsHelp\` (Escape), \`CsvExportModal\`, \`PdfExportModal\` y \`MetricsConfigPanel\` (\`useModal\`).
- OverlayPanel: backdrop movido de \`z-toast\` a \`z-modal\` (escala de z-index unificada).
- Previews de importación de \`ConfiguracionView\` (CSV, utilidades, notas/calendario): cierre con Escape evitando doble-cierre con el overlay subyacente.

### Guardado con datos sin guardar (FASE 4)

- \`ReporteRapidoModal\`: al cerrar con datos sin guardar (texto, fecha o reprogramación pendiente) muestra un \`ConfirmDialog\` antes de descartar.

### Contexto preservado (FASE 5)

- Abrir un caso desde Calendario o Bloc de Notas mantiene el overlay subyacente abierto debajo de \`VerCasoModal\`.

### Animaciones (FASE 7)

- \`CasoEditModal\`: animaciones de entrada (\`fade-in\` backdrop + \`scale-in\` tarjeta). Respeto a \`prefers-reduced-motion\` ya existente.

### Tests de integración (FASE 9)

- \`src/test/modal.test.jsx\`: 8 tests del wrapper \`Modal\` (render, ARIA, backdrop, Escape, aria-label, z-index) con fake timers.
- \`src/hooks/useViewTransition.test.js\`: transición crossfade y preservación de scroll.

## [1.6.4] - Sistema centralizado de notificaciones y feedback

### Pipeline central único

- Toda notificación sigue ahora el flujo: Acción → Evento → Prioridad → Sistema de notificación → Centro / Toast / Sonido, a través de \`notificationManager\`. No se permiten implementaciones paralelas.
- Nuevo \`src/core/notifications/actionFeedback.js\`: catálogo de acciones de feedback (copiar, crear, guardar, eliminar, importar, exportar, restaurar, reprogramar, cancelar) con prioridad y tipo determinados, enrutadas por el pipeline central.
- Prioridades: BAJA (Centro, sin toast, sin sonido) · MEDIA (Centro + toast, sin sonido) · ALTA/GRAVE (Centro + toast + sonido), gobernadas por \`ruleEngine\` y configuración del usuario.

### Sistemas paralelos eliminados

- Eliminado \`src/utils/notifications.js\` (legacy \`NotificationService\`): tenía historial paralelo bajo \`app_notifications\`. \`CalendarContext\` y \`calendarService\` migrados a \`notificationManager\`.
- Eliminado \`src/components/common/Toast.jsx\` (muerto, 0 importaciones).
- \`useAppStore.addToast()\` corregido: enrutaba a \`ui.toasts\` que nunca se renderizaba (toasts invisibles). Ahora enruta al \`notificationStore\` central. Esto arregla \`alertsSystem\` y \`CSVImporter\`.
- Reemplazados los \`alert()\` del navegador (MapeoView, AseguradorasView, LesionesView, SpeechsView, ComoUsarView, exportPDF) por toasts internos.

### Deduplicación

- \`notifyAccion\` genera \`eventKey\` estable por acción+mensaje; combinado con la dedup del \`ruleEngine\` (ventana 2s) y del store (ventana 3s), una acción lógica genera una sola notificación.
- Sonidos centralizados en \`soundSystem\` (éxito/error/advertencia/importantes), respetando preferencias del usuario (notifSonido, volumen, por nivel).

### Tests

- \`src/core/notifications/feedback.test.js\`: 14 tests (mapeo de catálogo, pipeline BAJA/MEDIA/ALTA → centro/toast/sonido, deduplicación, manager inicializado, helpers de acción).

## [1.6.3] - Integridad de datos, Backup y Export/Import

### Unificación del sistema de datos

- Eliminado \`casesManager.js\` (muerto: 0 importaciones, solo \`caseHistory.js\` era la fuente real).
- Eliminado \`STORAGE_KEYS.CASES\` de constants.js (nunca era referenciado).
- \`deleteCase\` ahora ejecuta cascade delete: limpia \`notes.relatedCaseIds\`, \`events.relatedCaseIds\` y \`case_history\` antes de eliminar el caso.

### Backup fortalecido

- \`BACKUP_SCHEMA_VERSION\` subido a 3. Migración v0→v1→v2→v3 automática.
- Nueva tabla \`auto_backups\` incluida en exportación de backup.
- Restore de configuración ahora preserva claves conocidas (\`app_*\` + \`unprefixedInclude\`) para no perder datos de versiones más recientes que el backup importado.
- Post-migration checksum ahora recalcula y compara en lugar de omitir silenciosamente.
- Rollback usa \`unprefixedInclude\` en lugar de lista hardcodeada.

### CSV unificado

- Nueva fuente única: \`csvUtils.js\` consolida todas las funciones CSV (escapeCSV, sanitizeCSV, parseReportesString con soporte [origen], parseNotasVinculadas, parseAgendaVinculada, parseHistorialVinculada, etc.).
- \`parsers.js\` reescrito para importar desde csvUtils (elimina duplicación).
- \`importCases.js\` reescrito con opción \`mode: 'append' | 'replace'\` (default: append).
- CSVImporter actualizado para usar las nuevas funciones nombradas.
- Nuevas funciones de exportación independientes: \`exportNotesToCSV()\` y \`exportEventsToCSV()\` con headers propios, sanitización y soporte para arrays como parámetro.

### localStorageAdapter

- Expandido \`unprefixedInclude\` con 12 claves \`app_*\` que faltaban: app-theme, app-palette, app-estado-colors, app-typography-preset, app-font-size, app_ui_settings, app_notifications, app_notification_center, app_easter_egg_behavior, app-view-orders, app_integrity_log, app_integrity_last_check.
- \`isKnownKey\` en backupService ahora cubre tanto prefijados como unprefixedInclude.

### Tests

- 114 tests nuevos en 8 archivos:
  - Unitarios: sanitize.js (16), redact.js (15), dbLifecycle.js (4), localStorageAdapter.js (25)
  - Integración roundtrip: 12 tests (backup→restore, checksum, auto_backups, cascade delete, CSV modes)
  - Edge cases: 27 tests (backup corrupto, migración, CSV injection, parsers, import, restore parcial)

## [1.6.1] - Design System y Consistencia Visual Global

### Design Tokens centralizados

- Nuevos tokens CSS: \`--text-on-accent\` (reemplaza 46 ocurrencias de \`#14181F\` hardcodeado), \`--border-light\` (dark + light themes).
- \`themeTokens.js\`: expandido \`cssVarMap\` con \`textOnAccent\` y \`borderLight\`.
- \`tailwind.config.js\`: mapeo completo de CSS variables a Tailwind (\`colors\`, \`zIndex\`, \`borderRadius\`, \`spacing\`, \`height\`, \`fontSize\`, \`boxShadow\`, \`transitionDuration\`, \`transitionTimingFunction\`).

### Z-index centralizado

- Nueva escala semántica en \`tailwind.config.js\`: \`z-dropdown\` (10), \`z-sticky\` (30), \`z-modal\` (50), \`z-submodal\` (60), \`z-banner\` (70), \`z-alert\` (90), \`z-toast\` (100), \`z-notification\` (110), \`z-calendar-modal\` (200), \`z-search\` (300), \`z-tour\` (999).
- 29 archivos actualizados de valores hardcodeados (\`z-[100]\`, \`z-[60]\`, \`z-[999]\`, etc.) a clases semánticas Tailwind.

### Botones unificados

- Nuevas variantes \`positive\` (acciones de éxito, verde) y \`contextual\` (acciones neutrales) en \`Btn.jsx\` y \`globals.css\`.
- 46 reemplazos de \`#14181F\` → \`var(--color-text-on-accent)\` en 28 archivos.

### Pills estandarizadas

- 4 clases CSS nuevas: \`.pill-sm\` (10px), \`.pill-md\` (xs), \`.pill-lg\` (sm), \`.pill-compact\` (9px).
- \`Pill.jsx\` actualizado para usar clases estandarizadas.
- 36 reemplazos de pills inline en 15 archivos (MiJornadaView, VerCasoModal, CondicionalesView, OperatorView, etc.).

### Cards mejoradas

- \`Card.jsx\`: nuevas variantes \`accent\` (fondo de acento) y \`compact\` (padding reducido).

### Inputs y formularios

- \`Toggle.jsx\`: soporte \`disabled\` con cursor \`not-allowed\` y opacidad reducida.
- \`TextInput.jsx\`: eliminado focus ring duplicado que conflictuaba con \`input-optimized\`.

### Modales, animaciones y responsive

- Verificados como ya consistentes: OverlayPanel y ConfirmDialog usan patrones estándar (overlay \`animate-fade-in\`, contenido \`animate-scale-in\`).
- Touch targets (44px mínimo) y breakpoints responsive (768px, 480px) verificados.

## [1.6.2] - Consistencia funcional (skeletons y formulario de edición)

> **Contexto**: Este sprint fue planificado originalmente sin ejecutarse como versión
> independiente; sus otros objetivos (feedback centralizado, confirmaciones, estados vacíos,
> búsqueda/filtros, eliminación diferenciada) se absorbieron en 1.6.3/1.6.4/1.6.5. Aquí se
> documentan las áreas de consistencia que quedaron pendientes y que se completaron a posteriori.

### Skeletons de carga

- Nuevo componente \`src/components/common/Skeleton.jsx\` sobre el shimmer estandarizado
  \`.animate-skeleton\` (definido en \`globals.css\`).
- Variants: \`text\`, \`avatar\`/\`circle\`, \`button\`, \`card\`, \`list\` (con líneas), \`table\`.
- Subcomponentes \`SkeletonText\` (párrafo de líneas) y \`SkeletonTable\` (tabla simulada).
- Accesible: \`aria-hidden="true"\` (los skeletons son decorativos, no contenido).
- Integrado en \`NotesView.jsx\`: el estado de carga reemplaza el spinner único por un layout
  de skeleton (lista + editor) coherente con la vista final.

### Formulario de edición reutilizable

- Nuevo componente \`src/components/common/EditableForm.jsx\`: endpoint config-driven para
  crear/editar entidades con validación, errores, feedback y acciones Guardar/Cancelar
  consistentes.
- Campos soportados: texto, date, textarea, select, toggle y datalist.
- Validación configurable por prop \`validator\` (array o \`{ valid, errors }\`), errores
  externos vía \`externalErrors\`, y estado \`saving\`.
- Reutiliza los primitivos existentes (\`Field\`, \`TextInput\`, \`TextArea\`, \`Select\`, \`Toggle\`,
  \`Btn\`, \`BtnOutline\`) y el patrón de bloque de errores estandarizado de los modales.

### Tests

- \`Skeleton.test.jsx\`: 12 pruebas (variants, dimensiones, líneas, accesibilidad).
- \`EditableForm.test.jsx\`: 11 pruebas (render, validación, errores externos, cancelar,
  saving, footer).

## [1.6.0] - Auditoría Técnica Integral

### Auditoría de arquitectura

- Auditoría completa del codebase (~265 archivos, React 18, Zustand 5, Dexie 4, Tailwind 3, Vitest 4).
- Inventario de dependencias, configuración de build y estructura de proyecto.

### State management

- Mapeo de todos los stores Zustand (useAppStore, useNotificationStore, useOperatorStore, calendarStore, notesStore, useSettingsStore, useFeedbackStore, useSearchHistoryStore).
- Identificación de estado duplicado entre stores.

### Sistema de notificaciones

- Identificación de 3 sistemas paralelos: nuevo \`src/core/notifications/\` (deshabilitado), legacy \`NotificationService\` (activo), \`useAppStore.addToast()\` (directo).
- Documentación de impacto: sonidos no funcionan, notificaciones duplicadas, prioridad desordenada.

### God Component

- Documentación de \`App.jsx\` (~1642 líneas, 13+ useStorage, 14+ useState, 7+ useMemo) como punto de deuda técnica principal.

### Colores de estado

- Identificación de 3 fuentes incompatibles: \`constants.js\`, \`themeTokens.js\`, \`globals.css\` con valores diferentes para los mismos estados.

### Navegación

- Mapeo completo del sistema de navegación basado en estado (sin router), incluyendo loss de contexto en transiciones de vista.

### Backup/Export/Import

- Identificación de 3 sistemas paralelos con modelos de datos diferentes y funciones duplicadas (\`escapeCSV\`, \`parseCSVLine\`, etc.).

### Performance

- Documentación de issues: \`config\` como dependencia cascada, ConfiguracionView renderizado dos veces, memoización parcial.

### Plan de acción v1.6.1–1.6.8

- Plan detallado de 8 sprints para corrección de hallazgos: Design System (1.6.1), Consistencia funcional (1.6.2), Datos y persistencia (1.6.3), Notificaciones (1.6.4), Navegación y modals (1.6.5), Performance (1.6.6), Accesibilidad (1.6.7), QA final (1.6.8).

> **Nota sobre 1.6.2**: El sprint "Consistencia funcional" fue planificado pero no se publicó
> como versión independiente en su momento. Sus objetivos se absorbieron parcialmente en las
> versiones posteriores: 1.6.3 (integridad de datos y export/import), 1.6.4 (sistema
> centralizado de notificaciones y feedback) y 1.6.5 (navegación contextual, modales/overlays
> unificados y gestor de animaciones). Posteriormente se completaron las áreas que quedaron
> pendientes (formulario de edición reutilizable y skeletons) y se publicó la entrada 1.6.2
> consolidada más abajo.

## [1.5.1] - Configuración, Backup/Export/Import, Ayuda y Correcciones

### Configuración — Citas y Calendario

- Nueva pestaña **Citas y Calendario** dentro de Configuración → General con 4
  opciones: crear eventos automáticamente desde CITA, actualizar al modificar
  CITA, crear nueva cita al usar "Reprogramado" y mostrar información del caso
  en eventos vinculados.

### Calendario — Corrección de zona horaria

- Corregido el bug donde eventos aparecían en el día incorrecto para usuarios
  en zonas horarias con offset negativo (ej: Argentina UTC-3). Se reemplazó
  \`toISOString().slice(0, 10)\` por una función \`toLocalDateStr()\` que usa la
  hora local.

### Teléfono — Corrección de formato

- El botón de teléfono/WhatsApp ahora usa el número tal cual fue cargado, sin
  agregar automáticamente el prefijo \`+549\`. Se eliminó la normalización
  automática que afectaba números internacionales o mal formateados.

### Overlay — Corrección de superposición

- Los overlays (Speechs, Calendario, Notas) ahora usan React Portal para
  renderizar en \`document.body\`, escapando contexts de stacking que impedían
  que cubrieran correctamente el header.

### Modal del caso — Cambios

- **Título**: se eliminó "Perfil del Caso —", ahora muestra solo el nombre.
- **ProLegal**: se movió al título (click en el nombre abre búsqueda en
  Prolegal). Se eliminó el botón independiente del footer.
- **Herramientas**: se renombró de "Herramientas Relacionadas" a "Herramientas".

### Notificaciones — Deduplicación

- \`showToast\` ahora se rutea a través de \`NotificationManager\` en lugar de
  agregar directamente al store. Esto activa la deduplicación de 2 segundos,
  la agregación y el sistema de prioridades para todos los toasts.
- Se agregó sonido de confirmación al copiar teléfono.

### Entidades conectadas — Eliminación

- Se eliminó completamente el sistema de "Entidades conectadas" (EntityPanel),
  incluyendo componentes, estados, handlers y referencias. Se conservó
  \`entityRelations.js\` con \`getRelatedTools()\` para el modal del caso.

### Dashboard — Reprogramaciones

- Integración de métricas de reprogramaciones en las secciones de Resumen,
  Actividad y Mini-timeline del Dashboard.

### Mi Espacio — Ayuda

- Documentación actualizada de Mi Espacio en la sección "Acerca de Vistas".

### Glosario y Tour

- Nuevos términos: Reprogramación, Cita automática, Evento vinculado, Nota
  vinculada, Mi Jornada.
- Tour actualizado con pasos para Herramientas, Configuración de Citas y
  Reprogramaciones.

### Backup

- Los nuevos campos de configuración de Citas y Calendario se incluyen en
  backup, exportación e importación.

## [1.5.0] - Sistema de Citas, Eventos Vinculados y Notas de Caso

### Citas automáticas en el calendario

- El campo **CITA** de cada caso (\`DD/MM - (HH:MM a HH:MM)\`) ahora genera o
  sincroniza automáticamente un **evento de calendario** vinculado al caso y a la
  descentralización correspondiente. Es la única fuente de verdad del evento.
- La **identificación** del evento automático se apoya en \`caso + tipo "cita"\`,
  de modo que los guardados repetidos, ediciones de campos no relacionados,
  importaciones o restauraciones **nunca duplican** el evento: se actualiza en el
  lugar y, si el campo CITA se vacía, el evento automático se elimina.
- El **año** de una cita se resuelve con una regla única y centralizada
  (\`citaParser\`): se usa el año actual (o el de creación del caso); si la fecha
  quedó más de 30 días en el pasado, se asigna el año siguiente.
- La sincronización ocurre **solo en guardados intencionales** del caso (creación
  o edición desde el modal), nunca en inicializaciones, recargas o migraciones.
- El **color de los eventos** se toma ahora del estado del caso vinculado
  (\`getEstadoAccent\`); los eventos manuales conservan el color por prioridad.
- Los eventos se distinguen visualmente por **color + insignia de tipo**
  (\`[Cita]\`, \`[Reprog.]\`), porque dos eventos del mismo caso comparten color.

### Reprogramaciones

- Al registrar un reporte con estado **"Reprogramado"** se requiere indicar la
  nueva fecha y horario de la cita.
- Se crea un **evento de reprogramación** vinculado al caso, al reporte y al
  evento original de cita (que se **conserva marcado como cancelado**, no se
  borra).
- El campo CITA del caso se actualiza con la nueva fecha/horario elegidos.

### Notas y eventos vinculados desde el caso

- Los botones **Nota** y **Calendario** del modal de un caso ahora actúan como
  acciones contextuales: abren un **mini-formulario inline** para crear una nota o
  evento vinculado al caso al instante, con un enlace para abrir el editor o el
  calendario completo.
- Las notas y eventos creados desde un caso quedan **vinculados al caso**
  (\`relatedCaseIds\`) y muestran su contexto (caso, estado, ART, localidad).

### Historial

- La línea de tiempo del caso incorpora nuevos tipos de actividad: creación,
  actualización y eliminación automática de citas, y reprogramación de citas.

### Importación / respaldo

- Al **restaurar backups anteriores** a 1.5.0, los eventos existentes reciben el
  tipo seguro \`manual\` (no se tratan como automáticos). Los backups viejos no se
  invalidan.

## [1.4.8] - Auditoría y limpieza (correcciones de consistencia)

### Sincronización entre contextos

- Al **restablecer los valores por defecto** de la tipografía (botón de reset en
  la Vista Tipografía), el **selector de tamaño de fuente** ahora se sincroniza
  automáticamente y vuelve también a "Mediano", en lugar de mostrar un valor
  desactualizado. Se añadió un mecanismo de suscripción en \`typographyManager\`
  para que ambos contextos queden en fase.

### Consolidación de fuentes

- **Clásico** (preset por defecto) ahora usa solo **Montserrat** como familia:
  se eliminó "Open Sans" que estaba declarada pero sin uso real.
- Se unificó la construcción de la URL de Google Fonts en una única función
  (\`buildGoogleFontsURL\`) reutilizada por \`fontLoader\`; se eliminó la duplicación.
- Se cambió el **fallback por defecto** del token CSS \`--font-ui\` a fuentes
  genéricas del sistema (sin hacer referencia a Montserrat), para que los presets
  no-Montserrat no dependan de una fuente concreta durante la carga.
- Se eliminaron las importaciones locales de \`@fontsource/montserrat\` (los presets
  cargan sus familias desde Google Fonts) y la dependencia asociada del
  \`package.json\`.

### Limpieza de código

- Se eliminó el hook muerto \`hooks/useFontSize.js\`.
- Se eliminó la variable \`fontSize\` sin uso en \`AppContent\`.
- \`init()\` del \`typographyManager\` ahora registra una advertencia (\`console.warn\`)
  si falla la inicialización, en lugar de fallar en silencio.
- Se añadieron aclaraciones al changelog histórico (1.4.5) sobre el cambio de
  nombre del preset "Moderno" → "Clásico" en 1.4.7, para evitar información obsoleta.

### Verificaciones

- Tras revisar a fondo el código, dos hallazgos preliminares de la auditoría
  resultaron ser **falsos positivos** y no se modificaron: la etiqueta
  "Pequeño" ya tenía la tilde correctamente, y el color \`#14181F\` (texto sobre
  acento) es el token intencional usado de forma consistente en toda la app.

## [1.4.7] - Rediseño de Presets Tipográficos

### Nueva identidad visual de los 7 estilos

- Se rediseñaron por completo los 7 presets tipográficos de
  **Configuración → Apariencia → Tipografía** para que cada uno tenga una
  **personalidad visual claramente diferenciada** (antes eran demasiado
  similares entre sí). Al cambiar de preset, el cambio es inmediato y evidente.
- Los presets afectan **exclusivamente a la interfaz** de la aplicación.
- **Clásico** conserva la identidad tradicional original de AppSeguimiento
  (Montserrat) y es la opción conservadora por defecto.

### Los 7 estilos

1. **Clásico** — montserrat; tradicional, sobrio e institucional.
2. **Editorial** — Playfair Display + Source Serif 4; elegante, tipo revista.
3. **Retro / Humanista** — Bitter + Nunito; cálido y orgánico.
4. **Futurista** — Exo 2 + Rajdhani; geométrico y tecnológico.
5. **Monoespaciado / Terminal** — JetBrains Mono + Fira Code; interfaz completa
   en monoespaciado (números, fechas e IDs destacan).
6. **Experimental** — Fraunces + DM Sans + Space Mono; display variable de
   personalidad artística.
7. **Minimal / Moderno** — Inter + DM Serif Display + IBM Plex Mono; limpio y
   premium.

### Independencia del sistema

- El **selector de tamaño de fuente** se mantiene totalmente independiente:
  cambiar de preset no altera el tamaño elegido, y viceversa.
- **Persistencia** sin cambios de clave de localStorage; los usuarios con un
  preset guardado reciben automáticamente su equivalente rediseñado (mismos
  ids internos), sin reseteo ni configuración inválida.
- Aplicación **inmediata** sin recargar la app.

### Vista previa y PDFs

- Se mejoró la **vista previa** de cada preset: ahora muestra título, subtítulo,
  datos numéricos y elementos de interfaz en las fuentes reales del estilo.
- **Los PDF no se ven afectados**: siguen usando su tipografía independiente
  (Arial) sin importar el preset seleccionado.

## [1.4.6] - Búsqueda Externa Prolegal

### Nuevo acceso desde el modal del caso

- Nuevo botón **Prolegal** en la barra de acciones del modal del caso (junto a las
  acciones secundarias del caso, como Notas o Calendario). Al presionarlo abre una
  búsqueda externa en el sitio Prolegal.

### Funcionamiento

- Usa el **nombre del caso** como término de búsqueda, construyendo la URL:
  \`https://prolegal.com.ar/search?q=<nombre>\`.
- Codificación segura de URL (\`encodeURIComponent\`) que soporta espacios, tildes,
  Ñ, apóstrofes, caracteres especiales y nombres compuestos.
- Los **espacios múltiples** se normalizan únicamente para la URL de búsqueda
  (no se modifica el nombre almacenado en el caso).
- Apertura **externa** en una nueva pestaña/ventana, sin reemplazar AppSeguimiento
  ni perder el estado del modal. Se reutiliza la misma pestaña en búsquedas
  posteriores cuando el navegador lo permite.
- Si el caso no tiene un **nombre válido** (vacío, \`null\` o solo espacios), no se
  abre Prolegal y se muestra una notificación in-app clara.

### Alcance y privacidad

- Solo disponible desde el **modal del caso** en esta versión.
- **No** hay scraping, extracción de información ni sincronización de datos desde
  Prolegal. No se envían datos adicionales más allá del término de búsqueda
  (nombre del caso). No se registra información sensible adicional.

## [1.4.5] - Sistema de Tipografías y Personalización Visual

### Nueva sección Tipografía

- Nuevo tab **Configuración → Apariencia → Tipografía** como centro de todas las
  preferencias tipográficas de la aplicación.
- Se diferencia conceptualmente entre **Estilo tipográfico** (qué familias usa la
  app) y **Tamaño de fuente** (qué tan grande es la escala global). Ambas funcionan
  de forma independiente: cambiar una no modifica la otra.

### Sistema de presets tipográficos

- 7 estilos predefinidos (sin combinación manual de fuentes): **Moderno**, **Editorial**,
  **Geométrico**, **Corporativo**, **Suave**, **Compacto** y **Expresivo**.
  *(Nota 1.4.7: los nombres y fuentes de estos presets se rediseñaron; "Moderno" pasó a
  llamarse **Clásico**. Ver la entrada 1.4.7.)*
- Cada preset define los roles tipográficos (fuente de interfaz, de títulos y de
  métricas) y puede usar 1, 2 o 3 familias con fallbacks reales (sans-serif, serif,
  monospace).
- **Moderno** (Inter) es el preset por defecto y el más cercano al diseño anterior.
  *(En 1.4.7 este preset por defecto pasó a llamarse **Clásico** y adoptó Montserrat,
  la fuente original de la app, en lugar de Inter.)*
- Interfaz de selección por **tarjetas** con vista previa que usa las **fuentes reales**
  del preset (título, texto, métrica y elemento de interfaz), nombre, descripción y
  estado seleccionado.
- **Cambio instantáneo**: al seleccionar un estilo se aplica al momento, sin recargar
  la app, sin reiniciar stores ni cerrar Configuración. Feedback discreto vía el sistema
  global de notificaciones ("Estilo tipográfico actualizado"), sin sonido.

### Arquitectura tipográfica global

- Tokens centralizados \`--font-ui\`, \`--font-heading\` y \`--font-metric\` aplicados sobre
  el root por \`typographyManager\`, con \`--font-family\` heredando la fuente de interfaz.
  Ningún componente aplica fuentes hardcodeadas.
- Carga progresiva de fuentes: solo se descargan las familias del preset activo desde
  Google Fonts con \`font-display: swap\`, sin bloquear el render ni generar flashes.
- Funciona en tema claro y oscuro sin tocar colores, paletas ni estados.

### Tamaño de fuente

- El selector de **Tamaño de Fuente** (Pequeño / Mediano / Grande) se movió al nuevo tab
  Tipografía; se eliminó la ubicación anterior para no duplicarlo.
- Conserva y migra la preferencia existente del usuario (clave \`app-font-size\`).

### Persistencia

- El preset se persistió en localStorage (clave \`app-typography-preset\`) y se restaura
  al recargar o reabrir la app. Usuarios sin preferencia previa reciben **Moderno**
  *(hoy **Clásico** desde 1.4.7)*.
- Compatibilidad con backups: los archivos de backup anteriores (sin el nuevo campo)
  siguen siendo válidos y se aplica un valor por defecto seguro.

### Exportaciones PDF sin cambios tipográficos

- Las exportaciones PDF acuerpan su propio sistema tipográfico (Arial) y NO se ven
  afectadas por el preset: estable, compatible y legible para documentos.

## [1.3.5] - 2026-08-26

### Modal de Caso (VerCasoModal)

- Botones de copiar al portapapeles en Nombre y Teléfono del modal de detalle del caso. Feedback visual con icono Check y color success durante 1.5s.
- Nuevo hook reutilizable \`useClipboard\` (src/hooks/useClipboard.js) con manejo de timeout y errores.
- Unificación visual de las secciones collapsible: Comentarios, Notas, Eventos, Historial ahora comparten la misma estructura de botón (chevron primero, icono, texto con contador).
- Renombrado "Historial y seguimiento" a "Historial" para evitar confusión con el panel de Seguimiento.

### Navegación agrupada

- Tabs "Mi Espacio" y "Dashboard" agrupados visualmente con fondo sutil y separador vertical del resto de vistas (Tablero, Tabla, Reportes, Útiles).

### Exportación CSV de casos

- Nuevo modal \`CsvExportModal\` con filtros: Estado (pills multi-select), Fecha desde/hasta, Aseguradora, Estudio Jurídico, Localidad.
- Opciones de filtro generadas dinámicamente desde los datos existentes.
- Preview en tiempo real de cantidad de casos que serán exportados.
- Botón "Limpiar filtros" para resetear la selección.
- Nombre del archivo: \`AppSeguimiento_Casos_[Estado]_YYYY-MM-DD.csv\`.
- Botón "EXPORTAR" en la barra de acciones del Tablero (junto a Nuevo Reporte y Nuevo Caso), separador visual incluido.

### Exportación PDF de Mi Espacio

- Nuevo modal \`PdfExportModal\` con selección de secciones: Perfil, Jornada, Métricas, Objetivos semanales, Resumen.
- Select All / Deselect All para selección rápida.
- Genera documento HTML imprimible con el patrón existente de \`exportPDF.js\` (window.open + print).
- Botón "Exportar PDF" en el encabezado de Mi Espacio.

### Archivos nuevos

- \`src/hooks/useClipboard.js\` + \`useClipboard.test.js\` (6 tests)
- \`src/features/export/CsvExportModal.jsx\` + \`CsvExportModal.test.jsx\` (10 tests)
- \`src/features/operator/PdfExportModal.jsx\` + \`PdfExportModal.test.jsx\` (8 tests)

## [1.3.4] - 2026-08-26

### Sistema global de animaciones y respuesta visual

- Tokens de animación centralizados: duraciones (\`--duration-instant\` 75ms a \`--duration-slower\` 500ms) y curvas de easing (\`--ease-out\`, \`--ease-in\`, \`--ease-standard\`, \`--ease-bounce\`).
- Eliminados keyframes duplicados en \`index.html\` que entraban en conflicto con \`globals.css\`.
- Eliminada transición global \`* { transition: ... }\` que afectaba innecesariamente a todos los elementos del DOM.
- Nuevo sistema de transiciones por propiedad: \`transition-colors\`, \`transition-transform\`, \`transition-shadow\`, \`transition-opacity\`, \`transition-[width]\`, \`transition-[height]\` en lugar de \`transition-all\` (53 instancias corregidas).
- Soporte nativo de \`prefers-reduced-motion: reduce\` — la interfaz desactiva animaciones cuando el sistema operativo lo solicita.

### Botones

- Estados hover mejorados: \`filter: brightness()\` en lugar de \`opacity\` para colores más vivos.
- Sombras contextuales en hover (primary, danger, accent, outline-accent).
- Nuevo estado \`btn-loading\`: spinner CSS integrado sin desplazamiento del layout.
- Nuevo estado \`btn-success-flash\`: flash verde de confirmación 600ms tras acción exitosa.
- \`pointer-events: none\` y opacidad reducida en disabled (mejor que solo opacidad).
- \`Btn.jsx\` soporta \`loading\` prop y detecta promises en onClick para flash automático.

### Navegación entre vistas

- Cada vista envuelta en \`<div key="view-*" className="view-transition-enter">\` para transición de entrada suave al cambiar de pestaña.
- Animación \`fade-in\` sutil (180ms) al entrar, sin movimiento brusco.

### Tabs, pills, chips

- \`category-tab\` usa transiciones específicas (\`background-color\`, \`color\`, \`border-color\`, \`box-shadow\`) en lugar de \`transition: all\`.

### Modales y overlays

- \`OverlayPanel\`: backdrop con opacidad reducida (0.6), contenido con \`animate-scale-in\` (escala de 0.95), click outside para cerrar.
- \`ConfirmDialog\`: contenido con \`animate-scale-in\`, botones usan clases \`btn-base\` en lugar de estilos inline.
- Backdrop blur consistente en todos los overlays.

### Inputs y formularios

- \`input-optimized\` usa \`border-color\` + \`box-shadow\` + \`background-color\` con tokens de duración y easing.
- Nuevo estado \`input-error\` con borde rojo y sombra sutil.
- Nuevo estado \`input-success\` con borde verde.
- \`Input.jsx\` soporta prop \`error\` con texto animado (\`animate-fade-in\`).
- Focus ring consistente con \`box-shadow: 0 0 0 3px var(--ring)\`.

### Toggles

- \`Toggle.jsx\` anima \`background-color\` y \`left\` con tokens de duración y easing en lugar de \`transition: 0.3s\` genérico.

### Toasts

- \`Toast.jsx\` con entrada \`animate-toast-in\` y salida \`animate-toast-out\` secuencial (200ms de delay).
- Estado \`exiting\` para transición de salida antes de desmontar.
- Botón de cerrar con transición de color.

### Cards y widgets

- \`Card.jsx\` soporta prop \`interactive\` para cards clickeables con hover de sombra.
- Cards interactivas usan \`transition: box-shadow, border-color\` en lugar de \`transition-all\`.

### Empty states y skeletons

- \`EmptyState.jsx\` con \`animate-fade-in\` en el contenedor.
- Botón CTA usa clases \`btn-base btn-accent btn-sm\` en lugar de estilos inline.
- Nuevo \`.animate-skeleton\` con shimmer sutil (gradiente en \`var(--color-surface2)\`).
- Nuevo \`.animate-progress-bar\` para barra de progreso indeterminada.

### Acordeones

- \`HelpPanel.jsx\`: contenido expandible usa \`transition-[height,opacity]\` en lugar de \`transition-all\`.

### Tablas

- Filas interactivas con \`transition-colors\` en hover.
- Drag handles con \`transition-opacity transition-transform duration-150\`.

### Dashboard

- Barras de progreso animadas con \`transition-[width]\` en lugar de \`transition-all\`.
- Barras de gráficos animadas con \`transition-[height]\` o \`transition-[width]\`.
- KPI cards con \`transition-transform\` en hover.
- Pipeline bars con \`transition-[filter,opacity]\`.

### Configuración

- Categorías con \`transition-colors\`.
- Paleta de colores con \`transition-transform transition-opacity\`.
- Draggable items con \`transition-opacity transition-transform duration-150\`.

### Tour y ayuda

- Progreso del tour con \`transition-colors transition-[height]\`.
- Highlight con \`box-shadow\` usando tokens.
- Tooltip con \`opacity\` y \`transform\` usando tokens.

### Otros

- \`DayFilter.jsx\` transiciones inline con tokens en lugar de valores hardcodeados.
- \`OrigenBadge.jsx\` con \`transition-colors\`.
- \`BlocNotas.jsx\` cards con \`transition-shadow\`.
- Easter eggs ajustados a duraciones más cortas.
- \`PersonalizacionColores.jsx\` palette cards con \`transition-transform transition-opacity\`.

## [1.3.3] - 2026-08-25

### Funciones nuevas

- Capa central de integridad de datos (\`src/core/integrity/\`):
  - Validaciones estructuradas con niveles INFO / WARNING / ERROR / CRITICAL y resultado \`{valid, warnings, errors, recoverable, normalizedData}\`: los casos antiguos o incompletos se distinguen de los realmente inválidos.
  - Detección de referencias huérfanas (notas/eventos que apuntan a casos inexistentes) y de duplicados (técnicos por ID vs posibles por nombre+teléfono): se clasifican e informan, nunca se eliminan automáticamente.
- Recuperación de preferencias:
  - Las órdenes de secciones persistentes (Dashboard, Tablero, Tabla, Reportes, Útiles) ahora se validan al iniciar: los IDs obsoletos se descartan, las secciones nuevas se agregan al final y el orden válido existente se conserva (nunca se resetea toda la preferencia).
  - Reparación manual disponible en Diagnóstico > Integridad ("Restablecer orden de secciones"), con confirmación y alcance explicado.
- Protección de restauraciones e importaciones:
  - Una restauración que vaciaría una colección existente (ej.: backup sin casos contra 500 casos actuales) se bloquea como CRITICAL y solo procede con confirmación explícita.
  - Salvaguarda automática en Historial de backups (etiqueta "Seguridad") antes de escribir una restauración completa.
  - Restauración selectiva validada por bloque: un bloque inválido no arruina los demás; el resultado informa advertencias reales por sección.
- Importación más segura:
  - El preview del importador CSV clasifica filas: válidas, con advertencias, inválidas y duplicadas.
  - Resumen final real de la operación (importados / omitidos / rechazados / con advertencias) en lugar de un éxito genérico.
- No falsificación de fechas:
  - Una fecha irrecuperable ya no se reemplaza silenciosamente por la fecha actual: se conserva el valor original (o queda vacío si no existía) y se marca con advertencia para revisión.
- Diagnóstico > Integridad:
  - Panel con estado de configuración, último backup válido, verificación completa bajo demanda (huérfanos, duplicados, preferencias) y log rotativo de eventos de integridad (máximo 50 entradas).
  - Verificación ligera automática al iniciar la aplicación: nunca bloquea el arranque y solo advierte ante problemas CRITICAL.

### Notas técnicas

- Sin cambios de esquema ni migraciones nuevas; los backups antiguos siguen restaurándose igual (kind legacy \`seguimiento-art-backup\` incluido).
- La preservación tiene prioridad sobre la limpieza: ningún dato del usuario se corrige en silencio.

## [1.3.2] - 2026-08-25

### Funciones nuevas

- Capa de Insights y Analítica personal (pestaña Analítica del Dashboard):
  - Nuevo selector de período reutilizable: Hoy / Esta semana / Este mes / Últimos 7, 30 y 90 días. El período seleccionado se recuerda entre sesiones.
  - Resumen analítico del período con comparación contra el período anterior equivalente: casos, firmas, conversión (misma fórmula del Dashboard), promedio diario en días hábiles según la jornada configurada y mejor día.
  - Motor de insights determinístico (sin IA): reglas verificables organizadas por categoría (Productividad, Objetivos, Tendencia, Horarios, Aseguradoras, Estudios jurídicos, Actividad) con prioridad, título breve y detalle expandible "¿Por qué?" que muestra los datos comparados.
  - Tendencias semanales de firmas con detección de subida/bajada/estabilidad usando múltiples puntos temporales; nunca se concluye con menos de 4 semanas de datos.
  - Análisis por día de la semana respetando los días laborales de Mi Espacio, con muestra mínima obligatoria antes de declarar patrones.
  - Análisis horario en franjas de 2 horas construido solo a partir de timestamps confiables (creación de casos e interacciones); se omite si no hay muestra suficiente.
  - Rendimiento por aseguradora y estudio jurídico con evolución vs período anterior; no se destacan conclusiones con muestras pequeñas (<10 casos).
  - Integración con objetivos de Mi Jornada: ritmo necesario, proyección semanal estimada ("manteniendo tu ritmo actual podrías alcanzar…") y alerta de ritmo insuficiente.
- Insight destacado en Mi Jornada:
  - Un único insight de mayor prioridad con acceso directo "Ver análisis" a la pestaña Analítica.
  - Se puede desactivar desde Configuración > Sistema > Dashboard ("Insight destacado en Mi Jornada").
- Estados vacíos diferenciados: sin datos, datos insuficientes y sin cambios relevantes se comunican de forma explícita.

### Notas técnicas

- Los insights son derivados y no se persisten: siempre se recalculan desde los casos reales.
- Umbrales y tamaños mínimos de muestra centralizados en \`src/features/analytics/insightsConfig.js\`.
- Sin cambios de esquema de datos ni migraciones; backups existentes siguen funcionando sin alteraciones.

## [1.3.1] - 2026-08-25

### Funciones nuevas

- Historial y seguimiento de casos (Timeline):
  - Cada caso ahora cuenta con un historial cronológico de eventos relevantes: creación, edición, cambio de estado, cambio de estudio jurídico, cambio de aseguradora, firma registrada, nota agregada, evento de calendario vinculado, reporte agregado e interacción manual.
  - Los eventos se guardan en una nueva tabla \`case_history\` (IndexedDB) indexada por \`caseId\`; se cargan solo al abrir el detalle del caso.
  - Detección de cambios reales al guardar: si no hay cambios no se genera ningún evento ni se actualiza la última actividad. Cambios múltiples en una misma edición se agrupan en un único resumen comprensible.
  - Nueva vista Timeline en el detalle del caso: agrupación por día (Hoy / Ayer / fecha), orden más reciente primero, filtros compactos (Todos / Estados / Firmas / Notas / Interacciones / General) e íconos por tipo de evento.
- Resumen rápido del caso:
  - El detalle muestra última actividad, último cambio y próximo seguimiento (calculado desde los eventos de calendario vinculados; no se persisten valores derivados).
- Interacciones manuales:
  - Los comentarios del caso ahora admiten un tipo de interacción opcional (Llamada realizada, No atendió, Se envió información, Volver a llamar, Otro) que se registra en el historial sin duplicar datos: la interacción sigue siendo un comentario del caso.
- Última actividad:
  - Nueva propiedad \`lastActivityAt\` en casos, actualizada solo por actividad real (nunca por apertura o renderizado). Para casos previos se usa como fallback \`updatedAt\`.
- Detección de casos inactivos:
  - Utilitario base (\`caseHistory.getInactivityInfo\`) que informa "Sin actividad hace N días" en el detalle, ignorando estados cerrados (Firmo / No le interesa / No viable) y con umbral configurable (default 5 días).

### Persistencia

- Nueva versión de esquema \`CasesDB\` v3 (aditiva, no destructiva): agrega la tabla \`case_history\` sin modificar datos existentes; los casos antiguos siguen funcionando sin historial previo.
- Backups completos ahora incluyen el historial de casos. Los backups antiguos siguen restaurándose normalmente: si no contienen historial se aplica un valor por defecto seguro (historial vacío), sin inventar eventos.

## [1.2.5] - 2026-08-25

### Funciones nuevas

- Backup automático antes del cierre de jornada:
  - El sistema ahora calcula automáticamente el horario de cierre de la jornada configurado en Mi Espacio y ejecuta un backup completo 15 minutos antes.
  - Se envía una notificación importante con persistent alert informando al operador que el backup se realizó antes del cierre.
  - El backup de jornada se ejecuta una sola vez por jornada (se verifica con la clave \`backup-last-jornada-run\` en localStorage) y se resetea cuando cambia el día.
  - El intervalo de verificación es de 60 segundos para detectar el momento exacto del backup.

- Motor de migración de backups antiguos:
  - Nuevo módulo \`backupMigrator.js\` que detecta backups en formatos anteriores (v0 y v1) y los migra automáticamente al formato actual (v2) antes de restaurarlos.
  - La migración se ejecuta sobre una copia del backup (no destructivo) y valida la estructura resultante.
  - Compatible con backups que no incluían TRANSITO_SELECCION, TRABAJO_SELECCION o datos de Mi Espacio y Útiles.

### Correcciones

- Localidad con coma detectada como "Sin provincia":
  - Localidades con formato "Ciudad, Provincia" (por ejemplo "LA PLATA, BUENOS AIRES") ahora se analizan correctamente y extraen la provincia en lugar de mostrar "Sin provincia".
  - \`normalizarUbicacion()\` ahora procesa correctamente localidades con coma separando ciudad y provincia de forma segura.
  - \`provinciaDe()\` ahora usa el mismo normalizador que \`normalizarCasos\`, garantizando consistencia.

- Backup no guardaba datos de Mi Espacio:
  - Los datos de Mi Espacio (perfil, jornada, disponibilidad, metas, configuración del módulo) se almacenan directamente en localStorage sin el prefijo \`app_\`, por lo que el sistema de backup no los incluía.
  - Ahora \`localStorageAdapter.getAll()\` reconoce explícitamente las claves de Mi Espacio (\`userOperatorProfile\`, \`userOperatorAvailability\`, \`userOperatorGoals\`, \`userOperatorSettings\`) y las claves de productividad (\`userProductivitySettings\`, \`userGoals\`, \`userContextMemory\`) para incluirlas en los backups.
  - Las credenciales personales (\`userOperatorCredentials\`) siguen excluidas de backups por seguridad.
  - Se agregó verificación de \`backupExclude\` para claves con prefijo \`app_\` (antes solo se verificaba en claves sin prefijo).

- Backup de migración v1→v2 faltaba:
  - El motor de migración no tenía un paso de v1 a v2, por lo que backups de v1.2.1 (con \`version: 1\`) eran rechazados como inválidos.
  - Ahora la migración v1→v2 convierte el kind legacy \`"seguimiento-art-backup"\` a \`"appseguimiento-backup"\` y asegura que \`transito-seleccion-art-tracker\` exista.
  - Si el checksum no coincide después de la migración, se omite la verificación en vez de fallar (el checksum es del formato anterior).

- Eliminación global no borraba datos de Mi Espacio:
  - La función "Eliminar todos los datos" solo borraba claves hardcodeadas sin prefijo \`app_\`, dejando intactos perfil, disponibilidad, metas, configuración y productividad.
  - Ahora usa \`localStorageAdapter.clear()\` para eliminar todas las claves \`app_*\` y también elimina todas las claves sin prefijo de Mi Espacio, productividad, backups, conversaciones y tour.

### Mejoras

- Backups ahora incluyen TRANSITO_SELECCION (ya estaba en CONFIG_KEYS pero se verificó su inclusión).
- Configuración > Datos: muestra el horario de backup de jornada configurado y el badge "Jornada" en el historial de backups.
- Importación de backups antiguos muestra un toast informando que se migrarán automáticamente antes de restaurar.
- Exportación e importación de configuración y útiles preservan correctamente los valores con comas (usando comillas CSV).

### Fix visuales

- Útiles y Ayuda: botones de categoría/pestañas ahora son compactos (\`text-[11px]\`, \`flex-shrink: 0\`, \`whitespace-nowrap\`) y no se saltan de línea.
- Modal de Speechs: backdrop ahora cubre el viewport completo con \`z-[9999]\` y dimensiones explícitas para evitar que se quede detrás de otros elementos.

## [1.2.4] - 2026-08-24

### Correcciones

- Útiles → Condicionales: las filas de cada estudio se ordenan correctamente por Aseguradora y las columnas (Condición, Aseguradora, Observaciones, Acciones) quedan alineadas.
- Útiles → Speechs: se eliminó la edición duplicada en la tarjeta; ahora solo se edita desde el modal (ícono de lápiz).
- Útiles → Estudios Jurídicos: la celda de dirección muestra por defecto la primera dirección cargada y la tabla tiene columnas más legibles.

### Mejoras

- Útiles → Condicionales:
  - Los grupos por estudio quedan comprimidos por defecto, con botón para expandir/colapsar cada grupo o todos a la vez.
  - Al crear una condición se pueden cargar varios estudios y varias aseguradoras (Enter o +): se genera automáticamente una condición por cada combinación, omitiendo las que ya existen.
- Útiles → Objeciones: nueva portada alineada con Speechs — búsqueda en tiempo real, vista tarjetas/lista, orden alfabético A-Z/Z-A y tamaño de letra (se recuerda entre sesiones).
- Útiles → Aseguradoras: el listado de ART y Tránsito se muestra ordenado alfabéticamente sin alterar el orden guardado de los datos.
- Útiles → Tránsito: la selección de píldoras por aseguradora ahora se guarda y sobrevive a cambios de vista, recargas y se incluye en los backups.

## [1.2.3] - 2026-08-24

### Correcciones

- Mi Espacio: se eliminó el sonido que se reproducía automáticamente al entrar a la vista.

### Mejoras

- Mi Espacio:
  - Tarjeta de bienvenida más compacta y equilibrada: el estado del día pasa a la fila del título, el saludo ocupa una sola línea con la fecha a la derecha y los datos rápidos (jornada, meta, días efectivos) se agrupan en una tira compacta.
  - Mi disponibilidad: pestañas con contador de registros, resumen de períodos próximos al ingresar, edición de cada registro existente (botón lápiz) y estados vacíos con acción directa.
  - Accesos personales: tarjetas compactas con acciones visibles (ver, copiar, editar, eliminar), botón "Agregar acceso" siempre visible y contraseña visible solo cuando se solicita.

## [1.2.2] - 2026-08-24

### Funciones nuevas

- La aplicación pasa a llamarse **AppSeguimiento** en toda la interfaz, instalador PWA, backups y documentación.
- Importación rediseñada (Configuración → Avanzado → Importación):
  - Checklist de elementos importables (Casos CSV, Útiles JSON, Notas y Calendario JSON, Backup completo). Al desactivar uno, su botón de importación en General → Datos queda deshabilitado.
  - Casos CSV: mapeo de columnas (automático / preguntar / plantilla guardada), estrategia de duplicados (preguntar cada vez / omitir / actualizar existentes / crear duplicados), modo de importación (agregar a los existentes o reemplazar los meses presentes en el archivo) y validaciones configurables.
  - Útiles JSON: selección por categoría de qué se reemplaza al importar (pasos, tips, links, speechs, objeciones, ART, tránsito, lesiones, estudios, condicionales, etc.).
  - Notas y Calendario JSON: elegir si se importan notas, eventos y qué hacer con duplicados.
  - Backup completo: elegir qué restaurar por defecto (casos, notas, eventos, configuración), ajustable al confirmar cada restauración.
- Frecuencia de backup automático configurable en General → Datos: Manual, Diario, Semanal o Mensual.

### Mejoras

- Se conectaron todas las preferencias que estaban "sueltas" (el interruptor existía pero no tenía efecto):
  - Sugerencias inteligentes: ahora aparecen también en el widget de productividad del Dashboard.
  - Micro-interacciones: apaga las animaciones de felicitación y los sonidos de acción en toda la app.
  - Mostrar resumen de jornada y Mostrar ritmo necesario: ocultan esas secciones de Mi Espacio.
  - Recordatorios de jornada: aviso discreto cuando faltan 30 minutos para el cierre habitual.
  - Recordatorios de metas: aviso cuando estás cerca de cumplir la meta diaria.
  - Microinteracciones de objetivos: celebración al cumplir la meta diaria de casos.
- Configuración reorganizada: las secciones Sistema y Avanzado se unificaron en un solo grupo **Avanzado**; se quitó la pestaña "Operador" (los datos personales viven en Mi Espacio).
- El orden personalizado de pestañas/widgets del Dashboard, Tablero, Tabla, Reportes y Útiles ahora **se conserva al recargar la app**.
- Las vistas del Dashboard usan el color de acento del tema activo.
- El buscador global vuelve a leer la configuración cada vez que se abre (sin recargar).

### Correcciones

- Texto del recordatorio de backup apuntaba a una pantalla inexistente ("General > Perfil"); ahora referencia General → Datos.
- Texto de la sección Columnas sugería reordenar arrastrando, algo que la lista no permite.
- Se eliminó código muerto (PerfilView).

## [1.2.1] - 2026-08-20

### Mejoras

- Orden fijo de pestañas: **Mi Espacio | Dashboard | Tablero | Tabla | Reportes | Útiles**.
- La aplicación abre siempre en **Mi Espacio** con un mensaje de bienvenida destacado.
- Mi Espacio:
  - 10 saludos de bienvenida aleatorios (cambian cada día) que usan el día, la hora y el nombre corto del operador.
  - La pestaña "Mi Espacio" se resalta en todos los temas.
  - Interfaz visual de las secciones mejorada (tarjetas con icono, activo resaltado y escala sutil).
  - Mejor visibilidad de los Accesos Personales: tarjetas con borde de acento, campos resaltados y URLs clicables.
  - Si la meta diaria no se cumplió, 10 mensajes de aliento aleatorios (con día, hora y nombre corto) aparecen los últimos 15 minutos antes del cierre de la jornada.
- Metas corregidas:
  - La meta diaria muestra correctamente si se alcanzó el objetivo en casos y reportes.
  - La meta mensual se mide con las firmas (estados "Firmo") además de casos y reportes, con su propia meta configurable (por defecto 14 firmas).
  - Se corrigió el error \`perDay is not defined\` en Mis Metas.
- Dashboard:
  - La Meta Diaria y la Micro-analítica se muestran dentro de la pestaña Analítica (debajo de los gráficos) y son coherentes con el filtro de día seleccionado.
  - Los días configurados como no disponibles en Mi Espacio (inasistencias, vacaciones, feriados y días no laborables) se renderizan en el filtro de día y en las estadísticas, para no dejar espacios vacíos sin justificación.
- Útiles → Condicionales: se agrupan por estudio (un estudio puede tener varias condiciones con varias aseguradoras). Columnas: Estudio | Condición | Aseguradora | Observaciones. Ya no se requieren Tipo de ingreso ni Lesión.
- Útiles → Speechs: se editan directamente desde el modal, con su icono de lápiz y botón "Guardar cambios".
- Notas: ya no se autoguardan; se guardan con el botón "Guardar" (resaltado cuando hay cambios sin guardar).
- Respuestas visuales y sonoras en las funciones nuevas: sonido de bienvenida, sonido y aviso visual al cumplir la meta diaria, sonido al guardar notas, speechs y condicionales.

### Correcciones

- Error \`perDay is not defined\` en la sección "Mis Metas" de Mi Espacio (Referencia de GoalsSection).

## [1.2.0] - 2026-08-20

### Funciones nuevas

- **Mi Espacio** (pestaña nueva en el menú principal): centro personal del operador con:
  - Perfil: nombre, rol, empresa, localidad, contacto y jornada habitual (horario de inicio y fin, con soporte de jornadas que cruzan la medianoche) y días laborables configurables.
  - Resumen de la jornada: estado del día (en jornada, meta cumplida, jornada finalizada, no laborable, vacaciones, feriado, inasistencia), progreso de la meta diaria de casos y reportes, y ritmo necesario por día para alcanzar la meta mensual.
  - Disponibilidad: vacaciones (por rango de fechas con normalización de rangos invertidos), feriados, inasistencias y días no laborables personalizados. Los días efectivos del mes excluyen estas ausencias para los cálculos de productividad.
  - Metas: objetivo mensual de casos y reportes, además de la meta diaria. El progreso se calcula sobre los días efectivos (descontando vacaciones, feriados, inasistencias y días no laborables).
  - Accesos y credenciales personales (localmente en el dispositivo, nunca se exportan ni se incluyen en respaldos): usuarios, contraseñas, URLs y notas de acceso a sistemas del trabajo.
  - Sugerencias inteligentes personales: avisos de meta cercana, fin de jornada, vacaciones próximas y ritmo mensual necesario.
- El calendario ahora puede mostrar la disponibilidad personal (vacaciones, feriados, inasistencias y días no laborables) con un botón "Disponibilidad" en la barra de herramientas para mostrarla u ocultarla.
- Configuración → Productividad: nueva sección "Mi Espacio (personal)" con interruptores para mostrar resumen de jornada, ritmo necesario, disponibilidad en calendario, recordatorios de jornada y de metas, microinteracciones de objetivos y sugerencias inteligentes personales.
- La meta diaria de casos de la app ahora se lee de las metas del operador (con migración automática de la meta diaria previa de productividad).

### Correcciones

- \`isInRange\` normaliza rangos de vacaciones con fecha final anterior a la inicial (se trata como un único día).

## [1.1.2] - 2026-08-07

### Funciones nuevas

- Funciones de productividad personal (opcionales y configurables):
  - Memoria operativa (\`userContextMemory\`): registro de últimos casos vistos y botón "Continuar donde lo dejaste".
  - Objetivos personales: meta diaria configurable de casos cargados (por defecto 5) con barra de progreso y reseteo diario automático.
  - La meta de reportes diaria se calcula automáticamente según los casos cargados el día hábil anterior (ignora fines de semana y días sin casos).
  - Micro-analítica personal: seguimiento acumulativo de movimientos y cambios de estado diarios.
  - Plantilla de carga estructurada en Nuevo Caso: panel desplegable para pegar fichas con formato de lista específico (\`NOMBRE\`, \`TELEFONO\`, \`LOCALIDAD\`, \`ART\`, \`PROFESION\`, \`INGRESO\`, \`LESION\`, \`CITA\`, \`OBSERVACIONES\`, \`TAGS\`, \`COMENTARIOS\`) con ejemplo visible y parseo automático.
- Configuración de Productividad: nueva sección en Configuración para activar/desactivar individualmente memoria operativa, sugerencias inteligentes, objetivos, micro-analítica y micro-interacciones.

## [1.1.1] - 2026-08-06

### Funciones nuevas

- Ayuda y guías actualizadas.
  - Tour interactivo único y completo (13 pasos) que recorre todas las funciones
    y vistas en detalle: Dashboard con sus 6 pestañas, Tablero, Tabla, Reportes,
    Útiles, Búsqueda, Nuevo Caso, Carga de reporte, Calendario, Bloc de Notas,
    Configuración, Notificaciones y Ayuda.
  - El tour se inicia desde Ayuda → Tour interactivo y desde Cómo usar.
  - Se agregaron marcadores de tour a los botones de Calendario, Bloc de Notas y Ayuda.
  - "Acerca de Vistas" actualizado: vista previa de importación paginada, reparación
    de columnas CSV y detalle de las 6 pestañas del Dashboard (incluida Analítica).
  - FAQ ampliada: importación CSV, búsqueda con #etiqueta y @comentario, tour
    interactivo, personalización y alertas del Dashboard, y descarga de la guía.
  - Glosario ampliado: funnel de conversión, insight, alerta automática, búsqueda
    global, importación, vista previa y métricas configurables.
  - Guía de Usuario reescrita: Dashboard 2.0, importación CSV, búsqueda avanzada,
    atajos corregidos (Ctrl+1-5) y solución de problemas ampliada.

### Correcciones

- Botón "Imprimir / PDF" de la guía: no abría la ventana de impresión por la feature
  "noopener" de window.open (que según el spec devuelve null). Ahora se corta la
  relación con el opener manualmente y la ventana funciona.
- Se corrigió el texto literal "{APP_VERSION}" que aparecía en el pie de la guía
  impresa (ahora muestra el número de versión real).
- Se eliminó código muerto en Ayuda y Guías que referenciaba variables inexistentes.
- Atajos Ctrl+1-5 ahora cambian correctamente entre Dashboard, Tablero, Tabla,
  Reportes y Útiles (antes mapeaban a vistas inexistentes como "estadisticas").
- Los acordeones de "Acerca de Vistas" ahora arrancan plegados (antes abiertos).
- Se corrigió el toggle "Confirmaciones antes de acciones": respetaba el valor por
  defecto (desactivado) y ahora aplica a las eliminaciones de casos, notas, eventos
  y datos (si está apagado, las acciones se ejecutan directamente).
- Se corrigió el toggle "Confirmaciones" en Configuración → Sistema → UX, que
  aparecía activado por defecto de forma inconsistente con Ajustes Generales.

### Mejoras

- Las notificaciones ahora se muestran únicamente como toasts dentro de la
  aplicación. Se eliminaron las notificaciones de escritorio (API Notification)
  y el archivo de sonido externo /notification.mp3; los sonidos se generan con
  Web Audio API. Se quitó el canal "Escritorio" de Configuración → Notificaciones.
- Se agregó el Modo Bajo Consumo en Configuración → Sistema → UX: desactiva
  animaciones, microinteracciones y transiciones para priorizar el rendimiento.
- Las opciones de UX ahora se aplican globalmente: "Animaciones y transiciones"
  y "Microinteracciones" controlan las clases CSS de toda la aplicación.
- Nuevos sonidos de acción: crear caso, guardar, eliminar, copiar al portapapeles
  y completar el tour (sonidos cortos generados por Web Audio API).
- Microinteracciones en botones: efecto de presión (press) al hacer clic.
- Scroll-chaining corregido: los modales y overlays contienen su scroll y no
  propagan el desplazamiento al fondo de la página.
- Configuración reorganizada: General | Apariencia | Notificaciones | Búsqueda |
  Sistema | Avanzado.
- Felicitaciones con confeti y sonido al mover o cargar un caso a "Firmo" o
  "Pendiente", y al alcanzar el Logro de Objetivos del mes (14 firmas).
- Unificación del sistema de notificaciones: los toasts y la tarjeta de celebración
  se apilan en una sola columna inferior derecha para evitar superposiciones.
- Animación de deslizamiento horizontal para todas las notificaciones: entrada de
  derecha a izquierda y salida de izquierda a derecha.
- Sonido sutil de deslizamiento (ramp de frecuencia corta) al aparecer notificaciones.
- Los sonidos de acción ahora también se aplican al cargar/editar/eliminar
  reportes, comentarios y etiquetas, y a las eliminaciones de Configuración
  (casos por mes, notas, eventos, backups y todos los datos).
- Bloqueo de scroll de fondo corregido en overlays de pantalla completa
  (Configuración, Ayuda/Cómo usar, Búsqueda Global, Búsqueda de Notas y Centro
  de Notificaciones): ahora bloquea html + body con un contador que soporta
  varios overlays abiertos a la vez.

### Funciones nuevas

- Importación CSV robusta con reparación de columnas.
  - Nuevo parser compartido (\`src/utils/csvParse.js\`) que respeta comillas, comillas
    escapadas (\`""\`) y saltos de línea dentro de campos, y normaliza finales de línea
    (CRLF/CR/LF) y BOM.
  - Si una fila trae más celdas que columnas (por ejemplo, textos con comas "peladas"
    sin comillas, típico de CSVs re-editados en Excel o exportados por otros sistemas),
    el excedente se fusiona en la última columna conservando los datos en lugar de
    desplazar las columnas.
  - El mismo parser se usa en la Vista previa de importación, en el Asistente de
    importación (CSV) y en la importación directa desde la copia de seguridad.
  - Se eliminó el importador CSV obsoleto de \`ExportarExcel\` que cortaba los campos con
    \`split(",")\` y no soportaba comillas.
- Vista previa de importación con paginación y scroll persistente.
  - La tabla de la vista previa de casos ahora muestra 50 casos por página con
    controles Anterior / Siguiente para revisar archivos con muchos casos.
  - La vista previa de importación de Útiles (configuración) muestra los valores de
    forma legible: arreglos y objetos se resumen con conteos y fragmentos JSON en vez
    de mostrar "[object Object]".
  - En ambas vistas previas las barras de desplazamiento horizontal y vertical son
    estables y siempre visibles cuando hace falta (gutter reservado con
    \`scrollbar-gutter: stable\`), incluso con tablas anchas.
- Documentación en Ayuda y Guías más accesible.
  - La vista de documentos ahora usa pestañas accesibles (tablist/tab/tabpanel) con
    estado seleccionado, navegación por flechas y roving tabindex.
  - El README se muestra por defecto en lugar de un estado vacío.
  - Se eliminó el documento LICENSE.md (Licencia MIT) de la documentación de usuario
    y el mensaje "Selecciona un documento para ver su contenido".
  - El contenido tiene scroll vertical/horizontal estable y reserva de gutter.

### Funciones nuevas

- Sistema de easter eggs visuales basado en el uso real de la app.
  - Detecta patrones de comportamiento del operador (cambios de filtro, movimientos de
    casos en el tablero, análisis con drill-down, edición de casos, navegación entre
    vistas, sesión larga o inactividad) y muestra mensajes breves con iconos.
  - Son 20 easter eggs distintos con niveles sutil / normal / notable; cada uno se
    dispara una sola vez por sesión y dura unos 4 segundos, sin bloquear el trabajo.
  - Se pueden activar o desactivar desde Configuración → Apariencia → "Efectos visuales
    y easter eggs" (guardado en \`app_ui_settings\`). Requieren el flag de build
    \`REACT_APP_EASTER_EGGS=true\`.

### Funciones nuevas

- Búsqueda por etiquetas (\`#\`) y comentarios (\`@\`).
  - El motor de búsqueda indexa las etiquetas de casos, notas y eventos y la primera
    palabra de los comentarios de los casos.
  - Para buscar por etiqueta escribí \`#etiqueta\` (por ejemplo \`#amable\` o \`#desconfiado\`):
    se muestran solo los casos, notas y eventos con esa etiqueta.
  - Para buscar por comentario escribí \`@texto\` (por ejemplo \`@Desconfiada con la
    virtualidad\`): se muestran los casos cuyo comentario empieza con ese texto.
  - La barra de búsqueda del header y la Búsqueda Global (Ctrl+K) ahora comparten el
    mismo motor y la misma lógica, tanto para texto libre como para \`#\` y \`@\`.
  - Las etiquetas también se ven como pills en las tarjetas, modales, listas,
    calendario y en los resultados de búsqueda, con el prefijo \`#\`.

- Etiquetas en el calendario.
  - Los eventos del calendario ahora admiten etiquetas (\`#\`), se muestran como pills en la
    lista de eventos y son buscables desde el buscador.

- Estadísticas sin fines de semana.
  - La serie "Evolución últimos 30 días" ignora sábados y domingos (días hábiles).
  - El gráfico agrega separadores por semana (S1, S2, …) para identificar a qué semana
    pertenece cada pico; el tooltip indica el número de semana.

### Correcciones

- Fechas de casos importados por CSV ya no caen en 2001.
  - Al importar un CSV, la columna "Fecha" podía llegar en formato \`DD/MM/YYYY\` o \`DD/MM\`
    (formato argentino). JavaScript interpreta esas cadenas en formato estadounidense
    (\`MM/DD\`), por lo que "15/07/2026" se volvía inválida y "07/08" se convertía en
    julio de 2001.
  - Ahora el importador normaliza las fechas a ISO (\`YYYY-MM-DD\`): "15/07/2026" queda como
    \`2026-07-15\` y "07/08" como \`08/07\` del año en curso. Lo mismo aplica a \`fechaFirma\`.
  - Los filtros y las estadísticas (mes, día, evolución de los últimos 30 días, casos
    vencidos, tiempo promedio a firma) también corrigen fechas viejas ya guardadas en
    formato \`DD/MM/YYYY\` o \`DD/MM\`: las leen correctamente en vez de tratarlas como 2001.
  - La normalización cubre las tres vías de importación (Importar CSV de la vista de
    importación, backups y restauración de casos).

### Correcciones de interfaz y usabilidad

- Tooltips de los gráficos en modo oscuro (Analítica).
  - Los gráficos "Casos por provincia" y "Casos por estudio" mostraban el tooltip con
    el texto en color negro (ilegible en tema oscuro) y repetían el nombre del grupo dos
    veces. Ahora el tooltip usa los colores del tema y muestra el dato una sola vez.
- Actividad reciente limitada.
  - La lista "Actividad reciente" mostraba todos los movimientos; ahora muestra los
    últimos 5 con un botón "Ver todo" para desplegar el resto.
- Tarjetas de Performance y Tiempo (Rendimiento).
  - Muestran el valor correcto (con la unidad, por ejemplo "días") y una descripción de
    la estadística oculta detrás de un botón de información dentro de cada tarjeta.
  - "Tiempo promedio a firma" ahora usa la fecha de firma real (o el último reporte) en
    lugar de la fecha de hoy, y "Tiempo sin actividad" normaliza las fechas \`DD/MM\`.
- Título duplicado en Logro de Objetivos.
  - Se eliminó el título repetido que se veía en el widget del dashboard.
- Filtro de tarjetas consistente en el Dashboard.
  - Todas las tarjetas de métricas de todas las pestañas (Resumen, Rendimiento,
    Geografía y Estudios) aplican el mismo filtro/drill-down que las tarjetas de
    Analítica, y las pestañas mantienen un orden consistente (tarjetas primero).
- Tarjeta "incluido por reporte" en el Tablero.
  - El borde punteado ya no "popa" al pasar el mouse: el hover es más sutil y coherente
    con el tema.
- Bordes de color del modal de caso en tema claro.
  - El modal de detalle muestra correctamente el borde de color del estado (con sombra
    del tema) también en tema claro.
- Headers de modales rediseñados.
  - "Nuevo caso", "Editar caso" y "Cargar reporte" tienen un header acorde al tema (sin
    fondo de color fijo), título más grande y la pill del estado bien visible.
- Editar/eliminar reportes desde "Cargar reporte".
  - El modal de reporte rápido permite editar o eliminar los reportes existentes además
    de cargar uno nuevo.
- Selector de día multi-selección.
  - El filtro "Día" permite elegir varios días a la vez y solo muestra los días que
    tienen casos en el mes seleccionado (los vacíos no se muestran). Tiene el mismo alto
    que el filtro de mes, sin barra de desplazamiento, y un botón "Todos" para limpiar la
    selección.
  - Al seleccionar un día, los demás días con casos siguen visibles para poder combinar
    varios (ya no desaparecen las demás opciones).

### Mejoras de Analítica y Dashboard

- Dashboard reorganizado.
  - La pestaña Analítica se enfoca solo en gráficos y tarjetas: KPIs, insights,
    distribución por estado y categoría, evolución de 30 días, provincias, estudios,
    tipo de ingreso, el funnel de conversión y la actividad de los últimos 7 días.
  - El funnel de conversión y la actividad semanal son exclusivos de Analítica.
  - Las alertas, la actividad reciente y los últimos casos se muestran en la pestaña
    Resumen.
- Nuevos gráficos en Analítica.
  - "Distribución por categoría" (activos, firmados, perdidos y sin reporte).
  - "Casos por tipo de ingreso".
  - "Evolución semanal": casos, firmas y tasa de conversión agregados por semana de los
    últimos 30 días hábiles.
  - "Casos por aseguradora" y "Casos por localidad": barras apiladas con el desglose por
    categoría del pipeline (firmados, en contacto, pendientes y perdidos).
  - "Conversión por estudio": compara la tasa de conversión de cada estudio jurídico con
    colores según el nivel (verde, ámbar o rojo).
- Gráficos con descripción y mejor legibilidad.
  - Todos los gráficos de Analítica tienen un botón de información que muestra una breve
    descripción de la estadística, con el mismo patrón que las tarjetas de métricas.
  - Los gráficos se ven mejor en tema claro y oscuro: colores, tooltips y fondos de hover
    adaptados al tema.
- Documentos sin asteriscos de negrita.
  - README, CHANGELOG y LICENCIA dejan de usar asteriscos para remarcar texto: al
    mostrarse en texto plano dentro de la app, los asteriscos se veían como caracteres
    sueltos.

## [1.1.0] - 2026-08-05

### Funciones nuevas

- Condicionales de Estudios Jurídicos.
  - Nueva sección en Útiles que registra qué estudios no toman todas las aseguradoras
    o las toman con condiciones específicas de ingreso y lesión.
  - Cada condición se asocia a un estudio y una aseguradora, con tipo de ingreso, lesión
    y observación opcionales, y se clasifica como "No toma" o "Con condiciones".
  - Búsqueda por estudio, aseguradora, lesión u observación, y filtro por tipo de condición.

- Estudios Jurídicos rediseñado.
  - Se agregó el campo Dirección con un desplegable: cada estudio puede tener
    varias direcciones (una por sucursal/ciudad) y el operador puede visualizarlas todas,
    agregar nuevas, editarlas o eliminarlas.
  - Carga Prolegal y Entrevistador se eliminaron de "Estudios Jurídicos": esos campos
    ahora son exclusivos de la vista Prolegal.

- Vista Prolegal simplificada.
  - La vista Prolegal muestra una lista con tres columnas: Estudio Jurídico,
    Carga Prolegal y Entrevistador, con opción de agregar y eliminar estudios.
  - Se quitaron las tarjetas, sucursales, localidades y direcciones de esta vista.

- Etiquetas legibles.
  - Las etiquetas del modal de edición de caso se muestran como texto plano (ya no como
    pills), para una mejor visualización.

- Configuración Avanzada.
  - Nuevo grupo "Avanzado" en Configuración con: Dashboard, Estados de Caso,
    Tipos de Ingreso e Importación.
  - Estados de Caso configurables con nombre, color y peso. El peso se usa para
    corregir las estadísticas: un estado con peso 0 no suma en los totales del dashboard.
  - Tipos de Ingreso editables: se agregan, renombran o eliminan las categorías
    disponibles al cargar un caso.

- Casos en el mes del último reporte.
  - Un caso aparece en un mes si se creó en ese mes o si su último reporte fue en ese mes.
  - Los meses disponibles consideran también los reportes.
  - En el tablero (Kanban) y en Reportes, los casos que aparecen por su último reporte se
    marcan con un borde punteado y la etiqueta "por reporte".

### Correcciones

- Estadísticas y gráficos del Dashboard corregidos.
  - Las métricas del tablero analítico ahora respetan los estados y categorías configurados
    (colores y clasificaciones personalizadas) y usan el peso de cada estado en los
    totales ponderados.
  - El funnel de conversión ya no usa nombres de estado fijos; deriva las etapas de las
    categorías configuradas.
  - La distinción entre meses con actividad se conserva al pasar por los filtros globales.

- Evolución últimos 30 días corregida.
  - El gráfico ahora lee las firmas y las cuenta el día en que se cargó el reporte de la
    firma (último reporte del caso). Si el caso no tiene reporte, usa la fecha de firma.
  - Antes solo usaba \`fechaFirma\`, que suele estar vacía cuando la firma se registra cargando
    un reporte, por lo que la línea de firmas salía en cero y el gráfico era incorrecto.

### Exportación / Importación

- Los backups y la exportación/importación de configuración incluyen automáticamente las
  nuevas condicionales, los estados con peso y los tipos de ingreso.

## [1.0.4] - 2026-08-03

### Correcciones

- Filtros de mes y día unificados entre el Dashboard y las demás vistas.
  - El Dashboard (Analítica) usaba su propio filtro de mes/día, con propiedades y
    comportamiento distintos al resto de la app (Kanban, Tabla y Reportes).
  - Ahora el Dashboard usa el mismo filtro global de mes y día que las demás vistas:
    mismas opciones ("Todos los meses" o un mes específico), mismo selector de día,
    mismas reglas de filtrado y mismo estado compartido. Al cambiar el mes o el día en
    el Dashboard, se refleja en las demás vistas (y viceversa), y el total de casos
    coincide en todas ellas.

## [1.0.3] - 2026-08-03

### Correcciones

- Versión de caché del service worker (PWA) actualizada.
  - La caché del service worker quedaba fija entre versiones, por lo que la app instalada
    como PWA podía seguir sirviendo archivos viejos (por ejemplo, documentación
    desactualizada) aunque se hubiera publicado una versión nueva.
  - Al cambiar el nombre de la caché, la PWA instalada detecta la actualización, precarga
    los archivos nuevos y elimina las cachés antiguas al activarse.

## [1.0.2] - 2026-08-03

### Correcciones

- La vista de Documentación siempre muestra los archivos de \`src/docs\`.
  - La documentación (README.md, CHANGELOG.md y LICENSE.md) se integra a la aplicación
    directamente desde \`src/docs\` al compilar, en lugar de copias duplicadas que podían
    quedar desactualizadas.
  - Un script (\`scripts/build-docs.js\`) genera los contenidos en cada \`npm start\` y
    \`npm run build\`, de modo que la interfaz refleja siempre la última versión de los
    documentos. Se eliminó la dependencia de la red (fetch) para mostrarlos.

## [1.0.1] - 2026-08-03

### Correcciones

- Corrección del sistema de backups
  - La restauración de un backup completo ya no se pierde al recargar la app: antes, el
    estado de la aplicación en memoria sobrescribía los datos recién restaurados (pasaba
    tanto en la restauración manual desde archivo como en el historial de backups
    automáticos). Ahora la restauración es consistente y conserva los datos del respaldo.
  - Al restaurar un backup se eliminan correctamente las claves de configuración viejas
    que no forman parte del respaldo, sin dejar restos de versiones previas.
  - Importar la configuración desde \`configuracion_derivaciones_*.json\` ya no rompe los
    campos de configuración: los valores faltantes se completan con los valores por defecto.
  - Se agregaron tests de regresión para la exportación/importación de backups y el merge
    de configuración.

## [1.0.0] - 2026-08-03

### Release principal

Primera versión estable de la nueva base. Reúne todas las funciones de la aplicación.

### Gestión de casos

- Crear, editar, eliminar y duplicar casos con validación de datos obligatorios.
- Deshacer la última acción (crear, editar, eliminar, cambiar estado, cargar reporte).
- Búsqueda en tiempo real por nombre, teléfono, localidad y aseguradora.
- Filtros por mes, día, estado y categorías (activos, pendientes, hoy, firmados, perdidos).
- Estados de caso configurables con colores personalizados por estado.
- Ver caso completo con historial de reportes, comentarios, notas y agenda vinculadas.

### Vista Kanban

- Tablero con columnas por estado y arrastre de tarjetas entre estados.
- Pipeline visual de conversión y tarjetas con datos clave del caso.

### Vista Tabla

- Tabla con columnas personalizables, ordenamiento y paginación configurable.
- Selección múltiple y exportación de casos seleccionados en PDF.

### Reportes

- Carga de reportes rápida y plantillas de reportes configurables.
- Historial completo de reportes por caso con exportación a PDF.
- Logro de objetivos: seguimiento de 14 firmas por mes.

### Estadísticas y Dashboard

- KPIs (total, activos, firmados, sin reporte, no viables) con tarjetas configurables.
- Funnel de conversión, gráfico de actividad semanal y distribución por estado.
- Análisis por geografía (provincias), estudios jurídicos y estados.
- Mapa de casos por localidad, tareas del día y últimos casos agregados.
- Widgets personalizables (actividad, eventos, sin reporte, notas, resumen) e insights automáticos.

### Notas

- Bloc de Notas con editor de texto enriquecido.
- Historial de versiones por nota y búsqueda en notas.
- Notas vinculadas a casos con navegación directa.

### Calendario

- Calendario de citas y eventos con creación desde el caso o desde una nota.
- Vistas y filtros por fecha, eventos vinculados a casos.

### Útiles de trabajo

- Speechs: guiones predefinidos para llamadas con copia al portapapeles.
- Objeciones: respuestas para objeciones comunes.
- Conversaciones Sugeridas: plantillas por categoría con variables ({OPERADOR}, {NOMBRE}, {HORARIO}).
- Aseguradoras: gestión de ART y Tránsito.
- Lesiones: categorización por tipo (Accidente Laboral, Enfermedad Profesional, No Viable).
- Pasos a Seguir: protocolo de trabajo editable.
- Tips para llamados y Links útiles de referencia.
- Estudios Jurídicos: mapeo por localidad con filtros y observaciones de tránsito.

### Importación y exportación

- Importador inteligente de CSV con mapeo de columnas, detección de duplicados y vista previa.
- Exportar/Importar configuración y útiles en un solo archivo JSON.
- Exportar notas y calendario en JSON.
- Exportar casos en PDF (individuales o seleccionados).

### Sistema de respaldo

- Backup completo en JSON con verificación de integridad (checksum) e importación
  atómica con rollback ante errores.
- Backup automático local con historial rotativo (diario/semanal) y avisos si hace
  mucho que no se respalda.
- Restauración desde archivo o desde el historial de backups automáticos.

### Personalización y apariencia

- Temas oscuro, claro y personalizado con colores base (primario, secundario, terciario)
  que generan toda la paleta.
- Colores por estado de caso personalizables.
- Tamaño de fuente (pequeño, mediano, grande), animaciones y microinteracciones configurables.
- Configuración completa de la app (perfil de operador, formato de fecha y teléfono,
  casos por página, columnas visibles, búsqueda, importación).

### Notificaciones

- Centro de notificaciones persistente con historial y filtros.
- Canales in-app, sonido y escritorio con reglas de prioridad y modo no molestar.
- Agrupación de eventos para evitar spam y campana con contador de no leídas.

### Ayuda y onboarding

- Tour de bienvenida y guías interactivas de uso.
- Panel de ayuda con documentación integrada (guía, atajos de teclado, ejemplos, feedback).
- Formulario de feedback con datos de versión.

### Atajos de teclado

- Nuevo caso, cargar reporte, buscar, duplicar, exportar, cambiar de vista, búsqueda global (Ctrl+K) y más.

### Plataforma

- PWA: instalable en PC y celular, funciona sin conexión y se actualiza sola
  con aviso de nueva versión.
- Shortcuts de acción rápida (Panel principal, Nuevo caso).
- Almacenamiento 100 % local (IndexedDB + localStorage), sin servicios externos.
- Sistema de monitoreo de salud del almacenamiento con avisos de cuota y estado en línea/offline.
`;

export const DOC_LICENSE = `MIT License

Copyright (c) 2026 Yoel Callcenter

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;
