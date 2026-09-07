# Checklist de verificación visual — AppSeguimiento 1.6.8

Recorrido manual recomendado. Probá cada ítem y marcá `[ ]` → `[x]` (o `[!]` con detalle si algo falla).
Verificación estática ya cubierta por CI: tests `npm run test:run` (497) y `npm run build` OK.

## 1. Temas y tipografía

- [ ] Cambiar tema oscuro ↔ claro ↔ personalizado; todos se aplican sin parpadeos ni colores rotos.
- [ ] Los 7 presets de familia de fuente (Clásico, Editorial, Retro/Humanista, Futurista, Monoespaciado/Terminal, Experimental, Minimal/Moderno) se aplican en toda la UI.
- [ ] Los 3 tamaños de fuente (chico/medio/grande) se aplican globalmente.
- [ ] En gráficos (Dashboard → Analítica), las barras/líneas/círculos conservan los colores correctos en los 3 temas (verificar KPIs, ProvinceBars, TypeBars, StudyBars, StackedBars, WeeklyTrend, TimeMetrics, ConversionBars, CaseDistribution, CategoryDonut).
- [ ] Alertas e insights: colores de severidad (rojo/ámbar/azul/verde) visibles y con contraste correcto en ambos temas.

## 2. Header y navegación

- [ ] Las 6 pestañas (Mi Espacio, Dashboard, Kanban, Tabla, Reportes, Útiles) navegan bien con clic y con `Ctrl+1` a `Ctrl+5`.
- [ ] La pestaña activa se resalta correctamente; al cambiar de vista la pestaña activa se actualiza.
- [ ] Al recargar con una ruta hash (ej. `#/dashboard`), la pestaña correcta queda activa.

## 3. Componentes base

- [ ] Botones (primario, outline, ghost, sizes sm/md/lg) con hover/press/disabled/focus-visible.
- [ ] Inputs y textareas con focus ring visible.
- [ ] Pills, tags y badges legibles (sin texto cortado ni 9px ilegible).
- [ ] Modales: abrir/cerrar con Escape, foco se mueve dentro, scroll de fondo bloqueado, backdrop clic cierra (donde aplique).
- [ ] Toasts y notificaciones: entran/salen con animación, se pueden cerrar, la campana muestra contador.

## 4. Vistas principales

- [ ] **Mi Espacio**: perfil, jornada, disponibilidad, metas, exportación PDF (selección de secciones).
- [ ] **Dashboard**: 6 pestañas ordenables; widgets configurables; KPIs con tendencia; funnel; alertas; próximos eventos; mapa.
- [ ] **Kanban**: drag & drop entre estados; columna nueva; en `pointer: coarse` el selector de orden es táctil (min 36px).
- [ ] **Tabla**: filtros, columnas seleccionables, selección múltiple, acciones masivas, orden por columna (teclado + clic), empty state "Sin datos aún".
- [ ] **Reportes**: historial por caso, carga rápida, export CSV/PDF.
- [ ] **Útiles**: las 10 herramientas (Pasos, Speechs, Objeciones, Conversaciones, Aseguradoras, Lesiones, Prolegal/Estudios Jurídicos, Tránsito, Condicionales, Mapeo).

## 5. Flujo completo de datos

- [ ] **Crear caso** nuevo (`Ctrl+N` o botón Nuevo) → aparece en Tabla/Kanban.
- [ ] **Cargar reporte** desde el caso (o `Ctrl+R`) → se registra en historial/reportes.
- [ ] **Historial**: abrir detalle del caso → timeline muestra creación/ediciones/reportes/notas/cambios de estado.
- [ ] **Nota** vinculada al caso (inline y editor completo) → se guarda en Bloc de Notas y se ve en el caso.
- [ ] **Cita/evento** de calendario vinculado al caso → aparece en Calendario y en próximos eventos.
- [ ] **Reprogramación** desde reporte rápido → crea cita nueva y avisa al usuario.
- [ ] **Firma** del caso → celebración, meta contabilizada, evento en historial.

## 6. Backup / Import / Export

- [ ] **Exportar backup completo** → archivo JSON válido.
- [ ] **Importar** ese backup en una pestaña con datos → igual resultados (round-trip 1:1).
- [ ] **Restaurar** → datos equivalente; no se pierden casos/notas/eventos/config.
- [ ] **Diagnóstico → Integridad**: corridas sin errores graves; reparación de órdenes funciona.
- [ ] **Exportar CSV/PDF** (casos, reportes, notas, calendario) → archivos generados correctos.
- [ ] **Importar CSV** inteligente: mapeo automático/manual/plantilla, estrategias de duplicados, preview.
- [ ] **Importar/exportar config** de útiles por categoría.

## 7. Accesibilidad (smoke)

- [ ] Tab sin mouse: pestañas, botones, inputs, modales y búsqueda global (`Ctrl+K`) son operables.
- [ ] Errores de formulario se anuncian (`role="alert"`).
- [ ] Los gráficos son operables con clic (drill-down a la tabla).

## 8. Responsive

- [ ] En ~360px de ancho: header con scroll, tabla con scroll horizontal, kanban táctil, modales usables.
- [ ] En desktop ≥1280px: dashboard con 8 KPIs por fila (si está configurado).

## 9. PWA / Offline

- [ ] Instalar la app desde el navegador.
- [ ] Con la app abierta offline, cargar casos/notas/calendario sin error.
- [ ] Al recibir una actualización, el aviso de recargar aparece.

## 10. Regresión de esta release (1.6.8)

- [ ] No aparecen errores tipo "radio", "unable to resolve" ni logs de módulos eliminados (Input, EditableForm, ShortcutsHelp, SelectorTema, ModoNoMolestar, BlocNotas, Card, NoteList, NoteCard, useBlocNotas, components/notes).
- [ ] Configuración → Apariencia → Tipografía: al cambiar preset no se resetea el tamaño elegido.
- [ ] Open devtools → Network: sin dependencias rotas; todo carga desde la app.
- [ ] Open devtools → Console: sin errores no intencionales (los `console.warn` de tour/multipestaña son esperados).