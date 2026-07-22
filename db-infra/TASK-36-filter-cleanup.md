# TASK 36: DB Tool — Consolidate filter UI (remove duplicate Builder/Quick entry points, keep all capability) (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 09/10/21/35.

# ROLE & CONTEXT
The filter UI now has redundancy after adding the funnel (TASK 35). Consolidate
so there's ONE clear way to each capability, WITHOUT losing any filtering
ability. The user wants to remove the "Edit Builder" button, the "Builder" mode
selector, and the "Quick" mode selector — IF and ONLY IF their capability is
fully covered by: the FUNNEL (nested AND/OR visual builder), the per-COLUMN
header filters, and CUSTOM WHERE. This is a careful cleanup: VERIFY coverage
FIRST, migrate any unique bit, THEN remove. Architecture unchanged.

Prereq: TASK 09 (Quick + per-column filters), TASK 10 (Visual Builder + its
parameterized compiler), TASK 21 (Custom WHERE mode), TASK 35 (funnel popover
that reuses TASK 10's builder). 

# ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local), npm run <script>, run app in dev to smoke-test
- Use chrome-devtools MCP for visual verification
- Connect to TASK 01 databases to verify filtering still fully works
- Create/edit/read files anywhere inside the db-tool project folder

# ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; NO deletes outside project; NO rm -rf outside it
- NO host/system config changes; NO -g global installs
- Do NOT remove any capability. Removal is only of DUPLICATE UI entry points,
  never of a unique feature.

# THE PLAN: verify coverage BEFORE removing

## Step 1 — AUDIT what each element does (write it down in your report)
For each of: "Edit Builder" button, "Builder" mode, "Quick" mode, per-column
header filters, funnel popover, Custom WHERE — enumerate the exact capabilities
(operators, nesting, AND vs AND/OR, column coverage, value types, IS NULL, IN,
BETWEEN, etc.).

## Step 2 — CONFIRM the coverage claim
The intended end state keeps: FUNNEL (nested AND/OR) + per-column header
filters + Custom WHERE. Confirm:
- FUNNEL fully covers "Builder" and "Edit Builder" (same underlying builder +
  compiler from TASK 10). If they're the same state/compiler -> Builder/Edit
  Builder are pure duplicates -> safe to remove.
- Per-column header filters fully cover "Quick" mode. If "Quick" had ANY
  capability the per-column header filters lack (e.g. an operator picker, IS
  NULL, IN, BETWEEN, a specific value type), MIGRATE that capability INTO the
  per-column header filters FIRST, so nothing is lost. If per-column filters
  already match/exceed Quick, no migration needed.
- Custom WHERE stays as-is (unique).
Report the coverage findings explicitly.

## Step 3 — MIGRATE any gap (only if found)
If Step 2 found a unique bit in Quick not present in per-column filters (or a
unique bit anywhere), implement it in the surviving element BEFORE removal, so
capability is preserved.

## Step 4 — REMOVE the duplicates
Once coverage is confirmed/migrated, remove the redundant UI:
- Remove the "Edit Builder" button.
- Remove the "Builder" mode selector entry.
- Remove the "Quick" mode selector entry.
Keep the funnel, per-column header filters, and Custom WHERE. Simplify the mode
selector accordingly (if only Custom WHERE remains as a "mode" alongside the
funnel + column filters, present it cleanly — e.g. the funnel for visual, the
column headers for quick, and a "Custom WHERE" toggle/button for raw). Ensure
the bottom filter-SQL panel (TASK 34) still reflects whichever is active.

## Step 5 — Ensure no dead code / broken state
Remove now-unused code paths, but keep the shared TASK 10 compiler (the funnel
uses it). Make sure clearing/switching filters still works and there are no
orphaned references.

# STEPS (autonomous, in order)
1. Audit + report coverage (Steps 1-2).
2. Migrate any unique capability into the surviving elements (Step 3).
3. Remove Edit Builder + Builder mode + Quick mode (Step 4).
4. Clean up dead code; keep the shared compiler (Step 5).
5. Verify against TASK 01 DBs (PG/MySQL/SQLite) that ALL filtering still works:
   - Per-column header filter: contains/=/</>/IS NULL/IN/BETWEEN (whatever set
     was available) still works.
   - Funnel: nested AND/OR conditions still build + apply + clear; bottom SQL
     panel shows the WHERE; filtered count correct.
   - Custom WHERE: still works; injection-safe value (O'Brien / %) fine.
   - Nothing that previously worked is now missing; UI is simpler; no console
     errors / dead buttons.
6. npm run typecheck + npm run build clean.
7. Leave a clean state (dev server stopped).

# REPORT
Explicitly state: what each removed element did, why it was a duplicate, what
(if anything) was migrated to preserve capability, and confirm via testing that
no filtering ability was lost — only the redundant entry points are gone.

# OUT OF SCOPE
- Adding new filter capability (beyond migrating an existing unique bit),
  saved filters. Note as backlog.

# DONE = after verifying coverage and migrating any unique bit, the "Edit
Builder" button + "Builder" mode + "Quick" mode are removed, leaving the funnel
(nested AND/OR, reusing TASK 10's compiler) + per-column header filters +
Custom WHERE — with NO loss of filtering capability, the bottom SQL panel still
reflecting the active filter, no dead code, verified across PG/MySQL/SQLite;
typecheck + build clean; a coverage report given to the user.
