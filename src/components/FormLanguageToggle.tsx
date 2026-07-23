import { useState } from "react";
import { Check, Languages } from "lucide-react";
import { useFormLanguage, type FormLanguage } from "@/contexts/FormLanguageContext";

const options: Array<{ value: FormLanguage; label: string; shortLabel: string }> = [
  { value: "en", label: "English", shortLabel: "EN" },
  { value: "ms", label: "Bahasa Melayu", shortLabel: "BM" },
];

export const FormLanguageToggle = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { language, setLanguage } = useFormLanguage();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(current => !current)}
        className="relative flex h-9 items-center gap-1.5 rounded-full px-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none"
        title="Choose form language"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <Languages className="h-5 w-5" />
        <span className="text-[10px] font-bold">{language === "ms" ? "BM" : "EN"}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div role="menu" className="absolute right-0 top-full z-50 mt-2 flex w-48 flex-col rounded-xl border border-border bg-background p-1.5 shadow-xl animate-in fade-in slide-in-from-top-2">
            <p className="px-3 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Form language</p>
            {options.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => { setLanguage(option.value); setIsOpen(false); }}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${language === option.value ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"}`}
              >
                <span className="w-6 text-xs font-bold">{option.shortLabel}</span>
                <span className="flex-1">{option.label}</span>
                {language === option.value && <Check className="h-4 w-4" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
