# AppSeguimiento

**Versión 1.8.8** — Sistema de gestión de casos ART (aseguradoras de riesgo de trabajo) para seguimiento de derivaciones, diseñado para operadores de call center. Aplicación **offline-first / PWA** con datos 100% locales.

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

### 1.8.4 — Configuración y Personalización
- **Configuración rediseñada**: 17 secciones con navegación unificada por pills, encabezados con ícono y descripción, sugerencias homogéneas y tarjetas consistentes.
- **Vistas y Mi Espacio**: reordenables con íconos por bloque desde Apariencia → Vistas; el Dashboard usa un registro único compartido y el editor normaliza órdenes antiguas automáticamente ("Próxima actividad" y "Próximos eventos" ahora son bloques separados).
- **Español / English**: se eliminó la opción "Português"; una configuración previa en `pt` se migra automáticamente a Español al abrir Configuración.

### 1.8.3 — Estadísticas y Cálculos
- **Días hábiles efectivos (FH = TM − FS − In − Fe − Va)**: todos los promedios, ritmos, tendencias, comparativas y metas descuentan de forma consistente fines de semana (según `workingDays` del perfil), inasistencias, feriados y vacaciones; los solapes se cuentan una sola vez.
- **Disponibilidad corregida**: `getAvailabilitySummary` solo cuenta días laborables efectivos; metas semanales respetan el último día hábil real y el ritmo del día promedia sobre 30 días hábiles efectivos.
- **Analítica efectiva**: promedios diarios, tendencias por día/semana, proyecciones y series del dashboard/exporte omiten días no laborables por disponibilidad.

### 1.8.2 — Exportaciones y Documentación
- **CSV analítico**: toggle "Detalle por caso / Analítico (resumen)" en el exportador, con KPIs, productividad, conversión, estados, estudios, aseguradoras, localidades, tendencias, comparativas y períodos en un solo archivo para el rango seleccionado.
- **PDF de Mi Espacio completo**: ahora exporta disponibilidad, progreso de metas, ritmo del día, estadísticas de efectividad por día efectivo y próximos eventos además de perfil, jornada, métricas y resumen del período.
- **Ejemplos de casos reales**: 4 casos de ejemplo con ART + horario de cita, operador asignado y cita dinámica con fecha de hoy.
- **Pegado de ficha con HORARIO**: el pegado completo adiciona el campo `HORARIO:` a las observaciones (mantiene el resto de campos).

### 1.8.1 — Consistencia Visual y Experiencia de Uso
- Filtros unificados con primitivas reutilizables (`FilterBar`, `FilterGroup`, `FilterLabel`, `FilterChip`, `FilterCounter`).
- `PipelineBar` con multi-selección de estados (quickFilter con arrays, botón Limpiar y contadores).
- Cuadros de búsqueda estandarizados (`SearchInput` con botón X) en toda la app y búsqueda global (Ctrl+K) agrandada con contador de resultados.
- Reportes con orden fijo (MonthDayFilter → PipelineBar → Reportes Guardados → Lista → Paginación).
- Modal de caso: footer en una fila y reportes editables inline con plantillas; Editar/Reporte se apilan sobre VerCaso (`useModalStack`, `inert`, `z-submodal`).
- Mi Disponibilidad rediseñada con strip mensual y colores por variables CSS.

### Mi Espacio (centro de trabajo)
- Abre siempre en Mi Espacio, en el centro de trabajo "Hoy": una sola página con los bloques del día (bienvenida, jornada, próximos eventos, pendientes, productividad, metas, acciones rápidas, accesos) en el orden que prefieras.
- Perfil del operador: nombre, rol, empresa, localidad, contacto y jornada habitual.
- Resumen de la jornada, disponibilidad (vacaciones, feriados, inasistencias) y metas personales diarias/semanales/mensuales con ritmo necesario.
- Accesos y credenciales personales (solo locales, nunca se exportan).
- El orden de los bloques del "Hoy" se reordena en Configuración → Apariencia → Vistas.

### Gestión de Casos
- **Kanban**: arrastrar casos entre estados (Cita virtual, No responde, Firmo, etc.).
- **Tabla**: ordenar, filtrar y seleccionar casos con columnas personalizables.
- **Reportes**: historial completo de reportes por caso.
- **Calendario**: eventos vinculados a casos, reprogramación y citas.
- **Bloc de Notas**: notas enriquecidas (Tiptap) con vínculo a casos.
- **Búsqueda global** (`GlobalSearch`): búsqueda en tiempo real por nombre, teléfono, localidad, `#etiquetas`, `@comentarios`, reportes e historial de casos, con navegación contextual (Ctrl+K).
- **Pegado inteligente**: al pegar una ficha completa se detecta automáticamente el tipo de ingreso con palabras clave configurables (Configuración → Tipos de Ingreso).

### Estadísticas y Analítica
- Dashboard multi-pestaña (Analítica, Resumen, Rendimiento, Geografía, Estudios, Estados).
- KPIs, insights automáticos, distribución por estado/categoría, tendencia 30 días, barras apiladas, tipos de ingreso y evolución.
- Logro de objetivos, funnel de conversión, mapa por localidad, próximos eventos.
- Pestañas, widgets y métricas configurables.

### Útiles
- **Speechs**: guiones predefinidos con copia al portapapeles y edición directa.
- **Objeciones**, **Conversaciones Sugeridas** (con variables `{OPERADOR}`), **Aseguradoras** (ART y Tránsito), **Lesiones**, **Pasos a Seguir**, **Tips**, **Links útiles**.
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

```
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
```

