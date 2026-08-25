import React, { useState, useEffect, useMemo } from "react";
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
import { TextInput } from "../common/TextInput";
import useAppStore from '../../core/store/useAppStore';

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
  const [subvista, setSubvista] = useState(() => {
    const saved = localStorage.getItem("utiles-tab-activa");
    const validos = [
      "condicionales", "pasos", "speechs", "objeciones", "conversacion",
      "aseguradoras", "lesiones", "prolegal", "transito", "mapeo",
    ];
    return validos.includes(saved) ? saved : "condicionales";
  });
  const [busqueda, setBusqueda] = useState("");
  const [vistaTabs, setVistaTabs] = useState("grid");

  useEffect(() => {
    localStorage.setItem("utiles-tab-activa", subvista);
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
        <div className="relative flex-1 min-w-[180px]">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2"
            style={{ color: "var(--color-text-muted)" }}
          />
          <TextInput
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar en Utiles..."
            className="pl-8"
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
                ? "bg-[var(--color-accent)] text-[#14181F]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setVistaTabs("list")}
            className={`p-1.5 rounded transition-colors ${
              vistaTabs === "list"
                ? "bg-[var(--color-accent)] text-[#14181F]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      <div
        className={`flex gap-1 flex-wrap ${
          vistaTabs === "list" ? "flex-col" : ""
        }`}
      >
        {tabsFiltrados.map(([k, label, Icon]) => {
          const badge = getBadge(k);
          const isActive = subvista === k;
          const badgeColor =
            badge > 0 ? "var(--color-accent)" : "var(--color-text-muted)";

          return (
            <button
              key={k}
              onClick={() => setSubvista(k)}
              className={`category-tab ${isActive ? "active" : ""} ${
                vistaTabs === "list" ? "w-full justify-between" : ""
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Icon size={13} />
                {label}
              </span>
              {badge > 0 && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : `${badgeColor}22`,
                    color: isActive ? '#14181F' : badgeColor,
                  }}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
        {tabsFiltrados.length === 0 && (
          <div
            className="text-sm py-4"
            style={{ color: "var(--color-text-muted)" }}
          >
            No hay secciones que coincidan con la búsqueda.
          </div>
        )}
      </div>

      <div
        className="rounded-lg p-4"
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
