import { Marked, type Tokens } from "marked";
import type { TokenizerAndRendererExtension } from "marked";

/** Escape &, <, > for safe HTML injection. */
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Return true when the href scheme is safe for use in an anchor. */
function isSafeHref(href: string): boolean {
  // A colon before the first slash signals a scheme. Check it's a safe one.
  const schemeMatch = /^([a-z][a-z0-9+\-.]*):/.exec(href.trim().toLowerCase());
  if (schemeMatch) {
    const scheme = schemeMatch[1];
    return scheme === "http" || scheme === "https" || scheme === "mailto";
  }
  // No scheme — relative, /, or # URL — safe.
  return true;
}

/**
 * Inline extension for [[Wikilink]] syntax.
 * Handled at the token level so:
 *  - Raw source text is used (no entity-encoding artifacts from marked's HTML pass).
 *  - Wikilinks inside code spans / fenced code blocks are never reached (marked
 *    tokenizes those before running inline extensions).
 *  - Wikilinks inside attribute values are never reached (they're inside link tokens).
 */
const wikilinkExtension: TokenizerAndRendererExtension = {
  name: "wikilink",
  level: "inline" as const,
  start(src: string): number | void {
    const idx = src.indexOf("[[");
    return idx === -1 ? undefined : idx;
  },
  tokenizer(src: string): Tokens.Generic | undefined {
    const match = /^\[\[([^\]]+)\]\]/.exec(src);
    if (!match) return undefined;
    const token: Tokens.Generic = {
      type: "wikilink",
      raw: match[0],
      name: match[1].trim(),
    };
    return token;
  },
  renderer(token: Tokens.Generic): string {
    const name = token["name"] as string;
    return `<a href="/page/${encodeURIComponent(name)}" class="wikilink">${escapeHtml(name)}</a>`;
  },
};

const marked = new Marked({ gfm: true, breaks: false });

marked.use({
  extensions: [wikilinkExtension],

  renderer: {
    // Escape raw HTML tokens (block and inline) to neutralize injected markup.
    // This covers <script>, <img onerror=...>, etc. in the source markdown.
    html({ text }: Tokens.HTML | Tokens.Tag): string {
      return escapeHtml(text);
    },

    // Block unsafe URI schemes in link hrefs.
    link({ href, title, tokens }: Tokens.Link): string {
      const safeHref = isSafeHref(href) ? href : "#blocked";
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
      const innerText = this.parser.parseInline(tokens);
      return `<a href="${safeHref}"${titleAttr}>${innerText}</a>`;
    },

    // Same scheme policy as links; unsafe srcs degrade to the alt text.
    image({ href, title, text }: Tokens.Image): string {
      if (!isSafeHref(href)) return escapeHtml(text);
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
      return `<img src="${href}" alt="${escapeHtml(text)}"${titleAttr}>`;
    },
  },
});

/** Render wiki markdown to HTML. [[Wikilinks]] become /page/<name> anchors; raw HTML is escaped. */
export function renderPage(markdown: string): string {
  // Pass markdown directly — no pre-escaping.
  // The html renderer override handles raw HTML tokens.
  // Wikilinks are handled by the inline extension at token level.
  return marked.parse(markdown, { async: false }) as string;
}

/**
 * Split a job body into the synthesized part and the verbatim posting section.
 * The "## Posting (verbatim)" heading is dropped from both outputs; the dashboard
 * renders its own labeled, collapsible container for the posting.
 */
export function splitVerbatim(markdown: string): { body: string; posting: string | null } {
  const m = markdown.match(/^##[ \t]+Posting \(verbatim\)[ \t]*$/m);
  if (!m || m.index === undefined) return { body: markdown, posting: null };
  const body = markdown.slice(0, m.index).trimEnd();
  const posting = markdown.slice(m.index + m[0].length).trim();
  return { body, posting: posting || null };
}
