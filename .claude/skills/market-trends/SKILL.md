---
name: market-trends
description: Research the broad job market for each of your tracks (demand, salary, skills, who's hiring, outlook) and build/refresh your Market Trends page. Run it periodically as the market shifts.
disable-model-invocation: true
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, WebSearch, WebFetch
---

You are building (or refreshing) this person's **Market Trends** page: broad, externally-sourced market research on each of their target tracks. Unlike `/find-jobs` (which ingests specific postings) this is *separate market research from real articles and reports* — it answers "how healthy is each of my fields right now, and where should I focus?"

Read `CLAUDE.md` first for the **Market Trends page schema** and conventions.

## 1. Load calibration + context
- Read `USER.md` for `tracks` (research one entry per track), `geo-zones`, and `level-band`.
- Read `coach/Profile.md` and `data/gap.json` (top skill gaps) — you'll use these to write each track's honest **"your position"** line.
- `grep '^slug:' skills/*.md` to get the exact skill slugs; only use real slugs in `coreSkills`/`emergingSkills`/`fadingSkills` (the dashboard links chips by slug). Read `data/jobs.json` to know which `companies/` pages exist (for `hiringCompanies`).

## 2. Research each track (real sources only)
For each track, web-search the broad **2026** market: demand level + trajectory (rising / steady / cooling), growth outlook, salary by level, skills on the rise vs. cooling, who's hiring (sectors + notable companies), and the headwinds/tailwinds behind the trajectory. **Use real articles/reports** (BLS, industry reports, reputable trade press) — capture each URL and **WebFetch-verify it's live and on-topic before citing**. Put a hard number in `growthNote`/`snapshot` **only where a real source provides it**, with a `[n]` footnote marker. Never fabricate figures or a precision the sources don't support.

## 3. Write the page
Write `coach/Market Trends.md` with the `market:` frontmatter block (one entry per track) + a top-level `researched:` date and global `sources:`, per the schema in `CLAUDE.md`. Each track's **`yourFit`** is your synthesis from the profile + gap analysis (specific: skills they have vs. the one real gap, and the pipeline impact). **Preserve any existing `## Notes` section** in the body — never overwrite the user's notes. If the file already exists, refresh the data and bump `researched:`/`updated:`.

## 4. Wrap up
- Add the page to `index.md` if it's not already listed; append a `market-trends YYYY-MM-DD` line to `log.md`.
- Run `npm run index` in `tools/` and confirm it stays clean (no new warnings/errors — this page is authored, not scored). The running dashboard hot-reloads, so the **Market Trends** tab fills in.
- Report: tracks researched, source count, and 2–3 notable cross-track findings (e.g. "AI/ML pays most but is most competitive; EE/Hardware is steadier and where your fit is strongest").

**Scaling:** with many tracks, parallelize like the ingest batch — dispatch one research subagent per track (returning the structured fields + WebFetch-verified sources), then compose the single page yourself to avoid file collisions. Tell the user up front this is web-research-heavy and takes a few minutes.
