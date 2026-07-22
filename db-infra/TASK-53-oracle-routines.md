# TASK 53: DB Tool — Oracle Functions, Procedures & Packages (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 11/45/46/51/52.

# ROLE & CONTEXT
Oracle functions/procedures are currently BROKEN in two ways:
(a) The create TEMPLATE is generic (PG/MySQL-style), not valid Oracle PL/SQL —
    the user has to fix it by hand.
(b) Created functions/procedures DO NOT APPEAR under the FUNCTIONS/PROCEDURES
    tree nodes — the Oracle listing was left as a "later stage" stub returning
    empty.
Fix both, and additionally add PACKAGES (an Oracle-only object type: a PACKAGE
spec + PACKAGE BODY pair) as its own category. Architecture unchanged: DB work
in main; renderer via typed IPC; destructive ops confirmed.

Prereq: TASK 11 (routine tree nodes + editor UI/flows for PG/MySQL — REUSE),
TASK 45 (Oracle driver, ALL_* catalog), TASK 46 (Oracle DDL + quoting),
TASK 51/52 (patterns for extending Oracle object categories; note the TASK 51
rename fallthrough bug — audit for similar dialect fallthroughs here).

# ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local), npm run <script>, run app in dev + smoke
- Connect to the running Oracle XE container (dbtool-oracle, 1522)
- Use chrome-devtools MCP for UI verification
- Create/edit/read files anywhere inside the db-tool project folder

# ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; don't touch existing containers/data
- Verify with DISPOSABLE `_ORAFN_*`, `_ORAPR_*`, `_ORAPKG_*` objects; drop them
  after. Don't touch the seeded schema's objects.
- NO host/system config changes; NO -g installs.

# ORACLE ROUTINE SPECIFICS (get these right)

## 1. SYNTAX (note the differences from PG/MySQL)
FUNCTION:
  CREATE OR REPLACE FUNCTION name (p1 IN NUMBER, p2 IN VARCHAR2)
    RETURN VARCHAR2          -- NOTE: "RETURN", not "RETURNS"
  IS                          -- "IS" or "AS" (both valid)
    v_local VARCHAR2(100);
  BEGIN
    RETURN 'x';
  END;
PROCEDURE:
  CREATE OR REPLACE PROCEDURE name (p1 IN NUMBER, p2 OUT VARCHAR2)
  IS
  BEGIN
    NULL;
  END;
PACKAGE (two objects — spec and body):
  CREATE OR REPLACE PACKAGE name IS
    FUNCTION f1(p IN NUMBER) RETURN NUMBER;
    PROCEDURE p1(p IN VARCHAR2);
  END name;
  CREATE OR REPLACE PACKAGE BODY name IS
    FUNCTION f1(p IN NUMBER) RETURN NUMBER IS BEGIN RETURN p; END;
    PROCEDURE p1(p IN VARCHAR2) IS BEGIN NULL; END;
  END name;
- Parameter modes: IN / OUT / IN OUT (Oracle-specific syntax; templates must
  show this).
- Oracle HAS "CREATE OR REPLACE" for all of these -> EDIT = replace, no DROP
  needed.
- The body contains semicolons and ends with END; -> send the WHOLE statement
  as ONE statement through the driver (same single-statement handling as
  TASK 11/26/52; do NOT split on ';').

## 2. CATALOG (the missing listing)
- ALL_OBJECTS / USER_OBJECTS where OBJECT_TYPE IN ('FUNCTION','PROCEDURE',
  'PACKAGE','PACKAGE BODY') -> names, STATUS (VALID/INVALID), created/modified.
- ALL_PROCEDURES for standalone + packaged routines.
- ALL_ARGUMENTS for parameter lists (name, position, data type, IN/OUT mode) —
  use to show signatures in the tree.
- SOURCE: prefer DBMS_METADATA.GET_DDL('FUNCTION'|'PROCEDURE'|'PACKAGE'|
  'PACKAGE_BODY', name, owner); fall back to ALL_SOURCE (TEXT ordered by LINE)
  if GET_DDL is unavailable/insufficient privileges. Handle both.

## 3. ⚠️ COMPILATION ERRORS (critical, same as TASK 52)
Oracle CREATES the object even when PL/SQL fails to compile, marking it
INVALID. A "successful" statement can still mean a broken routine.
- After applying, CHECK USER_ERRORS / ALL_ERRORS (TYPE in 'FUNCTION',
  'PROCEDURE','PACKAGE','PACKAGE BODY'; NAME=...) and surface compile errors
  clearly (line/position/text). Do NOT report success when it compiled with
  errors. Show INVALID status in the tree.

