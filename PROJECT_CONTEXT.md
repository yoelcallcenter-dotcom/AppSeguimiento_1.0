# AppSeguimiento — Project Context

Archivo de contexto técnico persistente para agentes/modelos que trabajen en este proyecto.
Léelo primero en cada sesión. Evita re-explorar la arquitectura en cada tarea.

## 1. Identidad del proyecto

- Nombre: **AppSeguimiento** (antes "Seguimiento de Derivaciones" / "Seg. ART"; entradas históricas del CHANGELOG conservan el nombre viejo).
- Versión actual: **1.8.8** (verificada en `package.json` y `src/core/version.js`).
- Framework: React 18 (Create React App, react-scripts 5).
- Build: `react-scripts build` (webpack). Pre-build genera docs (`scripts/build-docs.js` → `src/docs/docsContent.js`, se regenera solo).
- Gestor de paquetes: npm.
- Tipo de aplicación: SPA offline-first / PWA instalable (service worker propio), datos 100% locales.
- Stack clave: Zustand 5 (estado), Dexie 4 (IndexedDB), Tailwind 3 (+ CSS variables), Recharts (gráficos), Tiptap (editor notas), lucide-react (íconos), Fuse.js (búsqueda), DOMPurify (sanitización).
- Idioma de la UI y del código/documentación: español (rioplatense en textos de usuario).

## 2. Comandos principales

| Comando | Qué hace |
|---|---|
| `npm start` | Dev server (ejecuta `prestart`: regenera docs). Requiere `npm install` previo. |
| `npm run build` | Build producción a `build/`. |
| `npm run test:run` | Suite completa con Vitest (una pasada). |
| `npm run test` | Vitest en modo watch (evitar en agentes). |
| `npx vitest run <archivo>` | Un solo archivo de test (usar para iterar rápido). |

- Tests: Vitest + jsdom + fake-indexeddb. Config: `vitest.config.mjs`. Setup en `src/test/`.
- No hay linter configurado más allá de `eslintConfig.react-app` (no ejecutar lint manual).

## 3. Arquitectura principal

```
src/
├── index.js            # Entrada: estilos, fuentes Montserrat locales, notificaciones,
│                       # watchdog/errores globales, registro PWA
├── App.jsx             # Composición principal: vistas, modales, atajos, lógica de casos
├── components/         # UI por dominio (kanban/, tabla/, reportes/, configuracion/,
│                       # modales/, utiles/, notifications/, common/, ayuda/,
│                       # diagnostico/, entities/, estadisticas/)
│   ├── common/         # Base reutilizable: Btn, BtnOutline, Select, TextInput, Toggle,
│   │                   # Pill, Field, Paginacion, TagsManager, Celebration, TagsPills,
│   │                   # EmptyState, OverlayPanel, ConfirmDialog, Spinner,
│   │                   # SystemStatusBanner, UndoBanner, Breadcrumbs, CaseLinker,
│   │                   # GlobalStatsHeader, PhoneLink, MonthDayFilterBar, Modal, Skeleton
│   ├── notifications/  # NotificationBell, NotificationCenter, PersistentAlert, ToastContainer
│   ├── diagnostico/    # IntegridadPanel (verificación de integridad de datos)
│   └── entities/       # EntityPanel (panel de entidades)
├── context/            # Providers: ThemeContext, FontSizeContext, I18nContext,
│                       # FiltersContext, CalendarContext, UXContext
├── core/
│   ├── theme/          # themeTokens.js, themeManager.js, colorUtils.js
│   ├── store/          # useAppStore.js (Zustand global)
│   ├── db/             # appDB.js, casesDB.js, indexedDB.js, versioning.js, dbLifecycle.js
│   ├── notifications/  # notificationStore/Manager/RuleEngine, soundSystem.js
│   ├── celebrations/   # celebrationStore.js (confeti/mensajes)
│   ├── events/         # eventBus pub-sub
│   ├── sync/           # sincronización entre pestañas (BroadcastChannel)
│   ├── alerts/         # attentionRules.js (reglas determinísticas de atención)
│   ├── entities/       # entityRelations.js (relaciones entre entidades)
│   ├── integrity/      # dataValidation.js, integrityService.js, referentialChecks.js,
│   │                   # validationResult.js (capa de integridad de datos)
│   ├── cases/          # caseHistory.js (timeline), caseRepository.js,
│   │                   # caseRelations.js, activityFeed.js
│   ├── status/         # storageHealth.js, systemStatusStore.js (monitoreo de salud)
│   ├── i18n/ error/ monitoring/ storage/ validation/ user/ notes/
├── features/           # Módulos de alto nivel:
│   ├── dashboard/      # Dashboard analítico multi-pestaña + widgets + metricsEngine
│   ├── operator/       # "Mi Espacio": centro de trabajo "Hoy" (TodayCenter) + perfil,
│   │                   # disponibilidad, metas, credenciales, configuración de secciones
│   │                   # (operatorStore.js, operatorMetrics.js, operatorDefaults.js,
│   │                   # miEspacioConfig.js, TodayCenter.jsx)
│   │   └── components/ # ProximaActividad, TimelineActividades, PendientesCard,
│   │                   # AccionesRapidas, ProfileCard, AvailabilityCard, GoalsSection,
│   │                   # CredentialsSection, BienvenidaCard, ProximosEventos,
│   │                   # ProductividadSection, MetasCard, AccesosCard
│   ├── productivity/   # ProductivityWidget, productivityStore.js (memoria/metas/analytics)
│   ├── analytics/      # Motor de insights y analítica personal:
│   │   │               # analyticsEngine.js, insightsConfig.js, periodUtils.js,
│   │   │               # smartInsights.js, useAnalytics.js
│   │   └── components/ # PeriodSelector, ResumenPeriodo, SmartInsightsPanel, TendenciaSemanalCard
│   ├── export/         # CsvExportModal (exportación CSV con filtros)
│   ├── alerts/         # alertsSystem.js (sistema de alertas por eventos próximos)
│   ├── rules/          # rulesEngine.js (motor de reglas determinísticas)
│   ├── calendar/ notes/ search/ import/
├── services/           # backupService.js (export/import atómico), autoBackup.js,
│                       # EstudioService.js, StorageService.js
├── utils/              # backups/ (backupManager, backupMigrator, notesCalendarExport,
│                       #   constants, csvUtils, exportCases, importCases, importConfig, etc.),
│                       # configFormatters.js, dateFilters.js, catalogos.js, exportPDF.js,
│                       # csvParse.js (parser compartido), searchEngine.js (búsqueda #/@),
│                       # behaviorEngine.js (easter eggs/segundo plano), easterEggs.js,
│                       # ubicacionUtils.js, sanitize.js, redact.js, uiSettings.js,
│                       # printWindow.js, helpers.js, bodyScrollLock.js
├── hooks/              # useClipboard.js, useCases.js, useStorage.js, useDebounce.js,
│                       # useKeyboardShortcuts.js, useTheme.js, useFontSize.js,
│                       # useLiveQuery.js, useNotify.js, useRecentEntities.js,
│                       # useAdvancedSearch.js, useCalendar.js,
│                       # useDialogA11y.js, useModal.js, useViewTransition.js
├── validators/         # casoValidator.js (validación de casos)
├── pages/              # Vistas auxiliares (SystemLogs)
├── pwa/ tour/ help/ guide/ faq/ glossary/ docs/ styles/ test/
public/                 # index.html, manifest.json, sw.js, docs/ (copias generadas)
```

