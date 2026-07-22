# TASK 48: DB Tool — Oracle Sequences (list/create/alter/drop) (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 25/45/46.

# ROLE & CONTEXT
Oracle currently shows "Sequences — later stage" in the tree (a placeholder from
TASK 45, which staged advanced Oracle object management). Oracle DOES have
sequences (and uses them heavily), so implement full Oracle sequence support:
list with details, create, alter (incl. RESTART-equivalent), rename, drop —
mirroring what TASK 25 did for PostgreSQL. Architecture unchanged: DB work in
main; renderer via typed IPC; destructive ops confirmed.

Prereq: TASK 25 (PostgreSQL sequences: tree node, list/details/create/alter/
drop UI + IPC — REUSE that UI/flow), TASK 45 (Oracle driver, ALL_* catalog,
Thin mode), TASK 46 (Oracle DDL generator + identifier quoting policy).

# ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local), npm run <script>, run app in dev + smoke
- Connect to the running Oracle XE container (dbtool-oracle, port 1522)
- Use chrome-devtools MCP for UI verification
- Create/edit/read files anywhere inside the db-tool project folder

# ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; don't touch existing containers.
- Verify with DISPOSABLE `_ORASEQ_*` sequences; NEVER alter/drop sequences that
  back the seeded schema's IDENTITY columns or existing objects. Clean up.
- Dropping a sequence that something depends on is destructive -> confirm +
  warn.
- NO host/system config changes; NO -g installs.

# ORACLE SEQUENCE SPECIFICS (vs PostgreSQL)
- Catalog: ALL_SEQUENCES / USER_SEQUENCES (columns: SEQUENCE_OWNER,
  SEQUENCE_NAME, MIN_VALUE, MAX_VALUE, INCREMENT_BY, CYCLE_FLAG, ORDER_FLAG,
  CACHE_SIZE, LAST_NUMBER).
- CREATE: CREATE SEQUENCE name START WITH n INCREMENT BY n MINVALUE n
  MAXVALUE n | NOMAXVALUE CACHE n | NOCACHE CYCLE | NOCYCLE ORDER | NOORDER.
- ALTER: ALTER SEQUENCE name INCREMENT BY n MAXVALUE ... CACHE ... CYCLE ...
  NOTE: Oracle canNOT change START WITH via ALTER. To "restart", either
  (a) 12c+/18c+: ALTER SEQUENCE name RESTART [START WITH n] (supported in
  12.2+/18c+ — detect version and use if available), or
  (b) fallback: DROP + CREATE with the new START WITH (destructive -> confirm,
  and warn that dependent defaults/triggers may be affected).
  Implement (a) with a graceful fallback to (b) + clear messaging.
- RENAME: RENAME old_name TO new_name  (Oracle uses the RENAME statement).
- DROP: DROP SEQUENCE name (confirm).
- Current value: LAST_NUMBER from ALL_SEQUENCES (note it reflects cache, not
  necessarily the exact next value; display it with that caveat). Avoid calling
  NEXTVAL just to display a value (that would consume a number).
- IDENTITY columns (12c+) create internal system-generated sequences named
  ISEQ$$_xxxxx — these should be shown as SYSTEM/read-only (or filtered out by
  default with a toggle), NEVER offered for drop/alter as if user-created.
- Identifier quoting: follow the TASK 46 policy (consistent quoted uppercase for
  execution) and TASK 47 policy for any displayed SQL.

# FEATURES
1. TREE: replace the "later stage" placeholder — Oracle connections show a real
   Sequences node listing the schema's sequences (excluding or marking
   system/IDENTITY-backing ISEQ$$ ones). Context menu: New Sequence; on an
   existing user sequence: Edit, Rename, Drop (confirm); on a system one:
   read-only with an explanation.
2. LIST + DETAILS: name, increment, min, max, cache, cycle, order, last number
   (with the cache caveat noted in the UI).
3. CREATE: form (name, start with, increment, min, max, cache/nocache, cycle/
   nocycle) -> CREATE SEQUENCE DDL preview -> apply -> refresh tree.
4. ALTER: edit increment/min/max/cache/cycle -> ALTER SEQUENCE. Plus a
   RESTART action: use ALTER SEQUENCE ... RESTART START WITH n where supported
   (version-detect), else offer DROP+CREATE with an explicit destructive
   confirm + dependency warning.
5. RENAME + DROP with confirms.
6. Reuse the TASK 25 sequence UI/flows where possible; add Oracle-specific
   fields/behaviors rather than duplicating the whole UI.

# STEPS (autonomous, in order)
1. Implement Oracle sequence support in the Oracle driver: listSequences (+
   system/ISEQ$$ flagging), getSequenceDetails, create/alter/restart/rename/
   drop DDL. Wire into the existing sequence IPC used by TASK 25 (extend, don't
   fork, the interface).
2. Replace the tree's "later stage" note with the real Sequences node for
   Oracle; wire context menu + forms (reusing TASK 25 UI, with Oracle fields).
3. Version-detect for ALTER ... RESTART; implement the DROP+CREATE fallback
   with clear destructive confirm.
4. Verify against the Oracle XE container using DISPOSABLE objects:
   - List: the seeded schema's sequences appear; IDENTITY-backing ISEQ$$
     sequences are marked system/read-only (or filtered) and are NOT
     droppable via the UI.
   - Create `_ORASEQ_TEST` (custom start/increment/cache) -> appears with
     correct details.
   - Alter it (change increment, cache, cycle) -> applies; details refresh.
   - Restart it to a new value -> works via ALTER ... RESTART if supported,
     else the confirmed DROP+CREATE fallback; verify by selecting
     _ORASEQ_TEST.NEXTVAL once and checking the value (then note that this
     consumed a number).
   - Rename it; drop it (confirm).
   - Confirm the seeded schema + its IDENTITY sequences are untouched
     (customers still 20 rows, identity still works: insert a row, it gets an
     id).
5. Confirm no regression: PostgreSQL sequences (TASK 25) still work; MySQL/
   SQLite still show their correct "not supported" notes; MariaDB sequences
   (TASK 43) still work.
6. npm run typecheck + npm run build clean.
7. Leave a clean state (dev server stopped; `_ORASEQ_*` dropped; seeded schema
   intact).

# OUT OF SCOPE (still staged for Oracle)
- Oracle triggers/functions/procedures/packages management, Oracle dump/restore
  dialect, Oracle in ER-diagram edit + data-transfer type mapping. Note in
  COMPATIBILITY.md which Oracle areas remain staged.

# DONE = Oracle connections show a real Sequences node (no "later stage"
placeholder) with list + details (incl. last number w/ cache caveat), and
support create, alter, restart (ALTER ... RESTART where supported, else a
confirmed DROP+CREATE fallback), rename, and drop — with system/IDENTITY-backing
ISEQ$$ sequences marked read-only and never droppable via the UI — verified on
disposable sequences against the real Oracle XE container with the seeded schema
and its identity sequences untouched, and no regression to PG/MariaDB sequences;
COMPATIBILITY.md updated; typecheck + build clean.
