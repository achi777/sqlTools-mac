# TASK 32: DB Tool — Tree icons + visual polish (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 04/11/25/26/27.

# ROLE & CONTEXT
Polish the object tree with proper ICONS per object type and general visual
refinement (spacing, hover/selected states, consistency), so the tree reads
clearly at a glance like a mature DB tool. This is a VISUAL task — no DB logic
changes. Use chrome-devtools MCP to actually see results; the final "does it
look good" is a human call the user will make.

Prereq: the tree already lists connections, databases/schemas, and object
categories: Tables, Views, Functions, Procedures, Sequences, Triggers, Indexes
(+ columns with PK/FK from earlier tasks). This task styles them.

# ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local; an icon set like lucide-react is fine — likely
  already available), npm run <script>, run app in dev
- Use chrome-devtools MCP to view the tree + iterate on the look
- Create/edit/read files anywhere inside the db-tool project folder

# ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; NO deletes outside project; NO rm -rf outside it
- NO host/system config changes; NO -g global installs
- Do not change DB queries/logic — visual/markup/CSS only (plus wiring icons
  to existing node types). If a node type isn't exposed to the UI, don't
  invent data — just style what exists.

# ICONS (per node type — distinct, consistent set)
Use ONE coherent icon set (e.g. lucide-react) and assign clear, distinct icons:
- Connection (per engine: a subtle PG / MySQL / SQLite distinction if easy —
  e.g. a colored dot or small badge; otherwise one "database server" icon)
- Database / Schema
- Category folders: Tables, Views, Functions, Procedures, Sequences, Triggers,
  Indexes (each a distinct icon)
- Individual objects: table, view (distinct from table), function, procedure,
  sequence, trigger, index
- Columns: a generic column icon PLUS markers for PRIMARY KEY (key icon) and
  FOREIGN KEY (link icon), and a subtle indicator for NOT NULL / nullable if
  it fits without clutter
- Connection state: a small connected/disconnected indicator on the connection
  node (e.g. green/grey dot)
Icons must be legible at small sizes and consistent in weight/size.

# VISUAL POLISH
- Consistent row height, padding, indentation per depth; clear expand/collapse
  chevrons.
- Hover state (subtle background) and selected state (clear but not garish);
  keyboard focus visible.
- Truncate long names with ellipsis + tooltip (full name on hover).
- Alignment: icon + label + optional right-side hint (e.g. row count on a
  table, "unique" on an index) aligned cleanly.
- Use the app's existing color tokens/theme variables (don't hardcode colors
  that would break a future dark theme — centralize in CSS vars/tokens).
- Density: comfortable but compact; a big schema should still scan well.
- Loading state on lazy-loaded categories (a subtle spinner/placeholder while
  children load).
- Empty state (e.g. "No views") shown subtly rather than a blank node.

# STEPS (autonomous, in order)
1. Add/confirm an icon set (project-local). Map each node type -> icon in one
   central place (a typed icon map) so it's consistent and easy to change.
2. Apply icons across the tree (connection/db/schema/categories/objects/
   columns + PK/FK markers + connection-state indicator).
3. Refine spacing/hover/selected/focus/truncation/alignment using existing
   theme tokens (centralized, dark-theme-friendly).
4. Add loading + empty states for lazy categories.
5. Verify WITH chrome-devtools MCP (screenshots) across PG/MySQL/SQLite:
   - Each object type shows its distinct icon; PK/FK column markers appear;
     connection state indicator reflects connected/disconnected.
   - Hover/selected/focus states look clean; long names truncate + tooltip;
     alignment is consistent; lazy-load shows a loading state.
   - Nothing regressed functionally (expand/collapse, context menus, clicking
     a table still opens it, etc.).
6. npm run typecheck + npm run build clean.
7. Leave a clean state (dev server stopped).

# VERIFICATION HONESTY
This is visual. Do the MCP screenshots + functional non-regression checks,
then TELL THE USER to eyeball the tree and say what to adjust (icon choices,
density, colors). Offer quick tweaks based on their feedback — icon/spacing
taste is theirs to set.

# OUT OF SCOPE
- Full dark/light theme switching (separate task; but DO use theme tokens so
  it's ready), drag-drop reordering, tree search redesign. Note as backlog.

# DONE = the object tree has a coherent, distinct icon per node type
(connections w/ engine + state indicator, databases/schemas, all category
folders, individual objects, columns with PK/FK markers), with refined
spacing/hover/selected/focus/truncation/alignment using centralized theme
tokens, plus loading/empty states, verified visually via the MCP across
PG/MySQL/SQLite with no functional regression; typecheck + build clean; a
hand-eyeball note given to the user for taste tweaks.
