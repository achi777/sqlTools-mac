# TASK 16: DB Tool — View Builder: auto-alias duplicate output column names (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 12/15 (view builder).

## ROLE & CONTEXT
Fix a SQL-correctness bug in the Visual View Builder. When two joined tables
have columns with the SAME name (e.g. both have `id`) and the user selects
both for output, the generated SELECT produces duplicate output names, and
saving the view fails with e.g. "column \"id\" specified more than once"
(Postgres) / analogous MySQL/SQLite errors. Views require UNIQUE output column
names. Fix by auto-aliasing duplicates (Navicat-style), while keeping user
control. Architecture unchanged: SQL generated correctly; identifiers
validated/quoted per dialect.

Prereq: TASK 12/15 view builder works (drag tables, draw joins, pick output
columns, generate SELECT, preview, save-as-view).

## ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local), npm run <script>, run app in dev to smoke-test
- Use chrome-devtools MCP if helpful for visual verification
- Connect to TASK 01 databases to verify generated SELECT + save
- Create/edit/read files anywhere inside the db-tool project folder

## ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; NO deletes outside project; NO rm -rf outside it
- NO host/system config changes; NO -g global installs
- Verify with disposable `_vbtest_*` views; drop them after.

## THE FIX

### 1. Detect duplicate output names when generating the SELECT
- When building the output column list, compute the effective output NAME of
  each selected column (its explicit user alias if set, else the column name).
- Detect collisions across the full output set (case-insensitively is safest,
  since many engines fold/compare case; but preserve the user's casing in the
  emitted alias).

### 2. Auto-alias colliding columns
- For any group of 2+ output columns sharing an effective name, auto-generate
  UNIQUE aliases. Preferred scheme: `<tableOrAlias>_<column>` (e.g.
  customers_id, orders_id). If that still collides (e.g. same table aliased
  twice / self-join t1,t2), fall back to `<alias>_<column>` using the node
  alias (t1_id, t2_id), and if STILL colliding append a numeric suffix
  (_2, _3).
- Only alias the ones that need it. If the user already set an explicit alias
  that is unique, respect it and don't touch it. If the user set an explicit
  alias that itself collides, flag it (see UI below) rather than silently
  overriding their choice — or auto-suffix it; pick one behavior and be
  consistent + documented.
- The generated SELECT must emit `"<table>"."<col>" AS "<alias>"` (quoted per
  dialect) so it is valid and unambiguous. Ensure the JOIN/qualified column
  references remain correct.

### 3. Reflect aliases in the UI
- In the output-columns panel, show the effective alias for each column. When
  an alias was auto-generated to resolve a duplicate, indicate it (e.g. a
  small "auto" tag or subtle styling) so the user understands why the name
  changed.
- The alias field stays editable — the user can override any auto alias; if
  they type a colliding alias, show an inline validation warning ("duplicate
  output name") and prevent save until resolved (or auto-suffix — consistent
  with the choice above).
- Live SELECT preview updates to show the aliases.

### 4. Keep it correct across engines
- Quote alias identifiers per dialect (PG/SQLite double quotes, MySQL
  backticks — reuse the existing identifier-quoting helper).
- Verify the saved VIEW stores the aliased SELECT and that opening the view's
  data shows distinct columns (customers_id, orders_id, ...).

## STEPS (autonomous, in order)
1. Add duplicate-name detection to the SELECT/output-column generation.
2. Implement the auto-alias scheme (table_col -> alias_col -> numeric suffix)
   respecting user-set unique aliases.
3. Update the output-columns UI: show effective alias, mark auto ones, inline
   warning for user-created collisions, editable overrides; live SELECT
   reflects it.
4. Verify against TASK 01 DBs (PG/MySQL/SQLite):
   - Join customers + orders; select `id` from BOTH -> SELECT auto-aliases to
     customers_id / orders_id; preview works; SAVE `_vbtest_dup` view succeeds
     (no "specified more than once" error); open view data shows both distinct
     columns.
   - Also select other same-named cols if present (e.g. created_at in both) ->
     each aliased uniquely.
   - Self-join case (t1,t2 same table): both `id` -> t1_id / t2_id.
   - User overrides an auto alias to a unique name -> respected; user types a
     colliding alias -> inline warning + save blocked (or auto-suffixed per
     chosen behavior).
   - Drop disposable views.
5. npm run typecheck + npm run build clean.
6. Leave a clean state (dev server stopped; disposable views dropped).

## OUT OF SCOPE
- SELECT * expansion aliasing, deep expression-column handling beyond simple
  cases. This task is specifically about duplicate OUTPUT NAME collisions from
  same-named columns across joined tables.

## DONE = selecting same-named columns from joined tables no longer breaks the
view: duplicates are auto-aliased uniquely (table_col, then alias_col, then
numeric), user aliases respected with collision warnings, aliases shown/
editable in the UI and reflected in the live SELECT, quoted per dialect;
saving such a view succeeds and its data shows distinct columns across
PG/MySQL/SQLite; typecheck + build clean.
