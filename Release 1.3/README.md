[README.md](https://github.com/user-attachments/files/30711876/README.md)
# AppSeguimiento

**Versión 1.2.4** — Sistema de gestión de casos ART para seguimiento de derivaciones, diseñado para operadores de call center.

## Características

### Gestión de Casos
- Kanban Board: Arrastra casos entre estados (Cita virtual, No responde, Firmo, etc.)
- Vista Tabla: Ordena y filtra casos con columnas personalizables
- Reportes: Historial completo de reportes por caso
- Búsqueda: Búsqueda en tiempo real por nombre, teléfono o localidad
- Bloc de Notas: Notas personales accesibles desde el header

### Estadísticas
- Dashboard con KPIs (Total, Activos, Firmados, Sin Reporte, No Viables)
- Logro de Objetivos: seguimiento de 14 firmas por mes
- Últimos casos agregados
- Tareas del día (citas hoy, casos inactivos, sin reporte)
- Mapa de casos por localidad

### Útiles
- Speechs: Guiones predefinidos para llamadas con copia al portapapeles
- Objeciones: Respuestas para objeciones comunes
- Conversaciones Sugeridas: Plantillas por categoría con reemplazo de variables ({OPERADOR})
- Aseguradoras: Gestión de ART y Tránsito
- Lesiones: Categorización de lesiones por tipo
- Pasos a Seguir: Protocolo de trabajo
- Tips: Consejos para llamados
- Links útiles: Recursos de referencia
- Estudios Jurídicos: Mapeo por localidad con filtros

### Mi Espacio (personal)
- Perfil del operador: nombre, rol, empresa, localidad, contacto y jornada habitual
- Resumen de la jornada: estado del día, progreso de metas y ritmo necesario
- Disponibilidad: vacaciones, feriados, inasistencias y días no laborables
- Metas personales: objetivo diario y mensual de casos y reportes sobre días efectivos
- Accesos y credenciales personales (solo locales, nunca se exportan)
- Sugerencias inteligentes personales

### Personalización
- Temas: Oscuro, Claro o Personalizado
- Tamaño de fuente: Pequeño, Mediano o Grande
- Colores Base: 3 colores (Primario, Secundario, Terciario) que generan toda la paleta
- Colores por estado de caso: Personaliza cada estado individualmente

### Almacenamiento
- IndexedDB: Todos los datos se guardan localmente en el navegador (via Dexie)
- Backup completo: Exporta e importa todos tus datos (casos, notas, eventos y configuración) en JSON
- Sin conexión a internet: La aplicación funciona completamente offline

---

## Sistema de Notificaciones

### Arquitectura

```
src/core/events/
└── eventBus.js             # Pub-sub centralizado (emit/on/off)

src/core/notifications/
├── notificationStore.js    # Zustand store global de notificaciones
├── notificationManager.js  # Orquestador: recibe eventos, decide qué notificar
├── ruleEngine.js           # Motor inteligente: dedup, agrupación, prioridad
└── soundSystem.js          # Motor de sonido con tonos generados por Web Audio API

src/components/notifications/
├── ToastContainer.jsx      # Toasts efímeros (auto-dismiss)
├── NotificationBell.jsx    # Campana con badge + dropdown
├── NotificationCenter.jsx  # Panel lateral con historial completo + filtros
└── PersistentAlert.jsx     # Alertas persistentes (warning/error)

src/hooks/
└── useNotify.js            # Hook fácil: notify(), success(), error(), warning(), info()
```

### Flujo de Datos

1. **Evento de app** → `eventBus.emit(AppEvents.XXX, data)`
2. **NotificationManager** recibe el evento, lo normaliza y evalúa con RuleEngine
3. **RuleEngine** decide: ¿es duplicado? ¿se debe agrupar? ¿está en modo no molestar?
4. **NotificationStore** guarda la notificación en estado + localStorage
5. **SoundSystem** reproduce sonido si está habilitado
6. **ToastContainer** renderiza toast si notificaciones in-app están activas
7. **NotificationBell** actualiza badge de no leídas
8. **NotificationCenter** muestra historial persistente

### Eventos Disponibles

| Evento | Tipo | Cuándo se dispara |
|--------|------|--------------------|
| `CASE_CREATED` | success | Nuevo caso guardado |
| `CASE_UPDATED` | info | Caso modificado |
| `CASE_DELETED` | info | Caso eliminado |
| `CASE_STATUS_CHANGED` | info | Estado de caso cambiado |
| `NOTE_CREATED` | info | Nota creada |
| `NOTE_UPDATED` | info | Nota modificada |
| `EVENT_CREATED` | info | Evento de calendario creado |
| `EVENT_UPDATED` | info | Evento modificado |
| `BACKUP_COMPLETED` | success | Backup exportado |
| `BACKUP_IMPORTED` | info | Datos importados |
| `GOAL_ACHIEVED` | success | Meta de firmas alcanzada |
| `ERROR_OCCURRED` | error | Error del sistema |
| `SYNC_COMPLETED` | info | Sincronización completada |
| `DATA_CLEARED` | warning | Todos los datos eliminados |

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

### Configuración

Las opciones se gestionan en **Configuración → Notificaciones**:
- **Canales**: In-App, Sonido, Escritorio
- **Tipos**: filtrar eventos por tipo (cambio de estado, reportes, backup, errores)
- **Frecuencia**: agrupación para evitar spam
- **No molestar**: silencia todas las notificaciones

### Persistencia

Las notificaciones se almacenan en localStorage bajo `app_notification_center`, límite 200. Sobreviven a recargas de página.

---

## Sistema de Temas

### Arquitectura

El sistema de temas está centralizado en `src/core/theme/` y sigue una arquitectura de tokens:

```
src/core/theme/
├── themeTokens.js       # Tokens de color (dark/light) + mapeo a CSS vars
├── themeManager.js      # Singleton que aplica temas y persiste en localStorage
└── colorUtils.js        # Utilidades de color (mezcla, generación de paletas)
```

### Flujo de Aplicación

1. **`themeManager.init()`** se llama al arrancar la app (desde `ThemeContext` y `App.jsx`)
2. Carga el tema guardado, colores personalizados y colores de estado desde `localStorage`
3. **`applyThemeVariables()`** recorre el `cssVarMap` y aplica cada valor como CSS variable en `<html>`
4. Para tema personalizado, los colores base (primario, secundario, terciario) se pasan por `generatePalette()` para generar la paleta completa
5. `ThemeContext` expone `theme`, `customColors`, `estadoColors` y los métodos `changeTheme()`, `updateCustomColors()`, etc.

### Variables CSS Disponibles

| Variable | Propósito |
|----------|-----------|
| `--color-bg` | Fondo principal |
| `--color-surface` | Superficie de tarjetas |
| `--color-surface2` | Superficie secundaria (inputs, columnas kanban) |
| `--color-text` | Texto principal |
| `--color-text-muted` | Texto secundario / metadata |
| `--color-accent` | Color de acento (botones principales, highlights) |
| `--color-border` | Bordes estándar |
| `--color-border-light` | Bordes suaves |
| `--color-primary` | Color primario (acciones principales) |
| `--color-secondary` | Color secundario (acciones secundarias) |
| `--color-success` | Estados de éxito |
| `--color-warning` | Estados de advertencia |
| `--color-danger` | Estados de error/peligro |
| `--color-estado-*` | Colores por estado de caso (ej: `--color-estado-Firmo`) |

### Diseño de Espaciado y Tipografía

| Token | Valor por defecto |
|-------|-------------------|
| `--space-1` | 0.25rem |
| `--space-2` | 0.5rem |
| `--space-3` | 0.75rem |
| `--space-4` | 1rem |
| `--space-6` | 1.5rem |
| `--space-8` | 2rem |
| `--radius-sm` | 0.25rem |
| `--radius-md` | 0.375rem |
| `--radius-lg` | 0.5rem |
| `--radius-xl` | 0.75rem |

### Sistema de Botones

`src/components/common/Btn.jsx` exporta:
- **`Btn`** — Componente base con variantes: `solid`, `outline`, `ghost`
- **`PrimaryButton`** — Atajo para `Btn` con color primario
- **`SecondaryButton`** — Atajo para `Btn` con color secundario
- **`OutlineButton`** — Atajo para `Btn` con variante outline
- **`BtnOutline`** — Mantenido para compatibilidad (wrapper de `Btn` con `variant="outline"`)

Tamaños: `sm` (2rem altura), `md` (2.5rem), `lg` (3rem).  
Estados: hover (lift + opacity), active (press), disabled (50% opacity), focus-visible (ring).

---

## Estructura de la UI

```
src/
├── components/
│   ├── common/           # Componentes base reutilizables
│   │   ├── Btn.jsx       # Botón + PrimaryButton, SecondaryButton, OutlineButton
│   │   ├── DayFilter.jsx # Filtro de día unificado (Select dropdown)
│   │   ├── Select.jsx    # Select estilizado
│   │   ├── Pill.jsx      # Badge de estado
│   │   └── ...
│   ├── configuracion/    # Panel de configuración
│   ├── kanban/           # Vista Kanban/Tablero
│   ├── tabla/            # Vista Tabla
│   ├── reportes/         # Vista Reportes
│   ├── estadisticas/     # Componentes estadísticos
│   └── notifications/    # Centro de notificaciones, campana, toasts, alertas
├── core/
│   ├── theme/            # Sistema de temas (tokens, manager, color utils)
│   ├── events/           # EventBus centralizado (pub-sub)
│   ├── notifications/    # NotificationStore, Manager, RuleEngine, SoundSystem
│   ├── storage/          # Adaptadores y manager de almacenamiento
│   ├── sync/             # Sincronización de eventos
│   └── store/            # Zustand store global
├── context/              # React Context providers
├── features/             # Dashboard, Calendar, Notes, Search, etc.
├── styles/
│   └── globals.css       # CSS global con variables, temas y utilidades
└── utils/                # Utilidades (formatos, backups, etc.)
```

---

## Atajos de Teclado

| Atajo | Acción |
|-------|--------|
| Ctrl + N | Nuevo caso |
| Ctrl + R | Cargar reporte |
| Ctrl + F | Buscar casos |
| Ctrl + S | Guardar datos |
| Ctrl + D | Duplicar caso |
| Ctrl + E | Exportar seleccionados |
| Ctrl + H | Abrir ayuda |
| Ctrl + K | Búsqueda global |
| Ctrl + 1-7 | Cambiar vista |
| Escape | Cerrar modal |

## Instalación

```bash
git clone <repo>
npm install
npm start      # Desarrollo
npm run build  # Producción
```

---

## PWA: Instalación y uso offline

La aplicación es una **Progressive Web App** (PWA): se instala como una app nativa,
funciona **sin conexión** y se **actualiza sola** cuando hay una nueva versión.

### Cómo instalar en PC (Windows/Linux)

1. Abrí la app en **Chrome** o **Edge** (si la publicaste, tiene que estar servida por **HTTPS**).
2. Hacé click en el botón **"Instalar"** que aparece en la barra superior de la app.
3. Confirmá en el diálogo del navegador. Queda un acceso en el escritorio o en el menú de inicio.

> También podés usar el menú del navegador → **"Instalar AppSeguimiento"**.

### Cómo instalar en celular (Android)

1. Abrí la app en Chrome.
2. Tocá el botón **"Instalar"** en la barra superior, o el menú ⋮ → **"Agregar a pantalla de inicio"**.
3. Confirmá. El icono queda en la pantalla de inicio y abre a pantalla completa.

### Cómo instalar en iPhone/iPad (iOS)

1. Abrí la app en **Safari**.
2. Tocá el botón **Compartir** (cuadrado con flecha) en la barra del navegador.
3. Elegí **"Agregar a pantalla de inicio"** y confirmá.
4. La app abre a pantalla completa desde el icono (el botón "Instalar" de la app muestra estos pasos).

### Actualizaciones

- La app **detecta automáticamente** una nueva versión cuando la abrís y estás en línea.
- Aparece un aviso **"Nueva versión disponible"** con un botón **Actualizar**.
- Al tocarlo, la app recarga y queda en la versión más reciente. Podés ignorarlo y
  seguir trabajando; se te volverá a ofrecer la próxima vez.
- Los datos nunca se pierden: se guardan localmente en el dispositivo (IndexedDB).

### Uso offline

- Una vez cargada, la app **funciona completamente sin conexión**.
- Podés crear, editar y consultar casos aunque no haya internet.
- Cuando vuelvas a tener conexión, la app se sincroniza con la última versión.
- El banner de estado muestra si estás **en línea / sin conexión**.

### Shortcuts (íconos de acción rápida)

Al instalar la app en Android se agregan accesos directos de acción:
- **Panel principal**
- **Nuevo caso**

---

## Deploy

### Vercel

```bash
npm run build
# Subí el repo a GitHub y conectalo en Vercel
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

### Servidor propio (Nginx / Caddy / cualquier host estático)

```bash
npm run build
# Subí el contenido de /build
```

**Importante para que la PWA funcione:**
- Servir por **HTTPS** (o localhost) — es obligatorio para service workers.
- Configurar el servidor para que `asset-manifest.json` y `sw.js` no se cacheaden
  de forma agresiva (`Cache-Control: no-cache`).
- Para Vercel/Netlify no hace falta nada extra: ya manejan esto por defecto.

### Probar localmente

```bash
npm run build
npx serve -s build      # o: npm run preview
# Abrir http://localhost:5000
```

El service worker solo se activa en el build de producción (`npm run build`).
