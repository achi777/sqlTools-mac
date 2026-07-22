# TASK 02: DB Tool — First Vertical Slice (Electron app, AUTONOMOUS MODE)
# Windows 11 / Docker Desktop + WSL2. Depends on TASK 01 (DB infra) being UP.

## ROLE & CONTEXT
Build the FIRST working version of a Navicat-style desktop database tool.
This is a THIN but COMPLETE vertical slice: every layer works end to end,
even though features are minimal. You will connect to a database, browse
its objects in a tree, write SQL in an editor, run it, and see + edit the
results in a data grid.

Prereq: TASK 01 created db-infra/ and the PostgreSQL (5432) + MySQL (3306)
containers are running and seeded; SQLite scripts exist in
db-infra/db/sqlite/. This app connects to those.

This is a fresh empty dev machine. AUTONOMOUS mode: you may run dev
commands yourself (npm install, run the app in dev, etc.). Same guardrails
as TASK 01 apply (see GUARDRAILS below).

## ✅ AUTONOMOUS PERMISSIONS
- `npm install` (project-local), `npm run <script>` (dev/build/lint)
- Run the Electron app in dev mode to smoke-test; read console output
- Connect to the TASK 01 databases to verify queries work
- Create/edit/read files anywhere inside THIS project folder

## ⛔ GUARDRAILS (ask user first)
- NO `docker system/volume/image prune`, NO `docker compose down -v`
- NO deletes outside this project folder; NO `rm -rf` outside it
- NO host/system config changes (.wslconfig, WSL, Docker Desktop settings,
  global npm, PATH)
- NO `-g` global installs
- If something destructive seems needed, STOP and ask with one line why.

## TECH STACK (fixed — do not substitute)
- Electron + electron-vite (build + HMR)
- TypeScript everywhere, strict mode on
- React + Vite for the renderer UI
- State: Zustand
- SQL editor: CodeMirror 6 (with @codemirror/lang-sql)
- Data grid: glide-data-grid (canvas, virtualized — handles large results)
- DB drivers in MAIN process only: `pg` (PostgreSQL), `mysql2` (MySQL),
  `better-sqlite3` (SQLite)
- IPC: typed. Define a shared TS types module; expose a small typed API via
  contextBridge in a preload script. NO raw ipcRenderer in the UI.

## 🔒 ARCHITECTURE RULES (critical — enforce strictly)
1. ALL database code (drivers, connections, queries, credentials) lives in
   the Electron MAIN process. The renderer NEVER imports pg/mysql2/
   better-sqlite3 and NEVER sees raw credentials.
2. Renderer <-> main communication ONLY through a typed, whitelisted
   preload bridge. contextIsolation: true, nodeIntegration: false,
   sandbox stays on where possible.
3. ONE database abstraction interface behind which all three engines sit.
   Define it once; implement it three times (Postgres, MySQL, SQLite):

   interface DbDriver {
     connect(config): Promise<void>
     disconnect(): Promise<void>
     testConnection(config): Promise<{ ok: boolean; message?: string }>
     listDatabases(): Promise<string[]>          // where applicable
     listSchemas(): Promise<string[]>            // PG: schemas; MySQL: dbs; SQLite: 'main'
     listTables(schema): Promise<TableRef[]>
     getTableStructure(t): Promise<ColumnDef[]>
     runQuery(sql, params?): Promise<QueryResult> // { columns, rows, rowCount, durationMs }
     // streaming can be added later; for the slice, capped fetch is fine
   }

   The UI talks only to this shape (via IPC) — it must not care which
   engine is underneath.

## FEATURES IN THIS SLICE (keep minimal but end-to-end)
1. CONNECTION MANAGER
   - A sidebar list of saved connections + an "Add connection" form.
   - Fields: name, engine (postgres | mysql | sqlite), host, port, user,
     password, database; for sqlite just a file path.
   - "Test connection" button -> calls testConnection via IPC, shows
     ok/error.
   - Persist saved connections to a local JSON file in the app's userData
     dir (NOT in the repo). Passwords: for THIS slice store in that local
     file with a clear TODO comment to move to OS keychain later. Never log
     passwords.
   - Pre-seed the form defaults to match TASK 01 (localhost, dbtool/dbtool,
     dbtool_dev, ports 5432/3306) so the user can connect in one click.
