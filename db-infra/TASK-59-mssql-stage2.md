# TASK 59: DB Tool — MSSQL Stage 2: indexes, triggers, functions, procedures, templates, import/export, ER diagram (+ commit) (AUTONOMOUS)
# Windows 11 / Docker Desktop. Depends on TASK 26/27/28/29/53/56/58.

# ROLE & CONTEXT
Complete Microsoft SQL Server support (stage 2) and VERIFY IT END TO END:
  A. INDEXES (tree node: list/create/edit/rename/drop)
  B. TRIGGERS (list/create/edit/enable-disable/drop)
  C. FUNCTIONS + PROCEDURES (list/create/edit/drop)
  D. TEMPLATES for all of the above must be VALID T-SQL and work UNMODIFIED
  E. IMPORT/EXPORT — every format, both directions, table + database dump +
     restore
  F. ER DIAGRAM — render (FKs) and, where applicable, edit
Then FIX anything broken, RE-VERIFY, and when everything is in a working state,
COMMIT AND PUSH to GitHub.

Follow the lesson from TASK 51/55/58: SHARED GENERIC FALLBACKS silently
mis-handle strict/different dialects. TEST, don't just read code.

# ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local), npm run <script>, run app in dev + smoke
- Connect to the running MSSQL container (dbtool-mssql, 1433) and the others
- Use chrome-devtools MCP for UI verification
- Create/edit/read files anywhere inside the db-tool project folder
- GIT: at the END, when everything verified working — commit and push
  (the user has explicitly authorized this). Use the same identity/no-Claude-
  trailer convention as before.

# ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; don't touch existing containers/data
- Use DISPOSABLE objects (`_MSTEST_*`) and a disposable import/restore target;
  drop them all afterward. NEVER alter the seeded customers/orders/order_items.
- NO host/system config changes; NO -g installs.
- No stray exported files committed.

# ===== MSSQL DIALECT SPECIFICS (get these right — generic code WILL break) ====

## Triggers (biggest divergence)
- NO "BEFORE" triggers. Only AFTER (a.k.a. FOR) and INSTEAD OF.
- NO "FOR EACH ROW". MSSQL triggers are STATEMENT-level; row data is accessed
  via the special pseudo-tables `inserted` and `deleted` (NOT NEW/OLD, NOT
  :NEW/:OLD). Templates MUST use inserted/deleted.
- Syntax:
    CREATE OR ALTER TRIGGER [schema].[name]
      ON [schema].[table]
      AFTER INSERT, UPDATE          -- or INSTEAD OF INSERT
    AS
    BEGIN
      SET NOCOUNT ON;
      -- use inserted / deleted
    END
- CREATE OR ALTER requires SQL Server 2016 SP1+. DETECT version; fall back to
  DROP + CREATE on older, with a confirm.
- ENABLE/DISABLE: ENABLE TRIGGER name ON table / DISABLE TRIGGER name ON table.
- Catalog: sys.triggers (+ sys.sql_modules / OBJECT_DEFINITION for the body),
  is_disabled flag.

## Indexes
- CREATE [UNIQUE] [CLUSTERED | NONCLUSTERED] INDEX name ON schema.table (cols)
  — CLUSTERED vs NONCLUSTERED is an MSSQL concept; expose at least
  NONCLUSTERED (default) and UNIQUE; treat CLUSTERED carefully (a table can
  have only ONE clustered index, and the PK is usually clustered).
- DROP INDEX name ON schema.table;  — NOTE: MSSQL DOES include "ON table"
  (unlike Oracle, which does not). Do not reuse the Oracle form.
- RENAME: EXEC sp_rename 'schema.table.index_name', 'new_name', 'INDEX';
- No ALTER to change indexed columns -> DROP + CREATE (confirm).
- PK/UNIQUE-constraint-backed indexes: READ-ONLY (must drop the constraint
  instead) — same protection pattern as TASK 27/51. Detect via
  sys.indexes.is_primary_key / is_unique_constraint.
