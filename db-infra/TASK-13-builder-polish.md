# TASK 13: DB Tool — View Builder interaction polish (joins + checkboxes) (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 12 (view builder).

## ROLE & CONTEXT
Fix two specific interaction problems in the Visual View Builder (TASK 12) so
it feels like Navicat:
  (1) VISUAL JOIN DRAWING — the user should drag from a column on one table
      node to a column on another table node and have a join line/edge form,
      smoothly and reliably, the way Navicat does.
  (2) COLUMN CHECKBOXES ARE HARD TO CLICK — checking/unchecking a column's
      "include in output" checkbox often doesn't register (clicks get eaten
      by the canvas drag/pan). Make checkbox (and other in-node controls)
      clicks reliable.
Both stem from the same root cause: interactive controls inside React Flow
nodes conflict with the canvas's drag/pan/connection handlers. This task is
about INTERACTION QUALITY, not new features. Architecture unchanged.

Prereq: TASK 12 exists (canvas with table nodes listing columns w/ checkboxes,
join handles/edges, SELECT generation, preview, save-as-view). Keep all that
working; only improve the interaction.

## ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local), npm run <script>, run app in dev to smoke-test
- Connect to TASK 01 databases to re-verify build+preview+save still work
- Create/edit/read files anywhere inside the db-tool project folder

## ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; NO deletes outside project; NO rm -rf outside it
- NO host/system config changes (PATH, registry, .wslconfig, WSL, Docker
  Desktop settings, global npm); NO -g global installs
- Verify with disposable `_vbtest_*` views; drop them after.
- If a destructive/system action seems needed, STOP and ask.

## PROBLEM 1: reliable visual JOIN drawing (Navicat-style)
Requirements:
- Each column row in a table node has a CONNECTION HANDLE that is easy to grab
  (a visible dot/target on the row, ideally on BOTH sides of the row so joins
  can go left<->right between tables placed on either side). Handles should be
  reasonably large hit targets, and highlight on hover so the user sees where
  to start/end a drag.
- Dragging FROM a column handle and dropping ON another column's handle
  creates a join edge between exactly those two columns. While dragging, show
  a live connection line following the cursor (React Flow connectionLine) and
  highlight valid drop targets.
- Prevent invalid/awkward connections: no self-connect on the same column;
  connecting two columns of the same table instance should be disallowed or
  clearly handled; a column can participate in multiple joins if needed.
- The created edge is visually clear (a line between the two rows), labeled
  with the join type (INNER/LEFT/...), and selecting the edge opens the join
  editor (type + ON) from TASK 12.
- If React Flow's default node/handle setup is fighting this, use per-row
  Handle components (source+target) with correct ids so the edge binds to the
  specific column, not just the node. Ensure edges connect at the ROW level,
  not only node-to-node.
- Panning the canvas must NOT start a phantom connection, and starting a
  connection from a handle must NOT pan the canvas. Tune nodesDraggable /
  handle hit areas / stopPropagation so drag-to-connect and drag-to-move and
  pan are cleanly separated.

## PROBLEM 2: reliable in-node controls (checkboxes etc.)
Root cause is usually: React Flow treats mousedown inside the node as a node
drag / the node has `nodrag`/`nopan` not applied to interactive elements, so
clicks are swallowed.
Requirements:
- Column checkboxes (include-in-output) must toggle on a single click, every
  time. Same for any per-column control (alias field, aggregate dropdown).
- Apply React Flow's interaction opt-outs correctly: add the `nodrag` (and
  `nopan` where relevant) class to interactive elements / their containers so
  React Flow doesn't hijack the pointer; ensure pointer events aren't blocked
  by an overlay; make hit areas comfortable (adequate padding, label is
  clickable and bound to the checkbox).
- Dragging the node itself should still work when grabbing the node's title/
  body (a clear drag area), while the columns area allows normal clicking.
  I.e. define a drag handle region vs an interactive region.
- Verify no double-toggle / event bubbling issues (a click shouldn't both
  toggle the checkbox AND select/deselect the node in a way that feels wrong).

## GENERAL POLISH (small, only if quick)
- Hover affordances: highlight a column row on hover; cursor changes to a
  crosshair/pointer over a handle.
- Make table nodes resizable or at least sized so long column lists are
  scrollable within the node without breaking handle alignment.
- Keep edges attached to the correct rows when a node is moved or its column
  list scrolls (handle positions stay correct).

## STEPS (autonomous, in order)
1. Rework the table-node component: per-row source+target Handles with unique
   ids (nodeId+column), large hover-highlight hit targets on both sides; a
   defined drag-handle area (title) vs interactive area (columns).
2. Apply nodrag/nopan to checkboxes/inputs/dropdowns; fix pointer-event/
   stopPropagation so single clicks register and node-drag still works from
   the title.
3. Configure the connection line (live line while dragging), valid-target
   highlighting, and edge binding at row level; wire edge-select -> join
   editor (reuse TASK 12).
4. Separate pan vs connect vs move so none triggers another.
5. Re-verify end to end against TASK 01 DBs (don't regress TASK 12):
   - Drag customers + orders onto the canvas; DRAW a join by dragging from
     customers.id handle to orders.customer_id handle -> edge forms bound to
     those exact rows; edit its type; SELECT reflects it.
   - Toggle several column checkboxes with single clicks -> every toggle
     registers; output columns update; SELECT updates.
   - Move a node around -> the join line stays attached to the right rows.
   - Preview results in the grid; save `_vbtest_polish` view; open its data;
     drop it.
   - Repeat the core drag-join + checkbox check on MySQL and SQLite quickly.
6. npm run typecheck + npm run build clean.
7. (Optional, quick) package:dir + SMOKE to confirm no regression.
8. Leave a clean state (dev server stopped; disposable views dropped).

## NOTE ON VERIFICATION HONESTY
These are VISUAL/pointer interactions. Automated checks can confirm the code
wiring, edge/handle ids, state updates on toggle, and SELECT generation, but
the actual "does the drag feel right / does the checkbox click land" is a
human-eye check. Do the automated verification, then clearly tell the user to
test the drag-to-join and checkbox clicking by hand, and offer to adjust hit-
target sizes / drag regions based on their feedback.

## OUT OF SCOPE
- New builder features (subqueries, unions, etc.). This is interaction polish
  for existing join-drawing + column-selection only.

## DONE = joins are created by dragging column-handle to column-handle with a
live connection line and row-level edge binding (Navicat-style), pan/connect/
move are cleanly separated, and column checkboxes (and per-column controls)
toggle reliably on a single click with a proper drag-handle vs interactive
region; TASK 12 build/preview/save still work across PG/MySQL/SQLite;
typecheck + build clean; automated wiring verified + a clear hand-test note
to the user.
