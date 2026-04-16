import { create } from "zustand";
import { Language } from "@shared/types/domain";

type I18nState = {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (en: string, es?: string) => string;
};

const defaultLang = (localStorage.getItem("lang") as Language | null) ?? "es";

export const useI18nStore = create<I18nState>((set, get) => ({
  lang: defaultLang,
  setLang: (lang) => {
    localStorage.setItem("lang", lang);
    set({ lang });
  },
  t: (en, es) => (get().lang === "es" ? es ?? en : en)
}));
