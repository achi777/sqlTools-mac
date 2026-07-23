# TASK 62: DB Tool — Store connection passwords securely (OS keychain via safeStorage) (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 02/20/58.

# ROLE & CONTEXT
Connection passwords are currently stored in PLAIN TEXT in the app's local
connection JSON (userData). Fix this: encrypt secrets using the OS-backed
keychain so they are never readable on disk. This is the last real SECURITY gap
before wider distribution and the upcoming macOS build.

APPROACH (fixed): use ELECTRON'S BUILT-IN `safeStorage` API.
- OS-backed: DPAPI on Windows, Keychain on macOS, libsecret/kwallet on Linux.
- PURE Electron — NO native module. Do NOT use `keytar` (deprecated/archived,
  and a native module would reintroduce the packaging pain we had with
  better-sqlite3).
- Works on Windows AND macOS, so this carries over to the planned Mac build
  with no rework.

# ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local), npm run <script>, run app in dev + smoke
- Connect to the running containers to verify connections still work
- Use chrome-devtools MCP for UI verification
- Create/edit/read files anywhere inside the db-tool project folder
- GIT: pull at the START; commit + push at the END when verified (authorized)

# ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; don't touch containers/data
- NO git reset --hard / clean / force-push; NO host/system config changes;
  NO -g installs
- ⚠️ DO NOT LOSE THE USER'S SAVED CONNECTIONS. Back up the existing
  connections file before rewriting it; if anything fails, leave the original
  intact and report. There are 6+ working connections (PG, MySQL, MariaDB,
  SQLite, Oracle, MSSQL) — losing them is unacceptable.
- Passwords must NEVER be logged and never sent to the renderer.

# REQUIREMENTS

## 1. Encryption at rest
- All connection SECRETS (passwords, and any Oracle/SQL Server credentials or
  SSH passphrases if present) are encrypted with
  `safeStorage.encryptString()` before being written, and decrypted with
  `safeStorage.decryptString()` in MAIN only when connecting.
- Store the encrypted value as base64 under a clearly different key (e.g.
  `passwordEnc`) so the format is unambiguous.
- Non-secret fields (host, port, user, database, engine, options) stay
  plaintext — encrypt only secrets.

## 2. Main-process only
Encryption/decryption happens ONLY in the Electron MAIN process. The renderer
must never receive the plaintext password.

## 3. Availability check + defined fallback
- Check `safeStorage.isEncryptionAvailable()`. If NOT available:
  do NOT silently store plaintext. Warn clearly in the connection UI ("secure
  storage unavailable — passwords cannot be encrypted") and EITHER (a) refuse
  to persist the password (ask per session) OR (b) persist with a visible
  warning. Pick ONE, implement consistently, document it.

## 4. Edit-connection UX (no secret leaks to the UI)
- When editing, do NOT send the decrypted password to the renderer. Show a
  masked placeholder ("••••••• (unchanged)").
  - Untouched -> keep the stored encrypted secret.
  - New value typed -> encrypt and replace.
  - Offer a "Clear password" affordance.
- "Test connection" must work in BOTH cases (stored secret and freshly typed).

## 5. MIGRATION of existing plaintext passwords (critical)
- On startup, detect connections still holding a plaintext `password`.
- BACK UP the connections file first (connections.json.bak-<timestamp>).
- Encrypt each, write the new format, REMOVE the plaintext field.
- If encryption is unavailable, do NOT destroy the plaintext file — leave it
  and warn.
- Migration must be IDEMPOTENT (safe to re-run) and must not duplicate or drop
  connections.
- Log (without secrets) how many connections were migrated.

## 6. Packaging
Confirm NO native dependency is added and `package:dir` still packages cleanly.

# STEPS (autonomous, in order)
1. `git pull`; report what came in.
2. Implement encryption in the main-process connection store (encrypt on save,
   decrypt on connect) + availability check + chosen fallback.
3. Implement the masked-password Edit UX (no plaintext to renderer).
4. Implement the backed-up, idempotent migration.
5. VERIFY:
   - Inspect the connections file on disk before/after: NO plaintext password
     remains; an encrypted blob is present. Show the user a REDACTED snippet as
     evidence.
   - All SIX saved connections still CONNECT after migration (PG, MySQL,
     MariaDB, SQLite, Oracle, MSSQL).
   - Create a NEW connection with a password -> stored encrypted -> connects.
   - EDIT a connection without touching the password -> still connects. Change
     it to a wrong value -> fails as expected; change back -> connects.
   - Restart the app -> connections and secrets survive.
   - Restart again -> migration is idempotent, no duplicates, no loss.
   - Confirm the backup file exists.
   - Confirm no password appears in any log/console output.
   - Full smoke suite on all six engines -> PASS.
6. typecheck + build clean; `package:dir` clean (no native module added).
7. Update README/COMPATIBILITY.md: how secrets are stored, fallback behavior,
   migration/backup note, and that it works on Windows and macOS.
8. COMMIT + PUSH; report the commit hash.

# REPORT
State: the on-disk format now (redacted example), how many connections were
migrated and where the backup went, the fallback behavior when safeStorage is
unavailable, evidence all six connections still work, and the commit hash.

# DONE = connection passwords are encrypted at rest via Electron safeStorage
(OS keychain-backed, no native module), decrypted only in main and never sent
to the renderer (Edit shows a masked placeholder), with a clear warning and a
defined fallback when secure storage is unavailable, and existing plaintext
passwords MIGRATED safely after a backup, idempotently — all six saved
connections verified still connecting after migration and across restarts, no
secrets in logs, smoke green, typecheck/build/package clean, docs updated, and
the work COMMITTED AND PUSHED with the hash reported.
