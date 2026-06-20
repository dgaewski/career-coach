import { describe, it, expect } from "vitest";
import { renderPage } from "../src/render.js";

describe("renderPage", () => {
  it("renders markdown to HTML", () => {
    const html = renderPage("# Title\n\nSome **bold** text.");
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<strong>bold</strong>");
  });
  it("rewrites wikilinks to dashboard page routes", () => {
    const html = renderPage("See [[Acme — Robot Dev]] and [[Skill Cloud]].");
    expect(html).toContain(`<a href="/page/${encodeURIComponent("Acme — Robot Dev")}" class="wikilink">Acme — Robot Dev</a>`);
    expect(html).toContain(`<a href="/page/${encodeURIComponent("Skill Cloud")}" class="wikilink">Skill Cloud</a>`);
  });
  it("escapes raw HTML in source markdown", () => {
    const html = renderPage("hello <script>alert(1)</script>");
    expect(html).not.toContain("<script>");
  });

  it("blocks javascript: href — output must not contain javascript: scheme", () => {
    const html = renderPage("[click](javascript:alert(1))");
    expect(html).not.toContain("javascript:");
  });

  it("blocks javascript: in image src too — degrades to alt text, no scheme leaks", () => {
    const html = renderPage("![x](javascript:alert(1))");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("<img");
  });

  it("does not double-escape ampersands inside fenced code blocks", () => {
    const html = renderPage("```\na & b\n```");
    expect(html).toContain("a &amp; b");
    expect(html).not.toContain("a &amp;amp; b");
  });

  it("escapes HTML-injection in wikilink names", () => {
    const html = renderPage("[[<img src=x onerror=alert(1)>]]");
    expect(html).not.toContain("<img");
  });

  it("handles ampersand in wikilink names without double-encoding", () => {
    const html = renderPage("[[Johnson & Johnson]]");
    expect(html).toContain('href="/page/Johnson%20%26%20Johnson"');
    expect(html).toContain("Johnson &amp; Johnson");
    expect(html).not.toContain("%26amp%3B");
    expect(html).not.toContain("&amp;amp;");
  });

  it("does not rewrite wikilinks inside fenced code blocks", () => {
    const html = renderPage("```\n[[SomeLink]]\n```");
    expect(html).not.toContain('<a');
    expect(html).toContain("[[SomeLink]]");
  });

  it("does not rewrite wikilinks inside inline code", () => {
    const html = renderPage("`[[SomeLink]]`");
    expect(html).not.toContain('<a');
    expect(html).toContain("[[SomeLink]]");
  });

  it("trims padding spaces in wikilink names", () => {
    const html = renderPage("[[ Spaced ]]");
    expect(html).toContain('href="/page/Spaced"');
    expect(html).toContain('class="wikilink">Spaced</a>');
  });

  it("does not inject anchor tags into link title attributes", () => {
    const html = renderPage('[x](https://foo.com "[[Page]]")');
    // The title attribute must not contain a raw <a> tag inside it
    expect(html).not.toMatch(/title="[^"]*<a/);
    // The title value should be present (either as [[Page]] or escaped equivalent)
    expect(html).toMatch(/title="(\[\[Page\]\]|&amp;amp;|\[\[Page\]\]|.*Page.*)"/)
  });

  it("blocks unsafe image srcs but keeps safe ones", () => {
    const bad = renderPage("![x](javascript:alert(1))");
    expect(bad).not.toContain("<img");
    expect(bad).not.toContain("javascript:");
    const good = renderPage("![logo](https://ok.com/a.png)");
    expect(good).toContain('<img src="https://ok.com/a.png"');
  });
});
