# DB Tool — First Vertical Slice

A Navicat-style desktop database tool (Electron + React + TypeScript). This is
a **thin but complete vertical slice**: connect to a database, browse its
objects in a tree, write SQL in an editor, run it, and see + edit results in a
data grid — working against **PostgreSQL, MySQL, and SQLite** through one UI.

It connects to the databases created by the sibling `db-infra/` project
(TASK 01): PostgreSQL on `5432`, MySQL on `3306`, and a file-based SQLite DB.

### Supported database versions

Fully verified against **PostgreSQL 13 / 14 / 15 / 16**, **MySQL 5.7 / 8.0**, and
**MariaDB 11** (first-class engines), plus bundled **SQLite 3** — every feature
passes on each. **Microsoft SQL Server 2022** (via **node-mssql**) is now a
first-class engine: connect, database → schema → tables/views tree, browse +
paginate, autocomplete, all three filter modes, grid CRUD by PK (IDENTITY), and
full object management — **indexes, triggers** (AFTER/INSTEAD OF with
`inserted`/`deleted`), **functions & procedures** (valid T-SQL templates,
`CREATE OR ALTER`), import/export (CSV/JSON/Excel/SQL with `IDENTITY_INSERT`,
`N''` unicode, `GO` batching) and an ER diagram (render + FK edit). SQL Server
offers a **SQL / Windows Authentication** selector (Windows Auth is detected and
never auto-installed — SQL Auth is the portable path) plus
`encrypt`/`trustServerCertificate` toggles, and uses `[bracket]` quoting with
`@p` parameters. **Oracle** (via **node-oracledb**, Thin/Thick with Instant-
Client detection) is supported at the basics-plus level (sequences, triggers,
indexes, routines, SQL export). MariaDB reuses the MySQL driver and
adds standalone **sequences** (shown in the tree like PostgreSQL). See
[`COMPATIBILITY.md`](./COMPATIBILITY.md) for the full feature × version matrix,
the Oracle Thin/Thick and SQL Server auth notes, per-engine caveats (e.g.
MySQL/MariaDB have no `FULL OUTER JOIN`; sequences are PostgreSQL + MariaDB only),
and how to reproduce the version tests. PostgreSQL 13+, MySQL 5.7+, MariaDB
10.3+, Oracle 12.1+ (Thin), and SQL Server 2012+ are the supported floors.

---

## Prerequisites

- The `db-infra` Docker stack up (`cd ../db-infra/docker && docker compose up -d`)
  for the Postgres/MySQL connections. SQLite needs no server.
- Node.js. **This machine has no system Node**, so a portable Node runtime was
  placed at `./.node/` (git-ignored). All commands below assume it is on PATH.

### Putting the portable Node on PATH (PowerShell)

```powershell
$env:Path = "D:\dev\sqlTools\db-tool\.node;" + $env:Path
```

(Do this once per shell. Nothing is written to the system PATH.)

---

## Run in dev

```powershell
cd D:\dev\sqlTools\db-tool
npm run dev
```

electron-vite builds main + preload, starts the Vite dev server for the
renderer (HMR), and launches the Electron window.

The three **default connections are pre-filled** (matching TASK 01), so you can
click **Connect** on "Local Postgres", "Local MySQL", or "Local SQLite" and go.

### Try it

1. Click **Connect** on *Local Postgres (dbtool_dev)*. The object tree shows
   `public → customers / orders / order_items`.
2. Click **customers** → the grid shows rows (SELECT \* … LIMIT 200) with typed
   column headers and a row-count + duration in the status bar.
3. In the editor type `SELECT * FROM customers LIMIT 10;` and press
   **Ctrl/Cmd+Enter** (or **Run**). The grid updates.
4. Double-click a non-PK cell (e.g. `full_name`) in the `customers` table,
   edit it, press Enter → a parameterized `UPDATE … WHERE id = ?` runs; re-run
   the query to see the change persist.
5. Repeat for **MySQL** and **SQLite** — same UI, different engine.

> The SQLite default points at a file in Electron's `userData` dir. To seed it
> with the sample schema+data, either point the connection at a pre-seeded file
> or apply `../db-infra/db/sqlite/schema.sql` + `seed.sql` to it. The automated
> smoke test (below) creates and seeds a throwaway `.smoke/dbtool.sqlite`.

