---
name: backend-clean-architecture
description: Use when designing, scaffolding, or implementing any Express.js backend route, controller, service, repository, validator, middleware, Midtrans payment integration, or OpenAI chatbot endpoint in Hallopedia.
---

# Hallopedia Backend Clean Architecture & Security Standards

## Overview

The Hallopedia backend (`backend/`) is a standalone **Express.js + TypeScript + Prisma + Zod** REST API application. It must strictly separate HTTP transport from business logic, validate all external inputs, and enforce transactional integrity for orders and payments.

## 1. Strict Layered Architecture (`backend/src/`)

Every feature module must follow this unidirectional dependency flow:

`Routes` → `Middlewares (Auth / RBAC / Zod Validate)` → `Controllers` → `Services` → `Repositories / Prisma Client`

| Layer | Directory | Responsibility | Forbidden Actions |
| :--- | :--- | :--- | :--- |
| **Routes** | `src/routes/` | Bind HTTP verbs & paths to middlewares and controller methods. | No inline handlers, no business logic. |
| **Validators** | `src/validators/` | Define Zod schemas for `body`, `query`, and `params`. | No database calls. |
| **Controllers** | `src/controllers/` | Extract validated data from `req`, call Service, return standard HTTP response. | **NEVER** import `prisma` or put business calculations here. |
| **Services** | `src/services/` | Execute domain logic, verify prices, orchestrate transactions, call external APIs (Midtrans, OpenAI, Supabase Storage). | Never access `req` or `res` objects directly. |
| **Middlewares** | `src/middlewares/` | JWT authentication, role authorization (`CUSTOMER` vs `ADMIN`), Zod validation, rate limiting, central error handling. | No feature-specific business rules. |

## 2. Standard API Response Contract

All REST endpoints must return a consistent JSON envelope:

```typescript
// Success Response
export interface ApiSuccessResponse<T> {
  success: true
  message: string
  data: T
  meta?: {
    page?: number
    limit?: number
    total?: number
  }
}

// Error Response
export interface ApiErrorResponse {
  success: false
  message: string
  code: string
  errors?: Array<{ field: string; message: string }>
}
```

## 3. Financial, Order & Payment Security Rules (Non-Negotiable)

1. **Zero Trust on Client Prices**:
   - `POST /api/orders` must **only** accept `packageId`, `quantity`, `paymentScheme` (`FULL` | `DP` | `INVOICE`), and customer details.
   - The Service layer **must** query the active `Package` from PostgreSQL via Prisma, compute `subtotalAmount`, `totalAmount`, and initial payable amount (`100%` for `FULL`, `dpPercentage` for `DP`), and freeze the exact price & package name into `order_items` snapshots (`unitPriceSnapshot`, `packageNameSnapshot`).
2. **Midtrans Webhook Verification & Idempotency**:
   - Verify Midtrans webhook authenticity using `SHA-512(order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY)` before processing.
   - Process webhook updates inside a `prisma.$transaction(...)`.
   - Enforce idempotency: if a `Payment` record is already in a terminal state (`SETTLEMENT`, `CANCEL`, `EXPIRE`) with the same status, return `200 OK` immediately without duplicating `order_status_logs`.
3. **Resource Ownership & RBAC**:
   - Customers (`role === 'CUSTOMER'`) may only read, upload materials, or send chat messages for orders where `order.customerId === req.user.id`.
   - Admin endpoints (`/api/admin/*`) must require `requireRole('ADMIN')`.

## 4. AI Chatbot vs Post-Transaction Chat Boundaries

- **Pre-Transaction AI Chatbot (`POST /api/chatbot/ask`)**:
  - Grounded strictly on active database records (`packages`, `media_accounts`, `categories`, `chatbot_faqs`) injected into the system prompt.
  - Must never invent prices, follower counts, or terms not present in the database context.
  - Must never modify order status or claim payment verification.
- **Post-Transaction Live Chat (`/api/conversations/*`)**:
  - Handled directly between authenticated Customer and Admin (no AI auto-responder overriding post-transaction coordination).
  - Triggers in-app `notifications` and Web Push dispatch for unread message tracking.

## 5. Deep Modules, Seams, Adapters & Domain Modeling (Matt Pocock Standard)

To prevent *backend AI slop* (pass-through boilerplate layers, untestable side-effects, and weak runtime validation):

1. **Deep Services & Anti-Pass-Through Rule**:
   - Do **not** create a `Repository` class that merely wraps `prisma.package.findMany()` 1-to-1 with zero added domain abstraction (*shallow module*).
   - Keep `Service` modules **deep**: expose a small, clear public API (e.g., `OrderService.createOrder(customerId, input)`) that internally encapsulates package lookup, price calculation, DP percentage math, order number generation, and atomic `prisma.$transaction` writes.
2. **Explicit Seams & Adapters for External Boundaries**:
   - A **Seam** is a boundary where behavior can be swapped for testing without modifying the caller.
   - Isolate every third-party integration behind a dedicated Adapter interface (`MidtransPaymentAdapter`, `OpenAiChatbotAdapter`, `SupabaseStorageAdapter`, `WebPushAdapter`). Services depend on the seam so integration tests can verify order, webhook, and chatbot flows deterministically without live network calls.
3. **Make Illegal Domain States Unrepresentable with `z.discriminatedUnion`**:
   - Never validate polymorphic business inputs with flat optional fields (`visitAddress: z.string().optional()`).
   - Enforce domain invariants at the boundary using Zod discriminated unions:
     ```ts
     export const SubmitOrderBriefSchema = z.discriminatedUnion('serviceType', [
       z.object({
         serviceType: z.literal('DIRECT_POST'),
         businessName: z.string().min(2),
         promotionGoal: z.string().min(10),
         captionText: z.string().min(10),
         contactInfoToDisplay: z.string().min(3),
         driveLink: z.string().url().optional(),
       }),
       z.object({
         serviceType: z.literal('VISIT_PRODUCTION'),
         businessName: z.string().min(2),
         promotionGoal: z.string().min(10),
         visitAddress: z.string().min(10),
         visitNotes: z.string().min(5),
         contactInfoToDisplay: z.string().min(3),
         driveLink: z.string().url().optional(),
       }),
     ])
     ```

