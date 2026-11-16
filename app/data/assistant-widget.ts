import {
  DISTRIBUTION_MODE_LABELS,
  PAYMENT_SCHEME_LABELS,
  SERVICE_TYPE_LABELS,
  formatIdr,
  formatPaymentSchemes,
  type CatalogPackage,
  type ConfiguredOrderDraft,
  type MediaAccount,
} from './catalog.ts'
import type { TransactionFaqItem } from './homepage-faq.ts'

export type AssistantTab = 'AI_CHAT' | 'ADMIN_CHAT'
export type ChatSender = 'USER' | 'AI' | 'SYSTEM'

export interface AssistantTemplateChip {
  id: string
  label: string
  promptText: string
}

export interface AiChatMessage {
  id: string
  sender: ChatSender
  text: string
  timeLabel: string
  suggestAdminHandoff?: boolean
}

export interface AdminInquiryItem {
  id: string
  contact: string
  packageContext: string | null
  message: string
  createdAtLabel: string
  status: 'WAITING_ADMIN'
}

export interface LocalAiReply {
  text: string
  suggestAdminHandoff: boolean
}

export const ASSISTANT_TEMPLATE_CHIPS: readonly AssistantTemplateChip[] = [
  {
    id: 'chip-diff',
    label: 'Beda Langsung & Visit',
    promptText: 'Apa beda Publikasi Langsung dan Kunjungan Produksi (Visit)?',
  },
  {
    id: 'chip-price',
    label: 'Harga 1 – 12 Akun',
    promptText: 'Berapa kisaran harga iklan dari 1 akun sampai 12 akun?',
  },
  {
    id: 'chip-payment',
    label: 'Syarat DP & Invoice',
    promptText: 'Bagaimana ketentuan bayar Penuh, DP 50%, dan Invoice?',
  },
  {
    id: 'chip-region',
    label: 'Daftar Akun Daerah',
    promptText: 'Akun media apa saja yang mencakup Samarinda dan Balikpapan?',
  },
]

export function formatCurrentClock(): string {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date())
}

export function buildDraftInquiryPrefill(draft: ConfiguredOrderDraft): string {
  return `Halo Admin, saya ingin menanyakan / melanjutkan draf paket "${draft.sourceName}" (${draft.selectedAccountIds.length} akun, mode ${DISTRIBUTION_MODE_LABELS[draft.distributionMode]}, estimasi ${formatIdr(draft.totalPriceIdr)}, skema ${PAYMENT_SCHEME_LABELS[draft.paymentScheme]}).`
}

function buildAccountDirectorySummary(accounts: readonly MediaAccount[]): LocalAiReply {
  const smd = accounts.filter((a) => a.isActive && a.regionCode === 'SAMARINDA').map((a) => a.handle)
  const bpn = accounts.filter((a) => a.isActive && a.regionCode === 'BALIKPAPAN').map((a) => a.handle)
  const wide = accounts
    .filter((a) => a.isActive && (a.regionCode === 'KALTIM' || a.regionCode === 'KALIMANTAN'))
    .map((a) => a.handle)

  return {
    text: `Total ${accounts.length} akun aktif tersedia:\n• Samarinda (${smd.length}): ${smd.join(', ')}\n• Balikpapan (${bpn.length}): ${bpn.join(', ')}\n• Kaltim & Kalimantan (${wide.length}): ${wide.join(', ')}`,
    suggestAdminHandoff: false,
  }
}

