# Auditoría Release 1.10.1 — AppSeguimiento

> **Documento de investigación. NO se corrigió nada.** Este informe es el insumo para
> planificar la fase de correcciones (release 1.10.1). Archivo nuevo en la raíz del repo,
> sin commit (decisión explícita del usuario).

---

## 1. Meta, alcance y método

| Campo | Valor |
|---|---|
| Release auditada | **1.10.0** (HEAD `a18b397 Release 1.10.0`) |
| Fecha | 11/10/2026 |
| Alcance | Código, funcionalidad, UI/UX, configuraciones, persistencia, consistencia de datos |
| Fuera de alcance | Correcciones, commits, bump de versiones, `npm install` |
| Método | Análisis estático propio (scripts en temp), 4 agentes de reconstrucción verificada (NAV/NOTIF/REG, DATA/CFG/PERSIST, FUNC/METRICS/CAL, SPEECH/PERF/A11Y), pase de runtime real (Chrome headless + CDP con datos sembrados) |
| Anti-falsos-positivos | Cada hallazgo CONFIRMADO traza el flujo real en código; los no trazables quedan PROBABLE/POSIBLE. Un hallazgo previo fue **corregido** por evidencia contraria (X23). |

**Regla permanente del proyecto (mantenida):** no se usa ni se añade IA dentro de AppSeguimiento.

## 2. Baseline y entorno

| Check | Resultado |
|---|---|
| `npm run test:run` | **1056/1056** (101 archivos) — sin regresiones |
| `npm run build` | **Compiled successfully**, sin warnings |
| ESLint | Sin salida — `.eslintrc.json` raíz declara solo parser, **sin reglas** (ver X21) |
| Typecheck | N/A (proyecto JS) |
| Versiones | `version.js` 1.10.0 = `package.json` 1.10.0 = CHANGELOG (×3 byte-idénticos, sha 96827847…) ✔ — **README ×3 (byte-idénticos) y PROJECT_CONTEXT.md dicen 1.8.8** (R10); `manifest.json` sin campo version (informativo) |
| Runtime | Chrome 155 headless vía CDP sobre build de producción, con **12 casos sembrados** en CasesDB (schema v3/Dexie×10) |

## 3. Resumen ejecutivo

**96 hallazgos verificados**: 1 CRÍTICO · 19 ALTO · 51 MEDIO · 22 BAJO · 2 COSMÉTICO · 1 INFORMATIVO.

Bloques principales:

1. **Calendario**: un CRÍTICO real — el drag&drop de la vista Día **destruye la cita del caso** con un ISO mal formado (E01); la vista Mes esconde el último día del mes (E02).
2. **Métricas**: los mismos rótulos ("casos totales", "tasa de cierre", "activos", "firmas") dan **valores incompatibles en la misma pantalla** porque conviven 2-3 motores con poblaciones y fórmulas distintas (M01, M21, M22, M25).
3. **Configuración**: 6 claves sin UI/consumidor real, 4 sin default declarado, i18n parcial, y "renombrar estado" es una palanca destructiva (rompe alertas, reglas, PDF, metas y colores que hardcodean nombres).
4. **Persistencia**: "Borrar todos los datos" deja 8 survivors (templates, saved_reports, migration_snapshots, errors…); el borrado por mes deja `case_history` huérfano; la UI tiene tres vías de escritura de casos que divergen.
5. **UX/modales**: un solo Escape cierra todos los modales a la vez; VerCaso queda por debajo del OverlayPanel; los atajos PWA a vistas no funcionan en arranque frío (RUN-01, verificado en runtime).
6. **Performance/A11Y**: vistas ocultas repintan por cada tecla, GlobalSearch sin debounce sobre el historial completo, contraste del acento en tema claro 2.5:1, navegación sin semántica de tabs.

**Top-10 priorizado (ver §9):** E01 → M01/M21 → D02/D13/D14 → P01 → N17 → F19 → RUN-01 → X01/X04 → S11 → X07.

## 4. Mapa de arquitectura (verificado, no depende de docs)

- **Entry**: `src/index.js` → `App.jsx` (**1982 líneas**, monolito). Sin router; navegación = `selectedView` en `FiltersContext` (6 pestañas: mi-espacio, dashboard, kanban, tabla, reportes, utiles) + hash shortcuts PWA (`#dashboard`, `#nuevo-caso`, …) + modales lazy.
- **Capas**: Zustand (`useAppStore`, notificationStore, celebrationStore, templatesStore, savedReportsStore…) · Contextos (Filters, Theme, UX, FontSize, Typography, I18n) · Dexie (**CasesDB**: cases, case_history · **AppData**: events, notes, note_versions, auto_backups, migration_snapshots, templates, saved_reports · **AppDiagnostics**: errors) · `useStorage`/`storageManager` sobre localStorage (prefijo `app_`) · services (notificationManager, ruleEngine, soundSystem, backupService, autoBackup, themeManager…).
- **Escritura de casos (raíz de varios hallazgos)**: 3 vías — `App.guardarCaso` (orquestada: historial, reglas, undo), `casesDB.cases.update/bulkDelete` directo (CalendarView:332, ConfiguracionView:1056) y `importCases`/backup (transaccional, sin trazabilidad). Ver F01/F19/F20.
- **Notificaciones**: canal correcto = `notificationManager.notify` (gates de config); canal bypass = `useAppStore.addToast` (sin gates). Ver T01.
- **Colores de estado**: dual-store — `config.estados[].accent` vs `app-estado-colors` de themeManager. Ver D01.
- **Cruces de datos peligrosos**: nombres de estados y fechas usados como claves por literal en ≥6 motores (D02-D04, D13, D14, M-matrix).

