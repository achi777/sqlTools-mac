# TASK 21: DB Tool — Custom WHERE filter mode (manual, advanced) (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 08/09/10.

# ROLE & CONTEXT
Add a third filter mode, "Custom WHERE", where advanced users type a raw WHERE
condition themselves for full flexibility. It coexists with Quick filter
(TASK 09) and the Visual Filter Builder (TASK 10) as THREE SELECTABLE MODES,
of which exactly ONE is active at a time (user chooses via a mode selector).
The active mode drives the same server-side paginated table browsing (WHERE +
LIMIT/OFFSET + filtered COUNT). Architecture unchanged.

Prereq: TASK 08 (paginated getTablePage with server-side WHERE + count),
TASK 09 (quick filters), TASK 10 (visual builder). Reuse the getTablePage
plumbing; add a raw-where option to it.

# ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local), npm run <script>, run app in dev to smoke-test
- Connect to TASK 01 databases to verify filtering + counts + errors
- Create/edit/read files anywhere inside the db-tool project folder

# ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; NO deletes outside project; NO rm -rf outside it
- NO host/system config changes; NO -g global installs
- Verify on seeded tables (read-only) or a disposable `_cwtest_` table; clean
  up.

# SECURITY MODEL (important — differs from Quick/Builder)
Quick/Builder send STRUCTURED filters (fully parameterized). Custom WHERE is
raw user text, so it cannot be fully parameterized. Contain the risk:
1. The custom text is used ONLY as the WHERE predicate of a SELECT for
   READ-ONLY table browsing — inject it as:  SELECT ... FROM <table> WHERE
   (<userText>) ORDER BY <pk> LIMIT ... OFFSET ...  and the same for the
   COUNT(*). The user text goes ONLY in the parenthesized predicate position.
2. Do NOT blindly execute arbitrary SQL. Reject//guard against the text
   containing statement terminators or piggy-backed statements: disallow ';'
   (except inside quoted strings), and reject obvious multi-statement / DDL/DML
   keywords appearing at the top level (INSERT/UPDATE/DELETE/DROP/ALTER/
   TRUNCATE/GRANT/;/-- comment-to-EOL that could truncate). A light lexer that
   ignores content inside quotes is enough; if in doubt, refuse with a clear
   message rather than run it. (This is defense-in-depth for a local dev tool,
   not a claim of perfect sandboxing — state that in a code comment.)
3. Wrap the predicate in parentheses so operator precedence can't break out.
4. Since browsing is read-only SELECT, a malformed predicate should surface as
   a query error to the user, not damage anything. Never use Custom WHERE text
   in INSERT/UPDATE/DELETE paths.
5. Show a small "advanced" note near the input explaining it's raw SQL for the
   active connection's dialect and only filters the current table view.

# FEATURES
1. FILTER MODE SELECTOR on the table view toolbar: [ Quick | Builder | Custom
   WHERE ]. Exactly one active. Switching modes applies that mode's filter
   (and ignores the others' — they're retained in their own UI state so
   switching back restores what the user had, but only the active one is
   applied). A single "Clear" clears the active mode. Indicate which mode is
   active + whether it currently has an applied filter.
2. CUSTOM WHERE INPUT: a text box (ideally a small CodeMirror SQL field with
   dialect highlighting + basic autocomplete of the current table's columns
   from the catalog — reuse TASK 04 catalog). Apply on a button / Ctrl+Enter.
   The typed text is the WHERE predicate only (no "WHERE" keyword needed;
   accept it if present and strip it).
3. SERVER-SIDE integration: extend getTablePage to accept { mode, rawWhere? }
   in addition to the existing quick/builder specs. When mode = custom, build
   the page + COUNT queries with the guarded predicate. Filtered "X-Y of N"
   reflects it; paging stays deterministic (PK order).
4. ERRORS: a bad predicate (syntax error, unknown column) shows the engine's
   error message clearly near the input; the grid keeps the previous good
   state or empties gracefully — no crash.
5. DIALECT: the text is passed through for the active engine (PG/MySQL/
   SQLite); note that syntax is engine-specific (e.g. ILIKE only PG). Don't
   try to translate; just run it against the active connection and surface
   errors.

# STEPS (autonomous, in order)
1. Add the mode selector to the table toolbar; wire mode state; retain each
   mode's own UI state; only the active mode's filter is sent.
2. Build the Custom WHERE input (CodeMirror SQL + column autocomplete) with
   apply/clear.
3. Extend getTablePage IPC + main to accept a guarded rawWhere for mode=custom
   (predicate-position injection + the light lexer guard for ';'/multi-stmt/
   DDL-DML). Apply to page AND count.
4. Verify against TASK 01 DBs (PG/MySQL/SQLite):
   - Custom WHERE like  amount > 100 AND status = 'active'  -> correct rows +
     filtered count; paging deterministic.
   - A value with a quote inside the predicate ( name = 'O''Brien' ) works;
     confirm it's treated as a string literal, not injection.
   - A malicious-ish input ( 1=1); DROP TABLE customers;--  ) is REFUSED by
     the guard (no execution) with a clear message; customers table intact.
   - A syntax error ( amoun > 100 ) surfaces the engine error near the input,
     grid doesn't crash.
   - Switch modes Quick <-> Builder <-> Custom: only the active applies; each
     mode's UI state is retained on switch-back; Clear clears the active one.
5. npm run typecheck + npm run build clean.
6. Leave a clean state (dev server stopped; disposable objects removed;
   verify customers/orders/order_items untouched).

# OUT OF SCOPE (later)
- Saved/named filters (next candidate), combining modes together (chosen: one
  active at a time), full SQL sandboxing/permissions. Note as backlog.

# DONE = a filter-mode selector lets the user pick Quick / Builder / Custom
WHERE with exactly one active; Custom WHERE accepts a raw predicate (SQL field
with column autocomplete) that is injected ONLY in the WHERE position of the
read-only paginated browse (page + filtered count), guarded against
';'/multi-statement/DDL-DML so it can't run arbitrary SQL, with engine errors
surfaced and no crash; works across PG/MySQL/SQLite; verified incl. a quoted
literal, a refused injection attempt (table intact), and a syntax error;
typecheck + build clean.
