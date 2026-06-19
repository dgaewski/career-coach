---
name: setup
description: One-time onboarding — installs dependencies, reads your résumé, calibrates your search (writes USER.md + profile), finds your first roles, sets up your coach pages and dashboard, and offers a private backup. Run this first in a fresh instance.
disable-model-invocation: true
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, WebSearch, WebFetch
---

You are running the one-time **setup** for this person's Career Coach instance. Walk them through it conversationally — they may be a non-developer. Do the work yourself with your tools; they answer questions and watch. Be warm, brief, and concrete. Do the phases below in order. This command is safe to re-run — adapt if something is already done.

Read `CLAUDE.md` first for the page schemas (job / skill / company / profile / `USER.md`) and the workflows you'll use before writing any wiki page.

## Phase 0 — Check the instance & install dependencies
1. Read `USER.md`. If its `name:` is already filled in (not empty), this instance is **already set up**. Tell them so and ask whether to **reconfigure** (continue and update their answers) or **stop**. Never overwrite their data without asking.
2. Confirm the toolchain: run `node --version` and `npm --version`.
   - If **both** work, continue.
   - If Node/npm is **missing**, offer to install it for them — don't just send them away. Detect the platform and use its package manager **with their OK**:
     - **Windows:** `winget install OpenJS.NodeJS.LTS`
     - **macOS:** `brew install node` (if Homebrew is present), otherwise point them to https://nodejs.org
     - **Linux:** the distro's package manager (e.g. `sudo apt install nodejs npm`) or `nvm`
     Then re-check `node --version` / `npm --version`. Only if you genuinely can't install it, explain how to get Node.js from https://nodejs.org and stop here — the rest needs it.
3. Install dependencies: if `tools/node_modules` does not exist, run `npm install` in `tools/`. If it exists, skip it and say "dependencies already installed."

## Phase 1 — Read your résumé
1. Look in `raw-sources/` for a résumé — glob for `raw-sources/Resume *.pdf` or any PDF/text file there. If one is there, read it.
2. If none is there, offer three choices:
   - **Drop it in:** ask them to put their résumé file in the `raw-sources/` folder — the `raw-sources/` directory at the repo root, git-ignored so it stays on their machine — and tell you when it's there, then read it.
   - **Paste it:** ask them to paste the text; save it to `raw-sources/resume.txt` (this folder is git-ignored and never leaves their machine).
   - **No résumé:** interview them briefly — education, work history, key skills, projects.
3. From what you learn, write `coach/Profile.md` (a synthesized profile: experience summary, skills-with-evidence, a positioning line) following the `type: profile` schema in `CLAUDE.md`. For each real skill, create or update its `skills/<Skill>.md` page with `have: true` and an `evidence:` line. Never invent experience — use only what they told you.

## Phase 2 — Calibrate your search (writes USER.md)
If you read a résumé in Phase 1, **use it to propose answers** below — especially the tracks, plus a starting guess at level and the positioning line — and have them confirm or adjust. Don't make them start from a blank menu. Ask the **core** questions one or two at a time:
- **Name** — what should the coach call you?
- **Tracks** — the kinds of roles or fields they're targeting, written as **their own labels**. This is not a fixed menu — it works for any field. Propose tracks from their résumé and confirm, or just ask. Examples are illustrative and span fields: a software engineer might use `backend`, `ml`; a nurse `icu`, `er`; a designer `product-design`, `brand`.
- **Where** — your home city/metro, whether remote is OK, and any other metros or regions you'd consider. Turn this into `geo-zones` (their home metro as `home: true`, `remote`, plus any additional metros/regions they name).
- **Level** — entry, early, mid, or senior? (one or more.)

Write these into `USER.md` using the schema in `CLAUDE.md` and the comments already in `USER.md`. Keep a one-line positioning statement at the bottom.

Then offer an **optional** round (tell them they can skip any or all — "want to sharpen your results?"):
- minimum salary (`comp-floor`) and/or a target (`comp-target`)
- work authorization (`work-auth`) and clearance (`clearance`)
- which employment types (`employment-types`), work modes (`work-mode`), willingness to relocate (`relocate`)
- anything to never show you (`exclude`)
- a career pivot (`pivot: {from, into}`)

Write only the fields they answer. **Leave the rest out entirely** — the engine treats anything unset as "no constraint," so skipping is safe.

