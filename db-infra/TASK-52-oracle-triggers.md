# TASK 52: DB Tool — Oracle Triggers (list/create/edit/enable-disable/drop) (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 26/45/46/51.

# ROLE & CONTEXT
Add TRIGGER management for ORACLE under each table (like TASK 26 did for PG/
MySQL/SQLite): list, view definition, create, edit, enable/disable, drop.
Oracle's PL/SQL trigger syntax and catalog differ from the other engines —
handle them correctly. Architecture unchanged: DB work in main; renderer via
typed IPC; destructive ops confirmed.

Prereq: TASK 26 (trigger tree node + UI/flows for other engines — REUSE),
TASK 45 (Oracle driver, ALL_* catalog), TASK 46 (Oracle DDL + quoting),
TASK 51 (pattern for extending an Oracle object category; note the rename
fallthrough bug found there — audit for similar dialect fallthroughs here).

# ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local), npm run <script>, run app in dev + smoke
- Connect to the running Oracle XE container (dbtool-oracle, 1522)
- Use chrome-devtools MCP for UI verification
- Create/edit/read files anywhere inside the db-tool project folder

# ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; don't touch existing containers/data
- Verify with DISPOSABLE `_ORATRG_*` triggers on a DISPOSABLE `_ORATRGTBL_`
  table you create; drop both after. Do NOT attach test triggers to the seeded
  schema or leave any behind.
- NO host/system config changes; NO -g installs.

# ORACLE TRIGGER SPECIFICS (get these right)
1. SYNTAX (single statement, PL/SQL body):
   CREATE [OR REPLACE] TRIGGER name
     {BEFORE | AFTER | INSTEAD OF} {INSERT | UPDATE [OF cols] | DELETE}
       [OR ...] ON table
     [FOR EACH ROW] [WHEN (condition)]
   BEGIN
     ... PL/SQL ...
   END;
   - Oracle HAS "CREATE OR REPLACE TRIGGER" (unlike MySQL) -> use it for EDIT
     (no DROP+CREATE needed). 
   - Row-level refs use :NEW / :OLD (COLON prefix), unlike MySQL's NEW./OLD. —
     make the template use :NEW/:OLD.
   - INSTEAD OF triggers apply to VIEWS (offer where relevant).
   - Statement-level (no FOR EACH ROW) is valid in Oracle.
   - The body contains semicolons and ends with END; -> send the WHOLE
     CREATE TRIGGER as ONE statement through the driver (same single-statement
     handling as TASK 11/26; do NOT split on ';').
2. CATALOG: ALL_TRIGGERS (TRIGGER_NAME, OWNER, TABLE_NAME, TRIGGER_TYPE,
   TRIGGERING_EVENT, STATUS, WHEN_CLAUSE, DESCRIPTION, TRIGGER_BODY).
   - TRIGGER_BODY is a LONG column and can be awkward to read via ALL_TRIGGERS.
     Prefer DBMS_METADATA.GET_DDL('TRIGGER', name, owner) for the full,
     reliable definition (falls back to DESCRIPTION + TRIGGER_BODY if
     GET_DDL is unavailable/insufficient privileges — handle both).
3. STATUS + ENABLE/DISABLE: Oracle triggers are ENABLED or DISABLED.
   - Show STATUS in the list.
   - Offer ALTER TRIGGER name ENABLE / DISABLE actions (this is a real Oracle
     feature the other engines lack — expose it).
4. ⚠️ COMPILATION ERRORS (important): Oracle CREATES a trigger even when its
   PL/SQL fails to compile, marking it INVALID. So a "successful" statement can
   still mean a broken trigger. After applying, CHECK USER_ERRORS / ALL_ERRORS
   (TYPE='TRIGGER', NAME=...) and surface any compile errors clearly to the
   user (line/position/text), and show the trigger as INVALID in the tree.
   Do not report success when the object compiled with errors.
5. DROP: DROP TRIGGER name; (confirm).
6. Identifier quoting: TASK 46 policy for execution; TASK 47 for displayed SQL.

