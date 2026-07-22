# TASK 41: DB Tool — About dialog (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 39.

# ROLE & CONTEXT
Add an ABOUT button (with an "about"/info icon) in a fitting place, that opens a
small modal window showing the product/author info in clean, professional
English, laid out like a standard About dialog. Visual/UX task; minor wiring.
Use chrome-devtools MCP to verify.

Prereq: TASK 39 (app-wide icon set). Reuse lucide-react (an Info / CircleHelp /
BadgeInfo icon) + the app's modal styling.

# ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local), npm run <script>, run app in dev
- Use chrome-devtools MCP to view the About dialog + confirm
- Create/edit/read files anywhere inside the db-tool project folder

# ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; NO deletes outside project; NO rm -rf outside it
- NO host/system config changes; NO -g global installs

# FEATURE
1. An ABOUT entry point with an info icon, placed where it fits best UX-wise —
   e.g. a top toolbar/menu corner, a "?" / settings area, or an app menu.
   Prefer a subtle, conventional spot (top-right corner or a Help/menu area).
   Icon-only with a tooltip "About", or a small "About" menu item — your call,
   keep it unobtrusive.
2. Clicking it opens a small MODAL (About window) with:
   - App name/title (the product's name, e.g. "DB Tool" or the configured
     productName) + version (pull from package.json version).
   - A clean, standard About layout in ENGLISH with this content, organized
     sensibly (see exact copy below).
   - A close button (× / "Close"); Esc closes; click-away closes.
   - The website and email rendered as clickable links (website opens in the
     external browser via Electron shell.openExternal; email as a mailto: that
     opens the default mail client — use shell.openExternal for both; do NOT
     navigate the app window to them).
3. Styling: consistent with the app (theme tokens), centered, compact, tidy;
   optionally the app icon/logo at the top.

# EXACT ABOUT CONTENT (use this English copy, laid out cleanly)
Title line: the product name + version, e.g.  "DB Tool  v0.1.0"

Body (organized, professional About wording):

  DB Tool is freeware.

  © LLC Codemake
  Website:  https://www.codemake.com

  Author:   Archil Odishelidze
  Contact:  archil.odishelidze@gmail.com

Present it neatly — e.g. a short "This software is freeware." line, then a
"Company" section (LLC Codemake + website link), then an "Author" section
(Archil Odishelidze + email link). You may phrase the labels naturally
(Company / Developed by / Contact) as long as it reads like a normal About box
and contains exactly: freeware statement, LLC Codemake, https://www.codemake.com,
author Archil Odishelidze, email archil.odishelidze@gmail.com. English only.

# STEPS (autonomous, in order)
1. Add the About entry point (info icon + tooltip) in a fitting, unobtrusive
   spot.
2. Build the About modal with the content above; version from package.json;
   website + email as external links via shell.openExternal (wire through IPC/
   preload since renderer shouldn't call shell directly — expose a safe
   "openExternal(url)" in the preload API, validate it's http(s)/mailto).
3. Close via ×/Close/Esc/click-away; style with theme tokens.
4. Verify WITH chrome-devtools MCP:
   - The About icon/button appears in its spot with a tooltip.
   - Clicking opens the modal with the correct content (freeware, LLC Codemake,
     website, author, email) and version.
   - Clicking the website opens the external browser; the email opens the mail
     client (or at least shell.openExternal is invoked) — NOT navigating the
     app window.
   - Close works (×, Esc, click-away). Looks tidy + on-theme.
5. npm run typecheck + npm run build clean.
6. Leave a clean state (dev server stopped).

# SECURITY NOTE
Renderer must NOT call Electron shell directly. Add a whitelisted preload
method openExternal(url) that validates the URL scheme (http/https/mailto)
before calling shell.openExternal in main. Never pass arbitrary URLs.

# OUT OF SCOPE
- Auto-update checks, license text viewer, credits/third-party list (could be a
  later "Licenses" section). Just the About dialog.

# DONE = an unobtrusive About entry point (info icon + tooltip) opens a clean,
professional English About modal showing the app name + version, a freeware
statement, © LLC Codemake with https://www.codemake.com, and author Archil
Odishelidze with archil.odishelidze@gmail.com, website/email as external links
via a whitelisted openExternal (not navigating the app), closable via ×/Esc/
click-away, on-theme; verified via the MCP; typecheck + build clean.
