# TASK 33: DB Tool — Collapsible sidebar (icon-only rail) (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 32 (tree icons).

# ROLE & CONTEXT
Make the left sidebar (connections/object tree) COLLAPSIBLE to an ICON-ONLY
RAIL, so users get more room for the grid and the Visual View Builder. A toggle
button collapses the full sidebar into a narrow rail showing only icons; toggle
again to expand back to the full tree. Navicat/Slack-style. Visual/UX task; no
DB logic changes. Use chrome-devtools MCP to verify.

Prereq: TASK 32 (per-node icons exist) — reuse those icons for the rail state.

# ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local), npm run <script>, run app in dev
- Use chrome-devtools MCP to view + verify the collapse/expand behavior
- Create/edit/read files anywhere inside the db-tool project folder

# ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; NO deletes outside project; NO rm -rf outside it
- NO host/system config changes; NO -g global installs
- Visual/layout only; don't change DB queries/logic.

# BEHAVIOR
1. A TOGGLE control (a small icon button, e.g. a panel/chevron icon) at the top
   of the sidebar (or on its edge). Clicking it switches between:
   - EXPANDED: the full tree (icons + labels + expand/collapse of nodes) at its
     normal/resizable width.
   - RAIL (collapsed): a narrow strip showing only top-level icons (the
     connections, each as its icon; engine/state indicator visible). Labels
     hidden.
2. In RAIL mode:
   - Show connection icons (with connected/disconnected + engine indicator from
     TASK 32). Hovering an icon shows a tooltip with the connection name.
   - Clicking a connection icon in rail mode should either (a) expand the
     sidebar and focus that connection, or (b) open a small flyout of that
     connection's tree — pick the simpler, cleaner one (expand-on-click is
     fine and predictable). Document the choice.
   - The main work area (grid / view builder / editor) reflows to use the
     reclaimed width immediately.
3. Toggle again -> smoothly expand back to the full tree, restoring the
   previous expanded/selected state where reasonable.
4. PERSIST the collapsed/expanded state (and the expanded width) to userData so
   it survives app restart.
5. Smooth, quick transition (a short width animation is nice but keep it snappy;
   no janky reflow).

# STEPS (autonomous, in order)
1. Add sidebar collapsed/expanded state (Zustand) + persistence in userData.
2. Add the toggle button; implement the rail (icon-only) rendering reusing
   TASK 32 icons + tooltips + connection-state indicators.
3. Make the main area reflow to the reclaimed space; keep the existing
   resizable width for expanded mode.
4. Wire rail-icon click (expand + focus that connection) + hover tooltips.
5. Verify WITH chrome-devtools MCP:
   - Toggle collapses to an icon rail; the grid / view builder visibly gain
     width; toggle expands back; state persists across a dev restart.
   - Rail icons show tooltips + connection state; clicking one expands +
     focuses that connection.
   - No functional regression (tree still works when expanded; context menus,
     opening tables, view builder all fine).
6. npm run typecheck + npm run build clean.
7. Leave a clean state (dev server stopped).

# VERIFICATION HONESTY
Visual/interaction task — do the MCP checks (collapse/expand works, layout
reflows, persists), then ask the user to try the toggle and confirm the feel
(rail width, animation speed, click behavior) and tweak to taste.

# OUT OF SCOPE
- Multiple dockable panels, drag-to-resize redesign, hiding other panels.
  Note as backlog.

# DONE = the sidebar toggles between the full tree and an icon-only rail
(reusing TASK 32 icons + tooltips + connection-state), the main work area
reflows to gain space when collapsed, rail-icon click expands+focuses, and the
collapsed/expanded state + width persist across restart, verified via the MCP
with no functional regression; typecheck + build clean; a feel-check note given
to the user.
