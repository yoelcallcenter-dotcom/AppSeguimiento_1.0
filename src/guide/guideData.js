export const GUIDE_SECTIONS = [
  {
    id: "introduccion",
    title: "1. Introduccion",
    content: `AppSeguimiento es una aplicacion web diseñada para gestionar el seguimiento de prospectos derivados a estudios juridicos.

La aplicacion permite:
- Crear y gestionar casos de prospectos, individualmente o importando en lote desde CSV
- Registrar reportes y novedades de seguimiento con historial completo
- Organizar el trabajo mediante tablero Kanban con arrastrar y soltar
- Analizar el negocio con el Dashboard 2.0: 6 pestanas con metricas, funnel y alertas
- Buscar cualquier cosa con la Busqueda Global (casos, notas y eventos)
- Gestionar calendario de citas y bloc de notas vinculado a casos
- Administrar herramientas auxiliares (speechs, objeciones, aseguradoras, etc.)
- Personalizar la apariencia, el Dashboard y la configuracion
- Controlar tu jornada laboral, metas y disponibilidad en Mi Espacio

Todos los datos se almacenan localmente en el navegador, sin necesidad de conexion a internet una vez cargada la aplicacion.`,
  },
  {
    id: "primeros-pasos",
    title: "2. Primeros Pasos",
    content: `Al abrir la aplicacion por primera vez, se inicia automaticamente el Tour interactivo (14 pasos). Luego veras el Dashboard con un resumen general.

PASO 1: Configura tu nombre
Ve a Configuracion → Ajustes Generales e ingresa tu nombre como operador. Este nombre se usara en las conversaciones sugeridas (variable {OPERADOR}).

PASO 2: Configura las ART
Ve a Utiles → Aseguradoras y agrega las ART con las que trabajas. Incluye nombre, telefono y enlace de seguimiento.

PASO 3: Configura el mapeo de estudios juridicos
Ve a Utiles → Estudios Juridicos y asigna estudios juridicos a las localidades que cubris. Asi el estudio se asigna solo al crear casos.

PASO 4: Configura el Dashboard
Ve a Configuracion → Apariencia → Dashboard para definir pestanas, widgets, metricas y reglas de alerta a tu gusto.

PASO 5: Crea tu primer caso
Haz clic en "Nuevo caso" y completa los datos del prospecto. Puedes pegar una ficha completa con formato estructurado o importar varios casos desde CSV.

PASO 6: Configura tu jornada
Ve a Mi Espacio → Perfil y configura tu horario de trabajo. Esto habilita el control de jornada y el calculo de metas.

PASO 7: Realiza los tours interactivos
Ve a Ayuda → Tour interactivo. El recorrido guiado cubre todas las funcionalidades en detalle.`,
  },
  {
    id: "gestion-casos",
    title: "3. Gestion de Casos",
    content: `CREAR UN CASO
- Haz clic en "Nuevo caso" en el header
- Completa: nombre, telefono, localidad, ART, profesion, ingreso, lesion, tipo de ingreso, cita
- Opcional: pegar ficha completa con formato NOMBRE:, TELEFONO:, etc.
- Haz clic en "Guardar"

IMPORTAR CASOS DESDE CSV
- Usa la opcion Importar (CSV)
- El sistema mapea las columnas automaticamente y muestra una vista previa paginada
- Las comas mal usadas o columnas desalineadas se reparan solas
- Valida duplicados por telefono y formato de numero
- Confirma para importar en lote
- El historial de cambios se importa junto con los casos

EDITAR UN CASO
- Haz clic en el caso en cualquier vista
- Se abre el detalle con opcion "Editar"
- Modifica los campos necesarios
- Los cambios se guardan automaticamente al salir

CARGAR UN REPORTE
- Haz clic en "Reporte" en el header
- Busca el caso por nombre, telefono o localidad
- Selecciona el nuevo estado (opcional)
- Escribe la novedad
- Confirma para guardar

ELIMINAR UN CASO
- Abre el caso → Editar → "Eliminar caso"
- Confirma la eliminacion
- Esta accion no se puede deshacer

ETIQUETAS Y COMENTARIOS
- Las etiquetas ayudan a categorizar y filtrar casos
- Se agregan desde el editor del caso escribiendo el nombre y presionando Enter
- En la busqueda usa #etiqueta para filtrar por etiqueta y @texto para comentarios

HISTORIAL DE CAMBIOS
- Cada cambio de estado, reporte o edicion queda registrado
- Se exporta e importa en el CSV junto con los demas campos
- Visible en el detalle del caso`,
  },
  {
    id: "vistas",
    title: "4. Vistas y Navegacion",
    content: `La app tiene 5 vistas principales accesibles desde los tabs superiores o con Ctrl+1 a Ctrl+5:

DASHBOARD
Panel de control con 6 pestanas:
- Analitica: KPIs, insights, distribucion por estado/categoria, tendencia 30 dias, barras apiladas, tipos de ingreso y evolucion
- Resumen: KPIs con tendencia, insight vs 30 dias, funnel, actividad semanal, alertas, acciones rapidas, proximos eventos, notas y "Mi Dia"
- Rendimiento: conversion, tiempo en gestion, tasa de perdida y Logro de Objetivos
- Geografia: tabla por provincia/localidad y mapa interactivo
- Estudios: desempeno por estudio juridico
- Estados: distribucion por estado del pipeline

KANBAN (TABLERO)
- Columnas por estado del caso (11 estados)
- Arrastra tarjetas entre columnas para cambiar estado
- Pipeline Bar muestra la distribucion y filtra al hacer clic
- Respeta el filtro de mes y la busqueda

TABLA
- Grilla con todos los casos
- Ordena por cualquier columna
- Seleccion multiple con checkboxes y exportacion
- Columnas personalizables en Configuracion

REPORTES
- Lista de casos con historial de reportes
- Busqueda en vivo y filtro por mes

MI ESPACIO
- Centro personal del operador: perfil, jornada, disponibilidad, metas y accesos
- Resumen de la jornada con estados: En jornada, Meta cumplida, Jornada finalizada, No laborable
- Control de vacaciones, feriados e inasistencias
- Ritmo necesario por dia para alcanzar la meta mensual

UTILES
- Herramientas auxiliares (speechs, objeciones, aseguradoras, etc.)

Ademas, desde el header accedes al Calendario, Bloc de Notas, Busqueda Global (Ctrl+K), Notificaciones, Configuracion y Ayuda.`,
  },
  {
    id: "mi-jornada",
    title: "5. Mi Jornada y Productividad",
    content: `Mi Espacio es el centro personal del operador. Accede desde la pestana "Mi Espacio" en el menu principal.

PERFIL
Configura tu informacion personal:
- Nombre y rol
- Empresa y localidad
- Contacto (telefono, email)
- Jornada habitual: horario de inicio y fin (soporta jornadas que cruzan la medianoche, ej. 22:00 a 06:00)
- Dias laborables de la semana

RESUMEN DE LA JORNADA
Muestra el estado del dia:
- En jornada: estas dentro de tu horario habitual
- Meta cumplida: alcanzaste la meta diaria de casos/reportes
- Jornada finalizada: termino tu horario laboral
- No laborable: es dia no laborable, vacaciones, feriado o inasistencia
- Progreso de la meta diaria de casos y reportes
- Ritmo necesario por dia para alcanzar la meta mensual

METAS
Define tus objetivos de trabajo:
- Meta diaria de casos y de reportes
- Meta mensual de casos y de reportes
- El progreso se calcula sobre los dias efectivos (no sobre el total de dias del mes)

DISPONIBILIDAD
Administra tus ausencias y dias especiales:
- Vacaciones por rango de fechas
- Feriados
- Inasistencias (personales, enfermedad, otros)
- Dias no laborables personalizados

Los dias efectivos del mes se recalculan automaticamente descontando estas ausencias.

SUGERENCIAS INTELIGENTES
La app te avisa automaticamente:
- Cuando falta poco para completar tu meta diaria
- Cuando tu jornada habitual esta por terminar
- Cuando se aproximan tus vacaciones
- Que ritmo necesitas para alcanzar tu meta mensual`,
  },
  {
    id: "reportes-seguimiento",
    title: "6. Reportes y Seguimiento",
    content: `Los reportes son el corazon del seguimiento. Cada vez que te comunicas con un prospecto, debes registrar un reporte.

COMO REGISTRAR UN REPORTE?
1. Haz clic en "Reporte" en el header
2. Busca el caso
3. Selecciona el nuevo estado (si corresponde)
4. Escribe la novedad
5. Confirma

FORMATO RECOMENDADO
Usa: (DD/MM)Texto de la novedad
Ejemplo: (20/07)Se contacto al prospecto, agendo cita virtual para el 25/07

Si necesitas registrar varias novedades en una sola carga:
(20/07)Primer contacto // (21/07)Segundo intento

VISUALIZACION DE REPORTES
- En la vista Reportes: todos los casos con su historial
- Busqueda en vivo por nombre del caso, texto de la novedad o estado
- En el detalle del caso: historial completo de reportes

CAMBIOS DE ESTADO
Al cargar un reporte, puedes cambiar el estado del caso. Esto actualiza automaticamente la posicion de la tarjeta en el Kanban.`,
  },
  {
    id: "dashboard-estadisticas",
    title: "7. Dashboard y Estadisticas",
    content: `El Dashboard 2.0 integra todas las metricas en una sola pantalla con 6 pestanas configurables (Analitica, Resumen, Rendimiento, Geografia, Estudios y Estados).

PESTANA ANALITICA
- 8 tarjetas de KPIs: Total, Activos, Firmados, Sin reporte, No viables y mas
- Panel de insights automaticos con patrones y sugerencias
- Distribucion de casos por estado y por categoria (grafico de torta)
- Metricas de tiempo (promedio de gestion, dias por estado)
- Tendencia de los ultimos 30 dias y barras apiladas por estado
- Casos por tipo de ingreso y evolucion diaria

PESTANA RESUMEN
- Insight automatico que compara contra los ultimos 30 dias
- KPIs con tendencia: Total, Activos, Firmados, Sin reporte y No viables
- Funnel de conversion de 4 etapas
- Grafico de actividad de los ultimos 7 dias
- Alertas automaticas cuando algo anda mal
- Acciones rapidas para filtrar por estado
- Proximos eventos, notas recientes, ultimos casos y "Mi Dia"

PESTANA RENDIMIENTO
- Tasa de conversion, tiempo promedio en gestion y tasa de perdida
- Dias en gestion y dias totales del caso
- Funnel, actividad y Logro de Objetivos (14 firmas por mes)

PESTANA GEOGRAFIA
- Tabla de provincias y localidades con casos, firmas, conversion y perdida
- Mejores provincias destacadas
- Mapa interactivo con agrupacion por ubicacion

PESTANA ESTUDIOS
- Desempeno de cada estudio juridico: casos asignados, firmas, conversion y perdida

PESTANA ESTADOS
- Foto de todos los casos distribuidos por estado del pipeline

PERSONALIZACION
Configuracion → Apariencia → Dashboard: orden de pestanas y widgets, metricas, categorias de estado y reglas de alerta.`,
  },
  {
    id: "notificaciones",
    title: "8. Sistema de Notificaciones",
    content: `El sistema de notificaciones te mantiene informado sobre eventos importantes con control granular.

NIVELES DE PRIORIDAD
- Grave: recordatorios de meta, objeciones, casos urgentes
- Media: alertas generales, recordatorios suaves
- Baja: informacion de contexto, tips

CONFIGURACION
Configuracion → Notificaciones:
- Sonido: activa/desactiva el sonido general
- Toast In-App: muestra notificaciones en pantalla
- Minima prioridad para toast: define el nivel minimo que muestra toast
- Sonido por nivel: controla que niveles suenan (Grave, Media, Baja)
- Eventos: selecciona que eventos generan notificaciones
- Frecuencia: tiempo real o agrupada

MODOS
- Modo No Molestar: silencia todas las notificaciones
- Filtro por prioridad: solo muestra notificaciones de cierto nivel hacia arriba`,
  },
  {
    id: "utiles",
    title: "9. Utiles (Herramientas Auxiliares)",
    content: `La seccion Utiles agrupa herramientas de apoyo para el trabajo diario.

SPEECHS
Frases o guiones predefinidos para llamadas.
- Crea speechs con icono, titulo y texto
- Copia al portapapeles con un clic
- Organizados para acceso rapido durante llamadas

OBJECIONES
Registro de objeciones comunes y sus respuestas.
- Agrega objeciones que escuchas frecuentemente
- Prepara respuestas efectivas
- Categorizadas para facil consulta

CONVERSACIONES SUGERIDAS
Plantillas de mensajes con variable {OPERADOR}.
- Categorizadas por tipo de situacion
- Divididas en Apertura, Desarrollo y Cierre
- El operador se reemplaza automaticamente

ASEGURADORAS
Administracion de ART y aseguradoras de transito.
- Nombre, telefono y enlace de seguimiento
- Organizadas en dos categorias

LESIONES
Categorizacion de lesiones por tipo.
- Organiza lesiones en categorias
- Facilita la seleccion al crear casos

ESTUDIOS JURIDICOS
Mapeo de estudios juridicos por localidad.
- Asigna estudios a cada localidad
- Asignacion automatica al crear casos

PASOS A SEGUIR / TIPS / LINKS
- Pasos: protocolo de trabajo estandarizado
- Tips: consejos para llamados
- Links: recursos de referencia`,
  },
  {
    id: "bloc-calendario",
    title: "10. Bloc de Notas y Calendario",
    content: `BLOC DE NOTAS
Accesible desde el icono de documento en el header.

Funcionalidades:
- Crear notas con titulo y contenido (editor de texto)
- Agregar etiquetas a las notas
- Vincular notas a casos especificos
- Buscar por texto y filtrar por tags
- Auto-guardado mientras escribis
- Persistencia automatica en IndexedDB

Las notas vinculadas a un caso se muestran en el detalle del caso.

CALENDARIO
Accesible desde el icono de calendario en el header.

Funcionalidades:
- Vista mensual con eventos
- Crear eventos con titulo, fecha, hora, descripcion, prioridad y recordatorio
- Vincular eventos a casos
- Eventos proximos visibles en el Dashboard`,
  },
  {
    id: "configuracion",
    title: "11. Configuracion",
    content: `La configuracion se organiza en 6 grupos: General, Apariencia, Notificaciones, Busqueda, Sistema y Avanzado.

AJUSTES GENERALES
- Nombre del operador
- Formato de fecha y telefono
- Sonidos, idioma y zona horaria
- Modo No Molestar
- Columnas de la vista Tabla y Datos (backup, exportar/importar)

APARIENCIA → COLORES
- Tema: oscuro, claro o personalizado (3 colores base)
- Colores individuales por estado de caso (sincronizados con la lista configurada)
- Tamano de fuente

APARIENCIA → DASHBOARD (VISTAS)
- Orden de pestanas y widgets
- Metricas visibles
- Categorias de estado (Exito, Perdida, Contacto, Pendientes)
- Reglas y umbrales de alerta automatica

NOTIFICACIONES
- Canales: toasts in-app y sonido
- Niveles de prioridad: Grave, Media, Baja
- Filtro minimo para toast
- Control de sonido por nivel
- Tipos de eventos y frecuencia de agrupacion

BUSQUEDA
- Campos a indexar y historial de busquedas

SISTEMA
- Experiencia de usuario (animaciones, microinteracciones, modo bajo consumo, confirmaciones)
- Autodiagnostico y log de errores

PRODUCTIVIDAD
- Funciones de productividad personal: memoria operativa, objetivos, micro-analitica y microinteracciones
- Mi Espacio (personal): resumen de jornada, ritmo necesario, disponibilidad en calendario, recordatorios, microinteracciones de objetivos y sugerencias inteligentes

AVANZADO
- Dashboard (metricas, categorias y alertas)
- Estados de Caso, Tipos de Ingreso
- Importacion con mapeo automatico del CSV, validacion de duplicados y vista previa

DATOS
- Exportar/Importar configuracion (JSON)
- Exportar casos (CSV) con historial de cambios
- Notas y calendario
- Historial de backups y restauracion
- Eliminar casos por mes, notas, eventos o todos los datos (incluye historial)`,
  },
  {
    id: "personalizacion",
    title: "12. Temas y Personalizacion",
    content: `La aplicacion ofrece multiples opciones de personalizacion:

TEMAS PREDEFINIDOS
- Oscuro (predeterminado): fondo oscuro, texto claro
- Claro: fondo claro, texto oscuro
- Personalizado: defines tus propios colores

TEMA PERSONALIZADO
Selecciona 3 colores base:
1. Color primario: color principal de la interfaz
2. Color de acento: color de destacado (botones, enlaces)
3. Color de ring: color de bordes y focos

La app genera automaticamente una paleta completa a partir de estos 3 colores.

COLORES POR ESTADO
Cada estado de caso puede tener su propio color:
- Los colores se usan en etiquetas, tarjetas y filtros
- Los cambios se aplican en tiempo real
- Los colores se sincronizan con la lista de estados configurada

DASHBOARD
Configuracion → Apariencia → Dashboard:
- Reordena pestanas y widgets arrastrandolos
- Elige que metricas se muestran
- Define categorias de estado y reglas de alerta

TAMAÑO DE FUENTE
- Pequeno: ideal para pantallas con mucha densidad
- Mediano: tamaño predeterminado
- Grande: mejor legibilidad`,
  },
  {
    id: "atajos",
    title: "13. Atajos de Teclado",
    content: `Atajos disponibles en toda la aplicacion:

GENERAL
- Ctrl+K: Busqueda global (casos, notas, eventos)
- Ctrl+H: Abrir ayuda
- Escape: Cerrar modal/overlay

GESTION DE CASOS
- Ctrl+N: Nuevo caso
- Ctrl+R: Cargar reporte
- Ctrl+F: Buscar casos
- Ctrl+D: Duplicar caso
- Ctrl+E: Exportar seleccionados
- Ctrl+S: Guardar datos

VISTAS
- Ctrl+1: Dashboard
- Ctrl+2: Kanban
- Ctrl+3: Tabla
- Ctrl+4: Reportes
- Ctrl+5: Utiles`,
  },
  {
    id: "buenas-practicas",
    title: "14. Buenas Practicas",
    content: `Recomendaciones para un uso eficiente de la aplicacion:

1. REGISTRA SIEMPRE LOS REPORTES
Cada interaccion con un prospecto debe quedar registrada como reporte. Incluye fecha, resumen de la conversacion y nuevo estado si corresponde.

2. MANTENE LOS DATOS ACTUALIZADOS
Verifica que los telefonos, localidades y datos de contacto esten correctos. Un dato erroneo puede significar perder el caso.

3. USA LAS ETIQUETAS
Las etiquetas permiten filtrar y organizar casos. Crea un sistema de etiquetas consistente (ej: Urgente, Seguro, Pendiente, etc.) y usalo con #etiqueta en la busqueda.

4. HACE BACKUP REGULAR
Configura backups automaticos o exporta manualmente al menos una vez por semana. Los datos locales pueden perderse si se borra el cache del navegador.

5. USA LOS SPEECHS
Los speechs mejoran la consistencia de la comunicacion. Personalizalos con tu estilo pero manteniendo la informacion clave.

6. REVISA EL DASHBOARD DIARIAMENTE
El Dashboard muestra las tareas del dia: citas programadas, casos inactivos y casos sin reporte. Revisalo cada mañana para priorizar tu trabajo.

7. CONFIGURA EL MAPEO DE ESTUDIOS
Un mapeo completo de localidades a estudios juridicos ahorra tiempo al crear casos y evita errores de derivacion.

8. IMPORTA EN LOTE CUANDO TENGAS MUCHOS CASOS
Si recibes una planilla con muchos prospectos, usa el importador CSV con vista previa en lugar de cargarlos uno por uno.

9. USA EL MODO NO MOLESTAR
Durante llamadas importantes, activa el Modo No Molestar para evitar distracciones por notificaciones.

10. CONFIGURA TU JORNADA
Define tu horario de trabajo en Mi Espacio para obtener metricas precisas de productividad y sugerencias personalizadas.`,
  },
  {
    id: "solucion-problemas",
    title: "15. Solucion de Problemas",
    content: `Problemas comunes y sus soluciones:

LA APP NO CARGA
1. Recarga la pagina (F5)
2. Limpia el cache del navegador
3. Abre la consola (F12) para ver errores
4. Ejecuta Autodiagnostico en Configuracion → Sistema

NO ENCUENTRO UN CASO
1. Verifica el filtro de mes
2. Revisa el filtro de estado
3. Usa la busqueda por nombre, telefono o localidad
4. Prueba la busqueda global (Ctrl+K)
5. Busca con #etiqueta si usas etiquetas

SE PERDIERON LOS DATOS
1. Si tienes backup, importalo desde Configuracion → Datos
2. Si no, los datos no son recuperables
3. Configura backups automaticos para el futuro

EL TOUR NO ENCUENTRA ALGUNOS ELEMENTOS
1. Inicia el tour desde la vista principal (Dashboard)
2. No interactues con la app durante el recorrido
3. Recarga la pagina y vuelve a intentar
4. Cierra y reabre la app para reiniciar el Tour interactivo si se detuvo a mitad de camino

LA IMPRESION DE LA GUIA NO ABRE
1. Permite ventanas emergentes en el navegador
2. Usa "Descargar TXT" si no puedes imprimir
3. Desde el navegador, Ctrl+P sobre la guia tambien genera PDF

EL IMPORTADOR CSV RECHAZA MI ARCHIVO
1. Verifica que el archivo sea CSV (no XLSX)
2. Revisa la vista previa para ajustar el mapeo de columnas
3. Los duplicados por telefono se marcan; decide si saltarlos o importarlos
4. Las comas sueltas se reparan automaticamente agrupandolas en el ultimo campo

ERRORES EN CONSOLA
1. Captura el error y el contexto
2. Ve a Configuracion → Sistema para ver el log
3. Contacta al soporte con la informacion del error`,
  },
];

export function getGuideText() {
  return GUIDE_SECTIONS.map((s) => `${s.title}\n${"-".repeat(s.title.length)}\n\n${s.content}`).join("\n\n");
}

export function getGuideHTML() {
  return GUIDE_SECTIONS.map(
    (s) => `<h2>${s.title}</h2><p>${s.content.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>")}</p>`
  ).join("");
}
