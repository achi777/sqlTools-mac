# DB Tool — Local Docker Databases

Local PostgreSQL 16 and MySQL 8 for developing the DB Tool desktop app.
SQLite is file-based and lives outside Docker (see `../db/sqlite/`).

> **Prerequisite:** Docker Desktop must be running (WSL2 backend on Windows).

All commands below are **PowerShell**, run from the `docker/` folder.

## Start the stack

```powershell
cd docker
docker compose up -d
```

Seed scripts under `init/postgres` and `init/mysql` run **only on first init**
(when the named volume is empty). See the note at the bottom.

## Check status / health

```powershell
docker compose ps
```

Wait until both `dbtool-postgres` and `dbtool-mysql` report `healthy`.
MySQL can take up to ~60s on first boot while it initializes its data dir.

## Tail logs

```powershell
docker compose logs -f postgres
docker compose logs -f mysql
```

## Stop the stack (keeps data)

```powershell
docker compose down
```

Containers are removed; the `pgdata` / `mysqldata` volumes are preserved, so
your data (and the fact that seeding already ran) survives.

## Reset including data — ⚠️ DESTRUCTIVE

```powershell
docker compose down -v
```

This **deletes the named volumes**, wiping all database data. On the next
`up -d`, the seed scripts run again from scratch. Only do this when you
intentionally want a clean re-seed.

## Connection details

| Setting        | PostgreSQL          | MySQL               | SQLite                              |
| -------------- | ------------------- | ------------------- | ----------------------------------- |
| Host           | `localhost`         | `localhost`         | n/a (file)                          |
| Port           | `5432`              | `3306`              | n/a                                 |
| Database       | `dbtool_dev`        | `dbtool_dev`        | file path                           |
| App user       | `dbtool`            | `dbtool`            | n/a                                 |
| App password   | `dbtool`            | `dbtool`            | n/a                                 |
| Admin user     | `dbtool` (superuser)| `root`              | n/a                                 |
| Admin password | `dbtool`            | `rootpw`            | n/a                                 |
| File path      | n/a                 | n/a                 | `../db/sqlite/dbtool.sqlite` (app-created) |

The SQLite file is created by the app at runtime by applying
`../db/sqlite/schema.sql` then `../db/sqlite/seed.sql`.

## Quick verification

```powershell
docker exec dbtool-postgres psql -U dbtool -d dbtool_dev -c "SELECT count(*) FROM customers;"
docker exec dbtool-mysql mysql -udbtool -pdbtool dbtool_dev -e "SELECT count(*) FROM customers;"
```

## Note on seeding

The init SQL runs **once**, on the first container start against an empty
volume. After that, changing the seed files has no effect until you reset the
volume (`docker compose down -v`, DESTRUCTIVE) or seed manually via `docker exec`.

## SQL Server 2022 (TASK 58) — in `docker-compose.versions.yml`

`dbtool-mssql` runs **SQL Server 2022** on port **1433**. Unlike PostgreSQL/MySQL,
the MSSQL image does **not** auto-run init scripts, so seed it manually **after it
is healthy**:

```powershell
cd docker
docker compose -f docker-compose.versions.yml up -d mssql
# wait until healthy:
docker inspect --format '{{.State.Health.Status}}' dbtool-mssql
# seed (creates dbtool_dev + customers/orders/order_items + active_customers view):
docker cp init/mssql/seed.sql dbtool-mssql:/tmp/seed.sql
docker exec dbtool-mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'DbTool!Passw0rd' -C -i /tmp/seed.sql
```

Connection: host `localhost`, port `1433`, database `dbtool_dev`, login `sa` /
`DbTool!Passw0rd` (SQL Server Authentication). The app defaults `encrypt` +
`trustServerCertificate` to on (the container uses a self-signed cert).
