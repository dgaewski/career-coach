import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function readTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

/**
 * Subscribes to `data-theme` attribute changes on <html> via MutationObserver.
 * Returns "light" | "dark" and updates reactively on theme toggle.
 * Safe in jsdom (MutationObserver guard).
 */
export function useHtmlTheme(): Theme {
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    if (typeof MutationObserver === "undefined") return;
    const el = document.documentElement;
    const obs = new MutationObserver(() => setTheme(readTheme()));
    obs.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
    // sync in case it changed between render and effect
    setTheme(readTheme());
    return () => obs.disconnect();
  }, []);

  return theme;
}
