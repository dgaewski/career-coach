---
name: setup
description: One-time onboarding — installs dependencies, reads your résumé, calibrates your search (writes USER.md + profile), builds your first dashboard, and offers a private backup. Run this first in a fresh instance.
disable-model-invocation: true
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

You are running the one-time **setup** for this person's Career Coach instance. Walk them through it conversationally — they may be a non-developer. Do the work yourself with your tools; they answer questions and watch. Be warm, brief, and concrete. Do the five phases in order. This command is safe to re-run — adapt if something is already done.

Read `CLAUDE.md` first for the page schemas (job / skill / company / profile / `USER.md`) before writing any wiki page.

## Phase 0 — Check the instance & install dependencies
1. Read `USER.md`. If its `name:` is already filled in (not empty), this instance is **already set up**. Tell them so and ask whether to **reconfigure** (continue and update their answers) or **stop**. Never overwrite their data without asking.
2. Confirm the toolchain: run `node --version` and `npm --version`. If Node is missing, explain they need to install Node.js (https://nodejs.org) and stop here — the rest needs it.
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

## Phase 3 — Build your dashboard
1. Run `npm run index` in `tools/`. Summarize the result plainly (a fresh instance shows 0 roles — that's expected).
2. Tell them how to open the dashboard: run `npm run coach` in `tools/`, then open **http://localhost:4280** in a browser. Offer to start it for them in the background; otherwise give them the one command.
3. Point them at the next step: "Run `/find-jobs` to start finding roles."

## Phase 4 — Connect to GitHub (updates + optional backup)
First, **wire engine updates.** Run `git remote -v`:
- If an `origin` remote exists **and there is no `upstream` yet**, this instance was **cloned from the public template** — rename it so `/update` can pull future engine improvements from it: `git remote rename origin upstream`. (If there's no `origin` — e.g. they downloaded a ZIP — skip this; `/update` can wire it later.)

Then **offer an optional private backup** of their data. Be explicit: *"This repo holds your personal career data. I'll create it **private** — it must never be public."*
1. Check `gh` is installed and authenticated (`gh auth status`). If not, either guide them through `gh auth login` (they do the browser step) or skip the backup and tell them they can run `/backup` anytime later.
2. Before any commit, confirm `.gitignore` lists `raw-sources/` and `data/` (it should). Never commit `raw-sources/`.
3. Create the **private** repo and set it as `origin`: `gh repo create <name> --private --source=. --remote=origin --push`. (You moved any cloned `origin` to `upstream` above, so `origin` is free for their backup.)
4. The backup is optional; skipping it still leaves a fully working local instance — and `upstream` is already wired for `/update`.

## Wrap up
Tell them what's ready (the dashboard URL; that their profile and calibration are saved) and the two commands they'll use next: `/find-jobs` to find roles, `/coach` for guidance. Keep it short and encouraging.
