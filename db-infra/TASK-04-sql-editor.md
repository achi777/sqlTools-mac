# TASK 04: DB Tool — SQL Editor power-ups (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 02 (app) + TASK 03 (packaging).

## ROLE & CONTEXT
Upgrade the SQL editor from the minimal TASK 02 version into a genuinely
useful daily-driver editor, comparable to what Navicat users expect. Three
features, in priority order: (1) schema-aware autocomplete, (2) multiple
query tabs, (3) query history. Keep the existing architecture intact — DB
work stays in main, renderer talks only through the typed preload bridge.

Prereq: TASK 02 app works (connects to PG/MySQL/SQLite, tree + editor +
grid), TASK 03 produced packaged builds. CodeMirror 6 is already the editor.

## ✅ AUTONOMOUS PERMISSIONS
- `npm install` of project-local deps (CodeMirror extensions, etc.)
- `npm run <script>` (dev/build/typecheck), run app in dev to smoke-test
- Connect to TASK 01 databases to verify autocomplete pulls real schema
- Create/edit/read files anywhere inside the db-tool project folder

## ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; NO deletes outside project; NO rm -rf outside it
- NO host/system config changes (PATH, registry, .wslconfig, WSL, Docker
  Desktop settings, global npm); NO -g global installs
- If a destructive/system action seems needed, STOP and ask with one line why.

## ARCHITECTURE RULES (unchanged — enforce)
- All DB access in MAIN only; renderer never imports pg/mysql2/better-sqlite3.
- Renderer ⇄ main only via the existing typed contextBridge API. Any new IPC
  channel must be added to shared/types.ts and the preload whitelist.
- contextIsolation true, nodeIntegration false, sandbox on, CSP intact.
- Autocomplete metadata is fetched in MAIN and passed to the renderer via
  IPC — the renderer must NOT run schema queries directly.

## FEATURES

### 1. SCHEMA-AWARE AUTOCOMPLETE (highest priority)
- When a connection is active, main fetches a schema catalog for the current
  database: schemas, tables (+ aliases), and columns per table (name + type).
  Cache it per-connection; expose a "refresh schema" action and auto-refresh
  on (re)connect.
- Add a new typed IPC call, e.g. getSchemaCatalog(connectionId) ->
  { tables: [{ schema, name, columns: [{ name, type }] }] }.
- Wire a CodeMirror 6 SQL completion source that suggests:
  - table names after FROM / JOIN / UPDATE / INTO
  - column names after SELECT, WHERE, ON, GROUP BY, ORDER BY, and after a
    known "table." / "alias." prefix (resolve aliases from the query's FROM)
  - SQL keywords as a fallback
  - show the column TYPE as detail text in the completion popup
- Must work for all three engines (schema catalog query differs per engine —
  implement per-driver: PG via information_schema/pg_catalog, MySQL via
  information_schema, SQLite via PRAGMA table_info + sqlite_master).
- Keep it responsive: dialect-aware, no blocking the UI; debounce if needed.

### 2. MULTIPLE QUERY TABS
- The editor area becomes a tab strip: "+" opens a new query tab; each tab
  has its own editor buffer, its own results grid state, and its own
  active-connection selection (a tab can run against a different saved
  connection than another tab).
- Tabs: add, close (with confirm if there's unsaved text is optional — keep
  simple), rename (double-click title), and reorder is optional.
- Running a query affects only the active tab's result grid.
- Persist open tabs (their text + chosen connection) to the app's userData
  so they survive an app restart. Do NOT persist result rows — only the SQL
  text + tab metadata.
- Keyboard: Ctrl+T new tab, Ctrl+W close tab, Ctrl+Enter run (existing).

### 3. QUERY HISTORY
- Every executed query is recorded (per connection): the SQL text, timestamp,
  the connection name/engine, success/error, row count, duration ms.
- Store history in a local SQLite file OR JSON in userData (your call; SQLite
  is cleaner for querying/limiting — if you use it, reuse better-sqlite3).
  Cap history (e.g. last 500 per connection) to avoid unbounded growth.
- A History panel/drawer: list recent queries (newest first), searchable by
  text, click an entry to load it into the current tab's editor; double-click
  to load AND run. Show status (ok/error), rows, duration, and time.
- Do not store result data in history — only the query + metadata.

## STEPS (autonomous, in order)
1. Add the getSchemaCatalog IPC (types + main handlers per driver + preload).
2. Implement autocomplete in the renderer's CodeMirror config using the
   catalog; verify against PG, MySQL, SQLite (real tables/columns appear).
3. Refactor the editor panel into tabs (state in Zustand; persistence in
   userData). Verify multiple tabs run independently against different
   connections.
4. Implement history capture on every run + the History panel; verify
   load-into-editor and load-and-run.
5. `npm run typecheck` clean; `npm run build` clean.
6. Smoke-test in dev against all three engines:
   - type `SELECT * FROM ` and confirm real table names autocomplete; after a
     table + alias, confirm column autocomplete with types.
   - open 2 tabs on different connections, run different queries, confirm
     independent results.
   - run several queries, open History, search, load one back, re-run it.
   - restart the app (dev) and confirm tabs (SQL text) persisted.
7. Leave a clean state (stop dev server).
8. (Optional, only if quick) run TASK 03's package:dir + SMOKE to confirm the
   new features survive packaging. If anything native/asar regresses, note it
   rather than deep-diving — packaging is already proven.

## OUT OF SCOPE (later tasks)
- Data grid filter/sort/add-delete-row, import/export, ER diagrams, schema
  diff, backup/restore, OS-keychain creds. Don't build these now.
- Full SQL parsing/linting; the autocomplete can be heuristic (FROM/JOIN/
  alias resolution) rather than a complete SQL parser.

## DONE = schema-aware autocomplete works for PG+MySQL+SQLite (tables +
typed columns, alias-aware); the editor supports multiple independent query
tabs that persist their SQL across restart; query history is captured and
browsable with load + load-and-run; typecheck + build clean; smoke-tested in
dev across all three engines.
