import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { LandingLanguage, LandingTranslationStructure } from '../i18n/types';
import { translations } from '../i18n/translations';

interface LandingI18nContextType {
  language: LandingLanguage;
  setLanguage: (lang: LandingLanguage) => void;
  dir: 'ltr' | 'rtl';
  t: LandingTranslationStructure;
}

const LandingI18nContext = createContext<LandingI18nContextType | undefined>(undefined);

const STORAGE_KEY = 'transivo_landing_lang';

export function LandingI18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LandingLanguage>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'fr' || saved === 'en' || saved === 'ar') {
        return saved;
      }
    } catch {
      // Ignore
    }
    return 'fr';
  });

  const dir: 'ltr' | 'rtl' = language === 'ar' ? 'rtl' : 'ltr';
  const t = translations[language] || translations.fr;

  const setLanguage = (lang: LandingLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    const prevLang = document.documentElement.lang;
    const prevDir = document.documentElement.dir;

    document.documentElement.lang = language;
    document.documentElement.dir = dir;

    return () => {
      document.documentElement.lang = prevLang || 'fr';
      document.documentElement.dir = prevDir || 'ltr';
    };
  }, [language, dir]);

  return (
    <LandingI18nContext.Provider value={{ language, setLanguage, dir, t }}>
      {children}
    </LandingI18nContext.Provider>
  );
}

export function useLandingI18n() {
  const context = useContext(LandingI18nContext);
  if (!context) {
    throw new Error('useLandingI18n must be used within a LandingI18nProvider');
  }
  return context;
}
