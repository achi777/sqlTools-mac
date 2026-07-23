# TASK 61: DB Tool — Oracle remaining staged areas: views create/edit, ER-diagram edit, data-transfer mapping (AUTONOMOUS)
# Windows 11 / Docker Desktop. Depends on TASK 11/22/31/45/46/51/52/53/55.

# ROLE & CONTEXT
Complete the three Oracle areas still marked "staged":
  A. VIEWS — create / edit / drop (listing already works)
  B. ER DIAGRAM — edit for Oracle (create/drop FK by drawing, new/edit/drop
     table from the diagram); render should already work — verify it does
  C. DATA TRANSFER — Oracle type mapping in the transfer wizard, both
     directions (Oracle <-> PG / MySQL / MariaDB / SQLite / MSSQL)
Then FIX what's broken, RE-VERIFY, and commit + push when working.

Heed the recurring lesson (TASK 51/55/58): shared GENERIC FALLBACKS silently
mis-handle Oracle. TEST, don't just read code.

# ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local), npm run <script>, run app in dev + smoke
- Connect to all running containers (PG 5432, MySQL 3306, MariaDB 3308,
  Oracle 1522, MSSQL 1433, SQLite file)
- Use chrome-devtools MCP for UI verification
- Create/edit/read files anywhere inside the db-tool project folder
- GIT: at the END, when verified working — commit and push (authorized)

# ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; don't touch existing containers/data
- Use DISPOSABLE objects (`_ORAV_*`, `_ORAER_*`, `_ORAXF_*`) and disposable
  transfer TARGET schemas/databases; drop everything afterward. NEVER alter the
  seeded customers/orders/order_items on any engine.
- NO git reset --hard / clean / force-push. NO host/system config changes;
  NO -g installs.
- Pull latest from GitHub FIRST (the user works on two machines) before
  changing anything.

# ===== PART A — ORACLE VIEWS: VERIFY FIRST, FIX ONLY GAPS =====
⚠️ IMPORTANT: the user reports Oracle view CREATE/EDIT ALREADY WORKS (views are
the most dialect-neutral object — CREATE OR REPLACE VIEW ... AS SELECT is
identical across PG/MySQL/Oracle, so the generic path likely already handles
it). Therefore:

**DO NOT REWRITE OR REIMPLEMENT WORKING CODE.** Part A is a VERIFY-then-
patch-gaps exercise, not an implementation exercise.