## 4. Gestión de datos

- Persistencia local: IndexedDB vía Dexie (`src/core/db/appDB.js`, `casesDB.js`). Nada viaja a servidores.
- Esquema CasesDB v3 (aditiva, no destructiva): incluye tabla `case_history` para timeline de eventos por caso (v1.3.1). Casos antiguos funcionan sin historial previo.
- Esquema AppDB v10: incluye tablas `events`, `notes`, `note_versions`, `auto_backups`, `migration_snapshots`, `templates`, `saved_reports`.
- Estado global: `src/core/store/useAppStore.js` (Zustand). Incluye middleware `persist`
  (clave `app-view-orders`) para órdenes de pestañas/widgets del Dashboard, Tablero,
  Tabla, Reportes y Útiles.
- Configuración de la app: objeto `config` persistido en `localStorage` bajo claves
  definidas en `src/utils/backup/constants.js` (p.ej. `config-art-tracker`). Leer/escribir con
  los helpers existentes, no inventar claves nuevas si ya existe una equivalente.
- Mi Espacio (operador): `src/features/operator/operatorStore.js` (perfil, disponibilidad,
  metas, credenciales — estas últimas nunca se exportan; orden de secciones del "Hoy" en
  `operatorSettings.miEspacioOrder`).
- Productividad: `src/features/productivity/productivityStore.js` (`userProductivitySettings`,
  `userContextMemory`, `userGoals`).
- Entidades principales: **casos** (nombre, teléfono, estado, ART, fechas, reportes,
  comentarios, tags, `lastActivityAt`), **notas**, **eventos de calendario**, **config/útiles**
  (pasos, tips, links, speechs, objeciones, ART, tránsito, lesiones, estudios/mapeo,
  observaciones-tránsito, condicionales, conversaciones).
- Historial de casos: tabla `case_history` en IndexedDB, indexada por `caseId`. Cada evento
  tiene tipo (creación, edición, cambio de estado, firma, nota, reporte, interacción, etc.),
  timestamp y resumen. Se carga solo al abrir el detalle del caso. Los cambios múltiples en
  una edición se agrupan en un único evento.
- Última actividad: `lastActivityAt` en casos, actualizado solo por actividad real (nunca
  por apertura o renderizado). Para casos previos se usa `updatedAt` como fallback.
- Integridad de datos: `src/core/integrity/` ofrece validaciones estructuradas con niveles
  INFO/WARNING/ERROR/CRITICAL, detección de referencias huérfanas y duplicados, recuperación
  de preferencias de órdenes, y protección de restauraciones (bloqueo si vaciaría colección
  existente). Verificación ligera automática al iniciar.
- Backups: JSON con checksum e importación atómica con rollback (`services/backupService.js`).
  `BACKUP_KIND = "appseguimiento-backup"`; se acepta el legacy `"seguimiento-art-backup"`
  (NO eliminar esa compatibilidad). Motor de migración (`utils/backup/backupMigrator.js`)
   detecta y migra backups en formatos v0 y v1 al formato actual (v3) antes de restaurarlos.
  Backup automático antes del cierre de jornada configurable (15 min antes, una vez por jornada).
  Importaciones selectivas soportadas por opciones (casos/notas/eventos/config, categorías
  de útiles, duplicados).
- Sincronización entre pestañas: BroadcastChannel (`core/sync/`); su test es conocido por
  ser flaky bajo carga paralela (reintentar en aislado antes de asumir regresión).

## 5. Sistema de temas

- Lógica centralizada en `src/core/theme/`:
  - `themeTokens.js`: tokens dark/light + mapeo a CSS variables.
  - `themeManager.js`: singleton que aplica temas y persiste en localStorage.
  - `colorUtils.js`: mezcla/generación de paletas para tema personalizado (3 colores base).
- Provider: `src/context/ThemeContext.jsx`.
- Temas: oscuro, claro y personalizado (colores base primario/secundario/terciario +
  colores por estado de caso). Tamaño de fuente aparte (`FontSizeContext`).
- La UI consume SIEMPRE CSS variables: `--color-bg`, `--color-surface`, `--color-surface2`,
  `--color-text`, `--color-text-muted`, `--color-accent`, `--color-border`,
  `--color-success/warning/danger`, `--color-estado-*`.
