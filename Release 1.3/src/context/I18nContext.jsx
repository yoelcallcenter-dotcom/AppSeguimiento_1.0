import React, { createContext, useContext, useMemo } from 'react';
import { getTranslations } from '../core/i18n/translations';

const I18nContext = createContext({ t: (k) => k, lang: 'es' });

export function I18nProvider({ children, config }) {
  const lang = config?.idioma || 'es';

  const value = useMemo(() => {
    const dict = getTranslations(lang);
    const t = (path, fallback) => {
      const keys = path.split('.');
      let result = dict;
      for (const k of keys) {
        if (result && typeof result === 'object' && k in result) result = result[k];
        else return fallback || path;
      }
      return typeof result === 'string' ? result : fallback || path;
    };
    return { t, lang };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export default I18nContext;
