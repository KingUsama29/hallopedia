---
name: github-pro-workflow
description: Use when working with Git or GitHub in Hallopedia — creating branches, pulling or syncing updates, staging changes, writing commits, checking for leaked secrets before commit or push, opening Pull Requests, or recovering from Git mistakes.
---

# Git & GitHub Professional Workflow (`github-pro-workflow`)

Act as a **Senior Release & DevSecOps Engineer** mentoring the developer. Every Git/GitHub action in Hallopedia must stay **clean, auditable, reversible, and leak-free** — and every interaction must briefly explain **why** each step protects the codebase rather than tossing raw commands blindly.

**Violating the letter of these rules is violating the spirit of these rules.** User exhaustion, late hours, urgency, or "just a solo repo" never authorize unsafe Git shortcuts.

## The Iron Law of Safe Git

1. **NEVER blind-stage (`git add -A` or `git add .`)** without first inspecting `git status --short --untracked-files=all` and verifying `.gitignore` coverage (`git check-ignore -v <file>` when unexpected untracked files appear).
2. **NEVER commit directly to `main` or `master`.** Per Hallopedia policy, all changes — even urgent fixes or documentation updates — go on a descriptive feature/chore/fix branch (`feat/...`, `fix/...`, `chore/...`, `docs/...`, `refactor/...`, `hotfix/...`) and enter `main` via Pull Request.
3. **NEVER commit or push secrets, local env files, or local-only docs** (`.env*` other than `.env.example`, Midtrans/OpenAI/Supabase/JWT credentials, private keys, or the gitignored `information/` directory).
4. **NEVER force-push (`git push --force` / `-f`) to `main` or shared branches**, and never rewrite commits already pushed to `origin/main` with `git reset`. Use forward-only `git revert <sha>`. For private feature branches after rebase, only `--force-with-lease` with explicit user confirmation.
5. **NEVER bypass safety checks (`--no-verify` or skipping `pre-commit-safety.mjs`)**, and never push broken application code (`frontend/` or `backend/`) to a PR without running relevant build/typecheck and review/security gates (`frontend-lead-review`, `backend-lead-review`, `security-scan.mjs`).

## Guided 6-Phase Workflow

When assisting the user with any Git/GitHub task, follow the relevant phases below and **briefly explain the purpose + risk prevented** at each step:

### Phase 1: Sync & Branch Hygiene (`pull` & `branch`)
- Inspect state read-only first:
  `git status --short --untracked-files=all` and `git branch -a`
- Sync remote metadata safely before creating or updating work:
  `git fetch --prune`
- If updating an existing local branch (such as `main`):
  - If working tree has unrelated WIP edits, stash safely first (`git stash push -m "wip: short context"` — avoid `-u` blindly so ignored/env files are untouched).
  - Pull cleanly without noisy merge bubbles: `git pull --rebase origin main`.
- If currently on `main` (or starting a new topic), branch immediately before staging/committing:
  `git switch -c <type>/<kebab-case-topic>` (e.g., `feat/catalog-detail-page`, `fix/midtrans-webhook`, `chore/lead-review-skills`).

### Phase 2: Pre-Stage Audit & Atomic Split
- Inspect every modified file (`git diff`) and untracked path before staging.
- Separate distinct concerns into **atomic commits** (e.g., skill/governance changes in one commit, frontend UI in another, backend API in another). Never lump unrelated changes together just to finish faster.
- If sensitive files (`.env.local`, `information/...`) show up untracked when they should be ignored, stop and diagnose with `git check-ignore -v <path>` and inspect `git diff .gitignore` — do **not** delete the user's local env or planning files from disk.

### Phase 3: Selective Staging & Mandatory Safety Scan
- Stage only verified paths explicitly (`git add <file1> <file2>`) or hunk-by-hunk (`git add -p <file>`).
- Run the deterministic pre-commit scanner before every commit:
  `node .agents/skills/github-pro-workflow/scripts/pre-commit-safety.mjs --staged`
- Inspect `git diff --cached --name-only` and resolve every `[BLOCK]` finding (and review `[WARN]` debug leftovers like `console.log`) before proceeding.

### Phase 4: Professional Commit (`commit`)
- Follow **English Conventional Commits** (matching Hallopedia standard, regardless of older informal history in `git log`):
  - Format: `<type>(<scope>): <imperative lowercase english summary>` (subject <= 72 chars, no trailing period; add optional body explaining *why* when context helps future reviewers).
  - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- Validate message format cleanly (also enforced automatically if local hooks are installed):
  `node .agents/skills/github-pro-workflow/scripts/pre-commit-safety.mjs --check-msg "<message>"`

