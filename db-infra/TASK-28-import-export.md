# TASK 28: DB Tool — Import & Export (CSV / JSON / Excel / SQL) (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 02/06/08/09.

# ROLE & CONTEXT
Add data IMPORT and EXPORT for PostgreSQL, MySQL, SQLite:
- EXPORT a table (or the current filtered/query result) to CSV, JSON, Excel
  (.xlsx), and SQL (INSERT statements).
- IMPORT from CSV, JSON, Excel into a table with column mapping, type handling,
  and error reporting.
Architecture unchanged: all DB work + file writing in MAIN; renderer via typed
IPC; imports use PARAMETERIZED INSERTs (never string-concatenated values).

Prereq: TASK 06 (grid CRUD / parameterized writes), TASK 08 (paginated
browsing + total count), TASK 09/10/21 (filters — export should honor the
active filter). Reuse the driver layer + catalog (columns/types/PK).

# ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local; e.g. SheetJS `xlsx` for Excel, a CSV lib like
  papaparse or csv-parse), npm run <script>, run app in dev to smoke-test
- Use chrome-devtools MCP for visual verification if helpful
- Connect to TASK 01 databases to export/import + verify
- Create/edit/read files anywhere inside the db-tool project folder

# ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; NO deletes outside project; NO rm -rf outside it
- NO host/system config changes; NO -g global installs
- IMPORT verification must target a DISPOSABLE `_iotest_` table you create —
  do NOT import test rows into the seeded customers/orders/order_items. Clean
  up. Export from seeded tables is read-only and fine.
- File writes go where the user chooses (a save dialog) or a stated output
  path; don't write outside the project/user-chosen location.

# EXPORT
1. ENTRY: an "Export" action on a table (tree/grid toolbar) and on query
   results. A dialog to choose: format (CSV/JSON/Excel/SQL), scope, options.
2. SCOPE options:
   - "Current filter/result" -> export exactly what the grid is showing given
     the ACTIVE filter (Quick/Builder/Custom WHERE) — NOT just the current
     page. Stream all matching rows (respect the WHERE, ignore LIMIT/OFFSET).
   - "Entire table" -> all rows.
   - (Optional) selected rows only.
   - Choose which COLUMNS to include (default all).
3. STREAMING: for large tables, stream rows in batches from main (cursor /
   LIMIT-OFFSET or a server-side cursor) and write incrementally so memory
   stays bounded. Show progress.
4. FORMAT specifics:
   - CSV: header row, configurable delimiter (default comma), proper quoting/
     escaping (RFC 4180), NULL representation option (empty vs \N), UTF-8 BOM
     option for Excel compatibility.
   - JSON: array of row objects; option for pretty vs compact; correct typing
     (numbers as numbers, null as null, dates ISO-8601).
   - Excel (.xlsx via SheetJS): one sheet; header row; typed cells where
     reasonable; sheet name = table name.
   - SQL: INSERT INTO <table> (cols) VALUES (...); dialect-correct identifier
     quoting + value literals (properly escaped per engine); option for
     multi-row INSERT batching and optional CREATE TABLE prefix (basic).
5. Save via a native save dialog; report the written path.

# IMPORT
1. ENTRY: an "Import" action on a table (or "import into new table"). Choose a
   source file (CSV/JSON/Excel).
2. PARSE + PREVIEW: parse the file, show a preview grid (first N rows) and the
   detected source columns. For CSV: detect delimiter + header row (let user
   override); for Excel: pick the sheet; for JSON: expect an array of objects.
3. COLUMN MAPPING: map source columns -> target table columns (auto-match by
   name, user-editable). Unmapped target columns use default/NULL; unmapped
   source columns are ignored (shown). Respect target types from the catalog:
   coerce/validate values (numbers, dates, booleans per engine, JSON/JSONB as
   text); flag rows that can't be coerced.
4. OPTIONS:
   - Insert mode: plain INSERT; optional "skip on error / collect errors" vs
     "abort on first error"; optional batch size; wrap in a transaction where
     supported (all-or-nothing) OR batched with an error report — offer both,
     document behavior.
   - Handle auto-increment/PK: allow omitting PK so the DB assigns it, or
     importing provided PKs (note conflict risk).
   - (Optional, note if skipped) upsert / "on conflict" handling — can be
     backlog; basic INSERT is enough this round.
5. EXECUTE: parameterized batch INSERTs in main; show progress + a final
   report (rows inserted, rows skipped/failed with reasons). On abort-mode
   error, roll back.
6. "Import into new table": optionally create a table from the inferred
   columns/types first (reuse TASK 05 DDL), then import. (Include only if not
   too large; otherwise require an existing target and note new-table import
   as backlog.)

# STEPS (autonomous, in order)
1. Add project-local libs (xlsx; a CSV parser). IPC + types for export
   (streaming) and import (parse/preview/mapping/execute). Preload whitelist.
2. Implement EXPORT (all 4 formats, scope incl. active filter, streaming,
   save dialog, progress) in main + a renderer export dialog.
3. Implement IMPORT (parse+preview, column mapping UI, type coercion/
   validation, parameterized batch insert, transaction/error modes, progress+
   report) in main + a renderer import wizard.
4. Verify against TASK 01 DBs (PG/MySQL/SQLite):
   EXPORT:
   - Export customers to CSV, JSON, Excel, SQL. Re-open/inspect each: row count
     matches; NULLs, numbers, dates, and a value with a comma/quote/newline are
     correctly quoted/escaped; JSON types correct; Excel opens; SQL INSERTs are
     valid (test by running them into a disposable `_iotest_` table).
   - Apply a filter, export "current filter" -> only filtered rows exported.
   IMPORT:
   - Create disposable `_iotest_` (matching a few columns). Import a CSV into
     it with column mapping; verify rows land, types coerced, a deliberately
     bad row is reported (skip-mode) or aborts+rolls back (abort-mode).
   - Round-trip: export customers to CSV/JSON/Excel, import each into
     `_iotest_`, confirm data matches (allowing for PK reassignment).
   - Confirm parameterization: a value like O'Brien / with %; imports as a
     literal, no injection.
   - Drop `_iotest_`; confirm seeded tables unchanged.
5. npm run typecheck + npm run build clean.
6. (Optional, quick) package:dir + SMOKE to confirm the native libs (xlsx)
   survive packaging (like better-sqlite3 did).
7. Leave a clean state (dev server stopped; `_iotest_` dropped; seeded tables
   untouched; no stray export files in the repo).

# OUT OF SCOPE (later)
- Upsert/merge on import, fixed-width/XML formats, scheduled/automated
  export, export templates/profiles, huge-file memory-mapped import. Note as
  backlog.

# DONE = the user can EXPORT a table or the current filtered result to CSV,
JSON, Excel(.xlsx), and SQL — honoring the active filter, streaming large
tables, correctly quoted/typed/escaped, saved via a dialog — and IMPORT from
CSV/JSON/Excel with a preview + column mapping + type coercion + parameterized
batched inserts + transaction/error modes + a result report, across
PG/MySQL/SQLite; verified with a round-trip and an injection-safe value on a
disposable table with seeded tables untouched; xlsx survives packaging;
typecheck + build clean.