---

## Build

```powershell
npm run build        # production bundles into ./out
npm run typecheck    # tsc for both main (node) and renderer (web) projects
```

To produce a distributable Windows app (installer + portable exe), see
**[Packaging & Distribution](#packaging--distribution)** below.

### Native module note (better-sqlite3)

`better-sqlite3` is a native addon. This machine has **no C++ toolchain**, so it
is not compiled from source — a **prebuilt binary for Electron's ABI** is used.
If you change the Electron version, refresh the binary with:

```powershell
cd node_modules\better-sqlite3
node ..\prebuild-install\bin.js --runtime=electron --target=<electron-version> --arch=x64 --platform=win32
```

`npm run rebuild` (uses `@electron/rebuild`) is the alternative if you *do* have
Visual Studio Build Tools installed.

---

## Automated smoke test

A headless end-to-end check runs **inside the Electron main process** (so the
native SQLite binary is exercised under the real Electron ABI). It drives all
three engines through the same `DbDriver` interface: connect → list schemas →
list tables → get structure → count → fetch rows → **edit a cell by PK and
restore it**.

```powershell
$env:SMOKE = "1"
$env:SMOKE_SQLITE_SQL_DIR = "D:\dev\sqlTools\db-infra\db\sqlite"
$env:SMOKE_SQLITE_PATH   = "D:\dev\sqlTools\db-tool\.smoke\dbtool.sqlite"
node_modules\electron\dist\electron.exe .
Remove-Item Env:\SMOKE
```

Expected tail: `[smoke] SMOKE PASSED`.

---

## Packaging & Distribution

Packaged with **electron-builder** (config in `electron-builder.yml`) into two
unsigned Windows artifacts in `release/`:

| Artifact | What it is |
| --- | --- |
| `DBTool-Setup-<version>.exe` | NSIS **installer** — per-user (no admin), lets the user choose the install dir, creates Desktop + Start-Menu shortcuts |
| `DBTool-<version>-portable.exe` | **Portable** single exe — run it directly, no install |

**End users need NO Node.js and nothing preinstalled.** The Electron runtime
(Chromium + Node) is bundled inside each artifact; SQLite ships as a prebuilt
native binary (see below).

### Build the artifacts

```powershell
# Put the project-local portable Node on PATH for this shell (nothing is
# written to the system PATH):
$env:Path = "D:\dev\sqlTools\db-tool\.node;" + $env:Path

cd D:\dev\sqlTools\db-tool

npm run package        # installer + portable  -> release\
npm run package:dir    # fast UNPACKED build    -> release\win-unpacked\ (for testing)
```

`package` runs `electron-vite build` (bundles main/preload/renderer into `out/`)
then `electron-builder --win`. On first run electron-builder downloads the
Electron binary and NSIS tooling from GitHub (cached afterwards).

### Native module (better-sqlite3) — do not regress this

`better-sqlite3` is a native addon and is the one real packaging risk. This
machine has **no C++ toolchain**, so electron-builder must **not** try to
recompile it. Two settings in `electron-builder.yml` make that safe:

```yaml
npmRebuild: false        # don't recompile native deps from source
nodeGypRebuild: false
asarUnpack:
  - "**/*.node"                       # native .node can't load from inside asar
  - "node_modules/better-sqlite3/**"
```

The binary that gets packaged is the **Electron-ABI prebuilt** fetched in
TASK 02 (`node_modules/better-sqlite3/build/Release/better_sqlite3.node`). It
ends up at `resources/app.asar.unpacked/node_modules/better-sqlite3/build/Release/`
in the package.

If you **bump the Electron version**, refresh that prebuilt binary first (no
compiler needed), then repackage:

```powershell
cd node_modules\better-sqlite3
node ..\prebuild-install\bin.js --runtime=electron --target=<new-electron-version> --arch=x64 --platform=win32
cd ..\..
npm run package
```

If you *do* have Visual Studio Build Tools (Desktop C++), you can instead set
`npmRebuild: true` and let electron-builder compile it, or run `npm run rebuild`
(`@electron/rebuild`). `pg` and `mysql2` are pure-JS and need none of this;
they ship automatically because they're in `dependencies` (not `devDependencies`).

### Verifying a packaged build

The same SMOKE harness runs against the **packaged** exe (proves the native
SQLite binary works in the real package, not just in dev):

```powershell
$env:SMOKE = "1"
$env:SMOKE_SQLITE_SQL_DIR = "D:\dev\sqlTools\db-infra\db\sqlite"
$env:SMOKE_SQLITE_PATH = "D:\dev\sqlTools\db-tool\.smoke\packaged-dbtool.sqlite"
$env:SMOKE_OUT = "D:\dev\sqlTools\db-tool\.smoke\packaged-smoke-result.txt"
Start-Process "release\win-unpacked\DB Tool.exe" -Wait
Get-Content $env:SMOKE_OUT     # expect: SMOKE PASSED
Remove-Item Env:\SMOKE, Env:\SMOKE_OUT
```

### Change the app icon and product name

- **Icon:** replace `build/icon.ico` with a real 256×256 `.ico` and repackage.
  The current icon is a generated placeholder (`build/make_icon.py` regenerates
  it). electron-builder picks up `build/icon.ico` automatically.
- **Product name / app id:** edit `productName` and `appId` in
  `electron-builder.yml`. `version` comes from `package.json`.

### Unsigned builds & Windows SmartScreen

These artifacts are **not code-signed** (out of scope — no cert purchase/registration).
On a clean machine, Windows SmartScreen may warn "unknown publisher" the first
time; users click **More info → Run anyway**. To sign later, add to
`electron-builder.yml`:

```yaml
win:
  certificateFile: path\to\cert.pfx   # or use CSC_LINK / CSC_KEY_PASSWORD env vars
  certificatePassword: <password>      # (an EV/OV code-signing cert you provide)
```

electron-builder will then sign both the installer and the app exe. No signing
config is present today, and none is required to build or run the app.

---

## Architecture

```
┌─────────────────────────── Electron ───────────────────────────┐
│  MAIN process (Node)                    RENDERER process (web)  │
│  ┌──────────────────────────┐           ┌───────────────────┐  │
│  │ drivers/ postgres,mysql, │           │ React + Zustand   │  │
│  │          sqlite          │           │  ConnectionManager│  │
│  │ driver.ts  (DbDriver IF) │           │  ObjectTree       │  │
│  │ ipc.ts     (handlers)    │           │  SqlEditor (CM6)  │  │
│  │ store.ts   (conn JSON)   │           │  DataGrid (glide) │  │
│  └───────────▲──────────────┘           └─────────▲─────────┘  │
│              │  ipcMain.handle                     │ window.dbApi│
│              └──────────── preload/index.cjs ───────┘            │
│                 contextBridge (typed, whitelisted)              │
└─────────────────────────────────────────────────────────────────┘
        shared/types.ts — types + IPC channel names (both sides)
```

**Security posture (enforced):**

- **All** DB drivers, connections, queries, and credentials live in the **main
  process only**. The renderer never imports `pg` / `mysql2` / `better-sqlite3`
  and never sees a raw password.
- Renderer ⇄ main goes **only** through a small, whitelisted, typed
  `contextBridge` API (`window.dbApi`) in the preload. No raw `ipcRenderer` in
  the UI.
- `BrowserWindow` uses `contextIsolation: true`, `nodeIntegration: false`,
  `sandbox: true`. A strict CSP is set on the renderer HTML.

**One abstraction, three implementations.** Every engine sits behind the single
`DbDriver` interface (`src/main/driver.ts`): `connect`, `disconnect`,
`testConnection`, `listDatabases`, `listSchemas`, `listTables`,
`getTableStructure`, `runQuery`, `getTableRows`, `updateCell`. The UI talks only
to this shape (via IPC) and does not care which engine is underneath.

**Where things are stored.** Saved connections persist as JSON in Electron's
`userData` dir — **never in the repo**. For this slice, passwords are stored in
that file in plaintext with a `TODO(security)` to move them to the OS keychain.
Passwords are never logged.

---

## Tech stack

| Concern      | Choice                                     |
| ------------ | ------------------------------------------ |
| Shell/build  | Electron + electron-vite (HMR)             |
| Language     | TypeScript (strict) everywhere             |
| UI           | React + Vite                               |
| State        | Zustand                                    |
| SQL editor   | CodeMirror 6 (`@codemirror/lang-sql`)      |
| Data grid    | glide-data-grid (canvas, virtualized)      |
| PG driver    | `pg`                                       |
| MySQL driver | `mysql2`                                   |
| SQLite driver| `better-sqlite3`                           |

---

## SQL editor features

The editor is a daily-driver SQL workspace:

- **Schema-aware autocomplete** — after connecting, main fetches a per-connection
  catalog (tables + typed columns) and CodeMirror suggests table names after
  `FROM`/`JOIN`, columns after `table.`/`alias.` (aliases resolved from the
  query's `FROM`), and SQL keywords as a fallback. Column **types show as detail**
  in the popup. Works for PG, MySQL, and SQLite (each engine's catalog query is
  implemented per-driver in main). The `⟳` in the Objects panel refreshes the
  catalog + tree; it also auto-refreshes on (re)connect.
- **Multiple query tabs** — `+` (or **Ctrl+T**) opens a tab; each has its own
  editor buffer, results grid, and **its own connection** (so two tabs can run
  against different databases at once). Close with the `×` or **Ctrl+W**,
  double-click a tab title to rename. Open tabs (SQL text + chosen connection,
  **never result rows**) persist to userData and survive an app restart.
- **Query history** — every executed query is recorded per connection (SQL,
  time, connection/engine, ok/error, row count, duration) in a local SQLite file
  in userData, capped at 500/connection. Open the **History** panel to search by
  text, **click** an entry to load it into the current tab, or **double-click**
  to load and run it. Only the query + metadata are stored, never result data.

## Table browsing & pagination

Opening a table from the tree browses it with **true server-side pagination** —
built to scale to millions of rows because paging happens in the database
(`ORDER BY … LIMIT … OFFSET`, parameterized, in main), never in the browser.

- **Bottom bar** (Navicat-style): first « / prev ‹ / windowed page numbers
  (`1 … 4 5 [6] 7 8 … 120`) / next › / last », a **Rows X–Y of N** indicator, a
  **page-size** selector (25 / 50 / 100 / 200 / 500, default 100), a **Go to
  page** jump, and a **Refresh** (⟳) that re-fetches the page and recounts.
- **Fast first page:** the first page renders immediately; the total
  `COUNT(*)` runs **asynchronously** and fills in the "… of N" when it lands.
- **Deterministic order:** pages are ordered by the primary key (else by all
  columns) so pages never overlap or skip rows. Verified across PG/MySQL/SQLite.
- **Click-to-sort is server-side:** clicking a column header cycles asc → desc →
  off and re-fetches from page 1 (it sorts the whole table in the DB, not just
  the visible slice). The sorted column shows ▲/▼.
- **CRUD integration:** after applying inserts the grid jumps to the (new) last
  page so the new rows — with their DB-assigned ids — are visible; deletes
  update the count and page. The trailing "new row" works within the page.
- **Ad-hoc SQL is separate by design:** results from a query you typed in the
  editor are **not** auto-paginated (your query may already have its own
  LIMIT/GROUP BY). Only table browsing gets the pager.

### Per-column filters

While browsing a table, click a column header's **⋯ menu** to open a
type-aware **column filter**:

- **Operators by type:** strings get contains / starts with / ends with / = / ≠
  / IN; numbers & dates get = / ≠ / < / ≤ / > / ≥ / BETWEEN / IN; booleans get a
  true / false / (any) selector; nullable columns also get IS NULL / IS NOT NULL.
- **AND-combined** across columns (Navicat default), and further AND-combined
  with the funnel builder tree. Filtered columns are highlighted (⚑) and a
  **Clear ⚑** button appears on the toolbar.
- **Server-side & parameterized:** the filter builds a WHERE clause with **bound
  parameters** (never string-concatenated) that's appended to **both** the page
  query **and** the COUNT, so "Rows X–Y of N" reflects the filtered total and
  filtered pages stay deterministic. Applying a filter resets to page 1.
- **Injection-safe / correct escaping:** verified with values containing a
  quote (`O'Brien`) and a literal `%` — the `%`/`_` LIKE wildcards are escaped so
  they match literally, and the quote is a bound param (no injection, no error).
- **Case-insensitive contains:** PG uses `ILIKE`; MySQL is CI by collation;
  SQLite `LIKE` is CI for ASCII.
- **CRUD under a filter:** insert/update/delete still work with a filter active,
  and the filtered page + count refresh afterward (a newly inserted row that
  doesn't match the filter simply won't appear — by design).

### Visual filter builder (nested AND/OR) — the funnel

For anything beyond per-column filters, the grid toolbar's **Builder** button
(funnel ⧩) opens a compact popover for arbitrarily **nested groups**:

- Each **group** has an AND/OR toggle and an optional **NOT**; add **conditions**
  or nested **sub-groups** at any level, e.g. `(status = 'active' AND age > 30)
  OR NOT (vip = true)`.
- Conditions are **type-aware** (same operator sets as the column filter, plus
  **NOT IN**); IN/NOT IN take a comma list, BETWEEN two values, IS NULL/IS NOT
  NULL none, booleans a true/false select.
- A **live WHERE preview** shows the compiled clause (values inlined for
  readability; execution still binds params).
- **Interactions:** `+ Condition` / `+ Group` (nesting) and per-row `×`; **Apply**
  (server-side, page-1 reset), **Clear**, click-away and **Esc** close, **Enter**
  in a value input applies. A green dot on the Builder button marks an active
  builder filter.
- **Compiler:** a single pure `compileFilter(engine, columnFilters, tree, …)`
  (in `src/shared/filterCompiler.ts`, used by both the preview and main's
  execution) parenthesizes groups, applies NOT, expands IN to N placeholders,
  and — like the column filter — binds every value and escapes LIKE wildcards.
  Verified injection-safe (quote + `%`) and each shape (nested AND/OR, NOT, IN,
  BETWEEN) matches an equivalent hand-written query on PG/MySQL/SQLite.

**Consolidated filter model (TASK 36).** There are exactly two filter surfaces,
each with one clear entry point — earlier duplicate "Quick"/"Builder" mode
buttons and the separate "Edit builder…" modal were removed with no loss of
capability:

- **Structured** = the **per-column header ⋯ filters** *AND* the **funnel
  builder tree**, combined (`effective = columnFilters AND builderTree`). Both
  feed the same `compileFilter`; column ⚑ marks + the funnel's green dot show
  which parts are active.
- **Custom WHERE** = an exclusive raw-predicate toggle; while on it replaces the
  structured filter entirely.

A single **Clear ⚑** clears the active surface (both structured parts together,
or the Custom WHERE text). Whichever is active feeds the same paginated query +
COUNT (so "Rows X–Y of N" stays correct) and the bottom **filter-SQL panel**.
The structured/custom filter is per-tab and not persisted across restart (noted
as future work).

> Note: `COUNT(*)` on very large tables can be slow on some engines; a per-engine
> approximate-count option (e.g. PG `reltuples`, MySQL `information_schema`) could
> be added later. Keyset/seek pagination for extreme scale is also future work.

## Grid editing (CRUD)

The data grid is fully editable when you open a real table (click it in the
tree) — Navicat-style, no separate form. All writes are **parameterized and
executed in main**, keyed by primary key, and **batched into one transaction**.

- **Insert:** the grid shows a trailing empty **new row** (tinted green). Type
  into it to stage an INSERT; another empty row appears. Auto-increment columns
  show `(auto)` and are skipped so the DB assigns them; columns with a DEFAULT
  show `(default)` if left blank; a `NOT NULL` column with no default shows
  `required` and is validated before apply. After apply, the grid reloads so
  DB-assigned ids appear immediately (PG `RETURNING`, MySQL `insertId`, SQLite
  `lastInsertRowid`).
- **Edit:** edit any non-PK cell (staged, tinted blue). PK cells are read-only.
- **Delete:** tick rows (checkbox markers) and **Delete selected** (tinted red,
  staged).
- **Apply / Discard:** staged changes show a count on **Apply changes (N)**;
  Apply runs them in a transaction and reports `inserted / updated / deleted`.
  On any error (constraint, FK, NOT NULL, type) the **whole batch rolls back**
  and the failing phase/row + message is shown — nothing is half-applied.
- **No primary key?** Existing rows are read-only (shown inline: *no primary
  key: rows are read-only*) since there's no safe WHERE key — but you can still
  **insert** (that new row just can't be edited/deleted in-grid afterward).
- Ad-hoc query results (not a clicked table) stay read-only.

## Visual view builder

Right-click a schema → **New view (visual builder)…** for a Navicat-style
drag-and-drop query designer (built on React Flow):

- **Canvas:** add tables from the toolbar; each becomes a node listing its
  columns (name + type) with an **include checkbox** and a **connection handle on
  both sides** of every row. **Drag the node by its title bar** to move it (the
  columns area is click-only, so checkboxes toggle reliably on a single click);
  the same table can be added twice for **self-joins** (auto aliases `t1`, `t2`, …).
- **Joins:** drag from one column's handle to another column's handle — a live
  connection line follows the cursor and the target handle highlights; the edge
  binds to those exact rows and re-routes to the inner-facing side when you move
  nodes. Click an edge (or its side-panel row) to edit its **join type** (only
  what the engine supports — PG: INNER/LEFT/RIGHT/FULL/CROSS, MySQL: no FULL,
  SQLite: INNER/LEFT/CROSS). **Auto-join (FK)** creates joins from foreign keys
  of the tables on the canvas. (You can't connect a table instance to itself.)
- **Output columns:** ticked columns become outputs with an optional **aggregate**
  (COUNT/SUM/AVG/MIN/MAX), an alias, and reordering. **GROUP BY** is auto-added
  for the non-aggregated outputs when any aggregate is used. **DISTINCT** toggle.
- **WHERE:** the same nested AND/OR **filter tree** (reused from the filter
  builder), with columns qualified as `alias.column`. **ORDER BY** picker.
- **Live SELECT** pane updates as you design (dialect-correct quoting + joins).
  **Preview results** runs the generated SELECT (with **bound parameters**) in a
  query tab; **Save as view** hands the generated SELECT to the view-save path
  (`CREATE OR REPLACE VIEW` on PG/MySQL, DROP + CREATE on SQLite) and refreshes
  the tree so you can open its data.

**Safety:** identifiers come from the schema catalog and are quoted per dialect.
Preview uses bound parameters; the **stored view** inlines literals with proper
escaping (a value like `O'Brien` becomes `'O''Brien'`, a literal `%` stays
literal) — verified injection-safe. Reverse-parsing an arbitrary saved SELECT
back into the visual model is out of scope; edit complex views as SQL in the
object editor.

## Views, functions & procedures

The object tree groups each schema's objects into **Tables / Views / Functions /
Procedures** (lazy-loaded). Right-click to manage them; all DDL runs in main and
destructive ops are confirmed.

- **Views** (PG / MySQL / SQLite): right-click a schema → **New view…** (name +
  a SQL editor for the `SELECT` body, with an **OR REPLACE** toggle on PG/MySQL),
  or a view → **Edit view…** (its definition is loaded), **Open view data**
  (browses it in the paginated grid), **Drop view…**. SQLite views are read-only
  and have no `OR REPLACE`, so **editing a SQLite view does DROP + CREATE inside
  a transaction** — the exact statements are shown and you tick a confirm box.
- **Functions & procedures** (PG / MySQL): New/Edit open a SQL editor pre-filled
  with a dialect template (new) or the object's real definition (edit — PG via
  `pg_get_functiondef`, MySQL via `SHOW CREATE`). PG uses `CREATE OR REPLACE`;
  **MySQL routines have no `OR REPLACE`, so an edit does DROP + CREATE** (confirmed).
  Routine bodies containing `;` are sent to the driver as **one statement** (no
  client `DELIMITER` needed; PG `$$` dollar-quoting and MySQL single-statement
  `COM_QUERY` both work). Dropping a PG function includes its **arg signature**
  (shown in the tree) so the right overload is targeted.
- **SQLite** cleanly shows *Functions / Procedures — n/a (SQLite)* (no crash).

> **MySQL functions:** creating a stored **function** on a server with binary
> logging enabled requires either `SUPER`/`SYSTEM_VARIABLES_ADMIN` or
> `log_bin_trust_function_creators = 1`. The dev `dbtool` user has neither, so
> connect as **root** to create MySQL functions (procedures and views work as
> `dbtool`). The app surfaces the server's error next to the editor.

## Structure management (DDL)

Create and edit databases, schemas, and tables through a visual designer with a
**live DDL preview** — no hand-writing SQL required. All DDL is **generated and
executed in the main process** (per-driver generators); the renderer only sends
a structured table spec / object op over typed IPC, and the SQL that runs is
always re-generated in main so it matches the preview exactly.

- **Table designer** (opens in a tab). Right-click a schema → **New table…**, or
  a table → **Design table…**. Edit columns, mark **primary keys**, add **foreign
  keys** (referenced tables come from the schema catalog) and **indexes**. The
  right pane shows the exact `CREATE`/`ALTER` SQL live as you edit, with **Copy
  SQL** and **Apply**.
- **Full per-engine type system.** The column type picker is a categorized
  dropdown (Numeric / String / Date-Time / JSON / …) driven by a data-driven
  catalog in `src/shared/typeCatalog.ts` — the single source of truth for both
  the UI and the DDL generator. Choosing a type reveals only the inputs it needs:
  **length** (VARCHAR/CHAR/BINARY), **precision + scale** (DECIMAL/NUMERIC),
  **ENUM/SET values** (MySQL), a **WITH TIME ZONE** toggle (PG TIME/TIMESTAMP),
  **UNSIGNED / ZEROFILL** (MySQL numerics), and an **array `[]`** toggle (PG).
  Inline validation (length > 0, scale ≤ precision, ENUM needs ≥ 1 value, MySQL
  VARCHAR needs a length) blocks Apply until fixed. The preview renders the exact
  type — `VARCHAR(255)`, `NUMERIC(10,2)`, `TIMESTAMP WITH TIME ZONE`,
  `INT UNSIGNED`, `ENUM('a','b','c')`, `TEXT[]`. **EDIT mode round-trips** the
  DB's reported type back into type + params (PG `information_schema` incl.
  arrays/timezone; MySQL `COLUMN_TYPE` incl. unsigned/enum/set; SQLite declared
  type). SQLite shows an affinity note since its declared types map to the five
  storage classes.
- **Object ops** from the tree right-click menu: New database/schema, Drop
  schema, Rename / Truncate / Drop table.
- **Destructive-change confirmation.** Any data-losing change (DROP TABLE/COLUMN/
  SCHEMA, TRUNCATE, dropping a PK/FK, a type change, adding NOT NULL) is flagged
  with the exact SQL and requires you to **retype the object name** before it runs.
- **Transactions.** PostgreSQL and SQLite apply DDL in a transaction (rolled back
  on error). MySQL DDL is not transactional, so statements apply one at a time and
  the failing statement is reported.
- **SQLite rebuild.** SQLite can't `ALTER` most things in place, so type/nullable/
  PK/FK edits generate the standard **create-copy-drop-rename rebuild** inside a
  transaction (with foreign keys temporarily disabled). The preview shows the
  rebuild steps, and existing data is preserved.

> **MySQL databases:** creating/dropping a MySQL *database* needs privileges the
> dev `dbtool` user doesn't have (it only owns `dbtool_dev.*`). Connect as
> **root** (`root` / `rootpw`) to manage databases. PostgreSQL schema create/drop
> works with the default `dbtool` superuser. SQLite "databases" are files — make
> one by adding a SQLite connection pointing at a new file path.

## What's next (feature backlog)

Deliberately **out of scope** for now; the natural next steps:

- **Keyset/seek pagination** + approximate counts for extreme-scale tables
- **Saved / named filters** + free-text WHERE editor; persist the builder filter
  per table across restart; drag-reorder conditions
- **Data grid** bulk paste from spreadsheets
- **Import / export** (CSV, SQL dump)
- **ER diagrams** and **schema diff / sync**
- **Triggers, events**, materialized-view refresh, routine debugging,
  parameter-form execution UI
- **View builder:** reverse-engineering arbitrary SELECTs back into the visual
  model, subqueries/CTEs, UNION designer, window-function UI
- **Visual query builder**
- **Backup / restore**
- **OS-keychain credential storage** (replace plaintext JSON)

Already shipped: schema-aware autocomplete, multi-tab query sessions, query
history, visual DDL / table designer (full per-engine type system), full grid
CRUD (insert/update/delete), server-side pagination with sort, per-column quick
filters, a nested AND/OR visual filter builder, views + functions/procedures
management, and a drag-and-drop visual view builder across PG/MySQL/SQLite;
packaging / installers (electron-builder, see above).
```
