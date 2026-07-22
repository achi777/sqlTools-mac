# TASK 20: DB Tool — Consistent connection actions (Connect/Disconnect, Edit, Delete) (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 02 (connection manager).

# ROLE & CONTEXT
Fix inconsistent actions in the Connection Manager. Each saved connection
currently exposes a DIFFERENT set of actions depending on engine, and a
mislabeled button. Make ALL saved connections (PostgreSQL, MySQL, SQLite)
expose the SAME consistent action set: Connect/Disconnect, Edit, Delete.
Architecture unchanged; this is a UI + wiring consistency fix.

Observed today (to correct):
- MySQL: has Connect/Disconnect + Delete, but NO Edit.
- PostgreSQL: has Connect/Disconnect + "Save" (which is really Edit) but NO
  Delete.
- SQLite: same as Postgres — "Save" (really Edit) and NO Delete.

Prereq: TASK 02 connection manager (add/test/save connections persisted to
userData; connect/disconnect; drivers per engine).

# ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local), npm run <script>, run app in dev to smoke-test
- Use chrome-devtools MCP to visually verify the action buttons/menus
- Create/edit/read files anywhere inside the db-tool project folder

# ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; NO deletes outside project; NO rm -rf outside it
- NO host/system config changes; NO -g global installs
- "Delete connection" here means removing a SAVED CONNECTION ENTRY from the
  app's own connection list (userData) — it must NEVER drop/delete anything in
  the actual database. Make that unambiguous in code + confirm dialog copy.

# THE FIX
1. UNIFIED ACTION SET for every saved connection, identical across engines:
   - Connect / Disconnect (toggles based on current state)
   - Edit  (opens the connection form pre-filled with that connection's
     settings; saving updates the existing entry — NOT a new one)
   - Delete (removes the saved connection entry; with a confirm dialog)
   - (Keep Test connection available within the Edit form.)
2. RELABEL: the button currently labeled "Save" on a saved connection is
   really Edit — rename it to "Edit". "Save" should only appear INSIDE the
   edit/add form (to persist changes). So: list/context = Edit; form = Save
   (and Cancel).
3. EDIT flow: opening Edit loads the existing values (including engine-specific
   fields — host/port/user/password/db for PG/MySQL; file path for SQLite),
   lets the user change them, Test, and Save -> updates the SAME entry (match
   by id, don't create a duplicate). If the connection is currently connected,
   either require disconnect before applying, or reconnect after saving —
   pick one clean behavior and do it consistently.
4. DELETE flow: confirm ("Delete saved connection '<name>'? This only removes
   it from DB Tool and does not affect the database."), then remove from the
   userData connection store and the UI list. If it's connected, disconnect
   first.
5. CONSISTENency: whether actions live in a right-click context menu, a row
   hover toolbar, or a kebab menu — use the SAME pattern and the SAME full set
   for all three engines. No engine should be missing an action.

# STEPS (autonomous, in order)
1. Audit the connection-list item component + any per-engine branching; find
   why actions differ (likely conditional rendering / mislabeled button).
2. Implement the unified action set (Connect/Disconnect, Edit, Delete) for all
   engines; relabel "Save"->"Edit" in the list; keep Save inside the form.
3. Wire Edit to update-by-id (no duplicate); wire Delete to remove-by-id with
   confirm + disconnect-if-connected; ensure store persistence in userData.
4. Verify (dev; chrome-devtools MCP optional for the UI):
   - All three default connections (PG, MySQL, SQLite) show the SAME actions:
     Connect/Disconnect, Edit, Delete.
   - Edit MySQL: change a field, Test, Save -> the same entry updates (no
     duplicate); reconnect works.
   - Edit PostgreSQL and SQLite similarly (SQLite: change file path).
   - Delete a disposable test connection -> confirm dialog -> removed from list
     + userData; databases untouched. (Create a throwaway connection entry to
     delete so you don't lose the seeded defaults — or re-add the default
     afterward.)
   - Restart app -> edits persisted, deleted entry stays gone, defaults intact.
5. npm run typecheck + npm run build clean.
6. Leave a clean state (dev server stopped; default PG/MySQL/SQLite
   connections still present and correct).

# OUT OF SCOPE
- Connection folders/grouping, import/export of connections, OS-keychain for
  passwords (still a later task), duplicate/clone-connection. Note as backlog.

# DONE = every saved connection (PG/MySQL/SQLite) exposes the identical action
set — Connect/Disconnect, Edit (form pre-filled, updates same entry, "Save"
lives in the form), and Delete (confirm; removes only the saved entry, never
touches the database) — consistent across engines, persisted across restart;
typecheck + build clean; verified.
