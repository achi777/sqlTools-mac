# TASK 15: DB Tool — View Builder fix WITH real visual feedback (Chrome DevTools MCP) (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 12/13/14. Requires chrome-devtools MCP.

## ROLE & CONTEXT
The two View Builder bugs are STILL unfixed after two blind attempts
(TASK 13, 14), because the failures are purely visual/pointer and automated
typecheck/build can't tell whether a fix actually works. This time you have
EYES: the chrome-devtools MCP is available. USE IT to open the renderer,
actually try the interactions, SEE what happens (screenshots + DOM + console),
and iterate until they genuinely work — not until the build passes.

BUG 1 — JOIN EDGES DON'T BIND: dragging a line from one table's column to
another table's column does not create/attach an edge.
BUG 2 — COLUMN CHECKBOXES MISFIRE: toggling a column's include checkbox is
unreliable (many clicks, inconsistent).

## ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local), npm run <script>, run the app/dev server
- USE the chrome-devtools MCP tools to navigate, screenshot, read the DOM/
  accessibility tree, read console, and simulate clicks/drags on the renderer
- Add temporary debug logging while diagnosing; remove before finishing
- Create/edit/read files anywhere inside the db-tool project folder

## ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; NO deletes outside project; NO rm -rf outside it
- NO host/system config changes; NO -g global installs
- Verify with disposable `_vbtest_*` views if you save any; drop them after.

## HOW TO GET VISUAL FEEDBACK (important)
1. Start the renderer dev server (e.g. `npm run dev` starts Vite for the
   renderer at a localhost URL such as http://localhost:5173 — confirm the
   actual port from the dev output).
2. With chrome-devtools MCP, open that renderer URL in Chrome. Note: in a
   plain browser the preload `window.dbApi` is absent, so DB features won't
   run — that's FINE. If the View Builder needs some schema data to render
   table nodes, add a TEMPORARY dev-only mock (e.g. a query param or a dev
   flag that injects a couple of fake tables with columns) SO THE BUILDER
   CANVAS RENDERS in the browser for pure-UI testing. Keep this mock behind a
   dev flag and remove/disable it before finishing (do not ship a mock path).
   - If a browser mock is too invasive, ALTERNATIVELY launch Electron with a
     remote-debugging port and attach chrome-devtools MCP to that, so you test
     the real app. Pick whichever gets you reliable visual iteration fastest;
     state which you used.
3. Use the MCP to:
   - Screenshot the builder canvas with two table nodes.
   - Attempt to DRAG from one column's handle to another column's handle;
     screenshot mid-drag and after; read console; inspect whether an edge
     element appears in the DOM and whether onConnect fired.
   - Attempt to CLICK a column checkbox; verify via DOM/state whether it
     toggled; repeat several times to catch the intermittent failure.

## DIAGNOSE, THEN FIX (root causes — verify each WITH the MCP, don't guess)
BUG 1 candidates (confirm via DOM/console which one it is):
- Each column row must render BOTH a source and target React Flow Handle with
  unique STABLE ids (`${nodeId}:${col}:source` / `:target`). Inspect the DOM:
  are both handles present per row? Are ids stable across renders?
- onConnect must be wired and must ADD the edge to state using the handle ids;
  isValidConnection must not reject valid column-to-column joins. Log/observe
  whether onConnect fires on drop.
- Try `connectionMode="loose"` so the drop attaches to the nearest handle
  (big reliability/"feel" win) — verify with the MCP that edges now attach.
- Check handle hit area / pointer-events / z-index so the drop lands on the
  target handle. Confirm via screenshots + DOM.

BUG 2 candidates (confirm via the MCP which one it is):
- mousedown starting a node-drag instead of toggling: add `nodrag nopan` to
  the control + stopPropagation on pointer/mouse down; verify clicks now
  register every time by toggling repeatedly through the MCP.
- Use a controlled checkbox toggled on a reliable event (onClick/onPointerUp)
  with immutable state update; confirm the output list + generated SELECT
  update each toggle.
- Enlarge hit area; ensure label toggles; separate drag-handle (title) from
  the columns region.

## STEPS
1. Bring up the renderer so the builder canvas is visible in Chrome via the
   MCP (mock schema behind a dev flag if needed, or attach to Electron).
2. REPRODUCE both bugs through the MCP and capture what actually fails
   (screenshots, DOM, console) — establish the real root cause, not a guess.
3. Fix BUG 1 (handles/onConnect/connectionMode/hit-area). RE-TEST through the
   MCP: drag column->column, confirm a bound edge appears and persists.
4. Fix BUG 2 (nodrag/nopan/stopPropagation/controlled toggle/hit-area).
   RE-TEST through the MCP: single-click toggles reliably, repeatedly.
5. Remove any temporary debug logging and dev-only mock/flag.
6. Re-verify the REAL app (Electron dev, with DB) against TASK 01 DBs so
   nothing regressed: draw customers.id -> orders.customer_id, see it in the
   SELECT + join editor; toggle several checkboxes; preview; save
   `_vbtest_dt` view; open its data; drop it. Quick repeat on MySQL/SQLite.
7. npm run typecheck + npm run build clean.
8. Leave a clean state (dev server stopped; mock removed; debug logging gone;
   disposable views dropped).

## REPORT
Tell the user, concretely: which root cause each bug actually was (as OBSERVED
through the MCP, not assumed), what you changed, and the MCP-observed result
(e.g. "edge now attaches on drop; checkbox toggles on every single click").
Then ask them to confirm the feel in the real app.

## DONE = using chrome-devtools MCP you OBSERVED both bugs, identified the real
root causes, fixed them, and OBSERVED through the MCP that (a) dragging
column-to-column now creates a bound join edge and (b) column checkboxes
toggle reliably on a single click; temporary mock + debug logging removed; the
real Electron app re-verified against PG/MySQL/SQLite without regression;
typecheck + build clean.
