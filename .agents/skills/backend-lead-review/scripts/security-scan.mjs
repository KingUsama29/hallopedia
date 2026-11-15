#!/usr/bin/env node
/**
 * Deterministic Static AppSec, REST Hygiene & Prisma Safety Scanner
 * Usage: node security-scan.mjs <target-directory> [--json]
 */

import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const jsonMode = args.includes('--json')
const targetArg = args.find((a) => !a.startsWith('--')) || '.'
const targetDir = path.resolve(process.cwd(), targetArg)

if (!fs.existsSync(targetDir)) {
  console.error(`ERROR: Target path does not exist: ${targetDir}`)
  process.exit(2)
}

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.nuxt',
  '.output',
  'dist',
  'build',
  'coverage',
])

const CODE_EXTS = new Set(['.ts', '.js', '.mts', '.mjs', '.cts', '.cjs'])
const ALL_EXTS = new Set([...CODE_EXTS, '.prisma', '.env'])

const findings = []

function addFinding(severity, ruleId, file, line, message, snippet = '') {
  findings.push({
    severity,
    ruleId,
    file: path.relative(process.cwd(), file) || file,
    line,
    message,
    snippet: snippet.trim().slice(0, 140),
  })
}

function collectFiles(dir) {
  const out = []
  const stat = fs.statSync(dir)
  if (stat.isFile()) return [dir]

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...collectFiles(full))
    } else if (
      entry.isFile() &&
      (ALL_EXTS.has(path.extname(entry.name)) || entry.name.startsWith('.env'))
    ) {
      out.push(full)
    }
  }
  return out
}

