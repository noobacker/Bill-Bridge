"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { en } from "@/lib/i18n/locales/en";
import { hi } from "@/lib/i18n/locales/hi";
import { mr } from "@/lib/i18n/locales/mr";

export type Language = "en" | "hi" | "mr";

type Translations = Record<string, string>;

const translationsByLang: Record<Language, Translations> = {
  en,
  hi,
  mr,
};

interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  // Always use English
  const language: Language = "en";
  
  // No-op function since we don't support language changes
  const setLanguage = () => {
    // Language changing is disabled
  };

  const value = useMemo<I18nContextValue>(() => {
    const dictionary = translationsByLang[language];
    const t = (key: string) => {
      return dictionary[key] ?? key;
    };
    return { language, setLanguage, t };
  }, []);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}
