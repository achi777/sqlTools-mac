# TASK 47: DB Tool — Fix identifier quoting in the filter SQL panel (MariaDB backticks + Oracle noise) (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 34 (filter SQL bottom panel).

# ROLE & CONTEXT
The read-only filter SQL panel (TASK 34) renders identifiers with the WRONG or
NOISY quoting on two engines:
- MARIADB (real bug): it emits ANSI double quotes, e.g.
    SELECT * FROM "dbtool"."customers" ORDER BY "id"
  MariaDB (like MySQL) uses BACKTICKS by default; double quotes only work when
  the ANSI_QUOTES sql_mode is enabled. So the displayed SQL is NOT
  copy-paste-runnable. MariaDB must use `backticks`.
- ORACLE (cosmetic): it emits
    SELECT * FROM "DBTOOL"."CUSTOMERS" ORDER BY "ID"
  This is technically VALID (and runnable, since the app consistently uses
  uppercase quoted identifiers), but noisy. Oracle folds unquoted identifiers
  to uppercase anyway, so plain DBTOOL.CUSTOMERS ... ORDER BY ID is equivalent
  and much more readable.

Fix both by adopting "quote only when necessary" + the correct quote character
per engine, in the DISPLAY renderer. Do NOT change the parameterized execution
path (which must keep working exactly as today).

# ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local), npm run <script>, run app in dev + smoke
- Use chrome-devtools MCP to view the panel
- Connect to the running containers (PG/MySQL/SQLite/MariaDB/Oracle) to verify
- Create/edit/read files anywhere inside the db-tool project folder

# ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; don't touch existing containers/data
- NO host/system config changes; NO -g installs
- Display-only change: execution stays parameterized and unchanged.

# RULES
1. QUOTE CHARACTER per engine (display renderer):
   - PostgreSQL, SQLite, Oracle: double quotes "..."
   - MySQL, MariaDB: backticks `...`
   Make sure MariaDB is treated as MySQL-family everywhere in the display
   quoting logic (this is the bug — it likely fell through to a generic/ANSI
   branch). Audit for other places where 'mariadb' may not be grouped with
   'mysql'.
2. QUOTE ONLY WHEN NECESSARY: emit an identifier UNQUOTED when it is safe:
   - matches the engine's plain-identifier pattern (letters/digits/underscore,
     not starting with a digit), AND
   - is not a reserved word for that engine, AND
   - matches the engine's natural case folding:
       * Oracle: unquoted folds to UPPERCASE -> if the identifier is already
         all-uppercase, emit it UNQUOTED (DBTOOL.CUSTOMERS, ORDER BY ID).
         Quote only if it's lowercase/mixed-case/has specials/reserved.
       * PostgreSQL: unquoted folds to lowercase -> if the identifier is all
         lowercase and safe, emit unquoted; quote if mixed/upper/special.
       * MySQL/MariaDB: case handling is looser; emit unquoted when safe,
         backticks otherwise.
       * SQLite: emit unquoted when safe, double quotes otherwise.
   Keep a conservative reserved-word list per engine (common keywords) so we
   never emit something that would break; when in doubt, QUOTE.
3. The result must remain COPY-PASTE-RUNNABLE on the target engine. That is the
   acceptance bar: copy the shown SQL, run it in that engine, it works.
4. Apply the same display-quoting helper anywhere else the app SHOWS SQL to the
   user (e.g. DDL previews, dump headers, generated SELECT in the view builder)
   IF they share the renderer — but do not alter the EXECUTION/DDL-generation
   quoting that is already verified working (TASK 46 Oracle DDL relies on
   consistent quoted uppercase; leave execution/DDL as-is unless you can prove
   no regression).

# STEPS (autonomous, in order)
1. Find the display SQL renderer used by the filter panel; add a per-engine
   quoteIdentifierForDisplay(name, engine) implementing the rules above
   (correct quote char + quote-only-when-necessary + reserved words).
2. Ensure MariaDB is grouped with MySQL (backticks) here and audit for other
   spots where mariadb might be mishandled in display logic.
3. Verify against the running containers (all five engines):
   - PostgreSQL: SELECT * FROM customers ORDER BY id  (unquoted, lowercase) —
     copy + run works.
   - MySQL and MariaDB: backticks only when needed; copy + run works on BOTH
     (explicitly test MariaDB — the reported bug).
   - SQLite: unquoted when safe; runnable.
   - Oracle: SELECT * FROM DBTOOL.CUSTOMERS ORDER BY ID (unquoted uppercase);
     copy + run works. Also confirm a lowercase/mixed or reserved-word
     identifier still gets quoted correctly.
   - With filters active (quick / funnel / custom WHERE), the WHERE clause
     identifiers follow the same rules and the whole statement runs.
   - A value containing a quote (O'Brien) is still escaped correctly.
4. Confirm NO regression in execution: browsing/filtering/CRUD/DDL still work
   on all five engines (execution path untouched); smoke suite passes.
5. npm run typecheck + npm run build clean.
6. Leave a clean state (dev server stopped).

# DONE = the filter SQL panel renders identifiers with the correct quote
character per engine (backticks for MySQL/MariaDB, double quotes for PG/SQLite/
Oracle) and quotes ONLY when necessary (Oracle uppercase and PG lowercase
identifiers appear unquoted), so the shown SQL is copy-paste-runnable on all
five engines — verified by copying and running it on each, including MariaDB
(the reported bug) and Oracle — with no change/regression to the parameterized
execution or the verified DDL generation; typecheck + build clean.
