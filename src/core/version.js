/**
 * version.js
 * VersiÃ³n de la aplicaciÃ³n. Ãšnica fuente de verdad para mostrarla en la UI,
 * incluirla en feedback/exportes y para la validaciÃ³n de migraciones.
 */
// v1.10.8: export resistente con salvamento de tablas dañadas (backup parcial
// consciente), reparación profunda del almacenamiento (deleteDatabase de
// AppData + CasesDB), clears por tabla del vaciado global (sin abortos
// silenciosos ni tablas de liquidaciones sobreviviendo) y snapshot de
// emergencia en localStorage restaurable aunque la base esté muerta.
// Además corrige el "Restaurar desde archivo" del banner (1.10.6/1.10.7 le
// pasaba el wrapper de parseBackupJSON y fallaba SIEMPRE en producción).
// v1.10.9: la reparación profunda borra las TRES bases (ahora incluye
// AppDiagnostics, el log de errores: su archivo dañado re-apretaba la bandera
// de pérdida con cada reportError) y, si tras un drop ok las lecturas siguen
// fallando, el banner lo diagnostica con pasos concretos (pestañas/PWA/
// "Clear site data" en el origen correcto) vía la marca app-repair-pending.
// Además el botón "Reparar base de datos" vive junto al "Historial ilegible"
// de Configuración → Datos. También corrige el acceso al detalle de pérdida
// (storageLostDetail, no el boolean storageLost).
// v1.10.11 (se salta la 1.10.10): transformador de texto de 6 modos en Notas
// y Reportes (toolbar TextCaseToolbar + menu del editor que preserva marcas),
// modal del caso con sus 4 secciones como segmented control (Herramientas
// absorbe Notas y Eventos) y limpiezas de la ficha: sin alta de reportes en
// los modales del caso (alta solo desde Reporte rápido), sin objeciones, sin
// pills "+N" e iconos en los 13 labels. Fix de fecha del test de recálculo
// de OperatorLiquidaciones (dependía de que el mes actual fuera octubre).
// v1.11.0: rediseño del asistente interactivo de llamadas (antes "Speechs
// Interactivos"): modelo v2 por etapas/preguntas/ramificaciones, registro de
// la llamada en memoria, editor en 8 secciones, IO JSON v2 con fusión de
// objeciones, runner con progreso y guion de ejemplo ART (8 etapas, 9
// estados, 12 objeciones) sembrable solo desde el estado vacío.
// v1.11.1: constructor visual de flujos como novena sección del asistente:
// grafo sobre el mismo modelo v2 (opciones como puertos), edición por nodo,
// conectar/desconectar, auto-organizar con layout opcional, deshacer/rehacer
// local, validación navegable y vista previa con el runner (sin persistir).
// v1.11.2: Modo llamada para ejecutar speeches en llamadas reales con el
// mismo motor de 1.11.0 (sesionLlamada + useSesionLlamada): pantalla enfocada,
// breadcrumb del recorrido real, gate de obligatorios, cambio de respuesta con
// impacto, finalización revisada y salida de 3 caminos. La ejecución anterior
// queda como Vista rápida. Las llamadas pendientes viven en localStorage por
// guion, se excluyen de backups y se limpian con "borrar todo"/útiles.
// v1.11.3: plantillas de registro por speech (campos, tipos, condiciones de
// visibilidad genéricas y mapeo explícito al caso) integradas con el
// constructor visual y el Modo llamada; recálculo de derivados, distinción
// auto/manual, guardado parcial y registro confirmado en el módulo de casos.
// v1.11.3b (hotfix): ProLegal cambió la ruta de su buscador; el acceso desde
// el nombre del caso pasa de /search a /buscar con el mismo encodeURIComponent.
// v1.11.4: correcciones generales — calendario con outline del estado REAL del
// caso y apertura del caso desde el evento; notas con rediseño de la vista y
// conservación de saltos de línea (texto plano, plantillas, pegado y guardado);
// modal del caso con orden Reportes→Comentarios→Herramientas→Historial; y
// Directorios en orden Estudios→Lesiones→Aseguradoras→Tránsito→ProLegal.
// No toca el asistente interactivo, su constructor, los datos ni la estructura
// de los casos.
export const APP_VERSION = "1.11.4";

/** Nombre comercial de la aplicaciÃ³n. */
export const APP_NAME = "AppSeguimiento";
