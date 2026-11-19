import {
  ALL_PAYMENT_SCHEMES,
  DISTRIBUTION_MODE_LABELS,
  PAYMENT_SCHEME_LABELS,
  SERVICE_TYPE_LABELS,
  VISIT_COLLAB_OR_SINGLE_BASE_FEE_IDR,
  VISIT_SEPARATE_BASE_FEE_IDR,
  calculateOrderEstimate,
  calculatePayNowAmount,
  getAccountUnitDisplayPrice,
  getAccountsByIds,
  resolveCollabHostAccountId,
  type CatalogPackage,
  type ConfiguredOrderDraft,
  type MediaAccount,
  type PaymentScheme,
} from './catalog.ts'
import {
  formatPaymentChannelLabel,
  isValidEmail,
  isValidIndonesianWhatsapp,
  normalizeWhatsappNumber,
  resolveCheckoutSchedulePreference,
  type CustomerProfile,
  type OrderAccountSnapshot,
  type OrderPaymentSummary,
  type OrderRecord,
  type OrderStatus,
  type PaymentChannel,
} from './order-types.ts'

export * from './order-types.ts'

export interface CheckoutOrderInput {
  customer: CustomerProfile
  draft: ConfiguredOrderDraft
  brandName: string
  contactWhatsapp: string
  paymentScheme: PaymentScheme
  invoiceCompanyName: string
  invoicePoNumber: string
  targetPublishDate: string
  targetPublishTimeWita?: string
  visitMeetingLocation?: string
  visitMeetingMapsUrl?: string
  initialNotes: string
}

export type CheckoutOrderResult =
  | { ok: true; order: OrderRecord }
  | { ok: false; error: string }

export function resolveCheckoutPricing(
  draft: ConfiguredOrderDraft,
  activeAccounts: readonly MediaAccount[],
  activePackages: readonly CatalogPackage[],
  requestedScheme?: PaymentScheme,
) {
  const sourcePackage =
    draft.sourcePackageId || draft.sourcePackageSku
      ? activePackages.find(
          (pkg) =>
            (draft.sourcePackageId && pkg.id === draft.sourcePackageId) ||
            (draft.sourcePackageSku && pkg.sku === draft.sourcePackageSku),
        ) ?? null
      : null

  const allowedSchemes =
    draft.pricingStrategy === 'FIXED_PACKAGE' && sourcePackage?.paymentSchemes.length
      ? sourcePackage.paymentSchemes
      : ALL_PAYMENT_SCHEMES

  const chosen = requestedScheme ?? draft.paymentScheme
  const effectiveScheme = allowedSchemes.includes(chosen) ? chosen : allowedSchemes[0]!
  const resolvedAccounts = getAccountsByIds(draft.selectedAccountIds, activeAccounts)

  const totalIdr = calculateOrderEstimate(
    {
      pricingStrategy: draft.pricingStrategy,
      serviceType: draft.serviceType,
      distributionMode: draft.distributionMode,
      selectedAccountIds: resolvedAccounts.map((a) => a.id),
    },
    activeAccounts,
    sourcePackage,
  )

  const payNowIdr = calculatePayNowAmount(totalIdr, effectiveScheme)
  const remainingIdr =
    effectiveScheme === 'FULL'
      ? 0
      : effectiveScheme === 'DP'
        ? Math.max(0, totalIdr - payNowIdr)
        : totalIdr
  const visitBaseFeeIdr =
    draft.pricingStrategy !== 'FIXED_PACKAGE' && draft.serviceType === 'VISIT_PRODUCTION'
      ? draft.distributionMode === 'SEPARATE_POSTS'
        ? VISIT_SEPARATE_BASE_FEE_IDR
        : VISIT_COLLAB_OR_SINGLE_BASE_FEE_IDR
      : 0
  const accountsSubtotalIdr = Math.max(0, totalIdr - visitBaseFeeIdr)

  return {
    sourcePackage,
    allowedSchemes,
    effectiveScheme,
    totalIdr,
    visitBaseFeeIdr,
    accountsSubtotalIdr,
    payNowIdr,
    remainingIdr,
    resolvedAccounts,
  }
}

