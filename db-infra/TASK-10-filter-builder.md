# TASK 10: DB Tool — Visual Filter Builder (nested AND/OR) (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 08 (paging) + TASK 09 (quick filter).

## ROLE & CONTEXT
Add a Navicat-style VISUAL FILTER BUILDER: a panel where the user composes
nested conditions (column / operator / value) grouped with AND/OR into a
tree, e.g. (status = 'active' AND age > 30) OR (vip = true). It compiles to a
PARAMETERIZED, injection-safe, server-side WHERE that integrates with the
existing pagination (TASK 08) and coexists with the existing Quick filter
(TASK 09). Architecture unchanged: DB work in main; renderer via typed
contextBridge; all values bound params; column names validated against the
schema catalog.

Prereq: TASK 08 getTablePage with server-side WHERE + count; TASK 09 quick
filters (flat AND of column filters). This task adds a richer tree-based
filter and a compiler that turns the tree into WHERE + params.

## ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local), npm run <script>, run app in dev to smoke-test
- Connect to TASK 01 databases to verify filtering + counts
- Create/edit/read files anywhere inside the db-tool project folder

## ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; NO deletes outside project; NO rm -rf outside it
- NO host/system config changes (PATH, registry, .wslconfig, WSL, Docker
  Desktop settings, global npm); NO -g global installs
- Verify on seeded tables (read-only) or a disposable `_filtertest_` table;
  clean up.
- If a destructive/system action seems needed, STOP and ask.

## SAFETY RULES (critical)
- The filter tree is compiled in MAIN (or a shared pure compiler) into a
  parameterized WHERE: every value is a bound parameter ($1/? per dialect),
  every column/identifier is validated against the schema catalog and quoted
  per dialect. NEVER concatenate user values or unvalidated identifiers.
- The renderer sends the STRUCTURED filter tree over IPC, not SQL. Main
  compiles + executes. (A shared pure "compileFilter(tree, dialect)" used by
  both preview and execution is fine, as long as execution binds params.)

## DATA MODEL (filter tree)
Define shared types, e.g.:
  type Combiner = 'AND' | 'OR';
  type Condition = { kind: 'condition'; column: string; operator: Op;
                     values: unknown[] };   // values length depends on op
  type Group = { kind: 'group'; combiner: Combiner; children: FilterNode[];
                 negated?: boolean };        // negated => NOT (...)
  type FilterNode = Group | Condition;
Operators (Op): =, <>, <, <=, >, >=, LIKE/contains, startsWith, endsWith,
IN, NOT IN, BETWEEN, IS NULL, IS NOT NULL. (Reuse TASK 09's per-type operator
logic and LIKE escaping so behavior is consistent.)

## FEATURES

### 1. BUILDER UI (panel or modal, opened from the grid toolbar)
- A root group with a combiner toggle (AND / OR).
- "Add condition" and "Add group" buttons at any group level -> arbitrary
  nesting. Each condition row: column picker (from catalog, type-aware),
  operator picker (subset valid for the column type), value input(s)
  (BETWEEN = 2 inputs; IN/NOT IN = list; IS NULL/IS NOT NULL = no value).
- Group-level combiner toggle (AND/OR) and optional NOT on a group.
- Remove condition / remove group; drag-to-reorder is optional (nice later).
- A live, read-only WHERE PREVIEW string (with placeholders shown as the
  literal-ish values for readability, but execution still binds params).
- Apply -> resets to page 1, refetches server-side; Clear -> removes builder
  filter. Show an active-advanced-filter indicator.

### 2. COMPILER (tree -> WHERE + params)
- Pure function compileFilter(tree, dialect) -> { sql: string, params: [] }.
- Correctly parenthesize groups, honor AND/OR precedence via explicit groups,
  apply NOT, handle each operator (incl. LIKE escaping, IN expansion to N
  placeholders, BETWEEN two params, IS [NOT] NULL no param).
- Type-aware value coercion consistent with TASK 09 (numbers/dates/booleans
  per engine). Empty/invalid conditions are ignored or flagged, not emitted
  as broken SQL.
- Dialect differences: PG $1.. vs MySQL/SQLite ? ; ILIKE (PG) vs LIKE; quote
  identifiers per dialect. Reuse the driver layer's placeholder style.

### 3. COEXISTENCE with Quick filter (TASK 09)
- BOTH remain available. Define one clear, consistent rule and implement it:
  the effective WHERE = (quick filters AND-combined)  AND  (builder tree),
  i.e. they intersect. Show both indicators; a single "Clear all filters"
  clears both. Document this in the UI (a small note) and README so it's not
  confusing. If you judge override is cleaner than intersect, that's
  acceptable — but pick ONE, make it obvious in the UI, and document it.
- The combined filter feeds the SAME getTablePage (extend it to accept the
  builder tree alongside the quick-filter spec) so pagination + filtered
  COUNT("X–Y of N") stay correct and deterministic.

### 4. INTEGRATION
- Table browsing only (same scope as TASK 08/09); ad-hoc SQL editor untouched.
- After CRUD (TASK 06), keep the active builder filter and refresh filtered
  page + count.
- Persist the last-used builder filter per table (optional, nice) in userData
  so reopening a table can restore it — optional; if skipped, note it.

## STEPS (autonomous, in order)
1. Add the filter-tree types + a pure compileFilter(tree, dialect) with unit
   checks (parenthesization, AND/OR, NOT, IN/BETWEEN/IS NULL, LIKE escaping,
   dialect placeholders).
2. Extend getTablePage IPC + main to accept { quickFilters, builderTree } and
   build the combined parameterized WHERE for both page and COUNT.
3. Build the Builder UI (nested groups/conditions, type-aware pickers, WHERE
   preview, apply/clear, indicators). Wire the grid toolbar entry point.
4. Implement coexistence rule with Quick filter + unified Clear-all.
5. Verify against TASK 01 DBs (PG/MySQL/SQLite):
   - Build (A AND B) OR C and confirm rows + filtered count are correct and
     match an equivalent hand-written query.
   - Nested groups 2+ levels deep; a NOT group; IN, BETWEEN, IS NULL.
   - Injection/escaping proof: value with a quote (O'Brien) and % / _;
     confirm bound params + literal escaping.
   - Quick filter + Builder active together -> intersection is correct;
     Clear-all clears both.
   - Paging within a builder-filtered set is deterministic (no overlap);
     "X–Y of N" reflects the filtered count.
   - CRUD insert/delete with a builder filter active refreshes correctly.
6. npm run typecheck + npm run build clean.
7. (Optional, quick) package:dir + SMOKE to confirm no regression.
8. Leave a clean state (dev server stopped; disposable objects removed).

## OUT OF SCOPE (later)
- Custom free-text WHERE editor, saved/named filters, drag-reorder of
  conditions, filter templates. Note as backlog; don't build now.

## DONE = a visual filter builder lets the user compose nested AND/OR groups
of type-aware conditions with a live WHERE preview; it compiles to a
parameterized, injection-safe server-side WHERE that integrates with
pagination (deterministic filtered pages + filtered "X–Y of N") across
PG/MySQL/SQLite, coexists with Quick filter under one clear documented rule
with a unified Clear-all, survives CRUD refresh; typecheck + build clean;
verified incl. nested groups, NOT, IN/BETWEEN/IS NULL and a quote/percent
value proving parameterization.
