---
name: enrich
description: Backfill richer info on existing job and company pages — verbatim posting text, application deadlines, and company description / HQ / founded / domain / logo. Sweeps everything missing, or target one company or job.
disable-model-invocation: true
argument-hint: "[company or job name, or empty to sweep all]"
allowed-tools: WebSearch, WebFetch, Read, Write, Edit, Glob, Grep, Bash
---

You are running **/enrich** for this person — filling in the richer fields that older pages predate. Be warm and brief; report plainly at the end.

First read `USER.md` and `CLAUDE.md` (the job + company page schemas, especially the `## Posting (verbatim)`, `deadline:`, `## About`, `domain:`, `founded:`, and `assets/logos/` conventions).

## Input (`$ARGUMENTS`)
- **a company name** (matches a `companies/*.md`) → enrich just that company.
- **a job name** (matches a `jobs/*.md`) → enrich just that job.
- **empty** → sweep all of `jobs/` and `companies/` for missing fields.

## What "missing" means
- **Company** lacks any of: `domain`, `founded`, `hq`, `size` (frontmatter); a `## About` section (body); a logo file at `assets/logos/<slug>.<ext>` (slug = page name lowercased, each run of non-alphanumeric characters replaced by a single hyphen, leading/trailing hyphens trimmed — e.g. `Pickle Robot` → `pickle-robot`, `H2O.ai` → `h2o-ai`).
- **Job** lacks: a `## Posting (verbatim)` section; optionally `deadline:` (only when the posting shows one).

## Fill the gaps
For each company with gaps, web-search the company and fill:
- A short **verbatim, sourced** description in `## About` (a blockquote + the source URL). Keep your synthesized `## What they do` separate.
- `hq`, `founded`, `size`, `domain` frontmatter from reliable sources (company site, Crunchbase, Wikipedia).
- **Logo** — download it to `assets/logos/<slug>.<ext>` with curl. Prefer a crisp source (the company's own site / press kit) when you can find a direct image URL:
  `curl -fsSL -o "assets/logos/<slug>.png" "<logo-url>"`
  Otherwise use the Google favicon service — reliable, returns the best size up to 256px (Clearbit's logo API is dead; DuckDuckGo/unavatar return unsupported `.ico`):
  `curl -fsSL -o "assets/logos/<slug>.png" "https://www.google.com/s2/favicons?domain=<domain>&sz=256"`
  Then verify with `file assets/logos/<slug>.*` — it must be a real image (not 0 bytes / HTML / `.ico`); if the bytes are actually JPEG or SVG, rename to the matching extension so the indexer's extension-glob resolves it. If even the favicon fails, leave the monogram and say so — never invent a logo. (Image bytes go to disk via `curl -o`, never into context — logos are cheap.)

For each job with gaps:
- WebFetch the `url:` and paste the substantive posting (role / responsibilities / requirements / about) into a new trailing `## Posting (verbatim)` section, lifted **verbatim** (no paraphrase or synthesized intro). **Trim** EEO, legal, benefits, and pay-transparency boilerplate. If the posting shows an application deadline, add `deadline: YYYY-MM-DD`.
- **Many ATS are JavaScript-rendered and unreadable by WebFetch** — Ashby (`jobs.ashbyhq.com`), Workday (`*.myworkdayjobs.com`), Lever, and Gem return an empty app shell with no posting text **even when the role is live**. Verbatim only lands on server-rendered hosts (company-native pages, Greenhouse-while-open, `amazon.jobs`, `ycombinator.com`, `careers.ll.mit.edu`); expect ~25–30% capture across a mixed corpus. When a fetch returns no posting text, don't fabricate — add a dated `## Red flags` note that it's JS-rendered / not machine-readable, and leave it for manual review.
- **Don't decide stale from WebFetch content, and don't hand-set `status:`.** A Greenhouse soft-404 still returns 200 (it redirects the closed listing to a `?error=true` board), and SPA shells look empty whether live or dead — so WebFetch is an unreliable liveness signal. Capture-or-note only; let the `npm run checklinks` gate (below) make the stale call centrally. If you must judge liveness yourself, use a redirect-following curl and check the *final* URL: redirected-away to a board / `?error=true` / 404 / 410 = closed; HTTP 200 with the URL unchanged = live (even if the body is an unreadable shell — never stale an SPA-200).

## Scaling a full sweep
A blank-argument sweep can be hundreds of pages. Pilot one agent to validate the edit pattern, then fan out with **Sonnet** subagents (the work is mechanical fact-find + quote-lift + frontmatter edit; Opus burns the session limit fast) in small waves (≈3 agents × ≈9 pages) so each flushes its writes before any limit cutoff. Have agents append the durable section (`## About` / `## Posting (verbatim)`) **before** bumping `updated:`, so a cutoff leaves each file fully-done-or-untouched (detect done-ness by content marker, not by `updated:`). Keep `npm run index`, `checklinks`, status reconciliation, and the commit central to the orchestrator; subagents touch only their partition and never run git/npm.

## Finish
- Run `npm run index` in `tools/`; resolve any new warnings/errors (a stray colon inside an `hq:`/`size:` value needs quoting).
- Run `npm run checklinks` and reconcile job `status:` from `data/links.json`: `dead`/`redirected` → `stale`; a job marked stale that checklinks reports `live` → revert to `active` (`unverified` = bot-blocked/transient, leave as-is). `checklinks` flags Greenhouse-style soft-404s as `redirected`. Never stale a job that already has a captured `## Posting (verbatim)` — it was live at capture.
- Report plainly: which pages were enriched, which fields were filled, and anything that couldn't be found (no logo, posting gone, JS-blocked, etc.).
