# TASK 40: DB Tool — Fix Connections panel overflow after icons (scroll + buttons spilling) (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 39.

# ROLE & CONTEXT
After adding icons (TASK 39), the CONNECTIONS panel has two layout bugs:
(1) The connection list now overflows and shows a vertical SCROLL / doesn't fit
    (icons increased height/width, breaking the layout).
(2) Each connection's action buttons (Connect/Disconnect, Edit, Delete) SPILL
    OUTSIDE their frame/container (horizontal overflow).
Fix both so the connections panel and its per-connection action buttons fit
cleanly. Pure visual/layout; no logic changes. Use chrome-devtools MCP to see +
confirm.

Prereq: TASK 20 (connection actions), TASK 39 (icons added). Same class of
flexbox-overflow issue as TASK 37's popover.

# ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local), npm run <script>, run app in dev
- Use chrome-devtools MCP to view the connections panel + measure overflow +
  confirm fix
- Create/edit/read files anywhere inside the db-tool project folder

# ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; NO deletes outside project; NO rm -rf outside it
- NO host/system config changes; NO -g global installs
- Visual/CSS/layout only.

# BUG 2 — action buttons spill outside the frame (likely causes)
- The row of buttons (Connect/Disconnect + Edit + Delete, now with icons) is
  wider than the connection card/container -> horizontal overflow. Fixes:
  - flex layout with the buttons allowed to wrap (flex-wrap) OR shrink; add
    min-width: 0 where needed; box-sizing: border-box on buttons.
  - If icon+label makes each button too wide for a narrow sidebar, consider
    ICON-ONLY buttons here (with tooltips) for the compact connection actions,
    since space is tight — this is a good place for icon-only + tooltip.
  - Ensure the button group fits the card width at the sidebar's default (and
    resized) widths; wrap to a second line gracefully if needed.

# BUG 1 — panel overflow / unwanted scroll (likely causes)
- Icons increased row height so fewer items fit -> a vertical scroll appears.
  Some scroll is acceptable if there are many connections, but:
  - Make sure it's not a DOUBLE scrollbar or a broken container height (e.g. a
    fixed height that's too small, or content overflowing its parent).
  - Right-size row height/padding so the default 3 connections fit without
    scroll; the list area should flex to the available panel height and only
    scroll when genuinely too many items exist.
  - box-sizing + correct flex column layout so the list uses available space
    and doesn't overflow its parent unexpectedly.

# STEPS (autonomous, in order)
1. With chrome-devtools MCP, open the Connections panel and OBSERVE both: the
   buttons spilling out of the card, and the scroll/fit issue (screenshots +
   inspect computed layout) to confirm the real causes.
2. Fix BUG 2: make the per-connection action buttons fit their card (wrap/
   shrink/box-sizing; or icon-only + tooltips in this compact context).
3. Fix BUG 1: right-size rows + proper flex-column so the default connections
   fit without an unnecessary scroll; genuine overflow scrolls cleanly (single
   scrollbar).
4. Re-verify WITH the MCP:
   - The 3 default connections fit without a needless scrollbar.
   - Each connection's action buttons sit fully inside the card (no spill) at
     default and narrower sidebar widths.
   - Buttons remain usable (clickable, tooltips if icon-only); collapse/rail
     mode (TASK 33) still fine.
   - No functional regression (Connect/Disconnect/Edit/Delete still work).
5. npm run typecheck + npm run build clean.
6. Leave a clean state (dev server stopped).

# VERIFICATION HONESTY
Visual fix — confirm via MCP screenshots that buttons no longer spill and the
list fits, then ask the user to confirm in the real app and tweak (icon-only vs
icon+label for the compact actions) to taste.

# OUT OF SCOPE
- Redesigning the connection card, new actions. Just make it fit.

# DONE = the Connections panel fits (default connections without an unnecessary
scrollbar; genuine overflow scrolls cleanly with a single scrollbar) and each
connection's action buttons (Connect/Disconnect, Edit, Delete) sit fully inside
their card at default + narrower widths (wrapping/shrinking or icon-only+
tooltip), with no functional regression, verified via the MCP; typecheck +
build clean.
