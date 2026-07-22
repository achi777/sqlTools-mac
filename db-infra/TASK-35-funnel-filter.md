# TASK 35: DB Tool — Navicat-style funnel-icon filter (popover Visual Builder) (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 09/10/21/34.

# ROLE & CONTEXT
Add a Navicat-style FUNNEL ICON on the grid toolbar that opens a POPOVER for
building WHERE conditions visually. This is a NEW, convenient entry point that
REUSES the existing Visual Filter Builder logic (TASK 10: nested AND/OR,
column/operator/value) but presented as a polished funnel-triggered popover.
IMPORTANT: keep ALL existing filters as-is — the current mode selector (Quick /
Visual Builder / Custom WHERE) stays exactly as it is. This funnel is an
ADDITIONAL, Navicat-like way in, not a replacement. Nothing existing is removed.
Architecture unchanged; server-side parameterized filtering as before.

Prereq: TASK 10 (visual filter builder tree + compiler -> parameterized WHERE),
TASK 09/21 (other modes), TASK 34 (filter-SQL bottom panel). Reuse TASK 10's
tree model + compiler so behavior/safety are identical.

# ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local), npm run <script>, run app in dev to smoke-test
- Use chrome-devtools MCP for visual verification
- Connect to TASK 01 databases to verify filtering + counts
- Create/edit/read files anywhere inside the db-tool project folder

# ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; NO deletes outside project; NO rm -rf outside it
- NO host/system config changes; NO -g global installs
- Reuse TASK 10's parameterized compiler (bound params, catalog-validated
  columns). Do NOT introduce a new unsafe string-built WHERE.

# FEATURE
1. FUNNEL ICON on the data-grid toolbar (a filter/funnel glyph). A small badge/
   highlight when a filter from it is active (like Navicat).
2. CLICK -> a POPOVER (anchored under the funnel, Navicat-style) containing the
   visual condition builder:
   - Rows of conditions: [column dropdown] [operator dropdown] [value input(s)]
     with a "+" to add a condition and "×" to remove one.
   - Group combiner AND/OR; ability to add a nested group (reuse TASK 10's
     nested capability) — but keep the default view simple (a flat AND list is
     the common case; nesting available via "add group").
   - Columns come from the current table's catalog (type-aware operators +
     value inputs, same as TASK 10/09).
   - Buttons: Apply, Clear, and close. Apply runs the filter server-side
     (page 1 reset), Clear removes it.
3. COEXISTENCE (important): this funnel drives the SAME visual-builder filter
   state as TASK 10 (they're the same underlying filter), OR is presented as
   part of the existing mode system — pick the cleaner integration:
   - Simplest: the funnel popover is just a compact UI over the EXISTING
     Visual Builder filter (same state, same compiler). Opening the funnel
     edits the builder filter; the existing Builder panel and the funnel show
     the same conditions. This avoids a 4th independent filter.
   - The Quick and Custom WHERE modes remain available and untouched.
   Document the chosen integration in a code comment + README so it's clear.
4. The bottom filter-SQL panel (TASK 34) reflects the funnel's WHERE too, since
   it's the same underlying filter.
5. POLISH (Navicat feel): clean popover styling, aligned condition rows,
   type-appropriate inputs, active-state badge on the funnel, keyboard-friendly
   (Enter applies, Esc closes), click-away closes.

# STEPS (autonomous, in order)
1. Add the funnel icon + active badge to the grid toolbar.
2. Build the popover UI over the EXISTING TASK 10 builder state + compiler
   (condition rows, add/remove, AND/OR, optional nested group), type-aware
   inputs from the catalog. No new filtering backend — reuse getTablePage +
   TASK 10 compiler.
3. Wire Apply/Clear (page-1 reset, server-side), active badge, click-away/Esc.
4. Ensure Quick + Custom WHERE modes remain fully intact; funnel + Builder
   share one filter; bottom SQL panel (TASK 34) shows it.
5. Verify WITH chrome-devtools MCP + against TASK 01 DBs (PG/MySQL/SQLite):
   - Click funnel -> popover opens; add 2 conditions (AND) -> Apply -> grid
     filters correctly, filtered count right, bottom panel shows the WHERE.
   - Add a nested group (AND/OR) -> correct results.
   - A quoted value (O'Brien) -> parameterized/safe.
   - Funnel active badge shows; Clear removes filter; click-away/Esc close.
   - Existing Quick filter and Custom WHERE still work; switching among them
     behaves sensibly; nothing removed.
6. npm run typecheck + npm run build clean.
7. Leave a clean state (dev server stopped).

# VERIFICATION HONESTY
Visual + interaction. Do MCP checks (popover opens, conditions apply, results/
count correct, badge shows), then ask the user to eyeball the Navicat feel
(popover look, spacing, funnel placement) and tweak to taste.

# OUT OF SCOPE
- Removing/replacing existing filter modes (they stay), saved filters. Note as
  backlog.

# DONE = a funnel icon on the grid toolbar opens a polished Navicat-style
popover that builds WHERE conditions (column/operator/value, +/×, AND/OR,
optional nesting) reusing TASK 10's parameterized compiler and driving the same
underlying visual filter; Apply/Clear work server-side with an active badge,
click-away/Esc, the bottom SQL panel reflects it; existing Quick/Builder/Custom
WHERE modes remain fully intact; verified across PG/MySQL/SQLite incl. a nested
group + quoted value; typecheck + build clean.
