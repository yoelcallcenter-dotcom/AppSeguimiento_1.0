import React from "react";
import {
  WifiOff,
  Database,
  AlertTriangle,
  HardDrive,
  Info,
  X,
} from "lucide-react";
import useSystemStatus from "../../core/status/systemStatusStore";

const STORAGE_BANNER_KEY = "seg-art:storage-banner-dismissed-at";
const DISMISS_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

function isStorageBannerDismissed() {
  try {
    const raw = localStorage.getItem(STORAGE_BANNER_KEY);
    if (!raw) return false;
    return Date.now() - parseInt(raw, 10) < DISMISS_WINDOW_MS;
  } catch {
    return false;
  }
}

export function SystemStatusBanner() {
  const online = useSystemStatus((s) => s.online);
  const storagePersisted = useSystemStatus((s) => s.storagePersisted);
  const usagePct = useSystemStatus((s) => s.storageUsagePct);
  const dbAvailable = useSystemStatus((s) => s.dbAvailable);
  const lastQuotaErrorAt = useSystemStatus((s) => s.lastQuotaErrorAt);
  const schemaDowngrade = useSystemStatus((s) => s.schemaDowngrade);
  const [dismissedQuota, setDismissedQuota] = React.useState(false);
  const [dismissedStorage, setDismissedStorage] = React.useState(isStorageBannerDismissed);

  const dismissStorageBanner = () => {
    try {
      localStorage.setItem(STORAGE_BANNER_KEY, String(Date.now()));
    } catch {}
    setDismissedStorage(true);
  };

  const banners = [];

  if (schemaDowngrade) {
    banners.push({
      type: "error",
      icon: AlertTriangle,
      title: "Versión de datos más reciente",
      message:
        "Los datos fueron creados con una versión más nueva de la aplicación. Actualizá la app para poder accederlos; hasta entonces se pueden perder cambios.",
    });
  }

  if (!dbAvailable) {
    banners.push({
      type: "error",
      icon: Database,
      title: "Almacenamiento no disponible",
      message:
        "El navegador bloqueó IndexedDB (modo privado o permisos). No se pueden guardar cambios. Usá un navegador con almacenamiento habilitado.",
    });
  }

  if (!online) {
    banners.push({
      type: "warning",
      icon: WifiOff,
      title: "Sin conexión a internet",
      message:
        "La app sigue funcionando con datos locales. Los cambios se guardan en este dispositivo.",
    });
  }

  if (storagePersisted === false && !dismissedStorage) {
    banners.push({
      type: "info",
      icon: Info,
      title: "Almacenamiento no persistente",
      message:
        "El navegador podría liberar espacio en algún momento. Exportá backups periódicos desde Configuración.",
      onDismiss: dismissStorageBanner,
    });
  }

  if (usagePct !== null && usagePct > 80 && !dismissedQuota) {
    banners.push({
      type: "warning",
      icon: HardDrive,
      title: `Almacenamiento al ${usagePct}%`,
      message:
        "Se está acercando al límite de espacio del navegador. Exportá un backup desde Configuración para proteger tus datos.",
      onDismiss: () => setDismissedQuota(true),
    });
  }

  if (lastQuotaErrorAt > 0 && !dismissedQuota) {
    banners.push({
      type: "error",
      icon: AlertTriangle,
      title: "Error de almacenamiento",
      message:
        "Hubo un problema al guardar datos: no hay espacio suficiente. Exportá un backup pronto.",
      onDismiss: () => setDismissedQuota(true),
    });
  }

  if (banners.length === 0) return null;

  const styleMap = {
    warning: { color: "var(--color-warning)", bg: "var(--color-warning)11" },
    error: { color: "var(--color-danger)", bg: "var(--color-danger)11" },
    info: { color: "var(--color-primary)", bg: "var(--color-primary)11" },
  };

  return (
    <div className="space-y-2 mb-3">
      {banners.map((b, i) => {
        const Icon = b.icon;
        const style = styleMap[b.type] || styleMap.info;
        return (
          <div
            key={i}
            className="flex items-start gap-3 px-4 py-2.5 rounded-lg border"
            style={{ backgroundColor: style.bg, borderColor: style.color }}
            role="alert"
          >
            <Icon size={16} color={style.color} className="mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
                {b.title}
              </div>
              <div className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                {b.message}
              </div>
            </div>
            {b.onDismiss && (
              <button
                onClick={b.onDismiss}
                className="flex-shrink-0 hover:opacity-70 transition-opacity"
                style={{ color: "var(--color-text-muted)" }}
                aria-label="Descartar"
              >
                <X size={14} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function StoragePersistedIndicator() {
  const storagePersisted = useSystemStatus((s) => s.storagePersisted);
  if (storagePersisted === null || storagePersisted) return null;
  return (
    <div
      className="flex items-center gap-2 text-xs rounded-lg px-3 py-2"
      style={{ backgroundColor: "var(--color-warning)11", border: "1px solid var(--color-warning)" }}
      role="alert"
    >
      <Info size={14} color="var(--color-warning)" />
      <span style={{ color: "var(--color-text-muted)" }}>
        El navegador no garantiza el almacenamiento persistente. Exportá backups
        periódicos para no perder tus datos.
      </span>
    </div>
  );
}
