# TASK 27: DB Tool — Indexes as a tree node (create/edit/drop, all engines) (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 04/05/25/26.

# ROLE & CONTEXT
Add INDEX management under each table (Navicat-style: table -> Indexes), for
PostgreSQL, MySQL, and SQLite: list, create, edit (drop+recreate), and drop
indexes independently of the Table Designer. Scope = BASIC indexes: B-tree
(default), UNIQUE, and multi-column. Advanced types (GIN/GiST/BRIN/Hash/
partial/expression/FULLTEXT) are OUT of scope this round. The Table Designer
(TASK 05) already creates indexes during table design; this task adds the
standalone tree node + dedicated create/edit/drop. Architecture unchanged.

Prereq: TASK 04 (catalog + tree + IPC), TASK 05 (index creation in designer +
DDL + destructive-confirm), TASK 25/26 (pattern for a per-table/tree object
category with list/create/edit/drop).

# ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local), npm run <script>, run app in dev to smoke-test
- Use chrome-devtools MCP for visual verification if helpful
- Connect to TASK 01 databases to create/verify indexes
- Create/edit/read files anywhere inside the db-tool project folder

# ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; NO deletes outside project; NO rm -rf outside it
- NO host/system config changes; NO -g global installs
- Verify with DISPOSABLE indexes `_idxtest_*` on a DISPOSABLE `_idxtbl_`
  table you create. Do NOT drop/alter indexes on the seeded tables (esp.
  PK/unique/FK-backing indexes). Clean up test indexes AND the table.
- Dropping an index is destructive-ish (perf impact) -> confirm. Never offer
  to drop a PK/unique-constraint-backing index as if it were a plain index —
  see note below.

# ENGINE MATRIX (basic indexes)
- Common: CREATE [UNIQUE] INDEX name ON table (col1, col2, ...); DROP INDEX.
- PostgreSQL: DROP INDEX name; index names are schema-scoped. PK/unique
  constraints have backing indexes that should NOT be dropped via DROP INDEX
  (drop the constraint instead) — mark those as constraint-backed + read-only
  here. List via pg_indexes / pg_index.
- MySQL: indexes are per-table; DROP INDEX name ON table (or ALTER TABLE ...
  DROP INDEX). PRIMARY and unique-constraint indexes are special — mark
  read-only here. List via SHOW INDEX FROM table / information_schema.
  STATISTICS.
- SQLite: only explicitly-created indexes can be dropped (DROP INDEX);
  auto-indexes (from PK/UNIQUE) are implicit and cannot be dropped directly —
  mark them read-only. No ALTER INDEX -> edit = drop + recreate in a txn. List
  via sqlite_master WHERE type='index' (+ PRAGMA index_list/index_info for
  details incl. which are auto).

# FEATURES
1. TREE: under each table, an "Indexes" node listing that table's indexes
   (all engines). Show for each: name, columns (in order), unique yes/no, and
   whether it's constraint-backed/auto (PK/unique) — those are read-only.
   Lazy load. Context menu: New Index; on a user index: Edit, Drop (confirm);
   on a constraint-backed/auto index: no drop (show why).
2. CREATE (form): name, one or more columns (ordered, from the catalog for
   that table), UNIQUE toggle. Multi-column: let the user add/reorder columns.
   (Per-column ASC/DESC where the engine supports it — optional, include if
   trivial.) Generate CREATE [UNIQUE] INDEX DDL, preview, apply, refresh.
3. EDIT: load the index definition; since there's no ALTER INDEX for column
   changes, apply edits as DROP + CREATE in a transaction where supported;
   confirm (it's a drop). Renaming: PG/MySQL support rename (ALTER INDEX ...
   RENAME / ALTER TABLE ... RENAME INDEX); SQLite rename = drop+recreate.
4. DROP: confirm; DROP INDEX (dialect-correct form); refresh. Block dropping
   constraint-backed/auto indexes with a clear explanation (drop the
   constraint via the Table Designer instead).
5. All DDL generated + executed in main; errors surfaced clearly.

# STEPS (autonomous, in order)
1. IPC + types: listIndexes(table) (with unique + constraint-backed/auto
   flags + columns), create/drop/rename index DDL per driver. Preload
   whitelist. (Reuse TASK 05's index DDL generation where possible.)
2. Tree: Indexes node under each table (all engines); lazy load; context menu
   with read-only handling for constraint-backed/auto indexes.
3. Create form (columns + unique + multi-column ordering) + edit (drop+recreate
   / rename) + drop confirm; preview DDL; refresh after.
4. Verify against TASK 01 DBs using DISPOSABLE table + indexes:
   - Create `_idxtbl_` (a few columns) on each engine.
   - Create a single-column index, a multi-column index, and a UNIQUE index on
     `_idxtbl_`; confirm they appear under its Indexes node with correct
     columns/unique flags.
   - Confirm the table's PK/auto index shows as read-only (no drop offered).
   - Edit a user index (change columns via drop+recreate; rename); drop a user
     index (confirm).
   - Verify the seeded tables' indexes are listed correctly and their
     PK/unique/FK indexes are marked read-only + never dropped.
   - Drop all `_idxtest_*` + `_idxtbl_`.
5. npm run typecheck + npm run build clean.
6. Leave a clean state (dev server stopped; disposable index/table dropped;
   seeded tables untouched).

# OUT OF SCOPE (later)
- Advanced index types (GIN/GiST/BRIN/Hash/partial/expression/FULLTEXT/
   spatial), index usage stats / bloat, concurrent index builds. Note as
   backlog.

# DONE = each table shows an Indexes node listing its indexes (columns,
unique, constraint-backed/auto flag) across PG/MySQL/SQLite; the user can
create basic indexes (B-tree default, UNIQUE, multi-column, ordered), edit
(drop+recreate / rename) and drop user indexes with previewed DDL +
destructive-confirm, while constraint-backed/auto (PK/unique) indexes are
read-only with an explanation; verified on a disposable table+indexes with
seeded tables untouched; typecheck + build clean.
