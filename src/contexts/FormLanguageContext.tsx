import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type FormLanguage = "en" | "ms";

type FormLanguageContextValue = {
  language: FormLanguage;
  setLanguage: (language: FormLanguage) => void;
};

const FormLanguageContext = createContext<FormLanguageContextValue | null>(null);

export const FormLanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguage] = useState<FormLanguage>(() =>
    localStorage.getItem("hdsb_form_language") === "ms" ? "ms" : "en"
  );

  useEffect(() => {
    localStorage.setItem("hdsb_form_language", language);
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage }), [language]);

  return <FormLanguageContext.Provider value={value}>{children}</FormLanguageContext.Provider>;
};

export const useFormLanguage = () => {
  const context = useContext(FormLanguageContext);
  if (!context) throw new Error("useFormLanguage must be used within FormLanguageProvider");
  return context;
};
