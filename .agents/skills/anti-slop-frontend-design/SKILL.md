---
name: anti-slop-frontend-design
description: Use when designing, creating, or modifying any Nuxt 4 / Vue 3 frontend component, page, layout, styling, or animation in Hallopedia to prevent generic AI slop and enforce the strict editorial transactional design system.
---

# Hallopedia Anti-Slop Frontend & Editorial UI Standards

## Overview

Hallopedia uses a **High-Contrast Editorial Transactional Design System** inspired by modern media and creative agencies — NOT a generic SaaS template and NOT a verbose company profile. Every screen must prioritize **clear advertising package pricing, media reach data, pre-transaction flow, checkout clarity, and post-transaction execution**.

## 1. Visual Identity & Color Tokens (Strict)

Never invent random Tailwind palette colors (`indigo-*`, `purple-*`, `blue-*`, `emerald-*`, `slate-*`). Stick strictly to the Hallopedia palette established in `HeroSection.vue` and `MediaNetworkSection.vue`:

| Token Role | Hex / Value | Usage |
| :--- | :--- | :--- |
| **Canvas Dark** | `#0b0b0b` | Primary dark background (`bg-[#0b0b0b]`) |
| **Surface Dark** | `#141414` / `#171717` | Elevated cards/containers on dark background |
| **Canvas Light** | `#ffffff` / `#f5f4f0` | Alternating high-contrast light sections (`bg-white`) |
| **Brand Red (Accent)** | `#ed3541` | Primary accent, active indicators, key emphasis words, focus rings |
| **Text Primary** | `#ffffff` (on dark) / `#0b0b0b` (on light) | Headlines, primary body copy, prices |
| **Text Muted** | `#aaaaaa` / `#888888` (on dark), `#666666` (on light) | Eyebrow labels, metadata, secondary descriptions |
| **Hairline Border** | `#292929` or `white/20` (on dark), `black/20` (on light) | Editorial grid dividers, table/list borders (`1px solid`) |

## 2. Forbidden AI Slop Patterns (Hard Ban)

- **NO SaaS Gradients or Glows**: Never use purple/blue/cyan gradients, glowing blurred blobs (`blur-3xl`), or neon drop shadows.
- **NO Generic Bouncy Cards**: Avoid `rounded-2xl` / `rounded-3xl` cards with heavy drop shadows (`shadow-xl`, `shadow-2xl`) and hover scale bounces (`hover:scale-105`). Use sharp or subtle corners (`rounded-none` or `rounded-sm`), `1px` hairline borders (`border-t border-white/20`), and clean typographic hierarchy.
- **NO Emoji Clutter**: Never put emojis (🚀, ✨, 💡, 🔥, ✅) in headings, buttons, badges, or feature lists. Use typographic numbers (`01`, `02`, `03`), geometric markers (a `7px` `#ed3541` circle or `↗` / `+` / `→`), and uppercase micro-labels.
- **NO Company-Profile Fluff**: Do not write vague marketing paragraphs about "visi misi kami" or "inovasi tanpa batas". Every section must communicate concrete utility: **what media accounts are included, what the deliverables are (Direct Post vs Visit), how much it costs, how to pay (Full/DP/Invoice), and what happens after payment**.

## 3. Editorial Typography & Layout Rules

1. **Section Eyebrow Header**:
   Every major section starts with the signature editorial eyebrow:
   ```vue
   <div class="flex items-center gap-[10px] text-[10px] tracking-[2px] text-[#999] uppercase">
     <span class="h-[7px] w-[7px] rounded-full bg-[#ed3541]" aria-hidden="true"></span>
     02 / KATALOG & HARGA PAKET
   </div>
   ```
2. **Display Headlines**:
   - Use fluid sizing (`text-[clamp(40px,7vw,108px)]`), heavy weight (`font-extrabold` or `font-black`), tight leading (`leading-[0.88]` to `leading-[0.92]`), and tight negative tracking (`tracking-[-0.06em]` to `tracking-[-0.08em]`).
   - Highlight at most one key phrase per heading in `text-[#ed3541]`.
