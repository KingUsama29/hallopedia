---
name: database-schema-standards
description: Use when designing, creating, or modifying Prisma models, migrations, database queries, or seeders for Hallopedia's Supabase PostgreSQL database.
---

# Hallopedia Database & Prisma Schema Standards

## Overview

Hallopedia uses **Supabase PostgreSQL** accessed exclusively from `backend/` via **Prisma ORM**. All schema definitions must support the 16 Functional Requirements of the Capstone MVP and adhere to PostgreSQL performance and data-integrity best practices.

## 1. Naming & Mapping Conventions

- **Prisma Models**: `PascalCase` singular (e.g., `MediaAccount`, `OrderItem`, `PublicationSchedule`).
- **Database Tables**: `snake_case` plural via `@@map("media_accounts")`.
- **Prisma Fields**: `camelCase` (e.g., `customerId`, `unitPriceSnapshot`, `createdAt`).
- **Database Columns**: `snake_case` via `@map("customer_id")`.
- **Primary Keys**: UUID (`@id @default(uuid()) @db.Uuid`).
- **Timestamps**: Always include `createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)` and `updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)`.

## 2. Financial & Domain Data Types

- **Monetary Values**: Always use `Decimal` with `@db.Decimal(12, 2)` (never `Float` or `Int`) for `price`, `subtotalAmount`, `totalAmount`, `paidAmount`, and `amount`.
- **Service Types (`ServiceType` enum)**:
  - `DIRECT_POST`: Publikasi langsung di akun media sosial Hallopedia.
  - `VISIT_PRODUCTION`: Layanan kunjungan lokasi untuk produksi foto/video + publikasi.
- **Payment Schemes (`PaymentScheme` enum)**:
  - `FULL`: Pembayaran penuh 100% di awal.
  - `DP`: Pembayaran uang muka (Down Payment) di awal + pelunasan.
  - `INVOICE`: Pembayaran berdasarkan invoice sesuai kesepakatan pasca-publikasi.

## 3. Required Domain Entities (15-Table Architecture)

1. **Identity**: `profiles` (linked to Supabase Auth user ID, role `CUSTOMER` | `ADMIN`).
2. **Catalog & Media Network**:
   - `categories` (`id`, `name`, `slug`, `is_active`)
   - `media_accounts` (`id`, `name`, `platform`, `handle`, `profile_url`, `followers_count`, `region`, `is_active`)
   - `packages` (`id`, `category_id`, `name`, `slug`, `service_type`, `price`, `dp_percentage`, `deliverables`, `terms`, `is_active`)
   - `package_media` (M:N join table linking `packages` and `media_accounts` with `@@unique([packageId, mediaAccountId])`)
3. **Orders & Payments**:
   - `orders` (`id`, `order_number` unique, `customer_id`, `payment_scheme`, `status`, `subtotal_amount`, `total_amount`, `paid_amount`)
   - `order_items` (`id`, `order_id`, `package_id`, `package_name_snapshot`, `service_type_snapshot`, `unit_price_snapshot`, `quantity`)
   - `payments` (`id`, `order_id`, `midtrans_order_id` unique, `instalment_type`, `amount`, `status`, `snap_token`, `raw_webhook_payload`, `paid_at`)
   - `order_status_logs` (`id`, `order_id`, `previous_status`, `new_status`, `changed_by_id`, `note`, `created_at`)
4. **Post-Transaction Execution**:
   - `order_briefs` (`id`, `order_id`, `business_name`, `promotion_goal`, `caption_text`, `contact_info_to_display`, `visit_address`, `drive_link`, `review_status`, `admin_feedback`)
   - `order_materials` (`id`, `order_id`, `file_name`, `file_url`, `storage_path`, `mime_type`, `file_size`)
   - `publication_schedules` (`id`, `order_id`, `schedule_type` [`VISIT` | `PUBLICATION`], `preferred_date`, `preferred_time_slot`, `confirmed_at`, `published_url`, `status`)
5. **Communication, AI & PWA Notifications**:
   - `conversations` (`id`, `customer_id`, `order_id`, `status`, `last_message_at`)
   - `messages` (`id`, `conversation_id`, `sender_id`, `content`, `is_read`, `read_at`)
   - `chatbot_faqs` (`id`, `question`, `answer`, `is_starter_prompt`, `sort_order`, `is_active`)
   - `notifications` (`id`, `user_id`, `order_id`, `title`, `body`, `link_url`, `is_read`)
   - `push_subscriptions` (`id`, `user_id`, `endpoint` unique, `p256dh_key`, `auth_key`)

## 4. Indexing & Referential Integrity Rules

- **Index Every Foreign Key**: Postgres does not auto-index foreign keys. Add `@@index([customerId])`, `@@index([orderId])`, `@@index([categoryId])`, etc. on all child tables.
- **Protect Historical Orders**: Never use `onDelete: Cascade` from `Package` to `OrderItem` or from `Profile` to `Order`. Use `onDelete: Restrict` and soft-deactivation (`isActive: false`) on catalog items so historical financial records are never corrupted.

## 5. Ubiquitous Language Glossary (Anti-Synonym Drift)

Across PostgreSQL, Prisma, Express Services, and Nuxt Components, always use the exact canonical term below — **banned synonyms must never appear in type names, variable names, or API payloads**:

| Canonical Domain Term | Meaning in Hallopedia | Banned Synonyms (Never Use) |
| :--- | :--- | :--- |
| **`MediaAccount`** | Akun media sosial milik PT Hallopedia tempat iklan ditayangkan | `Channel`, `SocialAccount`, `Outlet`, `Publisher` |
| **`Package`** | Paket layanan periklanan yang dijual di katalog beserta harga | `Product`, `Plan`, `Tier`, `Bundle`, `Offering` |
| **`ServiceType`** | Jenis layanan paket: `DIRECT_POST` (Publikasi Langsung) atau `VISIT_PRODUCTION` (Kunjungan Produksi) | `PackageType`, `AdType`, `OrderType`, `PromoType` |
| **`PaymentScheme`** | Skema kesepakatan bayar: `FULL` (Penuh), `DP` (Uang Muka), atau `INVOICE` (Pasca-Publikasi) | `PaymentMethod` *(ini untuk QRIS/VA)*, `BillingMode`, `PayPlan` |
| **`OrderBrief`** | Instruksi promosi pascatransaksi (caption, tujuan promosi, alamat lokasi visit, link Drive) | `Submission`, `CampaignDetails`, `AdForm`, `OrderDetails` |
| **`OrderMaterial`** | File aset foto/video promosi yang diunggah pelanggan untuk suatu pesanan | `Attachment`, `Asset`, `Upload`, `MediaFile` |
| **`PublicationSchedule`** | Jadwal pelaksanaan kunjungan produksi (`VISIT`) atau jadwal penayangan konten (`PUBLICATION`) | `BookingSlot`, `CalendarEvent`, `PostTime`, `Timeline` |
| **`Conversation` / `Message`** | Percakapan langsung pascatransaksi antara Pelanggan dan Admin manusia | `ChatRoom`, `Thread`, `Ticket`, `SupportChat` |