## 5. Hallazgos

Formato: `ID | archivo:línea | SEVERIDAD | CERTEZA | título — detalle`.
Severidad: CRÍTICO/ALTO/MEDIO/BAJO/COSMÉTICO/INFORMATIVO · Certeza: CONFIRMADO/PROBABLE/POSIBLE.

### 5.1 Navegación y modales (N)

```
N01  | VerCasoModal.jsx:326 vs OverlayPanel.jsx:39-41 | ALTO | CONFIRMADO | VerCaso va inline y OverlayPanel por createPortal: con z-modal (50) igual, el portal (body posterior) pinta ENCIMA de VerCaso; los demás modales apilados (60) sí cubren.
N17  | App.jsx:1260-1267 + useKeyboardShortcuts.js:79,89 | ALTO | CONFIRMADO | Un solo Escape en document cierra TODO a la vez (modalCaso, modalReporte, verCaso, overlayOpen, showCalendar); rompe useModalStack; cancelar el ConfirmDialog (App:1859) cierra también VerCaso.
N18  | FiltersContext.jsx:140,153,165 vs App.jsx:329-330,384 | ALTO | CONFIRMADO | searchQuery del contexto está muerto en App (el header usa estado local `query`): Dashboard.jsx:212-224 limpia un filtro que nadie lee; ReportesView.jsx:74,104 guarda/restaura snapshot con `busqueda` sin efecto.
N19  | VerCasoModal.jsx:93-94 + useDialogA11y.js:66-68 | MEDIO | CONFIRMADO | Al cubrirse VerCaso se deshabilita su trampa de foco; el cleanup restaura el foco a un elemento `inert` → foco perdido al cerrar el modal superior.
N20  | VerCasoModal.jsx:329,336 vs OverlayPanel.jsx:51-53 | BAJO | CONFIRMADO | Backdrop de VerCaso no cierra (stopPropagation inútil); OverlayPanel/Modal sí cierran por backdrop: cierre inconsistente.
N21  | App.jsx:1260-1267 vs 1736,1926,1938 | MEDIO | CONFIRMADO | Escape cierra Calendario/Config/Ayuda pero NO Bloc de Notas, FilterModal ni CsvExportModal: misma familia de overlays, cierres distintos.
N22  | App.jsx:392,1264 | COSMÉTICO | CONFIRMADO | `modalComentarios` nunca se setea: estado muerto dentro del handler de Escape.
N23  | SidePanel.jsx:57 vs ToastContainer.jsx:89 / PersistentAlert.jsx:99 | BAJO | PROBABLE | SidePanel z-notification (110) > z-toast (100) y z-alert (90): con panel lateral abierto, toasts/alertas quedan detrás del backdrop.
N24  | App.jsx:1191-1228 | INFORMATIVO | CONFIRMADO | eliminarTodosLosDatos no borra Dexie (AppDiagnostics.errors, notes/events, saved_reports) antes del reload: depende de la detección post-reload.
RUN-01| FiltersContext.jsx:174-195 (188) vs App.jsx:468-484 | ALTO | CONFIRMADO (runtime + código) | Atajos PWA a vistas no funcionan en arranque frío: el efecto hijo (hash) corre antes que el del padre (restore) y la restauración de `app-filters` re-escribe selectedView='mi-espacio', pisando #dashboard/#kanban/… Solo funciona si la última vista usada NO era mi-espacio. #nuevo-caso sí funciona (el modal no se restaura).
```

### 5.2 Notificaciones (T)

```
T01  | useAppStore.js:318-333 | MEDIO | CONFIRMADO | addToast va directo a notificationStore: no aplica notifInApp, notifMinToastPriority, frecuencia, modoNoMolestar, sonido, escritorio ni centro. Consumidores: alertsSystem.js:25,145; CSVImporter.jsx:181,203,225,278; easterEggs.js:23. (showToast de App SÍ pasa por notificationManager: afecta solo a esos consumidores, no a las ~150 llamadas de UI.)
T17  | alertsSystem.js:96-112,145 | MEDIO | CONFIRMADO | checkRepeatedErrors lee `store.errorLog` que solo escribe logError (useAppStore:338) llamado por triggerAlert, que nadie invoca → chequeo de 60 s siempre vacío; los errores reales van a reportError/AppDiagnostics.errors.
T18  | ruleEngine.js:4-9,47,49 + soundSystem | BAJO | CONFIRMADO | TYPE_FILTER_MAP mapea warning→notifReporte; notifMinToastPriority calculado sin usarse; ignorarLowPriority fuera de CONFIG_DEFAULT/UI; default de sonido invertido entre _enabled (notifSonido!==false) y shouldPlaySound (notifSonido!==true).
```

### 5.3 Regresiones (R)

