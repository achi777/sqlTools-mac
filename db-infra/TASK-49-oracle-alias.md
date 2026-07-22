# TASK 49: DB Tool — Fix Oracle table aliases in the Visual View Builder (ORA-00933) (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 12/45/46/47.

# ROLE & CONTEXT
The Visual View Builder generates invalid SQL for ORACLE: it uses "AS" before
TABLE aliases, which Oracle does not accept, causing ORA-00933 ("SQL command
not properly ended").

Broken output today:
  SELECT "t1"."EMAIL", ..., "t2"."ID" AS "ORDERS_ID", ...
  FROM "DBTOOL"."CUSTOMERS" AS "t1"
    INNER JOIN "DBTOOL"."ORDERS" AS "t2" ON "t1"."ID" = "t2"."CUSTOMER_ID"
                                   ^^^^ Oracle rejects AS for TABLE aliases

Correct Oracle form (table alias WITHOUT AS; column aliases WITH AS are fine):
  SELECT "t1"."EMAIL", ..., "t2"."ID" AS "ORDERS_ID", ...
  FROM "DBTOOL"."CUSTOMERS" "t1"
    INNER JOIN "DBTOOL"."ORDERS" "t2" ON "t1"."ID" = "t2"."CUSTOMER_ID"

Fix the SELECT generator so table aliases are emitted per-dialect. Execution
path change only where needed; keep other engines working exactly as today.

# ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local), npm run <script>, run app in dev + smoke
- Connect to the running containers (Oracle XE 1522 + the others) to verify
- Use chrome-devtools MCP for UI verification
- Create/edit/read files anywhere inside the db-tool project folder

# ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; don't touch existing containers/data.
- Verify with DISPOSABLE `_VBTEST_*` views; drop them after. Don't alter the
  seeded schemas.
- NO host/system config changes; NO -g installs.

# THE FIX
1. TABLE ALIASES: add a per-dialect rule in the SELECT/FROM/JOIN generation:
   - Oracle: emit  <table> <alias>   (NO "AS")
   - PostgreSQL / MySQL / MariaDB / SQLite: keep the current behavior (AS is
     accepted by all of them; don't churn what works — but emitting without AS
     is also valid everywhere, so a single "no AS for table aliases" rule is an
     acceptable simplification IF you verify all five engines still work).
     Prefer the minimal change: dialect-aware, Oracle omits AS.
2. COLUMN ALIASES: keep "AS" — valid in Oracle and everywhere else. Do not
   change these.
3. ALIAS CASING/QUOTING on Oracle: the generator currently emits lowercase
   quoted aliases ("t1"). Quoted lowercase works in Oracle as long as every
   reference is identically quoted — verify that end to end. If it proves
   fragile, prefer uppercase aliases (T1/T2) consistent with the TASK 46
   quoting policy. Choose one and make it consistent across SELECT list, FROM,
   JOIN ON, WHERE, GROUP BY, ORDER BY.
4. Check the SAME issue anywhere else the app builds SQL with table aliases for
   Oracle (e.g. paginated browse with an alias, data transfer source queries,
   dump generation, reverse-view parsing round-trip). Fix consistently.

# STEPS (autonomous, in order)
1. Locate the view-builder SELECT generator's FROM/JOIN alias emission; make it
   dialect-aware (Oracle: no AS).
2. Audit other SQL builders for `AS <table alias>` patterns used against Oracle;
   fix them too.
3. Verify against the running containers:
   ORACLE:
   - Rebuild the same scenario in the Visual View Builder (customers t1 INNER
     JOIN orders t2 on customer_id), with the duplicate-id auto-aliasing from
     TASK 16 -> the generated SELECT runs with NO ORA-00933; Preview shows rows.
   - Save it as a disposable view `_VBTEST_ORA` -> saving succeeds; open its
     data; then drop it.
   - Try a LEFT JOIN and a self-join (customers t1 / customers t2) -> valid.
   - Add a WHERE via the filter tree and a GROUP BY/aggregate -> still valid.
   OTHER ENGINES (no regression):
   - Repeat a quick build+preview+save on PostgreSQL, MySQL, MariaDB, SQLite ->
     all still generate valid SQL and save.
4. Confirm the bottom filter-SQL panel (TASK 34/47) and any displayed SQL stay
   consistent with the fix.
5. npm run typecheck + npm run build clean.
6. Leave a clean state (dev server stopped; `_VBTEST_*` dropped; seeded schemas
   untouched).

# DONE = the Visual View Builder emits table aliases WITHOUT "AS" on Oracle (and
keeps column-alias "AS"), with consistent alias quoting/casing across the whole
statement, so building/previewing/saving views on Oracle works with no
ORA-00933 — verified with INNER/LEFT/self joins plus WHERE and aggregates on the
real Oracle XE container using disposable views — and with no regression on
PostgreSQL, MySQL, MariaDB, or SQLite; any other Oracle SQL builders using table
aliases audited and fixed; typecheck + build clean.
