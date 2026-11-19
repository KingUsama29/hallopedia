import type {
  DistributionMode,
  PackagePricingStrategy,
  ServiceType,
} from './catalog.ts'

export interface CustomerProfile {
  id: string
  fullName: string
  email: string
  whatsappNumber: string
  brandName: string
  createdAt: string
}

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'WAITING_INVOICE_APPROVAL'
  | 'DP_PAID'
  | 'PAID'
  | 'INVOICE_APPROVED'
  | 'BRIEF_SUBMITTED'
  | 'SCHEDULED'
  | 'PUBLISHED'
  | 'CANCELLED'

export type PaymentChannel =
  | 'QRIS'
  | 'VA_BCA'
  | 'VA_BRI'
  | 'VA_MANDIRI'
  | 'EWALLET'
  | 'INVOICE'

export type OrderPaymentSummary =
  | {
      scheme: 'FULL'
      totalIdr: number
      paidIdr: number
      remainingIdr: number
      lastChannel: PaymentChannel | null
      paidAt: string | null
    }
  | {
      scheme: 'DP'
      totalIdr: number
      dpAmountIdr: number
      paidIdr: number
      remainingIdr: number
      lastChannel: PaymentChannel | null
      dpPaidAt: string | null
      settledAt: string | null
    }
  | {
      scheme: 'INVOICE'
      totalIdr: number
      companyName: string
      poNumber: string
      approvalStatus: 'PENDING_REVIEW' | 'APPROVED' | 'SETTLED'
      paidIdr: number
      remainingIdr: number
      paidAt: string | null
    }

export type OrderBriefSpec =
  | {
      serviceType: 'DIRECT_POST'
      caption: string
      mentionHandles: string
      ctaLink: string
      preferredPublishDate: string
      preferredPublishTimeWita?: string | null
      notes: string
    }
  | {
      serviceType: 'VISIT_PRODUCTION'
      locationAddress: string
      meetingMapsUrl?: string | null
      picName: string
      picPhone: string
      preferredVisitDate: string
      preferredVisitSlot: string
      preferredVisitTimeWita?: string | null
      keyHighlights: string
    }

export interface OrderMaterialItem {
  id: string
  kind: 'GOOGLE_DRIVE' | 'UPLOADED_FILE'
  label: string
  urlOrFileName: string
  addedAt: string
}

export interface PublicationScheduleItem {
  id: string
  accountId: string
  accountHandle: string
  scheduledAtLabel: string
  scheduledDate?: string | null
  scheduledTimeWita?: string | null
  meetingLocation?: string | null
  status: 'PLANNED' | 'CONFIRMED' | 'PUBLISHED'
  publishedPermalink: string | null
}

export interface OrderChatMessage {
  id: string
  senderRole: 'CUSTOMER' | 'ADMIN' | 'SYSTEM'
  senderName: string
  text: string
  sentAt: string
  readByCustomer: boolean
  readByAdmin: boolean
}

export interface OrderStatusLogItem {
  id: string
  status: OrderStatus
  note: string
  createdAt: string
}

export interface OrderAccountSnapshot {
  id: string
  name: string
  handle: string
  regionLabel: string
  monogram: string
  logoPath?: string
  appliedUnitPriceIdr: number | null
}

export const QUICK_WITA_TIME_SLOTS = ['09:00', '13:00', '16:00', '19:00'] as const

export type OrderSchedulePreference =
  | {
      serviceType: 'DIRECT_POST'
      preferredDate: string | null
      preferredTimeWita: string | null
    }
  | {
      serviceType: 'VISIT_PRODUCTION'
      preferredDate: string | null
      preferredTimeWita: string | null
      meetingLocation: string
      meetingMapsUrl: string | null
    }

export interface OrderRecord {
  id: string
  orderCode: string
  customerId: string
  customerName: string
  customerEmail: string
  customerWhatsapp: string
  brandName: string
  sourcePackageId: string | null
  sourcePackageSku: string | null
  sourceName: string
  pricingStrategy: PackagePricingStrategy
  serviceType: ServiceType
  distributionMode: DistributionMode
  accountsSnapshot: OrderAccountSnapshot[]
  visitBaseFeeIdr: number
  accountsSubtotalIdr: number
  schedulePreference: OrderSchedulePreference
  targetPublishDate: string | null
  initialNotes: string
  status: OrderStatus
  paymentSummary: OrderPaymentSummary
  brief: OrderBriefSpec | null
  materials: OrderMaterialItem[]
  schedules: PublicationScheduleItem[]
  messages: OrderChatMessage[]
  statusLogs: OrderStatusLogItem[]
  createdAt: string
  updatedAt: string
}

export const PAYMENT_CHANNEL_OPTIONS: readonly {
  value: Exclude<PaymentChannel, 'INVOICE'>
  label: string
  hint: string
}[] = [
  { value: 'QRIS', label: 'QRIS Instan', hint: 'Scan via mobile banking atau e-wallet mana pun' },
  { value: 'VA_BCA', label: 'BCA Virtual Account', hint: 'Konfirmasi otomatis nomor VA terdedikasi' },
  { value: 'VA_BRI', label: 'BRI Virtual Account (BRIVA)', hint: 'Mendukung transfer ATM, BRImo & teller' },
  { value: 'VA_MANDIRI', label: 'Mandiri Virtual Account', hint: 'Pembayaran cepat melalui Livin by Mandiri' },
  { value: 'EWALLET', label: 'GoPay / ShopeePay', hint: 'Checkout instan melalui aplikasi e-wallet' },
]

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'MENUNGGU PEMBAYARAN',
  WAITING_INVOICE_APPROVAL: 'MENUNGGU PERSETUJUAN INVOICE',
  DP_PAID: 'DP 50% TERBAYAR',
  PAID: 'LUNAS',
  INVOICE_APPROVED: 'INVOICE DISETUJUI',
  BRIEF_SUBMITTED: 'BRIEF & MATERI DIKIRIM',
  SCHEDULED: 'TERJADWAL',
  PUBLISHED: 'SUDAH TAYANG',
  CANCELLED: 'DIBATALKAN',
}

