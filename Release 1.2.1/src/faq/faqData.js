export const FAQ_CATEGORIES = [
  {
    id: "general",
    label: "General",
    items: [
      {
        question: "¿Que es AppSeguimiento?",
        answer: "Es una aplicacion web para gestionar el seguimiento de prospectos derivados a estudios juridicos. Permite crear casos, registrar reportes, organizar el trabajo en tablero Kanban, visualizar estadisticas y mantener toda la informacion sincronizada localmente en el navegador.",
        tags: ["general", "intro"],
      },
      {
        question: "¿Donde se guardan mis datos?",
        answer: "Todos los datos se almacenan localmente en tu navegador usando IndexedDB (via Dexie) para los casos, y LocalStorage para la configuracion. No se envian a ningun servidor ni se comparten con otros usuarios. Cada operador tiene su propia base de datos independiente.",
        tags: ["general", "datos", "privacidad"],
      },
      {
        question: "¿Puedo usar la app sin internet?",
        answer: "Si. Una vez que la aplicacion se cargo por primera vez, funciona completamente offline. Los datos se guardan localmente y persisten al cerrar el navegador. Solo necesitas internet para la carga inicial desde el servidor.",
        tags: ["general", "offline"],
      },
      {
        question: "¿Como hago un backup de mis datos?",
        answer: "Ve a Configuracion → Configuracion Compartida → Exportar. Puedes descargar toda tu configuracion como archivo JSON. Tambien puedes exportar casos desde la vista de Tabla seleccionandolos y usando el boton de exportacion. Para restaurar, usa el boton Importar en la misma seccion. Recomendamos hacer backup semanal.",
        tags: ["general", "backup", "exportar"],
      },
      {
        question: "¿La app tiene modo oscuro?",
        answer: "Si. Ve a Configuracion → Personalizacion de colores. Puedes elegir entre tema oscuro (predeterminado), claro, o personalizado donde defines tus propios colores base. Tambien puedes cambiar el color individual de cada estado de caso.",
        tags: ["general", "tema", "oscuro"],
      },
    ],
  },
  {
    id: "casos",
    label: "Gestion de Casos",
    items: [
      {
        question: "¿Como creo un nuevo caso?",
        answer: "Haz clic en el boton 'Nuevo caso' (amarillo) en la barra superior. Completa el formulario con los datos del prospecto: nombre, telefono, localidad, ART, profesion, tipo de ingreso, lesion y fecha de cita. Todos los campos se pueden completar manualmente o pegando una ficha estructurada.",
        tags: ["casos", "crear"],
      },
      {
        question: "¿Como pegar una ficha completa?",
        answer: "En el formulario de nuevo caso, haz clic en 'Pegar ficha completa'. Pega el texto con el formato: NOMBRE:, TELEFONO:, LOCALIDAD:, ART:, PROFESION:, INGRESO:, LESION:, CITA:, OBSERVACIONES:, TAGS:, COMENTARIOS:. La app procesara automaticamente los datos y completara los campos correspondientes. Ejemplo:\nNOMBRE: Juan Perez\nTELEFONO: 3814123456\nLOCALIDAD: San Miguel de Tucuman\nART: Sancor Salud\nINGRESO: 15/07/2026\nLESION: Fractura de miembro inferior\nCITA: 20/07 10:00\nPROFESION: Albañil\nTAGS: urgente\nCOMENTARIOS: Pendiente de respuesta",
        tags: ["casos", "crear", "ficha"],
      },
      {
        question: "¿Como cambio el estado de un caso?",
        answer: "Hay dos formas: 1) En el Tablero Kanban, arrastra la tarjeta del caso de una columna a otra. 2) Abre el caso haciendo clic en el, selecciona 'Editar' y cambia el estado en el selector. Los estados disponibles son: Cita virtual, Cita presencial, No responde, Lo piensa, Reprogramado, Tiene Abogado, No le interesa, No viable, Pendiente, Firmo, Sin reporte.",
        tags: ["casos", "estado"],
      },
      {
        question: "¿Como agrego un reporte a un caso?",
        answer: "Haz clic en 'Cargar reporte' en la barra superior. Busca el caso por nombre, telefono o localidad. Selecciona el nuevo estado (opcional), escribe la novedad y confirma. El reporte queda registrado con la fecha actual. Tambien puedes agregar reportes desde el detalle del caso.",
        tags: ["casos", "reporte"],
      },
      {
        question: "¿Como importo casos desde un CSV?",
        answer: "Usa la opcion de Importar (CSV). Subis tu archivo y el sistema analiza las columnas automaticamente, mapeando cada una al campo correspondiente (nombre, telefono, localidad, etc.). Antes de importar se muestra una vista previa paginada para que verifiques los datos; si el archivo tiene comas mal usadas o columnas desalineadas, la app repara las columnas y agrupa lo extra en el ultimo campo. Tambien valida duplicados por telefono y el formato de los numeros. Puedes configurar el comportamiento en Configuracion → Importacion.",
        tags: ["casos", "importar", "csv", "masivo"],
      },
      {
        question: "¿Como busco un caso?",
        answer: "Usa el campo de busqueda en la barra superior (Ctrl+F para enfocarlo). Escribe nombre, telefono o localidad. Los resultados se actualizan en tiempo real. Tambien puedes usar la busqueda global (Ctrl+K) que busca simultaneamente en casos, notas y eventos.",
        tags: ["casos", "buscar"],
      },
      {
        question: "¿Como elimino un caso?",
        answer: "Abre el caso haciendo clic en el, selecciona 'Editar' y luego haz clic en 'Eliminar caso' al final del formulario. Se te pedira confirmacion antes de eliminar. Esta accion no se puede deshacer.",
        tags: ["casos", "eliminar"],
      },
      {
        question: "¿Que son las etiquetas y como se usan?",
        answer: "Las etiquetas (tags) son palabras clave que asignas a un caso para categorizarlo. Puedes agregarlas al editar un caso en la seccion 'Etiquetas'. Escribe el nombre y presiona Enter. Luego puedes filtrar casos por etiqueta para organizar mejor tu trabajo.",
        tags: ["casos", "etiquetas", "tags"],
      },
      {
        question: "¿Como vinculo una nota a un caso?",
        answer: "Desde el Bloc de Notas, crea o selecciona una nota existente. En el editor de la nota, usa el 'CaseLinker' para buscar y vincular casos relacionados. Desde el detalle del caso, tambien puedes ver las notas vinculadas en la seccion 'Bloc de Notas'.",
        tags: ["casos", "notas", "vincular"],
      },
    ],
  },
  {
    id: "estados",
    label: "Estados y Derivaciones",
    items: [
      {
        question: "¿Que significa cada estado del caso?",
        answer: "Cita virtual: Se agendo una cita por telefono/videollamada. Cita presencial: Se agendo una reunion fisica. No responde: El prospecto no contesto los llamados. Lo piensa: Esta evaluando la propuesta. Reprogramado: La cita se cambio de fecha. Tiene Abogado: Ya cuenta con representacion legal. No le interesa: Rechazo el servicio. No viable: El caso no cumple requisitos. Pendiente: En espera de novedades. Firmo: Caso cerrado con exito. Sin reporte: No hay novedades registradas.",
        tags: ["estados", "significado"],
      },
      {
        question: "¿Como se maneja la derivacion a estudios juridicos?",
        answer: "La derivacion se configura en Utiles → Estudios Juridicos. Alli podes mapear localidades con estudios juridicos especificos. Al crear o editar un caso, la app asigna automaticamente el estudio juridico correspondiente segun la localidad del prospecto.",
        tags: ["estados", "derivacion", "estudio"],
      },
      {
        question: "¿Que pasa cuando un caso llega a 'Firmo'?",
        answer: "El estado 'Firmo' indica que el prospecto firmo el acuerdo con el estudio juridico. Es el estado final exitoso. La app puede configurarse para enviar una alerta de firma automaticamente al alcanzar este estado, en Configuracion → Automatizacion.",
        tags: ["estados", "firmo"],
      },
      {
        question: "¿Que diferencia hay entre 'No le interesa' y 'No viable'?",
        answer: "'No le interesa' significa que el prospecto rechazo voluntariamente el servicio. 'No viable' significa que el caso no cumple con los requisitos legales o procesales para ser derivado (ej: fuera de plazo, no corresponde a accidente laboral). Ambos son estados finales que descartan el caso.",
        tags: ["estados", "no viable", "no interesa"],
      },
    ],
  },
  {
    id: "uso",
    label: "Uso del Sistema",
    items: [
      {
        question: "¿Cuales son las vistas principales?",
        answer: "La app tiene 5 vistas principales: Dashboard (analitica completa con 6 pestanas: Analitica, Resumen, Rendimiento, Geografia, Estudios y Estados), Kanban (tablero de columnas por estado), Tabla (grilla con todos los casos), Reportes (lista con historial), y Utiles (Speechs, Objeciones, Aseguradoras, Lesiones, etc.). Puedes cambiar entre vistas usando los tabs en la parte superior o con Ctrl+1 a Ctrl+5.",
        tags: ["uso", "vistas"],
      },
      {
        question: "¿Como uso el Tablero Kanban?",
        answer: "El Kanban organiza los casos en columnas por estado. Para mover un caso, simplemente arrastra la tarjeta a la columna deseada. Cada columna muestra la cantidad de casos. Puedes hacer clic en cualquier tarjeta para ver o editar sus detalles. El Pipeline Bar en la parte superior muestra la distribucion general.",
        tags: ["uso", "kanban"],
      },
      {
        question: "¿Como uso la vista de Tabla?",
        answer: "La Tabla muestra todos los casos en formato de grilla con columnas personalizables. Haz clic en cualquier encabezado para ordenar. Usa los checkboxes para seleccionar multiples casos y exportarlos. Filtra por mes con el selector superior. Puedes configurar que columnas se muestran en Configuracion → Columnas.",
        tags: ["uso", "tabla"],
      },
      {
        question: "¿Que informacion muestra el Dashboard?",
        answer: "El Dashboard 2.0 tiene 6 pestanas: 1) Analitica — la vista por defecto: KPIs, insights automaticos, distribucion por estado/categoria, tendencia de 30 dias, barras apiladas, tipos de ingreso y evolucion. 2) Resumen — KPIs generales, funnel de conversion, grafico de actividad semanal, alertas automaticas, acciones rapidas, proximos eventos, notas recientes, ultimos casos, tareas del dia. 3) Rendimiento — metricas de performance y tiempo, funnel, grafico de actividad y Logro de Objetivos. 4) Geografia — tabla de provincias/localidades con conversion y mapa de casos. 5) Estudios — desempeno de estudios juridicos. 6) Estados — distribucion por estado del pipeline. Incluye Metricas configurables, alertas automaticas y filtros por mes/dia.",
        tags: ["uso", "dashboard"],
      },
      {
        question: "¿Donde encuentro los Utiles?",
        answer: "La vista Utiles agrupa herramientas auxiliares: Speechs (frases para llamados), Objeciones (respuestas a objeciones comunes), Conversaciones Sugeridas (plantillas con {OPERADOR}), Aseguradoras (administracion de ART y Transito), Lesiones (categorizacion por tipo), Estudios Juridicos (mapeo por localidad), Pasos a Seguir (protocolo), Tips y Links utiles. Tambien incluye vista de Resumen con contadores.",
        tags: ["uso", "utiles"],
      },
      {
        question: "¿Que son los Speechs?",
        answer: "Los Speechs son frases o guiones predefinidos que usas durante las llamadas telefonicas. Ayudan a mantener consistencia en la comunicacion. Puedes crear, editar y organizar speechs en Utiles → Speechs. Cada speech tiene icono, titulo, texto y se puede copiar al portapapeles con un clic.",
        tags: ["uso", "speechs"],
      },
      {
        question: "¿Como uso el Bloc de Notas?",
        answer: "El Bloc de Notas esta disponible como icono de documento en el header (junto al calendario). Contiene un editor de texto completo con titulo, contenido, tags y vinculacion de casos. Las notas se guardan automaticamente. Puedes buscar, ordenar y eliminar notas desde la barra lateral.",
        tags: ["uso", "notas", "bloc"],
      },
      {
        question: "¿Como funciona el Calendario?",
        answer: "El calendario (icono en el header) muestra una vista mensual de eventos. Puedes crear eventos vinculados a casos, con titulo, fecha, hora, descripcion y recordatorio. Los eventos proximos tambien se muestran en el Dashboard.",
        tags: ["uso", "calendario", "eventos"],
      },
      {
        question: "¿Como busco con etiquetas y comentarios?",
        answer: "En el campo de busqueda puedes usar operadores: escribe #etiqueta (ej: #urgente) para ver solo los casos, notas y eventos que tienen esa etiqueta; y @texto (ej: @Pendiente) para ver los casos cuyo comentario empieza con ese texto. Se combinan con la busqueda normal por nombre, telefono o localidad.",
        tags: ["uso", "buscar", "etiquetas", "tags", "comentarios"],
      },
      {
        question: "¿Para que sirve el Tour interactivo?",
        answer: "El Tour interactivo es un recorrido guiado paso a paso por TODAS las funcionalidades de la aplicacion (13 pasos): el Dashboard con sus 6 pestanas (Analitica, Resumen, Rendimiento, Geografia, Estudios y Estados), el Tablero Kanban, la Tabla, los Reportes, los Utiles, la Busqueda, Nuevo Caso, la Carga de reporte, el Calendario, el Bloc de Notas, la Configuracion, las Notificaciones y la Ayuda. Se inicia desde Ayuda → Tour interactivo o desde Cómo usar, y tambien se muestra automaticamente la primera vez que abres la app.",
        tags: ["uso", "tour", "ayuda"],
      },
      {
        question: "¿Como imprimo o descargo la Guia de Usuario?",
        answer: "Ve a Ayuda → Guia PDF. El boton 'Imprimir / PDF' abre una ventana con la guia formateada donde haces clic en 'Imprimir / Guardar como PDF' para generar el archivo (permite ventanas emergentes). El boton 'Descargar TXT' guarda la guia como archivo de texto plano.",
        tags: ["uso", "guia", "pdf", "descargar"],
      },
      {
        question: "¿Que atajos de teclado existen?",
        answer: "Ctrl+N: Nuevo caso, Ctrl+R: Cargar reporte, Ctrl+F: Buscar, Ctrl+K: Busqueda global, Ctrl+E: Exportar seleccion, Ctrl+S: Guardar datos, Ctrl+H: Abrir ayuda, Ctrl+D: Duplicar caso, Escape: Cerrar modal/overlay, Ctrl+1-5: Cambiar de vista (Dashboard, Tablero, Tabla, Reportes, Utiles).",
        tags: ["uso", "atajos"],
      },
    ],
  },
  {
    id: "personalizacion",
    label: "Personalizacion",
    items: [
      {
        question: "¿Como cambio el tema de la app?",
        answer: "Ve a Configuracion → Personalizacion de colores → Modo de Tema. Puedes seleccionar Oscuro (default), Claro, o Personalizado. En modo Personalizado puedes definir 3 colores base y la app genera automaticamente la paleta completa.",
        tags: ["personalizar", "tema"],
      },
      {
        question: "¿Puedo cambiar el color de cada estado?",
        answer: "Si. En Configuracion → Personalizacion de colores → Colores por Estado de Caso, cada estado tiene un circulo de color. Haz clic en el para abrir el selector y elegir entre los colores disponibles. Los cambios se aplican en tiempo real en toda la interfaz.",
        tags: ["personalizar", "estados", "colores"],
      },
      {
        question: "¿Como cambio el tamano de la fuente?",
        answer: "En Configuracion → Personalizacion de colores → Tamano de Fuente, puedes elegir entre Pequeno, Mediano (default) y Grande. El cambio afecta a toda la interfaz.",
        tags: ["personalizar", "fuente"],
      },
      {
        question: "¿Puedo personalizar las columnas de la tabla?",
        answer: "Si. Ve a Configuracion → Columnas. Activa o desactiva las columnas que quieras ver en la vista de Tabla. Los cambios se guardan automaticamente.",
        tags: ["personalizar", "tabla", "columnas"],
      },
      {
        question: "¿Como personalizo el Dashboard?",
        answer: "Ve a Configuracion → Apariencia → Dashboard. Desde ahi podes: reordenar las pestanas arrastrandolas, cambiar el orden de los widgets dentro de cada pestana, elegir que metricas se muestran, definir las categorias de estado (Exito, Perdida, Contacto, Pendientes) y configurar las reglas de alerta automatica con sus umbrales.",
        tags: ["personalizar", "dashboard", "widgets", "metricas"],
      },
      {
        question: "¿Que son las alertas automaticas del Dashboard?",
        answer: "Son avisos que el Dashboard genera solo cuando detecta algo que necesita atencion: tasa de conversion baja, demasiados casos pendientes, casos sin reporte, entre otros. Se configuran en Configuracion → Apariencia → Dashboard, donde definis las reglas y los umbrales que activan cada alerta.",
        tags: ["personalizar", "dashboard", "alertas"],
      },
    ],
  },
  {
    id: "mi-espacio",
    label: "Mi Espacio",
    items: [
      {
        question: "¿Que es Mi Espacio?",
        answer: "Es el centro personal del operador. Reune tu perfil, tu jornada habitual, tu disponibilidad (vacaciones, feriados, inasistencias y dias no laborables), tus metas de trabajo, tus accesos personales a sistemas y sugerencias inteligentes. Todo se guarda localmente en este dispositivo.",
        tags: ["mi-espacio", "personal", "intro"],
      },
      {
        question: "¿Como configuro mi jornada habitual?",
        answer: "Ve a Mi Espacio → Perfil. Configura el horario de inicio y fin de tu jornada y los dias laborables. Si tu jornada cruza la medianoche (por ejemplo 22:00 a 06:00), la app lo detecta y lo calcula correctamente.",
        tags: ["mi-espacio", "jornada", "horario"],
      },
      {
        question: "¿Como cargo vacaciones o inasistencias?",
        answer: "Ve a Mi Espacio → Disponibilidad. Puedes agregar vacaciones por rango de fechas, feriados, inasistencias y dias no laborables. Los dias efectivos del mes se recalcular automaticamente y los calculos de productividad (metas, ritmo, resumen de jornada) los descuentan.",
        tags: ["mi-espacio", "disponibilidad", "vacaciones", "inasistencias"],
      },
      {
        question: "¿Como funcionan las metas personales?",
        answer: "En Mi Espacio → Metas puedes definir tu objetivo diario y mensual de casos y reportes. El progreso se calcula sobre los dias efectivos (descontando vacaciones, feriados, inasistencias y dias no laborables). El resumen de la jornada y las sugerencias te avisan cuanto falta y que ritmo necesitas.",
        tags: ["mi-espacio", "metas", "objetivos"],
      },
      {
        question: "¿Mis credenciales y accesos estan seguros?",
        answer: "Si. Las credenciales y accesos que guardes en Mi Espacio → Accesos se almacenan solo localmente en tu dispositivo. No se exportan en los respaldos ni se incluyen en ningun archivo de exportacion. Son solo para tu uso.",
        tags: ["mi-espacio", "accesos", "credenciales", "seguridad"],
      },
      {
        question: "¿Como veo mi disponibilidad en el calendario?",
        answer: "Abre el Calendario y presiona el boton 'Disponibilidad' en la barra de herramientas. Las vacaciones, feriados, inasistencias y dias no laborables se marcan con su color en la vista de mes. Puedes ocultarlos presionando el boton nuevamente.",
        tags: ["mi-espacio", "calendario", "disponibilidad"],
      },
      {
        question: "¿Donde configuro las preferencias de Mi Espacio?",
        answer: "Ve a Configuracion → Productividad → seccion 'Mi Espacio (personal)'. Desde ahi podes activar o desactivar el resumen de jornada, el ritmo necesario, la disponibilidad en calendario, los recordatorios de jornada y metas, las microinteracciones y las sugerencias inteligentes.",
        tags: ["mi-espacio", "configuracion", "preferencias"],
      },
    ],
  },
  {
    id: "solucion",
    label: "Solucion de Problemas",
    items: [
      {
        question: "¿Que hago si la app no carga correctamente?",
        answer: "Primero, intenta recargar la pagina (F5). Si el problema persiste, abre la consola del navegador (F12 → Console) y revisa si hay errores. Puedes ejecutar el Autodiagnostico en Configuracion → Diagnostico. Si todo falla, limpia el cache del navegador y recarga.",
        tags: ["problemas", "error", "carga"],
      },
      {
        question: "¿Como recupero datos perdidos?",
        answer: "Si realizaste backup previamente, ve a Configuracion → Configuracion Compartida → Importar y selecciona tu archivo JSON. Si no tienes backup, lamentablemente los datos no son recuperables. Recomendamos configurar backups automaticos en Configuracion → Automatizacion.",
        tags: ["problemas", "perdida", "recuperar"],
      },
      {
        question: "¿Por que no veo algunos casos en el Dashboard?",
        answer: "El Dashboard usa los casos del mes seleccionado en los filtros. Verifica el filtro de mes en la parte superior. Si el mes es correcto, revisa los filtros de estado en la barra de filtros. Los casos archivados o en estados finales (Firmo, No viable) pueden estar ocultos segun la configuracion.",
        tags: ["problemas", "dashboard", "filtros"],
      },
      {
        question: "¿El tour interactivo no encuentra algunos elementos?",
        answer: "El tour busca elementos por atributos data-tour. Si cambiaste de vista manualmente durante el tour, algunos elementos pueden no estar disponibles. Recomendamos iniciar el tour desde la vista principal (Dashboard) y no interactuar con la app durante el recorrido. Si el problema persiste, recarga la pagina y vuelve a intentar.",
        tags: ["problemas", "tour"],
      },
    ],
  },
];
