# TASK 51: DB Tool — Oracle Indexes (tree node: list/create/edit/drop) (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 27/45/46.

# ROLE & CONTEXT
Add INDEX management for ORACLE under each table (like TASK 27 did for PG/
MySQL/SQLite): list indexes with details, create, edit (drop+recreate), rename,
drop. Scope = BASIC indexes (B-tree default, UNIQUE, multi-column). Advanced
Oracle index types (bitmap, function-based, partitioned, domain) are OUT of
scope this round. Architecture unchanged: DB work in main; renderer via typed
IPC; destructive ops confirmed.

Prereq: TASK 27 (index tree node + UI + flows for the other engines — REUSE),
TASK 45 (Oracle driver + ALL_* catalog), TASK 46 (Oracle DDL + quoting policy).

# ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local), npm run <script>, run app in dev + smoke
- Connect to the running Oracle XE container (dbtool-oracle, 1522)
- Use chrome-devtools MCP for UI verification
- Create/edit/read files anywhere inside the db-tool project folder

# ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; don't touch existing containers/data
- Verify with DISPOSABLE `_ORAIDX_*` indexes on a DISPOSABLE `_ORAIDXTBL_`
  table you create; drop both after. NEVER drop/alter indexes on the seeded
  schema (esp. PK/unique constraint-backing ones).
- NO host/system config changes; NO -g installs.

# ORACLE INDEX SPECIFICS (get these right)
- Catalog: ALL_INDEXES / USER_INDEXES (INDEX_NAME, TABLE_NAME, UNIQUENESS,
  STATUS, INDEX_TYPE) joined with ALL_IND_COLUMNS (COLUMN_NAME,
  COLUMN_POSITION) for the ordered column list.
- CREATE: CREATE [UNIQUE] INDEX name ON table (col1, col2 ...)
- DROP: DROP INDEX name;  — NOTE: Oracle does NOT use "ON table" in DROP INDEX
  (unlike MySQL). Index names are schema-scoped.
- RENAME: ALTER INDEX name RENAME TO new_name.
- No ALTER to change indexed columns -> editing columns = DROP + CREATE
  (destructive-confirm; show in preview).
- CONSTRAINT-BACKED indexes: PRIMARY KEY / UNIQUE constraints are backed by
  indexes. These must be READ-ONLY here: DROP INDEX on them fails (you must
  drop the constraint instead). Detect them (e.g. join ALL_CONSTRAINTS where
  CONSTRAINT_TYPE in ('P','U') and INDEX_NAME matches) and mark them read-only
  with an explanation ("backed by a PK/UNIQUE constraint — drop the constraint
  in the Table Designer instead"). Same protection pattern as TASK 27.
- IDENTITY / system indexes (e.g. those supporting ISEQ$$ or internal objects)
  -> also read-only / filtered, never droppable via the UI.
- STATUS: Oracle indexes can be VALID / UNUSABLE — display the status if easy
  (useful info); no rebuild action needed this round (note as backlog).
- Identifier quoting: follow the TASK 46 policy for execution and TASK 47 for
  any displayed SQL.

# FEATURES
1. TREE: under each Oracle table, an "Indexes" node listing that table's
   indexes: name, columns (in order), unique yes/no, constraint-backed/system
   flag, and status if available. Lazy load. Context menu: New Index; on a user
   index: Edit, Rename, Drop (confirm); on a constraint-backed/system index:
   read-only with the explanation (no drop offered).
2. CREATE: reuse the TASK 27 form (name, ordered column picker from the
   catalog, UNIQUE toggle) -> generate Oracle CREATE INDEX -> preview -> apply
   -> refresh.
3. EDIT: column changes via DROP + CREATE in sequence with destructive-confirm;
   RENAME via ALTER INDEX ... RENAME TO.
4. DROP: confirm; DROP INDEX name (no "ON table"); refresh.
5. Reuse the TASK 27 UI/flows; add Oracle-specific behavior rather than
   duplicating the UI.

# STEPS (autonomous, in order)
1. Implement Oracle index support in the Oracle driver: listIndexes (columns
   ordered by COLUMN_POSITION, uniqueness, constraint-backed/system detection,
   status), create/drop/rename DDL. Wire into the existing index IPC from
   TASK 27 (extend, don't fork).
2. Enable the Indexes node for Oracle in the tree with the read-only handling.
3. Verify against Oracle XE using DISPOSABLE objects:
   - Create `_ORAIDXTBL_` (a few columns, an IDENTITY PK).
   - Its PK-backing index appears and is READ-ONLY (no drop offered) with the
     explanation.
   - Create a single-column index, a multi-column index, and a UNIQUE index on
     `_ORAIDXTBL_` -> they appear with correct ordered columns + unique flags.
   - Edit one (change columns -> drop+recreate, confirmed); rename one; drop
     one (confirm).
   - Confirm the seeded schema's indexes list correctly and their
     PK/unique-backing indexes are marked read-only and never dropped.
   - Drop `_ORAIDX_*` and `_ORAIDXTBL_`.
4. Confirm no regression: indexes on PG/MySQL/SQLite/MariaDB still work
   (TASK 27 behavior unchanged).
5. npm run typecheck + npm run build clean.
6. Leave a clean state (dev server stopped; disposable objects dropped; seeded
   schema untouched).
7. Update COMPATIBILITY.md (Oracle: indexes now supported; note remaining
   staged Oracle areas).

# OUT OF SCOPE (later)
- Bitmap / function-based / partitioned / domain indexes, index rebuild
  (ALTER INDEX ... REBUILD), usage stats. Note as backlog.

# DONE = Oracle tables show an Indexes node listing indexes (ordered columns,
unique, constraint-backed/system flag, status) with create (basic B-tree,
UNIQUE, multi-column), edit (drop+recreate), rename (ALTER INDEX ... RENAME TO)
and drop (DROP INDEX name — no "ON table") via previewed DDL with
destructive-confirm, while PK/UNIQUE-constraint-backed and system indexes are
read-only with an explanation; verified on disposable objects against the real
Oracle XE container with the seeded schema untouched and no regression on the
other four engines; COMPATIBILITY.md updated; typecheck + build clean.
