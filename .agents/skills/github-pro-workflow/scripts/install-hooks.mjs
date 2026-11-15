#!/usr/bin/env node
/**
 * Opt-in Installer / Uninstaller for Hallopedia Local Git Hooks
 * Installs lightweight `.git/hooks/pre-commit` & `.git/hooks/commit-msg`
 * delegating directly to `.agents/skills/github-pro-workflow/scripts/pre-commit-safety.mjs`.
 *
 * Usage:
 *   node install-hooks.mjs [--uninstall] [--force]
 */

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const MARKER = '# hallopedia-github-pro-workflow-hook'
const args = process.argv.slice(2)
const uninstall = args.includes('--uninstall')
const force = args.includes('--force')

function getRepoRoot() {
  return execFileSync('git', ['rev-parse', '--show-toplevel'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

function getHooksDir(repoRoot) {
  const gitDirRaw = execFileSync('git', ['rev-parse', '--git-dir'], {
    encoding: 'utf8',
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
  const gitDir = path.isAbsolute(gitDirRaw) ? gitDirRaw : path.resolve(repoRoot, gitDirRaw)
  return path.join(gitDir, 'hooks')
}

function buildHookRunner(flagExpr) {
  return `#!/bin/sh
${MARKER}
if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js tidak ditemukan di PATH. Jalankan commit melalui terminal yang memiliki Node.js."
  exit 1
fi
ROOT="$(git rev-parse --show-toplevel)"
SCRIPT="$ROOT/.agents/skills/github-pro-workflow/scripts/pre-commit-safety.mjs"
if [ -f "$SCRIPT" ]; then
  exec node "$SCRIPT" ${flagExpr}
fi
echo "WARNING: pre-commit-safety.mjs tidak ditemukan di $SCRIPT, lanjut tanpa scan."
exit 0
`
}

function buildPreCommitScript() {
  return buildHookRunner('--staged')
}

function buildCommitMsgScript() {
  return buildHookRunner('--check-msg "$1"')
}

function installHook(hookPath, content) {
  if (fs.existsSync(hookPath)) {
    const existing = fs.readFileSync(hookPath, 'utf8')
    if (!existing.includes(MARKER) && !force) {
      console.error(
        `SKIP: Hook kustom sudah ada di ${hookPath}. Jalankan ulang dengan --force jika memang ingin menimpanya.`,
      )
      return false
    }
  }
  fs.writeFileSync(hookPath, content, { encoding: 'utf8', mode: 0o755 })
  try {
    fs.chmodSync(hookPath, 0o755)
  } catch {
    // Windows NTFS ignores POSIX mode bits cleanly
  }
  console.log(`INSTALLED: ${hookPath}`)
  return true
}

function uninstallHook(hookPath) {
  if (!fs.existsSync(hookPath)) {
    console.log(`NONE: ${hookPath} tidak terpasang.`)
    return
  }
  const existing = fs.readFileSync(hookPath, 'utf8')
  if (!existing.includes(MARKER) && !force) {
    console.log(`SKIP: ${hookPath} bukan hook milik github-pro-workflow (gunakan --force untuk paksa hapus).`)
    return
  }
  fs.unlinkSync(hookPath)
  console.log(`REMOVED: ${hookPath}`)
}

function main() {
  const repoRoot = getRepoRoot()
  const hooksDir = getHooksDir(repoRoot)
  fs.mkdirSync(hooksDir, { recursive: true })

  const targets = [
    { file: path.join(hooksDir, 'pre-commit'), content: buildPreCommitScript() },
    { file: path.join(hooksDir, 'commit-msg'), content: buildCommitMsgScript() },
  ]

  if (uninstall) {
    targets.forEach((t) => uninstallHook(t.file))
    return
  }

  let ok = true
  for (const t of targets) {
    if (!installHook(t.file, t.content)) ok = false
  }
  if (!ok) process.exit(1)
  console.log('\nSelesai! Sekarang setiap perintah `git commit` manual di terminal otomatis memeriksa:')
  console.log('1. pre-commit : mencegah commit langsung ke `main`, kebocoran `.env`/secret, conflict marker, & file > 5 MB.')
  console.log('2. commit-msg : memvalidasi format Conventional Commits.')
}

main()
