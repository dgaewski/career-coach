# Career Coach

*A personal career-intelligence platform in the [Karpathy LLM-wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f). You own your data; Claude maintains the wiki.*

Two stacked purposes:

1. **Job-market intelligence** — real job postings ingested as structured markdown, with fit scores, skill demand, momentum, and a map all derived automatically.
2. **Career coaching** — your profile, a skill-gap analysis against live market demand, a portfolio roadmap, application tracking, and a researched advice library.

It runs entirely inside [Claude Code](https://claude.com/claude-code) — a set of slash commands drives an LLM over a deterministic engine. You answer questions and watch.

## Getting started (no terminal experience needed)

1. **Install Claude Code** — follow the instructions at claude.com/claude-code.
2. **Get this repo — clone it, don't *fork* it.** Let Claude clone it for you (or `git clone` it). ⚠️ **Do not use GitHub's "Fork" button** — a fork is **public**, and your career data must stay **private**. Cloning gives you a private local copy; `/setup` later creates your *own* private backup repo. (A ZIP download also works, but cloning is better — it keeps the link that lets `/update` pull future improvements.)
3. **Open the folder in Claude Code.**
4. **Type `/setup`.** The agent installs dependencies, reads your résumé, asks a few questions to calibrate your search, builds your first dashboard, and offers to create a private backup repo. That's it.

## Commands

| Command | What it does |
|---|---|
| `/setup` | One-time onboarding — writes your `USER.md` + profile, builds the first dashboard |
| `/find-jobs [scope] [count]` | Search real postings across your tracks/regions and ingest them |
| `/add-job <url\|text>` | Add one posting you paste in |
| `/coach` | A coaching session grounded in your profile + analytics |
| `/why <job>` | Why a role scored the way it did — your matching skills, gaps, and flags |
| `/compare <A> <B>` | Put 2–4 roles side by side to decide where to focus |
| `/market-trends` | Research the broad market for your tracks — demand, salary, top skills, who's hiring |
| `/update-resume` | Re-synthesize your profile from a new résumé |
| `/lint` | Consistency + freshness checks across your wiki |
| `/watch <category> <cadence>` | Schedule a recurring job search |
| `/status` | A plain-language "where am I" snapshot |
| `/backup` | Commit + push your data to your private repo |
| `/help` | List the commands in plain language |
| `/update` | Pull engine improvements from the template |

## How it works

- **Discovery + synthesis are LLM-driven** — finding live postings, judging fit, writing pages. Quality scales with the Claude model you use; use a capable model for `/find-jobs` and `/coach`.
- **Analysis is deterministic** — `npm run index` computes fit scores, skill-gap ROI, demand tiers, and the map. Same wiki content in → identical numbers out, for everyone.
- **`USER.md` is the one file you calibrate** — your name, tracks, regions, level band, and optional knobs (comp floor, work auth, career pivot…). Unset optional fields mean "no constraint", so a minimal `USER.md` works and precision is opt-in.

## What you get

A local dashboard at `http://localhost:4280` (`npm run coach` in `tools/`) with nine views: an **Overview** (pipeline + momentum), a **Morning Brief**, a **Coach** view with your skill-gap analysis and a weekly action plan, a sortable/filterable **Jobs** list, an application **Tracker**, a **Skills** explorer (market demand + your gaps), a **Companies** browser, a **Map** of openings, and a **Market Trends** view of per-track market research. Plus link-health checking and a private backup of everything.

## Privacy

Your instance is **private by default**. `raw-sources/` (your résumé PDF and raw posting text) is git-ignored and never leaves your machine. The backup step always creates a **private** repo. Generated output (`data/`) is git-ignored too — it's rebuilt by `npm run index`, so a fresh clone runs one index pass before the dashboard serves.

## Layout

- `CLAUDE.md` — the operating manual the LLM follows.
- `USER.md` — your calibration (the one file you own).
- `jobs/`, `companies/`, `skills/` — the job-market graph.
- `coach/` — profile, goals, gap analysis, projects, briefs, advice.
- `tools/` — the TypeScript indexer / server / dashboard (the engine; you don't edit it).
- `analytics/`, `data/` — machine-generated; never hand-edit.
- `raw-sources/` — local only (git-ignored): your résumé + raw postings.
- `examples/` — a small fictional demo instance to show the format.
