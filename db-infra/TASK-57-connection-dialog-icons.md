# TASK 57: DB Tool — New connection dialog: icon-only buttons (Test connection, Save, Cancel) (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 39/40/54.

# ROLE & CONTEXT
In the NEW CONNECTION dialog (and the Edit connection form, which is the same
form), make these three buttons ICON-ONLY with hover tooltips:
  1. Test connection  -> remove the text label, KEEP its existing icon
  2. Save             -> remove the text label, KEEP its existing icon
  3. Cancel           -> remove the text label AND pick a fitting icon
                         (it may not have one yet — use an X / x-circle,
                         consistent with the app's icon set from TASK 39)
The removed label text must appear as a hover TOOLTIP (like an HTML title/alt)
plus an aria-label, using the SAME tooltip pattern as the connection action
buttons (TASK 40) and TASK 54. Pure visual/UX; no behavior changes.

# ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local), npm run <script>, run app in dev
- Use chrome-devtools MCP to verify
- Create/edit/read files anywhere inside the db-tool project folder

# ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; don't touch containers/data
- NO host/system config changes; NO -g installs
- Do NOT change the icons Test connection and Save already have.
- Do NOT change any button behavior (Test still tests, Save still saves/updates
  the same entry, Cancel still closes without saving).
- Only these three buttons in this dialog — don't touch other buttons.

# REQUIREMENTS
1. Test connection: remove visible text, keep the existing icon, add tooltip
   "Test connection" + aria-label.
2. Save: remove visible text, keep the existing icon, add tooltip "Save" +
   aria-label.
3. Cancel: remove visible text, assign a fitting icon from the app's existing
   icon set (X / x-circle is the conventional choice), add tooltip "Cancel" +
   aria-label.
4. Keep the buttons' relative order and any primary/secondary styling
   distinction (e.g. Save as primary) so the dialog still reads clearly.
5. Comfortable hit areas — don't shrink to tiny targets; tidy spacing after the
   labels are gone (no leftover gaps).
6. Keep any disabled/loading states (e.g. Test connection showing a spinner or
   a result indicator) working in icon-only form.
7. Apply to BOTH the New connection and Edit connection forms if they share the
   component (they should).

# STEPS (autonomous, in order)
1. Locate the connection form's button row; remove the text nodes; keep
   existing icons for Test/Save; add an icon for Cancel; add tooltips +
   aria-labels.
2. Tidy spacing/alignment; preserve primary/secondary styling, disabled and
   loading/result states.
3. Verify WITH chrome-devtools MCP:
   - Open New connection: the three buttons show icons only; hovering each
     shows the correct text.
   - Test connection still tests (success and failure states visible);
     Save still creates/updates the connection (no duplicate on edit);
     Cancel still closes without saving.
   - Edit connection form shows the same treatment.
   - Dialog looks tidy; hit areas comfortable; no other buttons changed.
4. npm run typecheck + npm run build clean.
5. Leave a clean state (dev server stopped).

# DONE = in the New/Edit connection dialog, Test connection and Save show only
their EXISTING icons and Cancel shows a newly assigned fitting icon, all three
with hover tooltips + aria-labels matching the TASK 40/54 pattern, with
behavior, primary/secondary styling, disabled/loading states and hit areas
intact and spacing tidied, verified via the MCP; typecheck + build clean.
