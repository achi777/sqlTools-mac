# TASK 06: DB Tool — Full grid CRUD (INSERT / UPDATE / DELETE) (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 02/03/04/05.

## ROLE & CONTEXT
Give the data grid full row-level CRUD, Navicat-style: edit cells (UPDATE,
already exists), add new rows by typing into a trailing empty "new row"
(INSERT), and delete selected rows (DELETE). All from the grid, no separate
form. Architecture unchanged: all DB work in main; renderer via typed
contextBridge only; every write is parameterized and keyed by primary key.

Prereq: TASK 02 (grid + cell-edit UPDATE by PK), TASK 04 (schema catalog),
TASK 05 (structure/DDL). Reuse getTableStructure / schema catalog to know
columns, types, PK, defaults, nullability, auto-increment.

## ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local), npm run <script>, run app in dev to smoke-test
- Connect to TASK 01 databases to run/verify CRUD
- Create/edit/read files anywhere inside the db-tool project folder

## ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; NO deletes outside project; NO rm -rf outside it
- NO host/system config changes (PATH, registry, .wslconfig, WSL, Docker
  Desktop settings, global npm); NO -g global installs
- VERIFY CRUD only on DISPOSABLE rows/objects: insert rows you then delete,
  or use a disposable `_crudtest_` table. Do NOT leave test rows in the
  seeded customers/orders/order_items tables — clean up after verifying.
- If a destructive/system action seems needed, STOP and ask.

## SAFETY RULES (critical — enforce)
- ALL writes are PARAMETERIZED (no string-concatenated values) and executed
  in MAIN. Renderer sends a structured change payload, never SQL.
- UPDATE and DELETE target rows by PRIMARY KEY. If a table has NO detectable
  PK, the grid stays effectively read-only for row edits/deletes — show a
  clear inline note ("no primary key: read-only") rather than guessing a
  WHERE clause. (Navicat behaves similarly.)
- INSERT is allowed even on PK-less tables (nothing to key on for insert),
  but then that new row can't be edited/deleted in-grid afterward — note this.
- Batch pending changes in a transaction where supported; on error, roll back
  and report which row/statement failed. Never leave a half-applied edit set
  silently.

## FEATURES

### 1. TRAILING "NEW ROW" -> INSERT (Navicat-style)
- The grid always shows one extra empty row at the bottom, visually marked
  (e.g. a "*" / "new" indicator).
- Typing into it turns it into a PENDING insert. Multiple new rows allowed
  (as the user fills one, another empty row appears).
- Respect column metadata from the catalog:
  - auto-increment / serial / identity columns: leave blank -> omit from
    INSERT so the DB assigns them; show them greyed/placeholder.
  - columns with DEFAULTs: blank -> omit so the default applies; indicate.
  - NOT NULL without default and left blank -> validation error before apply.
  - basic type-aware input hints (dates, numbers, booleans); JSON/JSONB as
    text with a light validity check.
- On commit, generate a parameterized INSERT; after success, refresh that
  row (re-select by returned/last-insert id where the engine supports it:
  PG RETURNING, MySQL lastInsertRowid/insertId, SQLite lastInsertRowid) so
  auto-generated values show immediately.

### 2. DELETE selected rows
- Row selection (checkbox column or full-row select). Delete key or a
  "Delete rows" button removes selected rows.
- Confirm before delete (count shown). Generate parameterized DELETE ...
  WHERE pk IN (...). Refresh grid after.

### 3. UPDATE (already exists) — integrate into the same model
- Keep the existing cell-edit -> parameterized UPDATE by PK, but unify it
  with the new pending-change model so edits, inserts, deletes can be staged
  and applied together (or applied immediately — pick ONE consistent UX and
  document it; immediate-apply is simpler and fine for this task, staged is
  more Navicat-like — either is acceptable, just be consistent).
- A small toolbar: "Apply changes" / "Discard changes" if you go staged, or
  clear immediate-apply feedback (row flash + status) if immediate.

### 4. STATUS + FEEDBACK
- Status bar: rows affected, success/error, duration.
- Errors (constraint violation, type error, FK failure) surface clearly next
  to the offending row, not just in a console.

## DIALECT NOTES
- Returning inserted id: PG `INSERT ... RETURNING <pk>`; MySQL use
  result.insertId; SQLite use lastInsertRowid (better-sqlite3).
- Boolean handling differs (PG boolean, MySQL tinyint(1), SQLite 0/1) —
  reuse whatever the grid already does for display and mirror it on write.
- JSON/JSONB (PG jsonb, MySQL json, SQLite text) — accept text, validate,
  send as the right type per driver.

## STEPS (autonomous, in order)
1. Extend shared/types.ts with a row-change payload (inserts/updates/deletes
   with table ref + pk info + column values).
2. Main: implement parameterized INSERT/UPDATE/DELETE per driver, with
   returning-id handling and transaction/rollback + precise error reporting.
   Add/extend typed IPC (applyRowChanges) + preload whitelist.
3. Renderer: add the trailing new-row, row selection + delete, and integrate
   with existing cell edit under one pending-change model. Wire validation
   from catalog metadata (auto-inc, defaults, not-null, types).
4. Verify against TASK 01 DBs on DISPOSABLE data (PG, MySQL, SQLite):
   - INSERT: add a new row via the trailing row incl. leaving an auto-inc PK
     blank; confirm the DB-assigned id shows after commit.
   - Add a row missing a NOT NULL value -> validation blocks it.
   - UPDATE: edit a cell -> persists (re-query shows change).
   - DELETE: select + delete rows -> gone (re-query confirms).
   - Try a PK-less table (e.g. a disposable view or a table you create with
     no PK) -> confirm edit/delete are disabled with the note, but insert
     still works.
   - Confirm constraint errors (e.g. FK violation, NOT NULL) surface clearly.
   - Clean up all disposable rows/tables afterward.
5. npm run typecheck + npm run build clean.
6. (Optional, quick) package:dir + SMOKE to confirm no regression.
7. Leave a clean state (dev server stopped, no test data left behind).

## OUT OF SCOPE (later)
- Views/functions/procedures editing, import/export, ER diagram, schema diff,
  backup/restore, copy-paste of multiple rows from spreadsheets (nice later),
  bulk paste. Don't build those now.

## DONE = from the grid, across PG/MySQL/SQLite, the user can add new rows via
a trailing Navicat-style new row (INSERT, with auto-inc/default/not-null
handled), edit cells (UPDATE), and delete selected rows (DELETE) — all
parameterized and PK-keyed, with PK-less tables handled gracefully, clear
validation + error feedback, typecheck + build clean, verified on disposable
data that was cleaned up.