Step A1 — VERIFY what already works (test, don't assume), on the real Oracle
container with DISPOSABLE objects:
  - Create a view from the UI (New View) with an unmodified template.
  - Open its data in the paginated grid.
  - Edit it (change the SELECT) and re-apply; confirm the definition
    round-trips correctly into the editor.
  - Drop it.
  - Confirm it lists correctly in the Views node and is NOT mixed up with
    materialized views.
Report exactly what passed.

Step A2 — ONLY fix what actually fails. Likely candidates (check, don't
pre-emptively change):
  - Definition round-trip: ALL_VIEWS.TEXT is a LONG column and can read
    awkwardly/truncated. If the editor loads the definition correctly today,
    LEAVE IT ALONE. Only if it fails/truncates, switch to
    DBMS_METADATA.GET_DDL('VIEW', name, owner) with an ALL_VIEWS.TEXT fallback.
  - Table aliases in any generated view SELECT must omit "AS" on Oracle
    (TASK 49) — verify a view built via the Visual View Builder still saves.
  - Materialized views (ALL_MVIEWS) are a DIFFERENT object type — if they leak
    into the Views node, separate/mark them; otherwise leave as is.
  - Optional clauses (WITH READ ONLY / WITH CHECK OPTION / FORCE): only ADD
    these if they're missing AND adding them doesn't disturb the working path.
    If in doubt, skip and note it as backlog.

If everything in A1 passes, report "Part A: already working, no changes made"
and move on. Making no change is a valid, preferred outcome here.

# ===== PART B — ORACLE ER DIAGRAM EDIT =====
- RENDER: verify tables + PK/FK markers + FK relationship edges already appear
  for Oracle. FK introspection: ALL_CONSTRAINTS (CONSTRAINT_TYPE='R') joined to
  ALL_CONS_COLUMNS, resolving the referenced table/columns via
  R_CONSTRAINT_NAME -> the parent constraint. Fix if missing/incorrect.
- EDIT:
  - Create FK by drawing: ALTER TABLE child ADD CONSTRAINT name FOREIGN KEY
    (cols) REFERENCES parent (cols) [ON DELETE CASCADE | ON DELETE SET NULL].
    ⚠️ Oracle has NO "ON UPDATE" — the FK dialog must not offer it for Oracle
    (already enforced in TASK 46's fkClause — reuse, don't duplicate).
  - Drop FK: ALTER TABLE child DROP CONSTRAINT name (confirm).
  - New/Edit table from the diagram: reuse the TASK 46 Oracle DDL generator.
  - Drop table: DROP TABLE name CASCADE CONSTRAINTS (confirm; typed name).
    Note Oracle's recycle bin — consider PURGE and mention it in the confirm.
- Layout persistence, export PNG/SVG etc. should work as for other engines —
  verify.

# ===== PART C — DATA TRANSFER TYPE MAPPING (Oracle both directions) =====
Extend the TASK 31 type-translation matrix with Oracle as SOURCE and TARGET.

## Oracle -> others (map + WARN where lossy)
- NUMBER(p,s) -> NUMERIC/DECIMAL(p,s).
- NUMBER with NO precision (arbitrary precision) -> NUMERIC (PG) /
  DECIMAL(38,10) or DOUBLE (MySQL/MSSQL) — WARN (precision may be lost).
- VARCHAR2(n) -> VARCHAR(n); NVARCHAR2 -> NVARCHAR/VARCHAR.
- CLOB/NCLOB -> TEXT (PG) / LONGTEXT (MySQL) / NVARCHAR(MAX) (MSSQL) /
  TEXT (SQLite).
- ⚠️ ORACLE "DATE" INCLUDES A TIME COMPONENT (it is not a pure date) ->
  map to TIMESTAMP / DATETIME2, NOT to a date-only type. WARN if the target
  would truncate.
- TIMESTAMP WITH TIME ZONE -> timestamptz (PG) / DATETIMEOFFSET (MSSQL) /
  DATETIME (MySQL, WARN: tz dropped).
- BLOB/RAW -> BYTEA (PG) / LONGBLOB (MySQL) / VARBINARY(MAX) (MSSQL) /
  BLOB (SQLite).
- Oracle (pre-23c) has NO native BOOLEAN; NUMBER(1) is the convention ->
  map to BOOLEAN/BIT with a WARN (heuristic).
- ROWID / INTERVAL / spatial / user-defined types -> VARCHAR/TEXT with a clear
  WARN, or let the user choose/skip the column.

## others -> Oracle
- SERIAL / AUTO_INCREMENT / IDENTITY(1,1) -> NUMBER GENERATED BY DEFAULT AS
  IDENTITY (reuse TASK 46).
- BOOLEAN / BIT / TINYINT(1) -> NUMBER(1) (WARN).
- TEXT / LONGTEXT / NVARCHAR(MAX) -> CLOB.
- JSON / JSONB -> CLOB (WARN; or JSON on 21c+ — detect if trivial).
- PG arrays (TEXT[]) -> CLOB/JSON string (WARN: array flattened).
- UUID -> VARCHAR2(36). BYTEA/VARBINARY -> BLOB.
- timestamptz -> TIMESTAMP WITH TIME ZONE.

## ⚠️ CRITICAL ORACLE SEMANTIC TRAP — empty string == NULL
In Oracle, an EMPTY STRING '' IS STORED AS NULL. Transferring from an engine
where '' and NULL are DISTINCT (PostgreSQL, MSSQL, MySQL) into Oracle will
SILENTLY convert '' to NULL — a real data-semantics change.
- DETECT this case (target = Oracle, source column is a string type) and show
  a clear WARNING in the transfer preview ("empty strings will be stored as
  NULL in Oracle").
- Also handle the reverse direction sensibly (Oracle NULL -> target NULL; you
  cannot recover which were originally '').
Do NOT silently ignore this.

## Also
- Transfer must use the Oracle INSERT rules from TASK 55 (no multi-row VALUES;
  TO_TIMESTAMP for date literals if literals are used — prefer parameterized
  binds).
- Identifier casing/quoting per TASK 46 so transferred tables are readable and
  editable in the app afterwards.

# ===== WORK PLAN =====
1. git pull first (two-machine workflow). Report what came in.
2. Implement A, B, C (reuse existing generators/UI; extend, don't fork).
3. VERIFY with disposable objects on the real containers:
   A. Views: create `_ORAV_ACTIVE` from the template unmodified -> applies,
      appears, "open view data" shows rows; edit it (change the SELECT) via
      CREATE OR REPLACE -> round-trips into the editor correctly; try WITH READ
      ONLY; drop it.
   B. ER: open the diagram on Oracle -> seeded tables render with PK/FK markers
      and the existing FK edges. Create `_ORAER_P` / `_ORAER_C`, DRAW an FK
      (with ON DELETE CASCADE) -> real constraint created, edge appears; drop
      the FK; edit a table via the designer from the diagram; drop both tables;
      layout persists; PNG export works.
   C. Transfer: Oracle -> PostgreSQL and Oracle -> MSSQL of a disposable table
      containing NUMBER(p,s), NUMBER (no precision), VARCHAR2, CLOB, DATE
      (with a time component!), TIMESTAMP WITH TIME ZONE, BLOB, NUMBER(1) as
      boolean -> correct target types, WARNINGS shown in preview, row counts +
      values match (check the DATE keeps its time!).
      Then PostgreSQL -> Oracle and MSSQL -> Oracle of a table containing
      SERIAL/IDENTITY, boolean, TEXT, JSON/JSONB, a UUID, AND an EMPTY STRING
      value -> identity maps to Oracle IDENTITY, the empty-string-becomes-NULL
      WARNING is shown, and the data lands correctly.
      Verify a quoted value (O'Brien) and Georgian unicode survive both ways.
      Drop all disposable targets.
4. FIX everything that fails; RE-RUN the whole verification afterwards.
5. Regression: full smoke suite on all six engines; typecheck + build clean;
   package:dir clean.
6. Update COMPATIBILITY.md + README (Oracle: views/ER-edit/transfer supported;
   list remaining limitations e.g. materialized views).
7. COMMIT + PUSH; report the commit hash.

# REPORT
Give: (1) Views/ER/Transfer = PASS/FIXED/FAIL(+why); (2) the Oracle transfer
type-mapping matrix with the warnings it emits; (3) explicit confirmation that
the empty-string->NULL warning appears; (4) what was fixed; (5) commit hash.

# DONE = Oracle views are VERIFIED working (create/edit/drop + data viewable),
with changes made ONLY where verification actually failed (no rewrite of
working code); the ER diagram renders
Oracle FKs and supports drawing/dropping FKs (no ON UPDATE offered) plus
table create/edit/drop via the TASK 46 generator; the data-transfer wizard maps
Oracle types in BOTH directions with explicit warnings for lossy cases —
including the critical empty-string-becomes-NULL warning and Oracle DATE's time
component — verified with disposable objects on the real containers in both
directions; everything re-verified after fixes, no regression on the six
engines, docs updated, and the work COMMITTED AND PUSHED with the hash
reported.
