# TASK 45: DB Tool — Add Oracle as an engine (Thin default + Thick option, driver mode selectable) (AUTONOMOUS)
# Windows 11 / Docker Desktop + WSL2. Depends on the built app + driver architecture.

# ROLE & CONTEXT
Add Oracle Database as an engine alongside PostgreSQL, MySQL, SQLite, MariaDB.
Use the official node-oracledb driver, which has TWO modes:
- THIN mode: pure JS, no external libs, supports Oracle 12.1+ (default; easy to
  package).
- THICK mode: needs Oracle Instant Client installed, supports OLDER Oracle too
  (11g, etc.) + all newer.
Let the user CHOOSE the mode in the Oracle connection form (so it can adapt to
any Oracle: Thin for modern, Thick for old). Stage this: get connection + basics
working now; advanced Oracle-dialect features can come later. User authorized
autonomous Docker use on this empty dev machine.

# ✅ AUTONOMOUS PERMISSIONS
- Run Docker: pull/start an Oracle XE container on a NEW port, exec, inspect
- npm install (project-local; node-oracledb), npm run <script>, run app + smoke
- Use chrome-devtools MCP for UI verification
- Create/edit/read files anywhere inside the db-tool project folder

# ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; don't touch existing containers (PG/MySQL/SQLite/
  MariaDB/version-test). Oracle container: NEW name + NEW port + own volume.
- NO host/system config changes (do NOT install Oracle Instant Client
  system-wide; if Thick mode needs it, DETECT + instruct, don't auto-install).
- NO -g installs.
- Verify structural changes on DISPOSABLE objects; don't harm anything.

# DRIVER: node-oracledb, mode selectable
1. Add node-oracledb as a project-local dependency.
2. THIN mode is the default (works Oracle 12.1+, no external client).
3. THICK mode is an OPTION: the Oracle connection form has a "Driver mode:
   [Thin | Thick]" selector. If Thick is chosen:
   - DETECT whether Oracle Instant Client is available (oracledb.initOracleClient
     succeeds). If NOT available, show a CLEAR message: Thick mode requires
     Oracle Instant Client, with a short how-to link/path — do NOT crash, do
     NOT auto-install. Fall back / let the user switch to Thin.
   - Never bundle/auto-install Instant Client system-wide.
4. Wire Oracle into the DbDriver interface as its own engine (enum in
   shared/types; factory case; preload). Reuse the interface; Oracle's driver
   implements it with Oracle SQL.

# ORACLE DIALECT (basics for this stage)
- Connection: host, port (default 1521), service name / SID, user, password;
  plus the Thin/Thick mode selector. (Oracle connect string uses service name
  or SID — support service name primarily.)
- "Schema" concept: in Oracle, a user == a schema. List objects from the
  current user's schema by default (USER_TABLES / ALL_TABLES, ALL_TAB_COLUMNS,
  etc.); allow browsing other accessible schemas if easy (optional).
- Object listing (this stage): tables + columns + PK; views. (Functions/
  procedures/sequences/triggers/indexes Oracle-specific can be a later stage —
  list them if trivial via ALL_* views, but full create/edit is later.)
- Pagination: use OFFSET ... FETCH NEXT ... ROWS ONLY (12c+, matches Thin's
  12.1+ floor). Deterministic ORDER BY PK.
- Types: map Oracle types for display (VARCHAR2, NUMBER, DATE, TIMESTAMP, CLOB,
  BLOB, etc.). Basic grid CRUD by PK with parameterized binds (oracledb uses
  :bind placeholders — handle the bind style in the Oracle driver).
- Quoting/identifiers: Oracle uppercases unquoted identifiers — handle
  identifier casing/quoting correctly.

# SCOPE THIS STAGE (basics)
Connect (Thin default, Thick optional w/ detection), list schema tables/views,
browse tables with pagination, schema-aware autocomplete (tables/columns),
grid CRUD by PK (parameterized), and the filter modes (column/funnel/custom)
producing valid Oracle WHERE. Advanced object management + designer + dump +
transfer for Oracle = LATER stage (note in backlog).

# DOCKER SETUP
- Run Oracle XE (free) for testing, e.g. gvenzl/oracle-xe (a well-known free
  Oracle XE image) or Oracle's official express image if accessible. NEW name,
  port 1521->1521 (or 1522 to avoid any conflict), own volume. Set a known
  password. Wait for it to become healthy (Oracle XE takes a while to init).
- Seed a small schema (customers/orders/order_items equivalents) in an Oracle
  user/schema so the app has something to browse (adapt the init SQL to Oracle
  types + syntax; Oracle has no SERIAL — use IDENTITY (12c+) or a sequence).

# STEPS (autonomous, in order)
1. Start Oracle XE on Docker (new port/volume); wait healthy; create + seed a
   test schema (Oracle-adapted DDL).
2. Add node-oracledb; add Oracle engine enum + connection form (host/port/
   service/SID/user/pass + Thin|Thick selector) + factory case + preload.
3. Implement the Oracle driver (Thin default; Thick with Instant Client
   detection + clear message; parameterized :binds; OFFSET/FETCH pagination;
   USER_/ALL_ catalog for tables/views/columns/PK; identifier casing).
4. Verify against the Oracle XE container through the app (+ smoke):
   - Connect in THIN mode -> success.
   - Choosing THICK without Instant Client -> clear message, no crash.
   - List tables/views; browse a table with pagination; autocomplete
     tables/columns; grid CRUD by PK (insert/edit/delete, parameterized);
     filters (column/funnel/custom) produce valid Oracle WHERE + correct rows +
     filtered count.
   - Clean up disposable objects.
5. Update COMPATIBILITY.md + README: Oracle supported (Thin 12.1+; Thick for
   older with Instant Client), and note advanced Oracle features are staged.
6. npm run typecheck + npm run build clean; verify a package:dir build still
   connects to all engines incl. Oracle Thin (native module concerns: confirm
   node-oracledb Thin — pure JS — packages cleanly; note if Thick would need
   extra packaging work).
7. Leave a clean state (dev server stopped; disposable objects removed; state
   whether you left the Oracle XE container running for the user).

# DONE = Oracle is a selectable engine using node-oracledb with a Thin (default,
12.1+, no external client) / Thick (optional, Instant-Client-detected with a
clear message, never auto-installed) mode selector in the connection form;
basics work against a real Oracle XE Docker container — connect, list tables/
views, paginated browse, autocomplete, parameterized grid CRUD by PK, and the
filter modes producing valid Oracle SQL; COMPATIBILITY.md + README updated;
advanced Oracle object management noted as a later stage; typecheck + build
clean; Oracle Thin confirmed to survive a packaged build.
