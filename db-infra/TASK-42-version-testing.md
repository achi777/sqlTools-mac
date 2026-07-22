# TASK 42: DB Tool — Multi-version compatibility testing (PG 13/14/15, MySQL 5.7) (AUTONOMOUS)
# Windows 11 / Docker Desktop + WSL2. Depends on all prior tasks (the built app).

# ROLE & CONTEXT
The app is verified only against PostgreSQL 16 and MySQL 8. Test it against
additional POPULAR versions on Docker, find what breaks, FIX what's reasonably
fixable, and produce a clear COMPATIBILITY REPORT. Target versions to add:
- PostgreSQL 13, 14, 15 (plus keep 16)
- MySQL 5.7 (plus keep 8.0)
(Optionally PostgreSQL 12 and MariaDB 11 if quick — see optional.)
The user has authorized autonomous Docker use on this empty dev machine.

# ✅ AUTONOMOUS PERMISSIONS
- Run Docker: pull images, start containers on NEW ports, exec, inspect, stop
- npm install (project-local), npm run <script>, run the app in dev + smoke
- Use chrome-devtools MCP for UI verification if helpful
- Create/edit/read files anywhere inside the db-tool project folder

# ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; NO deleting the EXISTING TASK 01 containers/volumes
  (dbtool-postgres PG16 : 5432, dbtool-mysql MySQL8 : 3306) — leave them intact.
- NEW version containers must use DIFFERENT host ports + DIFFERENT container
  names + their OWN volumes, so nothing collides with or harms the existing
  seeded setup. Example ports: PG13→5433, PG14→5434, PG15→5435, MySQL5.7→3307.
- NO host/system config changes (.wslconfig, WSL, Docker Desktop settings);
  NO -g installs.
- You MAY stop/remove the NEW test containers you create when done (that's
  cleanup of your own disposable objects), but NEVER the TASK 01 ones.

# SETUP
1. Create a SEPARATE compose file, e.g. docker/docker-compose.versions.yml,
   defining the extra version containers (distinct names/ports/volumes),
   each seeded with the SAME schema/seed as TASK 01 (reuse the init SQL,
   adapted per engine/version if needed). Resource limits similar to TASK 01.
2. Start them; wait for healthchecks.

# WHAT TO TEST (per version, through the app)
For each new version, add a connection and exercise the core + advanced
features, recording PASS/PARTIAL/FAIL + the reason:
- Connect + list schemas/tables; browse a table (pagination).
- Schema-aware autocomplete (tables + columns).
- Grid CRUD (insert via new row, edit cell, delete) by PK.
- Filters: per-column, funnel (nested AND/OR), Custom WHERE; filtered count.
- Table designer: create/alter a disposable `_vtest_` table (types, PK, FK,
  index); the type system.
- Objects: Views, Functions, Procedures, Sequences (PG), Triggers, Indexes —
  list + create/edit/drop a disposable one where the engine supports it.
- ER diagram render + a disposable FK draw.
- Visual View Builder: build + save a disposable view; reverse-parse (open a
  simple view in builder).
- Import/Export (CSV/JSON/Excel/SQL) round-trip on a disposable table.
- DB dump + restore into a disposable database.
- Data transfer (if TASK 31 done): a small transfer.
Clean up all disposable objects on each version afterward.

# KNOWN RISK AREAS (check these specifically)
- PostgreSQL < 10 features: pg_sequences (10+) — but we're testing 13-15 so
  fine; still confirm Sequences work on 13/14/15.
- MySQL 5.7: NO CTE (WITH), NO window functions — anything relying on them
  (e.g. reverse view parsing, some queries) may fail on 5.7. information_schema
  differences vs 8.0 for routines/triggers. JSON exists in 5.7 but some 8.0
  syntax differs. caching_sha2_password is 8.0 default; 5.7 uses
  mysql_native_password (connection/auth should still work via mysql2 —
  confirm).
- Identifier quoting / type introspection differences across versions.

# FIX POLICY
- Where a failure is a REASONABLE compatibility fix (e.g. a version-guarded
  query, a fallback for a missing catalog view, avoiding a 8.0-only syntax on
  5.7), FIX IT — prefer feature-detection or version-detection with graceful
  fallback, and keep 16/8.0 behavior intact.
- Where a feature genuinely can't work on an old version (e.g. window-function-
  dependent behavior on MySQL 5.7), DON'T hack around it — detect the version
  and show a clear "not supported on this version" note, and record it in the
  report. Don't degrade the modern-version experience.

# STEPS (autonomous, in order)
1. Create docker-compose.versions.yml (PG13/14/15, MySQL5.7; distinct ports/
   names/volumes) + seed; start; wait healthy.
2. Test each version through the app per the matrix above; log PASS/PARTIAL/
   FAIL + reasons.
3. Fix reasonable compatibility issues (version/feature detection + fallbacks),
   keeping PG16/MySQL8 behavior unchanged. Re-test the fixed items.
4. Produce a COMPATIBILITY REPORT (a markdown file in the repo, e.g.
   COMPATIBILITY.md) with a matrix: feature × version = PASS/PARTIAL/FAIL +
   notes, and a short "supported versions" summary for the README.
5. npm run typecheck + npm run build clean.
6. Clean up: stop/remove the NEW version containers + their volumes (they're
   your disposable test infra); LEAVE the TASK 01 PG16/MySQL8 intact. Remove
   disposable DB objects created during testing.

# OPTIONAL (only if quick)
- PostgreSQL 12 and MariaDB 11.x as extra data points, same approach; note
  MariaDB caveats explicitly if tested.

# DONE = the app is tested against PostgreSQL 13/14/15 and MySQL 5.7 (on
disposable Docker containers separate from the TASK 01 setup), with reasonable
compatibility issues fixed via version/feature detection (PG16/MySQL8 behavior
unchanged) and genuine limitations clearly reported; a COMPATIBILITY.md matrix
(feature × version) + a README "supported versions" summary produced; new test
containers cleaned up, TASK 01 containers untouched; typecheck + build clean.
