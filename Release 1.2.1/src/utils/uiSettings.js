const STORAGE_KEY = "app_ui_settings";

const DEFAULTS = {
  easterEggsEnabled: true,
};

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

function write(patch) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...read(), ...patch }));
  } catch {
    /* storage no disponible */
  }
}

export function getUiSettings() {
  return read();
}

export function saveUiSettings(patch) {
  write(patch);
  return getUiSettings();
}

/** Validación global: flag de build + preferencia del usuario. */
export function isEasterEggsEnabled() {
  return process.env.REACT_APP_EASTER_EGGS === "true" && read().easterEggsEnabled !== false;
}
