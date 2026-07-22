# TASK 39: DB Tool — Consistent button icons across the whole app (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 32/38.

# ROLE & CONTEXT
Give buttons across the ENTIRE app a fitting icon for visual consistency —
EXCEPT where an icon doesn't help UX (see the judgment rules). This is an
app-wide visual polish pass, building on the tree icons (TASK 32) and filter
icons (TASK 38). One coherent icon set (lucide-react), consistent sizing/
placement, with tooltips. No logic changes. Use chrome-devtools MCP to review.

Prereq: TASK 32 (icon set established for the tree), TASK 38 (filter buttons
iconed). Reuse the SAME icon set + a central icon mapping so everything is
consistent.

# ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local), npm run <script>, run app in dev
- Use chrome-devtools MCP to inventory buttons + review the result
- Create/edit/read files anywhere inside the db-tool project folder

# ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; NO deletes outside project; NO rm -rf outside it
- NO host/system config changes; NO -g global installs
- Visual only; do not change button behavior/labels' meaning.

# JUDGMENT RULES — icon vs no icon (important: don't over-icon)
ADD an icon (icon + label, icon leading) for ACTION buttons with a clear
real-world glyph:
- New/Add (+ / plus), Edit (pencil), Delete/Drop (trash), Save (save/disk),
  Refresh (refresh-cw), Run/Execute (play), Connect (plug), Disconnect
  (plug-off), Import (download/upload as appropriate), Export (upload/
  file-export), Copy (copy), Apply (check), Clear/Reset (x / filter-x),
  Dump (database/file-down), Restore/Execute SQL file (file-up/play),
  Test connection (plug-zap), Search (search), Add column/row (plus),
  Move up/down (chevrons), Expand/Collapse (chevrons/panel).
KEEP TEXT-ONLY (no icon) where an icon adds noise, not clarity:
- Generic dialog confirmations where text is clearest: "OK", "Cancel",
  "Yes/No" — a plain button is fine (Cancel MAY use an x, but don't force it).
- Primary submit buttons whose label is already unambiguous and where an icon
  would look busy — use judgment; consistency within a dialog matters more
  than iconing every button.
- Toggle text like tab labels, mode names, or link-style buttons where an icon
  would clutter.
ICON-ONLY (no label) is fine for compact toolbars where space is tight AND the
icon is universally understood (refresh, close ×, add +) — but ALWAYS give
icon-only buttons a tooltip/aria-label.

# APPROACH
1. INVENTORY: with the MCP + a code search, list the app's buttons by area:
   connection manager, object tree context menus, table designer, SQL editor
   toolbar (Run, new tab, etc.), data grid toolbar (CRUD, pagination, export/
   import), filter toolbar (done in TASK 38 — keep consistent), view builder,
   ER diagram, sequences/triggers/indexes editors, dump/restore, dialogs.
2. CENTRAL MAPPING: define a single, central action->icon map (reuse/extend the
   TASK 32 icon map) so the SAME action uses the SAME icon everywhere (every
   "Delete" is the same trash icon, every "Refresh" the same, etc.).
3. APPLY consistently with the judgment rules; add tooltips/aria-labels
   (especially for icon-only). Consistent icon size, spacing, and leading/
   trailing placement (icons typically lead the label).
4. Respect theme tokens (colors from CSS vars, TASK 32) so a future dark theme
   works.

# STEPS (autonomous, in order)
1. Inventory buttons per area (report the list).
2. Build/extend the central action->icon map.
3. Apply icons across areas per the judgment rules; tooltips for icon-only;
   consistent sizing/placement; theme-token colors.
4. Verify WITH chrome-devtools MCP across the main screens (PG/MySQL/SQLite):
   - The same action shows the same icon everywhere (spot-check Delete, Refresh,
     Save, New, Run, Export).
   - Action buttons have fitting icons; dialogs aren't over-iconed; icon-only
     buttons have tooltips.
   - Nothing is misaligned or oversized; hover/active states fine.
   - No functional regression (every button still does what it did).
5. npm run typecheck + npm run build clean.
6. Leave a clean state (dev server stopped).

# VERIFICATION HONESTY
App-wide visual pass — do MCP screenshots of the major areas, confirm
consistency + no over-iconing, then ask the user to eyeball and flag any button
where the icon choice or the icon/no-icon decision feels off, and tweak to
taste. Expect 1-2 taste iterations.

# OUT OF SCOPE
- New buttons/features, relabeling, full theme switch. Just consistent iconing.

# DONE = buttons across the app use a single, central, consistent icon mapping
(same action = same icon everywhere) applied with good judgment (action buttons
iconed; dialog confirmations and cluttered spots left text-only; icon-only
buttons have tooltips), theme-token colors, aligned and sized consistently,
with no functional regression across PG/MySQL/SQLite; typecheck + build clean;
an inventory + a taste-check note given to the user.
