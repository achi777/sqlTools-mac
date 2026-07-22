# TASK 37: DB Tool — Fix funnel filter popover overflow (value input exceeds the box) (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 35.

# ROLE & CONTEXT
In the funnel filter popover (TASK 35), when adding a condition, the VALUE
input field overflows / exceeds the popover's frame (the input's box spills
outside the container). Fix the layout so condition rows (column + operator +
value + remove) fit cleanly within the popover at all times. Pure visual/layout
fix; no filtering logic changes. Use chrome-devtools MCP to see + confirm.

Prereq: TASK 35 (funnel popover with condition rows).

# ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local), npm run <script>, run app in dev
- Use chrome-devtools MCP to view the popover + measure overflow + confirm fix
- Create/edit/read files anywhere inside the db-tool project folder

# ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; NO deletes outside project; NO rm -rf outside it
- NO host/system config changes; NO -g global installs
- Visual/CSS/layout only.

# LIKELY ROOT CAUSES (check with the MCP, fix the real one)
- The condition row uses fixed widths that sum to more than the popover width,
  pushing the value input past the edge. -> Use a responsive layout (flexbox/
  grid) where the value input flexes to fill remaining space (min-width: 0 on
  the flex child so it can shrink; the classic flexbox overflow fix).
- Missing box-sizing: border-box, so padding/border adds to width and overflows.
- The popover has no max-width / the row has no wrapping or min-width:0, so long
  inputs or content force horizontal overflow.
- For multi-value operators (BETWEEN = two inputs, IN = list) the row gets even
  wider — ensure those wrap or shrink gracefully.

# REQUIREMENTS
1. Condition rows always fit within the popover; the value input never spills
   outside the frame. The value input should flex to the available width and
   shrink when needed (min-width: 0).
2. box-sizing: border-box on inputs/rows; the popover has a sensible max-width
   and the content lays out within it.
3. Multi-input operators (BETWEEN, IN) fit too — either the two inputs share
   the row width or wrap to a second line cleanly.
4. If many conditions are added, the popover body scrolls VERTICALLY (max-
   height + overflow-y: auto), never overflowing horizontally.
5. Looks aligned and tidy: column dropdown, operator dropdown, value input(s),
   and the remove (×) button line up across rows.

# STEPS (autonomous, in order)
1. With chrome-devtools MCP, open the funnel popover, add a condition, and
   OBSERVE the overflow (screenshot + inspect the row's computed layout) to
   confirm the actual cause.
2. Fix the layout (flex/grid with min-width:0 on the value input, box-sizing,
   popover max-width, vertical scroll for many rows, graceful multi-input
   wrapping).
3. Re-verify WITH the MCP:
   - Single condition: value input sits fully inside the popover.
   - Operator = BETWEEN (two inputs) and IN (list): fit/wrap cleanly.
   - Add 6-8 conditions: popover scrolls vertically, no horizontal overflow.
   - A long column name / long typed value doesn't break the frame.
   - Rows stay aligned; remove (×) button reachable.
   - Filtering still applies correctly (no logic regression).
4. npm run typecheck + npm run build clean.
5. Leave a clean state (dev server stopped).

# VERIFICATION HONESTY
Visual fix — confirm via MCP screenshots that nothing spills outside the
popover in the tested cases, then ask the user to confirm in the real app and
tweak spacing to taste.

# OUT OF SCOPE
- Redesigning the popover, new operators. Just make it fit.

# DONE = in the funnel filter popover, condition rows (incl. BETWEEN/IN multi-
inputs and long values) always fit within the frame with the value input
flexing/shrinking (min-width:0, border-box, max-width, vertical scroll for many
rows), aligned and tidy, no horizontal overflow, verified via the MCP with no
filtering regression; typecheck + build clean.