3. **Container & Grid Discipline**:
   - Horizontal padding: `px-[6%] max-[700px]:px-[5%]` with `mx-auto max-w-[1600px]`.
   - Use asymmetric editorial grids (e.g., `lg:grid-cols-[0.75fr_1.25fr]` or `lg:grid-cols-[1.35fr_0.65fr]`) and hairline horizontal/vertical rules (`border-t border-[#292929]`) to separate items cleanly.
4. **Pricing & Package Cards**:
   - Format prices clearly in IDR (`Rp 1.500.000`) with high-contrast numerals.
   - Explicitly badge the service type: **`PUBLIKASI LANGSUNG`** vs **`KUNJUNGAN PRODUKSI (VISIT)`**.
   - Explicitly show supported payment schemes: **`PENUH · DP · INVOICE`**.

## 4. Creative Direction & Anti-Rigidity Rules (Agar Tidak Kaku / Membosankan)

Menghindari *AI slop* **bukan berarti** membuat halaman terlihat seperti tabel kaku, daftar teks polos, atau website lama yang membosankan. Setiap section harus terasa **hidup, kreatif, modern, dan interaktif** dengan tetap berfokus pada transaksi:

1. **Ritme Kontras Gelap–Terang (*Alternating Canvas Rhythm*)**:
   - Jangan gunakan latar belakang hitam `#0b0b0b` secara monoton di seluruh halaman.
   - Ciptakan ritme dramatis dengan menyelingi section gelap (`bg-[#0b0b0b] text-white`) dan section terang (`bg-white text-[#0b0b0b]` atau `bg-[#f6f5f2] text-[#0b0b0b]`), sebagaimana transisi antara `HeroSection` (gelap) dan section putih yang sudah ada.
2. **Koreografi Gerak & Scroll (*GSAP + Lenis Choreography*)**:
   - **Line & Border Reveal**: Garis pembatas horizontal (`border-t`) atau penanda section dianimasikan tumbuh dari kiri ke kanan (`scaleX: 0 -> 1`, `transformOrigin: 'left center'`, `ease: 'power3.out'`) saat masuk ke *viewport*.
   - **Staggered Editorial Reveal**: Judul section, kartu paket katalog, dan langkah transaksi muncul secara berurutan (*stagger* `0.08s`–`0.14s`, `y: 24 -> 0`, `autoAlpha: 0 -> 1`) menggunakan `ScrollTrigger`.
   - **Subtle Image Parallax & Clip-Path**: Gunakan parallax halus pada visual pendukung (`scale: 1.08 -> 1`, `yPercent: 4 -> -2` dengan `scrub: 1.1`) atau transisi `<Transition mode="out-in">` saat pengguna berpindah tab/pilihan.
3. **Interaksi Mikro yang Taktil (*Tactile Micro-Interactions*)**:
   - Setiap elemen yang bisa diklik (filter katalog, kartu paket, langkah pemesanan, item akun media, akordeon FAQ) wajib memiliki respons visual yang tajam:
     - Pergeseran panah/ikon (`group-hover:translate-x-1`, `group-hover:-translate-y-0.5` untuk `↗`).
     - Perubahan aksen nomor urut (`01`, `02`) dan garis tepi ke `#ed3541` saat *hover* atau aktif (`aria-pressed="true"`).
     - Ornamen sudut editorial (*corner marks* siku tipis `#ed3541`), *live dot* berkedip halus, serta *metadata strip* bergaya kamera/jurnalistik (`H / 02 — KATALOG HARGA`).
