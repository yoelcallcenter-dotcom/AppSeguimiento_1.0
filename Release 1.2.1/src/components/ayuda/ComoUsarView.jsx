import React, { useState, useRef, useEffect } from "react";
import {
  BookOpen,
  Play,
  MessageSquare,
  Keyboard,
  FileText,
  Mail,
  Printer,
  Zap,
} from "lucide-react";
import { TOURS, useTour } from "../../tour";
import { FAQView } from "../../faq";
import { GlossaryView } from "../../glossary";
import { GuideView } from "../../guide";
import { AtajosTeclado } from "./AtajosTeclado";
import { EjemplosCasos } from "./EjemplosCasos";
import { FeedbackForm } from "./FeedbackForm";
import { Btn } from "../common/Btn";
import { BtnOutline } from "../common/BtnOutline";
import { openPrintWindow } from "../../utils/printWindow";
import { APP_VERSION } from "../../core/version";

const SECCIONES_GUIA = {
  tour: {
    titulo: "Tour Interactivo - Guia Completa",
    contenido: `
      El tour interactivo te guia paso a paso por TODAS las funcionalidades de
      la aplicacion (13 pasos), desde crear casos hasta configurar cada vista.

      1. DASHBOARD (panel de control)
      - 6 pestanas: Analitica, Resumen, Rendimiento, Geografia, Estudios y Estados
      - Analitica: KPIs, insights, distribuciones, evolucion, conversion por estudio y funnel
      - Resumen: insight vs 30 dias, KPIs con tendencia, funnel, alertas, proximos eventos y Mi Dia
      - Pestanas, widgets y metricas configurables en Configuracion → Apariencia → Vistas

      2. TABLERO KANBAN
      - Casos organizados por estado (11 estados) en columnas
      - Arrastra tarjetas entre columnas para cambiar el estado
      - Pipeline Bar que filtra al hacer clic

      3. VISTA DE TABLA
      - Grilla con todos los casos y columnas personalizables
      - Ordenamiento por columna, seleccion multiple y exportacion
      - Filtros por mes, dia y texto

      4. REPORTES
      - Historial completo de novedades con busqueda en vivo
      - Filtro por mes y edicion de reportes

      5. UTILES
      - Speechs, Objeciones, Conversaciones Sugeridas, Aseguradoras,
        Lesiones, Estudios Juridicos, Pasos a Seguir, Tips y Links

      6. BUSCAR CASOS
      - Busqueda por nombre, telefono o localidad en tiempo real
      - Operadores #etiqueta y @comentario
      - Ctrl+K abre la Busqueda Global (casos, notas y eventos)

      7. NUEVO CASO Y FICHA COMPLETA
      - Carga manual o pegando una ficha con formato NOMBRE:, TELEFONO:, etc.
      - Etiquetas y comentarios para organizar

      8. CARGAR REPORTE
      - Registra novedades rapidas con formato (DD/MM)Texto
      - Cambia el estado del caso al cargar el reporte

      9. CALENDARIO
      - Eventos, citas y recordatorios en vista mensual
      - Eventos vinculados a casos y visibles en el Dashboard

      10. BLOC DE NOTAS
      - Notas con auto-guardado, etiquetas y vinculacion a casos
      - Busqueda por texto y filtro por tags

      11. CONFIGURACION
      - General, Apariencia, Notificaciones, Busqueda, Sistema y Avanzado
      - Temas, colores por estado, vistas del Dashboard y datos

      12. NOTIFICACIONES Y NO MOLESTAR
      - Todas las notificaciones llegan como toasts dentro de la app
      - Sonido, volumen y frecuencia configurables
      - Modo No Molestar silencia todo

      13. AYUDA Y DOCUMENTACION
      - Acerca de Vistas, FAQ, Glosario y Guia de Usuario
      - Guia PDF para imprimir o descargar en TXT
    `,
  },
  faq: {
    titulo: "Preguntas Frecuentes (FAQ)",
    contenido: `
      ¿COMO AGREGO UN NUEVO CASO?
      Haz clic en el boton "Nuevo caso" en la barra superior. Completa los datos del prospecto (nombre, telefono, localidad, ART, etc.) y haz clic en "Guardar". Tambien puedes pegar una ficha completa con el formato: NOMBRE:, TELEFONO:, LOCALIDAD:, ART:, PROFESION:, INGRESO:, LESION:, CITA:, OBSERVACIONES:, TAGS:, COMENTARIOS:.
      
      ¿COMO CAMBIO EL ESTADO DE UN CASO?
      Hay dos formas: 1) Arrastra la tarjeta del caso en el Tablero Kanban hasta la columna del estado deseado. 2) Abre el caso, haz clic en "Editar" y cambia el estado en el selector.
      
      ¿DONDE SE GUARDAN MIS DATOS?
      Todos los datos se guardan localmente en el almacenamiento de tu navegador (LocalStorage). No se comparten con otros usuarios y no se envian a ningun servidor. Cada usuario tiene su propia base de datos.
      
      ¿COMO EXPORTO MIS DATOS?
      Puedes exportar tus datos de varias formas: 1) Usa el boton "Exportar" en la barra superior para generar un archivo CSV. 2) Ve a Configuracion -> Configuracion Compartida -> Exportar para guardar toda la configuracion. 3) En Utiles -> Speechs puedes exportar speechs individuales.
      
      ¿QUE SIGNIFICA CADA ESTADO DE UN CASO?
      Los estados representan la etapa del proceso: Cita virtual/presencial (cita agendada), No responde (no contesto), Lo piensa (evaluando), Reprogramado (cita cambiada), Tiene Abogado (ya tiene representacion), No le interesa/No viable (caso descartado), Pendiente (en espera), Firmo (caso cerrado con exito), Sin reporte (sin novedades).
      
      ¿PUEDO PERSONALIZAR LA APARIENCIA DE LA APLICACION?
      Si. Ve a Configuracion -> Personalizacion de colores. Puedes elegir entre temas predefinidos (oscuro, claro) o crear tu propia combinacion de colores para el fondo, fuente, acento y cada estado de caso.
      
      ¿COMO HAGO UN BACKUP DE MIS DATOS?
      Ve a Configuracion -> Configuracion Compartida -> Exportar para guardar toda tu configuracion en un archivo JSON. Tambien puedes configurar backups automaticos en Configuracion -> Backup automatico.
      
      ¿QUE SON LOS SPEECHS Y PARA QUE SIRVEN?
      Los speechs son frases o guiones predefinidos que puedes usar durante las llamadas. Ayudan a mantener consistencia en la comunicacion y ahorrar tiempo. Puedes crear, editar y organizar tus speechs en Utiles -> Speechs.
      
      ¿COMO USO EL CALENDARIO DE GOOGLE?
      Cuando un caso tiene una cita programada, abre el caso y haz clic en el boton "Calendario". Esto te permitira agregar el evento a tu Google Calendar automaticamente.
      
      ¿PUEDO USAR LA APLICACION SIN CONEXION A INTERNET?
      Si. Una vez que la aplicacion esta cargada, funciona completamente offline. Todos los datos se guardan localmente en tu navegador.
      
      ¿QUE HAGO SI PIERDO MIS DATOS?
      Si hiciste backup regularmente, puedes restaurar desde el archivo JSON guardado. Si no, lamentablemente los datos no son recuperables. Recomendamos hacer backup semanal.
      
      ¿COMO AGREGO ETIQUETAS A UN CASO?
      Al editar un caso, busca la seccion "Etiquetas". Escribe el nombre de la etiqueta y presiona Enter o haz clic en "+". Las etiquetas te ayudan a organizar y filtrar casos similares.
    `,
  },
  atajos: {
    titulo: "Atajos de Teclado",
    contenido: `
      Ctrl + N : Nuevo caso - Abre el formulario para crear un nuevo caso
      Ctrl + R : Cargar reporte - Abre el modal para cargar un reporte rapido
      Ctrl + F : Buscar casos - Enfoca el campo de busqueda de casos
      Escape : Cerrar modal - Cierra cualquier modal o ventana emergente
      
      CONSEJO: Usa estos atajos para trabajar mas rapido y ser mas productivo.
    `,
  },
  ejemplos: {
    titulo: "Ejemplos de Casos",
    contenido: `
      EJEMPLO 1: Juan Perez
      Telefono: 3814123456 | Localidad: San Miguel de Tucuman
      ART: Sancor Salud | Profesion: Albañil
      Ingreso: 15/07/2026 | Lesion: Fractura de miembro inferior derecho
      Tipo Ingreso: Accidente + Cirugia | Cita: 20/07 10:00
      Estado: Cita virtual
      Tags: Urgente, Seguro
      
      EJEMPLO 2: Maria Gomez
      Telefono: 3815987654 | Localidad: Yerba Buena
      ART: Galeno ART | Profesion: Docente
      Ingreso: 10/07/2026 | Lesion: Lesion de columna vertebral
      Tipo Ingreso: Enfermedad Profesional | Cita: 18/07 15:30
      Estado: Cita presencial
      Tags: Prioridad Alta, Revisar
      
      EJEMPLO 3: Carlos Rodriguez
      Telefono: 3814567890 | Localidad: Concepcion
      ART: OMINT ART | Profesion: Operario
      Ingreso: 05/07/2026 | Lesion: Traumatismo craneal leve
      Tipo Ingreso: Accidente sin tratamiento | Cita: 21/07 09:00
      Estado: Pendiente
      Tags: Seguimiento
    `,
  },
  glosario: {
    titulo: "Glosario de Terminos",
    contenido: `
      ART: Aseguradora de Riesgos del Trabajo. Empresa que cubre accidentes y enfermedades laborales de los trabajadores en relacion de dependencia.
      
      Derivacion: Proceso de derivar un caso al estudio juridico correspondiente segun la localidad del accidente o enfermedad laboral.
      
      Kanban: Metodo de organizacion visual que usa tarjetas y columnas para representar el flujo de trabajo de los casos en tiempo real.
      
      Prospecto: Persona que ha sufrido un accidente o enfermedad laboral y esta siendo evaluada para una derivacion.
      
      Speech: Guion o frase predefinida utilizada durante las llamadas para mantener consistencia en la comunicacion con los prospectos.
      
      Backup: Copia de seguridad de los datos que permite restaurar la informacion en caso de perdida o error.
      
      LocalStorage: Almacenamiento local del navegador donde se guardan todos los datos de la aplicacion de forma persistente.
      
      Pipeline: Representacion visual del flujo de trabajo de los casos, mostrando la cantidad en cada estado del proceso.
      
      Firmo: Estado final exitoso de un caso, cuando el prospecto ha firmado el acuerdo con el estudio juridico.
      
      Cita virtual: Cita agendada por telefono o videollamada con el prospecto para evaluar su caso.
      
      Cita presencial: Cita agendada para una reunion fisica con el prospecto.
      
      No viable: Estado que indica que el caso no puede ser procesado porque no cumple con los requisitos necesarios.
      
      Incontactable: Estado que indica que no se ha podido establecer contacto con el prospecto despues de multiples intentos.
      
      Objecion: Respuesta o argumento que un prospecto puede dar para rechazar o dudar del servicio.
      
      Lesion: Daño fisico o enfermedad sufrida por el trabajador a causa de su actividad laboral.
      
      Aseguradora: Entidad que brinda cobertura ante riesgos laborales.
      
      Estudio Juridico: Bufete de abogados que se encarga de la representacion legal del trabajador.
      
      Reporte: Registro de una novedad o seguimiento de un caso. Cada reporte se guarda con fecha y texto.
      
      Etiqueta: Palabra clave que se asigna a un caso para categorizarlo y facilitar su busqueda.
      
      Modo No Molestar: Funcion que silencia las notificaciones de la aplicacion para permitir concentracion.
    `,
  },
  feedback: {
    titulo: "Envio de Feedback",
    contenido: `
      ¿COMO ENVIAR FEEDBACK?
      1. Completa el formulario con tu nombre (opcional) y email (opcional)
      2. Selecciona la categoria: Sugerencia, Reportar error, Solicitar mejora, Consulta u Otro
      3. Puntua la aplicacion del 1 al 5 estrellas
      4. Escribe tu mensaje con el feedback
      5. Haz clic en "Enviar feedback"
      
      El feedback se envia por correo a: yoelcallcenter@gmail.com
      Tu opinion nos ayuda a mejorar la aplicacion continuamente.
    `,
  },
};

