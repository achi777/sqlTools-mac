# TASK 18: DB Tool — Edit existing Views in the Visual Builder (reverse-parse simple SELECTs) (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 11/12/15/16/17.

## ROLE & CONTEXT
Let the user EDIT an existing VIEW in the Visual View Builder when the view's
SELECT is "simple enough" to represent visually; for anything more complex,
fall back cleanly to the SQL editor (TASK 11) — Navicat-style. The core is a
guarded reverse-parser: parse the stored SELECT into the builder's visual
model ONLY when it fits the supported subset, otherwise route to the SQL
editor with a clear message. Never open the builder with a wrong/lossy model.

Prereq: TASK 11 (view definition load via pg_get_functiondef/SHOW CREATE/
sqlite_master + SQL-editor edit), TASK 12/15/16/17 (visual builder: tables,
joins, output cols w/ aliases, WHERE via TASK 10 tree, delete-join). This task
adds "open in builder" for existing views + the parser + the fallback.

## ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local; a SQL parser lib is allowed — see below),
  npm run <script>, run app in dev to smoke-test
- Use chrome-devtools MCP for visual verification if helpful
- Connect to TASK 01 databases to load real view definitions + verify
- Create/edit/read files anywhere inside the db-tool project folder

## ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; NO deletes outside project; NO rm -rf outside it
- NO host/system config changes; NO -g global installs
- Verify with disposable `_vbtest_*` views; drop them after.

## SUPPORTED SUBSET (what "simple" means — parse ONLY these into the builder)
A view is builder-editable ONLY if its SELECT is a single SELECT with:
- FROM one or more base tables (real tables/views in the catalog), with
  optional aliases.
- JOINs of supported types (INNER/LEFT/RIGHT/CROSS as the engine allows) with
  ON conditions of the form a.col = b.col (equi-joins), possibly ANDed.
- Output columns that are plain column references (optionally aliased) and the
  simple aggregates the builder supports (COUNT/SUM/AVG/MIN/MAX) — TASK 12's
  own output model.
- Optional WHERE expressible by the TASK 10 filter tree (AND/OR of simple
  comparisons; the same operators the builder supports).
- Optional GROUP BY / HAVING / ORDER BY / DISTINCT that map to builder fields.

UNSUPPORTED -> fallback to SQL editor (do NOT attempt to visualize):
- Subqueries (in FROM, WHERE, or SELECT), CTEs (WITH), UNION/INTERSECT/EXCEPT,
  window functions, CASE/complex expressions, function calls beyond the simple
  aggregates, non-equi joins, USING()-joins you can't map cleanly, set-returning
  functions, lateral joins, anything referencing objects not in the catalog.

## PARSING APPROACH (robust, not hand-rolled regex)
- Use a real SQL parser library (project-local) rather than regex. Prefer a
  well-maintained JS SQL parser (e.g. node-sql-parser, which supports multiple
  dialects incl. postgres/mysql/sqlite) — pick per-engine dialect when parsing.
  Parse in MAIN (or a shared module); the AST never needs the DB.
- From the AST, run a CAPABILITY CHECK: walk the tree and confirm it ONLY uses
  the supported subset above. If ANY unsupported node is present -> mark
  "not builder-editable" and fall back.
- If supported, MAP the AST into the builder model: tables+aliases -> nodes;
  join list -> edges with type + ON columns; select list -> output columns
  (+aliases +aggregates); WHERE -> TASK 10 filter tree; group/having/order/
  distinct -> builder fields. Validate all referenced tables/columns exist in
  the catalog; if a referenced column/table can't be resolved -> fall back.

## UX
- In the tree context menu on a VIEW, add "Open in Visual Builder" (alongside
  the existing "Edit" that opens SQL editor from TASK 11).
- On choosing it:
  - If parseable+supported: open the builder pre-populated with the
    reconstructed model; the live SELECT should regenerate to something
    semantically equivalent. Let the user edit and SAVE (reuse TASK 11 view
    save = CREATE OR REPLACE / SQLite drop+recreate). 
  - If NOT supported: DON'T open the builder. Show a clear, friendly message
    ("This view is too complex for the visual builder (uses <reason: subquery/
    CTE/union/…>). Opening it in the SQL editor instead.") and open the SQL
    editor with the definition (TASK 11). Include the specific reason when easy.
- Round-trip honesty: regenerated SELECT may not be byte-identical to the
  original (formatting/alias differences) but must be SEMANTICALLY equivalent.
  If your mapping can't guarantee equivalence for a given construct, treat it
  as unsupported and fall back rather than silently changing meaning.

## STEPS (autonomous, in order)
1. Add a project-local SQL parser; wire dialect selection per engine.
2. Implement parse + capability-check (supported-subset gate) returning either
   a builder model or a "fallback + reason".
3. Implement AST -> builder model mapping (tables/joins/outputs/where/group/
   order/distinct) with catalog validation.
4. Add "Open in Visual Builder" to the view context menu; route supported ->
   builder (prefilled), unsupported -> SQL editor with the reason message.
5. Verify against TASK 01 DBs using DISPOSABLE views (PG/MySQL/SQLite):
   - Create a SIMPLE view (join customers+orders, a couple columns, a WHERE);
     "Open in Visual Builder" -> nodes+edge+columns+WHERE reconstructed;
     tweak (add a column), save, reopen data -> change persisted.
   - Create a view WITH an aggregate + GROUP BY -> reconstructs into builder
     aggregate/group fields.
   - Create a COMPLEX view (a subquery or a UNION or a CTE) -> "Open in Visual
     Builder" correctly REFUSES and falls back to the SQL editor with a reason;
     it does NOT open a broken builder.
   - A view referencing something the catalog resolves fine round-trips;
     confirm regenerated SELECT is semantically equivalent (preview rows match
     the original view's rows for a sample).
   - Drop disposable views.
6. npm run typecheck + npm run build clean.
7. Leave a clean state (dev server stopped; disposable views dropped).

## REPORT
State clearly which view shapes open in the builder vs fall back, and confirm
(with a row-sample check) that reconstructed simple views are semantically
equivalent to the originals.

## OUT OF SCOPE
- Visualizing subqueries/CTEs/unions/window functions in the builder (they
  stay in the SQL editor). Perfect byte-identical round-trip. Editing the
  SELECT of functions/procedures in a visual tool.

## DONE = "Open in Visual Builder" on an existing view reconstructs SIMPLE
views (tables, equi-joins, plain/aggregate output columns, WHERE via the
filter tree, group/having/order/distinct) into the visual model for editing +
save across PG/MySQL/SQLite, and cleanly FALLS BACK to the SQL editor with a
clear reason for complex views (subquery/CTE/union/window/etc.) without ever
opening a broken/lossy builder; reconstructed simple views are semantically
equivalent (row-sample verified); typecheck + build clean.