# FEATURES
1. TREE: under each Oracle table, a "Triggers" node listing that table's
   triggers: name, timing/event (e.g. BEFORE INSERT OR UPDATE), row/statement
   level, STATUS (ENABLED/DISABLED) and validity (VALID/INVALID). Lazy load.
   Context menu: New Trigger; on an existing: Edit, Enable/Disable, Drop
   (confirm).
2. CREATE: a form + SQL editor pre-filled with an ORACLE template using
   :NEW/:OLD, e.g.
     CREATE OR REPLACE TRIGGER "NAME"
       BEFORE INSERT ON "TABLE"
       FOR EACH ROW
     BEGIN
       :NEW."COL" := ...;
     END;
   Fields: name, timing (BEFORE/AFTER/INSTEAD OF), events (INSERT/UPDATE [OF
   cols]/DELETE, combinable with OR), level (row/statement), optional WHEN
   condition. Preview the exact DDL; apply as ONE statement; then check
   USER_ERRORS and surface compile errors.
3. EDIT: load the existing definition (DBMS_METADATA.GET_DDL, fallback
   ALL_TRIGGERS) into the editor; apply via CREATE OR REPLACE TRIGGER (no
   drop needed); re-check compile errors.
4. ENABLE/DISABLE: ALTER TRIGGER ... ENABLE|DISABLE; refresh status.
5. DROP: confirm; DROP TRIGGER; refresh.
6. Reuse the TASK 26 UI/flows; add Oracle behavior rather than duplicating.

# STEPS (autonomous, in order)
1. Implement Oracle triggers in the Oracle driver: listTriggers (with status +
   validity), getTriggerDefinition (GET_DDL w/ fallback), apply (single
   statement) + post-apply USER_ERRORS check, enable/disable, drop. Wire into
   the existing trigger IPC from TASK 26 (extend, don't fork). AUDIT for
   dialect fallthroughs (like the TASK 51 rename bug) so Oracle doesn't reuse
   MySQL/PG statements.
2. Enable the Triggers node for Oracle in the tree + context menu (incl.
   Enable/Disable).
3. Oracle create/edit form + template (:NEW/:OLD) + DDL preview + compile-error
   surfacing.
4. Verify against Oracle XE using DISPOSABLE objects:
   - Create `_ORATRGTBL_` (a couple columns, IDENTITY PK).
   - Create `_ORATRG_BI` : BEFORE INSERT FOR EACH ROW that sets a column via
     :NEW -> applies, compiles VALID; INSERT a row and confirm the trigger
     fired (column value set).
   - Create a trigger with a deliberate PL/SQL error -> the app surfaces the
     COMPILE ERROR clearly and marks it INVALID (does NOT report plain
     success). Fix/drop it.
   - EDIT `_ORATRG_BI` (change the body) via CREATE OR REPLACE -> applies,
     still VALID, new behavior observed.
   - DISABLE it -> status DISABLED, insert no longer triggers it; ENABLE ->
     works again.
   - Create a statement-level trigger (no FOR EACH ROW) and one with a WHEN
     clause -> valid.
   - Drop all `_ORATRG_*` and `_ORATRGTBL_`; confirm seeded schema untouched.
5. Confirm no regression: triggers on PG/MySQL/SQLite/MariaDB still work.
6. npm run typecheck + npm run build clean.
7. Leave a clean state (dev server stopped; disposables dropped).
8. Update COMPATIBILITY.md (Oracle: triggers supported; note remaining staged
   Oracle areas: functions/procedures/packages, dump/restore, ER-edit,
   data-transfer mapping, views create/edit).

# OUT OF SCOPE (later)
- Compound triggers, system/DDL/database-event triggers, trigger debugging,
  reordering (FOLLOWS). Note as backlog.

# DONE = Oracle tables show a Triggers node listing triggers (timing/event,
row/statement level, ENABLED/DISABLED, VALID/INVALID) with create (Oracle
template using :NEW/:OLD, single-statement execution), edit via CREATE OR
REPLACE, enable/disable via ALTER TRIGGER, and drop — and crucially, PL/SQL
COMPILE ERRORS are detected via USER_ERRORS and surfaced clearly instead of
reporting false success; verified on a disposable table+triggers that actually
fire against the real Oracle XE container with the seeded schema untouched and
no regression on the other four engines; COMPATIBILITY.md updated; typecheck +
build clean.
