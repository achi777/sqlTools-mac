# TASK 19: DB Tool — Tree fix: views appearing under Tables (and duplicated) (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 04/11.

## ROLE & CONTEXT
Fix an object-tree bug: VIEWS are showing up mixed into the Tables list (in a
jumbled order) AND again under the separate VIEWS section. Views must appear
ONLY under the Views node; the Tables node must list ONLY base tables. This is
a listing-query correctness fix, per engine. Architecture unchanged.

Prereq: TASK 04 (schema catalog + tree, table listing), TASK 11 (Views/
Functions/Procedures nodes + view listing). The table-listing query is
currently also picking up views.

## ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local), npm run <script>, run app in dev to smoke-test
- Connect to TASK 01 databases to verify listings
- Create/edit/read files anywhere inside the db-tool project folder

## ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; NO deletes outside project; NO rm -rf outside it
- NO host/system config changes; NO -g global installs
- If you create any disposable view to test, drop it after.

## THE FIX (per-driver: Tables = base tables only; Views = views only)
1. TABLE LISTING must EXCLUDE views:
   - PostgreSQL: use information_schema.tables WHERE table_type = 'BASE TABLE'
     (and the right schema), OR pg_class relkind = 'r' (+ 'p' for partitioned
     if you want them). Do NOT include relkind 'v' (view) or 'm' (matview).
   - MySQL: information_schema.TABLES WHERE TABLE_TYPE = 'BASE TABLE'
     (TABLE_TYPE = 'VIEW' are views).
   - SQLite: sqlite_master WHERE type = 'table' (exclude type = 'view'); also
     keep excluding internal sqlite_%/sequence tables as before.
2. VIEW LISTING stays as-is (views only): PG information_schema.views /
   pg_class relkind 'v'; MySQL TABLE_TYPE = 'VIEW'; SQLite type = 'view'.
3. ORDER: sort each list alphabetically (case-insensitive) so ordering is
   stable and not "jumbled".
4. DEDUP: ensure the same object can't appear in both lists. After the above,
   a view should appear ONLY under Views, a table ONLY under Tables. If any
   shared code builds both lists, make sure it partitions by object type
   rather than unioning.

## STEPS (autonomous, in order)
1. Locate the per-driver table-listing + view-listing queries (main).
2. Correct the table listing to base-tables-only per engine; confirm view
   listing is views-only; sort both alphabetically.
3. Refresh-catalog path: make sure the tree rebuild uses the corrected
   listings and clears any stale cached mixed list.
4. Verify against TASK 01 DBs (PG/MySQL/SQLite):
   - Tables node shows ONLY customers, orders, order_items (alphabetical), no
     views mixed in.
   - Create a disposable view `_treetest_v`; refresh; it appears ONLY under
     Views, exactly once, and NOT under Tables. Tables list is unchanged.
   - Drop `_treetest_v`; refresh; it disappears from Views.
   - Confirm no duplicates anywhere; ordering is alphabetical and stable.
5. npm run typecheck + npm run build clean.
6. Leave a clean state (dev server stopped; disposable view dropped).

## OUT OF SCOPE
- Materialized views as a separate node (note as backlog if PG matviews show
  up; at minimum don't let them pollute the Tables list), other tree grouping
  changes.

## DONE = the Tables node lists only base tables (alphabetical, no views), the
Views node lists only views (alphabetical), no object appears twice, verified
across PG/MySQL/SQLite incl. a create/refresh/drop cycle of a disposable view;
typecheck + build clean.