2. OBJECT TREE (left panel)
   - Connection -> schema/database -> Tables -> table names.
   - Lazy-load children on expand. Click a table to open it in the grid.
3. SQL EDITOR (top of main panel)
   - CodeMirror 6 with SQL highlighting. A "Run" button and Ctrl/Cmd+Enter.
   - Runs against the active connection. Shows errors inline/below.
   - Basic (static keyword) autocomplete is enough for the slice;
     schema-aware autocomplete is a LATER task.
4. DATA GRID (main panel, below editor)
   - glide-data-grid showing query results OR a clicked table's rows
     (SELECT * ... LIMIT 200 for the slice).
   - Show column headers with types. Virtualized scroll.
   - Inline edit of a cell -> generates a parameterized UPDATE by primary
     key and runs it via IPC (only when the table has a detectable PK;
     otherwise make the grid read-only and show a small note).
   - A results status bar: row count + query duration.
5. Works against ALL THREE engines using the SAME UI (switch by selecting a
   different saved connection).

## PROJECT LAYOUT (suggested)
```
db-tool/
├── package.json
├── electron.vite.config.ts
├── tsconfig.json
├── src/
│   ├── main/            # Electron main: drivers, IPC handlers
│   │   ├── index.ts
│   │   ├── drivers/{postgres,mysql,sqlite}.ts
│   │   ├── driver.ts    # the DbDriver interface + factory
│   │   └── ipc.ts       # typed IPC handlers
│   ├── preload/
│   │   └── index.ts     # contextBridge: typed api
│   ├── shared/
│   │   └── types.ts     # shared TS types for IPC payloads
│   └── renderer/        # React UI
│       ├── App.tsx
│       ├── components/{ConnectionManager,ObjectTree,SqlEditor,DataGrid}.tsx
│       └── store.ts     # Zustand
└── README.md
```

## EXECUTION STEPS (autonomous, in order)
1. Scaffold the electron-vite + React + TS project; install deps.
2. Implement shared types + the DbDriver interface + the three drivers in
   main. Wire typed IPC + preload bridge.
3. Build the four UI panels (connection manager, tree, editor, grid) and
   the Zustand store.
4. `npm run dev`, smoke-test end to end against the TASK 01 databases:
   - Add/connect a Postgres connection (defaults prefilled) -> tree shows
     customers/orders/order_items -> click customers -> grid shows rows.
   - Run `SELECT * FROM customers LIMIT 10;` in the editor -> grid updates.
   - Edit one cell in a PK'd table -> confirm the UPDATE persists (re-run
     the query and see the change).
   - Repeat the connect+browse+query flow for MySQL and for a SQLite file
     (apply db-infra schema+seed to a local .sqlite first if needed).
5. Fix issues until all three engines work through the one UI.
6. Write README.md: how to run in dev (`npm run dev`), how to build, the
   architecture summary, and the "what's next" feature backlog (import/
   export, ER diagram, schema diff, query builder, backup/restore,
   schema-aware autocomplete, streaming large results, OS-keychain creds).

## OUT OF SCOPE (LATER tasks — do NOT build now)
- ER diagrams, schema diff/sync, data sync, visual query builder,
  import/export, backup/restore, multi-tab query sessions, schema-aware
  autocomplete, OS keychain, packaging/installers, theming polish.
Keep this slice small; resist scope creep. A working thin vertical beats a
broad half-working one.

## DONE = the app runs in dev and, through ONE UI, can connect to
PostgreSQL, MySQL, and SQLite, browse tables in the tree, run SQL in the
editor, see results in the grid, and edit a cell in a PK'd table with the
change persisting. README written. Feature backlog listed.
