# TASK 11: DB Tool — Views + Functions/Procedures (SQL editor) (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 02/04/05.

## ROLE & CONTEXT
Add management of PROGRAMMABLE / DERIVED objects: create, edit, and drop
VIEWS (all three engines) and FUNCTIONS + STORED PROCEDURES (PostgreSQL +
MySQL; SQLite has none). Editing is done through a SQL editor with the
object's current definition loaded, a preview, and safe apply. Architecture
unchanged: DB work in main; renderer via typed contextBridge; parameterized
where values are involved; destructive ops confirmed.

Prereq: TASK 04 (schema catalog + tree + editor), TASK 05 (DDL generators +
destructive-confirm + tree context menu). Reuse the tree, the CodeMirror
editor, and the confirm flow.

## ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local), npm run <script>, run app in dev to smoke-test
- Connect to TASK 01 databases to create/verify views/functions/procedures
- Create/edit/read files anywhere inside the db-tool project folder

## ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; NO deletes outside project; NO rm -rf outside it
- NO host/system config changes (PATH, registry, .wslconfig, WSL, Docker
  Desktop settings, global npm); NO -g global installs
- Verify with DISPOSABLE objects: `_vwtest_*` views, `_fntest_*` functions,
  `_sptest_*` procedures. Do NOT alter the seeded tables' data. Drop all test
  objects when done.
- If a destructive/system action seems needed, STOP and ask.

## ENGINE MATRIX (be explicit in the UI)
- VIEWS: PostgreSQL ✅, MySQL ✅, SQLite ✅ (SQLite views are read-only).
- FUNCTIONS: PostgreSQL ✅ (CREATE FUNCTION, pl/pgsql & sql), MySQL ✅
  (CREATE FUNCTION, deterministic/reads-sql-data etc.). SQLite ❌.
- STORED PROCEDURES: PostgreSQL ✅ (CREATE PROCEDURE), MySQL ✅
  (CREATE PROCEDURE). SQLite ❌.
- When the active connection is SQLite, show Functions/Procedures nodes as
  unavailable with a short note ("SQLite has no stored routines") — never
  error out.

## FEATURES

### 1. TREE: new object categories
- Under each schema/database in the tree, add nodes: Views, Functions,
  Procedures (Functions/Procedures hidden or disabled+noted for SQLite).
- Lazy-load lists from the catalog (extend getSchemaCatalog or add
  listViews / listRoutines IPC per driver):
  - PG: information_schema.views / pg_proc + pg_get_functiondef(oid).
  - MySQL: information_schema.VIEWS / .ROUTINES + SHOW CREATE
    VIEW|FUNCTION|PROCEDURE.
  - SQLite: sqlite_master WHERE type='view' (+ its stored SQL).
- Context menu: New View / New Function / New Procedure; on an existing
  object: Edit (open definition), Drop (confirm), Rename where supported.

### 2. VIEW create/edit (SQL editor based)
- "New View": a form with a name + a SQL editor for the SELECT body, plus
  (PG/MySQL) options like OR REPLACE, and MySQL algorithm/CHECK OPTION as
  optional advanced fields.
- Generate the correct statement per dialect:
  PG/MySQL: CREATE [OR REPLACE] VIEW name AS <select>;
  SQLite: CREATE VIEW name AS <select>;  (no OR REPLACE -> to "edit" a SQLite
  view, DROP then CREATE inside a transaction; show this in preview).
- "Edit View": load the current definition (from catalog/SHOW CREATE) into the
  editor, let the user change it, preview the resulting DDL, apply with the
  drop+recreate handled where needed (transaction; destructive-confirm since a
  drop is involved for SQLite / for column-set changes).
- After apply, refresh the tree + catalog; offer "open view data" (runs
  SELECT * FROM view through the existing paginated grid).

### 3. FUNCTION / PROCEDURE create/edit (PG + MySQL)
- A SQL editor pre-filled with a dialect-appropriate TEMPLATE on "New":
  - PG function template (CREATE OR REPLACE FUNCTION name(args) RETURNS ...
    LANGUAGE plpgsql AS $$ BEGIN ... END; $$;)
  - PG procedure template (CREATE OR REPLACE PROCEDURE ... LANGUAGE plpgsql).
  - MySQL function template (CREATE FUNCTION name(args) RETURNS ...
    DETERMINISTIC BEGIN ... END) and procedure template.
