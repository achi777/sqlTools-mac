# TASK 54: DB Tool — Remove text labels from five buttons (keep existing icons + add tooltips) (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 39/40.

# ROLE & CONTEXT
Make these five buttons ICON-ONLY by removing ONLY their visible text label.
KEEP THE ICONS THEY ALREADY HAVE — do not change, replace, or "improve" any
icon. The removed label text must appear as a hover TOOLTIP instead (like an
HTML alt/title), matching the tooltip pattern already used for the CONNECTIONS
action buttons (TASK 40).

Buttons to change (ONLY these five):
  1. Apply changes
  2. Discard
  3. Delete selected
  4. Builder
  5. Custom WHERE

# ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local), npm run <script>, run app in dev
- Use chrome-devtools MCP to verify
- Create/edit/read files anywhere inside the db-tool project folder

# ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; don't touch containers/data
- NO host/system config changes; NO -g installs
- Do NOT change any icon (keep exactly what each button already uses).
- Do NOT change button behavior; do NOT remove existing confirmation dialogs.
- Do NOT touch any other buttons — only the five listed above.

# REQUIREMENTS
1. Remove the visible text label from each of the five buttons; keep the icon
   exactly as-is.
2. Add a hover tooltip showing the original label text ("Apply changes",
   "Discard", "Delete selected", "Builder", "Custom WHERE"), using the SAME
   tooltip mechanism already used for the connection action buttons (TASK 40).
   Also set an aria-label with the same text for accessibility.
3. Keep existing confirmations for the destructive ones (Delete selected,
   Discard) — unchanged.
4. Keep any active-state indicator (e.g. Builder / Custom WHERE highlighting
   when a filter is active) visible in the icon-only form.
5. Fix spacing/alignment after the labels are gone (no leftover gaps), and keep
   a comfortable click target (don't shrink the buttons to tiny hit areas).

# STEPS (autonomous, in order)
1. Locate the five buttons; remove only their text nodes; add tooltip +
   aria-label with the original text.
2. Tidy toolbar spacing/alignment; preserve active-state indicators.
3. Verify WITH chrome-devtools MCP:
   - Each of the five shows only its ORIGINAL icon (unchanged) and no text.
   - Hovering shows the correct label text.
   - Apply / Discard / Delete selected still work, with confirmations intact.
   - Builder and Custom WHERE still open their UIs and show active state.
   - No other buttons were modified; toolbar looks tidy; hit areas comfortable.
4. npm run typecheck + npm run build clean.
5. Leave a clean state (dev server stopped).

# DONE = Apply changes, Discard, Delete selected, Builder, and Custom WHERE show
only their EXISTING (unchanged) icons with the label text moved to a hover
tooltip + aria-label, confirmations and active-state indicators intact, spacing
tidied, no other buttons or behavior touched, verified via the MCP; typecheck +
build clean.
