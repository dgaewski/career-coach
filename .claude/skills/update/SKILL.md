---
name: update
description: Pull the latest engine improvements from the template into your instance, without touching your personal data. Run it occasionally to stay current.
disable-model-invocation: true
allowed-tools: Bash, Read, Edit
---

You are running **/update** for this person — pulling engine updates from the public template (`upstream`) into their instance. Their data is never touched (the template and the user own different files by design).

1. **Check for `upstream`:** run `git remote -v`.
   - **If `upstream` exists** → continue.
   - **If there is no `upstream`** → it isn't wired yet. If they cloned from the public template, the template is likely still their `origin` — offer to rename it (`git remote rename origin upstream`); otherwise offer to add it (`git remote add upstream <the public template's URL>`). If neither is possible (e.g. a ZIP download and they don't know the template URL), explain that `/update` needs the template's address and stop gracefully — don't invent a remote.
2. `git fetch upstream`, then merge the engine changes into their branch. By design the template and the user own different files, so this should apply cleanly; if anything ever conflicts, resolve engine files (`tools/`, `CLAUDE.md`, `.claude/`) in favor of the template and the user's data in favor of the user, and explain what you did.
3. If dependencies changed, run `npm install` in `tools/`. Then run `npm run index` to regenerate `data/`.
4. Tell them to restart the dashboard (`npm run coach`) to pick up the new engine, and summarize what's new.