- Tipografía (1.4.5, rediseñada en 1.4.7, robustecida en 1.4.8): sistema global
  centralizado en `src/core/typography/` (`presets.js`, `typographyManager.js`,
  `fontLoader.js`) + `src/context/TypographyContext.jsx`. Expone tokens
  `--font-ui`, `--font-heading`, `--font-metric`; `--font-family` hereda la fuente
  de interfaz. 7 presets con personalidades diferenciadas desde
  Configuración → Apariencia → Tipografía (Clásico, Editorial, Retro/Humanista,
  Futurista, Monoespaciado/Terminal, Experimental, Minimal/Moderno). Google Fonts
  CDN con swap, solo familias del preset activo; la URL se construye en
  `buildGoogleFontsURL` (única fuente de verdad). El fallback CSS por defecto de
  `--font-ui` es genérico (sin fuente específica). no usa `@fontsource`. PDFs NO
  se ven afectados. Los ids internos de preset no cambiaron (mismos id de 1.4.5),
  solo sus fuentes/nombres; el tamaño de fuente es independiente del preset, y
  en 1.4.8 el reset de tipografía sincroniza también el tamaño (ver
  `typographyManager` + `FontSizeContext`).
- Reglas críticas de compatibilidad visual:
  - Nunca hardcodear colores hex fijos en componentes nuevos/modificados; usar las variables.
  - Todo cambio de UI debe verse correcto en los 3 temas.
  - Los íconos/decoración usan preferentemente `var(--color-accent)` u otra variable temática.
- Calendario (1.5.0): el color de un evento se resuelve según su estado de caso
  vinculado mediante `getEstadoAccent(config, estado)` (única fuente de verdad);
  los eventos sin caso usan el color por prioridad (`PRIORITY_COLORS`). Las
  insignias de tipo de evento y los bloques de contexto de caso usan variables
  temáticas.

## 6. Funcionalidades principales

Módulos verificados presentes:

- **Mi Espacio** (features/operator): vista por defecto al abrir. Centro de trabajo "Hoy"
  (TodayCenter) con 8 bloques ordenables (Bienvenida, Jornada, Próxima actividad, Pendientes,
  Productividad, Metas, Acciones rápidas, Accesos; orden editable en Configuración → Apariencia
  → Vistas). Secciones secundarias: perfil, disponibilidad (vacaciones/feriados/inasistencias),
  metas diarias/mensuales/firmas, accesos personales, sugerencias personales, recordatorios
  de jornada/metas, microinteracciones de objetivos. Exportación PDF con selección de secciones.
- **Dashboard** (features/dashboard): 6 pestañas ordenables (Analítica, Resumen,
  Rendimiento, Geografía, Estudios, Estados), widgets configurables, KPIs, funnel, alertas,
  mapa por localidad, ProductivityWidget (metas/memoria/micro-analítica/sugerencias).
- **Analítica** (features/analytics): selector de período reutilizable (Hoy/Esta semana/Este
  mes/Últimos 7, 30, 90 días), resumen con comparación vs período anterior, motor de insights
  determinístico (sin IA) por categoría, tendencias semanales, análisis por día de la semana
  y horario, rendimiento por aseguradora/estudio, integración con objetivos de Mi Jornada.
  Componentes: PeriodSelector, ResumenPeriodo, SmartInsightsPanel, TendenciaSemanalCard.
- **Historial de casos** (core/cases): timeline cronológico de eventos (creación, edición,
  cambio de estado/estudio/aseguradora, firma, nota, reporte, interacción). Tabla `case_history`
  en IndexedDB. Detección de casos inactivos. Última actividad y próximo seguimiento calculado.
- **Kanban/Tablero**: drag & drop entre estados; estados y tipos de ingreso configurables.
- **Tabla**: filtros, columnas seleccionables, selección múltiple, acciones masivas.
- **Reportes**: historial de reportes por caso, carga rápida (modal), export CSV/PDF.
- **Calendario** (features/calendar): citas/eventos; muestra disponibilidad personal opcional.
- **Notas** (features/notes): editor Tiptap, guardado manual, vinculación con casos;
  export/import JSON junto a calendario.
- **Búsqueda global** (features/search): Ctrl+K sobre casos/notas/eventos con historial.
  Motor unificado que soporta búsqueda por `#etiqueta` y `@comentario`.
- **Útiles** (components/utiles): speechs, objeciones, conversaciones sugeridas,
  aseguradoras ART/tránsito, lesiones, pasos, tips, links, estudios jurídicos,
  observaciones de tránsito, condicionales (agrupados por estudio).
- **Configuración** (components/configuracion/ConfiguracionView.jsx): grupos
  General (general/columnas/datos), Apariencia, Notificaciones, Búsqueda, Productividad y
  Avanzado (ux, dashboard-config, estados-caso, tipos-ingreso, importacion, diagnostico).
  ~3000 líneas; editar con contexto local preciso, no releerlo completo sin necesidad.
- **Diagnóstico > Integridad** (components/diagnostico/IntegridadPanel.jsx): verificación
  completa de datos (huérfanos, duplicados, preferencias), log rotativo de eventos, reparación
  segura de órdenes de secciones con confirmación.
- **Integridad de datos** (core/integrity): validaciones estructuradas con niveles
  INFO/WARNING/ERROR/CRITICAL, detección de referencias huérfanas y duplicados, protección
  de restauraciones (bloqueo si vaciaría colección existente), verificación ligera al iniciar.
- **Reglas de atención** (core/alerts/attentionRules): reglas determinísticas para identificar
  casos que requieren atención y próximas acciones, sin IA ni predicciones.
- **Sistema de alertas** (features/alerts/alertsSystem): monitoreo de eventos próximos (24h),
  recordatorios automáticos, integración con el motor de reglas.
- **Motor de reglas** (features/rules/rulesEngine): evalúa condiciones para alertas y
  sugerencias de forma determinística.
