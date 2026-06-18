import { useCallback, useEffect, useState } from "react";

type Theme = "light" | "dark";

export function useTheme(): { theme: Theme; toggle(): void } {
  const [theme, setTheme] = useState<Theme>(() =>
    (typeof localStorage !== "undefined" && localStorage.getItem("cc-theme") === "dark") ? "dark" : "light");
  useEffect(() => {
    if (theme === "dark") document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
    try { localStorage.setItem("cc-theme", theme); } catch { /* ignore */ }
  }, [theme]);
  const toggle = useCallback(() => setTheme(t => (t === "dark" ? "light" : "dark")), []);
  return { theme, toggle };
}