Finally, make sure `geo/places.json` exists; if it doesn't, create it containing just `{}`. (Your city list fills in automatically as you find jobs.)

## Phase 3 — Find your first roles (offered)
Run `npm run index` in `tools/` first so their calibration is loaded.

Then **offer** to find an initial batch of roles so their dashboard isn't empty: *"Want me to find some roles now? It takes a few minutes of web searching — or skip it and run `/find-jobs` whenever you like."* **Default to yes**, but let them skip.

If they say yes, run the **"Workflow: Ingest batch"** from `CLAUDE.md`, scoped to their `USER.md` (tracks × geo-zones × level × exclude), targeting a **small first batch (~10–15 real, live postings** — don't over-do the first run). Follow the same guardrails as `/find-jobs`: real postings only; WebFetch-verify each canonical URL is live; dedup; exact skill `slug:`s; add non-remote cities to `geo/places.json`; a non-empty `## Fit notes` per role. Create the job / company / skill pages, update `index.md` + `log.md`, then run `npm run index` and `npm run checklinks`.

If they already have specific postings in mind, ingest those too via the **"Workflow: Manual drop"** (preserve the raw text under `raw-sources/postings/` first).

If they skip, that's fine — the dashboard works empty and they can run `/find-jobs` anytime.

## Phase 4 — Set up your coach pages
Seed the coaching side so the Coach view is useful. (The **Skill Gap Analysis** regenerates automatically on every `npm run index` — if they ran a search above, it already has data.)
1. **Goals** — write `coach/Goals.md` (`type: coach`) from their résumé + calibration: where they are now, what they're targeting, and 2–4 concrete goals. A living draft they can refine in `/coach`.
2. **To-dos** — write `coach/To-dos.md` with a few starter career to-dos (e.g. tighten the résumé, close the top skill gap from the gap analysis, publish a portfolio piece). Use the dashboard's checkbox format: `- [ ] …`.
3. **Portfolio Roadmap** — if they ran a search (so gaps exist), draft `coach/Portfolio Roadmap.md` (`type: coach`) with 1–3 portfolio-project ideas that would close their top gaps; create and link any `coach/projects/*` pages you reference. (Skip if there's no gap data yet.)
4. **Advice (optional — offer):** offer to research 1–2 advice topics relevant to their field (e.g. interview prep, salary negotiation) into `coach/advice/<Topic>.md` (`type: advice` with `researched:` + `sources:`). This is slower — let them skip and do it later via `/coach`.

Add any new pages to `index.md`, log the session in `log.md`, and re-run `npm run index` if you wrote pages that affect the dashboard.

## Phase 5 — Open your dashboard
Tell them how to open it: run `npm run coach` in `tools/`, then open **http://localhost:4280** in a browser. Offer to start it for them in the background; otherwise give them the one command. If they ran a search, point out what's now live (roles on the map, the Morning Brief, the gap analysis, their goals); if they skipped, note it'll fill in once they run `/find-jobs`.

## Phase 6 — Connect to GitHub (updates + optional backup)
First, **wire engine updates.** Run `git remote -v`:
- If an `origin` remote exists **and there is no `upstream` yet**, this instance was **cloned from the public template** — rename it so `/update` can pull future engine improvements from it: `git remote rename origin upstream`. (If there's no `origin` — e.g. they downloaded a ZIP — skip this; `/update` can wire it later.)

Then **offer an optional private backup** of their data. Be explicit: *"This repo holds your personal career data. I'll create it **private** — it must never be public."*
1. Check `gh` is installed and authenticated (`gh auth status`). If not, either guide them through `gh auth login` (they do the browser step) or skip the backup and tell them they can run `/backup` anytime later.
2. Before any commit, confirm `.gitignore` lists `raw-sources/` and `data/` (it should). Never commit `raw-sources/`.
3. Create the **private** repo and set it as `origin`: `gh repo create <name> --private --source=. --remote=origin --push`. (You moved any cloned `origin` to `upstream` above, so `origin` is free for their backup.)
4. The backup is optional; skipping it still leaves a fully working local instance — and `upstream` is already wired for `/update`.

## Wrap up
Tell them what's ready (the dashboard URL; their profile, calibration, roles, and coach pages are saved) and the commands they'll use next: `/find-jobs` for more roles, `/coach` for guidance, `/status` for a snapshot, and `/why` / `/compare` to weigh roles. Keep it short and encouraging.
