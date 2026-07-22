# TASK 23: DB Tool — Fix schema-aware autocomplete (tables + columns not suggested) (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 04.

# ROLE & CONTEXT
The SQL editor autocompletes KEYWORDS (SELECT/FROM/WHERE…) but does NOT
suggest TABLE names or COLUMN names from the connected database. The
schema-aware part built in TASK 04 isn't reaching the completion popup. Find
the real break in the chain and fix it so table + column suggestions work.
Use chrome-devtools MCP to actually observe the popup, not guess.
Architecture unchanged: schema fetched in main, passed to renderer via IPC.

Prereq: TASK 04 (getSchemaCatalog IPC + CodeMirror 6 sql() completion). The
keyword completion works; the catalog-driven completion doesn't.

# ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local), npm run <script>, run app in dev to smoke-test
- Use chrome-devtools MCP to observe the editor + completion popup + console
- Add temporary debug logging while diagnosing; remove before finishing
- Connect to TASK 01 databases to confirm the catalog loads
- Create/edit/read files anywhere inside the db-tool project folder

# ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; NO deletes outside project; NO rm -rf outside it
- NO host/system config changes; NO -g global installs

# DIAGNOSE THE CHAIN (check each link IN ORDER, with evidence — don't guess)
1. CATALOG FETCH: Is getSchemaCatalog actually called when a connection
   becomes active, and does it RETURN non-empty tables+columns? Log the result
   in main and in the renderer. If empty/never-called -> fix the trigger
   (fetch on connect + on active-tab connection change) or the query.
2. CATALOG SHAPE: Does the renderer receive { tables: [{ schema, name,
   columns:[{name,type}] }] } in the shape the completion code expects? A
   shape mismatch (e.g. columns nested differently) means the completion
   source silently finds nothing. Log what the renderer holds.
3. COMPLETION SOURCE WIRING: In CodeMirror 6, is the schema actually passed
   into the sql() extension? The idiomatic ways:
   - sql({ dialect, schema: { tableName: ['col1','col2', ...], ... },
           tables: [...] })  — the `schema` object maps table -> columns and
     drives table+column completion; OR
   - a custom completionSource added via the language's `override`.
   Verify the schema object is BUILT from the catalog and PASSED on each
   render/reconfig. A common bug: sql() is created ONCE with an empty schema
   and never reconfigured when the catalog arrives, so only keywords complete.
   -> Reconfigure the editor's language extension (via a compartment) when the
   catalog loads/changes, so the schema is present.
4. RECONFIGURE ON CHANGE: If using a CodeMirror Compartment for the SQL
   language, ensure you dispatch an effect to reconfigure it once the catalog
   is available (and when the active connection changes). If there's no
   compartment, add one; setting state once at mount won't pick up async
   catalog.
5. IDENTIFIER MATCHING: Confirm completion triggers in the right positions
   (after FROM/JOIN for tables; after SELECT/WHERE/ON and after `alias.` for
   columns) and that case / quoting doesn't filter everything out. Alias-based
   column completion (from the query's FROM) is a plus but first make plain
   table + column names work.

# STEPS (autonomous, in order)
1. With chrome-devtools MCP, open the renderer, connect (or use a dev path so
   the catalog loads), and REPRODUCE: type `SELECT * FROM ` and observe that
   no table names appear; type `SELECT ` / `customers.` and observe no columns.
   Capture console + the completion state.
2. Add temporary logging along the chain (catalog fetch result, renderer-held
   schema, the object passed to sql(), reconfigure effects firing) to find the
   exact broken link from the list above.
3. Fix it — most likely: build the sql() `schema` object from the catalog and
   RECONFIGURE the language via a Compartment when the catalog loads / active
   connection changes.
4. Remove temporary logging.
5. Verify WITH the MCP + against TASK 01 DBs (PG/MySQL/SQLite):
   - `SELECT * FROM ` -> customers, orders, order_items appear.
   - `SELECT ` then `customers.` -> that table's columns appear with types.
   - After `FROM customers c` then `c.` -> customers columns (alias) if alias
     support is in; if alias support isn't there yet, at least bare table +
     `tablename.` column completion must work.
   - Switch the active connection to another engine -> suggestions reflect
     THAT database's tables/columns (catalog reconfigured).
   - Keyword completion still works alongside.
6. npm run typecheck + npm run build clean.
7. Leave a clean state (dev server stopped; debug logging removed).

# REPORT
State which link in the chain was actually broken (as OBSERVED), what changed,
and the MCP-observed result (tables + columns now suggest). Ask the user to
confirm in the real app.

# OUT OF SCOPE
- Fancy ranking, cross-schema qualified completion beyond the current DB,
  snippet templates. Just make table + column suggestions reliably appear.

# DONE = typing SQL suggests real TABLE names (after FROM/JOIN) and COLUMN
names (after SELECT/WHERE and `table.`) from the active connection's schema,
alongside keywords, correctly reconfiguring when the connection changes, across
PG/MySQL/SQLite; root cause identified via observation (not guessed); temp
logging removed; typecheck + build clean.
