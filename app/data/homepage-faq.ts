export type FaqCategory = 'ALL' | 'PAYMENT' | 'MATERIAL' | 'SCHEDULE'

export interface TransactionFaqItem {
  id: string
  category: Exclude<FaqCategory, 'ALL'>
  categoryLabel: string
  question: string
  answer: string
}

export interface FooterNavItem {
  number: string
  label: string
  target: `#${string}`
}

export const FAQ_CATEGORY_TABS: readonly { value: FaqCategory; label: string }[] = [
  { value: 'ALL', label: 'Semua Topik' },
  { value: 'PAYMENT', label: 'Pembayaran & DP' },
  { value: 'MATERIAL', label: 'Materi & Revisi' },
  { value: 'SCHEDULE', label: 'Jadwal & Visit' },
]

export const TRANSACTION_FAQ_ITEMS: readonly TransactionFaqItem[] = [
  {
    id: 'faq-dp-invoice',
    category: 'PAYMENT',
    categoryLabel: 'PEMBAYARAN',
    question: 'Kapan bisa memakai pembayaran Penuh, DP 50%, dan Invoice?',
    answer: 'Pembayaran Penuh (100%) dan DP 50% tersedia melalui Midtrans untuk paket yang mendukung. Khusus paket tetap tertentu seperti Dominasi Kalimantan dan paket Visit dapat mengikuti ketentuan skema bayar yang tertera di kartu paket, sedangkan Invoice berlaku sesuai persetujuan admin.',
  },
  {
    id: 'faq-price-safety',
    category: 'PAYMENT',
    categoryLabel: 'PEMBAYARAN',
    question: 'Apakah harga paket custom bisa berubah saat checkout?',
    answer: 'Tarif dihitung konsisten per akun media sesuai jenis layanan dan mode distribusi (Satuan, Collab maks. 5 akun, atau Post Terpisah) lalu divalidasi kembali di server saat checkout agar nominal transaksi selalu akurat.',
  },
  {
    id: 'faq-material-format',
    category: 'MATERIAL',
    categoryLabel: 'MATERI',
    question: 'Format materi apa yang harus disiapkan untuk Publikasi Langsung?',
    answer: 'Siapkan file gambar/video resolusi bersih (rasio 9:16 untuk Reels/Story atau 4:5 untuk Feed), caption lengkap, akun yang ingin di-mention, lalu unggah langsung atau kirim tautan Google Drive di formulir brief pascatransaksi.',
  },
  {
    id: 'faq-revision-scope',
    category: 'MATERIAL',
    categoryLabel: 'REVISI',
    question: 'Bagaimana alur koordinasi jika ada perbaikan caption atau revisi edit Visit?',
    answer: 'Setelah pembayaran terkonfirmasi, komunikasi langsung ditangani Admin manusia melalui Live Chat web yang terikat pada pesanan Anda—bukan oleh chatbot—sehingga permintaan penyesuaian caption maupun catatan pratinjau tercatat rapi.',
  },
  {
    id: 'faq-visit-included',
    category: 'SCHEDULE',
    categoryLabel: 'VISIT PRODUKSI',
    question: 'Apa saja yang termasuk dalam paket Kunjungan Produksi (Visit)?',
    answer: 'Tim produksi PT Hallopedia datang langsung ke lokasi untuk pengambilan video, pembuatan narasi, penyuntingan video, serta publikasi pada akun media terpilih sesuai rincian paket.',
  },
  {
    id: 'faq-schedule-tracking',
    category: 'SCHEDULE',
    categoryLabel: 'JADWAL',
    question: 'Bagaimana saya tahu kapan iklan tayang atau ada balasan dari Admin?',
    answer: 'Jadwal tayang dan status kunjungan ditampilkan per pesanan, dan sistem mendukung notifikasi web (PWA Push Notification) serta penanda pesan belum dibaca saat Admin mengirim pembaruan.',
  },
  {
    id: 'faq-ai-vs-admin',
    category: 'MATERIAL',
    categoryLabel: 'LAYANAN CHAT',
    question: 'Apa bedanya AI Chatbot dan Live Chat Admin di Hallopedia?',
    answer: 'AI Chatbot membantu konsultasi pra-transaksi seputar harga, paket, dan cakupan akun sebelum Anda memesan. Setelah transaksi berjalan, seluruh koordinasi brief, file Google Drive, dan jadwal ditangani langsung oleh Admin manusia.',
  },
]

export const FOOTER_NAVIGATION: readonly FooterNavItem[] = [
  { number: '01', label: 'Beranda', target: '#hero' },
  { number: '02', label: 'Katalog & Harga Iklan', target: '#katalog' },
  { number: '03', label: 'Jaringan Media Sosial', target: '#media-network' },
  { number: '04', label: 'FAQ Transaksi', target: '#faq' },
]

export const FOOTER_OPERATIONAL_INFO = {
  companyName: 'PT Hallopedia',
  tagline: 'Platform pemesanan layanan periklanan digital, publikasi media lokal, dan produksi konten Kalimantan.',
  coverage: 'Samarinda · Balikpapan · Kalimantan Timur · Kalimantan',
  operatingHours: 'Senin – Sabtu · 09.00 – 17.00 WITA',
  contactEmail: 'admin@hallopedia.id',
  paymentSupportLabel: 'Midtrans Snap (Penuh · DP 50%) & Invoice Resmi',
} as const

