# TASK 17: DB Tool — View Builder: delete a join via right-click context menu (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 12/15/16 (view builder).

## ROLE & CONTEXT
Add the ability to DELETE a join (edge) in the Visual View Builder via a
RIGHT-CLICK context menu on the join line. Currently the user can draw joins
but cannot remove them. Architecture unchanged; this is a small, focused UI +
model fix. Use chrome-devtools MCP for visual verification if helpful.

Prereq: TASK 12/15/16 view builder works (drag tables, draw column-to-column
joins as React Flow edges, edit join type/ON, generate SELECT, preview, save).

## ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local), npm run <script>, run app in dev to smoke-test
- Use chrome-devtools MCP to verify the context menu + deletion visually
- Connect to TASK 01 databases to confirm SELECT updates after delete
- Create/edit/read files anywhere inside the db-tool project folder

## ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; NO deletes outside project; NO rm -rf outside it
- NO host/system config changes; NO -g global installs
- Verify with disposable `_vbtest_*` views; drop them after.

## FEATURE
1. RIGHT-CLICK CONTEXT MENU on a join edge:
   - Right-clicking (onEdgeContextMenu in React Flow) a join line opens a
     small context menu at the cursor with at least:
       - "Delete join" (primary ask)
       - "Edit join…" (since we're building the menu anyway; opens the
         existing join type/ON editor from TASK 12 — include only if trivial
         to wire; otherwise skip and keep just Delete)
   - The menu closes on selecting an item, on clicking elsewhere, or on Esc.
   - Position the menu at the pointer; keep it within the viewport.
2. DELETE behavior:
   - Removes the edge from the React Flow edges state AND from the builder's
     join model, so it's gone from both the canvas and the generated SELECT
     (the corresponding JOIN clause disappears; if removing the join would
     leave a table unjoined/cartesian, that's allowed — the SELECT should
     still be valid SQL; optionally show a subtle hint, but don't block).
   - The live SELECT preview updates immediately.
   - No confirmation dialog needed for a single join delete (it's cheap to
     redo); but make sure it targets exactly the right-clicked edge.
3. Consistency:
   - Deleting a join must not corrupt output columns or other joins. If an
     output column referenced only via that join's table is still selected,
     keep it (the table node stays on the canvas unless the user removes it);
     only the JOIN relationship is removed.

## STEPS (autonomous, in order)
1. Wire React Flow's edge context-menu event (onEdgeContextMenu) to open a
   custom menu component at the pointer position, capturing the edge id.
2. Implement "Delete join": remove the edge (edges state) + the join entry in
   the builder model; regenerate SELECT; update preview. (Optionally wire
   "Edit join…" to the existing editor.)
3. Handle menu dismissal (click-away / Esc) and viewport positioning.
4. Verify against TASK 01 DBs (and/or via chrome-devtools MCP for the menu):
   - Draw customers.id -> orders.customer_id; confirm JOIN in SELECT.
   - Right-click the edge -> context menu appears -> Delete join -> edge
     disappears, JOIN removed from SELECT, preview updates.
   - With two joins present, right-click one -> only that one is deleted, the
     other remains intact.
   - Re-draw a join after deleting to confirm nothing is left in a broken
     state; save `_vbtest_deljoin` view; open data; drop it.
   - Quick sanity on MySQL/SQLite.
5. npm run typecheck + npm run build clean.
6. Leave a clean state (dev server stopped; disposable views dropped).

## OUT OF SCOPE
- Multi-select edge deletion, undo/redo history, keyboard-Delete on edges
  (the user chose right-click menu). Note as backlog; don't build now.

## DONE = right-clicking a join edge opens a context menu with "Delete join"
(and optionally "Edit join…"); deleting removes exactly that edge from the
canvas and the join model, updates the live SELECT/preview, leaves other
joins/columns intact, works across PG/MySQL/SQLite; typecheck + build clean;
verified (menu appears, correct edge deleted).
