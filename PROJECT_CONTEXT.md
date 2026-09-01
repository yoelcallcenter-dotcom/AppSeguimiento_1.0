# AppSeguimiento — Project Context

Archivo de contexto técnico persistente para agentes/modelos que trabajen en este proyecto.
Léelo primero en cada sesión. Evita re-explorar la arquitectura en cada tarea.

## 1. Identidad del proyecto

- Nombre: **AppSeguimiento** (antes "Seguimiento de Derivaciones" / "Seg. ART"; entradas históricas del CHANGELOG conservan el nombre viejo).
- Versión actual: **1.5.1** (verificada en `package.json` y `src/core/version.js`).
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
│                       # diagnostico/, entities/, estadisticas/, notes/)
│   ├── common/         # Base reutilizable: Btn, BtnOutline, Select, TextInput, Toggle,
│   │                   # Pill, Field, Paginacion, TagsManager, Celebration, TagsPills,
│   │                   # Card, EmptyState, Input, OverlayPanel, ConfirmDialog, Spinner,
│   │                   # SystemStatusBanner, UndoBanner, Breadcrumbs, CaseLinker,
│   │                   # GlobalStatsHeader, PhoneLink, MonthDayFilterBar, ModoNoMolestar
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
│   ├── cases/          # caseHistory.js (timeline), caseRepository.js, casesManager.js,
│   │                   # caseRelations.js, activityFeed.js
│   ├── status/         # storageHealth.js, systemStatusStore.js (monitoreo de salud)
│   ├── i18n/ error/ monitoring/ storage/ validation/ user/ notes/
├── features/           # Módulos de alto nivel:
│   ├── dashboard/      # Dashboard analítico multi-pestaña + widgets + metricsEngine
│   ├── operator/       # "Mi Espacio": perfil, disponibilidad, metas, credenciales,
│   │                   # PdfExportModal (operatorStore.js, operatorMetrics.js, operatorDefaults.js)
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
│                       # useAdvancedSearch.js, useBlocNotas.js, useCalendar.js,
│                       # useDialogA11y.js
├── validators/         # casoValidator.js (validación de casos)
├── pages/              # Vistas auxiliares (SystemLogs)
├── pwa/ tour/ help/ guide/ faq/ glossary/ docs/ styles/ test/
public/                 # index.html, manifest.json, sw.js, docs/ (copias generadas)
```

## 4. Gestión de datos

- Persistencia local: IndexedDB vía Dexie (`src/core/db/appDB.js`, `casesDB.js`). Nada viaja a servidores.
- Esquema CasesDB v3 (aditiva, no destructiva): incluye tabla `case_history` para timeline de eventos por caso (v1.3.1). Casos antiguos funcionan sin historial previo.
- Estado global: `src/core/store/useAppStore.js` (Zustand). Incluye middleware `persist`
  (clave `app-view-orders`) para órdenes de pestañas/widgets del Dashboard, Tablero,
  Tabla, Reportes y Útiles.
- Configuración de la app: objeto `config` persistido en `localStorage` bajo claves
  definidas en `src/utils/backup/constants.js` (p.ej. `config-art-tracker`). Leer/escribir con
  los helpers existentes, no inventar claves nuevas si ya existe una equivalente.
- Mi Espacio (operador): `src/features/operator/operatorStore.js` (perfil, disponibilidad,
  metas, credenciales — estas últimas nunca se exportan).
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
  detecta y migra backups en formatos v0 y v1 al formato actual (v2) antes de restaurarlos.
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

- **Mi Espacio** (features/operator): vista por defecto al abrir. Perfil, jornada,
  disponibilidad (vacaciones/feriados/inasistencias), metas diarias/mensuales/firmas,
  accesos personales, sugerencias personales, recordatorios de jornada/metas,
  microinteracciones de objetivos. Exportación PDF con selección de secciones.
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
- **Notificaciones**: toasts, campana, centro de notificaciones, alertas persistentes,
  sonidos Web Audio (soundSystem) gated por configuración.
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
| DB | `src/core/db/appDB.js`, `casesDB.js` | Dexie/IndexedDB y versionado (v3: +case_history) |
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
| Mi Espacio | `src/features/operator/` | Perfil, disponibilidad, metas, settings operador |
| Export PDF | `src/features/operator/PdfExportModal.jsx` | Exportación PDF de Mi Espacio |
| Productividad | `src/features/productivity/` | Widget dashboard + settings (interacciones, sugerencias) |
| Dashboard | `src/features/dashboard/` | Pestañas, widgets, metricsEngine |
| Analítica | `src/features/analytics/` | Motor de insights, período, tendencias, SmartInsightsPanel |
| Export CSV | `src/features/export/CsvExportModal.jsx` | Exportación CSV con filtros |
| Alertas | `src/features/alerts/alertsSystem.js` | Sistema de alertas por eventos próximos |
| Reglas | `src/features/rules/rulesEngine.js` | Motor de reglas determinísticas |
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

- Versión baseline: **1.5.1** (verificada en `package.json` y `src/core/version.js`).
- Esta versión es la línea base estable de trabajo. No incrementarla ni renombrar la app
  salvo solicitud explícita del usuario.
- Cambios de versión requieren actualizar como mínimo `package.json`,
  `package-lock.json` y `src/core/version.js`, además de una entrada en
  `src/docs/CHANGELOG.md` (y su copia `public/docs/CHANGELOG.md`).
- 1.5.1 = "Configuración, Backup/Export/Import, Ayuda y Correcciones":
  Configuración de Citas y Calendario (4 opciones: auto-crear, auto-actualizar,
  auto-reprogramar, info en eventos), corrección de zona horaria en calendario
  (toLocalDateStr), corrección de formato telefónico (+549), overlay con Portal
  (Speechs cubre header), deduplicación de notificaciones (showToast via
  NotificationManager), eliminación de Entidades conectadas (EntityPanel),
  integración de reprogramaciones en Dashboard, ayuda/tour/glosario actualizados.
  NO usa IA ni integración de calendarios externos.