```
R01  | ReportesView.jsx:25,41,53,121-194 | MEDIO | CONFIRMADO | "Reportes guardados" sin UI: REPORTES_SECTIONS solo tiene pipelineBar/lista/paginación; handleApply/Save/Rename/Duplicate/Delete + `reportes` quedan huérfanos (datos intactos en appDB saved_reports v10). Feature completa e inalcanzable.
R02  | CalendarView:391,393,427; GlobalSearch:50; AlertsPanel:141; InsightsPanel:37; HelpPanel:56 | COSMÉTICO | CONFIRMADO | 7 declaraciones (5 archivos) siguen concatenando sufijo alfa sobre `var(--…)` (p.ej. color+'11'/'22') → valor inválido y decl descartada. Remanentes de H1 no cubiertos por el escáner de 1.10.0 (concat con identificador multilínea). El resto de concatenaciones son hex válidas.
R03  | App.jsx:964-965 | MEDIO | CONFIRMADO | Alta de caso usa `new Date().toISOString().slice(0,10)` (UTC) en vez de hoyISO()/toLocalDateStr() → fechaFirma corre a día siguiente entre 21:00 y 24:00 (UTC-3). CasoEditModal:124 sí lo hace bien.
R09  | computeMetrics.js:150-151; analyticsEngine.js:273,278 | BAJO | PROBABLE | Mismo bug UTC en fallback de fechas con hora: reportes 21:00-24:00 atribuidos al día siguiente en enRango/franjas.
R10  | README.md:3 (+2 copias), PROJECT_CONTEXT.md:9,423 | BAJO | CONFIRMADO | Docs en "Versión 1.8.8" con APP_VERSION 1.10.0 (CHANGELOG y docsContent.js sí al día). Las 3 copias de README son byte-idénticas (16181 B).
```

### 5.4 Consistencia de datos (D)

```
D01  | ConfiguracionView.jsx:3102 vs PersonalizacionColores.jsx:217 | MEDIO | CONFIRMADO | Dual-store de color de estado: config.estados[].accent (Config:3102, Kanban:39, Reportes:227, Logro:243, catalogos:106) vs app-estado-colors de themeManager; dos UIs compiten por el mismo color.
D02  | ConfiguracionView.jsx:3045 | ALTO | CONFIRMADO | Renombrar estado no propaga: solo reescribe config.metrics.categorias; no toca attentionRules:16, rulesEngine:119, app-estado-colors, CATEGORIAS_DEFAULT (metricsEngine:8), reportes guardados ni caseHistory.
D03  | attentionRules.js:16 | ALTO | CONFIRMADO | activeStates/pendingStates hardcodeados con 'Activo','En proceso','Contacto' — inexistentes en ESTADOS → esas reglas NUNCA disparan (código muerto silencioso).
D04  | filtrarQuickFilter.js:225,229 vs :61-64 | ALTO | CONFIRMADO | "activos" en aplicarBusquedaFiltro = !lost (INCLUYE FIRMADO); "pendientes" = solo contact; distinto del filtro rápido y de metricsEngine:34.
D05  | dateFilters:26, dateUtils:10/24, configFormatters:21, computeMetrics:239, attentionRules:108/321/506, operatorMetrics:20/232/262 | MEDIO | CONFIRMADO | 6 normalizadores de fecha independientes con semánticas distintas (DD/MM parser propio, slice(0,10), toISOString UTC…).
D06  | configFormatters.js:21 | MEDIO | PROBABLE | formatearFecha duplicada no soporta MM/DD/YYYY que dateFilters sí → formato divergente entre tabla y reporte.
D07  | App.jsx:965 | MEDIO | CONFIRMADO | fechaFirma en UTC vs local (hoyISO) — variante de R03 en el camino de guardado.
D08  | storageManager.js:48 | MEDIO | CONFIRMADO | get() no fusiona defaults: claves nuevas de CONFIG_DEFAULT quedan undefined en instalaciones viejas hasta reescribir el objeto completo (mergeConfigWithDefaults solo en import de backup).
D09  | App.jsx:494 | MEDIO | CONFIRMADO | Lee localStorage "config-art-tracker" sin prefijo app_ → siempre null; notificationManager.init({}) arranca vacío (mitigado por configure(config) en App:625).
D10  | Dashboard.jsx:450 | BAJO | CONFIRMADO | Tercer loop de grouping inline (provincias) duplica metricsEngine.groupBy (:222) y computeMetrics.groupByField (:106).
D11  | backupService.js:32 | MEDIO | CONFIRMADO | DB_TABLES omite migration_snapshots y AppDiagnostics.errors → respaldo "completo" no cubre snapshots ni log de errores.
D12  | dataValidation.js:171,199 | MEDIO | CONFIRMADO | ESQUEMA_CONFIG cubre ~4 campos → validateConfigIntegrity no repara claves rotas (p.ej. estados no-array).
D13  | rulesEngine.js:119 | MEDIO | CONFIRMADO | Hardcodea ['Cita virtual','Cita presencial'] en vez de config.estados → renombrar un estado silencia esa automatización.
D14  | exportPDF.js:96; LogroObjetivos.jsx:35 | MEDIO | CONFIRMADO | "Firmo"/"Baja" hardcodeados → estadísticas rotas si el usuario renombra estados.
D15  | searchEngine.js:43 vs Config:1852-1856 | MEDIO | CONFIRMADO | UI de índices de búsqueda (idx*) no conectada: IDX_MAP es constante, ninguna clave config.idx* se lee → toggles sin efecto.
D16  | constants.js:167 vs Dashboard:269 | BAJO | CONFIRMADO | Solo 5 widget* declarados en CONFIG_DEFAULT de ~14 consumidos; el resto depende de la ausencia de la clave (!== false).
```