export function createOrderRecordFromCheckout(
  input: CheckoutOrderInput,
  activeAccounts: readonly MediaAccount[],
  activePackages: readonly CatalogPackage[],
): CheckoutOrderResult {
  if (!input.customer.id || !isValidEmail(input.customer.email)) {
    return { ok: false, error: 'Sesi pelanggan tidak valid. Silakan masuk ulang.' }
  }

  const brandName = input.brandName.trim() || input.customer.brandName.trim() || input.customer.fullName.trim()
  if (brandName.length < 2) {
    return { ok: false, error: 'Nama brand atau pemesan minimal 2 karakter.' }
  }
  if (!isValidIndonesianWhatsapp(input.contactWhatsapp)) {
    return { ok: false, error: 'Nomor WhatsApp aktif tidak valid (contoh: 081234567890).' }
  }
  const scheduleRes = resolveCheckoutSchedulePreference(input.draft.serviceType, input)
  if (!scheduleRes.ok) {
    return { ok: false, error: scheduleRes.error }
  }

  const pricing = resolveCheckoutPricing(input.draft, activeAccounts, activePackages, input.paymentScheme)
  if (!pricing.resolvedAccounts.length || pricing.totalIdr <= 0) {
    return { ok: false, error: 'Komposisi akun paket tidak valid atau kosong.' }
  }

  const companyName = input.invoiceCompanyName.trim()
  if (pricing.effectiveScheme === 'INVOICE' && companyName.length < 2) {
    return { ok: false, error: 'Nama Perusahaan / Instansi wajib diisi untuk pengajuan Invoice Resmi.' }
  }

  const hostAccountId =
    input.draft.distributionMode === 'COLLAB_POST'
      ? resolveCollabHostAccountId(
          pricing.resolvedAccounts.map((a) => a.id),
          activeAccounts,
        )
      : null

  const accountsSnapshot: OrderAccountSnapshot[] = pricing.resolvedAccounts.map((account) => ({
    id: account.id,
    name: account.name,
    handle: account.handle,
    regionLabel: account.regionLabel,
    monogram: account.monogram,
    logoPath: account.logoPath,
    appliedUnitPriceIdr:
      input.draft.pricingStrategy === 'FIXED_PACKAGE'
        ? null
        : getAccountUnitDisplayPrice(
            account,
            input.draft.serviceType,
            input.draft.distributionMode,
            account.id === hostAccountId,
          ),
  }))

  const nowIso = new Date().toISOString()
  const stamp = nowIso.slice(2, 10).replace(/-/g, '')
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
  const orderId = `ord-${Date.now()}-${suffix.toLowerCase()}`
  const orderCode = `HLP-${stamp}-${suffix}`

  const isInvoice = pricing.effectiveScheme === 'INVOICE'
  const status: OrderStatus = isInvoice ? 'WAITING_INVOICE_APPROVAL' : 'PENDING_PAYMENT'

  let paymentSummary: OrderPaymentSummary
  if (pricing.effectiveScheme === 'FULL') {
    paymentSummary = {
      scheme: 'FULL',
      totalIdr: pricing.totalIdr,
      paidIdr: 0,
      remainingIdr: pricing.totalIdr,
      lastChannel: null,
      paidAt: null,
    }
  } else if (pricing.effectiveScheme === 'DP') {
    paymentSummary = {
      scheme: 'DP',
      totalIdr: pricing.totalIdr,
      dpAmountIdr: pricing.payNowIdr,
      paidIdr: 0,
      remainingIdr: pricing.totalIdr,
      lastChannel: null,
      dpPaidAt: null,
      settledAt: null,
    }
  } else {
    paymentSummary = {
      scheme: 'INVOICE',
      totalIdr: pricing.totalIdr,
      companyName,
      poNumber: input.invoicePoNumber.trim(),
      approvalStatus: 'PENDING_REVIEW',
      paidIdr: 0,
      remainingIdr: pricing.totalIdr,
      paidAt: null,
    }
  }

  const serviceDesc = `${SERVICE_TYPE_LABELS[input.draft.serviceType]} · ${DISTRIBUTION_MODE_LABELS[input.draft.distributionMode]}`
  const initialNoteText = isInvoice
    ? `Pengajuan Invoice atas nama ${companyName} untuk ${input.draft.sourceName} — ${serviceDesc} — menunggu verifikasi admin.`
    : `Pesanan ${input.draft.sourceName} — ${serviceDesc} — dibuat dengan skema ${PAYMENT_SCHEME_LABELS[pricing.effectiveScheme]}.`

  return {
    ok: true,
    order: {
      id: orderId,
      orderCode,
      customerId: input.customer.id,
      customerName: input.customer.fullName,
      customerEmail: input.customer.email,
      customerWhatsapp: normalizeWhatsappNumber(input.contactWhatsapp),
      brandName,
      sourcePackageId: input.draft.sourcePackageId,
      sourcePackageSku: input.draft.sourcePackageSku,
      sourceName: input.draft.sourceName,
      pricingStrategy: input.draft.pricingStrategy,
      serviceType: input.draft.serviceType,
      distributionMode: input.draft.distributionMode,
      accountsSnapshot,
      visitBaseFeeIdr: pricing.visitBaseFeeIdr,
      accountsSubtotalIdr: pricing.accountsSubtotalIdr,
      schedulePreference: scheduleRes.schedule,
      targetPublishDate: scheduleRes.schedule.preferredDate,
      initialNotes: input.initialNotes.trim(),
      status,
      paymentSummary,
      brief: null,
      materials: [],
      schedules: [],
      messages: [
        {
          id: `msg-${Date.now()}`,
          senderRole: 'SYSTEM',
          senderName: 'Sistem Pesanan Hallopedia',
          text: initialNoteText,
          sentAt: nowIso,
          readByCustomer: true,
          readByAdmin: true,
        },
      ],
      statusLogs: [
        {
          id: `log-${Date.now()}`,
          status,
          note: initialNoteText,
          createdAt: nowIso,
        },
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  }
}

export function applySimulatedMidtransPayment(
  order: OrderRecord,
  channel: Exclude<PaymentChannel, 'INVOICE'>,
  outcome: 'SUCCESS' | 'PENDING',
): OrderRecord {
  const nowIso = new Date().toISOString()
  if (order.paymentSummary.scheme === 'INVOICE') {
    return order
  }
  const channelLabel = formatPaymentChannelLabel(channel)

  if (outcome === 'PENDING') {
    const nextSummary: OrderPaymentSummary = {
      ...order.paymentSummary,
      lastChannel: channel,
    }
    const pendingNote = `Instruksi pembayaran via ${channelLabel} disimpan dalam status menunggu penyelesaian.`
    return {
      ...order,
      paymentSummary: nextSummary,
      updatedAt: nowIso,
      statusLogs: [
        { id: `log-${Date.now()}`, status: order.status, note: pendingNote, createdAt: nowIso },
        ...order.statusLogs,
      ],
    }
  }

  if (order.paymentSummary.scheme === 'FULL') {
    const nextSummary: OrderPaymentSummary = {
      scheme: 'FULL',
      totalIdr: order.paymentSummary.totalIdr,
      paidIdr: order.paymentSummary.totalIdr,
      remainingIdr: 0,
      lastChannel: channel,
      paidAt: nowIso,
    }
    const note = `Pembayaran penuh terkonfirmasi melalui pratinjau ${channelLabel}.`
    return {
      ...order,
      status: 'PAID',
      paymentSummary: nextSummary,
      updatedAt: nowIso,
      statusLogs: [
        { id: `log-${Date.now()}`, status: 'PAID', note, createdAt: nowIso },
        ...order.statusLogs,
      ],
      messages: [
        ...order.messages,
        {
          id: `msg-${Date.now()}`,
          senderRole: 'SYSTEM',
          senderName: 'Sistem Pembayaran',
          text: `${note} Anda siap melanjutkan pengiriman brief & materi kampanye.`,
          sentAt: nowIso,
          readByCustomer: true,
          readByAdmin: true,
        },
      ],
    }
  }

  const payingRemaining = order.paymentSummary.paidIdr > 0 && order.paymentSummary.remainingIdr > 0
  if (payingRemaining) {
    const nextSummary: OrderPaymentSummary = {
      ...order.paymentSummary,
      paidIdr: order.paymentSummary.totalIdr,
      remainingIdr: 0,
      lastChannel: channel,
      settledAt: nowIso,
    }
    const nextStatus: OrderStatus =
      order.status === 'DP_PAID' || order.status === 'PENDING_PAYMENT' ? 'PAID' : order.status
    const note = `Pelunasan sisa pembayaran DP terkonfirmasi melalui pratinjau ${channelLabel}.`
    return {
      ...order,
      status: nextStatus,
      paymentSummary: nextSummary,
      updatedAt: nowIso,
      statusLogs: [
        { id: `log-${Date.now()}`, status: nextStatus, note, createdAt: nowIso },
        ...order.statusLogs,
      ],
    }
  }

  const dpPaid = order.paymentSummary.dpAmountIdr
  const remaining = Math.max(0, order.paymentSummary.totalIdr - dpPaid)
  const nextSummary: OrderPaymentSummary = {
    ...order.paymentSummary,
    paidIdr: dpPaid,
    remainingIdr: remaining,
    lastChannel: channel,
    dpPaidAt: nowIso,
  }
  const note = `Uang muka (DP 50%) terkonfirmasi melalui pratinjau ${channelLabel}. Sisa pelunasan Rp ${remaining.toLocaleString('id-ID')}.`
  return {
    ...order,
    status: 'DP_PAID',
    paymentSummary: nextSummary,
    updatedAt: nowIso,
    statusLogs: [
      { id: `log-${Date.now()}`, status: 'DP_PAID', note, createdAt: nowIso },
      ...order.statusLogs,
    ],
    messages: [
      ...order.messages,
      {
        id: `msg-${Date.now()}`,
        senderRole: 'SYSTEM',
        senderName: 'Sistem Pembayaran',
        text: `${note} Anda sudah dapat mengirim brief & materi iklan.`,
        sentAt: nowIso,
        readByCustomer: true,
        readByAdmin: true,
      },
    ],
  }
}