- **Importación/Exportación**: CSV de casos (mapeo auto/manual/plantilla, estrategias de
  duplicados, modo agregar/reemplazar-mes, preview paginado) en features/import; exportación
  CSV con filtros (CsvExportModal) en features/export; útiles JSON por categoría;
  notas/calendario JSON; backup completo.
- **Ayuda**: guía (guide/), FAQ (faq/), glosario, "Cómo usar", feedback, SystemLogs,
  tour interactivo (tour/).
- **PWA**: instalación, actualización con aviso, shortcuts, offline total (pwa/, public/sw.js).
- **Notificaciones** (core/notifications + components/notifications): pipeline central único
  Acción → Evento → Prioridad → Sistema → Centro/Toast/Sonido vía `notificationManager`
  (orquestador), `ruleEngine` (prioridad baja/media/grave y deduplicación), `soundSystem`
  (Web Audio) y `actionFeedback` (catálogo copiar/crear/guardar/eliminar/importar/exportar/
  restaurar/reprogramar). Toasts, campana, centro y alertas persistentes renderizados desde
  componentes de notifications. NO se usa Browser Notification API ni alert() nativo.
  Los recordatorios de calendario se enrutan por `notificationManager`. `useAppStore.addToast`
  también enruta al `notificationStore` central (única fuente).
- **Sistema de animaciones** (v1.3.4): tokens centralizados de duración/easing, transiciones
  por propiedad (no `transition-all`), soporte `prefers-reduced-motion`, botones con estados
  loading/success-flash, modales con scale-in, toasts con entrada/salida secuencial.
- **Easter eggs**: detección de patrones de uso (cambios de filtro, drag & drop, sesión larga,
  etc.) con 20 easter eggs en 3 niveles. Configurable en Apariencia. Requiere flag de build
  `REACT_APP_EASTER_EGGS=true`.
- **Monitoreo de sistema** (core/status): banner de estado del almacenamiento (SystemStatusBanner),
  monitoreo de salud de IndexedDB, avisos de cuota y estado online/offline.

## 7. Convenciones y restricciones críticas

Reglas permanentes:

1. No eliminar funciones existentes salvo solicitud explícita del usuario.
2. No cambiar la versión ni nombres públicos salvo solicitud explícita.
3. Evitar refactors no relacionados a la tarea.
4. Mantener compatibilidad con los 3 temas (variables CSS, nada de colores fijos).
5. Mantener compatibilidad con datos existentes: no renombrar claves de localStorage ni
   estructuras de IndexedDB; los imports de backups deben seguir aceptando formatos legacy.
6. Minimizar cantidad de archivos tocados.
7. No duplicar fuentes de verdad: si un helper/store/exportador ya existe, reutilizarlo.
8. Reutilizar componentes comunes (Btn, Toggle, Select, Pill, etc.) antes de crear nuevos.
9. Después de modificar código, ejecutar la validación relevante:
   `npx vitest run <tests afectados>` y/o `npm run build`. Suite completa solo al cerrar.
10. No modificar archivos fuera del alcance de la tarea.
11. No asumir arquitectura: verificar en los archivos reales antes de afirmar.
12. No explorar el proyecto completo por defecto; leer solo lo necesario.
13. Preferir cambios mínimos y localizados.
14. No releer archivos ya analizados en la misma tarea si no fueron modificados.
15. No generar planes complejos para tareas simples.
16. No usar herramientas externas (web, etc.) si la respuesta ya está en el proyecto.
17. No hacer búsquedas globales (grep recursivo masivo) sin razón técnica concreta.
18. Textos de usuario en español rioplatense; sin emojis salvo pedido explícito.
19. No commitear a git salvo pedido explícito del usuario.

## 8. Política de subagentes y eficiencia

### Política de uso de subagentes

#### Tareas normales: SUBAGENTES DESACTIVADOS

Los subagentes NO deben utilizarse por defecto para:

- cambios pequeños de UI;
- correcciones localizadas;
- cambios de texto;
- ajustes de CSS;
- modificaciones en uno o pocos archivos;
- corrección de imports;
- bugs con error claramente identificado;
- cambios de configuración;
- actualización de documentación;
- modificaciones de formularios;
- ajustes de componentes existentes;
- tareas donde los archivos afectados ya son conocidos;
- tareas que puedan resolverse leyendo menos de aproximadamente 5 archivos.

Para estas tareas:

1. No crear subagentes.
2. No delegar exploración.
3. No crear tareas paralelas.
4. No realizar auditorías.
5. Leer directamente los archivos afectados.
6. Aplicar el cambio mínimo necesario.
7. Ejecutar únicamente la validación correspondiente.

#### Cuándo SÍ se permiten subagentes

Solo con razón técnica clara:

- auditoría completa de una arquitectura grande;
- investigación simultánea de varios sistemas independientes;
- búsqueda de una causa desconocida en múltiples módulos;
- migraciones grandes;
- refactors arquitectónicos complejos;
- análisis de seguridad;
- análisis de rendimiento a escala global;
- tareas explícitamente solicitadas como auditoría o investigación profunda.

Incluso en esos casos:

- usar la menor cantidad posible de subagentes;
- definir un objetivo específico para cada subagente;
- evitar exploración duplicada;
- consolidar resultados antes de modificar código;
- no permitir que varios subagentes modifiquen los mismos archivos;
- no usar subagentes para tareas que puedan resolverse directamente.

#### Regla de decisión

Antes de crear un subagente, evaluar:

"¿Esta tarea puede resolverse correctamente leyendo directamente los archivos afectados?"

Si la respuesta es sí: NO usar subagentes.

#### Política por defecto

SUBAGENTES DESACTIVADOS PARA TAREAS NORMALES. Solo se habilitan cuando la complejidad
real de la tarea lo justifique.

## 9. Archivos clave

