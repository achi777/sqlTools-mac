# TASK 50: DB Tool — Oracle sequences: open/details view (parity with PostgreSQL) (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 25/48.

# ROLE & CONTEXT
Oracle sequences now LIST in the tree (TASK 48), but clicking/opening a sequence
does NOT show its details, whereas on PostgreSQL (TASK 25) opening a sequence
shows its properties. Bring Oracle to PARITY: opening an Oracle sequence must
show the same kind of details panel/view as PostgreSQL.
(Note: a sequence has no child nodes to expand — it isn't a table with columns —
so "expanding" isn't expected; but SELECTING/opening it must show details.)

Prereq: TASK 25 (PG sequences incl. the details view/panel — REUSE it),
TASK 48 (Oracle sequence listing + create/alter/drop + ALL_SEQUENCES catalog).

# ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local), npm run <script>, run app in dev + smoke
- Connect to the running Oracle XE container (dbtool-oracle, 1522)
- Use chrome-devtools MCP for UI verification
- Create/edit/read files anywhere inside the db-tool project folder

# ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; don't touch existing containers/data
- Read-only details view; verify with existing + a DISPOSABLE `_ORASEQ_*`
  sequence; drop it after. Don't alter seeded/IDENTITY sequences.
- NO host/system config changes; NO -g installs.

# THE FIX
1. Find how PostgreSQL sequence details are surfaced (TASK 25): clicking a
   sequence in the tree opens a details view/panel showing its properties.
   REUSE that same UI for Oracle rather than building a separate one.
2. Wire Oracle's getSequenceDetails (from TASK 48) into that view so opening an
   Oracle sequence shows:
   - name (and owner/schema)
   - increment by, min value, max value
   - cache size (or NOCACHE), cycle flag, order flag
   - last number (LAST_NUMBER from ALL_SEQUENCES) with the cache caveat noted
     (it reflects the cached high-water mark, not necessarily the exact next
     value) — do NOT call NEXTVAL to display a value
   - whether it is a SYSTEM / IDENTITY-backing (ISEQ$$) sequence -> shown
     read-only with an explanation (no Edit/Drop offered)
3. Ensure the actions available from the details view match PG's pattern where
   applicable (Edit / Rename / Drop for user sequences; nothing destructive for
   system ones).
4. If the tree currently makes Oracle sequence nodes look expandable (a chevron
   that does nothing), fix that: sequences are LEAF nodes on every engine —
   clicking opens details, no expand affordance. Make PG and Oracle consistent.

# STEPS (autonomous, in order)
1. Audit how PG surfaces sequence details vs what Oracle currently does; find
   the missing wiring.
2. Wire Oracle details into the shared view; add the system/ISEQ$$ read-only
   handling; fix any misleading expand chevron so sequences are leaf nodes
   consistently.
3. Verify against Oracle XE + PostgreSQL:
   - Oracle: click a seeded/user sequence -> details show (increment, min, max,
     cache, cycle, last number w/ caveat). Create `_ORASEQ_TEST`, open it ->
     correct details; Edit/Rename/Drop reachable; drop it.
   - Oracle: click an ISEQ$$ (IDENTITY-backing) sequence -> details show as
     read-only with an explanation; no Edit/Drop offered.
   - PostgreSQL: sequence details still work exactly as before (no regression).
   - MariaDB sequences (TASK 43): confirm they also open details or, if not
     implemented, note it explicitly in the report as a remaining gap.
   - MySQL/SQLite: still show their correct "not supported" notes.
4. npm run typecheck + npm run build clean.
5. Leave a clean state (dev server stopped; `_ORASEQ_TEST` dropped; seeded
   schema + identity sequences untouched).

# DONE = opening an Oracle sequence shows the same details view as PostgreSQL
(increment, min/max, cache, cycle, order, last number with the cache caveat),
with IDENTITY-backing ISEQ$$ sequences shown read-only and non-destructive,
sequences behaving as leaf nodes consistently across engines, verified against
the real Oracle XE container with no regression to PostgreSQL (and MariaDB
status reported); typecheck + build clean.
