---
name: backup
description: Save your career data to your own private GitHub repo. Run it anytime to push your latest changes; the first run can create the repo for you. Your data stays private.
disable-model-invocation: true
allowed-tools: Bash, Read
---

You are running **/backup** for this person — pushing their wiki to their **private** GitHub repo. Be explicit that this data is personal and the repo is private.

1. **Safety check:** confirm `.gitignore` covers `raw-sources/` and `data/`. **Never commit `raw-sources/`** — their résumé and raw postings stay local.
2. **Check the remote:** run `git remote -v`.
   - **If an `origin` exists** → stage their data, commit with a brief dated message, and `git push`.
   - **If there is no `origin`** → offer to create the backup repo now. Confirm `gh` is installed and authenticated (`gh auth status`; if not, guide them through `gh auth login` — they do the browser step — or stop and tell them to run `/backup` again afterward). Then create it **private**: `gh repo create <name> --private --source=. --remote=origin`, and push. Say clearly: *"This repo holds your personal career data — I'm creating it private; never make it public."*
3. Do **not** add an `upstream` remote — that is set up later (in P4 / by `/update`).
4. Report what was pushed and the repo URL.
