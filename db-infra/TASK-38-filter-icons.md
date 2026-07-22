# TASK 38: DB Tool — Filter toolbar polish: remove hint text + give each button an icon (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 35/36.

# ROLE & CONTEXT
Two small visual fixes on the filter toolbar/panel:
(1) REMOVE the explanatory text "column ⋯ menu = per-column filter" (a leftover
    hint/placeholder) — it's clutter.
(2) Give EACH filter button its own appropriate ICON, consistent with the
    funnel icon already on the Builder/visual filter. So the Custom WHERE
    button, and any other filter buttons (Clear, Apply, per-column filter
    toggle, etc.), each get a fitting icon instead of text-only.
Pure visual/UX; no filtering logic changes. Use chrome-devtools MCP to verify.

Prereq: TASK 35 (funnel icon exists), TASK 36 (consolidated filter UI). Reuse
the app's icon set (lucide-react from TASK 32).

# ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local), npm run <script>, run app in dev
- Use chrome-devtools MCP to view the filter toolbar + confirm
- Create/edit/read files anywhere inside the db-tool project folder

# ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; NO deletes outside project; NO rm -rf outside it
- NO host/system config changes; NO -g global installs
- Visual only; do not change filtering behavior.

# CHANGES
1. REMOVE the "column ⋯ menu = per-column filter" hint text wherever it appears
   on the filter toolbar/panel. (If it conveyed a genuinely useful hint, move
   it to a tooltip on the relevant control instead of inline text — but by
   default just remove the clutter.)
2. ICONS per filter control (reuse lucide-react, consistent weight/size with
   the existing funnel):
   - Funnel/Builder (visual filter): keep the funnel icon (already there).
   - Custom WHERE: a code/SQL-style icon (e.g. Code / SquareCode / Terminal /
     braces "{}" glyph) — something that reads as "write raw SQL".
   - Per-column filter (header filter): a small filter glyph on the column
     header / its toggle, distinct from the main funnel.
   - Apply: a check icon; Clear/Reset: an x-circle / eraser / filter-x icon.
   - Any active-filter indicator: keep/refine the active badge.
   Each icon should have an accessible tooltip/label (so it's not icon-only-
   ambiguous): hovering shows the action name.
3. Keep buttons visually consistent (size, spacing, hover/active states) with
   the rest of the toolbar; align them tidily.

# STEPS (autonomous, in order)
1. Find the filter toolbar/panel component; remove the hint text.
2. Assign icons (lucide-react) to each filter control with tooltips; keep
   consistent sizing/spacing; preserve the funnel on the visual filter.
3. Verify WITH chrome-devtools MCP (PG/MySQL/SQLite quick check):
   - The "column ⋯ menu = per-column filter" text is gone.
   - Funnel, Custom WHERE, per-column filter, Apply, Clear each show a fitting
     icon with a tooltip on hover.
   - Buttons are aligned/consistent; hover/active states fine.
   - Filtering still works (no regression): funnel popover, per-column filter,
     Custom WHERE all apply/clear correctly; bottom SQL panel still reflects.
4. npm run typecheck + npm run build clean.
5. Leave a clean state (dev server stopped).

# VERIFICATION HONESTY
Visual — confirm via MCP screenshots that the text is gone and each button has
an icon+tooltip, then ask the user to eyeball icon choices and tweak to taste.

# OUT OF SCOPE
- New filter features, relabeling behavior. Just remove the text and add icons.

# DONE = the "column ⋯ menu = per-column filter" hint text is removed and each
filter control (funnel/Builder, Custom WHERE, per-column filter, Apply, Clear)
has a fitting icon with a hover tooltip, consistent with the existing funnel,
aligned and tidy, with no filtering regression across PG/MySQL/SQLite;
typecheck + build clean.