### Flujo de Datos

1. **Evento de app** → `eventBus.emit(AppEvents.XXX, data)`
2. **NotificationManager** recibe el evento, lo normaliza y evalúa con RuleEngine.
3. **RuleEngine** decide: ¿es duplicado? ¿se agrupa? ¿modo no molestar?
4. **NotificationStore** guarda la notificación (estado + localStorage).
5. **SoundSystem** reproduce sonido si está habilitado.
6. **ToastContainer** renderiza toast si notificaciones in-app están activas.
7. **NotificationBell** actualiza el badge de no leídas.
8. **NotificationCenter** muestra el historial persistente.

Prioridades: **BAJA** (Centro, sin toast, sin sonido) · **MEDIA** (Centro + toast, sin sonido) · **ALTA/GRAVE** (Centro + toast + sonido). Deduplicación por `eventKey`.

### Uso desde componentes

```jsx
import { useNotify } from '../../hooks/useNotify';

function MiComponente() {
  const { notify, success, error, warning, info } = useNotify();

  const handleClick = () => {
    success('Operación exitosa', 'Los datos se guardaron correctamente');
  };
}
```

### Uso desde cualquier lugar (sin hook)

```js
import { notificationManager } from '../../core/notifications/notificationManager';

notificationManager.notify({
  type: 'error',
  title: 'Error de sincronización',
  message: 'No se pudieron guardar los datos',
  priority: 'high',
});
```

### Configuración y persistencia

- Se gestiona en **Configuración → Notificaciones**: canales (In-App, Sonido), tipos, frecuencia de agrupación y modo No molestar.
- Las notificaciones se almacenan en localStorage bajo `app_notification_center` (límite 200) y sobreviven a recargas.

## Sistema de Temas

Centralizado en `src/core/theme/` con arquitectura de tokens:

```
src/core/theme/
├── themeTokens.js       # Tokens de color (dark/light) + mapeo a CSS vars
├── themeManager.js      # Singleton que aplica temas y persiste en localStorage
└── colorUtils.js        # Utilidades de color (mezcla, generación de paletas)
```

`themeManager.init()` carga el tema guardado y aplica cada valor como CSS variable en `<html>`. Para tema personalizado, los colores base pasan por `generatePalette()` para generar la paleta completa.

**Variables clave**: `--color-bg`, `--color-surface`, `--color-surface2`, `--color-text`, `--color-text-muted`, `--color-accent`, `--color-border`, `--color-primary`, `--color-secondary`, `--color-success`, `--color-warning`, `--color-danger`, `--color-estado-*` (por estado de caso).

**Sistema de botones** (`src/components/common/Btn.jsx`): `Btn` con variantes `solid`, `outline`, `ghost`, y atajos `PrimaryButton`, `SecondaryButton`, `OutlineButton`. Tamaños `sm`/`md`/`lg`; estados hover (lift + opacity), active (press), disabled y focus-visible (ring).

## Estructura de la UI

```
src/
├── components/
│   ├── common/           # Btn, Modal, ConfirmDialog, EmptyState, Spinner, Skeleton,
│   │                     # EditableForm, OverlayPanel, ShortcutsHelp, Paginacion,
│   │                     # DayFilter, MonthDayFilterBar, etc.
│   ├── notifications/    # NotificationBell, NotificationCenter, PersistentAlert, ToastContainer
│   ├── kanban/ tabla/ reportes/ estadisticas/ modales/ notes/ calendar/
│   ├── configuracion/ utiles/ ayuda/ diagnostico/ entities/
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
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm install` | Instala dependencias |
| `npm start` | Dev server (regenera docs) |
| `npm run build` | Build de producción a `build/` |
| `npm run test:run` | Suite completa con Vitest (una pasada) |
| `npm run test` | Vitest en modo watch |
| `npx vitest run <archivo>` | Un solo archivo de test |

## Atajos de Teclado

| Atajo | Acción |
|-------|--------|
| `Ctrl + N` | Nuevo caso |
| `Ctrl + R` | Cargar reporte |
| `Ctrl + F` | Buscar casos |
| `Ctrl + S` | Guardar datos |
| `Ctrl + D` | Duplicar caso |
| `Ctrl + E` | Exportar seleccionados |
| `Ctrl + H` | Abrir ayuda |
| `Ctrl + K` | Búsqueda global |
| `Ctrl + 1-7` | Cambiar vista |
| `Escape` | Cerrar modal |

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

```bash
npm run build
# Build command: npm run build
# Output directory: build
# Framework preset: Create React App
```

### Netlify

```bash
npm run build
# Public directory: build
# Build command: npm run build
# SPA fallback: /*  →  /index.html
```

### Servidor propio (Nginx / Caddy / host estático)

```bash
npm run build
# Subí el contenido de /build
```

**Importante para la PWA:**
- Servir por **HTTPS** (o localhost) — obligatorio para service workers.
- Configurar el servidor para que `asset-manifest.json` y `sw.js` no se cacheaden de forma agresiva (`Cache-Control: no-cache`).
- Para Vercel/Netlify no hace falta nada extra.

### Probar localmente

```bash
npm run build
npx serve -s build      # o: npm run preview
# Abrir http://localhost:5000
```

El service worker solo se activa en el build de producción (`npm run build`).

---

## Documentación

- **Changelog**: todas las novedades desde 1.6.0 en adelante en `src/docs/CHANGELOG.md` (y su copia `public/docs/CHANGELOG.md`).
- **Contexto técnico del proyecto**: `PROJECT_CONTEXT.md` (arquitectura, comandos, gestión de datos y versiones).