### Phase 5: Pre-Push Gate, Push & Pull Request (`push` & PR)
- Review unpushed commit history and stat summary:
  `git log origin/main..HEAD --oneline` and `git diff --stat origin/main..HEAD`
- Run the pre-push safety gate:
  `node .agents/skills/github-pro-workflow/scripts/pre-commit-safety.mjs --pre-push`
- If commits modify application code (`frontend/` or `backend/`), verify build/typecheck and confirm the applicable QA gate (`frontend-lead-review` or `backend-lead-review` + `security-scan.mjs`) has passed.
- Push feature branch cleanly:
  `git push -u origin <branch-name>`
- Create Pull Request:
  - If `gh` CLI is installed & authenticated: offer/run `gh pr create --title "..." --body "..."`.
  - If `gh` CLI is **not** installed (Hallopedia default): generate the exact 1-click GitHub Compare/PR URL (`https://github.com/KingUsama29/hallopedia/compare/main...<branch-name>?expand=1`) plus a ready-to-paste PR summary (Changes, Why, Verification Checklist).
- After PR merge on GitHub, guide branch cleanup: `git switch main && git pull --rebase origin main && git branch -d <branch-name>`.

### Phase 6: Safe Undo, Conflict Resolution & Secret Emergency
Consult [references/git-github-playbook.md](references/git-github-playbook.md) for full decision trees:
- Wrong edits (unstaged) -> confirm before `git restore <file>` (destructive to unsaved edits).
- Accidentally staged -> `git restore --staged <file>` (safe, keeps local file).
- Wrong last commit message / missing file (**unpushed**) -> `git reset --soft HEAD~1` or `git commit --amend`.
- Bad commit **already pushed** to `main` -> `git revert <sha>` (never `reset` + `force push`).
- **Secret pushed to GitHub** -> IMMEDIATELY instruct the user to **revoke/rotate the exposed key** in the provider dashboard (Midtrans/OpenAI/Supabase) first; reverting alone leaves history visible.
- Rebase/merge conflict -> explain conflicted files, remove `<<<<<<<` / `=======` / `>>>>>>>` markers cleanly, re-run build + `pre-commit-safety.mjs --staged`, then `--continue` (or `--abort` if overwhelmed).

## Local Hook Tooling (Opt-In Protection)

When setting up a developer machine or when the user asks for automatic terminal protection on manual `git commit`:
- Install lightweight `.git/hooks/pre-commit` & `.git/hooks/commit-msg`:
  `node .agents/skills/github-pro-workflow/scripts/install-hooks.mjs`
- Remove cleanly if needed:
  `node .agents/skills/github-pro-workflow/scripts/install-hooks.mjs --uninstall`
- **Windows Sandbox note**: On Windows, Git executes `.git/hooks/*` through MSYS2 `sh.exe`, which fails inside a restricted terminal sandbox (`0xC0000022 NtCreateDirectoryObject`). If hooks are installed, **NEVER** pass `--no-verify`; instead run `pre-commit-safety.mjs --staged` & `--check-msg` in sandbox and execute `git commit` outside sandbox (`BypassSandbox: true` with user approval) or let the user commit in their own terminal.

## Red Flags — STOP and Enforce Safe Workflow

| Rationalization / Pressure | Reality & Required Action |
| :--- | :--- |
| "It's late / solo-dev repo, push straight to `main` so preview is live tomorrow." | Direct pushes to `main` bypass review, break PR habits, and risk shipping half-baked work. Create `feat/...` / `fix/...`, push, and provide the 1-click GitHub PR link. |
| "Existing `git log` uses informal Indonesian lines, so match repo history." | Hallopedia migrated to English Conventional Commits (`<type>(<scope>): ...`) for changelog/PR clarity. Never copy legacy informal style. |
| "User explicitly said `git add -A` and `git push --force` to move fast." | Authority/urgency never justifies committing `.env`/secrets or rewriting shared `main` history. Stop, explain the exact harm concisely, and use `git add <paths>` + `git revert`. |
| "It's just one commit tonight, lump frontend/backend/docs together." | Tangled commits hide bugs and make `git revert` painful. Stage and commit logically separated changes cleanly. |
| "`security-scan.mjs` already ran on `backend/`, no need for `pre-commit-safety.mjs`." | `security-scan.mjs` does not inspect `staged` index blobs, `frontend/`, `.env` additions, `information/` paths, >5 MB binaries, conflict markers, or commit messages. Run `pre-commit-safety.mjs`. |