export function isValidEmail(raw: string): boolean {
  const email = raw.trim()
  return email.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
}

export function normalizeWhatsappNumber(raw: string): string {
  return raw.replace(/[\s\-().]/g, '').trim()
}

export function isValidIndonesianWhatsapp(raw: string): boolean {
  const normalized = normalizeWhatsappNumber(raw)
  return /^(\+62|62|0)8[0-9]{7,12}$/.test(normalized)
}

export function sanitizeGoogleDriveOrHttpsUrl(raw: string): string | null {
  try {
    const parsed = new URL(raw.trim())
    return parsed.protocol === 'https:' ? parsed.toString() : null
  } catch {
    return null
  }
}

export function getLocalTodayIsoDate(now: Date = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isValidTargetDateInput(rawDate: string, todayIso: string = getLocalTodayIsoDate()): boolean {
  const trimmed = rawDate.trim()
  if (!trimmed) return true
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false
  const [y, m, d] = trimmed.split('-').map(Number)
  const parsed = new Date(Date.UTC(y!, m! - 1, d!))
  if (parsed.getUTCFullYear() !== y || parsed.getUTCMonth() !== m! - 1 || parsed.getUTCDate() !== d) {
    return false
  }
  return trimmed >= todayIso
}

export function formatShortDateTime(isoDate: string): string {
  const ts = Date.parse(isoDate)
  if (Number.isNaN(ts)) return isoDate
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ts))
}

export function formatPaymentChannelLabel(channel: PaymentChannel): string {
  if (channel === 'INVOICE') return 'Invoice Resmi'
  const found = PAYMENT_CHANNEL_OPTIONS.find((item) => item.value === channel)
  return found ? found.label : channel
}

export function isValidTimeInput(rawTime: string): boolean {
  const trimmed = rawTime.trim()
  if (!trimmed) return true
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(trimmed)
}

export function isScheduleDateTimeInFuture(
  rawDate: string,
  rawTimeWita?: string | null,
  now: Date = new Date(),
): boolean {
  const date = rawDate.trim()
  if (!date) return true
  const todayIso = getLocalTodayIsoDate(now)
  if (!isValidTargetDateInput(date, todayIso)) return false

  const time = (rawTimeWita ?? '').trim()
  if (!time) return true
  if (!isValidTimeInput(time)) return false

  if (date === todayIso) {
    const currentHHmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    return time >= currentHHmm
  }
  return true
}

export function formatIndonesianFullDateTime(
  dateIso: string | null | undefined,
  timeWita?: string | null,
): string | null {
  const trimmedDate = (dateIso ?? '').trim()
  if (!trimmedDate || !/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) return null
  const [y, m, d] = trimmedDate.split('-').map(Number)
  const parsed = new Date(Date.UTC(y!, m! - 1, d!, 12, 0, 0))
  if (
    parsed.getUTCFullYear() !== y ||
    parsed.getUTCMonth() !== m! - 1 ||
    parsed.getUTCDate() !== d
  ) {
    return null
  }
  const fullDateLabel = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed)
  const trimmedTime = (timeWita ?? '').trim()
  if (trimmedTime && isValidTimeInput(trimmedTime)) {
    return `${fullDateLabel} · Pukul ${trimmedTime.replace(':', '.')} WITA`
  }
  return fullDateLabel
}

export function resolveCheckoutSchedulePreference(
  serviceType: ServiceType,
  input: {
    targetPublishDate: string
    targetPublishTimeWita?: string
    visitMeetingLocation?: string
    visitMeetingMapsUrl?: string
  },
): { ok: true; schedule: OrderSchedulePreference } | { ok: false; error: string } {
  const date = input.targetPublishDate.trim()
  const time = (input.targetPublishTimeWita ?? '').trim()
  if (time && !date) {
    return { ok: false, error: 'Pilih tanggal target terlebih dahulu sebelum menentukan jam.' }
  }
  if (!isValidTimeInput(time)) {
    return { ok: false, error: 'Format jam target tidak valid (gunakan HH:mm WITA).' }
  }
  if (!isScheduleDateTimeInFuture(date, time)) {
    return { ok: false, error: 'Tanggal dan jam target tidak boleh berada di masa lalu.' }
  }
  if (serviceType === 'VISIT_PRODUCTION') {
    const rawMaps = (input.visitMeetingMapsUrl ?? '').trim()
    const safeMaps = rawMaps ? sanitizeGoogleDriveOrHttpsUrl(rawMaps) : null
    if (rawMaps && !safeMaps) {
      return { ok: false, error: 'Tautan Google Maps lokasi pertemuan harus diawali https:// yang valid.' }
    }
    return {
      ok: true,
      schedule: {
        serviceType: 'VISIT_PRODUCTION',
        preferredDate: date || null,
        preferredTimeWita: time || null,
        meetingLocation: (input.visitMeetingLocation ?? '').trim(),
        meetingMapsUrl: safeMaps,
      },
    }
  }
  return {
    ok: true,
    schedule: {
      serviceType: 'DIRECT_POST',
      preferredDate: date || null,
      preferredTimeWita: time || null,
    },
  }
}

