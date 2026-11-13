# Hallopedia Project Rules (`AGENTS.md`)

Dokumen ini adalah aturan kerja wajib bagi AI Agent pada repositori **Hallopedia** (Platform Pemesanan Layanan Periklanan Digital PT Hallopedia).

## 1. Kewajiban Aktivasi Skill Proyek (Anti-AI-Slop & Konsistensi Arsitektur)

Sebelum merancang atau menulis kode pada area terkait, Anda **WAJIB** membaca dan mematuhi skill lokal berikut:
- **Frontend (`frontend/`)**: Baca [`.agents/skills/anti-slop-frontend-design/SKILL.md`](.agents/skills/anti-slop-frontend-design/SKILL.md) untuk menjaga konsistensi desain editorial (`#0b0b0b`, `#ffffff`, `#ed3541`), mencegah tampilan *AI slop* / *company profile*, dan fokus pada katalog harga serta alur transaksi.
- **Backend (`backend/src/`)**: Baca [`.agents/skills/backend-clean-architecture/SKILL.md`](.agents/skills/backend-clean-architecture/SKILL.md) untuk mematuhi arsitektur berlapis (`routes` → `validators` → `controllers` → `services` → `prisma`), standar keamanan pembayaran Midtrans, dan batasan AI Chatbot.
- **Database (`backend/prisma/`)**: Baca [`.agents/skills/database-schema-standards/SKILL.md`](.agents/skills/database-schema-standards/SKILL.md) serta skill `supabase-postgres-best-practices` sebelum membuat atau mengubah skema Prisma dan migrasi PostgreSQL.

## 2. Prinsip Utama Bisnis & Produk

1. **Bukan Company Profile**: Website harus berfokus pada **informasi katalog harga periklanan (Publikasi Langsung & Kunjungan/Visit), proses sebelum transaksi, transaksi pembayaran (Penuh, DP, Invoice), dan proses setelah transaksi (pengiriman brief/materi, penjadwalan, live chat admin)**.
2. **Pertahankan Hero Section**: Jangan mengubah desain visual atau animasi utama `HeroSection.vue` yang sudah disetujui tanpa instruksi eksplisit dari pengguna (hanya tambahkan tautan/CTA menuju katalog).
3. **Pemisahan Monorepo**:
   - `frontend/`: Nuxt 4, Vue 3, TypeScript, Tailwind CSS, GSAP, Lenis, PWA.
   - `backend/`: Node.js, Express.js, TypeScript, Prisma ORM, Zod.
   - Jangan pernah menggabungkan backend Express ke dalam server Nitro Nuxt, dan jangan pernah memasang Prisma atau *secret API key* di dalam `frontend/`.
4. **Kebenaran Data & Keamanan**:
   - Jangan mengarang harga, daftar akun media, atau status pembayaran di luar data yang terverifikasi.
   - Seluruh perhitungan harga pesanan wajib diverifikasi dari database di sisi `backend/`, bukan mempercayai input nominal dari `frontend/`.

## 3. Pengunci Scope & Rancangan Baseline (Anti-Lupa Lintas Sesi)

1. **Rancangan Baseline Homepage Transaksional (`frontend/app/pages/index.vue` — Fleksibel Sesuai Diskusi & Arahan Perusahaan)**:
   Susunan di bawah adalah *baseline* awal yang dapat diubah, ditambah, atau disesuaikan urutannya kapan saja berdasarkan keinginan pihak PT Hallopedia dan hasil diskusi mendalam bersama pengguna:
   - **01 / Hero Section** (`HeroSection.vue` — pertahankan desain asli + CTA ke Katalog Harga).
   - **02 / Katalog & Harga Periklanan** (`CatalogSection.vue` — filter *Publikasi Langsung* vs *Kunjungan Produksi / Visit*, harga IDR transparan, rincian *deliverables*, akun media yang termasuk, dan badge skema bayar *Penuh · DP · Invoice*).
   - **03 / Jaringan Media Sosial** (`MediaNetworkSection.vue` — daftar akun media Hallopedia, cakupan wilayah Kalimantan, dan keterkaitan dengan paket iklan).
   - **04 / Proses Sebelum Transaksi & Transaksi** (`PreTransactionSection.vue` — alur interaktif: Eksplorasi Katalog & Konsultasi AI Chatbot → Pilih Paket → Checkout & Pembayaran Midtrans Penuh/DP/Invoice).
   - **05 / Proses Setelah Transaksi** (`PostTransactionSection.vue` — alur interaktif: Pengiriman Brief & Upload Materi/Link Google Drive → Koordinasi Live Chat Admin → Penjadwalan Kunjungan/Tayang).
   - **06 / FAQ Transaksi & Footer** (`FaqSection.vue` + `AppFooter.vue`).
   - *Catatan*: `MediaShowcaseSection.vue` dan `AboutHallopediaSection.vue` disimpan/diarsipkan (tidak dihapus) agar dapat digunakan kembali atau disesuaikan sewaktu-waktu jika dibutuhkan.
2. **Batas Peran Komunikasi & Notifikasi (Sesuai Laporan Capstone MVP)**:
   - **Pra-Transaksi**: Dilayani oleh **AI Chatbot** (OpenAI API dengan *starter prompts* + input mandiri, berbasis data katalog & FAQ resmi).
   - **Pasca-Transaksi**: Dilayani langsung oleh **Admin manusia** melalui fitur **Live Chat Web** yang terikat ke pelanggan & pesanan, didukung fitur **PWA + Web Push Notification + Unread Badge**.
3. **Gaya Visual Kreatif (Anti-Kaku)**:
   - Selalu gunakan ritme kontras section Gelap (`#0b0b0b`) dan Terang (`#ffffff` / `#f6f5f2`), koreografi gerak GSAP + Lenis yang halus, serta interaksi mikro taktil (bukan tabel/kotak statis yang membosankan).
4. **Penyimpanan Dokumen Perencanaan (`information/plans/`)**:
   - Setiap kali menyusun atau memperbarui rencana implementasi (*plan*), wajib menyimpan salinan lengkapnya dalam bentuk Markdown bernomor urut (`01-...md`, `02-...md`, dst.) di dalam folder `information/plans/` serta memperbarui tabel indeks di `information/plans/README.md`. Folder `information/` bersifat lokal (di-ignore oleh Git).

