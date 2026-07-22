# TASK 43: DB Tool — Add MariaDB as a first-class engine (AUTONOMOUS)
# Windows 11 / Docker Desktop + WSL2. Depends on TASK 01/02/05/…/42 (the built app + MySQL driver).

# ROLE & CONTEXT
Add MariaDB as a FIRST-CLASS engine alongside PostgreSQL, MySQL, and SQLite:
its own connection option, tree support, and full feature support — not just
"MySQL might work". Set up MariaDB on Docker, wire a MariaDB driver that reuses
the MySQL driver where identical but overrides where MariaDB differs, and test
the full feature set. The user authorized autonomous Docker use on this empty
dev machine.

# ✅ AUTONOMOUS PERMISSIONS
- Run Docker: pull/start MariaDB on a NEW port, exec, inspect, stop
- npm install (project-local), npm run <script>, run app in dev + smoke
- Use chrome-devtools MCP for UI verification
- Create/edit/read files anywhere inside the db-tool project folder

# ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; do NOT touch existing TASK 01 containers
  (dbtool-postgres:5432, dbtool-mysql:3306) or the TASK 42 version containers.
- MariaDB container: NEW name + NEW port (e.g. 3308) + own volume.
- NO host/system config changes; NO -g installs.
- Verify structural changes on DISPOSABLE objects; don't harm seeded data.

# APPROACH: MariaDB driver reuses MySQL, overrides differences
The app already has a DbDriver interface with per-engine implementations. Add
MariaDB as its own engine value, backed by a driver that EXTENDS/REUSES the
MySQL driver (mysql2 connects to MariaDB fine) and OVERRIDES where MariaDB
differs. Key known differences to handle:
- SEQUENCES: MariaDB (10.3+) HAS CREATE SEQUENCE (MySQL does not). So MariaDB
  should expose a Sequences node (like PG) — implement listing/create/alter/
  drop for MariaDB sequences (information_schema / SHOW). This is the biggest
  divergence from MySQL.
- Version/identity: MariaDB reports its own version string (e.g. "10.11.x-
  MariaDB"); detect MariaDB vs MySQL from the server version/handshake so the
  right driver/behavior is chosen. A connection labeled MySQL that turns out
  to be MariaDB could also be detected, but primary path: the user picks
  "MariaDB" as the engine.
- CHECK constraints: MariaDB enforces CHECK (MySQL 5.7 parses-but-ignores;
  8.0 enforces) — fine, just note.
- Some information_schema/system-table nuances (routines, triggers, engines);
  RETURNING clause exists in newer MariaDB (10.5+) but don't rely on it —
  reuse the MySQL insertId approach.
- JSON: MariaDB treats JSON as an alias for LONGTEXT (with CHECK json_valid) —
  handle display/edit accordingly.
Where behavior is identical to MySQL, REUSE the MySQL code (don't duplicate).

# FEATURES
1. ENGINE OPTION: add "MariaDB" to the engine picker in the connection
   manager/form (host/port/user/password/db like MySQL). Default port 3306
   (MariaDB's default), but for the local test connection use the container's
   mapped port.
2. DRIVER: MariaDB driver in src/main/drivers (extends/reuses mysql.ts),
   overriding sequences + any introspection differences; wired into the driver
   factory + shared types (engine enum) + preload as needed.
3. TREE: MariaDB connections show the right categories — Tables, Views,
   Functions, Procedures, Triggers, Indexes, AND Sequences (since MariaDB has
   them). SQLite-style "not supported" notes only where MariaDB truly lacks a
   thing.
4. ICONS/UI: MariaDB gets an engine indicator (reuse TASK 32/39 iconography;
   a distinct badge/color if easy).
5. Everything else (grid CRUD, filters, designer + type system, view builder,
   ER diagram, import/export, dump/restore, data transfer) should work for
   MariaDB via the reused MySQL paths + MariaDB overrides.

# DOCKER SETUP
- Add a MariaDB service (e.g. mariadb:11) to docker-compose.versions.yml (or a
  small dedicated compose), NEW name/port (3308)/volume, seeded with the same
  init SQL as MySQL (adapt if a statement isn't MariaDB-compatible).
- Start it; wait healthy.

# STEPS (autonomous, in order)
1. Add MariaDB to Docker (mariadb:11, port 3308, own volume) + seed.
2. Add "MariaDB" engine enum + connection-form option + driver factory entry.
3. Implement the MariaDB driver reusing mysql.ts, overriding sequences +
   introspection differences + version detection.
4. Tree categories incl. Sequences for MariaDB; engine icon/indicator.
5. Verify against the MariaDB container through the app (+ headless smoke):
   - Connect; list schemas/tables; browse + paginate.
   - Autocomplete; grid CRUD by PK; filters (column/funnel/custom).
   - Designer: create/alter a disposable `_mtest_` table (types/PK/FK/index).
   - Objects: Views, Functions, Procedures, Triggers, Indexes create/edit/drop
     (disposable); AND Sequences (MariaDB-specific) create/alter/drop.
   - ER diagram; View Builder build+save + reverse-parse a simple view.
   - Import/Export round-trip; DB dump + restore into a disposable DB;
     data transfer (if TASK 31 done) MariaDB<->MySQL/PG small test.
   - Clean up disposable objects.
6. Update COMPATIBILITY.md + README ("Supported: PostgreSQL 13+, MySQL 5.7+,
   MariaDB 10.5+/11, SQLite") with MariaDB results + any caveats.
7. npm run typecheck + npm run build clean.
8. Clean up: stop/remove the MariaDB test container + volume when done (or
   leave it running for the user to use — state which). Leave TASK 01/42
   containers intact.

# DONE = MariaDB is a first-class engine: selectable in the connection form,
with a driver that reuses MySQL where identical and overrides MariaDB
differences (notably Sequences, version detection, JSON/CHECK nuances), full
tree categories (incl. Sequences), and all major features working, verified
against a real MariaDB (mariadb:11) container on a disposable port through the
app; COMPATIBILITY.md + README updated; disposable objects cleaned; TASK 01/42
containers untouched; typecheck + build clean.
