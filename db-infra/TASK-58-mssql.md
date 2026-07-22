# TASK 58: DB Tool — Add Microsoft SQL Server as an engine (Stage 1: basics) (AUTONOMOUS)
# Windows 11 / Docker Desktop + WSL2. Depends on TASK 45 (the Oracle staging pattern) + the built app.

# ROLE & CONTEXT
Add Microsoft SQL Server (MSSQL) as a first-class engine alongside PostgreSQL,
MySQL, MariaDB, SQLite, and Oracle. Set up MSSQL on Docker, wire a driver, and
implement the BASICS (connection, tree, browse, autocomplete, CRUD, filters).
Advanced object management (designer/DDL, indexes, triggers, routines, dump,
transfer, ER-edit) is STAGE 2 — note it as staged, exactly like TASK 45 did for
Oracle. The user authorized autonomous Docker use on this empty dev machine.

Follow the Oracle precedent: reuse the DbDriver interface, add MSSQL as its own
engine, and be explicit about dialect differences. Also heed the lesson from
TASK 51/55: watch for SHARED GENERIC FALLBACKS (e.g. `dataType || 'text'`,
MySQL-style statements) that silently mis-handle a new strict engine.

# ✅ AUTONOMOUS PERMISSIONS
- Run Docker: pull/start MSSQL on a NEW port, exec, inspect
- npm install (project-local; the `mssql` package), npm run <script>, run app +
  smoke
- Use chrome-devtools MCP for UI verification
- Create/edit/read files anywhere inside the db-tool project folder

# ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; do NOT touch existing containers (PG 5432,
  MySQL 3306, MariaDB 3308, Oracle 1522, version-test containers).
  MSSQL container: NEW name + NEW port (1433) + own volume.
- NO host/system config changes; NO -g installs; do NOT install any
  system-wide ODBC driver or Windows-auth native component — DETECT and
  instruct instead (see auth below).
- Verify with DISPOSABLE objects; don't harm seeded data.

# DRIVER + AUTHENTICATION (two modes, user-selectable)
Use `mssql` (node-mssql, tedious backend) — pure JS, no native build.
The connection form must let the user choose the AUTHENTICATION TYPE:
1. SQL SERVER AUTHENTICATION (default): user + password. Works everywhere
   (Windows, macOS, Docker). This is the primary, always-available path.