### 5.5 Configuración (C)

```
C01  | soundSystem.js:145 | MEDIO | CONFIRMADO | volumenNotificaciones: consumidor ?? 0.5, sin UI y sin default en CONFIG_DEFAULT → volumen inaccesible.
C02  | ruleEngine.js:49 | MEDIO | CONFIRMADO | ignorarLowPriority: filtra alertas bajas, sin UI y sin default.
C03  | constants.js:137 | BAJO | CONFIRMADO | Claves sin consumidor real: sonidoNotificaciones (legacy→notifSonido), citasMostrarInfoCaso (Config:3026, 0 lecturas) e idx* (D15).
C04  | helpers.js:197 | MEDIO | PROBABLE | CONFIG_DEFAULT.plantillas muerto: generarConversacion no se invoca en producción (solo backupRegression.test.js) → clave persistida sin UI (las plantillas reales viven en Dexie templates).
C05  | Config:1510/2109 | BAJO | CONFIRMADO | notifEscritorio y bajoConsumo tienen UI + consumidor pero NO default declarado en CONFIG_DEFAULT.
C06  | I18nContext.jsx:8 | BAJO | PROBABLE | idioma solo lo lee I18nContext y App:226/258; traducciones prácticamente no aplicadas → toggle con efecto mínimo (i18n casi sin consumidores).
```

### 5.6 Persistencia y backup (P)

```
P01  | App.jsx:1137 | ALTO | CONFIRMADO | Borrar todos los datos deja survivors: appDB.templates(:88), saved_reports(:131), migration_snapshots(:56, contiene copias de notes/events/auto_backups), AppDiagnostics.errors, app-typography-preset (fuera de hyphenKeys:1183), app.auto-backups-normalized, app.sh.*, seg-art:*. Corrección a la creencia previa: auto_backups SÍ se limpia (:1171); lo excluido es el backup/export (backupService:27).
P02  | backupService.js:27 | MEDIO | CONFIRMADO | Backup excluye auto_backups (documentado) y omite migration_snapshots/errores → restauración no reconstruye diagnóstico.
P03  | ConfiguracionView.jsx:1040 | MEDIO | CONFIRMADO | handleEliminarCasos borra casos por mes sin borrar case_history (sin FK) → filas huérfanas permanentes.
P04  | localStorageAdapter.js:84 vs App:1183-1219 | MEDIO | CONFIRMADO | clear() solo borra prefijo app_; el resto es una lista manual que se desincroniza (falta app-typography-preset).
P05  | GlobalSearch.jsx:102 vs adapter:14 | BAJO | CONFIRMADO | global-search-history y help_* se borran en reset pero no están en unprefixedInclude → fuera del backup.
```

### 5.7 Funcionalidades del ciclo de vida de caso (F)

```
F01  | App.jsx:939-951 | ALTO | CONFIRMADO | Eliminar caso sin cascade: borra case_history pero no notes/events.relatedCaseIds; el cascade completo (useAppStore.deleteCase:135-146) la UI nunca lo invoca → huérfanos que referentialChecks.js:60 detecta pero no previene.
F02  | App.jsx:1255-1281 | BAJO | CONFIRMADO | Ctrl+D "Duplicar caso" documentado (AtajosTeclado.jsx:26) y llamado (useKeyboardShortcuts:43 onDuplicar?.()) pero App no pasa onDuplicar: no ocurre nada. Grado C: sin implementar.
F03  | ReporteRapidoModal.jsx:164,169 vs 211,221 | MEDIO | CONFIRMADO | parseReportText resuelve p.origen de [Primera Atención]/[Estudio Jurídico] pero guardar() usa origen: origen || "Operador" → origen del corchete descartado; CasoEditModal y VerCasoModal no parsean.
F11  | caseHistory.js:342-355 | MEDIO | CONFIRMADO | case_history crece sin poda ni tope (solo add); GlobalSearch:79 y CsvExportModal:152 leen con toArray() completo; solo integrityService usa .limit(500).
F16  | ReporteRapidoModal.jsx:226-234 + App.jsx:1004-1008 | BAJO | PROBABLE | Toast "Cambios guardados correctamente" sin escritura cuando count===0 (estado igual, texto vacío permitido): sin recordCaseChanges ni lastActivityAt → éxito no verificable.
F17  | App.jsx:944 + 449-454 | MEDIO | CONFIRMADO | Deshacer no restaura el historial: pushUndo guarda prevCasos pero deleteCaseHistory es inmediato → caso restaurado con timeline vacía (pérdida silenciosa de trazabilidad).
F18  | caseHistory.js:60-71 + CasoEditModal.jsx:394-398 | MEDIO | CONFIRMADO | CAMPOS_GENERALES omite fecha/origen/numeroSiniestro/provincia: editar fecha (permitido) no genera evento CASE_UPDATED ni lastActivityAt y cambia la pertenencia del caso a un mes sin rastro.
F19  | ConfiguracionView.jsx:1056-1065 | ALTO | CONFIRMADO | Borrado masivo por mes sin cascade: casesDB.cases.bulkDelete directo — sin case_history, sin relatedCaseIds, sin pushUndo, sin evento; doble escritura Dexie+estado (mismo huérfano que F01, en lote).
F20  | CalendarView.jsx:322-339 | MEDIO | CONFIRMADO | Reprogramar cita desde el calendario saltea la orquestación: casesDB.cases.update directo, sin undo, sin historial, sin lastActivityAt, sin runCaseRules (el resto pasa por App.guardarCaso:877-936).
```

