import React, { useState, useMemo, useEffect } from "react";
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
  Wrench,
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
import useAppStore from '../../core/store/useAppStore';
import { NavDock, SubPills } from "../common/UINav";
import { SectionHeader } from "../configuracion/ui";
import { getAllTemplates } from "../../features/templates/templatesStore";
// 1.9.6: el badge cuenta las categorías configuradas en config (antes eran
// las 4 hardcodeadas) y aplica el mismo fallback de plantillas que la vista.
import { contarMensajesConversacion } from "../../utils/conversaciones";

const GRUPOS_UTILES = [
  {
    id: "textos",
    label: "Textos",
    icon: MessageSquare,
    items: ["speechs", "objeciones", "conversacion", "pasos"],
  },
  {
    id: "directorios",
    label: "Directorios",
    icon: Building2,
    items: ["aseguradoras", "mapeo", "lesiones", "transito", "prolegal"],
  },
  {
    id: "otros",
    label: "Otros",
    icon: Wrench,
    items: ["condicionales", "plantillas"],
  },
];

const grupoDeTab = (key) => {
  const grupo = GRUPOS_UTILES.find((g) => g.items.includes(key));
  return grupo ? grupo.id : "otros";
};

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
  speechsInteractivos,
  setSpeechsInteractivos,
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
  const [subvista, setSubvista] = useState("speechs");
  const [plantillasCount, setPlantillasCount] = useState(0);

  useEffect(() => {
    let vivo = true;
    getAllTemplates()
      .then((lista) => {
        if (vivo) setPlantillasCount(Array.isArray(lista) ? lista.length : 0);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [subvista]);

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
    condicionales: "Reglas de ingreso y condiciones por estudio jurídico y aseguradora.",
    pasos: "Secuencia operativa paso a paso con tips y enlaces de utilidad.",
    speechs: "Libretos de comunicación y recorridos interactivos paso a paso.",
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
  const itemsDeGrupo = (grupoId) =>
    tabs.filter(([k]) => grupoDeTab(k) === grupoId);
  const grupoActivo = grupoDeTab(subvista);
  const cambiarGrupo = (grupoId) => {
    if (grupoId === grupoActivo) return;
    const items = itemsDeGrupo(grupoId);
    if (items.length) setSubvista(items[0][0]);
  };
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
      case "conversacion":
        return contarMensajesConversacion(config);
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
        return (mapeo || []).filter(
          (m) => (m.cargaProlegal || "").trim() || (m.entrevistador || "").trim()
        ).length;
      case "plantillas":
        return plantillasCount;
      default:
        return 0;
    }
  };

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
            speechsInteractivos={speechsInteractivos}
            setSpeechsInteractivos={setSpeechsInteractivos}
            showToast={showToast}
            objeciones={objeciones}
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
      <NavDock
        items={GRUPOS_UTILES.map((g) => ({
          id: g.id,
          label: g.label,
          icon: g.icon,
        }))}
        active={grupoActivo}
        onSelect={cambiarGrupo}
        ariaLabel="Grupos de Útiles"
      />

      <div
        className="rounded-xl p-4"
        style={{
          backgroundColor: "var(--color-surface2)",
          border: "1px solid var(--color-border)",
          minHeight: 200,
        }}
      >
        <SubPills
          items={itemsDeGrupo(grupoActivo).map(([k, label, Icon]) => {
            const badge = getBadge(k);
            return {
              id: k,
              label,
              icon: Icon,
              badge: badge > 0 ? badge : undefined,
            };
          })}
          active={subvista}
          onSelect={setSubvista}
          ariaLabel="Secciones de Útiles"
          className="mb-4 pb-3"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        />

        <SectionHeader
          icon={TAB_DEFS[subvista]?.icon}
          titulo={TAB_DEFS[subvista]?.label || "Útiles"}
          descripcion={TAB_DESC[subvista] || ""}
          storageKey="utiles"
        />

        {renderContenido()}
      </div>
    </div>
  );
}
