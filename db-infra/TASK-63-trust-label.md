# TASK 63: DB Tool — Shorten the "Trust server certificate" label in the connection form (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 58.

# ROLE & CONTEXT
In the New/Edit connection dialog (SQL Server options), the label
  "Trust server certificate (needed for local/self-signed)"
is too long: it stretches the dialog and causes a vertical scrollbar.
Shorten it. Small visual fix; no behavior change.

# ✅ AUTONOMOUS PERMISSIONS
- npm run <script>, run app in dev; chrome-devtools MCP to verify
- Create/edit/read files inside the db-tool project folder
- GIT: pull at the start; commit + push at the end (authorized)

# ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; NO git reset --hard / clean / force-push
- NO host/system config changes; NO -g installs
- Do NOT change the option's behavior or its field name — label/UI only.

# THE FIX
1. Shorten the visible label to just:  "Trust server certificate"
   (drop the "(needed for local/self-signed)" part).
2. Move the explanation into a TOOLTIP on the label/checkbox (and an
   aria-label / title), e.g. "Needed for local or self-signed certificates" —
   so the guidance isn't lost. Use the same tooltip mechanism as the other
   icon-only controls (TASK 40/54/57).
3. While there, check the neighbouring SQL Server options ("Encrypt", auth
   selector, etc.) for the same overflow problem and shorten/tooltip them the
   same way ONLY if they also stretch the dialog. Don't touch anything that
   already fits.
4. Ensure the dialog no longer stretches and the vertical scrollbar is gone at
   the default dialog size; labels wrap or truncate gracefully if the window is
   narrow.

# STEPS
1. `git pull`.
2. Apply the label change + tooltip; check sibling options for the same issue.
3. Verify with chrome-devtools MCP: open New connection -> choose SQL Server ->
   the dialog fits with no vertical scrollbar; hovering the checkbox/label
   shows the explanation; the toggle still works and Test connection still
   succeeds against the running MSSQL container.
4. npm run typecheck + npm run build clean.
5. COMMIT + PUSH; report the commit hash.

# DONE = the label reads "Trust server certificate" with the
local/self-signed explanation moved to a hover tooltip (+aria-label), the
connection dialog no longer stretches or shows a vertical scrollbar, sibling
options checked for the same overflow, behavior unchanged and MSSQL Test
connection still works, typecheck + build clean, committed and pushed with the
hash reported.
