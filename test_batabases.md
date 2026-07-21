# Test databases — connection details (dev only)

Local databases used by DB Tool (from `db-infra`). **Dev credentials only — not for production.**

## PostgreSQL
| | |
|---|---|
| Host | `localhost` |
| Port | `5432` |
| Username | `dbtool` |
| Password | `dbtool` |
| Database | `dbtool_dev` |
| Docker container | `dbtool-postgres` |

## MySQL
| | |
|---|---|
| Host | `localhost` |
| Port | `3306` |
| Username | `dbtool` |
| Password | `dbtool` |
| Database | `dbtool_dev` |
| Root password | `rootpw` |
| Docker container | `dbtool-mysql` |

## SQLite
File-based — no host/port/username/password.
| | |
|---|---|
| File path | `C:\Users\archi\AppData\Roaming\db-tool\dbtool.sqlite` |
| Schema / seed | `db-infra/db/sqlite/schema.sql` + `seed.sql` |
