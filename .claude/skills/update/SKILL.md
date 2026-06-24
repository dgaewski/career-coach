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
2. `git fetch upstream`, then merge the engine changes into their branch. By design the template and the user own different files, so this mostly applies cleanly. The one predictable exception is **`USER.md`**: the template owns its schema and field comments while the user owns the values, so a template edit to `USER.md` conflicts with their filled-in copy — resolve it keeping the user's values (plus any genuinely new field or comment the template added), then continue. For any other conflict, resolve engine files (`tools/`, `CLAUDE.md`, `.claude/`) in favor of the template and the user's data in favor of the user, and explain what you did.
3. **Reinstall deps if they changed:** if `tools/package.json` changed in the merge, run `npm install` in `tools/`.
4. **Regenerate `data/`:** run `npm run index` in `tools/`.
5. **Restart the server, then summarize.** Restarting `npm run coach` is what picks up new **server-side** engine code (`tools/server/`), so if it's running, tell them to stop and re-run it. On boot the server now **rebuilds the dashboard bundle automatically** when the merge changed `tools/dashboard/` (the UI is a per-instance pre-built bundle in the git-ignored `tools/dashboard/dist/`; a stale bundle reading freshly-indexed `data/` would otherwise crash the UI), so no manual `npm run dash:build` is needed — just hard-reload the browser if the page looks off. Then summarize what's new.