function findMatchingPackage(
  query: string,
  packages: readonly CatalogPackage[],
): CatalogPackage | null {
  for (const pkg of packages) {
    if (query.includes(pkg.sku.toLowerCase())) return pkg
  }
  if (query.includes('dominasi kalimantan')) {
    return packages.find((p) => p.sku === 'HLP-DP-04') ?? null
  }
  if (query.includes('samarinda collab')) {
    return packages.find((p) => p.sku === 'HLP-DP-02') ?? null
  }
  if (query.includes('klaster') && query.includes('balikpapan')) {
    return packages.find((p) => p.sku === 'HLP-DP-03') ?? null
  }
  if (query.includes('publikasi satuan')) {
    return packages.find((p) => p.sku === 'HLP-DP-01') ?? null
  }
  if (query.includes('visit') && query.includes('collab regional')) {
    return packages.find((p) => p.sku === 'HLP-VS-01') ?? null
  }
  if (query.includes('distribusi kaltim')) {
    return packages.find((p) => p.sku === 'HLP-VS-02') ?? null
  }
  return null
}

export function resolveLocalAiReply(
  rawMessage: string,
  accounts: readonly MediaAccount[],
  packages: readonly CatalogPackage[],
  faqs: readonly TransactionFaqItem[],
): LocalAiReply {
  const query = rawMessage.trim().toLowerCase()
  if (!query) {
    return {
      text: 'Ketik pertanyaan atau klik salah satu template di bawah agar langsung masuk ke kolom ketik.',
      suggestAdminHandoff: false,
    }
  }

  // 1. Cek SKU atau nama paket spesifik terlebih dahulu
  const matchedPkg = findMatchingPackage(query, packages)
  if (matchedPkg) {
    const schemeList = formatPaymentSchemes(matchedPkg.paymentSchemes)
    const priceLabel = matchedPkg.pricingStrategy === 'FIXED_PACKAGE' ? 'Harga paket tetap' : 'Estimasi tarif mulai'
    return {
      text: `${matchedPkg.name} (${matchedPkg.sku}): ${priceLabel} ${formatIdr(matchedPkg.priceIdr)} untuk ${matchedPkg.includedAccountIds.length} akun (${SERVICE_TYPE_LABELS[matchedPkg.serviceType]} · ${DISTRIBUTION_MODE_LABELS[matchedPkg.distributionMode]}). Skema bayar tersedia: ${schemeList}.`,
      suggestAdminHandoff: false,
    }
  }

  // 2. Disambiguasi Collab vs Post Terpisah sebelum pencocokan kata "beda"
  if (/(collab|kolaborasi|terpisah|pisah|batas\s*5|maks(?:imal)?\s*5)/.test(query)) {
    return {
      text: 'Mode Collab dibatasi 2 hingga maksimal 5 akun dalam satu postingan bersama (terdiri dari 1 akun host + add-on akun pendamping). Jika ingin menayangkan konten di lebih dari 5 akun (misal seluruh 12 akun), gunakan mode Post Terpisah atau pilih paket tetap Dominasi Kalimantan.',
      suggestAdminHandoff: false,
    }
  }

  // 3. Ketentuan Pembayaran (Penuh, DP 50%, Invoice) sebelum rule umum "beda"
  if (/(bayar|pembayaran|dp|uang muka|invoice|midtrans|qris|lunas|cicil)/.test(query)) {
    const paymentFaq = faqs.find((item) => item.id === 'faq-dp-invoice')
    return {
      text: paymentFaq?.answer ?? 'Pembayaran Penuh 100% dan DP 50% diproses melalui Midtrans, sedangkan Invoice berlaku sesuai ketentuan paket dan persetujuan admin.',
      suggestAdminHandoff: false,
    }
  }

  // 4. Perbedaan Publikasi Langsung vs Kunjungan Produksi (Visit)
  const directPkgs = packages.filter((p) => p.serviceType === 'DIRECT_POST')
  const visitPkgs = packages.filter((p) => p.serviceType === 'VISIT_PRODUCTION')
  const minDirect = directPkgs.length ? Math.min(...directPkgs.map((p) => p.priceIdr)) : 0
  const maxDirect = directPkgs.length ? Math.max(...directPkgs.map((p) => p.priceIdr)) : 0
  const minVisit = visitPkgs.length ? Math.min(...visitPkgs.map((p) => p.priceIdr)) : 0
  const maxVisit = visitPkgs.length ? Math.max(...visitPkgs.map((p) => p.priceIdr)) : 0

  if (/(visit|kunjungan|liputan|syuting|publikasi\s*langsung|(beda|perbedaan).*(langsung|visit|kunjungan|layanan))/.test(query)) {
    return {
      text: `Publikasi Langsung (mulai ${formatIdr(minDirect)}) memakai foto/video & caption siap tayang dari Anda. Visit Produksi (mulai ${formatIdr(minVisit)}) sudah termasuk tim liputan ke lokasi, narasi, editing, dan publikasi.`,
      suggestAdminHandoff: false,
    }
  }

  // 5. Wilayah & Direktori Akun (hindari false-positive kalimat "login akun" / "akun saya")
  if (/(samarinda|balikpapan|kaltim|kalimantan|daerah|wilayah|daftar\s*akun|akun\s*media|media\s*(apa|mana)|instagram\s*(apa|mana|resmi|hallopedia))/.test(query)) {
    return buildAccountDirectorySummary(accounts)
  }

  // 6. Pertanyaan seputar tarif & rentang harga umum
  if (/(harga|biaya|tarif|paket|murah|mahal|berapa|estimasi|custom)/.test(query)) {
    return {
      text: `Rentang tarif katalog aktif:\n• Publikasi Langsung: ${formatIdr(minDirect)} (1 akun) sampai ${formatIdr(maxDirect)} (${accounts.length} akun Kalimantan).\n• Visit Produksi: ${formatIdr(minVisit)} sampai ${formatIdr(maxVisit)}.\nAnda juga bisa menghitung kombinasi custom langsung di bagian Katalog.`,
      suggestAdminHandoff: false,
    }
  }

  // 7. Materi, Revisi, Jadwal & Peran AI vs Admin
  if (/(revisi|perbaikan|caption)/.test(query)) {
    const revFaq = faqs.find((item) => item.id === 'faq-revision-scope')
    if (revFaq) return { text: revFaq.answer, suggestAdminHandoff: false }
  }
  if (/(jadwal|tayang|kapan|jam)/.test(query)) {
    const schedFaq = faqs.find((item) => item.id === 'faq-schedule-tracking')
    if (schedFaq) return { text: schedFaq.answer, suggestAdminHandoff: false }
  }
  if (/(materi|brief|drive|format|video|foto)/.test(query)) {
    const matFaq = faqs.find((item) => item.id === 'faq-material-format')
    if (matFaq) return { text: matFaq.answer, suggestAdminHandoff: false }
  }

  // 8. Fallback: Pertanyaan spesifik / negosiasi / di luar katalog
  return {
    text: 'Pertanyaan spesifik atau permintaan khusus lebih tepat dijawab langsung oleh tim kami. Kirim pertanyaan ini lewat tab Chat Admin agar segera dibalas Admin.',
    suggestAdminHandoff: true,
  }
}

const ADMIN_INQUIRY_STORAGE_KEY = 'hallopedia:admin-inquiries:v1'

export function isValidAdminInquiry(value: unknown): value is AdminInquiryItem {
  if (!value || typeof value !== 'object') return false
  const c = value as Record<string, unknown>
  return (
    typeof c.id === 'string' &&
    typeof c.contact === 'string' &&
    (c.packageContext === null || typeof c.packageContext === 'string') &&
    typeof c.message === 'string' &&
    typeof c.createdAtLabel === 'string' &&
    c.status === 'WAITING_ADMIN'
  )
}

export function loadStoredAdminInquiries(): AdminInquiryItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.sessionStorage.getItem(ADMIN_INQUIRY_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isValidAdminInquiry) : []
  } catch {
    return []
  }
}

export function persistAdminInquiries(items: readonly AdminInquiryItem[]): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(ADMIN_INQUIRY_STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Abaikan jika private mode membatasi sessionStorage
  }
}
