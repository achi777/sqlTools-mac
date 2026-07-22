# TASK 24: DB Tool — Column autocomplete in the Custom WHERE filter input (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 21 + TASK 23.

# ROLE & CONTEXT
The Custom WHERE filter input (TASK 21) does not autocomplete COLUMN names of
the current table. The main SQL editor's schema-aware autocomplete was fixed
in TASK 23; apply the same capability to the Custom WHERE field, adapted to
its context. Use chrome-devtools MCP to observe the popup, don't guess.
Architecture unchanged.

Prereq: TASK 21 (Custom WHERE mode with a CodeMirror SQL input), TASK 23
(schema-aware autocomplete fixed for the main editor; catalog reaches the
completion source via a reconfigured schema).

# ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local), npm run <script>, run app in dev to smoke-test
- Use chrome-devtools MCP to observe the Custom WHERE input's completion popup
- Add temporary debug logging while diagnosing; remove before finishing
- Connect to TASK 01 databases to confirm the catalog/columns load
- Create/edit/read files anywhere inside the db-tool project folder

# ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; NO deletes outside project; NO rm -rf outside it
- NO host/system config changes; NO -g global installs

# KEY DIFFERENCE FROM THE MAIN EDITOR (important)
The Custom WHERE input is a WHERE-PREDICATE ONLY (e.g. `amount > 100 AND
status = 'active'`). There is NO `FROM <table>` in the text, so completion
must be seeded with the CURRENT TABLE's columns directly (the table the grid
is browsing), rather than inferred from a FROM clause. So:
- Provide the current table's columns (name + type, from the catalog for the
  active connection + the browsed table) to the Custom WHERE editor's
  completion source explicitly.
- Suggest those columns anywhere an identifier is expected in the predicate
  (start of input, after AND/OR, after an operator's left side, etc.).
- Keep SQL keyword/operator suggestions too (AND, OR, LIKE, IN, BETWEEN,
  IS NULL, etc.) but the columns are the priority.

# DIAGNOSE (with the MCP; check in order)
1. SHARED vs SEPARATE editor config: Does the Custom WHERE input reuse the
   same completion setup as the main editor, or its own CodeMirror instance?
   - If it can reuse a shared, parameterized SQL-completion factory (given a
     schema/columns), refactor so BOTH the main editor and Custom WHERE use it,
     so this doesn't drift again.
2. IS THE SCHEMA/COLUMNS PASSED? Log what columns (if any) the Custom WHERE
   editor is configured with. Likely it was created with no schema, or with a
   schema keyed by table but no FROM to resolve — hence nothing.
3. RECONFIGURE ON CONTEXT CHANGE: The current table changes as the user opens
   different tables / switches connections. Use a Compartment to reconfigure
   the Custom WHERE editor's completion with the new table's columns whenever
   the browsed table or active connection changes (same pattern as TASK 23).
4. TRIGGERING: ensure completion opens on typing an identifier char (and/or
   Ctrl+Space) at predicate positions; make sure case/quoting doesn't filter
   everything out.

# STEPS (autonomous, in order)
1. Identify the Custom WHERE editor's completion config; prefer refactoring to
   a SHARED completion factory used by both editors, parameterized by the
   columns/schema to offer.
2. Feed the CURRENT browsed table's columns (name+type) into the Custom WHERE
   completion; reconfigure via a Compartment when the table/connection changes.
3. Keep operator/keyword suggestions; prioritize columns.
4. Remove temporary logging.
5. Verify WITH the MCP + against TASK 01 DBs (PG/MySQL/SQLite):
   - Open customers; switch filter mode to Custom WHERE; start typing -> the
     customers columns (id, name, …) are suggested with types.
   - After `AND ` -> columns suggested again; after a column + operator, value
     is free text (no bogus suggestions breaking it).
   - Open a different table (orders) -> Custom WHERE now suggests ORDERS'
     columns (reconfigured), not the old table's.
   - Switch connection/engine -> suggestions reflect the right DB's table.
   - Applying the typed predicate still filters correctly (didn't regress
     TASK 21), and keyword suggestions (AND/OR/LIKE/IN/BETWEEN/IS NULL) work.
6. npm run typecheck + npm run build clean.
7. Leave a clean state (dev server stopped; debug logging removed).

# REPORT
State whether the fix was a shared-factory refactor or a local wiring fix,
what was actually missing (observed), and the MCP-observed result (current
table's columns now autocomplete in Custom WHERE, and update when the table
changes).

# OUT OF SCOPE
- Multi-table/JOIN column completion in Custom WHERE (it filters ONE browsed
  table), value autocompletion, cross-schema qualification. Note as backlog.

# DONE = the Custom WHERE filter input autocompletes the CURRENT table's column
names (with types) at predicate positions, reconfiguring when the browsed table
or active connection changes, alongside operator/keyword suggestions, across
PG/MySQL/SQLite, without regressing TASK 21 filtering; ideally via a shared
completion factory reused with the main editor; observed via the MCP; temp
logging removed; typecheck + build clean.
