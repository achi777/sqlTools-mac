# TASK 30: DB Tool — Add database-level Dump/Restore to the connection context menu (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 29.

# ROLE & CONTEXT
The full-database Dump/Restore built in TASK 29 works, but there is NO entry
point on right-clicking a database/connection in the tree. The user
right-clicks the database name and expects a context menu with the database
import/export (Dump / Execute SQL File) actions — they're missing there. Add
them. Small, focused UI wiring fix. Architecture unchanged.

Prereq: TASK 29 (database + table dump/restore logic + IPC exist and work).
This task only exposes them from the right-click context menu at the
database/connection level.

# ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local), npm run <script>, run app in dev to smoke-test
- Use chrome-devtools MCP to verify the context menu visually
- Connect to TASK 01 databases to confirm the actions launch + work
- Create/edit/read files anywhere inside the db-tool project folder

# ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; NO deletes outside project; NO rm -rf outside it
- NO host/system config changes; NO -g global installs
- Restore still verifies only into a DISPOSABLE target (per TASK 29); never
  over dbtool_dev / seeded tables.

# THE FIX
1. Locate the tree's context-menu handling for the DATABASE / CONNECTION node
   (the node the user right-clicks that shows the database name). Currently
   dump/restore actions are absent there (they may exist only at table level
   or in a toolbar).
2. Add to the database/connection right-click context menu:
   - "Dump database to SQL file…" -> opens the TASK 29 database dump dialog
     for THIS connection/database.
   - "Execute SQL file…" (Restore) -> opens the TASK 29 restore flow targeting
     THIS connection (with the explicit-target + confirm safeguards).
   - (Keep the existing table-level "Dump table…" on table nodes.)
3. Make sure the actions receive the correct connection/database context
   (right-clicked node), not a stale/active-tab one.
4. Consistency: the same actions should be reachable the same way for all
   three engines (PG/MySQL/SQLite). If a database-level menu already exists
   with other items (e.g. New table/schema), insert these logically (a
   separator + an "Import/Export" group is fine).

# STEPS (autonomous, in order)
1. Find the database/connection node's context-menu component; add the two
   items wired to the existing TASK 29 dump/restore entry points with the
   right context.
2. Verify (dev; chrome-devtools MCP for the menu):
   - Right-click the database name -> context menu now shows "Dump database to
     SQL file…" and "Execute SQL file…".
   - Dump launches the dialog for that DB and produces a .sql (quick check on
     PG/MySQL/SQLite).
   - Execute SQL file launches the restore flow with target + confirm; run a
     small dump into a DISPOSABLE database to confirm the path works end to
     end; drop the disposable target.
   - Table-level "Dump table…" still works.
   - Correct context is used when multiple connections exist (right-click each
     -> acts on that one).
3. npm run typecheck + npm run build clean.
4. Leave a clean state (dev server stopped; disposable restore target dropped).

# OUT OF SCOPE
- New dump/restore features (that's TASK 29); this is purely exposing them in
  the database right-click menu.

# DONE = right-clicking a database/connection in the tree shows "Dump database
to SQL file…" and "Execute SQL file…" wired to the TASK 29 flows with the
correct connection context, consistent across PG/MySQL/SQLite, table-level dump
still intact; verified via the menu incl. a dump->restore into a disposable
target; typecheck + build clean.