| Área | Archivo/Directorio | Responsabilidad |
|---|---|---|
| Entrada | `src/index.js` | Bootstrap: estilos, PWA, notificaciones, watchdog |
| App | `src/App.jsx` | Composición de vistas, modales, atajos, CRUD de casos |
| Estado global | `src/core/store/useAppStore.js` | Zustand; entidades + UI + persistencia de órdenes |
| Temas | `src/core/theme/` + `src/context/ThemeContext.jsx` | Tokens, manager, provider |
| DB | `src/core/db/appDB.js`, `casesDB.js` | Dexie/IndexedDB y versionado (appDB v8, casesDB v3) |
| Historial casos | `src/core/cases/caseHistory.js` | Timeline de eventos por caso |
| Repositorio | `src/core/cases/caseRepository.js` | Acceso a datos de casos |
| Integridad | `src/core/integrity/integrityService.js` | Validación, huérfanos, duplicados, reparación |
| Reglas atención | `src/core/alerts/attentionRules.js` | Reglas determinísticas de casos que requieren atención |
| Config app | `src/utils/backup/constants.js` | Claves localStorage y defaults de config |
| Backups | `src/services/backupService.js` | Export/import JSON atómico con checksum |
| Migración backups | `src/utils/backup/backupMigrator.js` | Migra backups v0/v1 al formato actual |
| Auto-backup | `src/services/autoBackup.js` | Frecuencias, recordatorios, historial, backup de jornada |
| Configuración | `src/components/configuracion/ConfiguracionView.jsx` | Panel completo (~3000 líneas) |
| Diagnóstico | `src/components/diagnostico/IntegridadPanel.jsx` | Verificación de integridad de datos |
| Mi Espacio | `src/features/operator/` | Centro "Hoy" (TodayCenter), perfil, disponibilidad, metas, settings operador |
| Export PDF | `src/features/operator/PdfExportModal.jsx` | Exportación PDF de Mi Espacio |
| Productividad | `src/features/productivity/` | Widget dashboard + settings (interacciones, sugerencias) |
| Dashboard | `src/features/dashboard/` | Pestañas, widgets, metricsEngine |
| Analítica | `src/features/analytics/` | Motor de insights, período, tendencias, SmartInsightsPanel |
| Export CSV | `src/features/export/CsvExportModal.jsx` | Exportación CSV con filtros |
| Alertas | `src/features/alerts/alertsSystem.js` | Sistema de alertas por eventos próximos |
| Reglas | `src/features/rules/rulesEngine.js` | Motor de reglas determinísticas |
| Plantillas | `src/features/templates/` | Sistema de plantillas reutilizables |
| Import CSV | `src/features/import/CSVImporter.jsx` | Parseo, mapeo, plantilla, validaciones |
| Parser CSV | `src/utils/csvParse.js` | Parser compartido (comillas, saltos, BOM) |
| Búsqueda | `src/utils/searchEngine.js` | Motor de búsqueda con #etiqueta y @comentario |
| Integridad UI | `src/core/integrity/dataValidation.js` | Validaciones estructuradas de datos |
| Referencias | `src/core/integrity/referentialChecks.js` | Detección de huérfanos y duplicados |
| Salud storage | `src/core/status/storageHealth.js` | Monitoreo de salud de IndexedDB |
| Easter eggs | `src/utils/easterEggs.js` | Detección de patrones de uso |
| Comportamiento | `src/utils/behaviorEngine.js` | Tracking de eventos de comportamiento |
| Sanitización | `src/utils/sanitize.js` | Limpieza de datos de entrada |
| Ubicaciones | `src/utils/ubicacionUtils.js` | Normalización de localidades/provincias |
| Sonidos | `src/core/notifications/soundSystem.js` | Tonos Web Audio; gate de micro-interacciones |
| Celebraciones | `src/core/celebrations/celebrationStore.js` | Confeti/mensajes; gate interactionsEnabled |
| Búsqueda global | `src/features/search/GlobalSearch.jsx` | Ctrl+K; releer config al abrir |
| Catálogos | `src/utils/catalogos.js` | Estados de Caso y Tipos de Ingreso; `detectarTipoIngresoPorKeywords` (pegado inteligente con palabras clave + prioridad) |
| Portapapeles | `src/utils/copyToClipboard.js` | Copiar texto con fallback seguro (`execCommand`) cuando `navigator.clipboard` no existe; nunca lanza errores |
| Hooks | `src/hooks/useClipboard.js` | Copiar al portapapeles con timeout y feedback |
| Validación | `src/validators/casoValidator.js` | Validación de campos de caso |
| Docs UI | `src/docs/docsContent.js` | Generado por `scripts/build-docs.js`; no editar a mano |
| PWA | `public/sw.js`, `public/manifest.json`, `src/pwa/pwa.js` | Offline, instalación, cache |
| Version | `src/core/version.js` | APP_NAME/APP_VERSION (fuente de verdad de versión en UI) |

## 10. Flujo recomendado para futuras tareas

### Para tareas normales

1. Leer PROJECT_CONTEXT.md primero.
2. Identificar el objetivo exacto.
3. Determinar los archivos mínimos necesarios (apoyarse en la tabla de la sección 9).
4. No usar subagentes.
5. No explorar todo el proyecto.
6. Leer únicamente los archivos relacionados.
7. Aplicar el cambio mínimo necesario.
8. Ejecutar únicamente las validaciones relevantes.
9. Informar archivos modificados y resultado.

### Para tareas complejas

1. Leer PROJECT_CONTEXT.md primero.
2. Determinar si realmente se requiere investigación amplia.
3. Evaluar si es necesario usar subagentes.
4. Si se usan, limitar su cantidad y alcance.
5. Evitar duplicación de exploración.
6. Consolidar resultados.
7. Crear un plan solo si la complejidad lo justifica.
8. Aplicar cambios de manera controlada.
9. Ejecutar validaciones relevantes.

