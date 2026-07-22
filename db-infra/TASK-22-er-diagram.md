# TASK 22: DB Tool — ER Diagram (auto-render + edit) (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 04/05/12/15.

# ROLE & CONTEXT
Add an ER (entity-relationship) DIAGRAM: auto-render the connected database's
tables as nodes with their columns (PK/FK markers) and draw FK relationships
as edges — AND allow editing (create/alter tables and create/drop FKs from the
diagram, which runs real DDL). Reuse the React Flow canvas + table-node work
from the View Builder (TASK 12/15) and the DDL generators + destructive-confirm
from the Table Designer (TASK 05). Architecture unchanged: DB work in main;
renderer via typed IPC; DDL previewed + confirmed for destructive ops.

Prereq: TASK 04 (schema catalog incl. columns/types/PK; needs FK info),
TASK 05 (per-driver CREATE/ALTER + destructive-confirm + table designer),
TASK 12/15 (React Flow canvas, table nodes, edges, reliable handles).

# ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local; a layout lib like dagre/elkjs is allowed),
  npm run <script>, run app in dev to smoke-test
- Use chrome-devtools MCP for visual verification
- Connect to TASK 01 databases to render + verify DDL from the diagram
- Create/edit/read files anywhere inside the db-tool project folder

# ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; NO deletes outside project; NO rm -rf outside it
- NO host/system config changes; NO -g global installs
- Any table/FK EDIT from the diagram that is destructive (drop table, drop
  column, drop FK) MUST show the exact DDL and require explicit confirmation
  (reuse TASK 05's confirm flow). Verify edits on DISPOSABLE `_ertest_*`
  objects; never alter/drop the seeded customers/orders/order_items. Clean up.
- If a destructive/system action seems needed beyond the confirm flow, STOP.

# PREREQUISITE DATA: FK metadata in the catalog
The diagram needs foreign-key relationships. Ensure the schema catalog (or a
new IPC listForeignKeys) provides, per table: FK name, local columns,
referenced table + columns, on-update/on-delete actions. Per engine:
- PG: information_schema.table_constraints + key_column_usage +
  referential_constraints (or pg_constraint).
- MySQL: information_schema.KEY_COLUMN_USAGE + REFERENTIAL_CONSTRAINTS.
- SQLite: PRAGMA foreign_key_list(table).

# FEATURES

## A. AUTO-RENDER (read)
- An "ER Diagram" view/tab for the active connection/schema. On open, fetch
  all tables + columns + PKs + FKs and render:
  - each table as a node: title = table name; rows = columns with type; mark
    PK (key icon) and FK columns; show NOT NULL subtly.
  - FK relationships as edges from the FK column(s) to the referenced table's
    PK/unique column(s). Edge style shows direction; label with FK name on
    hover/selection. Crow's-foot or simple arrow — pick one clean style.
- AUTO-LAYOUT: use a layout lib (dagre or elkjs) to position nodes without
  overlap on first render. A "re-layout" button re-runs it.
- Usability: pan/zoom, fit-to-view, a minimap (React Flow minimap) for big
  schemas, collapse/expand a node's column list, and a search box to locate +
  focus a table.
- PERSIST LAYOUT: save node positions (per connection+schema) to userData so
  the user's manual arrangement is restored next open. A "reset layout"
  option re-runs auto-layout.

## B. EXPORT
- Export the diagram to PNG and SVG (React Flow supports exporting the
  viewport; use html-to-image or the toSvg/toPng approach). File save via the
  app; note the output path to the user.

## C. EDIT (write — runs real DDL, confirmed)
- NEW TABLE from the diagram: a "New table" action places a new table node and
  opens the TASK 05 Table Designer (or an inline editor) to define it; on
  apply -> CREATE TABLE DDL (preview + confirm), node becomes real, catalog +
  diagram refresh.
- EDIT TABLE: double-click a table node (or a context menu) -> open the TASK 05
  designer for that table (add/drop/modify columns, indexes) -> ALTER DDL with
  destructive-confirm.
- CREATE FK by DRAWING: drag from a column on one table to a column on another
  to propose a FOREIGN KEY (child.col -> parent.col). Open a small dialog to
  set FK name + ON DELETE/UPDATE actions, preview the ALTER TABLE ADD
  CONSTRAINT DDL, confirm, apply; the edge becomes a real FK. (SQLite caveat:
  adding an FK to an existing table requires the table-rebuild pattern from
  TASK 05 — reuse it, show it in preview, or note the limitation clearly.)
- DROP FK: select/right-click an FK edge -> "Drop foreign key" -> confirm ->
  ALTER TABLE DROP CONSTRAINT/FK -> edge removed.
- DROP TABLE: context menu on a node -> confirm (typed name for safety) -> DROP
  TABLE -> node removed. Refresh catalog + diagram.
- After any DDL, refresh the catalog + re-render affected nodes/edges without
  losing the rest of the manual layout.

# STEPS (autonomous, in order)
1. Add FK metadata to the catalog (or listForeignKeys IPC) per driver.
2. ER view: fetch tables/cols/PK/FK; render nodes + FK edges; auto-layout
   (dagre/elkjs); pan/zoom/fit/minimap/search/collapse; persist + reset layout.
3. Export PNG/SVG.
4. Edit: new table + edit table (reuse TASK 05 designer); create FK by drawing
   (dialog + ADD CONSTRAINT + confirm; SQLite rebuild); drop FK; drop table;
   all with DDL preview + destructive-confirm; refresh after.
5. Verify against TASK 01 DBs (PG/MySQL/SQLite):
   - Open ER diagram: customers/orders/order_items render; the existing FKs
     (orders.customer_id -> customers, order_items -> orders) show as edges;
     PK/FK markers correct; auto-layout is non-overlapping; export a PNG.
   - Manually move nodes, reopen -> layout persisted.
   - On DISPOSABLE objects: create `_ertest_parent` and `_ertest_child`; draw
     an FK child->parent (dialog + confirm) -> real FK created, edge appears;
     drop the FK -> edge gone; edit `_ertest_child` (add a column) via the
     designer; drop both tables (typed confirm). Do this on PG, MySQL, and
     SQLite (SQLite FK-add uses the rebuild pattern).
   - Confirm seeded tables were never altered.
6. npm run typecheck + npm run build clean.
7. (Optional, quick) package:dir + SMOKE.
8. Leave a clean state (dev server stopped; all `_ertest_*` dropped).

# OUT OF SCOPE (later)
- Diagram-driven full schema migration/versioning, multiple saved diagrams per
  DB, notes/annotations on the canvas, printing, importing a diagram to create
  a whole schema at once. Note as backlog.

# DONE = an ER Diagram view auto-renders tables (columns, PK/FK markers) with
FK relationships as edges, auto-layout + pan/zoom/minimap/search/collapse +
persisted manual layout + PNG/SVG export; and supports editing that runs real,
previewed, destructive-confirmed DDL — new/edit table (via the TASK 05
designer), create FK by drawing (incl. SQLite rebuild), drop FK, drop table —
across PG/MySQL/SQLite, refreshing without losing layout; verified on
disposable objects with the seeded tables untouched; typecheck + build clean.
