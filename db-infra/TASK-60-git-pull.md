# TASK 60: DB Tool — Safely pull the latest changes from GitHub (AUTONOMOUS, careful)
# Windows 11 / portable Node in project.

# ROLE & CONTEXT
The user fixed an Oracle bug (Oracle couldn't see/handle many databases) on
ANOTHER computer and pushed it to GitHub. This machine must now be updated from
GitHub. Do this SAFELY: this machine may have local commits or uncommitted work
that must NOT be lost.

# ✅ AUTONOMOUS PERMISSIONS
- git: status, fetch, log, diff, stash, pull, merge (see guardrails)
- npm install (project-local), npm run <script> (build/typecheck/smoke)
- Create/edit/read files inside the db-tool project folder

# ⛔ HARD GUARDRAILS — DO NOT DESTROY LOCAL WORK
- ABSOLUTELY NO: `git reset --hard`, `git checkout -- .` (mass discard),
  `git clean -fd`, force-push, branch deletion, or ANY command that discards
  local commits or uncommitted changes.
- If there are uncommitted local changes, PRESERVE them (commit on a branch or
  `git stash`) — never discard.
- If the pull would CONFLICT and the resolution is not trivially obvious, STOP
  and ask the user, showing which files conflict.
- NO docker prune / down -v; no host/system config changes; no -g installs.

# STEPS (in order — report findings as you go)
1. INSPECT FIRST (read-only):
   - `git status` -> are there uncommitted changes? untracked files?
   - `git log --oneline -5` -> what does this machine have locally?
   - `git remote -v` and `git branch -vv` -> confirm the remote + tracking
     branch.
   - `git fetch` then `git log --oneline HEAD..@{u}` -> what is INCOMING from
     GitHub (the work-computer fix), and `git log --oneline @{u}..HEAD` -> what
     this machine has that the remote does NOT.
   - REPORT this picture to the user before changing anything.
2. PROTECT LOCAL WORK:
   - If there are uncommitted changes: either commit them on the current branch
     (if they're clearly finished work) or `git stash push -u` with a clear
     message. State which you did. Do NOT discard.
   - If this machine has local commits not on the remote, keep them — the pull
     must merge, not overwrite.
3. PULL:
   - `git pull` (merge is fine; avoid rebase if there are local commits, to
     keep it simple and reversible).
   - If it conflicts: list the conflicting files. Resolve ONLY if the conflict
     is trivial and unambiguous; otherwise STOP and ask the user.
   - If you stashed in step 2, `git stash pop` afterwards and report any
     conflicts (again: stop and ask if non-trivial).
4. RESYNC THE PROJECT:
   - If package.json / package-lock.json changed, run `npm install`.
   - Do a CLEAN rebuild (the TASK 44 lesson: a stale `out/` causes "Cannot find
     module .../chunks/<engine>-<hash>.js"). Remove the stale build output
     inside the project and rebuild so main/preload/renderer/chunks are
     consistent.
5. VERIFY NOTHING BROKE:
   - `npm run typecheck` and `npm run build` -> clean.
   - Run the headless smoke suite against the running containers for ALL
     engines (PostgreSQL, MySQL, MariaDB, SQLite, Oracle, MSSQL) -> report
     PASS/FAIL per engine.
   - Specifically confirm the incoming ORACLE fix works here: connect to Oracle
     and verify it can see/list MANY databases/schemas (the bug that was fixed),
     not just one.
   - If a container isn't running, note it rather than failing the whole check.
6. REPORT:
   - What was incoming (commits/files from the other machine).
   - What local work existed and how it was preserved (committed / stashed /
     already clean).
   - Any conflicts and how they were handled.
   - Build + smoke results per engine.
   - Confirmation that the Oracle many-databases fix is present and working.

# DONE = this machine is updated from GitHub with the other computer's Oracle
fix, NO local work was lost (preserved via commit or stash, conflicts either
trivially resolved or escalated to the user), dependencies reinstalled if
needed, a CLEAN rebuild done, typecheck + build clean, the smoke suite reported
per engine, and the Oracle many-databases fix verified working here — with a
clear report of everything that happened.