## 11. Contexto de versión estable

- Versión baseline: **1.8.8** (verificada en `package.json` y `src/core/version.js`).
- Esta versión es la línea base estable de trabajo. No incrementarla ni renombrar la app
  salvo solicitud explícita del usuario.
- Cambios de versión requieren actualizar como mínimo `package.json`,
  `package-lock.json` y `src/core/version.js`, además de una entrada en
  `src/docs/CHANGELOG.md` (y su copia `public/docs/CHANGELOG.md`), y mantener en sync los
  README (`README.md`, `src/docs/README.md`, `public/docs/README.md`).
- 1.8.5 = "Navegación unificada por pills": misma lógica visual de Configuración → toda la app.
  Primitivas compartidas en `src/components/common/UINav.jsx` (`NavDock` para dock horizontal con
  pills de grupo activo con fondo accent sólido; `SubPills` para pills secundarias rounded-full
  activas con borde/fondo accent + badge de contador), cubiertas por `UINav.test.jsx` (5 tests).
  Dashboard: barra de pestañas tipo browser → `NavDock` + `SectionHeader` dinámico por tab;
  Mi Espacio: grid de tarjetas → `NavDock` + tip 💡 estandarizado + tarjetas `rounded-xl`;
  Útiles: pills `.category-tab` → `SubPills` con badges (mantiene toggle grid/lista) +
  `SectionHeader` por sub-vista; Calendario: segmented toolbar → `SubPills` + `SectionHeader`;
  Kanban/Tabla/Reportes/Notas: encabezado unificado con `SectionHeader`. Bump a 1.8.5 en
  `version.js`, `package.json`, `package-lock.json` y los README; **679 tests en verde**, build OK.
- 1.8.4 = "Configuración y Personalización": rediseño de las 17 secciones de Configuración con
  navegación unificada por pills y `SectionHeader` (ícono + título + descripción,
  `SECTION_META` en `src/components/configuracion/ConfiguracionView.jsx`); primitivas en
  `src/components/configuracion/ui.jsx` (`ConfigSection`, `ConfigSectionTitle`, `ConfigRow`,
  `ConfigField`, `ConfigGrid`, `ConfigTip`, `ConfigDivider`); registro único del Dashboard en
  `src/features/dashboard/dashboardConfig.js` (`DASH_TAB_MAP`, `DASH_WIDGET_REGISTRY`,
  `getOrderedDashWidgets`/`getOrderedDashTabOrder`, consumido por `Dashboard.jsx` y el editor
  de Vistas); editor de vistas con iconos (`ViewSectionEditor` + `iconMap`); Mi Espacio con 9
  bloques ("Próxima actividad" y "Próximos eventos" separados, `miEspacioConfig.js`); idiomas
  **es/en** con migración automática `pt → es` al abrir Configuración.
- 1.8.3 = "Estadísticas y Cálculos": todos los motores estadísticos usan días efectivamente
  laborables **FH = TM − FS − In − Fe − Va** (FS según `workingDays` del perfil; vacaciones/
  feriados/inasistencias solo descuentan días laborables; solapes cuentan una vez). Núcleo:
  `diasEfectivosEnRango(rango, workingDays, availability)` y `diasHabilesEnRango` +availability en
  `src/features/analytics/periodUtils.js`; `getAvailabilitySummary` con `workingDays` y
  `totalDays = scheduled − effective` en `src/features/operator/operatorMetrics.js`; `getWeeklyGoalProgress`
  con último día hábil real y `getDayPaceMetrics` con 30 días hábiles efectivos; `computeResumenPeriodo`/
  `computeDiaSemana`/`promedioPersonalReciente`/`proyeccionObjetivos` con availability vía
  `src/features/analytics/analyticsEngine.js` y `useAnalytics.js`; `buildSeries`/`computeMetrics`/`ActivityChart`
  con `opts {workingDays, availability}`; `csvAnalitico` con KPI "Días hábiles efectivos en período".
- 1.8.2 = "Exportaciones y Documentación": toggle CSV analítico en `CsvExportModal` (`buildCsvAnalitico` en `src/features/export/csvAnalitico.js`), PDF de Mi Espacio ampliado a 10 secciones (disponibilidad, metas, ritmo, próximos eventos) en `PdfExportModal`, 4 ejemplos de caso reales en `EjemplosCasos` y pegado de ficha con `HORARIO:` aditivo en `parseFicha`.
- 1.8.1 = "Consistencia Visual y Experiencia de Uso" (absorbe el Pegado Inteligente que estaba
  en [Unreleased]; no hubo release 1.8.0 independiente): primitivas de filtros unificados en
  `src/components/common/filters/` (`FilterBar`, `FilterGroup`, `FilterLabel`, `FilterChip`,
  `FilterCounter`; refactor de `MonthDayFilterBar`, `DashboardFilters`, `ReporteGuardadoBar`);
  `PipelineBar` multi-selección (quickFilter `tipo:"estado"` con arrays OR,
  `src/utils/filtrarQuickFilter.js`, `casosStats.js`, footer "Filtrado por" + Limpiar);
  `SearchInput` con botón X y `TextInput` con `forwardRef`, reemplazos en toda la app y X en
  `NotesSearch`/`CaseLinker`/`GlobalSearch` (modal Ctrl+K agrandado con contador de resultados);
  orden fijo de Reportes (MonthDayFilter → PipelineBar → Guardados → Lista → Paginación);
  `VerCasoModal` con footer en fila única y reportes colapsables editables inline con
  `TemplateSelector` (`onActualizarCaso`); modales apilables vía `useModalStack`
  (`src/hooks/useModalStack.js`): Editar/Reporte se apilan sobre VerCaso con `z-submodal` +
  `inert` en el modal base; `AvailabilityCard` dividido en
  `src/features/operator/components/availability/` (7 archivos) con strip mensual
  (`AvailabilityMonthStrip`) y hex → variables CSS.
