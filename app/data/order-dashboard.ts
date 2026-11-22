import { formatIdr, type PaymentScheme } from './catalog.ts'
import { canSubmitOrderBrief } from './order-workspace.ts'
import {
  formatShortDateTime,
  type OrderPaymentSummary,
  type OrderRecord,
  type OrderStatus,
} from './order-types.ts'

export type OrderDashboardTab =
  | 'ALL'
  | 'ACTION_PAYMENT'
  | 'BRIEF_AND_SCHEDULE'
  | 'COMPLETED'
  | 'CANCELLED'

export type OrderDashboardSort = 'NEWEST' | 'HIGHEST_REMAINING' | 'UNREAD_FIRST'

export interface OrderDashboardFilter {
  tab: OrderDashboardTab
  query: string
  scheme: 'ALL' | PaymentScheme
  unreadOnly: boolean
  sortBy: OrderDashboardSort
}

export interface DashboardOrderMetrics {
  totalOrders: number
  activeOrders: number
  outstandingPaymentIdr: number
  actionPaymentCount: number
  activeProcessCount: number
  completedCount: number
  cancelledCount: number
  unreadAdminMessages: number
}

export interface OrderPaymentMilestone {
  id: string
  stepNumber: string
  title: string
  amountLabel: string
  detailLabel: string
  state: 'DONE' | 'ACTIVE' | 'UPCOMING' | 'CANCELLED'
}

export const ORDER_DASHBOARD_TABS: readonly {
  value: OrderDashboardTab
  label: string
}[] = [
  { value: 'ALL', label: 'SEMUA' },
  { value: 'ACTION_PAYMENT', label: 'PERLU BAYAR / DP' },
  { value: 'BRIEF_AND_SCHEDULE', label: 'BRIEF & TERJADWAL' },
  { value: 'COMPLETED', label: 'SELESAI TAYANG' },
  { value: 'CANCELLED', label: 'DIBATALKAN' },
]

export function countOrderUnreadAdmin(order: Pick<OrderRecord, 'messages'>): number {
  return order.messages.filter((m) => m.senderRole === 'ADMIN' && !m.readByCustomer).length
}

export function matchesOrderTab(order: OrderRecord, tab: OrderDashboardTab): boolean {
  if (tab === 'ALL') return true
  if (tab === 'CANCELLED') return order.status === 'CANCELLED'
  if (tab === 'COMPLETED') return order.status === 'PUBLISHED'
  if (tab === 'ACTION_PAYMENT') {
    if (order.status === 'CANCELLED') return false
    return (
      order.status === 'PENDING_PAYMENT' ||
      order.status === 'WAITING_INVOICE_APPROVAL' ||
      order.paymentSummary.remainingIdr > 0
    )
  }
  return (
    order.status === 'DP_PAID' ||
    order.status === 'PAID' ||
    order.status === 'INVOICE_APPROVED' ||
    order.status === 'BRIEF_SUBMITTED' ||
    order.status === 'SCHEDULED'
  )
}

export function computeDashboardMetrics(orders: readonly OrderRecord[]): DashboardOrderMetrics {
  let outstandingPaymentIdr = 0
  let actionPaymentCount = 0
  let activeProcessCount = 0
  let completedCount = 0
  let cancelledCount = 0
  let unreadAdminMessages = 0

  for (const order of orders) {
    unreadAdminMessages += countOrderUnreadAdmin(order)
    if (order.status === 'CANCELLED') {
      cancelledCount += 1
      continue
    }
    outstandingPaymentIdr += Math.max(0, order.paymentSummary.remainingIdr)
    if (matchesOrderTab(order, 'ACTION_PAYMENT')) actionPaymentCount += 1
    if (matchesOrderTab(order, 'BRIEF_AND_SCHEDULE')) activeProcessCount += 1
    if (order.status === 'PUBLISHED') completedCount += 1
  }

  return {
    totalOrders: orders.length,
    activeOrders: orders.length - cancelledCount,
    outstandingPaymentIdr,
    actionPaymentCount,
    activeProcessCount,
    completedCount,
    cancelledCount,
    unreadAdminMessages,
  }
}