export function ComoUsarView({ showToast }) {
  const [seccion, setSeccion] = useState("tour");
  const { startTour } = useTour();
  const contenidoRef = useRef(null);

  // Escuchar evento de navegación desde HelpPanel
  useEffect(() => {
    const handleNavigate = (event) => {
      if (event.detail?.view === "como-usar") {
        // El cambio de vista lo maneja App.jsx
      }
    };
    window.addEventListener("navigate-to", handleNavigate);
    return () => window.removeEventListener("navigate-to", handleNavigate);
  }, []);

  const secciones = [
    { id: "tour", label: "Tour interactivo", icon: Play },
    { id: "faq", label: "Preguntas Frecuentes", icon: MessageSquare },
    { id: "atajos", label: "Atajos de teclado", icon: Keyboard },
    { id: "ejemplos", label: "Ejemplos de casos", icon: FileText },
    { id: "glosario", label: "Glosario", icon: BookOpen },
    { id: "feedback", label: "Feedback", icon: Mail },
  ];

  const imprimirGuiaPDF = () => {
    const contenidoHTML = Object.entries(SECCIONES_GUIA)
      .map(
        ([key, data]) => `
      <div class="seccion-pdf">
        <h2>${data.titulo}</h2>
        <div class="contenido-pdf">${data.contenido.replace(
          /\n/g,
          "<br>"
        )}</div>
      </div>
    `
      )
      .join("");

    const estilos = `
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif; 
          padding: 40px; 
          color: #1A1A2E; 
          max-width: 1000px; 
          margin: 0 auto;
          background: #fff;
          line-height: 1.6;
        }
        .header {
          text-align: center;
          padding-bottom: 30px;
          border-bottom: 3px solid #D4AF37;
          margin-bottom: 30px;
        }
        .header h1 {
          font-size: 28px;
          color: #D4AF37;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .header .subtitle {
          color: #666;
          font-size: 14px;
          margin-top: 8px;
        }
        .fecha {
          text-align: right;
          color: #888;
          font-size: 12px;
          margin-bottom: 20px;
        }
        .seccion-pdf {
          margin-bottom: 30px;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #D4AF37;
          page-break-inside: avoid;
        }
        .seccion-pdf h2 {
          font-size: 20px;
          color: #D4AF37;
          margin-bottom: 12px;
          font-weight: 700;
        }
        .contenido-pdf {
          color: #333;
          font-size: 13px;
          white-space: pre-wrap;
          line-height: 1.8;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #eee;
          text-align: center;
          font-size: 12px;
          color: #888;
        }
        .badge {
          display: inline-block;
          background: #D4AF37;
          color: #fff;
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .indice {
          margin-bottom: 30px;
          padding: 15px;
          background: #f0f0f0;
          border-radius: 8px;
        }
        .indice h3 {
          margin-bottom: 10px;
          color: #333;
        }
        .indice-item {
          font-size: 13px;
          padding: 3px 0;
          color: #555;
        }
        @media print {
          body { padding: 20px; }
          .no-print { display: none; }
          .seccion-pdf { break-inside: avoid; }
        }
      </style>
    `;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Guía de Usuario - AppSeguimiento</title>
        ${estilos}
      </head>
      <body>
        <div class="header">
          <h1>Guía de Usuario</h1>
          <div class="subtitle">AppSeguimiento - Sistema de gestión de casos ART</div>
          <div style="margin-top: 10px;">
            <span class="badge">Versión ${APP_VERSION}</span>
          </div>
        </div>
        
        <div class="fecha">Generado el ${new Date().toLocaleDateString(
          "es-AR",
          { day: "2-digit", month: "2-digit", year: "numeric" }
        )} - ${new Date().toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    })}</div>
        
        <div class="indice">
          <h3>Índice</h3>
          ${Object.entries(SECCIONES_GUIA)
            .map(
              ([key, data], index) => `
            <div class="indice-item">
              ${index + 1}. ${data.titulo}
            </div>
          `
            )
            .join("")}
        </div>
        
        ${contenidoHTML}
        
        <div class="footer">
          AppSeguimiento - Sistema de gestión de casos ART
          <br>
          ${new Date().toLocaleDateString("es-AR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
          <br><br>
          <span style="font-size: 11px; color: #aaa;">
            Esta guía contiene toda la información necesaria para utilizar la aplicación.
            Para más ayuda, consulta el Tour Interactivo dentro de la aplicación.
          </span>
        </div>
        
        <div class="no-print" style="text-align:center; margin-top:30px;">
          <button type="button" class="btn-print" style="padding:12px 30px; background:#D4AF37; border:none; border-radius:8px; cursor:pointer; font-weight:700; font-size:14px; color:#14181F;">
            Imprimir / Guardar como PDF
          </button>
        </div>
      </body>
      </html>
    `;

    const ventana = openPrintWindow(html);
    if (!ventana) {
      alert("Por favor, permite ventanas emergentes para generar el PDF");
    }
  };

  const renderSeccion = () => {
    switch (seccion) {
      case "tour":
        return (
          <div className="space-y-4">
            <div
              className="rounded-lg p-4 text-center"
              style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              <Play
                size={32}
                color="var(--color-accent)"
                className="mx-auto mb-2"
              />
              <div
                className="text-sm font-semibold"
                style={{ color: "var(--color-text)" }}
              >
                Tour interactivo
              </div>
              <div
                className="text-xs"
                style={{ color: "var(--color-text-muted)" }}
              >
                Un recorrido guiado completo por todas las funcionalidades de
                la aplicacion.
                <br />
                <span
                  className="text-[10px]"
                  style={{ color: "var(--color-accent)" }}
                >
                  {TOURS.onboarding.steps.length} pasos para dominar la aplicacion
                </span>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-3">
                <Btn onClick={() => startTour("onboarding")} icon={Play} size="sm">
                  Comenzar tour
                </Btn>
                <BtnOutline
                  onClick={imprimirGuiaPDF}
                  icon={Printer}
                  size="sm"
                  color="var(--color-accent)"
                >
                  Imprimir guia PDF
                </BtnOutline>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div
                className="rounded-lg p-3"
                style={{
                  backgroundColor: "var(--color-surface2)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div
                  className="text-xs font-semibold"
                  style={{ color: "var(--color-accent)" }}
                >
                  Paso 1: Crear un caso
                </div>
                <div className="text-xs" style={{ color: "var(--color-text)" }}>
                  Haz clic en "Nuevo caso" y completa los datos del prospecto.
                </div>
              </div>
              <div
                className="rounded-lg p-3"
                style={{
                  backgroundColor: "var(--color-surface2)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div
                  className="text-xs font-semibold"
                  style={{ color: "var(--color-accent)" }}
                >
                  Paso 2: Gestionar casos
                </div>
                <div className="text-xs" style={{ color: "var(--color-text)" }}>
                  Arrastra casos en el tablero o editalos desde la tabla.
                </div>
              </div>
              <div
                className="rounded-lg p-3"
                style={{
                  backgroundColor: "var(--color-surface2)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div
                  className="text-xs font-semibold"
                  style={{ color: "var(--color-accent)" }}
                >
                  Paso 3: Personalizar
                </div>
                <div className="text-xs" style={{ color: "var(--color-text)" }}>
                  Ajusta colores, temas y configuraciones a tu gusto.
                </div>
              </div>
            </div>

            <div
              className="rounded-lg p-3"
              style={{
                backgroundColor: "var(--color-accent)11",
                border: "1px solid var(--color-accent)33",
              }}
            >
              <div className="flex items-center gap-2">
                <Zap size={14} color="var(--color-accent)" />
                <span
                  className="text-xs font-medium"
                  style={{ color: "var(--color-accent)" }}
                >
                  Consejo:
                </span>
                <span
                  className="text-xs"
                  style={{ color: "var(--color-text)" }}
                >
                  El tour te guiara por todas las funciones. Presta atencion a
                  los consejos que aparecen en cada paso.
                </span>
              </div>
            </div>
          </div>
        );
      case "faq":
        return <FAQView showToast={showToast} />;
      case "atajos":
        return <AtajosTeclado />;
      case "ejemplos":
        return <EjemplosCasos showToast={showToast} />;
      case "glosario":
        return <GlossaryView />;
      case "feedback":
        return <FeedbackForm showToast={showToast} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <BookOpen size={20} color="var(--color-accent)" />
          <div
            className="text-lg font-semibold"
            style={{ color: "var(--color-text)" }}
          >
            Como Usar
          </div>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: "var(--color-accent)22",
              color: "var(--color-accent)",
            }}
          >
            Guia completa
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <BtnOutline
            onClick={imprimirGuiaPDF}
            icon={Printer}
            size="sm"
            color="var(--color-accent)"
          >
            Imprimir guia PDF
          </BtnOutline>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {secciones.map((s) => (
          <button
            key={s.id}
            onClick={() => setSeccion(s.id)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md transition-colors hover:opacity-70 ${
              seccion === s.id
                ? "bg-[var(--color-surface)] text-[var(--color-accent)] border border-[var(--color-border)]"
                : "text-[var(--color-text-muted)]"
            }`}
          >
            <s.icon size={13} /> {s.label}
          </button>
        ))}
      </div>

      <div
        ref={contenidoRef}
        className="rounded-lg p-4"
        style={{
          backgroundColor: "var(--color-surface2)",
          border: "1px solid var(--color-border)",
          minHeight: 300,
        }}
      >
        {renderSeccion()}
      </div>

    </div>
  );
}