- IMPORTANT (MySQL DELIMITER): routines contain semicolons; when executing
  via the driver, DO NOT rely on client DELIMITER — send the whole CREATE as
  a single statement through the driver (mysql2 multipleStatements off; one
  routine body per call). Handle this so bodies with ';' work. For PG, the
  $$ ... $$ dollar-quoting is fine as one statement.
- "Edit": load the existing definition:
  - PG: SELECT pg_get_functiondef(oid) -> full CREATE OR REPLACE ... .
  - MySQL: SHOW CREATE FUNCTION/PROCEDURE name -> the create statement.
  Put it in the editor; on apply, run CREATE OR REPLACE (PG) or DROP + CREATE
  (MySQL, which lacks CREATE OR REPLACE for routines — do it in a transaction
  if supported, else drop then create with clear error handling; confirm the
  drop).
- Drop function/procedure: destructive-confirm. Note that PG functions can be
  overloaded (same name, different args) — when dropping, include the arg
  signature so the right overload is targeted; when listing, show signatures.

### 4. SAFE EXECUTION + ERRORS
- All of the above run in MAIN via the driver; report engine errors clearly
  (syntax errors in a routine body, permission errors) next to the editor.
- Where the engine supports transactional DDL (PG), wrap edit-as-drop+create
  in a transaction so a failed create doesn't leave the object missing.
  MySQL DDL is mostly non-transactional — warn that an edit does drop then
  create, and report precisely if the recreate fails (so the user can react).

## STEPS (autonomous, in order)
1. Add IPC + types: listViews, listRoutines (functions+procedures with
   signatures), getObjectDefinition(kind,name[,signature]),
   applyObjectDdl(sql) [reuse applyDdl if present], dropObject(kind,name,sig).
   Per-driver implementations (PG/MySQL/SQLite; SQLite routines -> empty +
   flag). Preload whitelist.
2. Tree: add Views/Functions/Procedures nodes + lazy load + context menus;
   SQLite disables routines with a note.
3. View editor (new/edit) with dialect-correct generation incl. SQLite
   drop+recreate; preview + apply + refresh; "open view data" via paginated
   grid.
4. Function/Procedure editor (PG/MySQL) with templates, definition load
   (pg_get_functiondef / SHOW CREATE), correct single-statement execution
   (DELIMITER/$$ handled), edit-as-replace/drop+create, drop with signature.
5. Verify against TASK 01 DBs using DISPOSABLE objects:
   - PG: create `_vwtest_v` view over customers; edit it; open its data in the
     grid; create `_fntest_f()` function and `_sptest_p()` procedure via
     templates; edit each (load via pg_get_functiondef, change, re-apply);
     drop all (with signature for the function).
   - MySQL: same for view + function + procedure; confirm a body containing
     ';' applies correctly (DELIMITER issue handled); SHOW CREATE round-trips
     into the editor; drop all.
   - SQLite: create `_vwtest_v` view; edit (drop+recreate in txn) preserving
     intent; open data; confirm Functions/Procedures show as unavailable with
     the note (no crash).
   - Clean up every disposable object.
6. npm run typecheck + npm run build clean.
7. (Optional, quick) package:dir + SMOKE to confirm no regression.
8. Leave a clean state (dev server stopped; all test objects dropped).

## OUT OF SCOPE (this task)
- The VISUAL drag-drop View builder (that's TASK 12; this task's View
  save/edit layer is the foundation it will reuse).
- Triggers, events, materialized-view refresh scheduling, debugging routines,
  parameter-form execution UI. Note as backlog; don't build now.

## DONE = through the tree + a SQL editor the user can create/edit/drop VIEWS
on PG/MySQL/SQLite (incl. SQLite drop+recreate and "open view data") and
create/edit/drop FUNCTIONS + PROCEDURES on PG/MySQL (templates, definition
round-trip via pg_get_functiondef / SHOW CREATE, correct single-statement
execution, signature-aware drop), with SQLite routines cleanly marked
unavailable; destructive ops confirmed; errors surfaced; typecheck + build
clean; verified on disposable objects that were cleaned up.