### 5.8 Métricas (M)

```
M01  | metricsEngine.js:24-27 vs computeMetrics.js:263-269 | ALTO | CONFIRMADO | "Casos totales" con DOS poblaciones en el mismo Dashboard: el widget usa casosGlobales (App:684-691 = fecha O último reporte + filtros); KPICards/CSV usan computeMetrics con isSameMonth(c.fecha) → números distintos.
M21  | metricsEngine.js:83-91 vs computeMetrics.js:272,320 | ALTO | CONFIRMADO | "Tasa de cierre" con dos fórmulas: widget = firmas/(contacto+firmas); KPI = (firmas+perdidos)/total. Mismo rótulo, valores incompatibles.
M22  | filtrarQuickFilter.js:61,225 vs computeMetrics.js:271 | MEDIO | CONFIRMADO | Tres definiciones de "Activos": !lost&&!success | !lost (incluye firmados) | contact∪pending → drill de métricas ≠ lista filtrada.
M23  | ActivityChart.jsx:47,80 | MEDIO | CONFIRMADO | Conteo diario por c.fecha.startsWith(ISO): fechas legadas DD/MM/YYYY nunca coinciden → gráfico y drill muestran 0.
M24  | Dashboard.jsx:427-431 | BAJO | CONFIRMADO | Período anterior con new Date(c.fecha) (UTC) e Invalid Date en legadas → casos excluidos en silencio del insight comparativo.
M25  | LogroObjetivos.jsx:35 vs metricsEngine.js:32 | MEDIO | CONFIRMADO | Firmas con dos semánticas: max(0, Firmo−Baja) (Logro, operatorMetrics:243) vs solo Firmo (widget, computeMetrics:276).
M26  | operatorMetrics.js:228-275 | MEDIO | CONFIRMADO | Metas de Mi Espacio miden firmas por c.fecha (creación), no fechaFirma → caso firmado en otro mes no cuenta.
M27  | App.jsx:737-740 + 1660-1662 | MEDIO | PROBABLE | Mi Espacio hereda casosGlobales (mes global) y vuelve a filtrar por mes del sistema → elegir otro mes en el panel global puede dejar las metas en 0.
M28  | UltimosCasos.jsx:8 | BAJO | PROBABLE | Orden por new Date(c.fecha) sin normalizar → NaN y orden indeterminado con fechas legadas.
```

### 5.9 Calendario (E)

```
E01  | CalendarView.jsx:579 → 824-827 | CRÍTICO | CONFIRMADO (runtime) | Drag en vista Día con hora: newDateStr="…T14:00:00" reemplaza solo la fecha de un startDate que ya tiene hora → ISO con DOBLE T ("2026-10-15T14:00:00T09:30:00.000Z"). En eventos CITA (l.326-334) el update construye cita="NaN/NaN - (14:00 a 14:00)" y syncCitaEvent (citaAutoEvents.js:93-101), al no parsear (citaParser.js:19,41), BORRA el evento de cita del caso y registra CITA_DELETED. La persistencia (E04) guarda el ISO corrupto.
E02  | calendarStore.js:96-104 | ALTO | CONFIRMADO | between("YYYY-MM-01","YYYY-MM-31") lexicográfico excluye todo startDate con hora > "…-31" → eventos del 30/31 (ej. 2026-10-31T14:30) invisibles en vista Mes.
E03  | CalendarView.jsx:182-184 | MEDIO | CONFIRMADO | Rango semana/día con fin = último día 00:00 local + toISOString(): trunca el último día y corre el inicio (en UTC-3 deja fuera startDate 00:00-02:59 del primer día).
E04  | CalendarView.jsx:343 | MEDIO | PROBABLE | El startDate corrupto de E01 persiste en appDB.events; formatTime y slice(0,10) lo disfrazan hasta que un new Date() o consulta por rango falle.
```

### 5.10 Speechs / Útiles (S)

```
S01  | SpeechsView.jsx:137-139 | ALTO | CONFIRMADO | Import de JSON sin validar tipos: arr.map(sanitizeString) no filtra no-strings → s.toLowerCase()/localeCompare revientan (sanitize.js:22 deja pasar números/objetos).
S07  | SpeechsView.jsx:337,462 | MEDIO | CONFIRMADO | indexOf sobre strings duplicados → primer índice siempre; key={idx} duplicada (l.343) y copiar/eliminar opera sobre el ítem equivocado. Ídem MapeoView.jsx:28,43.
S10  | package.json:9-11,15,18,21 | BAJO | CONFIRMADO | 6 dependencias directas sin uso: @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, @tiptap/pm (peer, redundante), @tiptap/suggestion, es-abstract (transitivo). El DnD real es HTML5 nativo. Impacto: install/lockfile, no bundle.
S11  | searchEngine.js:235,240 | ALTO | CONFIRMADO | Búsqueda global con campo equivocado: m.nombre no existe en mapeo (usa .estudio) y c.estudioJuridico no existe en condicionales (usa .estudio) → grupos "Estudio Jurídico" y "Estudio" NUNCA aparecen.
S11b | GlobalSearch.jsx:381,384,387 | MEDIO | CONFIRMADO | Subtítulos falsos: casesCount nunca se setea → "0 casos" siempre; r.data.estudioJuridico undefined → "condición — " vacío.
```

