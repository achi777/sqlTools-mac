# TASK 34: Filter SQL bottom panel (read-only, copyable) — AUTONOMOUS
# Depends on TASK 08/09/10/21.

## GOAL
When browsing a table with filters active (Quick / Visual Builder / Custom
WHERE), show the generated SELECT ... WHERE ... in a READ-ONLY panel at the
BOTTOM of the window (Navicat-style), copyable. Do NOT touch the SQL query
editor (which may hold INSERT/UPDATE). Separate, non-editable — no two-way sync.

## PERMISSIONS
- npm install (project-local), npm run <script>, run app in dev
- chrome-devtools MCP for visual verification
- edit files inside the db-tool project only

## GUARDRAILS (ask first)
- NO docker prune / down -v; NO deletes outside project; NO host/system config
  changes; NO -g installs. Read-only display; never executes anything.

## FEATURE
1. A collapsible BOTTOM PANEL under the data grid showing the effective
   SELECT + WHERE (from whichever filter mode is active) + ORDER BY (pk).
2. READ-ONLY (syntax-highlighted, not editable, not executed).
3. Values INLINED and safely quoted/escaped per dialect so it's copy-runnable,
   e.g. SELECT * FROM "customers" WHERE ("age" > 30 AND "status" = 'active')
   ORDER BY "id". (Execution still uses bound params; this string is display-
   only — do NOT execute the inlined string.)
4. Updates LIVE on filter apply/clear and table change. No filter -> plain
   SELECT * FROM table ORDER BY pk.
5. COPY button (clipboard). Optional "send to SQL editor" = opens a NEW query
   tab, explicit action, never auto-sync.
6. Collapsible + state persisted (userData).
7. Scope: table-browsing filters only; does not touch the SQL editor.

## STEPS
1. Reuse the same WHERE builder as getTablePage, but produce a DISPLAY string
   with values inlined + escaped per dialect (alongside the parameterized
   executor; never execute the inlined string).
2. Bottom panel (read-only, highlighted) + Copy + collapse toggle (persisted).
3. Live updates on filter/table change.
4. Verify PG/MySQL/SQLite: no-filter plain SELECT; Quick/Builder/Custom each
   show correct WHERE matching the rows; O'Brien value escaped correctly in the
   display string; Copy works; collapse persists; SQL editor untouched.
5. npm run typecheck + npm run build clean.
6. Leave clean state (dev server stopped).

## DONE = collapsible read-only bottom panel shows the effective SELECT+WHERE
(values inlined + escaped per dialect) for the current browse, live-updating,
with Copy, across PG/MySQL/SQLite, without touching the SQL editor; escaping
verified with a quoted value; collapse persists; typecheck + build clean.