- 1.7.12 = "QA, Integración y estabilización 1.7.x": revisión integral de Mi Espacio 2.0 y del
  flujo principal; nueva prueba de render de `TodayCenter` (592 tests); verificación de
  ausencia de rastros del sistema de automatizaciones y de componentes eliminados
  (CasosRelevantes/TodaySummary); documentación alineada (tour paso 6, guía sección 5, FAQ,
  glosario "Centro 'Hoy'", Ayuda Mi Espacio, etiqueta "Insight destacado en el 'Hoy'",
  README ×3, PROJECT_CONTEXT); fix de `package-lock.json` (wbuf → 1.7.3 real).
- 1.7.11 = "Mi Espacio 2.0": la sección "Hoy" de Mi Espacio pasa a ser un centro de trabajo
  diario (`TodayCenter.jsx`, reemplaza a `MiJornadaView.jsx`) con 8 bloques en orden
  configurable (Hoy/Bienvenida, Mi Jornada, Próxima actividad, Pendientes, Productividad,
  Metas, Acciones rápidas, Accesos personales); bloques sin datos del día se omiten;
  perfil/disponibilidad/metas/accesos siguen como secciones secundarias. Nuevas secciones:
  BienvenidaCard (saludo + "X días restantes del mes" con `getDiasRestantesDelMes`), Productividad
  (getDailyGoalProgress + getDayClosureData + ritmo/proyección), MetasCard (diario/semanal/
  próximo hito), AccesosCard (resumen sin contraseñas), ProximosEventos (`getProximosEventos`,
  máx. 5). Orden editable en Configuración → Apariencia → Vistas
  (`miEspacioConfig.js` → `getOrderedMiEspacioKeys`, persiste en `operatorSettings.miEspacioOrder`,
  sin stores paralelos). Pestaña "Mi Jornada" renombrada "Hoy".
- 1.7.10 = "Reportes Guardados y Exportaciones": reportes de filtros persistidos (tabla Dexie `saved_reports`, schema v10, incluida en backup/export/import), CRUD con confirmación (crear/renombrar/duplicar/eliminar/reemplazar), snapshot de período/mes/días + búsqueda + busquedaFiltro + estado/aseguradora/localidad/estudio/tipo; panel de filtros en Reportes con `aplicarFiltros` (sin duplicar lógica); exportación CSV con nombre descriptivo `Reporte_{nombre}_{periodo}_{fecha}.csv`
- 1.7.9 = "Analítica Operativa": pestaña Analítica con filtros de exploración (estado, aseguradora, localidad, estudio, provincia, tipo), KPIs distribuidos que responden a los filtros, widgets Reprogramaciones y Citas, exportación CSV; series diaria/semanal ancladas al mes seleccionado; correcciones varias (PhoneLink tel:, meta Logro de Objetivos dinámica, tooltips de gráficos, PipelineBar visual, cleanup de Ayuda, sin persistencia de tabs de Config/Útiles, botón Limpiar filtro, `aplicarFiltros` con aseguradora/localidad); eliminación en profundidad del sistema de automatizaciones (schema v9)
- 1.7.8 = "Dashboard Configurable": 3 widgets nuevos (Citas, Reprogramaciones, Aseguradoras), WidgetWrapper estandarizado, restaurar defecto, persistencia de orden de dashboard
- 1.7.3 = "Calendario 2.0": creación de eventos desde espacio vacío (click en celda de día/
  slot abre `EventModal` con `initialData`), D&D mejorado para eventos CITA (actualiza campo
  `cita` del caso + `syncCitaEvent()` en vez de solo `updateEvent()`), eventos manuales/
  reprogramación se actualizan directamente. Componente `MultiSelect` reutilizable (`src/components/
  common/MultiSelect.jsx`). Barra `CalendarFilters` con 5 filtros multi-selección (estado,
  prioridad, aseguradora, estudio, tipo); `filtrarEventos()` + `useMemo` evita recálculos.
  Info enriquecida: badge de prioridad (B/M/A), nombre del caso en pills de mes/semana/día.
  Bug fix: `findExistingCitaEvent` filtra `status !== 'cancelled'`. Tests: `MultiSelect.test.jsx`,
  `calendarFilters.test.js`.
- 1.7.2 = "Búsqueda Global y Navegación Contextual": la Búsqueda Global (Ctrl+K) indexa y
  busca también Reportes (`reporteHistory`) e Historial (`case_history`) además de casos,
  notas, eventos y entidades; cada resultado lleva badge de tipo con su color. En
  `src/utils/searchEngine.js` se agregan `flattenReportes(cases)`, `flattenHistorial(filas, casos)`,
  índices Fuse propios (`fuseReportes`/`fuseHistorial`) y `reportes`/`historial` en
  `buscarGlobal` (indización local/offline, sin IA). `GlobalSearch` carga `case_history`
  (casesDB) al abrir, agrupa por tipo (`TYPE_META` → badge coloreado) y navega: nota → Bloc de
  notas con scroll (`handleNavigateToNote` + `data-note-id`), evento → calendario abriendo
  el EventModal directo vía `initialEventId`/`getEvent(id)` (App.jsx state `pendingEventId`),
  reporte/historial → VerCasoModal del caso, entidades → vista Útiles (`handleGlobalSearchSelectEntity`).
  Tests extendidos en `searchEngine.test.js` (reportes/historial).