4. **Penyajian Katalog & Alur Transaksi yang Kreatif (Bukan Sekadar Tabel/Kotak Teks)**:
   - **Katalog Harga Interaktif**: Gunakan *interactive filter switcher* (`Semua Layanan`, `Publikasi Langsung`, `Kunjungan Produksi / Visit`) dengan transisi grup yang mulus, kartu paket berstruktur asimetris yang menonjolkan **harga IDR berukuran tegas**, daftar kanal media yang termasuk, rincian *deliverables*, serta indikator skema bayar (`PENUH · DP 50% · INVOICE`).
   - **Alur Pra-Transaksi & Pasca-Transaksi Interaktif**: Jangan hanya menaruh 3 kolom teks statis. Gunakan *interactive step switcher* atau *visual blueprint* di mana pengguna dapat mengklik tiap tahapan (misal: tahap *Konsultasi AI Chatbot*, *Pembayaran Midtrans*, *Upload Brief & Google Drive*, hingga *Live Chat Admin & Jadwal Tayang*) untuk melihat rincian apa yang pelanggan lakukan dan apa yang sistem/admin kerjakan.

## 5. Nuxt 4, Accessibility & Animation Discipline

- **Single `<h1>` Per Page**: Only the main page title uses `<h1>`. Section titles use `<h2>`, card titles use `<h3>`.
- **Landmark Structure**: Wrap page content in a single `<main>` inside the layout (`app/layouts/default.vue`).
- **GSAP + Lenis Cleanup**:
  - Always check `window.matchMedia('(prefers-reduced-motion: reduce)').matches` before initializing scroll/reveal animations.
  - Always scope GSAP animations with `gsap.context(() => { ... }, rootElement)` and call `context?.revert()` inside `onBeforeUnmount`.
- **Hero Preservation**: Never alter the visual layout or keyframe animations of `HeroSection.vue` without explicit user instruction; only wire navigation/CTA targets as requested.

## 6. Codebase Design: Deep Modules & Type-Driven UI (Matt Pocock Standard)

To prevent *architectural AI slop* (bloated folder trees, shallow wrapper components, and loose TypeScript types), enforce these rules in every frontend file:

1. **Deep Modules over Shallow Wrappers (Ousterhout's Principle)**:
   - **Shallow Module (FORBIDDEN)**: Creating tiny components or composables whose interface (`props` / `emits` / parameters) is nearly as complex as their implementation, or splitting a single coherent section into 6 pass-through sub-files that only forward props.
   - **Deep Module (REQUIRED)**: Each component (`CatalogSection.vue`, `PreTransactionSection.vue`, `PostTransactionSection.vue`) or composable (`useGsapReveal.ts`, `useCatalogPackages.ts`) must hide complex internal mechanics (GSAP timelines, ScrollTrigger lifecycles, keyboard navigation, responsive layout shifts) behind a **minimal, self-explanatory interface**.
2. **Make Illegal UI States Unrepresentable (No "Boolean Soup")**:
   - **FORBIDDEN**: Loose optional bags of state like `{ isLoading: boolean; isError: boolean; data?: Package[] }` or `{ isVisit?: boolean; visitAddress?: string }`.
   - **REQUIRED**: Use **TypeScript Discriminated Unions** and exhaustive narrowing (`satisfies never`):
     ```ts
     export type AsyncViewState<T> =
       | { status: 'idle' }
       | { status: 'loading' }
       | { status: 'success'; data: T }
       | { status: 'error'; message: string }

     export type PackageDeliverableSpec =
       | {
           serviceType: 'DIRECT_POST'
           channels: string[]
           postFormats: ('FEED' | 'REELS' | 'STORY' | 'TIKTOK_VIDEO')[]
         }
       | {
           serviceType: 'VISIT_PRODUCTION'
           channels: string[]
           visitDurationHours: number
           includesScriptAndEditing: true
         }
     ```
3. **Strict Ubiquitous Language in Props, Events & Variables**:
   - Never invent synonym names in UI code. Always use the canonical domain terms defined in `database-schema-standards` (`MediaAccount`, `Package`, `ServiceType`, `PaymentScheme`, `OrderBrief`, `OrderMaterial`, `PublicationSchedule`).

