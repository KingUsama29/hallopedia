# Playbook Git & GitHub Profesional — Hallopedia

Dokumen referensi praktis untuk menerapkan standar kerja Git & GitHub yang bersih, terstruktur, dan aman pada repositori **Hallopedia**.

---

## 1. Strategi Branching & Penamaan Branch

Sesuai kesepakatan proyek, **seluruh perubahan masuk ke `main` melalui Feature Branch + Pull Request** (tidak commit langsung ke `main`).

| Prefix | Kapan Digunakan | Contoh di Hallopedia |
| :--- | :--- | :--- |
| **`feat/`** | Fitur baru halaman, komponen UI, atau endpoint API | `feat/catalog-detail-page` |
| **`fix/`** | Perbaikan bug aplikasi atau regresi UI/API | `fix/midtrans-webhook-signature` |
| **`refactor/`** | Merapikan struktur kode tanpa mengubah perilaku fitur | `refactor/order-service-seams` |
| **`docs/`** | Perubahan dokumentasi publik (`README.md`, panduan teknis) | `docs/api-contract-notes` |
| **`chore/`** | Konfigurasi repo, skills, dependencies, tooling | `chore/lead-review-and-git-skills` |
| **`hotfix/`** | Perbaikan darurat bug produksi dari `main` | `hotfix/checkout-price-rounding` |

**Aturan nama branch**: gunakan huruf kecil semua (`lowercase`) + tanda hubung (`kebab-case`), ringkas, dan jelas tujuannya.

---

## 2. Standar *Conventional Commits* & *Atomic Commit*

### Format Resmi
```text
<type>(<scope>): <imperative english summary>

[opsional body: jelaskan MENGAPA perubahan ini dibuat, bukan daftar file]
```

- **`type` yang diizinkan**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- **`scope` umum Hallopedia**: `catalog`, `hero`, `checkout`, `midtrans`, `chatbot`, `live-chat`, `auth`, `prisma`, `skills`, `deps`, `docs`.
- **Gaya subjek**: kata kerja perintah (*imperative*) bahasa Inggris, tanpa huruf kapital di awal kata kerja setelah `:`, maksimal 72 karakter, tanpa titik di akhir.

### Perbandingan Nyata
- ❌ **Hindari**: `update malam ini`, `fix bug`, `membangun katalog harga periklanan dan beberapa perbaikan lain`
- ✅ **Gunakan**:
  - `feat(catalog): add regional scope preset selector`
  - `fix(midtrans): verify gross_amount before marking order paid`
  - `chore(skills): add frontend and backend lead review skills`

### Prinsip *Atomic Commit*
Satu commit = **satu perubahan logis yang utuh**. Jika dalam satu sesi Anda mengubah dokumentasi skill **dan** memperbaiki bug UI katalog, pecah menjadi **2 commit terpisah** menggunakan staging selektif (`git add <file1> <file2>`), jangan disatukan dengan `git add -A`.

---

## 3. Alur Harian Aman (`pull` -> `branch` -> `stage` -> `commit` -> `push` -> `PR`)

### A. Sebelum Mulai Fitur Baru (Sinkronisasi `main`)
1. Pastikan tidak ada perubahan nyasar: `git status`
2. Jika ada WIP lokal sementara: `git stash push -u -m "wip: catatan singkat"`
3. Tarik update remote terbaru dengan rapi:
   ```bash
   git checkout main
   git fetch --prune
   git pull --rebase origin main
   ```
   *(Catatan: `git fetch` hanya mengunduh informasi terbaru tanpa mengubah branch aktif; `git pull --rebase` menaruh commit baru dari GitHub di bawah commit lokal secara lurus tanpa "merge bubble".)*
4. Buat branch baru:
   ```bash
   git checkout -b feat/nama-fitur
   ```

### B. Memeriksa & Staging Aman
1. Tinjau perubahan: `git status` dan `git diff`
2. Stage hanya file yang relevan:
   ```bash
   git add path/ke/file1 path/ke/file2
   # atau pilih per bagian kode (hunk) dalam satu file:
   git add -p path/ke/file
   ```
3. Jalankan safety scanner sebelum commit:
   ```bash
   node .agents/skills/github-pro-workflow/scripts/pre-commit-safety.mjs --staged
   ```

### C. Commit & Pre-Push Gate
1. Buat commit terstruktur:
   ```bash
   git commit -m "feat(catalog): add dynamic regional filter"
   ```
2. Sebelum push, cek daftar commit & safety scan rentang push:
   ```bash
   git log origin/main..HEAD --oneline
   node .agents/skills/github-pro-workflow/scripts/pre-commit-safety.mjs --pre-push
   ```
