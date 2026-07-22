# TASK 26: DB Tool — Triggers (create/edit/drop, all engines) (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 05/11/25.

# ROLE & CONTEXT
Add TRIGGER management under each table (Navicat-style: table -> Triggers), for
PostgreSQL, MySQL, and SQLite: list, view, create, edit, drop. Engines differ
significantly (esp. PG's function+trigger split) — handle each correctly.
Architecture unchanged: DB work in main; renderer via typed IPC; destructive
ops confirmed; single-statement execution handled (DELIMITER/$$).

Prereq: TASK 05 (DDL + destructive-confirm + tree context menus), TASK 11
(routines: templates, definition round-trip via SHOW CREATE / pg_get_*,
single-statement execution for bodies with ';'), TASK 25 (adding an object
category with list/create/edit/drop). Reuse TASK 11's execution handling.

# ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local), npm run <script>, run app in dev to smoke-test
- Use chrome-devtools MCP for visual verification if helpful
- Connect to TASK 01 databases to create/verify triggers
- Create/edit/read files anywhere inside the db-tool project folder

# ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; NO deletes outside project; NO rm -rf outside it
- NO host/system config changes; NO -g global installs
- Verify with DISPOSABLE triggers `_trgtest_*` on a DISPOSABLE `_trgtbl_`
  table (create your own throwaway table to attach triggers to). Do NOT attach
  test triggers to the seeded customers/orders/order_items or leave any behind.
  Clean up triggers AND the disposable table.
- Dropping a trigger is destructive-ish (behavior change) -> confirm.

# ENGINE MATRIX (handle each correctly)
- PostgreSQL: a trigger is TWO objects — a TRIGGER FUNCTION (CREATE FUNCTION
  ... RETURNS trigger LANGUAGE plpgsql AS $$ ... $$;) AND the TRIGGER itself
  (CREATE TRIGGER ... {BEFORE|AFTER|INSTEAD OF} {INSERT|UPDATE|DELETE} ON tbl
  FOR EACH {ROW|STATEMENT} EXECUTE FUNCTION fn()). Support the common flow:
  create/select a trigger function + create the trigger that uses it. List via
  pg_trigger/information_schema.triggers; get definition via
  pg_get_triggerdef(oid) and pg_get_functiondef for the function.
- MySQL: a single CREATE TRIGGER name {BEFORE|AFTER} {INSERT|UPDATE|DELETE} ON
  tbl FOR EACH ROW BEGIN ... END. No separate function. Body contains ';' ->
  reuse TASK 11's single-statement/DELIMITER handling. List/def via
  information_schema.TRIGGERS or SHOW TRIGGERS + SHOW CREATE TRIGGER.
- SQLite: CREATE TRIGGER name {BEFORE|AFTER|INSTEAD OF} {INSERT|UPDATE|DELETE}
  ON tbl [FOR EACH ROW] [WHEN cond] BEGIN <stmts>; END. List/def from
  sqlite_master WHERE type='trigger'. Editing = drop + recreate (no ALTER) in
  a transaction; show in preview.

# FEATURES
1. TREE: under each table, a "Triggers" node listing that table's triggers
   (all three engines). Lazy load. Context menu: New Trigger; on an existing:
   Edit, Drop (confirm). (PG: also surface the trigger's function; allow
   editing the function via the TASK 11 routine editor, or inline.)
2. CREATE (dialect-aware form + SQL editor):
   - Common fields: trigger name, timing (BEFORE/AFTER/INSTEAD OF as engine
     allows), event (INSERT/UPDATE/DELETE; UPDATE OF columns where supported),
     level (FOR EACH ROW/STATEMENT — PG; MySQL row-only; SQLite row).
   - PG: choose an existing trigger function OR create one inline (template
     provided); then generate CREATE TRIGGER referencing it.
   - MySQL/SQLite: a body editor with a dialect template (NEW./OLD. refs);
     generate the single CREATE TRIGGER statement.
   - Preview the exact DDL; apply (single-statement execution); refresh.
3. EDIT: load the existing trigger definition (pg_get_triggerdef / SHOW CREATE
   TRIGGER / sqlite_master SQL) into the editor. Apply as:
   - PG: CREATE OR REPLACE the function if changed; for the trigger itself
     (no CREATE OR REPLACE TRIGGER pre-PG14) do DROP TRIGGER + CREATE TRIGGER
     in a transaction; confirm.
   - MySQL: DROP TRIGGER + CREATE TRIGGER (no replace) — transaction if
     supported; confirm.
   - SQLite: DROP + CREATE in a transaction; confirm.
4. DROP: confirm; DROP TRIGGER (+ optionally offer to drop an orphaned PG
   trigger function, but don't force it). Refresh.
5. All DDL generated + executed in main; errors surfaced clearly near editor.

# STEPS (autonomous, in order)
1. IPC + types: listTriggers(table), getTriggerDefinition(...), apply/drop
   trigger DDL, per driver (PG two-part, MySQL/SQLite single). Reuse TASK 11
   single-statement execution. Preload whitelist.
2. Tree: Triggers node under each table (all engines); lazy load; context menu.
3. Create/edit forms with dialect templates (PG function+trigger; MySQL/SQLite
   body) + preview + apply + refresh; edit round-trips existing definition.
4. Verify against TASK 01 DBs using DISPOSABLE table + triggers:
   - Create `_trgtbl_` (a couple columns) on each engine.
   - PG: create a trigger function + a BEFORE INSERT row trigger on `_trgtbl_`
     (e.g. sets a column / raises); confirm it fires (insert a row, observe
     effect); edit it (change timing/body via DROP+CREATE in txn); drop it.
   - MySQL: create an AFTER UPDATE trigger with a body containing ';' (confirm
     DELIMITER handling works); SHOW CREATE round-trips into the editor; edit;
     drop.
   - SQLite: create an AFTER INSERT trigger; edit via drop+recreate; drop.
   - Confirm each trigger appears under the correct table's Triggers node.
   - Drop all triggers AND `_trgtbl_`; confirm seeded tables untouched.
5. npm run typecheck + npm run build clean.
6. Leave a clean state (dev server stopped; all `_trgtest_*`/`_trgtbl_`
   dropped; seeded tables/triggers untouched).

# OUT OF SCOPE (later)
- Indexes-as-tree-node (TASK 27), event triggers (PG cluster-level),
  constraint triggers, trigger debugging. Note as backlog.

# DONE = each table shows a Triggers node listing its triggers across
PG/MySQL/SQLite; the user can create (PG function+trigger; MySQL/SQLite body
with correct single-statement execution), edit (definition round-trip; DROP+
CREATE in a transaction where no replace exists), and drop triggers with
previewed DDL + destructive-confirm; verified on a disposable table+triggers
that fire correctly, with seeded tables untouched; typecheck + build clean.
