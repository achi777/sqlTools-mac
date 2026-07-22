# TASK 05: DB Tool — Database & Table create/edit (DDL) (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 02/03/04.

## ROLE & CONTEXT
Add structure management: create/edit/drop databases and tables, manage
columns, primary keys, foreign keys, and indexes — through a visual editor
with a live DDL preview, for PostgreSQL, MySQL, and SQLite. This is what
turns the app from a query runner into a real DB tool. Architecture stays:
all DB work in main, renderer via typed contextBridge only.

Prereq: TASK 02 app (connect/tree/editor/grid), TASK 04 (schema catalog +
autocomplete + tabs + history). Reuse the existing schema catalog and the
getSchemaCatalog IPC where useful.

## ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local), npm run <script>, run app in dev to smoke-test
- Connect to TASK 01 databases to run/verify generated DDL
- Create/edit/read files anywhere inside the db-tool project folder

## ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; NO deletes outside project; NO rm -rf outside it
- NO host/system config changes (PATH, registry, .wslconfig, WSL, Docker
  Desktop settings, global npm); NO -g global installs
- When TESTING generated DDL against the TASK 01 databases, do it in a
  DISPOSABLE schema/table you create (e.g. schema `dbtool_ddl_test` or tables
  prefixed `_ddltest_`). Do NOT alter or drop the seeded customers/orders/
  order_items tables. Clean up your test objects when done.
- If a destructive/system action seems needed, STOP and ask.

## ARCHITECTURE / SAFETY RULES
- All DDL is GENERATED and EXECUTED in main; renderer sends a structured
  "table spec" (or a change-set) via typed IPC, never raw driver calls.
- Per-driver DDL generation: PostgreSQL, MySQL, SQLite each have their own
  generator (they differ a lot — see SQLite note below).
- DESTRUCTIVE-CHANGE CONFIRMATION: any operation that can lose data (DROP
  TABLE, DROP COLUMN, DROP DATABASE, narrowing a type, dropping a PK/constraint)
  must be surfaced to the user with the exact DDL and an explicit confirm step
  in the UI before execution. Non-destructive changes still show DDL preview
  but can be applied directly.
- Everything runs in a transaction where the engine supports DDL transactions
  (PG yes; MySQL DDL is mostly non-transactional — note this and apply
  change-by-change with clear error reporting; SQLite supports transactional
  DDL). On error, report which statement failed and stop.

## FEATURES

### A. TABLE DESIGNER (create + edit)
Visual editor (a form/grid, not free-text SQL) to define a table:
- Columns: name, type (dialect-aware type dropdown + free entry), length/
  precision where relevant, nullable, default, auto-increment/serial/identity,
  comment (where supported).
- Primary key: mark one or more columns as PK.
- Foreign keys: column(s) -> referenced table/column(s), ON DELETE/UPDATE
  actions. Populate referenced tables from the schema catalog.
- Indexes: name, columns, unique yes/no.
- Two modes:
  1. CREATE: design a new table -> generate CREATE TABLE (+ indexes/FKs).
  2. EDIT existing: load current structure (reuse getTableStructure/catalog),
     let the user change it, and generate an ALTER-based change-set (add/
     drop/modify column, add/drop index, add/drop constraint).
- LIVE DDL PREVIEW pane: always shows the exact SQL that will run, updating
  as the user edits. A "Copy SQL" button. An "Apply" button (with the
  destructive-confirm rule above).

### B. DATABASE / SCHEMA management
- Create database (MySQL) / schema (PostgreSQL). SQLite: creating a "database"
  = creating a new .sqlite file via a saved connection (handle gracefully;
  explain in UI that SQLite databases are files).
- Drop database/schema — destructive-confirm required, typed confirmation
  (user retypes the name) given how dangerous this is.
- Rename where the engine supports it.

### C. ENTRY POINTS in the UI
- Object tree context menu (right-click): on a connection/schema -> "New
  table", "New database/schema"; on a table -> "Design table" (edit),
  "Rename", "Truncate" (confirm), "Drop table" (confirm).
- The designer opens in a tab (reuse the tab system from TASK 04) or a modal —
  your call; tab is nicer for a big form.

## SQLite-specific note (important)
SQLite's ALTER TABLE is limited (historically only ADD COLUMN / RENAME; newer
versions add DROP COLUMN / RENAME COLUMN but not arbitrary type changes or
constraint edits). For unsupported edits, generate the standard 12-step
table-rebuild pattern (create new table, copy data, drop old, rename) INSIDE
A TRANSACTION, and show that in the DDL preview so the user sees what happens.
Note this behavior in the UI when editing SQLite tables.

## STEPS (autonomous, in order)
1. Define the shared "table spec" / change-set types in shared/types.ts.
2. Implement per-driver DDL generators in main (create + alter + db/schema).
   Unit-check each generator's output for a representative table on all 3
   dialects.
3. Add typed IPC: previewDdl(spec/changeset) -> string, and applyDdl(...) ->
   result; plus db/schema create/drop calls. Wire preload whitelist.
4. Build the Table Designer UI (columns/PK/FK/indexes) + live DDL preview +
   destructive-confirm flow. Wire tree context-menu entry points.
5. Build database/schema create/drop UI with typed-name confirmation on drop.
6. Verify against TASK 01 databases USING DISPOSABLE objects only:
   - Create a new table `_ddltest_products` on PG, MySQL, and a SQLite file:
     columns of varied types, a PK, an index, and an FK to a disposable
     parent — confirm it appears in the tree + catalog.
   - Edit it: add a column, add an index, change nullability; confirm ALTER
     change-set applies. On SQLite, force an edit that triggers the rebuild
     pattern and confirm data is preserved.
   - Drop the disposable objects (confirm flow) and clean up.
   - Create + drop a disposable schema (PG) / database (MySQL).
7. npm run typecheck + npm run build clean.
8. (Optional, quick) package:dir + SMOKE to confirm nothing regressed.
9. Leave a clean state (dev server stopped, all disposable test objects
   removed from the TASK 01 databases).

## OUT OF SCOPE (later)
- Views, functions, procedures, triggers (separate task).
- Import/export (separate task). ER diagrams, schema diff/sync, backup/restore.
- Don't build those now.

## DONE = through the UI the user can create and edit tables (columns, PK,
FK, indexes) with a live DDL preview and destructive-change confirmation,
across PG/MySQL/SQLite (incl. SQLite's rebuild pattern); can create/drop
databases/schemas with typed confirmation; entry points live in the tree
context menu; typecheck + build clean; verified against TASK 01 DBs using
disposable objects that were cleaned up afterward.
