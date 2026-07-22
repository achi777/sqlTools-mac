# TASK 25: DB Tool — Sequences (PostgreSQL) (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 04/05/11.

# ROLE & CONTEXT
Add SEQUENCE management for PostgreSQL: list sequences as a top-level tree node
(under the schema, Navicat-style), view/edit their properties, see current
value, and create/alter/drop sequences. Sequences are essentially a
PostgreSQL feature; MySQL and SQLite don't have standalone sequences — show the
node as not-applicable for them (never error). Architecture unchanged: DB work
in main; renderer via typed IPC; destructive ops confirmed.

Prereq: TASK 04 (catalog + tree + IPC), TASK 05 (DDL generators +
destructive-confirm), TASK 11 (pattern for adding a new object category to the
tree with list/create/edit/drop).

# ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local), npm run <script>, run app in dev to smoke-test
- Use chrome-devtools MCP for visual verification if helpful
- Connect to TASK 01 databases to create/verify sequences
- Create/edit/read files anywhere inside the db-tool project folder

# ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; NO deletes outside project; NO rm -rf outside it
- NO host/system config changes; NO -g global installs
- Verify with DISPOSABLE `_seqtest_*` sequences; never drop/alter sequences
  that back the seeded tables' SERIAL columns. Clean up test sequences.
- Dropping a sequence that a column depends on is destructive -> confirm +
  warn. If a sequence is owned by a SERIAL column, note the dependency.

# ENGINE MATRIX
- PostgreSQL: ✅ full support (CREATE/ALTER/DROP SEQUENCE, currval/last_value).
- MySQL: ❌ no standalone sequences (uses AUTO_INCREMENT) -> show the Sequences
  node as unavailable with a short note ("MySQL uses AUTO_INCREMENT; no
  standalone sequences").
- SQLite: ❌ no sequences (rowid/AUTOINCREMENT; there is an internal
  sqlite_sequence table for AUTOINCREMENT tables — you MAY optionally show it
  read-only, but do NOT present it as editable sequences). Default: node
  unavailable with a note.

# FEATURES (PostgreSQL)
1. TREE: a "Sequences" node under each schema (PG only). Lazy-load the list
   from pg_catalog/information_schema (information_schema.sequences, and
   pg_sequences for current values / last_value in PG 10+). Context menu:
   New Sequence; on an existing one: Edit, Drop (confirm), and "View current
   value".
2. LIST + DETAILS: for each sequence show name, data type, start, increment,
   min, max, cache, cycle, owned-by column (if any), and current/last value
   (pg_sequences.last_value or a safe read; note that last_value may be null
   until first use).
3. CREATE: a form to define a sequence (name, increment, min, max, start,
   cache, cycle, optionally OWNED BY a column) -> generate CREATE SEQUENCE DDL,
   preview, apply, refresh tree.
4. ALTER: edit properties -> ALTER SEQUENCE DDL (increment/min/max/restart/
   cache/cycle/owned by). RESTART value is a common action — expose it clearly.
   Preview + apply. (Renaming = ALTER SEQUENCE ... RENAME TO.)
5. DROP: confirm; if OWNED BY / depended on by a column, warn clearly in the
   confirm dialog (dropping may break a column default). Generate DROP
   SEQUENCE, apply, refresh.
6. All DDL generated + executed in main; errors surfaced clearly.

# STEPS (autonomous, in order)
1. Add listSequences + getSequenceDetails + sequence DDL (create/alter/drop/
   restart/rename) as typed IPC in main (PG driver). MySQL/SQLite return a
   "not supported" flag. Preload whitelist.
2. Tree: add the Sequences node (PG only; unavailable+note for MySQL/SQLite);
   lazy load; context menu.
3. Build list/details view + create form + alter form (incl. RESTART) + drop
   confirm (with dependency warning).
4. Verify against TASK 01 Postgres using DISPOSABLE objects:
   - List existing sequences: the SERIAL columns of customers/orders/
     order_items imply owned sequences -> confirm they appear with correct
     owned-by + a current/last value.
   - Create `_seqtest_s` (custom increment/start); it appears; view its value.
   - ALTER it (change increment; RESTART to a value); confirm via a SELECT
     nextval or the shown last_value that it took effect.
   - Rename it; drop it (confirm). Ensure the seeded tables' own sequences were
     never altered/dropped.
   - On MySQL and SQLite: confirm the Sequences node shows "not supported"
     note and does NOT crash.
5. npm run typecheck + npm run build clean.
6. Leave a clean state (dev server stopped; `_seqtest_*` dropped; seeded
   sequences untouched).

# OUT OF SCOPE (later)
- Triggers (TASK 26), Indexes-as-tree-node (TASK 27), materialized views,
  types/enums as objects, extensions. Note as backlog.

# DONE = PostgreSQL sequences appear as a top-level tree node with list +
details (incl. current/last value + owned-by), and can be created, altered
(incl. RESTART + rename), and dropped via previewed DDL with dependency-aware
destructive-confirm; MySQL/SQLite show the node as cleanly unavailable with a
note; verified on disposable sequences with seeded sequences untouched;
typecheck + build clean.
