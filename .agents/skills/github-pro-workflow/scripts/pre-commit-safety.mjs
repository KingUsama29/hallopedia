#!/usr/bin/env node
/**
 * Hallopedia Pre-Commit, Commit-Msg & Pre-Push Safety Scanner (Zero Dependencies)
 * Usage:
 *   node pre-commit-safety.mjs [--staged] [--pre-push] [--check-msg <file|text>] [--allow-main] [--allow-large] [--json]
 */

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const args = process.argv.slice(2)
const jsonMode = args.includes('--json')
const prePushMode = args.includes('--pre-push')
const allowMain = args.includes('--allow-main') || process.env.HALLOPEDIA_ALLOW_MAIN === '1'
const allowLarge = args.includes('--allow-large')
const msgFlagIdx = args.indexOf('--check-msg')
const msgTarget = msgFlagIdx !== -1 ? args[msgFlagIdx + 1] : null

const WARN_BYTES = 1 * 1024 * 1024
const BLOCK_BYTES = 5 * 1024 * 1024

const CONVENTIONAL_TYPES = [
  'feat',
  'fix',
  'docs',
  'style',
  'refactor',
  'perf',
  'test',
  'build',
  'ci',
  'chore',
  'revert',
]

const CONVENTIONAL_RE = new RegExp(
  `^(${CONVENTIONAL_TYPES.join('|')})(?:\\([a-z0-9][a-z0-9._/-]*\\))?(!)?:\\s+(.+)$`,
)

const FORBIDDEN_PATH_RULES = [
  {
    id: 'PATH-ENV-FILE',
    test: (p) => /(?:^|\/)\.env(?:\..+)?$/i.test(p) && !/\.env\.(example|sample|template)$/i.test(p),
    message: 'File `.env` / environment lokal ter-stage! Jangan pernah commit kredensial lokal.',
  },
  {
    id: 'PATH-PRIVATE-KEY',
    test: (p) =>
      /\.(pem|key|p12|pfx|jks|keystore)$/i.test(p) ||
      /(?:^|\/)(?:id_rsa|id_ed25519|id_ecdsa|service-account[^/]*\.json|firebase-adminsdk[^/]*\.json|\.npmrc|\.pypirc)$/i.test(p),
    message: 'File private key, sertifikat, atau service-account ter-stage.',
  },
  {
    id: 'PATH-PRIVATE-INFO-DIR',
    test: (p) => /^information\//i.test(p),
    message: 'Folder lokal `information/` ter-stage (seharusnya tetap di-ignore Git).',
  },
  {
    id: 'PATH-BUILD-OR-DEPS',
    test: (p) => /(?:^|\/)(?:node_modules|\.nuxt|\.output|dist|\.next|coverage)\//i.test(p),
    message: 'Artefak build atau `node_modules/` ikut ter-stage.',
  },
]

