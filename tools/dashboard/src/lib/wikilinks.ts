import type React from "react";

/** Intercept clicks on server-rendered wikilink anchors; route in-app instead of full reload. */
export function wikilinkClickHandler(navigate: (to: string) => void): (e: React.MouseEvent) => void {
  return (e) => {
    const a = (e.target as HTMLElement).closest?.("a.wikilink");
    if (!a) return;
    e.preventDefault();
    const href = a.getAttribute("href") ?? "";
    const name = decodeURIComponent(href.replace(/^\/page\//, ""));
    navigate(`/page/${encodeURIComponent(name)}`);
  };
}