- Catalog: sys.indexes + sys.index_columns + sys.columns.

## Functions (THREE kinds) and Procedures
- Scalar function:
    CREATE OR ALTER FUNCTION [schema].[name] (@p1 INT)
    RETURNS INT
    AS
    BEGIN
      RETURN @p1 * 2;
    END
- Inline table-valued function (IF):
    CREATE OR ALTER FUNCTION [schema].[name] (@p1 INT)
    RETURNS TABLE
    AS
    RETURN (SELECT ... WHERE col = @p1);
- Multi-statement table-valued function (TF):
    CREATE OR ALTER FUNCTION [schema].[name] (@p1 INT)
    RETURNS @result TABLE (id INT, name NVARCHAR(100))
    AS
    BEGIN
      INSERT INTO @result ...;
      RETURN;
    END
- Procedure:
    CREATE OR ALTER PROCEDURE [schema].[name] (@p1 INT, @p2 NVARCHAR(50) OUTPUT)
    AS
    BEGIN
      SET NOCOUNT ON;
      ...
    END
- Catalog: sys.objects where type IN ('FN' scalar, 'IF' inline TVF,
  'TF' multi-statement TVF, 'P' procedure, 'TR' trigger); parameters via
  sys.parameters; definition via sys.sql_modules.definition /
  OBJECT_DEFINITION(object_id).
- Provide templates for at least: scalar function, procedure, trigger. Offer
  the TVF variants if straightforward (at minimum scalar + procedure must work
  unmodified).
- CREATE OR ALTER (2016 SP1+) for edit; DROP+CREATE fallback on older.

## ⚠️ GO batch separator (critical for import/restore)
`GO` is a CLIENT-side batch separator, NOT T-SQL. Scripts (including ones the
app generates or a user provides) commonly contain GO lines. The restore /
"execute SQL file" path MUST split on GO (on its own line, case-insensitive,
optionally followed by a count) and send each batch separately — a naive
";"-split or sending GO to the server will fail. Also: CREATE PROCEDURE/
FUNCTION/TRIGGER must be the FIRST statement in its batch, so generated scripts
should emit GO around them.

## Import/Export specifics
- Types: emit real MSSQL types (INT/BIGINT, DECIMAL(p,s), NVARCHAR(n)/
  NVARCHAR(MAX), DATETIME2, BIT, UNIQUEIDENTIFIER, VARBINARY(MAX)) — never
  generic "text" (the TASK 55 bug class).
- IDENTITY: exported CREATE TABLE keeps IDENTITY(1,1). To import rows WITH
  explicit identity values you must wrap:
      SET IDENTITY_INSERT schema.table ON;  ... inserts ... ;
      SET IDENTITY_INSERT schema.table OFF;
  Implement this (or omit identity columns and let the server assign) —
  choose one, be consistent, document it.
- MULTI-ROW VALUES: MSSQL supports it but is LIMITED TO 1000 rows per INSERT
  statement — chunk batches accordingly (don't emit a 5000-row VALUES list).
- Unicode: use N'...' literals for NVARCHAR values so Georgian/unicode survives.
- Bracket quoting per TASK 47 policy in displayed SQL.

## ER diagram
- FKs from sys.foreign_keys + sys.foreign_key_columns (or
  INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS). Render tables + PK/FK markers +
  relationship edges like the other engines.
- Edit (create FK by drawing, drop FK, new/edit table) requires the MSSQL DDL
  generator — implement if the designer DDL is in place; if the table designer
  for MSSQL isn't implemented yet, IMPLEMENT the minimum needed (CREATE/ALTER
  TABLE, ADD/DROP CONSTRAINT FK) so ER edit works, or clearly report ER as
  render-only for MSSQL and note why.

# ===== WORK PLAN =====

