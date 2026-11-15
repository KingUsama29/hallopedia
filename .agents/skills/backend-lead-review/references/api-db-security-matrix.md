# Backend Lead API, Database & AppSec Review Matrix

Use this deep checklist alongside `scripts/security-scan.mjs` during `backend-lead-review`. Always cite verified `file:line`, concrete exploit/failure scenario, exact fix, and required test.

## 1. API Schema & Contract Integrity
- **Strict Boundary Validation (Zod)**: Every `body`, `query`, and `params` input must pass a Zod validator middleware before reaching controllers (`z.string().uuid()` on `:id`, `.strict()` to reject unknown fields, bounded `.min()`/`.max()` on strings/arrays/pagination).
- **Polymorphic Inputs (`z.discriminatedUnion`)**: Conditional business payloads (`DIRECT_POST` vs `VISIT_PRODUCTION` brief, payment schemes) must use discriminated unions instead of loose optional bags.
- **Canonical Domain Glossary**: Enforce Hallopedia's canonical terms (`MediaAccount`, `Package`, `ServiceType`, `PaymentScheme`, `OrderBrief`, `OrderMaterial`, `PublicationSchedule`, `Conversation`). Reject banned drift (`PackageType`, `paymentMethod` for scheme, `orderCode` vs `orderNumber`).
- **Response Envelope Consistency**: Enforce uniform `ApiSuccessResponse<T>` and `ApiErrorResponse` shapes across every endpoint so frontend clients never guess shapes.

## 2. RESTful Semantics & Clean Layering
- **Resource-Oriented URIs**: Plurals + nouns only (`POST /orders`, `GET /orders`, `GET /orders/:id`, `PATCH /orders/:id/status`, `DELETE /admin/packages/:id`). Reject RPC verb paths (`/orders/create`, `/orders/getDetails`, `/packages/:id/delete`).
- **Accurate HTTP Status Codes**:
  - `201 Created` on new resource creation; `200`/`204` on read/update/delete.
  - Never return `200 OK` on validation/business/server errors (`400`/`422` validation, `401` unauthenticated, `403` forbidden, `404` missing record, `409` duplicate/invalid state transition, `429` rate limit).
- **Pagination & Bounds**: Enforce server-side `maxLimit` (e.g., `<= 100`) and finite integer parsing on `page`/`limit` to prevent `NaN` or memory DoS.
- **Strict Layering (`Routes -> Middlewares -> Controllers -> Services -> Prisma`)**: Controllers never import `prisma` or calculate money/DP math; Services never accept `req`/`res` objects. External providers (Midtrans, OpenAI, Supabase Storage, Web Push) sit behind swappable adapter interfaces (**Seams**).

## 3. Database & Prisma Integration (PostgreSQL / Supabase)
- **Financial Precision**: Money columns (`price`, `subtotalAmount`, `totalAmount`, `paidAmount`, `unitPriceSnapshot`) MUST use `Decimal @db.Decimal(12, 2)`, never `Float` or `Int`.
- **Relational Integrity**:
  - Historical orders/items MUST use `onDelete: Restrict` (soft-deactivate packages via `isActive: false`), never `onDelete: Cascade` from `Package` or `Profile` to transactions.
  - Snapshot pricing/name fields on `OrderItem` so price edits never rewrite past invoices.
- **Indexing & Query Performance**:
  - `@@index([...])` on **every** foreign key and common filter/sort column (`customerId`, `status`, `createdAt`).
  - Zero N+1 loops (`await prisma...` inside `for`/`map`); batch with `findMany({ where: { id: { in: ids } } })`.
  - Wrap multi-table writes (`order` + `items` + `statusLog` + `payment`) in `prisma.$transaction`.
  - Use Supabase PgBouncer connection URL (`?pgbouncer=true`) in production & verify RLS if direct Supabase client access exists anywhere.
  - Unique collision-safe order numbers (sequence, crypto random suffix, or retry on `P2002` — never `Date.now()` alone).

## 4. Data Security, OWASP Top 10 & Vulnerability Scanning
- **Auth, RBAC & IDOR (Broken Object Level Authorization)**:
  - Protected routes require JWT verification middleware; derive `customerId` solely from verified token (`req.user.id`), NEVER fallback to `req.body.customerId`.
  - Every `GET/PATCH/POST` on `/orders/:id`, briefs, schedules, or chat threads must assert `order.customerId === req.user.id || req.user.role === 'ADMIN'`. Return `404`/`403` cleanly.
  - Admin endpoints enforce `requireRole('ADMIN')`.
- **Zero-Trust Financial & Midtrans Webhook Security**:
  - Recompute package price, selected accounts rules (e.g., Collab max 5), and DP/Full amounts strictly on the server from DB `Package` records. Ignore/reject client-sent prices.
  - Midtrans webhook MUST: (1) require `signature_key` unconditionally, (2) verify `SHA-512(order_id + status_code + gross_amount + SERVER_KEY)` using `crypto.timingSafeEqual` with no hardcoded fallback key, (3) verify `fraud_status === 'accept'` for credit card `capture`, (4) verify `gross_amount` matches DB expected payment amount, (5) enforce atomic **idempotency** (dedupe via unique Midtrans `transaction_id`/status or guard against overwriting terminal `PAID`/`CANCELLED` states).
- **Injection, Mass Assignment & Error Leakage**:
  - Zero `$queryRawUnsafe`/`$executeRawUnsafe` string interpolation.
  - Explicit field allowlists on Prisma `.create`/`.update` (never `data: req.body`).
  - Central error middleware hides `err.stack`, SQL internals, and env vars (`DATABASE_URL`) in responses.
- **Edge Hardening, Uploads & AI Chatbot Safety**:
  - Verify `helmet()`, allowlist `cors()`, JSON body size limits, and `express-rate-limit` on `/auth/*`, `/payments/midtrans/webhook`, `/chat/ai`.
  - File uploads: validate allowlisted MIME + magic bytes + strict size cap + UUID storage key (never raw filename / path traversal).
  - AI Chatbot: pre-transaction Q&A only; system prompt + DB-grounded catalog context; never expose admin/customer PII or database mutation tools to AI.

## 5. Verification, Security Scanning & Test Requirements
1. **Run Static Security Scanner**: Execute `node <skill-dir>/scripts/security-scan.mjs <target>` and read all findings.
2. **Dependency Audit**: Run `npm audit --audit-level=high` (when `package.json`/lockfile exist in target).
3. **Type & Schema Integrity**: Run `npx tsc --noEmit` and `npx prisma validate` (when `tsconfig.json`/`schema.prisma` exist).
4. **Automated API & Negative Security Tests**: Run Vitest/Supertest suite and verify negative tests exist for:
   - Forged/missing Midtrans `signature_key` & duplicate replay webhook
   - Cross-user IDOR (`GET /orders/:id` as another customer -> `403`/`404`)
   - Client price tampering (`totalAmount: 1` ignored or rejected)
   - SQLi payload in query params & unauthenticated admin mutations (`401`/`403`)
   - Invalid UUID param (`400`, never unhandled `500`)

