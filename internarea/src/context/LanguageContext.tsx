import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { LanguageCode, TranslationKey, getTranslation, supportedLanguages } from "@/lib/translations";
import { useSelector } from "react-redux";
import { selectuser } from "@/Feature/Userslice";
import axios from "axios";
import { apiUrl } from "@/lib/api";

type LanguageContextValue = {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "internarea-language";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>("en");
  const user = useSelector(selectuser);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
    if (stored && supportedLanguages.some((item) => item.code === stored)) {
      setLanguageState(stored);
    }
  }, []);

  useEffect(() => {
    if (!user?.uid) return;

    const fetchUserLanguage = async () => {
      try {
        const response = await axios.get(apiUrl(`/language/${user.uid}`));
        if (response.data.success && response.data.language) {
          setLanguageState(response.data.language);
        }
      } catch (error) {
        console.error("Failed to fetch user language preference:", error);
      }
    };

    fetchUserLanguage();
  }, [user?.uid]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage: setLanguageState,
      t: (key: TranslationKey) => getTranslation(language, key),
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return context;
}
