# TASK 14: DB Tool — View Builder DEEP FIX: edges won't bind + checkbox misfires (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 12/13.

## ROLE & CONTEXT
Two interaction bugs in the Visual View Builder are STILL broken after
TASK 13. Fix them at the ROOT CAUSE, not with more surface tweaks.

BUG 1 — JOIN EDGES DON'T CONNECT: the user can START dragging a line from a
column, but dropping it on a column of another table does NOT create/bind an
edge. Lines don't attach column-to-column.

BUG 2 — COLUMN CHECKBOXES MISFIRE: toggling a column's include checkbox needs
many clicks and is inconsistent (sometimes registers, sometimes not), so the
user can't reliably control which fields appear in the output.

This is a targeted debugging + correctness task on the React Flow node/handle
implementation. Do NOT rebuild the builder; find why binding + clicks fail and
fix precisely. Architecture unchanged.

## ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local), npm run <script>, run app in dev to smoke-test
- Connect to TASK 01 databases to re-verify build/preview/save
- Create/edit/read files anywhere inside the db-tool project folder
- ADD a small temporary in-app debug logging (console) while diagnosing, then
  remove it before finishing.

## ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; NO deletes outside project; NO rm -rf outside it
- NO host/system config changes; NO -g global installs
- Verify with disposable `_vbtest_*` views; drop them after.

## BUG 1 — EDGES WON'T BIND: likely root causes to CHECK IN ORDER
Diagnose systematically; the fix is usually one or more of these:
1. HANDLE IDS / TYPES: In React Flow, an edge binds source(nodeId, handleId,
   type='source') -> target(nodeId, handleId, type='target'). For column-level
   joins each column row needs BOTH a source Handle AND a target Handle, each
   with a UNIQUE, STABLE id (e.g. `${nodeId}:${column}:source` /
   `:target`). If a column only has a source handle (or ids collide/rename on
   render), the drop target won't accept the connection. -> Ensure every
   column row renders both a source and a target Handle with unique stable ids.
2. onConnect NOT WIRED / REJECTING: React Flow only persists an edge if
   `onConnect(params)` adds it to the edges state (params has source, target,
   sourceHandle, targetHandle). If onConnect is missing, ignores handle ids,
   or your isValidConnection returns false, the edge silently won't appear.
   -> Implement onConnect to add the edge (with the column info parsed from
   the handle ids) and store the join in the builder model. Make
   isValidConnection permissive (only block same-column/self).
3. HANDLE HIT AREA / POINTER EVENTS: if the handle's clickable area is tiny or
   an overlay/row element has `pointer-events` covering it, the drop never
   lands on the handle. -> Give handles a real hit area; ensure the row's
   inner elements don't steal pointer events from the target handle on drop.
4. CONNECTION MODE: consider `connectionMode="loose"` so a connection can end
   on the closest handle of a node/row rather than requiring a pixel-perfect
   hit on a specific handle type — this dramatically improves "it just
   connects" feel (Navicat-like). Evaluate and use if it helps.
5. Z-INDEX / SCROLL: if the node's column list scrolls, handle positions can
   desync; ensure handles are positioned so React Flow tracks them.

Deliver: dragging from one table's column to another table's column reliably
creates a visible edge BOUND to those two specific columns, and that join
shows up in the generated SELECT + the edge-select join editor (TASK 12).

## BUG 2 — CHECKBOX MISFIRES: likely root causes to CHECK IN ORDER
1. REACT FLOW DRAG HIJACK: mousedown inside the node starts a node drag unless
   the interactive element (and ideally its wrapper) has the `nodrag` class
   AND stops propagation. Inconsistency ("sometimes works") is the tell-tale
   of a drag-vs-click race. -> Put `nodrag nopan` on the checkbox/label and
   call e.stopPropagation() on onMouseDown/onPointerDown of the control.
2. onChange vs onClick + controlled state: use a controlled checkbox driven by
   builder state; handle the toggle on a reliable event. If using a custom
   div-as-checkbox, handle onPointerUp/onClick with stopPropagation, not a
   flaky mousedown. Ensure the label is clickable and bound.
3. HIT AREA: make the checkbox + label a comfortably large clickable target
   (padding), so a click near it still toggles.
4. NODE SELECTION INTERFERENCE: clicking the checkbox shouldn't also select/
   drag the node in a way that eats the toggle. Separate the drag handle
   (title bar) from the columns region so the columns region is purely for
   clicking column controls.
5. STATE UPDATE: confirm the toggle actually updates the output-columns model
   immutably (no stale closure), so the SELECT + output list reflect it every
   time.

Deliver: a SINGLE click on a column's checkbox (or its label) reliably toggles
whether that column is in the output, every time, and the generated SELECT +
output-columns list update immediately.

## STEPS (autonomous, in order)
1. Reproduce both bugs in dev; add temporary console logging in onConnect,
   isValidConnection, the handle render (log ids), and the checkbox handler to
   see exactly what fires. Identify the actual root cause from the list above.
2. Fix BUG 1: per-column source+target handles with unique stable ids;
   implement/repair onConnect to persist column-bound edges; permissive
   isValidConnection; consider connectionMode="loose"; ensure hit areas +
   pointer-events are correct.
3. Fix BUG 2: nodrag/nopan + stopPropagation on the checkbox/label; controlled
   toggle on a reliable event; larger hit area; drag-handle vs columns region
   separation; immutable state update.
4. Remove the temporary debug logging.
5. Re-verify against TASK 01 DBs (don't regress TASK 12/13):
   - Drag customers + orders; draw customers.id -> orders.customer_id; edge
     appears bound to those exact columns; join editor shows it; SELECT has
     the JOIN. Try a couple more joins incl. one going right-to-left.
   - Single-click toggle 4-5 different column checkboxes; each toggles first
     time; output list + SELECT update correctly; uncheck works too.
   - Move nodes; edges stay attached to correct rows.
   - Preview in grid; save `_vbtest_deepfix`; open data; drop it.
   - Quick repeat of draw-join + checkbox on MySQL and SQLite.
6. npm run typecheck + npm run build clean.
7. Leave a clean state (dev server stopped; disposable views dropped;
   debug logging removed).

## VERIFICATION HONESTY
These are pointer interactions. Do the automated wiring checks (onConnect
fires with correct handle ids and edges array grows; checkbox handler updates
state every call), THEN tell the user to hand-test drawing a join and clicking
checkboxes, and offer to tune handle size / connectionMode / hit areas based
on their feedback. If after this the "feel" still needs tuning, that's a quick
follow-up, not a redesign.

## OUT OF SCOPE
- New features. This is strictly making edge-binding and checkbox-toggle work
  reliably.

## DONE = joins reliably bind column-to-column by dragging (visible bound
edge, appears in SELECT + join editor), and column checkboxes toggle correctly
on a single click with the output/SELECT updating every time, across
PG/MySQL/SQLite; temporary debug logging removed; typecheck + build clean;
hand-test note given to the user.
