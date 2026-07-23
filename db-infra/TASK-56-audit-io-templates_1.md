# TASK 56 (v2) — Full audit: import/export + routine/trigger templates across ALL SIX engines (AUTONOMOUS)
# Windows 11 / Docker Desktop. Depends on TASK 11/26/28/29/45/52/53/55/58/59/61.

# ROLE & CONTEXT
A systematic AUDIT + FIX pass over two areas that have repeatedly produced
dialect bugs, now across ALL SIX engines:
  PostgreSQL, MySQL, MariaDB, SQLite, Oracle, SQL Server.

PART A — IMPORT/EXPORT: every format, both directions, table + database dump +
restore.
PART B — CREATE TEMPLATES for functions, procedures, triggers (+ Oracle
packages) on every engine that supports them.

WHY: shared GENERIC FALLBACKS are silent on lenient engines and only break on
strict ones. Confirmed examples already found:
  - `dataType || 'text'` generic fallback -> ORA-00902 (TASK 55); it was SHARED
    by every engine and only Oracle caught it.
  - multi-row VALUES emitted for Oracle, which doesn't support it (TASK 55).
  - ISO date strings -> ORA-01858 on import; needed TO_TIMESTAMP (TASK 55).
  - MySQL 5.7 vs 8.0 collation changed object ordering (TASK 42).
  - Oracle rename fell through to MySQL's ALTER TABLE ... RENAME INDEX (TASK 51).
  - MariaDB display quoting used ANSI double quotes instead of backticks (T47).
Assume MORE of these exist. FIND THEM BY TESTING, not by reading code.

# ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local), npm run <script>, run app in dev + smoke
- Connect to all six: PG 5432, MySQL 3306, MariaDB 3308, Oracle 1522,
  MSSQL 1433, SQLite file
- Use chrome-devtools MCP for UI verification
- Create/edit/read files anywhere inside the db-tool project folder
- GIT: pull at the START (two-machine workflow); commit + push at the END when
  everything is verified working (authorized)

# ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; don't touch existing containers/data
- Use DISPOSABLE objects for every test (`_AUDIT_*` tables, routines, triggers,
  import/restore targets); drop them all afterward. NEVER import test rows into
  or alter the seeded customers/orders/order_items on ANY engine.
- NO git reset --hard / clean / force-push. NO host/system config changes;
  NO -g installs.
- No stray exported files left in the repo (check .gitignore covers them).
- ⚠️ DO NOT REWRITE WORKING CODE. Where a path already works, verify and leave
  it alone; change only what actually fails. "No change needed" is a valid
  outcome for any cell.

# ===== PART A — IMPORT/EXPORT AUDIT =====

## Matrix to cover (6 engines)
For EACH engine:
  EXPORT to: CSV, JSON, Excel (.xlsx), SQL
  IMPORT from: CSV, JSON, Excel
  Plus: single-TABLE dump, WHOLE-DATABASE dump, and RESTORE (execute .sql)

## Test data — one disposable table per engine with deliberately awkward values
  - auto-increment / IDENTITY / SERIAL primary key
  - a string with a single quote (O'Brien), a comma, a newline, a % and a _
  - an EMPTY STRING '' (note: on Oracle this becomes NULL — expected, but the
    behavior must be documented, not silently surprising)
  - a NULL
  - a decimal (NUMERIC/DECIMAL/NUMBER(p,s)) and a large integer
  - a date/time value WITH a time component (⚠️ Oracle DATE carries time) and,
    where supported, a timezone-aware timestamp
  - a boolean in that engine's representation (BOOLEAN / TINYINT(1) / BIT /
    NUMBER(1) / 0-1)
  - a JSON/JSONB column where supported
  - a long text value (TEXT/CLOB/NVARCHAR(MAX)/LONGTEXT)
  - Georgian unicode text (encoding check)
  - binary/blob if straightforward

## What to check per cell
1. EXPORT correctness: does the output use THAT engine's real column types and
   valid syntax? No generic "text"/"integer" leaking anywhere. Correct
   identifier quoting per engine — backticks (MySQL/MariaDB), double quotes
   (PG/SQLite/Oracle), brackets (MSSQL) — and quote-only-when-necessary per the
   TASK 47 display policy.
2. INSERT syntax validity per engine:
   - Oracle: NO multi-row VALUES (one INSERT per row) + TO_TIMESTAMP for dates.
   - MSSQL: multi-row VALUES allowed but capped at 1000 rows per statement ->
     chunked; N'' literals for unicode; IDENTITY_INSERT ON/OFF when explicit
     identity values are inserted; GO batch separators emitted where needed.
   - PG/MySQL/MariaDB/SQLite: batching preserved.