const CODE_RULES = [
  {
    id: 'SEC-SQLI-RAW-UNSAFE',
    severity: 'CRITICAL',
    regex: /\$queryRawUnsafe|\$executeRawUnsafe|Prisma\.raw\s*\(/,
    message: 'Unsafe raw SQL execution ($queryRawUnsafe/$executeRawUnsafe/Prisma.raw) risks SQL injection.',
  },
  {
    id: 'SEC-EXEC-EVAL',
    severity: 'CRITICAL',
    regex: /\b(eval|new\s+Function)\s*\(/,
    message: 'Dynamic code evaluation (eval / new Function) creates RCE risk.',
  },
  {
    id: 'SEC-CORS-WILDCARD',
    severity: 'HIGH',
    regex: /origin\s*:\s*(?:['"`]\*['"`]|true\s*,\s*credentials\s*:\s*true)/,
    message: 'Permissive CORS configuration (wildcard `*` or `origin: true` with credentials) exposes endpoints cross-origin.',
  },
  {
    id: 'SEC-HARDCODED-SECRET-KEY',
    severity: 'CRITICAL',
    regex: /(?:SB-Mid-server-[A-Za-z0-9_-]{4,}|Mid-server-[A-Za-z0-9_-]{4,}|sk-[A-Za-z0-9_-]{16,}|ghp_[A-Za-z0-9]{20,})/,
    message: 'Hardcoded provider secret or API token literal detected.',
  },
  {
    id: 'SEC-SECRET-ENV-FALLBACK',
    severity: 'CRITICAL',
    regex: /process\.env\.[A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD|PASS|DSN)[A-Z0-9_]*\s*\|\|\s*['"`][^'"`]+['"`]/,
    message: 'Security-sensitive env var has a hardcoded fallback literal (allows auth/signature forgery when unset).',
  },
  {
    id: 'SEC-ENV-LEAK-RESPONSE',
    severity: 'CRITICAL',
    multiline: true,
    regex: /res\.(?:status\([^;]{0,60}\)\.)?(?:json|send)\s*\((?:(?!(?:\bcatch\b|\bres\.))[\s\S]){0,240}?(?:process\.env(?:\.[A-Z0-9_]+)?|\.stack\b)/g,
    message: 'Potential leak of environment secrets or stack trace in HTTP response.',
  },
  {
    id: 'SEC-MASS-ASSIGNMENT-BODY',
    severity: 'CRITICAL',
    multiline: true,
    regex: /\bprisma\.[a-zA-Z0-9_]+\.(?:create|update|updateMany|upsert)\s*\([\s\S]{0,240}?\bdata\s*:\s*(?:req\.body|\{\s*\.\.\.req\.body)/g,
    message: 'Direct or spread req.body passed into Prisma mutation (Mass Assignment vulnerability).',
  },
  {
    id: 'SEC-OPTIONAL-SIGNATURE-CHECK',
    severity: 'CRITICAL',
    regex: /if\s*\(\s*signature_key\s*\)/,
    message: 'Conditional signature check (`if (signature_key)`) allows signature bypass by omitting field.',
  },
  {
    id: 'SEC-NON-TIMING-SAFE-SIG',
    severity: 'HIGH',
    regex: /signature(?:_key)?\s*[!=]==\s*[a-zA-Z0-9_]+/,
    message: 'Non-constant-time hash comparison (`===`/`!==`); prefer `crypto.timingSafeEqual`.',
  },
  {
    id: 'SEC-UNTRUSTED-PRICING-CLIENT',
    severity: 'CRITICAL',
    regex: /(?:req\.body|parsed)\.(?:totalAmount|unitPrice|paidAmount|discountAmount|subtotalAmount)\b/,
    message: 'Order/payment monetary amount read from client payload — verify pricing is exclusively computed from DB records.',
  },
  {
    id: 'SEC-IDENTITY-SPOOF-FALLBACK',
    severity: 'CRITICAL',
    multiline: true,
    regex: /(?:\(?\s*req\s*(?:as\s+any)?\s*\)?\.user\??\.id)[\s\S]{0,40}?(?:\|\||\?\?)[\s\S]{0,40}?req\.body\.\w+/g,
    message: 'Auth user ID falls back to client-supplied req.body field (identity spoofing / IDOR).',
  },
  {
    id: 'SEC-DECLARE-GLOBAL-PRISMA',
    severity: 'HIGH',
    regex: /declare\s+const\s+prisma\b/,
    message: '`declare const prisma` ambient stub instead of real module import risks ReferenceError at runtime.',
  },
  {
    id: 'ARCH-PRISMA-IN-CONTROLLER',
    severity: 'HIGH',
    pathIncludes: ['controller'],
    regex: /\bprisma\.[a-zA-Z0-9_]+\.(?:find|create|update|delete|upsert|\$queryRaw)/,
    message: 'Direct Prisma ORM call inside controller violates layered architecture (`Controller -> Service -> Repository`).',
  },
  {
    id: 'PERF-UNBOUNDED-PAGINATION',
    severity: 'MEDIUM',
    regex: /(?:take\s*:\s*Number\s*\(\s*req\.query\.|Number\s*\(\s*req\.query\.(?:limit|take|pageSize)\b)/,
    message: 'Unvalidated/unbounded pagination parameter from req.query risks NaN or memory exhaustion DoS.',
  },
  {
    id: 'API-RPC-VERB-ROUTE',
    severity: 'MEDIUM',
    pathIncludes: ['route'],
    regex: /\.(?:get|post|put|patch|delete)\s*\(\s*['"`][^'"`]*\/(?:create|getDetails|getList|list|search|delete|update)\b/,
    message: 'RPC-style verb path in Express router violates RESTful resource naming conventions.',
  },
  {
    id: 'API-200-ON-ERROR',
    severity: 'MEDIUM',
    multiline: true,
    regex: /catch\s*\([^)]*\)\s*\{[\s\S]{0,160}?\.status\(\s*200\s*\)/g,
    message: 'HTTP 200 returned inside catch block masks failures from API clients and monitoring.',
  },
]

function scanCodeFile(file, content) {
  const lines = content.split(/\r?\n/)
  const lowerPath = file.toLowerCase()

  for (const rule of CODE_RULES) {
    if (rule.pathIncludes && !rule.pathIncludes.some((p) => lowerPath.includes(p))) {
      continue
    }

    if (rule.multiline) {
      for (const m of content.matchAll(rule.regex)) {
        const lineNum = content.slice(0, m.index).split(/\r?\n/).length
        addFinding(rule.severity, rule.id, file, lineNum, rule.message, lines[lineNum - 1] || '')
      }
      continue
    }

    lines.forEach((lineText, idx) => {
      if (rule.regex.test(lineText)) {
        addFinding(rule.severity, rule.id, file, idx + 1, rule.message, lineText)
      }
    })
  }

  // N+1 query heuristic: await prisma.* inside for/while loop
  for (let i = 0; i < lines.length; i++) {
    if (/\b(for|while)\s*\(/.test(lines[i])) {
      const windowText = lines.slice(i, Math.min(lines.length, i + 8)).join('\n')
      if (/await\s+prisma\.[a-zA-Z0-9_]+\./.test(windowText)) {
        addFinding(
          'HIGH',
          'PERF-N-PLUS-ONE-LOOP',
          file,
          i + 1,
          'Database query awaited inside loop creates N+1 query bottleneck.',
          lines[i],
        )
      }
    }
  }
}

function scanPrismaFile(file, content) {
  const lines = content.split(/\r?\n/)
  let currentModel = null
  let modelFkFields = []
  let modelIndexes = []

  const flushModel = () => {
    if (!currentModel) return
    for (const fk of modelFkFields) {
      const indexed = modelIndexes.some((idx) => idx.startsWith(fk.name) || idx.includes(`${fk.name},`))
      if (!indexed) {
        addFinding(
          'HIGH',
          'DB-MISSING-FK-INDEX',
          file,
          fk.line,
          `Model \`${currentModel}\` foreign key \`${fk.name}\` is missing \`@@index([${fk.name}])\`.`,
          fk.raw,
        )
      }
    }
  }

  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1
    const modelMatch = lineText.match(/^\s*model\s+(\w+)\s*\{/)
    if (modelMatch) {
      flushModel()
      currentModel = modelMatch[1]
      modelFkFields = []
      modelIndexes = []
      return
    }

    if (/^\s*\}/.test(lineText) && currentModel) {
      flushModel()
      currentModel = null
      return
    }

    if (/(?:price|amount|total|paid|subtotal|balance|fee)\w*\s+(?:Float|Int)\b/i.test(lineText)) {
      addFinding(
        'CRITICAL',
        'DB-FLOAT-MONETARY-FIELD',
        file,
        lineNum,
        'Monetary column uses `Float`/`Int` instead of `Decimal @db.Decimal(12, 2)` (precision/rounding corruption).',
        lineText,
      )
    }

    if (/onDelete\s*:\s*Cascade/.test(lineText) && currentModel && /(Order|Payment|Invoice)/i.test(currentModel)) {
      addFinding(
        'CRITICAL',
        'DB-CASCADE-FINANCIAL-LOSS',
        file,
        lineNum,
        `Financial/transactional model \`${currentModel}\` uses \`onDelete: Cascade\` — risks permanent audit/transaction loss.`,
        lineText,
      )
    }

    const relMatch = lineText.match(/@relation\([^)]*fields\s*:\s*\[([^\]]+)\]/)
    if (relMatch) {
      const firstFk = relMatch[1].split(',')[0].trim()
      if (firstFk) {
        modelFkFields.push({ name: firstFk, line: lineNum, raw: lineText })
      }
    }

    const idxMatch = lineText.match(/@@(?:index|unique)\(\s*\[([^\]]+)\]/)
    if (idxMatch) {
      modelIndexes.push(idxMatch[1].replace(/\s+/g, ''))
    }
  })

  flushModel()
}

function scanEnvFile(file, content) {
  const lines = content.split(/\r?\n/)
  lines.forEach((lineText, idx) => {
    if (/^\s*[A-Z0-9_]+\s*=\s*.+/.test(lineText) && !/example|template/i.test(file)) {
      addFinding(
        'HIGH',
        'SEC-REAL-ENV-IN-SCAN-TARGET',
        file,
        idx + 1,
        'Populated `.env` file found inside project tree — confirm `.gitignore` excludes it and secrets are rotated.',
        lineText.replace(/=.*/, '=***REDACTED***'),
      )
    }
  })
}

const files = collectFiles(targetDir)

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8')
  const ext = path.extname(file)
  const base = path.basename(file)
  if (ext === '.prisma') {
    scanPrismaFile(file, content)
  } else if (base.startsWith('.env')) {
    scanEnvFile(file, content)
  } else if (CODE_EXTS.has(ext)) {
    scanCodeFile(file, content)
  }
}

// Project-level security posture checks
const codeFiles = files.filter((f) => CODE_EXTS.has(path.extname(f)))
if (codeFiles.length > 0) {
  const combinedCode = codeFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n')
  if (!/helmet\s*\(/.test(combinedCode)) {
    addFinding(
      'MEDIUM',
      'SEC-NO-HELMET-FOUND',
      targetDir,
      1,
      'No `helmet()` security headers middleware detected across scanned files.',
    )
  }
  if (!/rateLimit|express-rate-limit/i.test(combinedCode)) {
    addFinding(
      'HIGH',
      'SEC-NO-RATE-LIMIT-FOUND',
      targetDir,
      1,
      'No rate-limiting middleware detected for auth/webhook/AI routes.',
    )
  }
  if (/(router|app)\.\w+\(/.test(combinedCode) && !/authMiddleware|requireAuth|authenticate|verifyToken|requireRole/i.test(combinedCode)) {
    addFinding(
      'CRITICAL',
      'SEC-NO-AUTH-RBAC-MIDDLEWARE',
      targetDir,
      1,
      'Routes detected with no authentication or RBAC middleware references in scanned tree.',
    )
  }
}

const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0 }
for (const f of findings) counts[f.severity] = (counts[f.severity] || 0) + 1

if (jsonMode) {
  console.log(JSON.stringify({ targetDir, filesScanned: files.length, counts, findings }, null, 2))
} else {
  console.log(`Backend Security Scan Target: ${targetDir}`)
  console.log(`Files Scanned: ${files.length}`)
  console.log(`Summary: CRITICAL=${counts.CRITICAL} | HIGH=${counts.HIGH} | MEDIUM=${counts.MEDIUM}`)
  console.log('---')
  for (const f of findings) {
    console.log(`[${f.severity}] ${f.ruleId} | ${f.file}:${f.line}`)
    console.log(`  Issue: ${f.message}`)
    if (f.snippet) console.log(`  Code : ${f.snippet}`)
  }
}

process.exit(counts.CRITICAL > 0 ? 1 : 0)