export function filterAndSearchOrders(
  orders: readonly OrderRecord[],
  filter: OrderDashboardFilter,
): OrderRecord[] {
  const needle = filter.query.trim().toLowerCase()
  const filtered = orders.filter((order) => {
    if (!matchesOrderTab(order, filter.tab)) return false
    if (filter.scheme !== 'ALL' && order.paymentSummary.scheme !== filter.scheme) return false
    if (filter.unreadOnly && countOrderUnreadAdmin(order) === 0) return false
    if (!needle) return true
    const haystack = [
      order.orderCode,
      order.sourceName,
      order.brandName,
      ...order.accountsSnapshot.map((a) => `${a.name} ${a.handle}`),
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(needle)
  })

  return [...filtered].sort((a, b) => {
    if (filter.sortBy === 'HIGHEST_REMAINING') {
      const diff = b.paymentSummary.remainingIdr - a.paymentSummary.remainingIdr
      if (diff !== 0) return diff
    } else if (filter.sortBy === 'UNREAD_FIRST') {
      const diff = countOrderUnreadAdmin(b) - countOrderUnreadAdmin(a)
      if (diff !== 0) return diff
    }
    return Date.parse(b.createdAt) - Date.parse(a.createdAt)
  })
}

export function resolveOrderCardAction(order: OrderRecord): {
  primaryLabel: string
  canQuickPay: boolean
  quickPayLabel: string | null
} {
  const canQuickPay =
    order.status !== 'CANCELLED' &&
    order.paymentSummary.scheme !== 'INVOICE' &&
    order.paymentSummary.remainingIdr > 0

  const quickPayLabel = !canQuickPay
    ? null
    : order.paymentSummary.paidIdr === 0
      ? 'BAYAR SEKARANG'
      : 'LUNASI SISA DP'

  if (order.status === 'CANCELLED') {
    return { primaryLabel: 'LIHAT ARSIP', canQuickPay: false, quickPayLabel: null }
  }
  if (!order.brief && canSubmitOrderBrief(order)) {
    return { primaryLabel: 'KIRIM BRIEF & MATERI', canQuickPay, quickPayLabel }
  }
  if (order.status === 'PENDING_PAYMENT') {
    return { primaryLabel: 'DETAIL TAGIHAN', canQuickPay, quickPayLabel }
  }
  return { primaryLabel: 'KELOLA PESANAN', canQuickPay, quickPayLabel }
}

function makeUniqueEventId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

export function canCancelOrder(order: OrderRecord): boolean {
  if (order.status === 'PENDING_PAYMENT') {
    return order.paymentSummary.paidIdr === 0
  }
  return order.status === 'WAITING_INVOICE_APPROVAL'
}

export function applyOrderCancellation(
  order: OrderRecord,
  rawReason?: string,
): { ok: true; order: OrderRecord } | { ok: false; error: string } {
  if (!canCancelOrder(order)) {
    return {
      ok: false,
      error: 'Pesanan yang sudah dibayar atau sedang diproses tidak dapat dibatalkan mandiri.',
    }
  }

  const nowIso = new Date().toISOString()
  const reason = (rawReason ?? '').trim().slice(0, 240)
  const note = reason
    ? `Pesanan dibatalkan oleh pelanggan. Alasan: ${reason}`
    : 'Pesanan dibatalkan oleh pelanggan sebelum pembayaran dikonfirmasi.'

  return {
    ok: true,
    order: {
      ...order,
      status: 'CANCELLED',
      updatedAt: nowIso,
      statusLogs: [{ id: makeUniqueEventId('log-cxl'), status: 'CANCELLED', note, createdAt: nowIso }, ...order.statusLogs],
      messages: [
        ...order.messages,
        {
          id: makeUniqueEventId('msg-cxl'),
          senderRole: 'SYSTEM',
          senderName: 'Sistem Pesanan Hallopedia',
          text: note,
          sentAt: nowIso,
          readByCustomer: true,
          readByAdmin: true,
        },
      ],
    },
  }
}

export type InvoicePreviewAction = 'APPROVE' | 'SETTLE'

export function applyPreviewInvoiceAction(
  order: OrderRecord,
  action: InvoicePreviewAction,
): { ok: true; order: OrderRecord } | { ok: false; error: string } {
  if (order.status === 'CANCELLED') {
    return { ok: false, error: 'Pesanan yang sudah dibatalkan tidak dapat diperbarui.' }
  }
  if (order.paymentSummary.scheme !== 'INVOICE') {
    return { ok: false, error: 'Aksi ini hanya berlaku untuk pesanan dengan skema Invoice Resmi.' }
  }

  const nowIso = new Date().toISOString()
  const syncedMessages = order.messages.map((m) =>
    m.senderRole === 'CUSTOMER' && !m.readByAdmin ? { ...m, readByAdmin: true } : m,
  )

  if (action === 'APPROVE') {
    if (order.paymentSummary.approvalStatus !== 'PENDING_REVIEW') {
      return { ok: false, error: 'Pengajuan Invoice sudah disetujui sebelumnya.' }
    }
    const nextSummary: OrderPaymentSummary = { ...order.paymentSummary, approvalStatus: 'APPROVED' }
    const nextStatus: OrderStatus =
      order.status === 'WAITING_INVOICE_APPROVAL' ? 'INVOICE_APPROVED' : order.status
    const note = `Pengajuan Invoice atas nama ${order.paymentSummary.companyName} telah disetujui Admin.`
    return {
      ok: true,
      order: {
        ...order,
        status: nextStatus,
        paymentSummary: nextSummary,
        updatedAt: nowIso,
        statusLogs: [{ id: makeUniqueEventId('log-inv'), status: nextStatus, note, createdAt: nowIso }, ...order.statusLogs],
        messages: [
          ...syncedMessages,
          {
            id: makeUniqueEventId('msg-adm-inv'),
            senderRole: 'ADMIN',
            senderName: 'Admin Keuangan Hallopedia',
            text: `${note} Kampanye Anda siap diproses sesuai brief & jadwal.`,
            sentAt: nowIso,
            readByCustomer: false,
            readByAdmin: true,
          },
        ],
      },
    }
  }

  if (order.paymentSummary.approvalStatus === 'SETTLED') {
    return { ok: false, error: 'Tagihan Invoice sudah tercatat lunas.' }
  }
  const nextSummary: OrderPaymentSummary = {
    ...order.paymentSummary,
    approvalStatus: 'SETTLED',
    paidIdr: order.paymentSummary.totalIdr,
    remainingIdr: 0,
    paidAt: nowIso,
  }
  const nextStatus: OrderStatus =
    order.status === 'WAITING_INVOICE_APPROVAL' ||
    order.status === 'INVOICE_APPROVED' ||
    order.status === 'PENDING_PAYMENT'
      ? 'PAID'
      : order.status
  const note = `Pelunasan Invoice ${order.orderCode} (${formatIdr(order.paymentSummary.totalIdr)}) terkonfirmasi lunas.`

  return {
    ok: true,
    order: {
      ...order,
      status: nextStatus,
      paymentSummary: nextSummary,
      updatedAt: nowIso,
      statusLogs: [{ id: makeUniqueEventId('log-inv-settle'), status: nextStatus, note, createdAt: nowIso }, ...order.statusLogs],
      messages: [
        ...syncedMessages,
        {
          id: makeUniqueEventId('msg-adm-settle'),
          senderRole: 'ADMIN',
          senderName: 'Admin Keuangan Hallopedia',
          text: `${note} Terima kasih atas pembayaran Anda.`,
          sentAt: nowIso,
          readByCustomer: false,
          readByAdmin: true,
        },
      ],
    },
  }
}

export function buildOrderPaymentMilestones(order: OrderRecord): OrderPaymentMilestone[] {
  const isCancelled = order.status === 'CANCELLED'
  const pay = order.paymentSummary

  if (pay.scheme === 'FULL') {
    const done = pay.paidIdr >= pay.totalIdr && pay.remainingIdr === 0
    return [
      {
        id: 'full-1',
        stepNumber: '01',
        title: 'Pembayaran Penuh (100%)',
        amountLabel: formatIdr(pay.totalIdr),
        detailLabel: done && pay.paidAt ? `Lunas ${formatShortDateTime(pay.paidAt)}` : isCancelled ? 'Dibatalkan' : 'Menunggu penyelesaian via Midtrans',
        state: isCancelled ? 'CANCELLED' : done ? 'DONE' : 'ACTIVE',
      },
    ]
  }

  if (pay.scheme === 'DP') {
    const dpDone = pay.paidIdr >= pay.dpAmountIdr
    const settledDone = pay.remainingIdr === 0
    const remainingAmount = Math.max(0, pay.totalIdr - pay.dpAmountIdr)
    return [
      {
        id: 'dp-1',
        stepNumber: '01',
        title: 'Tahap 1 · Uang Muka (DP 50%)',
        amountLabel: formatIdr(pay.dpAmountIdr),
        detailLabel: dpDone && pay.dpPaidAt ? `Terbayar ${formatShortDateTime(pay.dpPaidAt)}` : isCancelled ? 'Dibatalkan' : 'Menunggu pembayaran awal',
        state: isCancelled ? 'CANCELLED' : dpDone ? 'DONE' : 'ACTIVE',
      },
      {
        id: 'dp-2',
        stepNumber: '02',
        title: 'Tahap 2 · Pelunasan Sisa DP',
        amountLabel: formatIdr(remainingAmount),
        detailLabel: settledDone && pay.settledAt ? `Terlunasi 100% ${formatShortDateTime(pay.settledAt)}` : isCancelled ? 'Dibatalkan' : dpDone ? 'Siap dilunasi sebelum tayang' : 'Menunggu tahap DP awal selesai',
        state: isCancelled ? 'CANCELLED' : settledDone ? 'DONE' : dpDone ? 'ACTIVE' : 'UPCOMING',
      },
    ]
  }

  const approved = pay.approvalStatus === 'APPROVED' || pay.approvalStatus === 'SETTLED'
  const settled = pay.approvalStatus === 'SETTLED'
  return [
    {
      id: 'inv-1',
      stepNumber: '01',
      title: `Pengajuan & Verifikasi (${pay.companyName})`,
      amountLabel: pay.poNumber ? `PO: ${pay.poNumber}` : 'Tanpa No. PO',
      detailLabel: approved ? 'Disetujui Admin Keuangan' : isCancelled ? 'Dibatalkan' : 'Menunggu review Admin',
      state: isCancelled ? 'CANCELLED' : approved ? 'DONE' : 'ACTIVE',
    },
    {
      id: 'inv-2',
      stepNumber: '02',
      title: 'Pelunasan Tagihan Invoice',
      amountLabel: formatIdr(pay.totalIdr),
      detailLabel: settled && pay.paidAt ? `Lunas ${formatShortDateTime(pay.paidAt)}` : isCancelled ? 'Dibatalkan' : approved ? 'Tagihan aktif sesuai termin' : 'Menunggu persetujuan Invoice',
      state: isCancelled ? 'CANCELLED' : settled ? 'DONE' : approved ? 'ACTIVE' : 'UPCOMING',
    },
  ]
}

