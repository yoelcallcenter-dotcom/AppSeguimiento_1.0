import React, { useState } from "react";
import {
  BookOpen,
  MessageSquare,
  Keyboard,
  FileText,
  Mail,
  Play,
  Zap,
  ScrollText,
  Printer,
  Download,
  LayoutDashboard,
  BarChart3,
  MapPin,
  Building2,
  CircleDot,
  Edit3,
  LayoutGrid,
  Table2,
  ClipboardList,
  Wrench,
  Sliders,
  Calendar,
  StickyNote,
  Bell,
  Search,
  Upload,
  List,
  ChevronDown,
  Eye,
  CheckCircle2,
  Clock,
  Sparkles,
  User,
} from "lucide-react";
import { FAQView } from "../../faq";
import { GlossaryView } from "../../glossary";
import { GuideView } from "../../guide";
import { AtajosTeclado } from "./AtajosTeclado";
import { FeedbackForm } from "./FeedbackForm";
import { useTour, TOURS } from "../../tour";
import { DOC_README, DOC_CHANGELOG } from "../../docs/docsContent";

function SeccionAccordeon({ id, titulo, icon: Icon, color, badge, children }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div id={id} className="rounded-lg overflow-hidden transition-[height,opacity] duration-200" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
      <button
        onClick={() => setAbierto(!abierto)}
        className="flex items-center gap-2 w-full p-3 text-left transition-colors hover:bg-white/5 group"
      >
        <div className="w-1 h-8 rounded-full flex-shrink-0 transition-transform duration-200 group-hover:scale-y-110" style={{ backgroundColor: color }} />
        <Icon size={16} style={{ color }} className="flex-shrink-0" />
        <span className="text-xs font-semibold flex-1" style={{ color: "var(--color-text)" }}>{titulo}</span>
        {badge && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${color}22`, color }}>
            {badge}
          </span>
        )}
        <ChevronDown
          size={14}
          style={{ color: "var(--color-text-muted)" }}
          className={`transition-transform duration-200 ${abierto ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className={`transition-[height,opacity] duration-300 ease-in-out overflow-hidden ${abierto ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}`}
      >
        <div className="p-3 pt-0">{children}</div>
      </div>
    </div>
  );
}

export default function HelpPanel({ showToast, onClose }) {
  const [seccion, setSeccion] = useState("tour");
  const [docTab, setDocTab] = useState("readme");
  const { startTour } = useTour();
  // Contenidos tomados DIRECTAMENTE de src/docs/ (generados por scripts/build-docs.js).
  const docs = { readme: DOC_README, changelog: DOC_CHANGELOG };

  const secciones = [
    { id: "tour", label: "Tour interactivo", icon: Play },
    { id: "vistas", label: "Acerca de Vistas", icon: LayoutDashboard },
    { id: "faq", label: "Preguntas Frecuentes", icon: MessageSquare },
    { id: "atajos", label: "Atajos de teclado", icon: Keyboard },
    { id: "glosario", label: "Glosario", icon: BookOpen },
    { id: "guiapdf", label: "Guia PDF", icon: Printer },
    { id: "documentacion", label: "Documentacion", icon: FileText },
    { id: "feedback", label: "Feedback", icon: Mail },
  ];

  const renderSeccion = () => {
    switch (seccion) {
      case "tour":
        return (
          <div className="space-y-4 w-full">
            <div
              className="rounded-lg p-4 text-center w-full"
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
                la aplicacion, incluyendo las 6 pestanas del Dashboard,
                el Calendario, el Bloc de Notas y la Configuracion.
              </div>

              <button
                onClick={() => { startTour("onboarding"); onClose(); }}
                className="mt-3 px-4 py-2 rounded-md text-xs font-semibold transition-opacity hover:opacity-80"
                style={{
                  backgroundColor: "var(--color-accent)",
                  color: "#14181F",
                }}
              >
                Comenzar tour ({TOURS.onboarding.steps.length} pasos)
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
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
                  Dashboard 2.0
                </div>
                <div className="text-xs" style={{ color: "var(--color-text)" }}>
                  6 pestanas: Analitica, Resumen, Rendimiento, Geografia, Estudios, Estados. Metricas, funnel, alertas y graficos configurables.
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
                  Gestionar casos
                </div>
                <div className="text-xs" style={{ color: "var(--color-text)" }}>
                  Tablero Kanban con arrastrar y soltar, tabla filtrable con seleccion multiple y exportacion.
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
                  Personalizar
                </div>
                <div className="text-xs" style={{ color: "var(--color-text)" }}>
                  Temas oscuro/claro, colores por estado, metricas del dashboard, columnas de tabla y mas.
                </div>
              </div>
            </div>

            <div
              className="rounded-lg p-3 flex items-start gap-2 w-full"
              style={{
                backgroundColor: "var(--color-accent)11",
                border: "1px solid var(--color-accent)33",
              }}
            >
              <Zap
                size={16}
                color="var(--color-accent)"
                className="flex-shrink-0 mt-0.5"
              />
              <div>
                <span
                  className="text-xs font-semibold"
                  style={{ color: "var(--color-accent)" }}
                >
                  Consejo:
                </span>
                <span
                  className="text-xs ml-1"
                  style={{ color: "var(--color-text)" }}
                >
                  Explora las 6 pestanas del Dashboard (Analitica, Resumen, Rendimiento, Geografia, Estudios y Estados) para ver metricas, funnel, geografia y desempeno de estudios.
                </span>
              </div>
            </div>
          </div>
        );
      case "vistas":
        const ACCENT = "var(--color-accent)";
        const MUTED = "var(--color-text-muted)";
        const TEXT = "var(--color-text)";
        const SURF = "var(--color-surface)";
        const SURF2 = "var(--color-surface2)";
        const BORD = "var(--color-border)";

        return (
          <div className="space-y-4 w-full">
            <div className="rounded-lg p-4" style={{ backgroundColor: SURF, border: `1px solid ${BORD}` }}>
              <div className="flex items-center gap-2 mb-3">
                <Eye size={18} color={ACCENT} />
                <span className="text-sm font-semibold" style={{ color: TEXT }}>Acerca de Vistas</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: MUTED }}>
                Acá vas a encontrar una explicación completa de cada pantalla de la aplicación. No es una lista técnica — es una recorrida por cada vista, contando qué hace, por qué existe y cómo usarla en tu día a día.
              </p>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5">
              {[
                { id: "v-dash", label: "Dashboard", icon: LayoutDashboard },
                { id: "v-kanban", label: "Kanban", icon: LayoutGrid },
                { id: "v-tabla", label: "Tabla", icon: Table2 },
                { id: "v-reportes", label: "Reportes", icon: ClipboardList },
                { id: "v-utiles", label: "Útiles", icon: Wrench },
                { id: "v-config", label: "Config.", icon: Sliders },
                { id: "v-cal", label: "Calendario", icon: Calendar },
                { id: "v-notas", label: "Notas", icon: StickyNote },
                { id: "v-notif", label: "Notif.", icon: Bell },
                { id: "v-busq", label: "Búsqueda", icon: Search },
                { id: "v-import", label: "Importar", icon: Upload },
                { id: "v-export", label: "Exportar", icon: Download },
              ].map(({ id: sid, label, icon: I }) => (
                <a
                  key={sid}
                  href={`#${sid}`}
                  onClick={(e) => { e.preventDefault(); document.getElementById(sid)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg text-center transition-transform transition-colors duration-150 hover:scale-105"
                  style={{ backgroundColor: SURF2, border: `1px solid ${BORD}` }}
                >
                  <I size={14} color={ACCENT} />
                  <span className="text-[10px] font-medium leading-tight" style={{ color: TEXT }}>{label}</span>
                </a>
              ))}
            </div>

            <SeccionAccordeon id="v-dash" titulo="Dashboard" icon={LayoutDashboard} color={ACCENT} badge="6 pestañas">
              <p className="text-xs mb-2 leading-relaxed" style={{ color: TEXT }}>
                El Dashboard es el panel de control inteligente. En lugar de tener que revisar caso por caso, acá ves todo de un vistazo: cuántos casos tenés, cómo vienen las conversiones, qué provincias rinden mejor y qué estudios están destacando. Todo con filtros por mes y día, así podés analizar períodos específicos sin perderte en datos viejos.
              </p>
              <div className="space-y-2 text-xs" style={{ color: MUTED }}>
                <div className="rounded-lg p-2.5" style={{ backgroundColor: SURF2 }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles size={13} color={ACCENT} />
                    <span className="font-semibold text-[11px]" style={{ color: TEXT }}>Pestaña Analítica</span>
                  </div>
                  <div className="leading-relaxed">Es la pestaña que se muestra al abrir el Dashboard. Arriba tenés las tarjetas de KPIs: total de casos, activos, firmados, sin reporte y no viables. Después un panel de insights automáticos que detecta patrones y te sugiere qué revisar. Más abajo: distribución de casos por estado y por categoría (pastel), métricas de tiempo, la tendencia de los últimos 30 días, barras apiladas por estado, casos por tipo de ingreso y un área con la evolución diaria. Todo analizable al instante.</div>
                </div>
                <div className="rounded-lg p-2.5" style={{ backgroundColor: SURF2 }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <LayoutDashboard size={13} color={ACCENT} />
                    <span className="font-semibold text-[11px]" style={{ color: TEXT }}>Pestaña Resumen</span>
                  </div>
                  <div className="leading-relaxed">Vista ejecutiva del período. Arriba muestra el total de casos y firmas junto con un insight automático que compara contra los últimos 30 días. Después vienen las tarjetas de KPIs: total de casos, activos, firmados, sin reporte y no viables — cada una con su tendencia. Más abajo está el funnel de conversión de 4 etapas, el gráfico de actividad de los últimos 7 días, alertas que se encienden solas si algo anda mal (baja conversión, muchos pendientes, casos sin reporte), acciones rápidas para filtrar por estado, los eventos que se vienen, notas recientes, los últimos casos que cargaste y un compacto "Mi Día" para arrancar la jornada.</div>
                </div>
                <div className="rounded-lg p-2.5" style={{ backgroundColor: SURF2 }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <BarChart3 size={13} color={ACCENT} />
                    <span className="font-semibold text-[11px]" style={{ color: TEXT }}>Pestaña Rendimiento</span>
                  </div>
                  <div className="leading-relaxed">Métricas de performance: tasa de conversión, tiempo promedio que un caso pasa en gestión y tasa de pérdida. También métricas de tiempo como días en gestión y días totales desde que se cargó el caso. Abajo se repiten el funnel y el gráfico de actividad, más el indicador de Logro de Objetivos — si definiste una meta de 14 firmas al mes, acá ves qué tan cerca estás.</div>
                </div>
                <div className="rounded-lg p-2.5" style={{ backgroundColor: SURF2 }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <MapPin size={13} color={ACCENT} />
                    <span className="font-semibold text-[11px]" style={{ color: TEXT }}>Pestaña Geografía</span>
                  </div>
                  <div className="leading-relaxed">Una tabla de provincias y localidades con cuántos casos hay, cuántas firmas se consiguieron, tasa de conversión y tasa de pérdida. Las mejores provincias aparecen como tarjetas destacadas. Además, un mapa interactivo que agrupa los casos por ubicación y se puede navegar con un buscador.</div>
                </div>
                <div className="rounded-lg p-2.5" style={{ backgroundColor: SURF2 }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Building2 size={13} color={ACCENT} />
                    <span className="font-semibold text-[11px]" style={{ color: TEXT }}>Pestaña Estudios</span>
                  </div>
                  <div className="leading-relaxed">El desempeño de cada estudio jurídico: cuántos casos les asignaste, cuántas firmas obtuvieron, su tasa de conversión y tasa de pérdida. Los mejores estudios también aparecen como tarjetas destacadas, ideal para saber con qué estudios conviene trabajar más.</div>
                </div>
                <div className="rounded-lg p-2.5" style={{ backgroundColor: SURF2 }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <CircleDot size={13} color={ACCENT} />
                    <span className="font-semibold text-[11px]" style={{ color: TEXT }}>Pestaña Estados</span>
                  </div>
                  <div className="leading-relaxed">Una foto de todos los casos distribuidos por estado del pipeline, más el funnel de conversión completo para entender cómo fluyen los casos de principio a fin.</div>
                </div>
              </div>
              <div className="mt-2 text-[10px] flex items-center gap-1" style={{ color: MUTED }}>
                <CheckCircle2 size={11} color={ACCENT} />
                <span>La personalización de pestañas, widgets y métricas se hace desde <b>Configuración → Apariencia → Dashboard</b>.</span>
              </div>
            </SeccionAccordeon>

            <SeccionAccordeon id="v-kanban" titulo="Tablero (Kanban)" icon={LayoutGrid} color="#22c55e" badge="11 estados">
              <p className="text-xs mb-2 leading-relaxed" style={{ color: TEXT }}>
                El Tablero Kanban es el corazón operativo de la app. Acá ves todos tus casos organizados en columnas, una por cada estado del pipeline. La idea es simple: mirás la columna, ves qué casos están en esa etapa, y si un caso avanza o retrocede, lo arrastrás a la columna que corresponda. El cambio de estado se aplica al instante.
              </p>
              <div className="space-y-2 text-xs" style={{ color: MUTED }}>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Las tarjetas de caso</b> muestran lo esencial: nombre del prospecto, teléfono, hace cuántos días está en ese estado, a qué estudio jurídico está asignado y las etiquetas que le pusiste. Si necesitás más datos, hacés clic en la tarjeta y se abre el detalle completo con toda la información, reportes y notas vinculadas.</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Los 11 estados del pipeline</b> cubren todo el ciclo de vida: Pendiente (recién cargado), Cita virtual, Cita presencial, No responde, Lo piensa, Reprogramado, Tiene Abogado, No le interesa, No viable, Firmo (el éxito final) y Sin reporte. Cada estado tiene un color que te ayuda a identificar visualmente en qué etapa está cada caso. Esos colores los podés personalizar desde Configuración.</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>La Pipeline Bar</b> es la barra horizontal que ves arriba del tablero. Muestra la distribución de todos tus casos filtrados: cada segmento representa un estado, con su cantidad y porcentaje. Si hacés clic en un segmento, el tablero se filtra para mostrar solo los casos de ese estado.</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>¿Sabías que...</b> el tablero respeta el filtro de mes que elegiste en el header? Si seleccionás un mes específico, solo ves los casos activos de ese período. Y si usás la búsqueda por nombre, teléfono o localidad, el tablero se filtra en tiempo real.</div>
              </div>
            </SeccionAccordeon>

            <SeccionAccordeon id="v-tabla" titulo="Tabla" icon={Table2} color="#3b82f6" badge="columnas personalizables">
              <p className="text-xs mb-2 leading-relaxed" style={{ color: TEXT }}>
                La vista de Tabla es ideal cuando necesitás ver muchos casos a la vez y ordenarlos como quieras. Cada fila es un caso, y las columnas muestran todos los campos que cargaste: fecha, nombre, teléfono, localidad, estado, estudio, aseguradora, profesión, tipo de ingreso, lesión, etiquetas, etc. Hacés clic en el encabezado de cualquier columna y se ordena ascendente o descendente.
              </p>
              <div className="space-y-2 text-xs" style={{ color: MUTED }}>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Selección múltiple:</b> Cada fila tiene un checkbox. Podés seleccionar varios casos y después exportarlos a CSV o eliminarlos en lote. Un contador arriba te dice cuántos seleccionaste.</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Filtros combinados:</b> El selector de mes acota los casos al período que te interesa. Podés agregar un filtro por día específico para ser más preciso, y la búsqueda por texto filtra por nombre, teléfono o localidad al instante. Todo se combina.</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Columnas a medida:</b> En Configuración → Columnas podés decidir qué columnas se ven y cuáles no. Si hay campos que nunca usás, los ocultás y la tabla se vuelve más limpia. Si querés volver atrás, hay un botón para restaurar las columnas básicas.</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Exportación:</b> Con un clic en "Exportar CSV" obtenés un archivo con todos los casos visibles (aplicando los filtros que tengas activos). También podés exportar casos individuales desde su detalle a PDF.</div>
              </div>
            </SeccionAccordeon>

            <SeccionAccordeon id="v-reportes" titulo="Reportes" icon={ClipboardList} color="#f59e0b" badge="historial completo">
              <p className="text-xs mb-2 leading-relaxed" style={{ color: TEXT }}>
                Cada vez que cargás un reporte — ya sea desde el botón "Cargar reporte" del header o desde el detalle de un caso — queda registrado en esta vista. Es el historial completo de todo lo que pasó, ordenado del más reciente al más antiguo.
              </p>
              <div className="space-y-2 text-xs" style={{ color: MUTED }}>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>¿Qué muestra cada reporte?</b> El nombre del caso, la fecha exacta en que se cargó, el estado anterior y el nuevo estado (si cambió), la novedad que escribió el operador y hace cuánto tiempo fue. Todo en una línea clara y legible.</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Búsqueda en vivo:</b> Empezás a escribir en el campo de búsqueda y la lista se filtra al instante. Busca por nombre del caso, por el texto de la novedad o por el estado. Ideal cuando tenés cientos de reportes y necesitás encontrar uno en particular.</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Desde el detalle del caso:</b> Cuando abrís un caso desde el Kanban o la Tabla, también ves sus reportes en la sección de novedades. Y desde ahí mismo podés cargar uno nuevo sin salir del detalle.</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Edición y eliminación:</b> Cada reporte se puede editar (para corregir la novedad o el estado) o eliminar si fue un error. Esto también se puede hacer desde el detalle del caso.</div>
              </div>
            </SeccionAccordeon>

            <SeccionAccordeon id="v-utiles" titulo="Útiles" icon={Wrench} color="#a855f7" badge="10 herramientas">
              <p className="text-xs mb-2 leading-relaxed" style={{ color: TEXT }}>
                La vista Útiles es tu caja de herramientas del día a día. Agrupa recursos prácticos que usás mientras atendés prospectos: guiones de llamada, respuestas a objeciones, directorio de aseguradoras, lesiones, estudios jurídicos y más. Todo organizado en secciones con sus propios datos.
              </p>
              <div className="space-y-2 text-xs" style={{ color: MUTED }}>
                <div className="rounded-lg p-2.5" style={{ backgroundColor: SURF2 }}>
                  <span className="font-semibold text-[11px]" style={{ color: TEXT }}>Pasos a Seguir</span>
                  <div className="leading-relaxed mt-0.5">El protocolo de atención paso a paso. Cada paso tiene un icono, un título y una descripción detallada. Podés crear nuevos pasos, editarlos o eliminarlos. Ideal para estandarizar el proceso de atención y tenerlo siempre a mano.</div>
                </div>
                <div className="rounded-lg p-2.5" style={{ backgroundColor: SURF2 }}>
                  <span className="font-semibold text-[11px]" style={{ color: TEXT }}>Speech</span>
                  <div className="leading-relaxed mt-0.5">Guiones predefinidos para llamadas telefónicas. Cada speech tiene un icono, título y el texto completo. Con un clic lo copiás al portapapeles y lo usás en la llamada. Creá los que más uses y tenelos siempre listos.</div>
                </div>
                <div className="rounded-lg p-2.5" style={{ backgroundColor: SURF2 }}>
                  <span className="font-semibold text-[11px]" style={{ color: TEXT }}>Objeciones</span>
                  <div className="leading-relaxed mt-0.5">Base de respuestas para objeciones típicas de prospectos. Están organizadas por categoría. Cada una muestra la objeción que suele aparecer y una respuesta sugerida que podés copiar al portapapeles. Con el tiempo vas armando un catálogo cada vez más completo.</div>
                </div>
                <div className="rounded-lg p-2.5" style={{ backgroundColor: SURF2 }}>
                  <span className="font-semibold text-[11px]" style={{ color: TEXT }}>Conversación Sugerida</span>
                  <div className="leading-relaxed mt-0.5">Plantillas de conversación completa divididas en tres etapas: Apertura, Desarrollo y Cierre. Incluyen variables como <code className="text-[10px] px-1 py-0.5 rounded" style={{ backgroundColor: `${ACCENT}22`, color: ACCENT }}>{'{OPERADOR}'}</code> que se reemplazan automáticamente. Copiás la plantilla y la adaptás al momento.</div>
                </div>
                <div className="rounded-lg p-2.5" style={{ backgroundColor: SURF2 }}>
                  <span className="font-semibold text-[11px]" style={{ color: TEXT }}>Aseguradoras (ART)</span>
                  <div className="leading-relaxed mt-0.5">Directorio completo de aseguradoras de riesgos del trabajo. Cada una tiene nombre, teléfono, email y sitio web. Podés agregar, editar y eliminar registros. Misma lógica para <b style={{ color: TEXT }}>Tránsito</b>, con aseguradoras de accidentes de tránsito.</div>
                </div>
                <div className="rounded-lg p-2.5" style={{ backgroundColor: SURF2 }}>
                  <span className="font-semibold text-[11px]" style={{ color: TEXT }}>Lesiones</span>
                  <div className="leading-relaxed mt-0.5">Catálogo de lesiones categorizadas por tipo: Accidente Laboral, Enfermedad Profesional, No Viable. Cada lesión tiene nombre, código y descripción. Se puede crear, editar y eliminar.</div>
                </div>
                <div className="rounded-lg p-2.5" style={{ backgroundColor: SURF2 }}>
                  <span className="font-semibold text-[11px]" style={{ color: TEXT }}>Prolegal y Estudios Jurídicos</span>
                  <div className="leading-relaxed mt-0.5">Gestión de estudios jurídicos: datos de contacto, asignación por localidad. El mapeo de localidades a estudios permite que al crear un caso se asigne automáticamente el estudio correspondiente según la localidad del prospecto.</div>
                </div>
              </div>
            </SeccionAccordeon>

            <SeccionAccordeon id="v-config" titulo="Configuraciones" icon={Sliders} color="#ec4899" badge="10 categorías">
              <p className="text-xs mb-2 leading-relaxed" style={{ color: TEXT }}>
                La pantalla de Configuración es donde adaptás la aplicación a tu forma de trabajar. Está dividida en secciones claras, cada una con opciones agrupadas por tema. Todo se guarda automáticamente en tu navegador y persiste aunque cierres la ventana.
              </p>
              <div className="space-y-2 text-xs" style={{ color: MUTED }}>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>General:</b> Poné tu nombre de operador, elegí el formato de fecha argentino o el que prefieras, configurá el formato de teléfono, cuántos casos ver por página, si querés sonidos o no, el Modo No Molestar, el idioma (español, inglés o portugués), zona horaria y preferencias de búsqueda.</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Apariencia → Colores:</b> Elegí entre modo Oscuro, Claro o Personalizado. En el modo personalizado definís 3 colores base y la app genera toda la paleta automáticamente. También podés cambiar el color de cada estado del pipeline individualmente.</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Apariencia → Dashboard:</b> Todo lo que se ve en el Dashboard lo configurás acá: orden de pestañas (arrastrando), orden de widgets dentro de cada pestaña, qué métricas se muestran, qué categorías de estado usás (Éxito, Pérdida, Contacto, Pendientes) y las reglas de alerta automática con sus umbrales.</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Notificaciones:</b> Elegí qué canales querés (toast en pantalla, sonido, notificación de escritorio), qué tipos de eventos te notifican (cambio de estado, reporte cargado, evento próximo, backup, errores) y cada cuánto se agrupan (en tiempo real, cada 5, 15, 30 minutos o 1 hora).</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Automatización:</b> Activá reglas como alertar cuando un caso lleva +7 días sin novedades, recordar cargar reporte, crear un evento automáticamente al agendar una cita o hacer backup semanal.</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Búsqueda:</b> Elegí qué campos se indexan para la búsqueda (nombre, teléfono, localidad, etc.), si querés guardar historial de búsqueda y cuántos items mantener.</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Importación:</b> Configurá el mapeo automático de campos del CSV, si querés validar duplicados y teléfonos, y si mostrás una vista previa antes de importar.</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Columnas:</b> Mostrá u ocultá columnas de la vista Tabla. Podés marcar/desmarcar individualmente, mostrar todas o restaurar el conjunto básico.</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Datos:</b> Exportá casos a CSV por mes, exportá toda la configuración a JSON, importá configuración, exportá o importá notas y calendario, eliminá útiles, casos por mes, notas, eventos o todos los datos por completo.</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Sistema:</b> Modo bajo consumo, caché inteligente, lazy loading, renderizado virtualizado. También podés ver el autodiagnóstico del sistema y los logs de errores para detectar problemas.</div>
              </div>
            </SeccionAccordeon>

            <SeccionAccordeon id="v-cal" titulo="Calendario" icon={Calendar} color="#06b6d4" badge="eventos y citas">
              <p className="text-xs mb-2 leading-relaxed" style={{ color: TEXT }}>
                El Calendario te permite gestionar eventos, citas y recordatorios en una vista mensual. Se abre desde el icono de calendario en el header. Es útil para no perderte ninguna cita virtual o presencial, y para organizar tu semana sabiendo qué eventos se vienen.
              </p>
              <div className="space-y-2 text-xs" style={{ color: MUTED }}>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>¿Cómo se crea un evento?</b> Hacés clic en cualquier día del calendario y se abre un formulario donde ponés título, fecha, hora opcional, descripción, prioridad (Alta, Media, Baja) y podés vincularlo a un caso específico. Los eventos de alta prioridad se muestran destacados.</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Vinculación con casos:</b> Si creás un evento desde el detalle de un caso, queda automáticamente vinculado. Después, desde el Dashboard, en la sección "Próximos eventos" ves todos los eventos que se vienen, incluyendo los vinculados a casos.</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Recordatorios:</b> Activando el recordatorio, el sistema te notifica cuando llegue la fecha. La notificación te llega por los canales que tengas configurados (toast, sonido, escritorio).</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Navegación:</b> Las flechas izquierda/derecha cambian de mes. Los días que tienen eventos se muestran resaltados. Al hacer clic en un evento existente se abre su detalle y podés editarlo o eliminarlo.</div>
              </div>
            </SeccionAccordeon>

            <SeccionAccordeon id="v-notas" titulo="Notas (Bloc de Notas)" icon={StickyNote} color="#f97316" badge="auto-guardado">
              <p className="text-xs mb-2 leading-relaxed" style={{ color: TEXT }}>
                El Bloc de Notas es un editor de texto completo donde podés escribir notas libres y asociarlas a casos. Se abre desde el icono de documento en el header. Es como tener un cuaderno digital donde cada nota se guarda automáticamente mientras escribís.
              </p>
              <div className="space-y-2 text-xs" style={{ color: MUTED }}>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Escribir y organizar:</b> Cada nota tiene un título, contenido con formato, etiquetas (tags) para clasificarla y la posibilidad de vincular uno o más casos mediante el CaseLinker. El auto-guardado hace que nunca pierdas lo que estás escribiendo.</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Encontrar notas:</b> En la barra lateral izquierda ves todas las notas ordenadas por fecha de modificación. Podés buscar por texto, filtrar por tags o buscar una nota específica. Ideal cuando tenés muchas notas acumuladas.</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Notas vinculadas a casos:</b> Cuando abrís un caso desde el Kanban o la Tabla, en la sección "Bloc de Notas" del detalle ves todas las notas que vinculaste a ese caso. Así tenés toda la información contextual al alcance.</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Exportación:</b> Las notas se incluyen cuando exportás la configuración completa a JSON, o podés exportarlas de forma independiente junto con los eventos del calendario.</div>
              </div>
            </SeccionAccordeon>

            <SeccionAccordeon id="v-notif" titulo="Notificaciones" icon={Bell} color="#ef4444" badge="3 canales">
              <p className="text-xs mb-2 leading-relaxed" style={{ color: TEXT }}>
                El sistema de notificaciones te mantiene al tanto de lo que pasa sin tener que estar revisando todo manualmente. Te avisa cuando un caso cambia de estado, cuando vence un evento, si hay errores o si el Dashboard detecta algo que necesita atención.
              </p>
              <div className="space-y-2 text-xs" style={{ color: MUTED }}>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>¿Qué cosas generan notificaciones?</b> Cambio de estado de un caso, reporte cargado, evento próximo a vencer, backup realizado, errores del sistema y alertas del Dashboard (cuando la tasa de conversión baja mucho, hay demasiados pendientes o casos sin reporte).</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>¿De qué formas te llegan?</b> Tres canales: toast en pantalla (el cartelito que aparece abajo), sonido (un beep breve), y notificación de escritorio (la ventanita del navegador). Cada canal se puede activar o desactivar por separado.</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Agrupación:</b> Si no querés que te interrumpan constantemente, podés agrupar las notificaciones cada 5, 15, 30 minutos o 1 hora. En lugar de recibir una por una, recibís un resumen con todo lo que pasó en ese período.</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>¿Dónde ves las notificaciones?</b> En el header hay un icono de campana con un badge que muestra la cantidad de notificaciones no leídas. Haciendo clic se abre el panel de notificaciones con el historial completo.</div>
              </div>
            </SeccionAccordeon>

            <SeccionAccordeon id="v-busq" titulo="Búsqueda Global" icon={Search} color="#14b8a6" badge="Ctrl+K">
              <p className="text-xs mb-2 leading-relaxed" style={{ color: TEXT }}>
                La Búsqueda Global (Ctrl+K) te permite encontrar cualquier cosa en la aplicación sin importar dónde estés. Busca simultáneamente en casos, notas y eventos, y te muestra los resultados agrupados por tipo.
              </p>
              <div className="space-y-2 text-xs" style={{ color: MUTED }}>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>¿Cómo se abre?</b> Con la combinación Ctrl+K desde cualquier pantalla. También hay un botón de búsqueda en el header. Aparece un overlay con un campo de búsqueda donde empezás a escribir.</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Resultados en vivo:</b> Mientras escribís, los resultados aparecen instantáneamente. Busca por nombre, teléfono, localidad, texto de notas, títulos de eventos, etc. Los resultados se agrupan en secciones: Casos, Notas y Eventos.</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Búsqueda por etiquetas (#):</b> Escribí <b style={{ color: TEXT }}>#etiqueta</b> (por ejemplo <b style={{ color: TEXT }}>#amable</b>) para ver solo los casos, notas y eventos que tienen esa etiqueta.</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Búsqueda por comentario (@):</b> Escribí <b style={{ color: TEXT }}>@texto</b> (por ejemplo <b style={{ color: TEXT }}>@Desconfiada</b>) para ver los casos cuyo comentario empieza con ese texto.</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Navegación con teclado:</b> podés moverte entre resultados con las flechas y presionar Enter para abrir. Escape cierra la búsqueda. No necesitas el mouse.</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Configuración:</b> En Configuración → Búsqueda podés elegir qué campos se indexan (nombre, teléfono, localidad, aseguradora, observaciones) y si querés guardar un historial de las búsquedas que hacés.</div>
              </div>
            </SeccionAccordeon>

            <SeccionAccordeon id="v-import" titulo="Importación Inteligente" icon={Upload} color="#8b5cf6" badge="CSV">
              <p className="text-xs mb-2 leading-relaxed" style={{ color: TEXT }}>
                El Importador Inteligente de CSV te permite cargar casos en lote desde un archivo. No es un simple volcado de datos — el sistema analiza tu archivo, te muestra una vista previa y te deja ajustar cómo se mapean los campos antes de importar.
              </p>
              <div className="space-y-2 text-xs" style={{ color: MUTED }}>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Mapeo automático de campos:</b> Subís tu CSV y el sistema intenta reconocer automáticamente qué columna corresponde a cada campo (nombre, teléfono, localidad, etc.). Si algo no coincide, podés ajustarlo manualmente con un selector.</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Vista previa:</b> Antes de importar, ves una tabla con cómo quedarían los datos, paginada para que sea cómoda incluso con archivos de miles de casos. Ahí podés verificar que el mapeo sea correcto y detectar errores a simple vista. La tabla mantiene barras de desplazamiento persistentes para que nunca pierdas el contexto.</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Reparación de columnas:</b> Si el archivo tiene comas sueltas dentro de un campo (ej: "Pendiente, prioridad alta"), el sistema detecta el desalineamiento y fusiona el excedente en la última columna, conservando las comas y espacios originales del texto.</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Validación inteligente:</b> El sistema detecta duplicados por número de teléfono y te advierte. También valida que los teléfonos tengan un formato válido. Podés decidir si querés saltar los duplicados o importarlos igual.</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Configuración:</b> En Configuración → Importación podés definir si querés validar duplicados siempre, forzar formato de teléfono y si la vista previa se muestra por defecto.</div>
              </div>
            </SeccionAccordeon>

            <SeccionAccordeon id="v-export" titulo="Exportación y Respaldo" icon={Download} color="#6366f1" badge="3 formatos">
              <p className="text-xs mb-2 leading-relaxed" style={{ color: TEXT }}>
                La app ofrece varias formas de sacar tus datos: exportar casos a CSV o PDF, respaldar toda la configuración en JSON, exportar notas y calendario, o hacer una copia de seguridad completa. Todo desde Configuración → Datos.
              </p>
              <div className="space-y-2 text-xs" style={{ color: MUTED }}>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>CSV de casos:</b> Desde la vista Tabla o desde Configuración → Datos, exportás los casos del mes seleccionado a un archivo CSV que podés abrir en Excel o Google Sheets.</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>PDF individual:</b> Desde el detalle de cualquier caso, podés generar un PDF con toda la información del caso, sus reportes y notas vinculadas. Ideal para compartir o imprimir.</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Respaldo completo (JSON):</b> Exportá toda la configuración (colores, categorías, útiles, preferencias) a un archivo JSON. Después podés importarlo en otra computadora o después de limpiar el navegador.</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Notas y Calendario:</b> También se pueden exportar e importar de forma independiente, sin necesidad de incluir la configuración general.</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Backup automático:</b> Si activás la opción en Configuración → Automatización, la app hace una copia de seguridad automática cada semana. Nunca te vas a quedar sin respaldo.</div>
              </div>
            </SeccionAccordeon>

            <SeccionAccordeon id="v-miespacio" titulo="Mi Espacio" icon={User} color="#10b981" badge="centro personal">
              <p className="text-xs mb-2 leading-relaxed" style={{ color: TEXT }}>
                Mi Espacio es tu centro personal dentro de la app. Aquí gestionás tu perfil, jornada, disponibilidad, metas y accesos. Todo es local y persistente.
              </p>
              <div className="space-y-2 text-xs" style={{ color: MUTED }}>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Mi Jornada:</b> Muestra el estado de tu jornada (activa, finalizada, en objetivo), tiempo transcurrido, restante y fecha. Incluye barra de progreso.</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Objetivos Diarios:</b> Seguimiento de casos, reportes y firmas del día con barras de proyección y meta mensual.</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Disponibilidad:</b> Configurá vacaciones, feriados, inasistencias y días no laborables. El calendario los tiene en cuenta.</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Próximos Compromisos:</b> Eventos del calendario próximos a vencer, con alertas de vencimiento.</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Resumen de Jornada:</b> Al finalizar el día, muestra un resumen completo de logros, casos atendidos y pendientes.</div>
                <div className="leading-relaxed"><b style={{ color: TEXT }}>Exportación PDF:</b> Generá un PDF con tu perfil, objetivos, métricas y resumen del período.</div>
              </div>
            </SeccionAccordeon>

            <div className="rounded-lg p-3 flex items-start gap-2" style={{ backgroundColor: `${ACCENT}11`, border: `1px solid ${ACCENT}33` }}>
              <Clock size={16} color={ACCENT} className="flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-semibold" style={{ color: ACCENT }}>Tip: </span>
                <span className="text-xs" style={{ color: TEXT }}>
                  Muchas de estas vistas se abren con atajos de teclado. Presioná Ctrl+1 a Ctrl+5 para cambiar entre Dashboard, Tablero, Tabla, Reportes y Útiles al instante. Ctrl+H abre Ayuda, Ctrl+K abre Búsqueda Global y Escape cierra cualquier panel.
                </span>
              </div>
            </div>
          </div>
        );
      case "faq":
        return <FAQView showToast={showToast} />;
      case "atajos":
        return <AtajosTeclado />;
      case "glosario":
        return <GlossaryView />;
      case "guiapdf":
        return <GuideView showToast={showToast} />;
      case "documentacion": {
        const DOCS = {
          readme: {
            label: "README.md",
            desc: "Guía de usuario y características",
            icon: BookOpen,
          },
          changelog: {
            label: "CHANGELOG.md",
            desc: "Historial de versiones y cambios",
            icon: ScrollText,
          },
        };
        const docIds = Object.keys(DOCS);
        const moverDoc = (dir) => {
          const idx = docIds.indexOf(docTab);
          const next = (idx + dir + docIds.length) % docIds.length;
          setDocTab(docIds[next]);
        };
        const contenido = docs[docTab] || "";

        return (
          <div className="space-y-4 w-full">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={20} color="var(--color-accent)" />
              <h2
                id="documentacion-titulo"
                className="text-sm font-semibold"
                style={{ color: "var(--color-text)", margin: 0 }}
              >
                Documentación del Sistema
              </h2>
            </div>

            <div
              role="tablist"
              aria-label="Documentos del sistema"
              className="grid grid-cols-1 md:grid-cols-2 gap-3"
            >
              {docIds.map((id) => {
                const info = DOCS[id];
                const InfoIcon = info.icon;
                const activo = docTab === id;
                return (
                  <button
                    key={id}
                    role="tab"
                    id={`doc-tab-${id}`}
                    aria-selected={activo}
                    aria-controls="documentacion-panel"
                    tabIndex={activo ? 0 : -1}
                    onClick={() => setDocTab(id)}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowRight") moverDoc(1);
                      else if (e.key === "ArrowLeft") moverDoc(-1);
                    }}
                    className="rounded-lg p-3 text-left transition-colors hover:bg-white/5"
                    style={{
                      backgroundColor: activo
                        ? "var(--color-surface)"
                        : "var(--color-surface2)",
                      border: `1px solid ${
                        activo ? "var(--color-accent)" : "var(--color-border)"
                      }`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <InfoIcon size={16} color="var(--color-accent)" />
                      <span
                        className="text-sm font-medium"
                        style={{ color: "var(--color-text)" }}
                      >
                        {info.label}
                      </span>
                    </div>
                    <div
                      className="text-xs mt-1"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {info.desc}
                    </div>
                  </button>
                );
              })}
            </div>

            <div
              id="documentacion-panel"
              role="tabpanel"
              aria-labelledby={`doc-tab-${docTab}`}
              className="rounded-lg w-full overflow-hidden"
              style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div
                className="flex items-center justify-between gap-2 px-4 py-3 flex-wrap"
                style={{ borderBottom: "1px solid var(--color-border)" }}
              >
                <h3
                  className="text-xs font-semibold"
                  style={{ color: "var(--color-accent)", margin: 0 }}
                >
                  {DOCS[docTab].label}
                </h3>
                <span
                  className="text-[10px]"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {DOCS[docTab].desc}
                </span>
              </div>
              <div className="preview-scroll" style={{ maxHeight: 460 }}>
                <pre
                  className="text-sm whitespace-pre-wrap font-mono p-4"
                  style={{ color: "var(--color-text)", margin: 0 }}
                >
                  {contenido}
                </pre>
              </div>
            </div>
          </div>
        );
      }
      case "feedback":
        return <FeedbackForm showToast={showToast} />;
      default:
        if (seccion.startsWith("doc_")) {
          return (
            <div className="space-y-4 w-full">
              <button
                onClick={() => setSeccion("documentacion")}
                className="text-xs hover:opacity-70 transition-opacity"
                style={{ color: "var(--color-accent)" }}
              >
                ← Volver a Documentacion
              </button>
              <div
                className="rounded-lg p-4 w-full"
                style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div
                  className="text-sm whitespace-pre-wrap font-mono"
                  style={{ color: "var(--color-text)" }}
                >
                  {docs[seccion.replace("doc_", "")] || "Contenido no disponible"}
                </div>
              </div>
            </div>
          );
        }
        return null;
    }
  };

  return (
    <div className="space-y-4 w-full">
      <div className="flex gap-1 flex-wrap">
        {secciones.map((s) => (
          <button
            key={s.id}
            onClick={() => setSeccion(s.id)}
            className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-md transition-colors hover:opacity-70 whitespace-nowrap ${
              seccion === s.id ||
              (seccion.startsWith("doc_") && s.id === "documentacion")
                ? "bg-[var(--color-surface)] text-[var(--color-accent)] border border-[var(--color-border)]"
                : "text-[var(--color-text-muted)]"
            }`}
          >
            <s.icon size={13} /> {s.label}
          </button>
        ))}
      </div>

      <div
        className="rounded-lg p-4 w-full"
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