## Phase 1 — implement/enable
1. Indexes (A), triggers (B), functions+procedures (C) for MSSQL in the driver
   + wire into the existing tree/IPC/UI (extend, don't fork). Include the
   MSSQL table designer DDL if needed for ER edit (F).
2. Templates (D): valid T-SQL templates using @params, inserted/deleted,
   BEGIN/END, CREATE OR ALTER (with version fallback).
3. Import/export (E): MSSQL types, IDENTITY_INSERT handling, 1000-row VALUES
   chunking, N'' unicode literals, GO batching in generated scripts, GO-aware
   splitting in the restore path.
4. ER diagram (F): FK introspection + render; edit if DDL available.

## Phase 2 — verify (test, don't assume)
Using DISPOSABLE `_MSTEST_*` objects on the MSSQL container:
- INDEXES: create single/multi-column/UNIQUE; verify PK-backing index is
  read-only; edit (drop+recreate); rename via sp_rename; drop.
- TRIGGERS: create an AFTER INSERT trigger from the UNMODIFIED template that
  uses `inserted` -> applies and ACTUALLY FIRES (insert a row, observe the
  effect); edit via CREATE OR ALTER; DISABLE -> doesn't fire; ENABLE -> fires;
  drop. Also create an INSTEAD OF trigger on a view if quick.
- FUNCTIONS/PROCEDURES: create a scalar function and a procedure from the
  UNMODIFIED templates -> they apply, APPEAR in the tree with signatures, and
  actually run (SELECT dbo.fn(...) / EXEC dbo.proc ...). Edit round-trips
  (definition loads from sys.sql_modules) and re-applies. Drop works. Try a
  TVF if implemented.
- IMPORT/EXPORT: with a disposable table containing awkward data (IDENTITY PK,
  O'Brien quote, comma, newline, %, _, NULL, DECIMAL, DATETIME2, BIT, Georgian
  unicode, NVARCHAR(MAX) long text): export to CSV, JSON, Excel, SQL; import
  each back into a disposable target; verify row counts and values match
  exactly. Table dump AND database dump; restore via execute-SQL-file
  (confirm GO batching works and CREATE PROC/TRIGGER batches succeed).
- ER DIAGRAM: open it on the MSSQL connection -> tables render with PK/FK
  markers and the seeded FK relationships appear as edges; if edit is
  implemented, draw an FK between disposable tables, then drop it.
- Confirm the seeded schema is untouched (customers=20) and drop all
  disposables.

## Phase 3 — fix, re-verify, regress-check
- Fix every failure found; RE-RUN the whole Phase 2 verification afterward
  (not just the fixed item).
- Regression: run the full smoke suite for PostgreSQL, MySQL, MariaDB, SQLite,
  Oracle — nothing may break.
- npm run typecheck + npm run build clean; package:dir still packages cleanly.

## Phase 4 — commit + push (AUTHORIZED)
Once everything above is verified WORKING:
- Update COMPATIBILITY.md + README (MSSQL stage 2 supported; list anything
  still staged/limited).
- Ensure .gitignore covers build output, release/, .smoke, exported files,
  .env; no secrets (the SA password should not be committed in plain text if
  it's a real credential — use the compose env/example pattern already used).
- git add + commit with a clear message summarizing MSSQL stage 2, then PUSH.
- Report the commit hash and what was pushed.

# REPORT
Give the user: (1) a matrix of MSSQL stage-2 features = PASS/FIXED/FAIL(+why),
(2) an import/export matrix (format × direction), (3) what was fixed, (4)
anything left limited/staged and why, (5) the commit hash pushed.

# DONE = MSSQL indexes, triggers, functions and procedures are fully manageable
with VALID T-SQL templates that work unmodified (AFTER/INSTEAD OF + inserted/
deleted, @params, CREATE OR ALTER with version fallback), all import/export
paths (CSV/JSON/Excel/SQL, table + DB dump, restore with GO-aware batching,
IDENTITY_INSERT, 1000-row chunking, N'' unicode) round-trip correctly, the ER
diagram renders MSSQL FKs (and supports edit or is documented as render-only),
every failure found was fixed and RE-VERIFIED, no regression on the other five
engines, typecheck/build/package clean, docs updated — and the work is
COMMITTED AND PUSHED to GitHub with the hash reported.