## 4. DROP
DROP FUNCTION name; DROP PROCEDURE name; DROP PACKAGE name; (dropping the
package drops spec+body). DROP PACKAGE BODY name; drops only the body.
Confirm before dropping.

# FEATURES
1. TREE — fix the empty listing:
   - Oracle "Functions" node lists standalone FUNCTIONs (name + signature from
     ALL_ARGUMENTS + VALID/INVALID status).
   - Oracle "Procedures" node lists standalone PROCEDUREs (same).
   - NEW "Packages" node (Oracle-only) lists PACKAGEs, each showing whether it
     has a BODY, and its VALID/INVALID status. Expanding/opening a package
     offers editing the SPEC and the BODY (two editors/tabs, or a selector).
   - Lazy load. Context menu: New Function / New Procedure / New Package; on an
     existing: Edit, Drop (confirm). For packages: Edit Spec, Edit Body, Drop
     Package, Drop Body.
2. CREATE — fix the template:
   Pre-fill the editor with a VALID ORACLE PL/SQL template per object type
   (function with RETURN, procedure, package spec + body as shown above),
   including IN/OUT parameter examples. NOT the generic PG/MySQL template.
3. EDIT: load the existing source (GET_DDL, fallback ALL_SOURCE) into the
   editor; apply via CREATE OR REPLACE; re-check USER_ERRORS.
4. DROP: confirm; correct DROP statement per type.
5. Reuse the TASK 11 routine editor UI/flows; add Oracle behavior + the new
   Packages category rather than duplicating UI.

# STEPS (autonomous, in order)
1. Implement in the Oracle driver: listFunctions, listProcedures, listPackages
   (with signatures + status), getRoutineDefinition (GET_DDL w/ ALL_SOURCE
   fallback; for packages: spec and body separately), apply (single statement)
   + post-apply USER_ERRORS check, drop per type. Wire into the existing
   routine IPC from TASK 11 (extend, don't fork) and add package support to
   shared types/IPC. AUDIT for dialect fallthroughs so Oracle doesn't reuse
   PG/MySQL statements.
2. Replace the Oracle stubs so the Functions/Procedures nodes actually list;
   add the Packages node for Oracle only (hidden/absent for other engines).
3. Replace the generic create template with correct Oracle PL/SQL templates
   (function/procedure/package spec/package body).
4. Verify against Oracle XE using DISPOSABLE objects:
   - Create `_ORAFN_ADD` (function, two IN params, RETURN NUMBER) from the
     template WITHOUT hand-editing -> compiles VALID, APPEARS under Functions
     with its signature; call it via SQL to confirm it works.
   - Create `_ORAPR_TOUCH` (procedure with IN + OUT params) -> VALID, appears
     under Procedures.
   - Create `_ORAPKG_UTIL` package SPEC + BODY -> both appear under Packages
     with status; call a packaged function to confirm.
   - Create one with a deliberate PL/SQL error -> the app SURFACES the compile
     error (line/text) and marks it INVALID, does NOT report plain success.
   - EDIT each via CREATE OR REPLACE (change body) -> applies, still VALID,
     new behavior observed; definition round-trips into the editor correctly.
   - DROP each (function, procedure, package body only, then whole package)
     with confirms.
   - Confirm the pre-existing objects the user already created by hand now
     APPEAR in the tree (the original bug).
   - Confirm seeded schema untouched.
5. Confirm no regression: functions/procedures on PG/MySQL (TASK 11) still
   work; MySQL/SQLite/MariaDB unaffected; SQLite still shows "not supported".
6. npm run typecheck + npm run build clean.
7. Leave a clean state (dev server stopped; disposables dropped).
8. Update COMPATIBILITY.md (Oracle: functions/procedures/packages supported;
   note remaining staged Oracle areas: views create/edit, dump/restore,
   ER-edit, data-transfer mapping).

# OUT OF SCOPE (later)
- Routine debugging, dependency analysis, wrapped/obfuscated source, invoker/
  definer rights UI, overloaded-routine disambiguation beyond basic signature
  display, types/object types. Note as backlog.

# DONE = Oracle Functions and Procedures actually LIST in the tree (with
signatures + VALID/INVALID status), a new Oracle-only Packages node lists
packages with spec/body editing, create uses CORRECT Oracle PL/SQL templates
(RETURN not RETURNS, IS/AS, IN/OUT params, package spec+body) so objects can be
created without hand-fixing, edit round-trips via GET_DDL/ALL_SOURCE and applies
with CREATE OR REPLACE, drops work per type, and PL/SQL COMPILE ERRORS are
detected via USER_ERRORS and surfaced instead of false success — verified on
disposable objects (including previously hand-created ones now appearing)
against the real Oracle XE container with the seeded schema untouched and no
regression on the other engines; COMPATIBILITY.md updated; typecheck + build
clean.