- 1.7.1 = "Pendientes y Acciones Rápidas": nuevo mecanismo determinístico de pendientes del
  día `getPendientesDelDia` en `core/alerts/attentionRules.js` (tabla de 8 reglas: sin
  información, reporte pendiente, actividad vencida, cita hoy, reprogramación pendiente,
  seguimiento sin actividad, meta diaria, sin estudio asignado; prioridad Alta/Media/Baja;
  deduplicación por caso; máx. 8 — sin IA). `PendientesCard.jsx` (reemplaza `CasosRelevantes`)
  lista plana con ícono por tipo y badge de prioridad; `AccionesRapidas.jsx` grilla de 6
  acciones reutilizando estados/modales existentes de App.jsx (CasoEditModal,
  ReporteRapidoModal, BlocNotas, Calendario, GlobalSearch, CsvExportModal). En
  `MiJornadaView` ambas cards nuevas (posiciones 4 y 5) con props `onNuevoCaso`,
  `onNuevoReporte`, `onNuevaNota`, `onNuevoEvento`, `onBuscar`, `onExportar`.
  `VerCasoModal` + "Reprogramar" (abre ReporteRapidoModal con el caso preseleccionado y
  `estadoInicial='Reprogramado'`). Tests nuevos `src/core/alerts/pendientesDelDia.test.js`.
- 1.7.0 = "Centro 'Hoy' y Actividad Diaria": la vista "Mi Jornada" de Mi Espacio pasa a ser
  el centro de actividad diaria. Card nueva "Próxima actividad" (destacada, prioriza citas),
  línea temporal cronológica unificada de citas/eventos/reprogramaciones/casos/reportes/
  notas del día (card "Actividad de hoy"), y card "Requieren tu atención" con casos
  pendientes priorizados (motor determinístico `getCasesNeedingAttention`). Se elimina el
  legacy sin uso `TodaySummary.jsx` y los sub-componentes inline `TodayActivityCard`,
  `UpcomingCommitmentsCard`, `PendingFollowUpsCard` de `MiJornadaView` (reemplazados por
  `ProximaActividad.jsx`, `TimelineActividades.jsx` y `CasosRelevantes.jsx` en
  `operator/components/`). Helpers puros nuevos `getProximaActividad` y `buildTodayTimeline`
  en `operatorMetrics.js`. Sin IA, todo determinístico. Suite nueva `todayCenter.test.js`.
- 1.6.8 = "Auditoría final, QA y estabilización": eliminados 11 archivos muertos
  (Input, EditableForm, ShortcutsHelp, SelectorTema, ModoNoMolestar, BlocNotas, Card,
  NoteList, NoteCard en common/, hook `useBlocNotas`, carpeta `components/notes/`);
  palette de gráficos centralizada en CSS vars `--chart-color-*` (12 widgets +
  computeMetrics, fijada inconsistencia `#FB923C`→`#F97316`); console.warn/error de
  producción consolidados al sistema `reportError()`; documentación actualizada
  (tour 17 pasos, atajos Ctrl+1-5, árbol de componentes). Release candidate de la base estable.
- 1.6.7 = "Accesibilidad, Responsive y robustez": labels asociados por htmlFor/id en `Field`
  (useId) y sus formularios (`EventModal`, `CsvExportModal`, `FeedbackForm`); Escape + bloqueo
  de scroll en `CasoEditModal`/`VerCasoModal`/`ReporteRapidoModal`; clicables no nativos
  operables por teclado vía `src/utils/a11y.js`; ARIA (`role="alert"`/`aria-live`,
  `aria-pressed`, `aria-expanded`, `aria-sort`, `scope="col"`, `aria-label` en botones de
  solo ícono y en la búsqueda global); contraste de `--text-muted` (`#B0B8C4` / `#5B6370`);
  `text-[9px]` visibles → `text-ds-xs` y `fontSize` inline sueltos → tokens del DS;
  `SmartTable` con `overflow-x-auto` y empty state, `ComentariosUI` sin "Invalid Date",
  touch target del selector de kanban en `pointer: coarse`, `.text-xs` a `0.7rem` en móvil;
  suite de tests de accesibilidad nueva (15 tests).
- 1.6.6 = "Optimización y rendimiento": usoStorage/FiltersContext con guardado debounced;
  referencias estables en useAppStore y selectores granulares en Celebration; hot paths de cálculo
  memoizados (CasoEditModal duplicado/datalists, CalendarView caseMap/todayStr/orden, funnel
  de una sola pasada, calendario por rango de fecha); filas/columnas/notificaciones extraídas
  con React.memo (TablaRow, KanbanColumn, NotificationItem); carga perezosa de
  CaseTimeline/PdfExportModal/IntegridadPanel; handlers y widgets del Dashboard memorizados;
  perfilado con why-did-you-render (dev).
- 1.6.5 = "Navegación fluida y coherente": header estable (tab-strip con scroll), transición
  crossfade entre vistas con preservación de scroll (`useViewTransition`), modales/overlays
  unificados (`Modal`, `useModal`, `useDialogA11y` con Escape/foco/bloqueo de scroll),
  confirmación de datos sin guardar en `ReporteRapidoModal`, contexto preservado al abrir un
  caso desde Calendario o Bloc de Notas, animaciones de entrada/salida y pruebas de integración.
- 1.6.2 = "Consistencia funcional" (consolidada): completadas las áreas de consistencia que
  quedaron pendientes de las versiones 1.6.3/1.6.4/1.6.5 — `Skeleton` (variants text/avatar/
  circle/button/card/list/table + `SkeletonText`/`SkeletonTable`, integrado en `NotesView`) y
  `EditableForm` (formulario config-driven con validación, errores y Guardar/Cancelar
  unificados). Tests en `Skeleton.test.jsx` y `EditableForm.test.jsx`.
- 1.6.4 = "Sistema centralizado de notificaciones y feedback": pipeline central único
  vía notificationManager/ruleEngine/soundSystem y nuevo actionFeedback; eliminados los
  sistemas paralelos (legacy NotificationService, Toast.jsx muerto); corregido el router
  roto de useAppStore.addToast (alertsSystem/CSVImporter); reemplazados alert() nativos por
  toasts; deduplicación por eventKey. Prioridades BAJA/MEDIA/ALTA → Centro/Toast/Sonido.
