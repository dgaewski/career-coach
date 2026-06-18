---
name: help
description: List everything you can do here, in plain language. Run this if you're not sure which command to use.
disable-model-invocation: true
allowed-tools: Read
---

You are running **/help**. List the available commands in plain language, grouped, so the user can pick one. Keep it friendly and skimmable. Present this:

**Getting started**
- `/setup` — one-time onboarding: reads your résumé, calibrates your search, builds your first dashboard.

**Finding roles**
- `/find-jobs [scope] [count]` — find new postings across your tracks and regions (your main search loop). E.g. `/find-jobs robotics 10`.
- `/add-job <url|text>` — add a single posting you found yourself.
- `/watch <category> <cadence>` — schedule a recurring search, e.g. `/watch robotics weekly`.

**Understanding & deciding**
- `/status` — a quick snapshot of your pipeline, new fits, and top gaps.
- `/coach [topic]` — talk through strategy, priorities, gaps, applications, negotiation.

**Keeping things current**
- `/update-resume` — refresh your profile from a new résumé.
- `/lint` — health-check your wiki (contradictions, stale advice, broken links).
- `/backup` — save your data to your private GitHub repo.
- `/update` — pull the latest engine improvements from the template.

Then ask what they'd like to do, and offer a sensible next step based on whether they're new (suggest `/setup` or `/find-jobs`) or established (suggest `/status` or `/coach`).
