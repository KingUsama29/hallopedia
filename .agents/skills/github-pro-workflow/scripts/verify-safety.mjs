#!/usr/bin/env node
/**
 * Isolated Self-Test Suite for pre-commit-safety.mjs & install-hooks.mjs
 * Creates a temporary scratch git repo in OS temp dir, runs all assertions, and cleans up.
 */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SAFETY_SCRIPT = path.join(__dirname, 'pre-commit-safety.mjs')
const INSTALL_SCRIPT = path.join(__dirname, 'install-hooks.mjs')

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hallopedia-git-safety-'))
const repoDir = path.join(tmpRoot, 'repo')

function git(args, cwd = repoDir) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

function runNode(scriptPath, args = [], cwd = repoDir) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

let passed = 0
function pass(label) {
  passed += 1
  console.log(`PASS [${passed}]: ${label}`)
}

try {
  fs.mkdirSync(repoDir, { recursive: true })
  git(['init', '-b', 'main'])
  git(['config', 'user.name', 'Test User'])
  git(['config', 'user.email', 'test@hallopedia.local'])

  // Test 1: Bootstrap initial commit passes
  fs.writeFileSync(path.join(repoDir, 'README.md'), '# Hallopedia Test\n')
  git(['add', 'README.md'])
  const bootstrapRes = runNode(SAFETY_SCRIPT, ['--staged', '--json'])
  assert.equal(bootstrapRes.status, 0, `Initial empty-HEAD commit should pass: ${bootstrapRes.stdout}`)
  git(['commit', '-m', 'chore(repo): initialize repository'])
  // Simulate remote tracking ref refs/remotes/origin/main without invoking MSYS sh.exe
  git(['update-ref', 'refs/remotes/origin/main', 'HEAD'])
  pass('Bootstrap initial commit on main allowed')

  // Test 2: Direct commit on main blocked unless --allow-main
  fs.writeFileSync(path.join(repoDir, 'note.txt'), 'clean file\n')
  git(['add', 'note.txt'])
  const mainBlocked = runNode(SAFETY_SCRIPT, ['--staged', '--json'])
  assert.equal(mainBlocked.status, 1)
  assert.ok(JSON.parse(mainBlocked.stdout).findings.some((f) => f.ruleId === 'GIT-DIRECT-MAIN-COMMIT'))
  const mainAllowed = runNode(SAFETY_SCRIPT, ['--staged', '--allow-main', '--json'])
  assert.equal(mainAllowed.status, 0)
  git(['restore', '--staged', 'note.txt'])
  fs.unlinkSync(path.join(repoDir, 'note.txt'))
  pass('Direct commit on main blocked by default and overridable with --allow-main')

  // Test 3: Feature branch + forbidden paths (.env.local, information/)
  git(['checkout', '-b', 'feat/safety-test'])
  fs.mkdirSync(path.join(repoDir, 'backend'), { recursive: true })
  fs.mkdirSync(path.join(repoDir, 'information/plans'), { recursive: true })
  fs.writeFileSync(path.join(repoDir, 'backend/.env.local'), 'PORT=4000\n')
  fs.writeFileSync(path.join(repoDir, 'information/plans/draft.md'), '# Private draft\n')
  git(['add', '-f', 'backend/.env.local', 'information/plans/draft.md'])
  const pathCheck = runNode(SAFETY_SCRIPT, ['--staged', '--json'])
  assert.equal(pathCheck.status, 1)
  const pathJson = JSON.parse(pathCheck.stdout)
  assert.ok(pathJson.findings.some((f) => f.ruleId === 'PATH-ENV-FILE'))
  assert.ok(pathJson.findings.some((f) => f.ruleId === 'PATH-PRIVATE-INFO-DIR'))
  git(['reset'])
  pass('Forbidden staged paths (.env.local and information/) blocked')

  // Test 4: Secret patterns + placeholder exemption on .env.example
  const fakeMidtrans = 'SB-Mid-server-' + 'AbCdEfGh12345678'
  const fakeOpenAi = 'sk-proj-' + 'AbCdEfGhIjKlMnOpQrStUvWxYz12'
  const fakeJwt =
    'eyJhbGciOi' +
    'JIUzI1NiIsInR5cCI6IkpXVCJ9.' +
    'eyJyb2xlIjoic2VydmljZV9yb2xlIn0.' +
    'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
  const realDb =
    'postgresql://hallopedia_admin:' + 'S3cr3tP4ssword99@db.supabase.co:5432/postgres'

  fs.mkdirSync(path.join(repoDir, 'backend/src'), { recursive: true })
  fs.writeFileSync(
    path.join(repoDir, 'backend/src/config.ts'),
    `export const cfg = {\n  midtrans: '${fakeMidtrans}',\n  openai: '${fakeOpenAi}',\n  jwt: '${fakeJwt}',\n  db: '${realDb}',\n}\n`,
  )
  fs.writeFileSync(
    path.join(repoDir, 'backend/.env.example'),
    'DATABASE_URL="postgresql://user:password@localhost:5432/hallopedia"\nOPENAI_API_KEY="your_openai_key"\n',
  )
  git(['add', 'backend/src/config.ts', 'backend/.env.example'])
  const secCheck = runNode(SAFETY_SCRIPT, ['--staged', '--json'])
  assert.equal(secCheck.status, 1)
  const secJson = JSON.parse(secCheck.stdout)
  for (const id of [
    'SEC-MIDTRANS-SERVER-KEY',
    'SEC-OPENAI-KEY',
    'SEC-JWT-OR-SUPABASE-TOKEN',
    'SEC-DB-CREDENTIALS-URI',
  ]) {
    assert.ok(secJson.findings.some((f) => f.ruleId === id), `Missing rule ${id}`)
  }
  assert.equal(secJson.findings.filter((f) => f.target.includes('.env.example')).length, 0)
  git(['reset'])
  fs.unlinkSync(path.join(repoDir, 'backend/src/config.ts'))
  pass('Secret pattern scanning catches Midtrans/OpenAI/JWT/DB URI while allowing .env.example placeholders')

  // Test 5: Conflict marker & debug code hygiene (both root app/ and monorepo frontend/app/)
  fs.mkdirSync(path.join(repoDir, 'app'), { recursive: true })
  fs.writeFileSync(
    path.join(repoDir, 'app/demo.ts'),
    '<<<<<<< HEAD\nconst a = 1\n=======\nconst a = 2\n>>>>>>> main\nconsole.log(a)\n',
  )
  git(['add', 'app/demo.ts'])
  const hygieneCheck = runNode(SAFETY_SCRIPT, ['--staged', '--json'])
  assert.equal(hygieneCheck.status, 1)
  const hygieneJson = JSON.parse(hygieneCheck.stdout)
  assert.ok(hygieneJson.findings.some((f) => f.ruleId === 'HYGIENE-CONFLICT-MARKER'))
  assert.ok(hygieneJson.findings.some((f) => f.ruleId === 'HYGIENE-DEBUG-CODE'))
  git(['reset'])
  fs.unlinkSync(path.join(repoDir, 'app/demo.ts'))
  pass('Conflict markers blocked and production console.log warned')

  // Test 6: Large file threshold (> 5 MB blocked, --allow-large overridable)
  fs.writeFileSync(path.join(repoDir, 'huge.bin'), Buffer.alloc(5.5 * 1024 * 1024, 'a'))
  git(['add', 'huge.bin'])
  const sizeBlock = runNode(SAFETY_SCRIPT, ['--staged', '--json'])
  assert.equal(sizeBlock.status, 1)
  assert.ok(JSON.parse(sizeBlock.stdout).findings.some((f) => f.ruleId === 'SIZE-TOO-LARGE'))
  assert.equal(runNode(SAFETY_SCRIPT, ['--staged', '--allow-large', '--json']).status, 0)
  git(['reset'])
  fs.unlinkSync(path.join(repoDir, 'huge.bin'))
  pass('Oversized binary files (>5MB) blocked and overridable with --allow-large')

  // Test 7: Conventional Commits validator via inline text & COMMIT_EDITMSG file
  const badMsg = runNode(SAFETY_SCRIPT, ['--check-msg', 'update malam ini', '--json'])
  assert.equal(badMsg.status, 1)
  assert.ok(JSON.parse(badMsg.stdout).findings.some((f) => f.ruleId === 'MSG-NOT-CONVENTIONAL'))

  const msgFile = path.join(tmpRoot, 'COMMIT_EDITMSG')
  fs.writeFileSync(
    msgFile,
    'feat(catalog): add regional preset filter\n\n# Please enter the commit message for your changes.\n',
  )
  assert.equal(runNode(SAFETY_SCRIPT, ['--check-msg', msgFile, '--json']).status, 0)
  pass('Conventional Commit validator checks inline strings & COMMIT_EDITMSG files')

  // Test 8: install-hooks.mjs installs, protects custom hooks, and --uninstall removes safely
  const customPreCommit = path.join(repoDir, '.git/hooks/pre-commit')
  fs.mkdirSync(path.dirname(customPreCommit), { recursive: true })
  fs.writeFileSync(customPreCommit, '#!/bin/sh\necho custom\n')
  const blockedOverwrite = runNode(INSTALL_SCRIPT, [])
  assert.equal(blockedOverwrite.status, 1, 'Installer must refuse overwriting non-hallopedia hook without --force')

  const forcedInstall = runNode(INSTALL_SCRIPT, ['--force'])
  assert.equal(forcedInstall.status, 0, `Hook install failed: ${forcedInstall.stderr}`)
  const preCommitText = fs.readFileSync(path.join(repoDir, '.git/hooks/pre-commit'), 'utf8')
  const commitMsgText = fs.readFileSync(path.join(repoDir, '.git/hooks/commit-msg'), 'utf8')
  assert.match(preCommitText, /pre-commit-safety\.mjs"/)
  assert.match(preCommitText, /exec node "\$SCRIPT" --staged/)
  assert.match(commitMsgText, /pre-commit-safety\.mjs"/)
  assert.match(commitMsgText, /exec node "\$SCRIPT" --check-msg "\$1"/)

  assert.equal(runNode(INSTALL_SCRIPT, ['--uninstall']).status, 0)
  assert.equal(fs.existsSync(path.join(repoDir, '.git/hooks/pre-commit')), false)
  assert.equal(fs.existsSync(path.join(repoDir, '.git/hooks/commit-msg')), false)
  pass('install-hooks.mjs respects custom hooks, writes valid runners, and uninstalls cleanly')

  // Test 9: Pre-push scan catches unpushed informal commit message + secret leak
  fs.writeFileSync(path.join(repoDir, 'backend/src/leak.ts'), `const t = '${fakeOpenAi}'\n`)
  git(['add', 'backend/src/leak.ts'])
  git(['commit', '-m', 'oops bad message'])
  const prePushRes = runNode(SAFETY_SCRIPT, ['--pre-push', '--json'])
  assert.equal(prePushRes.status, 1)
  const prePushJson = JSON.parse(prePushRes.stdout)
  assert.ok(prePushJson.findings.some((f) => f.ruleId === 'MSG-NOT-CONVENTIONAL'))
  assert.ok(prePushJson.findings.some((f) => f.ruleId === 'SEC-OPENAI-KEY'))
  pass('Pre-push scan catches unpushed informal commits and secret leaks')

  console.log(`\nALL ${passed} TESTS PASSED.`)
} finally {
  fs.rmSync(tmpRoot, { recursive: true, force: true })
}