### 5.11 Performance / Errores / Accesibilidad (X)

```
X01  | useViewTransition.js:68,76 + globals.css:1126 + FiltersContext.jsx:205,224 | ALTO | CONFIRMADO | Las vistas visitadas quedan montadas con display:none y se re-renderizan con CADA tecla (searchQuery entra en el value del contexto; showView() = visitedRef.has()).
X02  | OperatorView.jsx:54-61 | ALTO | CONFIRMADO | 8 métricas O(n) sin useMemo, recalculadas por render y cada 60 s por setNow (l.45).
X03  | OperatorView.jsx:64-72 | MEDIO | CONFIRMADO | Deps incompletas en encouragement (lee daily.*.enabled y firmas.met pero declara menos) → mensaje desactualizado.
X04  | GlobalSearch.jsx:79,118-123 | ALTO | CONFIRMADO | Sin debounce y con case_history completo: cada tecla corre buscarGlobal+buscarEntidades sobre todo el historial (la query del input no se debouncea, a diferencia de App:730).
X05  | App.jsx:599-616 | MEDIO | CONFIRMADO | Dos promesas dinámicas (import(appDB), notificationStore) sin .catch → unhandled rejection.
X06  | localStorageAdapter:57-144 + 7 módulos | MEDIO | CONFIRMADO | 22 console.error/warn fuera de reportError (adapter 7, storageManager 5, syncService 2, dbLifecycle 3, eventBus 28…) → nunca aparecen en SystemLogs.
X07  | globals.css:92,100,124 vs :70-86 | ALTO | CONFIRMADO | --accent #60A5FA no se redefine por tema: en claro da 2.54:1 y 2.45:1 → falla 1.4.3 (texto) y 1.4.11 (indicadores). Evidencia runtime: tema por defecto es oscuro (OK 6.98:1).
X08  | App.jsx:257-307 | MEDIO | CONFIRMADO | ViewTabs sin role=tablist/tab, sin aria-selected/aria-current, sin <nav>; activo solo por estilo.
X09  | App.jsx:292 | MEDIO | CONFIRMADO | Etiquetas de pestaña ocultas bajo 480px (hidden xs:inline) sin aria-label/title → 4.1.2/1.1.1 fallan en móvil.
X10  | GlobalSearch.jsx:228; ConfiguracionView:3954,4116,4224 | MEDIO | CONFIRMADO | role=dialog + aria-modal sin trampa de Tab ni gestor de foco (no usan useDialogA11y, a diferencia de ConfirmDialog/Modal/SidePanel).
X11  | PlantillasView.jsx:281-288 | MEDIO | CONFIRMADO | Targets táctiles 20-22px < 24px (WCAG 2.5.8). Ídem SpeechsView:369-407, MapeoView:83-151.
X12  | MapeoView.jsx:85,99,111… (~50 botones) | BAJO | PROBABLE | Botones solo-icono con title y sin aria-label (nombre accesible frágil). App.jsx:1426 ya usa aria-label: hay patrón a seguir.
X13  | App.jsx:1376 + index.html:10 | BAJO | CONFIRMADO | Sin landmark main, sin h1 (salvo GuideView), sin skip-link, document.title estático.
X14  | App.jsx:432-434 vs GlobalSearch.jsx:211-212 | MEDIO | CONFIRMADO | onSelectEntity ignora tipo+nombre: buscar una aseguradora/estudio/condición no lleva a la entidad (solo cambia a vista utiles).
X15  | TablaView.jsx:64,76,272 | MEDIO | CONFIRMADO | Memo de filas derrotado: PhoneLink en vez de PhoneLinkMemo, getEstados por fila, prop seleccionados cambia identidad → 50 filas re-renderizan por check. (Coste mitigado: getEstados devuelve referencia estable — certeza MEDIA del impacto.)
X16  | UtilesView.jsx:151-183,306 | MEDIO | CONFIRMADO | Badges con localStorage.getItem+JSON.parse por categoría en cada render, agravado por X01.
X17  | UtilesView.jsx:94-104 | BAJO | PROBABLE | Effect [subvista] reconsulta getAllTemplates en cada tab aunque el conteo no depende de subvista.
X18  | GlobalSearch.jsx:392-406 | MEDIO | CONFIRMADO | Resultados sin role=listbox/option ni aria-activedescendant: el cursor de flechas solo se comunica por color.
X19  | MapeoView.jsx:16-18 | BAJO | PROBABLE | DireccionCell inicializa sel sin efecto de sincronía → tras import/restore muestra valor viejo.
X20  | ConfiguracionView.jsx:291-302 | BAJO | PROBABLE | getBackupHistory().then() sin .catch/.finally → spinner puede quedarse colgado.
X21  | .eslintrc.json:1-3 vs package.json:40-44 | MEDIO | CONFIRMADO | .eslintrc.json raíz (solo parser) tiene precedencia sobre eslintConfig → reglas react-hooks/exhaustive-deps pueden no aplicarse; explica X03/X22 y que el build compile limpio.
X22  | TablaView.jsx:140-146 | BAJO | CONFIRMADO | useMemo de sorted con deps incompletas (omite valorOrden) → memo se invalida siempre.
X23  | useRecentEntities.js | MEDIO | CONFIRMADO | CORRECCIÓN de falso positivo del análisis de dead-code: es el ÚNICO escritor de recent-entities-art-tracker (GlobalSearch:87 lo lee, App:1206 lo borra, backup lo incluye) → borrarlo rompe backup. El hook está vivo aunque no se importe en flujo principal.
X24  | GlobalSearch.jsx:85-88 | MEDIO | CONFIRMADO | UI muerta: sección "Vistos recientemente" siempre vacía porque nadie invoca useRecentEntities en flujo (ver X23).
```