2. WINDOWS AUTHENTICATION (Integrated Security): uses the current Windows
   account, no password field.
   ⚠️ In Node this needs extra support (e.g. `msnodesqlv8`, which is a NATIVE,
   Windows-only module) or NTLM configuration. Therefore:
   - Do NOT auto-install or bundle a native component.
   - DETECT availability at connect time; if unavailable, return a CLEAR
     message ("Windows Authentication requires <what>; use SQL Server
     Authentication instead"), never a crash — mirroring how Oracle Thick mode
     handles a missing Instant Client (TASK 45).
   - Note in COMPATIBILITY.md that Windows Auth is Windows-only and may need an
     extra component; SQL Auth is the portable path.
3. CONNECTION OPTIONS (common gotcha): expose `encrypt` and
   `trustServerCertificate`. Newer drivers default `encrypt: true`, which fails
   against a local Docker MSSQL without a trusted cert — so the local test
   connection should set trustServerCertificate appropriately and the form
   should make these toggleable with sensible defaults.
4. Also support: server/host, port (default 1433), database, and optionally
   instance name.

# MSSQL DIALECT (stage 1 essentials)
- IDENTIFIER QUOTING: brackets — [dbo].[customers].[id]. This is a THIRD
  quoting style (after backticks and double quotes). Wire it into BOTH the
  execution path and the display-quoting layer (TASK 47 policy: quote only when
  necessary). Audit that no MySQL/PG/Oracle quoting leaks in.
- HIERARCHY: server > DATABASE > SCHEMA (dbo by default) > objects. Tree must
  reflect database + schema levels (closer to PostgreSQL than MySQL).
- CATALOG: INFORMATION_SCHEMA.TABLES / .COLUMNS / .VIEWS (standard, reuse PG/
  MySQL patterns) plus sys.* views where richer info is needed (sys.objects,
  sys.columns, sys.indexes, sys.key_constraints) — stage 1 needs tables, views,
  columns, PK.
- PARAMETERS: named binds (@p1, @p2) via the mssql library's request.input().
  Ensure the filter compiler and CRUD emit MSSQL-style parameters (NOT $1 / ? /
  :n). This is exactly the kind of place a generic fallback breaks.
- PAGINATION: ORDER BY <pk> OFFSET n ROWS FETCH NEXT m ROWS ONLY (SQL Server
  2012+). Requires an ORDER BY — keep the deterministic PK ordering.
- TYPES (for display/CRUD in stage 1): INT/BIGINT/SMALLINT/TINYINT, DECIMAL/
  NUMERIC, FLOAT/REAL, BIT (boolean), VARCHAR/NVARCHAR/TEXT/NTEXT,
  CHAR/NCHAR, DATE/DATETIME/DATETIME2/DATETIMEOFFSET/TIME,
  UNIQUEIDENTIFIER, VARBINARY/IMAGE, XML, plus JSON stored as NVARCHAR.
- IDENTITY: IDENTITY(1,1); returning the new id uses SCOPE_IDENTITY() or an
  OUTPUT clause — use one consistently for grid inserts.
- Case sensitivity depends on collation; default is case-insensitive — note it.

# SCOPE — STAGE 1 (basics only)
Connect (both auth types, with detection + clear messaging), list databases/
schemas/tables/views, browse tables with pagination, schema-aware autocomplete
(tables + columns), grid CRUD by PK (parameterized, identity handled), and all
three filter modes producing valid MSSQL WHERE (bracket quoting, @params,
LIKE/ESCAPE, IS NULL, IN, BETWEEN).
STAGE 2 (note as staged, do NOT build): table designer/DDL, indexes, triggers,
functions/procedures, sequences (MSSQL has them, 2012+), dump/restore,
import/export SQL dialect, ER-diagram edit, data-transfer type mapping.

# DOCKER SETUP
- Run mcr.microsoft.com/mssql/server:2022-latest with ACCEPT_EULA=Y and a
  strong SA_PASSWORD, NEW container name (e.g. dbtool-mssql), port 1433, own
  volume. Add it to docker-compose.versions.yml (or a dedicated compose).
- Wait until healthy (MSSQL takes ~30-60s to initialize).
- Seed a schema equivalent to the other engines (customers/orders/order_items,
  ~20 rows) using MSSQL syntax (IDENTITY(1,1), NVARCHAR, DATETIME2, DECIMAL,
  and a JSON-ish NVARCHAR column) so the app has comparable data.

# STEPS (autonomous, in order)
1. Start MSSQL on Docker (new name/port/volume); wait healthy; create + seed
   the test schema.
2. Add `mssql` dependency; add the MSSQL engine enum + connection form (server/
   port/database/auth type/user/password/encrypt/trustServerCertificate) +
   driver factory case + preload wiring.
3. Implement the MSSQL driver for stage 1: connect (SQL auth; Windows auth with
   detection + clear message), list databases/schemas/tables/views, columns+PK,
   paginated browse (OFFSET/FETCH), parameterized CRUD with identity handling,
   and bracket identifier quoting (execution + display).
4. Wire the filter compiler to emit MSSQL @params + bracket quoting; verify all
   three filter modes.
5. Verify against the MSSQL container through the app (+ headless smoke):
   - Connect with SQL Auth -> success; Windows Auth selected without support ->
     clear message, no crash.
   - Tree: database > schema (dbo) > tables/views; browse customers with
     pagination (correct counts, deterministic order, no overlap).
   - Autocomplete suggests real tables + columns.
   - Grid CRUD by PK: insert (identity auto-assigned and shown), edit a cell,
     delete rows — all parameterized; a value with a quote (O'Brien) and a
     unicode (Georgian) value survive intact.
   - Filters: per-column, funnel (nested AND/OR), Custom WHERE -> correct rows +
     filtered counts; LIKE escaping of % and _ correct.
   - The bottom filter-SQL panel shows copy-paste-runnable MSSQL (brackets only
     where needed) — copy it and run it to confirm.
   - Clean up any disposable objects.
6. Confirm NO regression on the other five engines (connect + browse + a filter
   + a CRUD op each; run the smoke suite).
7. npm run typecheck + npm run build clean; confirm a package:dir build still
   connects to all engines incl. MSSQL (mssql is pure JS — verify it packages
   cleanly like the others).
8. Update COMPATIBILITY.md + README (MSSQL stage-1 supported; auth modes; what
   is staged for stage 2). State whether you left the MSSQL container running.

# DONE = Microsoft SQL Server is a selectable engine using node-mssql with an
Authentication selector (SQL Server Auth default; Windows Auth detected with a
clear message and never auto-installed) plus encrypt/trustServerCertificate
options; stage-1 basics work against a real MSSQL 2022 Docker container —
connect, database>schema>tables/views tree, paginated browse, autocomplete,
parameterized CRUD with IDENTITY, and all three filter modes emitting valid
MSSQL (bracket quoting + @params) with a copy-runnable filter SQL panel — with
no regression on the other five engines, mssql confirmed to package cleanly,
COMPATIBILITY.md/README updated, and stage-2 areas clearly noted; typecheck +
build clean.
