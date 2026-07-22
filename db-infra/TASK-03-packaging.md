# TASK 03: DB Tool — Packaging to a distributable Windows .exe (AUTONOMOUS)
# Windows 11 / portable Node in project (db-tool/.node). Depends on TASK 02 app.

## ROLE & CONTEXT
Turn the working Electron app (built in TASK 02) into a distributable
Windows application: an installer (.exe Setup) and a portable .exe. The end
user must NOT need Node.js or anything preinstalled — the Electron runtime
is bundled inside the package. The one real risk is the native module
better-sqlite3, which must be rebuilt against Electron's ABI so SQLite works
in the packaged app on a clean machine.

Prereq: TASK 02 is complete — db-tool/ builds (`npm run build`), typechecks
clean, and the app connects to PostgreSQL/MySQL/SQLite in dev. Portable Node
lives at db-tool/.node (invoked by absolute path; nothing on system PATH).

## ✅ AUTONOMOUS PERMISSIONS
- `npm install` of project-local build/packaging deps (electron-builder,
  @electron/rebuild or electron-builder's built-in rebuild, etc.)
- `npm run <script>` for build/package/rebuild
- Rebuild native modules for Electron's ABI (project-local)
- Run the PACKAGED app to smoke-test it; read logs/console
- Create/edit/read files anywhere inside the db-tool project folder

## ⛔ GUARDRAILS (ask user first)
- NO `docker system/volume/image prune`, NO `docker compose down -v`
- NO deletes outside the project folder; NO `rm -rf` outside it
- NO host/system config changes: system PATH, registry, .wslconfig, WSL,
  Docker Desktop settings, global npm, machine-wide installs
- NO `-g` global installs — keep everything project-local
- NO code signing setup that requires purchasing/registering a certificate
  or touching the machine's cert store. If Windows SmartScreen / signing
  comes up, produce an UNSIGNED build and note in the README how the user
  can add a real cert later. Do not attempt to self-register certs system-wide.
- If a destructive/system action seems needed, STOP and ask with one line why.

## GOAL
Produce, from the existing app:
1. A Windows NSIS installer: `DBTool-Setup-<version>.exe`
2. A portable single-exe: `DBTool-<version>-portable.exe` (or the
   electron-builder "portable" target)
Both must run on a clean Windows machine with NO Node.js, and SQLite (native
better-sqlite3) must work in the packaged build.

## STEPS (autonomous, in order)
1. Add electron-builder as a project-local dev dependency. Configure it via
   an `electron-builder.yml` (or the "build" key in package.json) — pick one
   and be consistent.
2. Configure product metadata:
   - productName: "DB Tool" (or ask the user for a preferred name — if no
     answer available, use "DB Tool" and note it's changeable)
   - appId: e.g. com.dbtool.app
   - version: from package.json
   - a placeholder app icon (256x256 .ico); if none exists, generate/convert
     a simple placeholder and wire it in. Note in README how to replace it.
3. Windows target config:
   - targets: nsis (installer) AND portable
   - nsis: oneClick false, allowToChangeInstallationDirectory true,
     perMachine false (per-user install, no admin needed),
     createDesktopShortcut true, createStartMenuShortcut true
   - output dir: db-tool/release/ (add to .gitignore)
4. NATIVE MODULE — critical:
   - Ensure better-sqlite3 is rebuilt for Electron's ABI during packaging.
     Use electron-builder's native rebuild (it runs @electron/rebuild) and/or
     an explicit rebuild step. Make sure better-sqlite3 is NOT marked as
     external/ignored such that the .node binary is missing from the package.
   - Verify the packaged app's resources actually contain the compiled
     better-sqlite3 .node for the correct Electron ABI.
   - Confirm asarUnpack (or equivalent) is set so the native .node is
     loadable at runtime (native binaries generally must be unpacked from
     asar). Configure this correctly.
5. Ensure pg and mysql2 (pure-JS or with their own natives handled) are
   bundled correctly too. Whitelist production dependencies so they ship.
6. BUILD & PACKAGE:
   - `npm run build` then the electron-builder package command
     (add npm scripts: "package", "package:dir" for a fast unpacked test).
7. SMOKE-TEST THE PACKAGED APP (not dev):
   - First do a `--dir` (unpacked) build for speed and launch the packaged
     binary from release/win-unpacked. Verify it boots, preload loads,
     window.dbApi is exposed, no console errors.
   - Verify SQLite specifically works in the packaged build (this proves the
     native rebuild succeeded): connect to a pre-seeded .sqlite file and read
     rows. If db-infra seed isn't handy, create a small seeded .sqlite in the
     project and point a test connection at it.
   - Verify Postgres + MySQL connections still work from the packaged app
     (containers from TASK 01 should be up; if not, note it and still confirm
     the app launches and the connection dialog works).
   - Then produce the full installer + portable targets.
8. Leave a clean state: close the packaged app / any dev servers.

## DELIVERABLES
- electron-builder config (yml or package.json "build")
- npm scripts: build, package, package:dir
- Placeholder .ico wired in (replaceable)
- release/ artifacts: DBTool-Setup-<version>.exe and the portable .exe
- .gitignore updated (release/, *.exe artifacts, .node native build outputs)
- README section "Packaging & Distribution":
  - how to build the installer + portable exe (exact commands, incl. the
    portable-Node PATH line the user needs per shell)
  - confirmation that end users need NO Node.js
  - how to replace the app icon and product name
  - the native-module (better-sqlite3 / asarUnpack) notes so future builds
    don't regress
  - a note on unsigned builds + Windows SmartScreen, and where code signing
    would slot in later

## OUT OF SCOPE
- Real code signing / cert purchase, auto-update server, macOS/Linux
  targets, CI pipelines. Windows unsigned installer + portable only.

## DONE = release/ contains a working installer AND a portable .exe; the
PACKAGED app has been launched and verified to boot with SQLite (native)
working; README documents the build process, the no-Node-for-users fact,
icon/name replacement, and the native-module notes.
