# TASK 09: DB Tool — Quick column filters (Navicat-style) (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 02/06/08.

## ROLE & CONTEXT
Add per-column QUICK FILTERS to the data grid, Navicat-style: a filter input
on each column that builds a server-side WHERE clause, combined with the
existing server-side pagination. All filtering happens in the database (WHERE
+ LIMIT/OFFSET), never by filtering an already-fetched page in the browser.
Architecture unchanged: DB work in main; renderer via typed contextBridge;
all filter values PARAMETERIZED (no string concatenation).

Prereq: TASK 06 (grid CRUD), TASK 08 (server-side pagination with
getTablePage + count). This task extends the paging query with a WHERE built
from column filters, and makes the count reflect the filter too.

## ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local), npm run <script>, run app in dev to smoke-test
- Connect to TASK 01 databases to verify filtering + counts
- Create/edit/read files anywhere inside the db-tool project folder

## ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; NO deletes outside project; NO rm -rf outside it
- NO host/system config changes (PATH, registry, .wslconfig, WSL, Docker
  Desktop settings, global npm); NO -g global installs
- Verify only on seeded tables (read-only filtering is non-destructive) or a
  disposable `_filtertest_` table; don't leave test objects behind.
- If a destructive/system action seems needed, STOP and ask.

## SAFETY RULES (critical)
- Every filter value is a BOUND PARAMETER. Build the WHERE with placeholders
  ($1/$2 for PG, ? for MySQL/SQLite via the existing driver layer) and pass
  values separately. NEVER concatenate user input into SQL.
- Column NAMES come from the schema catalog (a known, validated set) — only
  allow filtering on real columns of the current table; quote identifiers
  per dialect. Reject anything not in the catalog.

## FEATURES

### 1. PER-COLUMN QUICK FILTER UI
- A filter row under the column headers (Navicat-style), OR a small filter
  popover per header — pick one clean pattern and be consistent.
- Each column gets an input appropriate to its type:
  - text/varchar: operator + value (default operator: contains/LIKE)
  - numeric/date: operator + value (=, <>, <, <=, >, >=, BETWEEN)
  - boolean: a true/false/any selector
  - nullable columns: allow IS NULL / IS NOT NULL
- Operator picker per column (small dropdown): =, <>, <, <=, >, >=,
  LIKE/contains, starts with, ends with, IN (comma-separated), BETWEEN,
  IS NULL, IS NOT NULL. Offer the sensible subset per column type.
- Multiple column filters combine with AND (Navicat quick-filter default).
- Applying a filter resets to page 1 and refetches (server-side).
- Clear-all-filters button; per-column clear. Show an active-filter
  indicator (e.g. highlighted column, and a count of active filters).

### 2. SERVER-SIDE integration with pagination
- Extend getTablePage to accept a filter spec: an array of
  { column, operator, value(s) } plus the AND combiner. Main builds a
  parameterized WHERE and appends it to the paged query AND to the COUNT(*).
- "Rows X–Y of N" must reflect the FILTERED count, not the table total.
- Keep deterministic ordering (PK) from TASK 08 so filtered pages don't
  overlap.
- Debounce text inputs so it doesn't fire a query on every keystroke; fire on
  Enter or after a short pause.

### 3. TYPE-AWARE VALUE HANDLING
- Cast/compare correctly per type (numbers as numbers, dates as dates,
  booleans per engine: PG boolean, MySQL tinyint(1), SQLite 0/1).
- LIKE handling: "contains" -> %value%, "starts with" -> value%, "ends with"
  -> %value%; escape % and _ in the user's value so they're literal.
- IN: split comma-separated input into bound params.
- BETWEEN: two value inputs, both bound.
- Per-dialect case-insensitive contains where easy (PG ILIKE; MySQL usually
  case-insensitive by collation; SQLite LIKE is case-insensitive for ASCII) —
  note the behavior rather than over-engineering.

### 4. INTEGRATION with CRUD + editor
- Filtering applies to TABLE BROWSING only (same scope as TASK 08 paging);
  ad-hoc SQL editor results are not touched.
- After CRUD changes (insert/delete/update), keep the active filter and
  refresh the filtered page + filtered count.
- A newly inserted row that doesn't match the active filter simply won't show
  under the filter — that's correct; don't special-case it, but make sure the
  trailing "new row" still works while a filter is active (insert isn't
  blocked by the filter).

## STEPS (autonomous, in order)
1. Extend the getTablePage IPC + types with a parameterized filter spec;
   update per-driver query building (WHERE + params) for the page AND count.
2. Renderer: per-column filter UI (inputs + operator pickers + type-aware),
   AND-combine, page-1 reset, debounce, clear controls, active indicators.
3. Wire type-aware value handling + LIKE escaping + IN/BETWEEN/IS NULL.
4. Verify against TASK 01 DBs (PG/MySQL/SQLite):
   - Text contains on customers (e.g. name LIKE) -> correct subset; count
     reflects filter; paging within the filtered set is deterministic.
   - Numeric >= / BETWEEN on an amount column -> correct rows.
   - IS NULL / IS NOT NULL on a nullable column.
   - IN with a comma list.
   - Two filters AND-combined narrow correctly.
   - Confirm values are bound params (test a value containing a quote like
     O'Brien and a % to prove no injection / correct escaping).
   - Clear filters -> full table + total count return.
   - Do a CRUD insert with a filter active -> new-row insert still works;
     filtered view refreshes correctly.
5. npm run typecheck + npm run build clean.
6. (Optional, quick) package:dir + SMOKE to confirm no regression.
7. Leave a clean state (dev server stopped; any disposable objects removed).

## OUT OF SCOPE (later)
- Visual filter builder (grouped AND/OR nesting), custom free-text WHERE
  editor, saved filters, per-column sort UI if not already present. Note as
  backlog; don't build now.

## DONE = each column has a type-aware quick filter with an operator picker;
filters combine with AND and build a PARAMETERIZED, injection-safe server-side
WHERE that integrates with pagination (filtered count in "X–Y of N",
deterministic filtered pages) across PG/MySQL/SQLite; LIKE/IN/BETWEEN/IS NULL
handled; clear controls + active indicators; CRUD still works under an active
filter; typecheck + build clean; verified (incl. a quote/percent value to
prove parameterization).