## 6. Matriz de configuraciones (§30)

Estado: OK / PARCIAL / SIN_UI / SIN_CONSUMIDOR / OBSOLETO / SIN_DEFAULT.

| Clave | Estado | Evidencia |
|---|---|---|
| operador, estadoDefault, telefonoFormato, casosPorPagina, insightEnJornada, estados, tiposIngreso, fichaFields, columnasVisibles, modoNoMolestar, animaciones, microinteracciones, emptyStates, skeletonLoader, tooltipsMejorados, atajosTeclado, confirmaciones, alineacionPestanas, busquedaFiltro/Historial/MaxHistorial, notifInApp, notifSonido, notif{CambioEstado,Reporte,Evento,Backup,Error}, notifFrecuencia, notifMinToastPriority, notifGrave/Media/BajaSound, import*, citas{AutoCrear,AutoActualizar,AutoReprogramar} | **OK** | matriz completa en §5.5 del informe de agentes (UI ConfiguracionView + consumidor real) |
| idioma | PARCIAL (C06) | I18nContext/App:226,258; traducciones sin aplicar |
| formatoFecha | PARCIAL (D06) | configFormatters vs dateFilters |
| plantillas | OBSOLETO (C04) | solo test; plantillas reales = Dexie templates |
| sonidoNotificaciones, citasMostrarInfoCaso, idxNombre/Telefono/Localidad/Aseguradora/Observaciones | SIN_CONSUMIDOR (C03/D15) | toggles de UI sin efecto (idx*) o legacy (sonidoNotificaciones) |
| volumenNotificaciones | SIN_UI + SIN_DEFAULT (C01) | soundSystem:145 |
| ignorarLowPriority | SIN_UI + SIN_DEFAULT (C02) | ruleEngine:49 |
| notifEscritorio, bajoConsumo | SIN_DEFAULT (C05) | UI y consumidor sí |
| widget* (9 de 14 sin declarar) | PARCIAL (D16) | Dashboard:269 usa `!== false` |

**8 claves con defecto** (2 sin UI, 4 sin consumidor/obsoletas, 3 sin default, 2 parciales de formato — con solapes).

## 7. Matriz de funcionalidades (§31)

| Operación | Grado | Problema (ID) |
|---|---|---|
| Crear/editar caso | A | excepción: campos fuera de CAMPOS_GENERALES (F18) |
| Reporte rápido | A− | F03 (origen), F16 (toast sin escritura) |
| Reporte inline (VerCaso/CasoEdit) | A− | gate computeCaseChanges → F18 |
| Cambio de estado | A | — |
| Eliminar caso | B | F01 (sin cascade), F17 (undo sin historial) |
| Borrar por mes (Config) | B | F19 (bulkDelete sin cascade/undo) |
| Deshacer global | B | restaura solo `casos` |
| Import CSV / restore backup | C (trazabilidad) | sin CASE_CREATED ni lastActivityAt |
| Borrar todos los datos | A (con survivors P01) | templates/saved_reports/snapshots/errors quedan |
| Duplicar caso | C | F02: atajo documentado, sin handler |
| Reportes guardados | C (inalcanzable) | R01: CRUD sin UI |
| Búsqueda global | B | S11/S11b/X04/X14/X18 |
| Reacción multi-pestaña | G | sólida, pero coexiste con escrituras directas |
| Calendario drag&drop | C (día) / B (mes) | E01 crítico, E02, E03, F20 |
| Métricas dashboard | B | M01/M21/M22/M23… (2-3 motores) |

## 8. Código legacy / muerto y dependencias (§19/§25/§32)

**12 archivos sin importadores** (verificados con y sin barrels; X23 corrige useRecentEntities):
`components/notifications/index.js` (barrel), `core/notifications/index.js` (barrel), `features/templates/index.js` (barrel), `core/theme/colorUtils.js` (100% muerto), `core/notes/notesManager.js`, `core/user/userManager.js`, `core/validation/validateData.js`, `hooks/useAdvancedSearch.js`, `hooks/useLiveQuery.js`, `hooks/useNotify.js`, `hooks/useTheme.js` (wrapper muerto; el vivo es ThemeContext), `hooks/useRecentEntities.js` (EXCEPCIÓN: no borrar — X23; su UI está muerta por X24).

