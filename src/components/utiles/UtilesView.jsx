import React, { useState, useMemo } from "react";
import {
  ClipboardList,
  MessageSquare,
  AlertTriangle,
  Copy,
  FileCheck,
  Stethoscope,
  Briefcase,
  Car,
  Building2,
  Search,
  LayoutGrid,
  List,
  ShieldAlert,
  FileText,
} from "lucide-react";
import { PasosView } from "./PasosView";
import { SpeechsView } from "./SpeechsView";
import { ObjecionesView } from "./ObjecionesView";
import { ConversacionesSugeridasView } from "./ConversacionesSugeridasView";
import { AseguradorasView } from "./AseguradorasView";
import { LesionesView } from "./LesionesView";
import { ProlegalView } from "./ProlegalView";
import { TransitoView } from "./TransitoView";
import { MapeoView } from "./MapeoView";
import { CondicionalesView } from "./CondicionalesView";
import { PlantillasView } from "./PlantillasView";
import { SearchInput } from "../common/SearchInput";
import useAppStore from '../../core/store/useAppStore';
import { SubPills } from "../common/UINav";
import { SectionHeader } from "../configuracion/ui";

export function UtilesView({
  config,
  setConfig,
  pasos,
  setPasos,
  tips,
  setTips,
  links,
  setLinks,
  speechs,
  setSpeechs,
  objeciones,
  setObjeciones,
  art,
  setArt,
  transito,
  setTransito,
  lesiones,
  setLesiones,
  mapeo,
  setMapeo,
  observacionesTransito,
  setObservacionesTransito,
  condicionales,
  setCondicionales,
  casos,
  showToast,
}) {
  const [subvista, setSubvista] = useState("condicionales");
  const [busqueda, setBusqueda] = useState("");
  const [vistaTabs, setVistaTabs] = useState("grid");

  const aseguradorasSugeridas = useMemo(() => {
    const set = new Set();
    (art || []).forEach((a) => a?.nombre && set.add(a.nombre));
    (transito || []).forEach((a) => a?.nombre && set.add(a.nombre));
    return [...set];
  }, [art, transito]);

  const utilesTabOrder = useAppStore((s) => s.utilesTabOrder);
  const TAB_DEFS = {
    condicionales: { label: "Condicionales", icon: ShieldAlert },
    pasos: { label: "Pasos a Seguir", icon: ClipboardList },
    speechs: { label: "Speechs", icon: MessageSquare },
    objeciones: { label: "Objeciones", icon: AlertTriangle },
    conversacion: { label: "Conversación Sugerida", icon: Copy },
    aseguradoras: { label: "Aseguradoras", icon: FileCheck },
    lesiones: { label: "Lesiones", icon: Stethoscope },
    prolegal: { label: "Prolegal", icon: Briefcase },
    transito: { label: "Tránsito", icon: Car },
    mapeo: { label: "Estudios Jurídicos", icon: Building2 },
    plantillas: { label: "Plantillas", icon: FileText },
  };
  const TAB_DESC = {
    condicionales: "Planillas y reglas para el control de condiciones de tus casos.",
    pasos: "Secuencia operativa paso a paso con tips y enlaces de utilidad.",
    speechs: "Libretos de comunicación listos para usar en cada situación.",
    objeciones: "Argumentos y respuestas ante objeciones frecuentes.",
    conversacion: "Guiones de conversación sugerida para cada contexto.",
    aseguradoras: "Directorio de aseguradoras y sus datos de contacto.",
    lesiones: "Catálogo de lesiones y tipos de cobertura.",
    prolegal: "Documentos y herramientas legales de apoyo.",
    transito: "Registro de tránsito y datos de cobertura.",
    mapeo: "Estudios jurídicos y ámbitos de actuación.",
    plantillas: "Plantillas de documentos para reutilizar.",
  };
  const tabs = utilesTabOrder
    .filter((k) => TAB_DEFS[k])
    .map((k) => [k, TAB_DEFS[k].label, TAB_DEFS[k].icon]);
  const getBadge = (key) => {
    switch (key) {
      case "condicionales":
        return (condicionales || []).length;
      case "pasos":
        return pasos.length + tips.length + links.length;
      case "speechs":
        return speechs.length;
      case "objeciones":
        return objeciones.length;
      case "aseguradoras":
        return art.length + transito.length;
      case "lesiones":
        return Object.values(lesiones).reduce(
          (acc, arr) => acc + (arr?.length || 0),
          0
        );
      case "mapeo":
        return mapeo.length;
      case "transito":
        return observacionesTransito.length;
      case "prolegal":
        return mapeo.length;
      case "plantillas":
        return 0;
      default:
        return 0;
    }
  };

  const tabsFiltrados = useMemo(() => {
    if (!busqueda.trim()) return tabs;
    const q = busqueda.trim().toLowerCase();
    return tabs.filter(
      ([key, label]) =>
        label.toLowerCase().includes(q) || key.toLowerCase().includes(q)
    );
  }, [tabs, busqueda]);

  const renderContenido = () => {
    switch (subvista) {
      case "condicionales":
        return (
          <CondicionalesView
            condicionales={condicionales}
            setCondicionales={setCondicionales}
            mapeo={mapeo}
            aseguradoras={aseguradorasSugeridas}
            showToast={showToast}
          />
        );
      case "pasos":
        return (
          <PasosView
            pasos={pasos}
            setPasos={setPasos}
            tips={tips}
            setTips={setTips}
            links={links}
            setLinks={setLinks}
            showToast={showToast}
          />
        );
      case "speechs":
        return (
          <SpeechsView
            speechs={speechs}
            setSpeechs={setSpeechs}
            showToast={showToast}
          />
        );
      case "objeciones":
        return (
          <ObjecionesView
            objeciones={objeciones}
            setObjeciones={setObjeciones}
            showToast={showToast}
          />
        );
      case "conversacion":
        return (
          <ConversacionesSugeridasView
            config={config}
            setConfig={setConfig}
            showToast={showToast}
          />
        );
      case "aseguradoras":
        return (
          <AseguradorasView
            art={art}
            setArt={setArt}
            transito={transito}
            setTransito={setTransito}
            showToast={showToast}
          />
        );
      case "lesiones":
        return (
          <LesionesView
            lesiones={lesiones}
            setLesiones={setLesiones}
            showToast={showToast}
          />
        );
      case "prolegal":
        return <ProlegalView mapeo={mapeo} setMapeo={setMapeo} />;
      case "transito":
        return (
          <TransitoView
            aseguradorasTransito={transito}
            observaciones={observacionesTransito}
            setObservaciones={setObservacionesTransito}
            showToast={showToast}
          />
        );
      case "mapeo":
        return (
          <MapeoView mapeo={mapeo} setMapeo={setMapeo} showToast={showToast} />
        );
      case "plantillas":
        return <PlantillasView showToast={showToast} config={config} />;
      default:
        return (
          <div
            className="text-sm py-8 text-center"
            style={{ color: "var(--color-text-muted)" }}
          >
            Selecciona una sección
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[180px]">
          <SearchInput
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar en Utiles..."
          />
        </div>

        <div
          className="flex items-center gap-1"
          style={{
            backgroundColor: "var(--color-surface)",
            borderRadius: "6px",
            padding: "2px",
          }}
        >
          <button
            onClick={() => setVistaTabs("grid")}
            className={`p-1.5 rounded transition-colors ${
              vistaTabs === "grid"
                ? "bg-[var(--color-accent)] text-[var(--color-text-on-accent)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setVistaTabs("list")}
            className={`p-1.5 rounded transition-colors ${
              vistaTabs === "list"
                ? "bg-[var(--color-accent)] text-[var(--color-text-on-accent)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      <SubPills
        items={tabsFiltrados.map(([k, label, Icon]) => {
          const badge = getBadge(k);
          return { id: k, label, icon: Icon, badge: badge > 0 ? badge : undefined };
        })}
        active={subvista}
        onSelect={setSubvista}
        ariaLabel="Secciones de Útiles"
        className={vistaTabs === "list" ? "flex-col items-stretch" : ""}
        itemClassName={vistaTabs === "list" ? "w-full justify-between" : ""}
      />
      {tabsFiltrados.length === 0 && (
        <div
          className="text-sm py-4"
          style={{ color: "var(--color-text-muted)" }}
        >
          No hay secciones que coincidan con la búsqueda.
        </div>
      )}

      <SectionHeader
        icon={TAB_DEFS[subvista]?.icon}
        titulo={TAB_DEFS[subvista]?.label || "Útiles"}
        descripcion={TAB_DESC[subvista] || ""}
        storageKey="utiles"
      />

      <div
        className="rounded-xl p-4"
        style={{
          backgroundColor: "var(--color-surface2)",
          border: "1px solid var(--color-border)",
          minHeight: 200,
        }}
      >
        {renderContenido()}
      </div>
    </div>
  );
}