const SECRET_PATTERNS = [
  {
    id: 'SEC-MIDTRANS-SERVER-KEY',
    severity: 'BLOCK',
    regex: /\b(?:SB-Mid-server-|Mid-server-)[A-Za-z0-9_-]{8,}\b/,
    message: 'Terdeteksi pola Midtrans Server Key nyata pada diff!',
  },
  {
    id: 'SEC-MIDTRANS-CLIENT-KEY',
    severity: 'WARN',
    regex: /\b(?:SB-Mid-client-|Mid-client-)[A-Za-z0-9_-]{8,}\b/,
    message: 'Terdeteksi Midtrans Client Key hardcoded — pastikan berasal dari env publik, bukan rahasia.',
  },
  {
    id: 'SEC-OPENAI-KEY',
    severity: 'BLOCK',
    regex: /\bsk-(?:proj-|svcacct-|ant-)?[A-Za-z0-9_-]{20,}\b/,
    message: 'Terdeteksi pola OpenAI/Anthropic API key (`sk-...`) pada diff!',
  },
  {
    id: 'SEC-GITHUB-TOKEN',
    severity: 'BLOCK',
    regex: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b|\bgithub_pat_[A-Za-z0-9_]{22,}\b/,
    message: 'Terdeteksi GitHub Personal Access Token pada diff!',
  },
  {
    id: 'SEC-AWS-KEY',
    severity: 'BLOCK',
    regex: /\bAKIA[0-9A-Z]{16}\b/,
    message: 'Terdeteksi AWS Access Key ID pada diff!',
  },
  {
    id: 'SEC-PRIVATE-KEY-BLOCK',
    severity: 'BLOCK',
    regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/,
    message: 'Terdeteksi blok PRIVATE KEY pada diff!',
  },
  {
    id: 'SEC-JWT-OR-SUPABASE-TOKEN',
    severity: 'BLOCK',
    regex: /\beyJhbGciOi[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
    message: 'Terdeteksi token JWT / Supabase Key hardcoded pada diff!',
  },
  {
    id: 'SEC-DB-CREDENTIALS-URI',
    severity: 'BLOCK',
    regex: /(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/([^:\s'"`]+):([^@\s'"`<>{}]+)@[^\s'"`]+/i,
    isPlaceholder: (match) => /^(?:user|username|password|pass|secret|changeme|dummy|example|test|your[_-].*|xxx+|\*+)$/i.test(match[2]),
    message: 'Terdeteksi connection string database dengan kredensial non-placeholder!',
  },
  {
    id: 'SEC-HARDCODED-SECRET-LITERAL',
    severity: 'BLOCK',
    regex: /(?:MIDTRANS_SERVER_KEY|OPENAI_API_KEY|SUPABASE_SERVICE_ROLE_KEY|JWT_SECRET|ADMIN_SECRET|WEBHOOK_SECRET)\s*[:=]\s*['"`]([^'"`\s]{12,})['"`]/i,
    isPlaceholder: (match) => /^(?:your_|example|changeme|dummy|test|placeholder|xxx+|\*+)/i.test(match[1]),
    message: 'Terdeteksi assignment secret literal pada variabel sensitif!',
  },
]

const findings = []

function addFinding(severity, ruleId, target, message, hint = '') {
  findings.push({ severity, ruleId, target, message, hint })
}

function runGit(gitArgs, allowFailure = false) {
  try {
    return execFileSync('git', gitArgs, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 25 * 1024 * 1024,
    }).trimEnd()
  } catch (err) {
    if (allowFailure) return null
    const stderr = err.stderr ? String(err.stderr).trim() : err.message
    throw new Error(`git ${gitArgs.join(' ')} gagal: ${stderr}`)
  }
}

function redactSecrets(line) {
  return line.trim().slice(0, 110).replace(/([A-Za-z0-9_-]{8})[A-Za-z0-9_-]{8,}/g, '$1***REDACTED***')
}

function getRepoRoot() {
  const root = runGit(['rev-parse', '--show-toplevel'], true)
  if (!root) {
    console.error('ERROR: Direktori kerja saat ini bukan repositori Git.')
    process.exit(2)
  }
  return root
}

function getCurrentBranch() {
  const symbolic = runGit(['symbolic-ref', '--short', 'HEAD'], true)
  if (symbolic) return { name: symbolic, detached: false }
  const sha = runGit(['rev-parse', '--short', 'HEAD'], true)
  return { name: sha || 'HEAD', detached: true }
}

function hasAnyCommit() {
  return runGit(['rev-parse', '--verify', 'HEAD'], true) !== null
}

function checkIdentityAndBranch(branchInfo) {
  const userName = runGit(['config', 'user.name'], true)
  const userEmail = runGit(['config', 'user.email'], true)
  if (!userName || !userEmail) {
    addFinding(
      'BLOCK',
      'GIT-IDENTITY-MISSING',
      'git config',
      'Konfigurasi `git user.name` atau `user.email` belum lengkap.',
      'Jalankan `git config user.name "Nama"` dan `git config user.email "email@domain.com"`.',
    )
  }

  if (branchInfo.detached) {
    addFinding(
      'WARN',
      'GIT-DETACHED-HEAD',
      branchInfo.name,
      'Posisi HEAD sedang detached (tidak berada di branch mana pun).',
      'Buat branch baru dulu dengan `git checkout -b feat/nama-fitur`.',
    )
    return
  }

  if (!prePushMode && !allowMain && (branchInfo.name === 'main' || branchInfo.name === 'master') && hasAnyCommit()) {
    addFinding(
      'BLOCK',
      'GIT-DIRECT-MAIN-COMMIT',
      branchInfo.name,
      `Commit langsung ke branch \`${branchInfo.name}\` diblokir oleh kebijakan Feature Branch + Pull Request.`,
      'Pindah dulu ke branch fitur: `git checkout -b feat/nama-topik` (file staged tetap terbawa!). Gunakan `--allow-main` hanya bila ada izin darurat.',
    )
  }
}

function scanDiffPatch(patchText, scopeLabel) {
  if (!patchText) return
  let currentFile = scopeLabel
  let currentLine = 0

  for (const rawLine of patchText.split(/\r?\n/)) {
    if (rawLine.startsWith('+++ b/')) {
      currentFile = rawLine.slice(6)
      continue
    }
    const hunkMatch = rawLine.match(/^@@ -\d+(?:,\d+)? \+(\d+)/)
    if (hunkMatch) {
      currentLine = Number(hunkMatch[1]) - 1
      continue
    }
    if (!rawLine.startsWith('+') || rawLine.startsWith('+++')) continue

    currentLine += 1
    const addedLine = rawLine.slice(1)
    const loc = `${currentFile}:${currentLine}`

    if (/^(?:<{7}\s|={7}$|>{7}\s)/.test(addedLine)) {
      addFinding(
        'BLOCK',
        'HYGIENE-CONFLICT-MARKER',
        loc,
        'Marker konflik Git (`<<<<<<<`, `=======`, `>>>>>>>`) masih tertinggal pada kode!',
        'Selesaikan merge/rebase conflict secara manual lalu stage ulang file.',
      )
    }

    const isAppCode =
      /(?:^|\/)(?:(?:frontend\/)?app|(?:frontend\/)?server|backend\/src)\//.test(currentFile) &&
      /\.(ts|mts|js|mjs|vue)$/i.test(currentFile)
    if (isAppCode && (/\bdebugger\s*;?/.test(addedLine) || /\bconsole\.log\s*\(/.test(addedLine))) {
      addFinding(
        'WARN',
        'HYGIENE-DEBUG-CODE',
        loc,
        'Ditemukan `console.log` atau `debugger` baru di kode produksi.',
        'Hapus log debug sementara sebelum membuat Pull Request.',
      )
    }

    if (/\.env\.(?:example|sample|template)$/i.test(currentFile)) {
      // Tetap periksa token nyata pada file example, namun abaikan placeholder umum
    }

    if (addedLine.includes('safety-allow: synthetic-test')) continue

    for (const rule of SECRET_PATTERNS) {
      const m = addedLine.match(rule.regex)
      if (!m) continue
      if (rule.isPlaceholder && rule.isPlaceholder(m)) continue
      addFinding(
        rule.severity,
        rule.id,
        loc,
        rule.message,
        `Baris: ${redactSecrets(addedLine)}`,
      )
    }
  }
}

function checkStagedFiles() {
  const statusOut = runGit(['diff', '--cached', '--name-status', '-z', '--diff-filter=ACMRT'], true)
  if (!statusOut) return 0

  const tokens = statusOut.split('\0').filter(Boolean)
  const stagedFiles = []

  let i = 0
  while (i < tokens.length) {
    const status = tokens[i]
    if (status.startsWith('R') || status.startsWith('C')) {
      if (tokens[i + 2]) stagedFiles.push(tokens[i + 2])
      i += 3
    } else {
      if (tokens[i + 1]) stagedFiles.push(tokens[i + 1])
      i += 2
    }
  }

  for (const filePath of stagedFiles) {
    for (const rule of FORBIDDEN_PATH_RULES) {
      if (rule.test(filePath)) {
        addFinding(
          'BLOCK',
          rule.id,
          filePath,
          rule.message,
          `Keluarkan dari staging tanpa menghapus file lokal: \`git restore --staged "${filePath}"\``,
        )
      }
    }

    const sizeStr = runGit(['cat-file', '-s', `:${filePath}`], true)
    const sizeBytes = sizeStr ? Number(sizeStr) : 0
    if (sizeBytes >= BLOCK_BYTES) {
      addFinding(
        allowLarge ? 'WARN' : 'BLOCK',
        'SIZE-TOO-LARGE',
        filePath,
        `Ukuran file staged ${(sizeBytes / (1024 * 1024)).toFixed(2)} MB melebihi batas 5 MB.`,
        'Hindari menyimpan biner/video besar langsung di riwayat Git (gunakan CDN/storage atau `--allow-large`).',
      )
    } else if (sizeBytes >= WARN_BYTES) {
      addFinding(
        'WARN',
        'SIZE-LARGE-FILE',
        filePath,
        `Ukuran file staged ${(sizeBytes / (1024 * 1024)).toFixed(2)} MB (> 1 MB). Pastikan memang aset yang dimaksud.`,
      )
    }
  }

  const patchText = runGit(['diff', '--cached', '-U0', '--no-color'], true)
  scanDiffPatch(patchText, 'staged')
  return stagedFiles.length
}

function validateCommitMessageText(rawText, sourceLabel) {
  const cleanedLines = rawText
    .split(/\r?\n/)
    .filter((line) => !line.startsWith('#'))
  const scissorIdx = cleanedLines.findIndex((l) => l.includes('------------------------ >8 ------------------------'))
  const relevantLines = scissorIdx === -1 ? cleanedLines : cleanedLines.slice(0, scissorIdx)
  const subject = (relevantLines[0] || '').trim()

  if (!subject) {
    addFinding('BLOCK', 'MSG-EMPTY', sourceLabel, 'Pesan commit kosong.')
    return
  }

  if (/^(?:Merge |Revert "|fixup! |squash! )/.test(subject)) {
    return
  }

  const match = subject.match(CONVENTIONAL_RE)
  if (!match) {
    addFinding(
      'BLOCK',
      'MSG-NOT-CONVENTIONAL',
      sourceLabel,
      `Format pesan commit tidak sesuai Conventional Commits: "${subject}"`,
      `Gunakan pola \`<type>(<scope>): <english imperative summary>\`, mis. \`feat(catalog): add regional filter\`. Tipe: ${CONVENTIONAL_TYPES.join(', ')}.`,
    )
    return
  }

  if (subject.length > 100) {
    addFinding(
      'BLOCK',
      'MSG-TOO-LONG',
      sourceLabel,
      `Baris subjek terlalu panjang (${subject.length} karakter, maksimal 100).`,
      'Ringkas subjek <= 72 karakter dan pindahkan penjelasan detail ke body commit.',
    )
  } else if (subject.length > 72) {
    addFinding(
      'WARN',
      'MSG-SUBJECT-LONG',
      sourceLabel,
      `Baris subjek ${subject.length} karakter (disarankan <= 72 karakter agar rapi di GitHub).`,
    )
  }

  if (subject.endsWith('.')) {
    addFinding(
      'WARN',
      'MSG-TRAILING-PERIOD',
      sourceLabel,
      'Hindari tanda titik di akhir baris subjek commit.',
    )
  }
}

function resolvePushCompareBase(branchName) {
  const upstream = runGit(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], true)
  if (upstream) return upstream
  const originMain = runGit(['rev-parse', '--verify', 'origin/main'], true)
  if (originMain && branchName !== 'main') return 'origin/main'
  const originMaster = runGit(['rev-parse', '--verify', 'origin/master'], true)
  if (originMaster && branchName !== 'master') return 'origin/master'
  return null
}

function checkPrePush(branchInfo) {
  const baseRef = resolvePushCompareBase(branchInfo.name)
  if (!baseRef) {
    addFinding(
      'WARN',
      'PUSH-NO-BASE-REF',
      branchInfo.name,
      'Belum ada branch tracking upstream atau `origin/main` lokal untuk dibandingkan.',
      'Jalankan `git fetch --prune` terlebih dahulu jika ingin membandingkan terhadap remote terbaru.',
    )
    return 0
  }

  const range = `${baseRef}..HEAD`
  const logOut = runGit(['log', range, '--format=%H%x09%s'], true)
  if (!logOut) return 0

  const commits = logOut.split(/\r?\n/).filter(Boolean)
  for (const entry of commits) {
    const [sha, ...rest] = entry.split('\t')
    validateCommitMessageText(rest.join('\t'), `commit ${sha.slice(0, 7)}`)
  }

  const diffOut = runGit(['diff', range, '-U0', '--no-color'], true)
  scanDiffPatch(diffOut, `push(${range})`)

  const statusDirty = runGit(['status', '--short'], true)
  if (statusDirty) {
    addFinding(
      'WARN',
      'PUSH-DIRTY-TREE',
      'working-tree',
      'Masih ada perubahan lokal yang belum di-commit sebelum push.',
      'Pastikan perubahan tersebut memang sengaja tidak ikut di-push.',
    )
  }

  return commits.length
}

function main() {
  if (msgTarget !== null) {
    if (!msgTarget) {
      console.error('ERROR: `--check-msg` membutuhkan argumen path file atau teks pesan.')
      process.exit(2)
    }
    const text = fs.existsSync(msgTarget) ? fs.readFileSync(msgTarget, 'utf8') : msgTarget
    validateCommitMessageText(text, fs.existsSync(msgTarget) ? path.basename(msgTarget) : 'commit-msg')
  } else {
    getRepoRoot()
    const branchInfo = getCurrentBranch()
    checkIdentityAndBranch(branchInfo)

    if (prePushMode) {
      checkPrePush(branchInfo)
    } else {
      const count = checkStagedFiles()
      if (count === 0) {
        addFinding(
          'WARN',
          'GIT-NOTHING-STAGED',
          'index',
          'Belum ada file yang di-stage (`git diff --cached` kosong).',
          'Stage file spesifik terlebih dahulu: `git add <path-file>`.',
        )
      }
    }
  }

  const blocks = findings.filter((f) => f.severity === 'BLOCK')
  const warns = findings.filter((f) => f.severity === 'WARN')

  if (jsonMode) {
    console.log(
      JSON.stringify(
        {
          mode: msgTarget !== null ? 'commit-msg' : prePushMode ? 'pre-push' : 'staged',
          summary: { BLOCK: blocks.length, WARN: warns.length },
          passed: blocks.length === 0,
          findings,
        },
        null,
        2,
      ),
    )
  } else {
    const modeLabel = msgTarget !== null ? 'Commit Message Check' : prePushMode ? 'Pre-Push Safety Gate' : 'Pre-Commit Staged Safety Gate'
    console.log(`Hallopedia Git Safety — ${modeLabel}`)
    console.log(`Summary: BLOCK=${blocks.length} | WARN=${warns.length}`)
    if (findings.length > 0) console.log('---')
    for (const f of findings) {
      console.log(`[${f.severity}] ${f.ruleId} | ${f.target}`)
      console.log(`  Masalah : ${f.message}`)
      if (f.hint) console.log(`  Saran   : ${f.hint}`)
    }
    if (blocks.length === 0) {
      console.log('STATUS: PASS (Aman dilanjutkan)')
    } else {
      console.log('STATUS: BLOCKED (Perbaiki isu [BLOCK] di atas sebelum melanjutkan)')
    }
  }

  process.exit(blocks.length > 0 ? 1 : 0)
}

main()