3. RESTORE / execute-SQL-file: dialect-aware statement splitting —
   - MSSQL: split on GO (own line, case-insensitive); CREATE PROC/FUNC/TRIGGER
     must start its batch.
   - Oracle/PG: PL/SQL and $$ bodies must not be split on ';'.
4. ROUND-TRIP: export -> import/execute into a DISPOSABLE target -> row count
   AND values match exactly (quotes, NULLs, empty strings, decimals, dates WITH
   time, unicode, JSON, long text). Re-open the imported table in the app:
   browsable and editable.
5. Encoding: UTF-8 correct in CSV/JSON/Excel (BOM option where relevant);
   Georgian text survives every format.
6. Filters honored: exporting "current filter" exports the filtered set, not
   just the current page.
7. Errors surface clearly — never silently truncate or skip rows.

# ===== PART B — ROUTINE / TRIGGER TEMPLATE AUDIT =====

For every engine, create each supported object type from the UNMODIFIED
template (filling only a name) and confirm it works:

- PostgreSQL: function (CREATE OR REPLACE FUNCTION ... RETURNS ... LANGUAGE
  plpgsql AS $$ ... $$), procedure, trigger (trigger function returning trigger
  + CREATE TRIGGER; NEW/OLD).
- MySQL / MariaDB: function (RETURNS ... DETERMINISTIC BEGIN ... END),
  procedure, trigger (BEFORE/AFTER ... FOR EACH ROW; NEW./OLD.). Bodies contain
  ';' -> single-statement execution must hold.
- Oracle: function (RETURN not RETURNS; IS/AS; IN/OUT), procedure, PACKAGE spec
  + body, trigger (:NEW/:OLD; CREATE OR REPLACE TRIGGER).
  ⚠️ Oracle CREATES objects even when PL/SQL fails to compile (marked INVALID)
  -> USER_ERRORS must be checked; a "successful" statement is NOT enough.
- SQL Server: scalar function (and TVFs if implemented), procedure (@params),
  trigger — ⚠️ NO BEFORE and NO FOR EACH ROW; uses AFTER/INSTEAD OF with the
  `inserted`/`deleted` pseudo-tables. CREATE OR ALTER (2016 SP1+) with fallback.
- SQLite: triggers only; functions/procedures correctly shown as unsupported.

## What to check per template
1. Creating from the UNMODIFIED template succeeds AND the object is VALID
   (Oracle: USER_ERRORS clean; MSSQL: no compile error).
2. It APPEARS in the tree with correct metadata/signature.
3. It ACTUALLY RUNS (call the function / EXEC the procedure / fire the trigger
   by doing the DML and observing the effect).
4. EDIT round-trip: open it -> definition loads correctly -> a small change
   applies.
5. Drop works.

# ===== WORK PLAN =====
1. `git pull` first; report what came in.
2. PART A: run the export/import matrix per engine with the awkward-data table;
   record PASS / FAIL(+exact failure) for every cell BEFORE fixing anything.
3. Fix the failures (prefer ONE shared dialect-aware layer over duplicated
   logic); re-test the fixed cells; then re-run the WHOLE matrix once more.
4. PART B: create each object type from the unmodified template on each
   supporting engine; record PASS/FAIL; fix broken templates; re-test.
5. Clean up ALL disposable objects/targets/files; verify seeded data intact on
   every engine (e.g. customers row counts unchanged).
6. Regression: full smoke suite on all six engines; npm run typecheck + build
   clean; package:dir clean.
7. Update COMPATIBILITY.md with both matrices and any documented limitations.
8. COMMIT + PUSH; report the commit hash.

# REPORT
Give the user:
  (1) Import/Export matrix: engine × format × direction = PASS / FIXED / FAIL(+why)
  (2) Templates matrix: engine × object type = PASS / FIXED / FAIL(+why)
  (3) Every bug found and what changed for it
  (4) Anything left unfixed and why
  (5) The commit hash pushed
Be explicit about cells where NO change was needed.

# DONE = every import/export path (CSV/JSON/Excel/SQL, table + database dump,
restore) has been TESTED on all six engines with awkward data (quotes, empty
strings, NULLs, decimals, dates-with-time, unicode, JSON, long text) and
round-trips correctly with engine-correct types, quoting, INSERT syntax and
batch splitting (Oracle single-row + TO_TIMESTAMP; MSSQL 1000-row chunks,
N'' literals, IDENTITY_INSERT, GO batching); every function/procedure/trigger
(+Oracle package) template creates a VALID, listed, runnable, editable object
from the UNMODIFIED template on every supporting engine; all found bugs fixed
without rewriting working code; disposables cleaned and seeded data intact;
no regression across the six engines; COMPATIBILITY.md updated with both
matrices; typecheck/build/package clean; work COMMITTED AND PUSHED with the
hash reported.