3. Jika ada perubahan kode `frontend/` atau `backend/`, pastikan pengecekan proyek (`npm run build` / `typecheck` / `security-scan.mjs` / `frontend-lead-review` / `backend-lead-review`) sudah lolos.

### D. Push & Membuat Pull Request (Tanpa `gh` CLI maupun Dengan `gh` CLI)
1. Push branch pertama kali:
   ```bash
   git push -u origin feat/nama-fitur
   ```
2. **Jika `gh` CLI belum terpasang**: Buka tautan Compare & Pull Request langsung di browser:
   `https://github.com/KingUsama29/hallopedia/compare/main...feat/nama-fitur?expand=1`
   Lalu tempel template deskripsi PR di bawah ini:
   ```markdown
   ## Ringkasan Perubahan
   - Menambahkan ...

   ## Mengapa Perubahan Ini Diperlukan
   - ...

   ## Verifikasi & QA Gate
   - [ ] `node .agents/skills/github-pro-workflow/scripts/pre-commit-safety.mjs --pre-push` (PASS)
   - [ ] Build / Typecheck / Unit test lolos
   - [ ] Lead review (`frontend-lead-review` / `backend-lead-review`) jika menyentuh kode aplikasi
   ```
   *(Opsional jika nanti ingin memakai terminal CLI PR otomatis di Windows: instal dengan `winget install --id GitHub.cli`, lalu login via `gh auth login`, dan jalankan `gh pr create --fill`.)*

### E. Setelah PR di-Merge di GitHub
Kembali ke `main`, sinkronkan, dan bersihkan branch lokal yang sudah selesai:
```bash
git checkout main
git fetch --prune
git pull --rebase origin main
git branch -d feat/nama-fitur
```

---

## 4. Pohon Keputusan *Undo*, Konflik & Keadaan Darurat

| Situasi | Perintah Aman | Dampak |
| :--- | :--- | :--- |
| File baru diedit salah, **belum** `git add`, ingin buang editan | `git restore <file>` | **Hati-hati**: mengembalikan file ke versi commit terakhir (editan hilang) |
| Salah ikut ter-`git add` (mis. `.env` atau file lain) | `git restore --staged <file>` | **Aman**: file lokal tetap utuh, hanya dikeluarkan dari staging |
| Salah pesan commit atau lupa 1 file (**belum** di-push) | `git reset --soft HEAD~1` atau `git commit --amend` | Commit dibuka lagi di lokal, file tetap ter-stage |
| Commit salah **sudah di-push ke `main`** | `git revert <commit-sha>` | **Aman**: membuat commit kebalikan baru tanpa merusak riwayat bersama |
| Salah rebase / konflik terasa berantakan saat di tengah proses | `git rebase --abort` atau `git merge --abort` | Membatalkan proses sync dan mengembalikan ke posisi sebelum konflik |
| **DARURAT**: File API key/secret **sudah sempat di-commit & di-push** | 1. **SEGERA revoke/rotate key** di dashboard provider (Midtrans/OpenAI/Supabase)!<br>2. Hapus file dari kode & tambahkan ke `.gitignore` | Menganggap key lama sudah bocor ke publik adalah satu-satunya langkah aman mutlak |

### Cara Menyelesaikan Konflik Rebase / Merge
1. Jalankan `git status` untuk melihat file berlabel `both modified`.
2. Buka file dan cari tanda `<<<<<<<`, `=======`, `>>>>>>>`.
3. Pilih atau gabungkan kode yang benar, lalu **hapus ketiga baris marker tersebut sampai bersih**.
4. Uji aplikasi/build dan jalankan `pre-commit-safety.mjs`, lalu:
   ```bash
   git add <file-yang-sudah-bersih>
   git rebase --continue   # atau: git commit (jika sedang merge)
   ```

---

## 5. Checklist Pengaturan Keamanan di Web GitHub (`KingUsama29/hallopedia`)

Buka **Repository -> Settings** di GitHub dan pastikan fitur gratis berikut aktif:
1. **Branches / Rulesets (untuk `main`)**:
   - Centang **Require a pull request before merging** (boleh *require 0 approvals* selama bekerja solo, yang penting tercatat lewat PR & cek lolos).
   - Centang **Block force pushes** & **Restrict deletions**.
2. **Code security (Security -> Code security)**:
   - Aktifkan **Secret scanning** dan **Push protection** (GitHub akan otomatis menolak push jika mendeteksi token bocor).
   - Aktifkan **Dependabot alerts** untuk mendeteksi celah keamanan pada paket `npm` di `frontend/` dan `backend/`.

