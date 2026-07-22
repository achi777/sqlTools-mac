# TASK: DB Tool — Local Database Infrastructure (AUTONOMOUS MODE)
# Windows 11 / Docker Desktop + WSL2 (Ubuntu). Docker 29.x already installed & working.

## ROLE & CONTEXT
You are setting up the local database infrastructure for a Navicat-style
desktop database tool (Electron + TypeScript). This task creates the DB
layer the app will connect to during development. The app itself is NOT
part of this task.

This is a FRESH, EMPTY dev machine with nothing important on it. You are
authorized to run Docker and related dev commands yourself (autonomous
mode) — see the permission rules below. Do the whole thing end to end:
write files, bring the stack up, verify it, and report status.

## ✅ AUTONOMOUS PERMISSIONS (you MAY run these yourself)
- All Docker commands: `docker`, `docker compose up -d`, `docker pull`,
  `docker ps`, `docker compose ps`, `docker compose logs`, `docker exec`
- DB client checks inside containers: `docker exec ... psql ...`,
  `docker exec ... mysql ...` to verify seed data loaded
- `npm install` of project-local packages (no global installs needed here)
- Create / edit / read files anywhere inside THIS project folder
- `sqlite3` against the local .sqlite file to verify schema/seed

## ⛔ GUARDRAILS (do NOT do these without explicitly asking the user first)
These exist to prevent wide, unintended side effects — not because there's
data to protect (there isn't), but because a stray flag can nuke unrelated
things on the machine:
- NO `docker system prune` / `docker volume prune` / `docker image prune -a`
- NO `docker compose down -v` or any volume deletion (would wipe DB data;
  if you need a clean re-seed, ASK first, then the user decides)
- NO `rm -rf` anywhere outside this project folder; no deletes outside it
- NO changes to host/system config: `.wslconfig`, WSL settings, Windows
  services, Docker Desktop settings, global npm, PATH, etc.
- NO `-g` global installs
- If a destructive/reset action seems necessary, STOP and ask the user with
  a one-line explanation. Everything non-destructive: just do it.

(Background: the user has a standing "write-only" rule for their production
work after an incident where an agent deleted Ollama model files. That rule
is intentionally RELAXED for THIS empty dev project only. Respect the
guardrails above so the relaxation stays safe.)

## GOAL
Local DB infrastructure. Three databases available for development:
1. PostgreSQL 16 — Docker
2. MySQL 8    — Docker
3. SQLite 3   — file-based, NO container (app creates the .sqlite at
                runtime; you provide schema + seed scripts and verify them
                against a throwaway local file)

## PROJECT STRUCTURE TO CREATE
```
db-infra/
├── docker/
│   ├── docker-compose.yml
│   ├── init/
│   │   ├── postgres/01-seed.sql
│   │   └── mysql/01-seed.sql
│   └── README.md
├── db/
│   └── sqlite/
│       ├── schema.sql
│       └── seed.sql
├── .env.example
├── .gitignore
└── CLAUDE.md
```

## DELIVERABLES (files)

### 1. docker/docker-compose.yml
PostgreSQL service:
- image: postgres:16
- container_name: dbtool-postgres
- ports: "5432:5432"
- environment: POSTGRES_USER=dbtool, POSTGRES_PASSWORD=dbtool,
  POSTGRES_DB=dbtool_dev
- volume: named `pgdata` -> /var/lib/postgresql/data
- mount ./init/postgres -> /docker-entrypoint-initdb.d:ro
- healthcheck: pg_isready -U dbtool (interval 10s, timeout 5s, retries 5)
- deploy.resources.limits: cpus "1.0", memory 768M
- restart: unless-stopped

MySQL service:
- image: mysql:8
- container_name: dbtool-mysql
- ports: "3306:3306"
- environment: MYSQL_ROOT_PASSWORD=rootpw, MYSQL_DATABASE=dbtool_dev,
  MYSQL_USER=dbtool, MYSQL_PASSWORD=dbtool
- volume: named `mysqldata` -> /var/lib/mysql
- mount ./init/mysql -> /docker-entrypoint-initdb.d:ro
- healthcheck: mysqladmin ping -h localhost -u root -prootpw
  (interval 10s, timeout 5s, retries 5)
- deploy.resources.limits: cpus "1.0", memory 768M
- restart: unless-stopped

Shared bridge network `dbtool-net`. Declare named volumes `pgdata`,
`mysqldata` at the bottom.

### 2. docker/init/postgres/01-seed.sql
Realistic schema that exercises type handling:
- Tables: customers, orders, order_items with proper FKs
- Varied PG types: SERIAL/BIGSERIAL PKs, TEXT, VARCHAR, JSONB (customer
  metadata), TIMESTAMPTZ, NUMERIC(10,2), BOOLEAN, TEXT[] (tags)
- A couple indexes + one CHECK constraint
- ~50 rows realistic seed data across tables
- Top comment: runs once on first container init (empty volume)

### 3. docker/init/mysql/01-seed.sql
- Same customers/orders/order_items shape with FKs
- MySQL 8 types: BIGINT AUTO_INCREMENT, VARCHAR, JSON, DATETIME,
  DECIMAL(10,2), TINYINT(1) boolean, tags as JSON (comment: MySQL has no
  array type)
- InnoDB, utf8mb4
- ~50 rows seed data

### 4. db/sqlite/schema.sql + db/sqlite/seed.sql
- schema.sql: customers/orders/order_items for SQLite. INTEGER PRIMARY KEY
  AUTOINCREMENT, TEXT for JSON (comment on type affinity), note
  `PRAGMA foreign_keys = ON;`
- seed.sql: ~50 rows matching the others as closely as SQLite allows
- Top comment: applied by the APP at runtime, not by Docker

### 5. docker/README.md
Windows/PowerShell copy-paste blocks for the user:
- Docker Desktop must be running
- Start: `cd docker` then `docker compose up -d`
- Status/health: `docker compose ps`
- Logs: `docker compose logs -f postgres` / `... mysql`
- Stop (keep data): `docker compose down`
- Reset incl. data: `docker compose down -v`  (mark clearly as DESTRUCTIVE)
- Connection details table (PG 5432, MySQL 3306, SQLite file path), all
  creds dbtool/dbtool, db dbtool_dev, MySQL root rootpw
- Note: seed loads only on FIRST init (empty volume)

### 6. .env.example  and  .gitignore
- .env.example: PG_*, MYSQL_*, SQLITE_PATH vars + comment that real .env is
  gitignored
- .gitignore: `.env`, `db/sqlite/*.sqlite`, `node_modules/`

### 7. CLAUDE.md  (PROJECT-SCOPED — do not let it leak to other projects)
- State clearly: "This project runs in AUTONOMOUS mode for a fresh empty
  dev machine. The user's global write-only rule is intentionally relaxed
  HERE. Guardrails (no prune, no down -v, no deletes outside project, no
  host/system config changes) still apply."
- DB abstraction contract: PostgreSQL, MySQL, SQLite behind ONE TypeScript
  interface — connect, listSchemas, listTables, runQuery, streamRows,
  getTableStructure.
- Security: DB creds + driver code in Electron MAIN process only, never
  renderer. Renderer <-> main via typed IPC. contextIsolation: true,
  nodeIntegration: false.

## EXECUTION STEPS (do these in order, autonomously)
1. Create all files above.
2. `cd docker && docker compose up -d`
3. Wait for healthchecks to pass (poll `docker compose ps` until both
   services are healthy; give MySQL up to ~60s on first boot).
4. Verify PostgreSQL seed: `docker exec dbtool-postgres psql -U dbtool -d
   dbtool_dev -c "SELECT count(*) FROM customers;"` (expect rows).
5. Verify MySQL seed: `docker exec dbtool-mysql mysql -udbtool -pdbtool
   dbtool_dev -e "SELECT count(*) FROM customers;"`.
6. Verify SQLite: apply schema.sql + seed.sql to a throwaway
   ./db/sqlite/_verify.sqlite with sqlite3, run a count, then delete ONLY
   that _verify.sqlite file (it's inside the project — allowed).
7. Print a final summary: `docker compose ps` output + row counts for all
   three databases, and the connection details.

## OUT OF SCOPE
- The Electron app, UI, driver TypeScript code. This task = DB infra +
  config + seed + verification only.

## DONE = stack is UP, all three databases seeded and verified, and you've
printed the status summary + connection details for the user.