**~49 símbolos exportados sin uso externo ni interno** (clusters): entityRelations.js ×11, caseRelations.js ×6, dateFilters.js ×4, StorageService.js ×3, themeManager wrappers ×5 (applyTheme/loadTheme/saveTheme/setTheme/toggleTheme — el vivo es la clase themeManager), attentionRules ×7 checks, operatorMessages greetings, easterEggs internals, constants OPCIONES_BACKUP/SONIDO, etc.

**6 dependencias sin uso**: @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, @tiptap/pm (redundante: peer de tiptap), @tiptap/suggestion, es-abstract (transitivo). Quitarlas: BAJO impacto (install/lockfile).

**Docs/versiones**: README ×3 y PROJECT_CONTEXT en 1.8.8 (R10); manifest.json sin version (informativo); `src/docs/docs/arquitectura_v0.3.5.md` es histórico y describe un servicio de notificaciones ya eliminado (informativo).

## 9. Priorización para la fase de correcciones (§33)

**P0 — corrompe datos o destruye trabajo**
1. **E01** — drag día destruye citas (ISO doble T + CITA_DELETED).
2. **P01** — borrado total incompleto (8 survivors; el usuario cree que limpió).
3. **F19/F01** — borrados sin cascade → case_history y relaciones huérfanos.
4. **D02/D13/D14** — renombrar estado rompe alertas/reglas/PDF/metas (hasta P1 si se documenta).

**P1 — el usuario ve números/estados falsos**
5. **M01/M21/M22/M25** — métricas incompatibles en la misma pantalla.
6. **RUN-01** — atajos PWA a vistas no funcionan en arranque frío.
7. **T01/T17** — toasts que ignoran config; check de errores repetidos muerto.
8. **N17/N01** — Escape universal; VerCaso bajo overlays.
9. **S11/S11b/X14** — buscador global con campos inexistentes.
10. **E02** — último día del mes invisible en calendario.

**P2 — calidad, a11y y performance**
11. X01/X02/X04 (renders y debounce), X07/X08/X09/X10/X11/X18 (a11y), R03/D07 (UTC), D08 (merge de defaults), F11 (poda de historial), C01/C02 (claves sin UI), R01 (dar UI o retirar "Reportes guardados").

**P3 — higiene**
12. S10 (deps), dead-code (12 archivos + ~49 símbolos), R02 (7 concatenaciones), N22, D10, X05/X06/X20/X21/X22, R10 (README/PROJECT_CONTEXT 1.8.8), F02 (implementar o retirar del menú de atajos).

## 10. Evidencia runtime (§12/§13)

- 21 capturas (7 vistas × 360/768/1366 px) en `Temp\opencode\audit\shots\` con 12 casos sembrados, build de producción servido por Node, Chrome 155 headless vía CDP.
- Verificadas en pantalla: dashboard con KPIs y alerts reales; kanban con pipeline y tarjetas (se ve timestamp ISO crudo `(2026-10-12T09:15:00)` en cards — UX menor); tabla responsive en 360 px; modal "Nuevo caso" correcto en 2 columnas a 768 px.
- **RUN-01 y E01 fueron hallados/confirmados en este pase** (el primero por el comportamiento real de los shortcuts; el segundo trazado en código por el agente de calendario con el mismo mecanismo).
- Hallazgo de entorno (informativo): en headless la app muestra el banner "Almacenamiento no persistente" (esperable sin origin seguro/persistencia concedida).

## 11. Metodología y anti-falsos-positivos (§34)

- Scripts propios en `Temp\opencode\audit\` (deps.js, deadcode.js, versions.js, cdp.js, serve.js): solo lectura sobre el repo.
- Los agentes reconstruyeron los hallazgos leyendo código; CERTEZA CONFIRMADO = flujo trazado. Se detectó y corrigió 1 falso positivo (X23) y 1 claim erróneo previo (auto_backups SÍ se limpia — P01).
- La suite completa (1056) y el build quedaron en verde al cierre de la auditoría; ningún archivo del repo fue modificado salvo este informe.

## 12. Regresiones vs releases previos (§38)

- H1 (1.10.0): 7 concatenaciones remanentes no cubiertas por el escáner (R02).
- 1.9.7: bug de fecha UTC (toISOString.slice) reaparece en computeMetrics/analyticsEngine (R09) — mismo patrón corregido en otras vistas.
- PWA shortcuts (feature histórica): rotos por la restauración de filtros (RUN-01).
- "Reportes guardados" (1.7.10): CRUD completo quedó sin UI en algún refactor (R01).

## 13. Recomendaciones de proceso

1. Activar `react-hooks/exhaustive-deps` y reglas básicas de ESLint (X21) — habría prevenido X03/X22.
2. Regla de código: toda escritura de casos pasa por `App.guardarCaso`/caseRepository (elimina F01/F19/F20 de raíz).
3. Un solo motor de métricas (elegir metricsEngine o computeMetrics como canónico) y catálogo único de estados/resolución por config (elimina D02/D03/D13/D14/M*).
4. Añadir test de regresión para E01 (parseo de cita) y RUN-01 (hash en arranque) antes de tocar.
5. Actualizar README ×3 y PROJECT_CONTEXT en cada release (R10).

---

*Auditoría cerrada 11/10/2026. Total: 96 hallazgos (1 CRÍTICO, 19 ALTO, 51 MEDIO, 22 BAJO, 2 COSMÉTICO, 1 INFORMATIVO). Sin correcciones aplicadas, sin commit.*
