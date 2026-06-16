import { useState, useEffect } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

export const ThemeToggle = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  const [theme, setTheme] = useState<"light" | "dark" | "system">(() => {
    return (localStorage.getItem("hdsb_theme") as "light" | "dark" | "system") || "system";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }

    localStorage.setItem("hdsb_theme", theme);
  }, [theme]);

  // Listen for system theme changes if "system" is selected
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(mediaQuery.matches ? "dark" : "light");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-full transition-colors focus:outline-none"
        title="Choose theme"
      >
        <Sun className="h-5 w-5 dark:hidden" />
        <Moon className="hidden h-5 w-5 dark:block" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          
          <div className="absolute right-0 top-full mt-2 w-36 bg-background border border-border rounded-xl shadow-xl z-50 flex flex-col p-1.5 animate-in fade-in slide-in-from-top-2">
            <button onClick={() => { setTheme("light"); setIsOpen(false); }} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${theme === 'light' ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'}`}><Sun className="h-4 w-4" /> Light</button>
            <button onClick={() => { setTheme("dark"); setIsOpen(false); }} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${theme === 'dark' ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'}`}><Moon className="h-4 w-4" /> Dark</button>
            <button onClick={() => { setTheme("system"); setIsOpen(false); }} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${theme === 'system' ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'}`}><Monitor className="h-4 w-4" /> System</button>
          </div>
        </>
      )}
    </div>
  );
};