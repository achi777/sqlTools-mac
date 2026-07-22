# TASK 12: DB Tool — Visual View Builder (drag-drop query designer) (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 04/08/11.

## ROLE & CONTEXT
Add a Navicat-style VISUAL VIEW BUILDER: a canvas where the user drags tables
in, draws JOINs between columns, picks output columns, and sets WHERE / GROUP
BY / ORDER BY visually. It generates a SELECT (live preview), lets the user
preview results in the paginated grid, and saves it as a VIEW reusing TASK
11's view save/edit layer. Architecture unchanged: DB work in main; renderer
via typed contextBridge; generated SQL executed in main; identifiers
validated against the schema catalog; any bound values parameterized.

Prereq: TASK 04 (schema catalog: tables + columns + types), TASK 08
(paginated grid to preview results), TASK 11 (create/edit VIEW from a SELECT).
This task GENERATES the SELECT and hands it to TASK 11's view-save path.

## ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local, e.g. a canvas/flow lib), npm run <script>,
  run app in dev to smoke-test
- Connect to TASK 01 databases to preview generated SELECTs + save test views
- Create/edit/read files anywhere inside the db-tool project folder

## ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; NO deletes outside project; NO rm -rf outside it
- NO host/system config changes (PATH, registry, .wslconfig, WSL, Docker
  Desktop settings, global npm); NO -g global installs
- Save only DISPOSABLE `_vbtest_*` views when verifying; drop them after.
- If a destructive/system action seems needed, STOP and ask.

## FEATURES

### 1. CANVAS
- A pannable/zoomable canvas. Suggest a mature lib (e.g. React Flow, already
  in the app's dependency world) rather than hand-rolling — but keep it
  project-local and lightweight.
- Add tables: from a side list (schema catalog) drag/click a table onto the
  canvas; it renders as a node listing its columns (name + type), each column
  with a checkbox for "include in output" and a small handle for joining.
- Multiple instances of the same table allowed (self-join) with auto aliases
  (t1, t2, ...). Show the alias on the node.

### 2. JOINS
- Draw a join by connecting a column handle on one table to a column handle
  on another. Creates a join edge.
- Each join edge is editable: join TYPE (INNER, LEFT, RIGHT [not SQLite],
  FULL [PG only; MySQL/SQLite limited]) and the ON condition (defaults to the
  two dragged columns; allow adding extra ON predicates / composite keys).
- Respect engine limits: RIGHT/FULL join availability differs — offer only
  what the active engine supports, and note it. (SQLite: INNER/LEFT/CROSS;
  MySQL: INNER/LEFT/RIGHT; PG: all.)
- Suggested joins: if an FK relationship exists between two dropped tables
  (from the catalog), offer to auto-create the join on the FK columns.

### 3. OUTPUT COLUMNS
- A columns panel listing chosen output columns (from checked columns), with:
  alias (AS), an optional aggregate (COUNT/SUM/AVG/MIN/MAX) per column,
  ordering (drag to reorder), and show/hide.
- Expression columns: allow a free-text expression column (validated lightly)
  for things like concatenations or computed values — advanced, optional.

### 4. WHERE / GROUP BY / HAVING / ORDER BY
- WHERE: reuse the FILTER BUILDER tree from TASK 10 (nested AND/OR, type-aware)
  to define the WHERE — do NOT reinvent it; feed the same compiler. Columns
  come from the tables on the canvas.
- GROUP BY: auto-suggested when any aggregate is used (group by all non-
  aggregated output columns) but editable.
- HAVING: optional, a simpler condition set on aggregates.
- ORDER BY: pick columns + ASC/DESC, drag to order.
- DISTINCT toggle. LIMIT is left to the preview/grid (don't bake a LIMIT into
  the saved view).

### 5. LIVE SQL + PREVIEW + SAVE
- Live, read-only generated SELECT shown in a pane, updating as the design
  changes (dialect-correct: identifier quoting, join syntax, alias usage).
- "Preview results": run the generated SELECT through the paginated grid
  (TASK 08) so the user sees real rows before saving.
- "Save as View": hand the generated SELECT to TASK 11's create-view path
  (name + OR REPLACE / SQLite drop+recreate as appropriate). After save,
  refresh the tree; the new view opens data via the grid.
- "Edit existing simple view in builder" is OPTIONAL and only if feasible:
  parsing arbitrary SELECT back into the visual model is hard — it's fine to
  support builder->view one way, and edit-as-SQL via TASK 11 for round trips.
  If you attempt reverse-parsing, restrict it to simple single-level selects
  and fall back to the SQL editor otherwise. Note the limitation.

## GENERATION RULES (safety + correctness)
- Identifiers (tables/columns/aliases) come from the catalog and are quoted
  per dialect; never emit unvalidated identifiers.
- The WHERE/HAVING values are bound parameters when executed for preview; for
  the SAVED view definition, values are inlined into the stored SELECT (views
  can't take params) — so ensure literal values are safely escaped/quoted per
  dialect for the stored definition, and clearly limit WHERE literals to
  well-formed typed values (numbers, quoted strings with proper escaping,
  booleans, NULL). Prefer parameterized preview; careful literal rendering for
  the stored view.
- Dialect join/select differences handled per engine.

## STEPS (autonomous, in order)
1. Add a canvas (React Flow or similar, project-local). Table-node component
   from catalog (columns, checkboxes, join handles, alias).
2. Join edges with type + ON editor; engine-aware join-type options; FK
   auto-join suggestion.
3. Output columns panel (alias, aggregate, reorder), DISTINCT.
4. Wire WHERE via the TASK 10 filter tree/compiler; GROUP BY/HAVING/ORDER BY.
5. SELECT generator (dialect-correct) -> live SQL pane. Preview via paginated
   grid. Save via TASK 11 create-view.
6. Verify against TASK 01 DBs using DISPOSABLE views:
   - PG: drag customers + orders, auto-join on the FK, pick columns from both,
     add a COUNT aggregate with GROUP BY, a WHERE (via the tree), ORDER BY;
     confirm live SQL is valid, preview shows correct rows, save as
     `_vbtest_pg` view, open its data. Add a self-join case (customers t1/t2).
   - MySQL: same core flow; confirm RIGHT JOIN offered, FULL not; save
     `_vbtest_my`.
   - SQLite: same core flow; confirm only INNER/LEFT/CROSS offered; save
     `_vbtest_sq` (created via TASK 11's SQLite path); open data.
   - Confirm identifier quoting + a WHERE string literal with a quote (O'Brien)
     renders safely in both preview (bound) and the stored view (escaped).
   - Drop all disposable views.
7. npm run typecheck + npm run build clean.
8. (Optional, quick) package:dir + SMOKE to confirm no regression.
9. Leave a clean state (dev server stopped; disposable views dropped).

## OUT OF SCOPE (later)
- Full reverse-engineering of arbitrary SELECTs into the visual model,
  subqueries/CTEs in the visual builder, UNION designer, window functions UI.
  Note as backlog; complex SELECTs stay in the SQL editor (TASK 11).

## DONE = a visual canvas lets the user drag tables, draw engine-aware JOINs
(with FK auto-join), pick output columns with aggregates, set WHERE (reusing
the TASK 10 filter tree) + GROUP BY/HAVING/ORDER BY + DISTINCT, see a live
dialect-correct SELECT, preview results in the paginated grid, and save it as
a VIEW via the TASK 11 path across PG/MySQL/SQLite (engine join limits
respected, identifiers validated/quoted, literals safely rendered); typecheck
+ build clean; verified on disposable views (incl. self-join + a quoted
literal) that were cleaned up.
