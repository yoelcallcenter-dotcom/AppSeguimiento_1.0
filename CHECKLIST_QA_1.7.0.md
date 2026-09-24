# Checklist de verificación visual — AppSeguimiento 1.7.0

Centro "Hoy" y Actividad Diaria. Verificación manual tras `npm run build` / `npm start`.

## 1. Centro "Hoy" en Mi Espacio

- [ ] Entrar a **Mi Espacio** (tab "Mi Jornada" sigue siendo la vista por defecto).
- [ ] Se ve la card **"Próxima actividad"** como PRIMER elemento de la vista (por encima del panel de estado de jornada).
- [ ] Si hay una cita/evento futuro programado, la card muestra hora (`HH:mm`), badge de día (Hoy/Mañana/En X días) y el caso asociado.
- [ ] Si no hay actividad futura, la card no aparece (sin estado vacío roto).

## 2. Línea temporal "Actividad de hoy"

- [ ] Se muestra la card **"Actividad de hoy (N)"** con los elementos del día en una línea temporal cronológica.
- [ ] Cada item tiene: hora, ícono de tipo (cita/evento/reprogramación/caso/reporte/nota), título y detalle.
- [ ] Los elementos están ordenados por hora ascendente.
- [ ] Hacer click en un item de CITA/EVENTO navega al modal de evento existente (`onNavigateToEvent`).
- [ ] Hacer click en un item de CASO navega al `VerCasoModal` existente.
- [ ] No hay duplicación: un caso con reporte de hoy aparece una sola vez.

## 3. Carrusel "Requieren tu atención"

- [ ] Se muestra la card **"Requieren tu atención (N)"** con casos pendientes priorizados.
- [ ] Los casos con severidad **danger** (Urgente) aparecen primero, luego warning (Pendiente), luego info (Seguimiento).
- [ ] Cada item muestra razon del problema (Sin actividad / Sin reporte / Sin estudio / Evento vencido).
- [ ] Click en un caso navega al `VerCasoModal`.
- [ ] Si no hay casos pendientes, la card no aparece.

## 4. Orden de secciones

- [ ] Orden correcto: 1) Próxima actividad, 2) Estado de jornada, 3) Actividad de hoy, 4) Requieren tu atención, 5) Objetivos diarios, 6) Ritmo, 7) Objetivos semanales, 8) Insight destacado (reubicado), 9) Próximo hito, 10) Backup, 11) Resumen de jornada (si finalizó), 12) Acceso rápido.

## 5. Navegación / modals

- [ ] No se abren modals duplicados ni se rompe el flujo de `onVerCaso` / `onNavigateToEvent` (se reutilizan `VerCasoModal` y `EventModal` existentes).
- [ ] El botón "Ver análisis →" del Insight destacado sigue funcionando hacia el Dashboard.

## 6. Tema / tipografía / responsive

- [ ] Cards usan los tokens del Design System (`--color-surface`, `--color-border`, `--color-accent`, etc.).
- [ ] Colores de timeline usan la paleta `--chart-color-*` (cita/accent, reprogramación/warning, caso/contact, reporte/conversion, nota/cases, evento/orange).
- [ ] Se ve bien en mobile (~360px): la timeline no desborda, las pills no se cortan de forma ilegible en listas de casos.

## 7. A11y

- [ ] Los items clickeables son botones reales (`<button>`), navegables por teclado.
- [ ] Los íconos decorativos tienen `aria-hidden`.
- [ ] No hay pérdida de foco ni elementos no enfocables al navegar por la timeline.

## 8. Regresión 1.7.0

- [ ] Bump de versión **1.7.0** visible en `package.json` y `src/core/version.js`.
- [ ] `docsContent.js` regenerado (contiene sección `[1.7.0]`).
- [ ] CHANGELOG y README de `src/docs/` y `public/docs/` en sync (MD5 idénticos).
- [ ] No hay errores de consola ni warnings de "unable to resolve" por `TodaySummary.jsx` eliminado.
- [ ] Suite de tests completa (506 tests) y `npm run build` sin errores.
