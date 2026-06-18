---
name: update-resume
description: Refresh your profile from a new résumé — it gets versioned, your profile is re-synthesized, your skills are reconciled, and the changes are summarized. Run this whenever your résumé changes.
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

You are running **/update-resume** for this person. Be warm and brief.

First read `CLAUDE.md` (the **"Workflow: Profile update"** section and the `type: profile` schema) and the current `coach/Profile.md` (to compare against).

## Find the new résumé
Look for it with a glob: `raw-sources/Resume *.pdf` (the versioned convention), or any new PDF/text in `raw-sources/`. If you can't find one, tell them the exact place to drop it — the `raw-sources/` folder at the repo root (git-ignored, it stays on their machine) — and wait, or offer to take pasted text.

## Run the Profile update workflow
Follow "Workflow: Profile update" in `CLAUDE.md`:
- **Version** the new résumé into `raw-sources/` as `Resume YYYY-MM.pdf` (never overwrite an older one).
- **Re-synthesize** `coach/Profile.md` (experience summary, skills-with-evidence, positioning) and bump its `resume-version` / `resume-date` frontmatter.
- **Summarize what changed** vs. the prior version (new roles, new skills, new dates) — tell the user plainly.
- **Reconcile skills:** mirror skill possession into `skills/*.md` `have:`/`evidence:` (add new skill pages as needed). Never invent experience — use only what the résumé shows.
- Log the delta in `log.md`.

## Finish
Run `npm run index` in `tools/` so scores reflect the new profile. Report what changed and any new strong fits or newly-closed gaps.
