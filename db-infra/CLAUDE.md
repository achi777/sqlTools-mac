# CLAUDE.md — db-infra (PROJECT-SCOPED)

This file applies to the `db-infra` project only. Do not let these
instructions leak into or govern any other project.

## Autonomous mode (this project only)

This project runs in **AUTONOMOUS mode** for a fresh, empty dev machine.
The user's **global "write-only" rule is intentionally RELAXED HERE** — you
may run Docker and project-local dev commands yourself without asking each
time. This relaxation is scoped to `db-infra` and nowhere else.

The following **guardrails still apply**, always:

- **No pruning:** never `docker system prune`, `docker volume prune`, or
  `docker image prune -a`.
- **No volume deletion:** never `docker compose down -v` or otherwise delete
  volumes (that wipes DB data). If a clean re-seed is needed, **STOP and ask
  the user first**.
- **No deletes outside this project folder.** No `rm -rf` outside `db-infra`.
- **No host/system config changes:** `.wslconfig`, WSL settings, Windows
  services, Docker Desktop settings, global npm, PATH, etc. are off-limits.
- **No global installs** (`-g`).

Everything non-destructive inside this project: just do it.

## What this project is

Local database infrastructure for a Navicat-style desktop database tool
(Electron + TypeScript). It provides three databases for development:

1. **PostgreSQL 16** — Docker (`dbtool-postgres`, port 5432)
2. **MySQL 8** — Docker (`dbtool-mysql`, port 3306)
3. **SQLite 3** — file-based, no container; the app creates the `.sqlite`
   file at runtime and applies `db/sqlite/schema.sql` + `db/sqlite/seed.sql`.

Credentials (dev only): user/pass `dbtool`/`dbtool`, database `dbtool_dev`;
MySQL root password `rootpw`. See `docker/README.md` for full details and
copy-paste PowerShell commands.

The Electron app, UI, and driver TypeScript are **out of scope** for this
infra project.

## DB abstraction contract (for the app that consumes this)

All three engines (PostgreSQL, MySQL, SQLite) must sit behind **one**
TypeScript interface, so the app is engine-agnostic. The interface exposes:

- `connect(config)` — open a connection/pool for a given engine + creds.
- `listSchemas()` — enumerate schemas/databases.
- `listTables(schema)` — enumerate tables in a schema.
- `runQuery(sql, params)` — execute a query, return rows + column metadata.
- `streamRows(sql, params)` — stream large result sets incrementally.
- `getTableStructure(schema, table)` — columns, types, keys, indexes, FKs.

Engine-specific quirks (PG arrays/JSONB, MySQL JSON, SQLite type affinity)
are normalized behind this interface.

## Security requirements (for the app)

- **DB credentials and driver code live in the Electron MAIN process ONLY**,
  never in the renderer.
- Renderer ⇄ main communication is via **typed IPC** only.
- Electron `BrowserWindow` must use **`contextIsolation: true`** and
  **`nodeIntegration: false`**.
- The renderer never holds a direct DB handle or raw credentials.
