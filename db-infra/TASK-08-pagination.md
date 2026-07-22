# TASK 08: DB Tool — Server-side grid pagination (Navicat-style) (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 02/04/06.

## ROLE & CONTEXT
Replace the fixed `LIMIT 200` table view with proper SERVER-SIDE pagination,
Navicat-style: a bottom bar with page navigation (‹ 1 2 3 ›), total row
count, page-size selector, and "go to page". Must scale to very large tables
(millions of rows) because paging happens in the database via LIMIT/OFFSET,
not in the browser. Architecture unchanged: all DB work in main; renderer via
typed contextBridge only; parameterized queries.

Prereq: TASK 02 (grid, opens a table with SELECT * ... LIMIT 200), TASK 06
(grid CRUD). This task adds pagination to TABLE BROWSING (clicking a table in
the tree). It does NOT paginate ad-hoc SQL results where the user wrote their
own query — see scope below.

## ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local), npm run <script>, run app in dev to smoke-test
- Connect to TASK 01 databases to verify paging + counts
- Create/edit/read files anywhere inside the db-tool project folder

## ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; NO deletes outside project; NO rm -rf outside it
- NO host/system config changes (PATH, registry, .wslconfig, WSL, Docker
  Desktop settings, global npm); NO -g global installs
- If you need a large table to test paging, create a DISPOSABLE
  `_pagetest_` table and bulk-insert rows into it; do NOT bloat the seeded
  customers/orders/order_items. Drop it when done.
- If a destructive/system action seems needed, STOP and ask.

## FEATURES

### 1. SERVER-SIDE PAGING for table browsing
- When a table is opened from the tree, fetch ONE page at a time:
  SELECT <cols> FROM <table> ORDER BY <stable order> LIMIT :pageSize
  OFFSET :offset  — all parameterized, executed in main.
- Stable ordering: order by the primary key if one exists (so paging is
  deterministic); if no PK, fall back to a stable order (e.g. rowid on
  SQLite / ctid is unstable on PG so prefer PK; for PK-less PG/MySQL, order
  by all columns or the first unique index, and note if ordering isn't
  guaranteed). Keep it correct, not clever.
- Add a typed IPC, e.g. getTablePage({ connId, table, pageSize, page,
  sort? }) -> { rows, columns, page, pageSize }.

### 2. TOTAL ROW COUNT
- Get the total count so the UI can show "X–Y of N" and compute page count:
  SELECT COUNT(*) FROM <table>.
- For potentially huge tables, run COUNT(*) asynchronously so it doesn't
  block the first page render: show the first page immediately, show the
  count (and total pages) when it arrives ("… of N" fills in). A small
  spinner/placeholder on the count is fine.
- (Optional, note only) mention in README that COUNT(*) on giant tables can
  be slow and an approximate-count option could be added later per engine.

### 3. BOTTOM PAGINATION BAR (Navicat-style)
- Controls: first «, prev ‹, page numbers (windowed, e.g. 1 … 4 5 [6] 7 8 …
  120), next ›, last ». Current page highlighted.
- "Rows X–Y of N" indicator.
- Page-size selector: 25 / 50 / 100 / 200 / 500 (default 100). Changing it
  refetches from page 1.
- "Go to page" input (jump to an arbitrary page, validated against total).
- A manual Refresh button (re-run current page + recount).

### 4. INTEGRATION with existing features
- CRUD (TASK 06): after insert/delete, refresh the current page and the
  count; a newly inserted row should be findable (e.g. jump to last page or
  refresh). Keep the trailing "new row" working within the current page.
- Sorting (if the grid has column-header sort or you add it here): sorting
  must be SERVER-SIDE too (ORDER BY passed to the query), then paged — never
  sort only the current page's slice, which would be misleading. If sorting
  isn't implemented yet, at least make the paging code ready to accept a
  sort param; full click-to-sort can be this task or noted as next.
- The SQL editor's ad-hoc query results are SEPARATE: do NOT auto-paginate
  arbitrary user SQL (their query may already have LIMIT/GROUP BY/etc.).
  Keep ad-hoc results as they are (optionally cap fetched rows with a clear
  "first N rows" note), and only apply this pagination system to table
  browsing. State this clearly in the UI so the two modes aren't confusing.

## STEPS (autonomous, in order)
1. Add getTablePage + getTableRowCount (or a combined call) typed IPC in
   shared/types.ts + main handlers per driver (parameterized LIMIT/OFFSET,
   COUNT(*)), + preload whitelist.
2. Renderer: pagination state (page, pageSize, total, sort) in the grid/tab
   store; the bottom pagination bar component; wire table-open to page 1.
3. Make COUNT async so first page shows without waiting.
4. Integrate with CRUD refresh + (if present) server-side sort.
5. Verify against TASK 01 DBs + a DISPOSABLE large table:
   - Create `_pagetest_` with, say, 5,000+ rows (bulk insert) on PG, MySQL,
     SQLite. Open it: first page shows fast; count fills in; navigate next/
     prev/last/first; jump to a page; change page size (refetches from p1);
     confirm rows are correct and non-overlapping across pages (deterministic
     order).
   - On the seeded small tables, confirm paging shows the right totals and a
     single page when rows < pageSize.
   - Insert a row via CRUD -> refresh -> count increments, row findable.
   - Delete rows -> count/pages update correctly.
   - Drop `_pagetest_`; clean up.
6. npm run typecheck + npm run build clean.
7. (Optional, quick) package:dir + SMOKE to confirm no regression.
8. Leave a clean state (dev server stopped, disposable table removed).

## OUT OF SCOPE (later)
- Keyset/seek pagination for extreme scale, approximate counts, filtering UI
  (WHERE builder), auto-pagination of arbitrary user SQL, virtual "load all".
  Note as backlog; don't build now.

## DONE = opening a table browses it with true server-side pagination — a
Navicat-style bottom bar (first/prev/pages/next/last, "X–Y of N", page-size
selector, go-to-page, refresh), fast first-page render with async COUNT,
deterministic non-overlapping pages across PG/MySQL/SQLite, correct
integration with CRUD refresh; ad-hoc SQL results left un-paginated by
design; typecheck + build clean; verified on a disposable large table that
was cleaned up.
