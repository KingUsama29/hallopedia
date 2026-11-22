import assert from 'node:assert/strict'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { CATALOG_PACKAGES, MEDIA_ACCOUNTS, normalizeOrderDraft } from '../app/data/catalog.ts'
import {
  applyOrderCancellation,
  applyPreviewInvoiceAction,
  buildOrderPaymentMilestones,
  canCancelOrder,
  computeDashboardMetrics,
  filterAndSearchOrders,
  resolveOrderCardAction,
} from '../app/data/order-dashboard.ts'
import {
  ORDER_STATUS_LABELS,
  applySimulatedMidtransPayment,
  createOrderRecordFromCheckout,
  formatIndonesianFullDateTime,
  formatPaymentChannelLabel,
  getLocalTodayIsoDate,
  isValidEmail,
  isValidIndonesianWhatsapp,
  isValidTargetDateInput,
  isValidTimeInput,
  resolveCheckoutPricing,
  resolveCheckoutSchedulePreference,
  sanitizeGoogleDriveOrHttpsUrl,
} from '../app/data/orders.ts'
import {
  applyOrderBriefSubmission,
  buildInitialBriefDraft,
  canSubmitOrderBrief,
  createDriveMaterialItem,
  createLocalFileMaterialItem,
  normalizeStoredOrderRecord,
} from '../app/data/order-workspace.ts'
import {
  appendCustomerChatMessage,
  applyPreviewAdminAction,
  markAdminMessagesRead,
} from '../app/data/order-chat-preview.ts'

console.log('=== Verifikasi Kontrak Checkout, Pembayaran & Portal Pelanggan (2A) ===\n')

const mockCustomer = {
  id: 'cust-test-01',
  fullName: 'Aulia Rahman',
  email: 'aulia@kopimahakam.id',
  whatsappNumber: '081234567890',
  brandName: 'Kopi Mahakam',
  createdAt: '2026-11-17T00:00:00Z',
}

// 1. Validasi Input Kontak & URL Materi
assert.equal(isValidEmail('aulia@kopimahakam.id'), true)
assert.equal(isValidEmail('invalid-email'), false)
assert.equal(isValidIndonesianWhatsapp('0812-3456-7890'), true)
assert.equal(isValidIndonesianWhatsapp('+6281234567890'), true)
assert.equal(isValidIndonesianWhatsapp('12345'), false)
assert.equal(
  sanitizeGoogleDriveOrHttpsUrl('https://drive.google.com/drive/folders/abc123'),
  'https://drive.google.com/drive/folders/abc123',
)
assert.equal(sanitizeGoogleDriveOrHttpsUrl('http://drive.google.com/file/1'), null)
assert.equal(sanitizeGoogleDriveOrHttpsUrl('javascript:alert(1)'), null)
assert.equal(isValidTargetDateInput('', '2026-11-19'), true)
assert.equal(isValidTargetDateInput('2026-11-25', '2026-11-19'), true)
assert.equal(isValidTargetDateInput('2026-11-18', '2026-11-19'), false, 'Tanggal masa lalu wajib ditolak')
assert.equal(isValidTargetDateInput('2026-02-31', '2026-11-19'), false, 'Tanggal kalender tidak valid wajib ditolak')
assert.match(getLocalTodayIsoDate(new Date('2026-11-19T12:00:00Z')), /^\d{4}-\d{2}-\d{2}$/)
assert.equal(isValidTimeInput('19:00'), true)
assert.equal(isValidTimeInput('25:99'), false)
assert.equal(formatPaymentChannelLabel('VA_BCA'), 'BCA Virtual Account')
assert.equal(formatPaymentChannelLabel('QRIS'), 'QRIS Instan')
const formattedFull = formatIndonesianFullDateTime('2026-12-15', '19:00')
assert.ok(
  formattedFull &&
    formattedFull.includes('Selasa') &&
    formattedFull.includes('15') &&
    formattedFull.includes('Desember') &&
    formattedFull.includes('2026') &&
    formattedFull.includes('19.00 WITA'),
  `Format hari/tanggal/jam harus lengkap, aktual: ${formattedFull}`,
)
console.log('[PASS] Validasi email, WhatsApp Indonesia, tanggal/jam WITA, label kanal & sanitasi HTTPS terverifikasi.')

// 2. Pembentukan Order DP 50% + Simulasi Pending + DP Terbayar + Pelunasan Sisa DP
const bpnPackage = CATALOG_PACKAGES.find((p) => p.sku === 'HLP-DP-03')
assert.ok(bpnPackage, 'Paket HLP-DP-03 harus tersedia')

const bpnDraft = normalizeOrderDraft(
  {
    sourcePackageId: bpnPackage.id,
    sourcePackageSku: bpnPackage.sku,
    sourceName: bpnPackage.name,
    pricingStrategy: bpnPackage.pricingStrategy,
    serviceType: bpnPackage.serviceType,
    distributionMode: bpnPackage.distributionMode,
    selectedAccountIds: bpnPackage.includedAccountIds,
    paymentScheme: 'DP',
    totalPriceIdr: 1, // Sengaja diisi salah untuk menguji kalkulasi ulang anti-tamper
    payNowIdr: 1,
  },
  MEDIA_ACCOUNTS,
  CATALOG_PACKAGES,
)

const dpOrderRes = createOrderRecordFromCheckout(
  {
    customer: mockCustomer,
    draft: bpnDraft,
    brandName: 'Kopi Mahakam',
    contactWhatsapp: '0812-3456-7890',
    paymentScheme: 'DP',
    invoiceCompanyName: '',
    invoicePoNumber: '',
    targetPublishDate: '2026-12-01',
    initialNotes: 'Promo opening cabang',
  },
  MEDIA_ACCOUNTS,
  CATALOG_PACKAGES,
)
assert.equal(dpOrderRes.ok, true)
if (dpOrderRes.ok) {
  assert.equal(dpOrderRes.order.status, 'PENDING_PAYMENT')
  assert.equal(dpOrderRes.order.paymentSummary.scheme, 'DP')
  assert.equal(dpOrderRes.order.paymentSummary.totalIdr, 750_000)
  assert.equal(dpOrderRes.order.paymentSummary.dpAmountIdr, 375_000)
  assert.equal(dpOrderRes.order.accountsSnapshot.length, 3)

  const pendingStep = applySimulatedMidtransPayment(dpOrderRes.order, 'VA_BCA', 'PENDING')
  assert.equal(pendingStep.status, 'PENDING_PAYMENT')
  assert.equal(pendingStep.paymentSummary.paidIdr, 0)
  assert.ok(
    pendingStep.statusLogs[0]?.note.includes('BCA Virtual Account') &&
      !pendingStep.statusLogs[0]?.note.includes('VA_BCA'),
    'Log pembayaran wajib memakai label manusiawi (BCA Virtual Account), bukan enum VA_BCA',
  )

  const dpPaidStep = applySimulatedMidtransPayment(pendingStep, 'QRIS', 'SUCCESS')
  assert.equal(dpPaidStep.status, 'DP_PAID')
  assert.equal(dpPaidStep.paymentSummary.paidIdr, 375_000)
  assert.equal(dpPaidStep.paymentSummary.remainingIdr, 375_000)
  assert.ok(
    dpPaidStep.statusLogs[0]?.note.includes('QRIS Instan'),
    'Log DP terbayar wajib mencantumkan QRIS Instan',
  )

  const settledStep = applySimulatedMidtransPayment(dpPaidStep, 'QRIS', 'SUCCESS')
  assert.equal(settledStep.status, 'PAID')
  assert.equal(settledStep.paymentSummary.paidIdr, 750_000)
  assert.equal(settledStep.paymentSummary.remainingIdr, 0)
}
console.log('[PASS] Checkout DP 50%, pending, DP terbayar, dan pelunasan sisa DP lulus.')

// 3. Wajib Nama Perusahaan / Instansi pada Skema INVOICE
const invalidInvoice = createOrderRecordFromCheckout(
  {
    customer: mockCustomer,
    draft: bpnDraft,
    brandName: 'Kopi Mahakam',
    contactWhatsapp: '081234567890',
    paymentScheme: 'INVOICE',
    invoiceCompanyName: ' ',
    invoicePoNumber: '',
    targetPublishDate: '',
    initialNotes: '',
  },
  MEDIA_ACCOUNTS,
  CATALOG_PACKAGES,
)
assert.equal(invalidInvoice.ok, false, 'Invoice tanpa Nama Perusahaan/Instansi wajib ditolak')

const validInvoice = createOrderRecordFromCheckout(
  {
    customer: mockCustomer,
    draft: bpnDraft,
    brandName: 'Kopi Mahakam',
    contactWhatsapp: '081234567890',
    paymentScheme: 'INVOICE',
    invoiceCompanyName: 'PT Kaltim Maju Bersama',
    invoicePoNumber: 'PO-2026-09',
    targetPublishDate: '',
    initialNotes: '',
  },
  MEDIA_ACCOUNTS,
  CATALOG_PACKAGES,
)
assert.equal(validInvoice.ok, true)
if (validInvoice.ok) {
  assert.equal(validInvoice.order.status, 'WAITING_INVOICE_APPROVAL')
  assert.equal(validInvoice.order.paymentSummary.scheme, 'INVOICE')
  if (validInvoice.order.paymentSummary.scheme === 'INVOICE') {
    assert.equal(validInvoice.order.paymentSummary.companyName, 'PT Kaltim Maju Bersama')
    assert.equal(validInvoice.order.paymentSummary.approvalStatus, 'PENDING_REVIEW')
  }
}
console.log('[PASS] Validasi wajib Nama Instansi dan status WAITING_INVOICE_APPROVAL lulus.')

// 4. Pembayaran Penuh (FULL) + Verifikasi Lock FIXED_PACKAGE
const fixedPkg = CATALOG_PACKAGES.find((p) => p.sku === 'HLP-DP-04')
assert.ok(fixedPkg)
const pricingCheck = resolveCheckoutPricing(
  normalizeOrderDraft(
    {
      sourcePackageId: fixedPkg.id,
      sourcePackageSku: fixedPkg.sku,
      sourceName: fixedPkg.name,
      pricingStrategy: 'FIXED_PACKAGE',
      serviceType: fixedPkg.serviceType,
      distributionMode: fixedPkg.distributionMode,
      selectedAccountIds: fixedPkg.includedAccountIds,
      paymentScheme: 'FULL',
      totalPriceIdr: fixedPkg.priceIdr,
      payNowIdr: fixedPkg.priceIdr,
    },
    MEDIA_ACCOUNTS,
    CATALOG_PACKAGES,
  ),
  MEDIA_ACCOUNTS,
  CATALOG_PACKAGES,
  'FULL',
)
assert.equal(pricingCheck.totalIdr, 2_400_000)
assert.equal(pricingCheck.visitBaseFeeIdr, 0)
assert.equal(pricingCheck.accountsSubtotalIdr, 2_400_000)
assert.equal(pricingCheck.payNowIdr, 2_400_000)
assert.equal(pricingCheck.remainingIdr, 0)
assert.ok(ORDER_STATUS_LABELS.WAITING_INVOICE_APPROVAL.length > 0)

const fixedOrder = createOrderRecordFromCheckout(
  {
    customer: mockCustomer,
    draft: normalizeOrderDraft(
      {
        sourcePackageId: fixedPkg.id,
        sourcePackageSku: fixedPkg.sku,
        sourceName: fixedPkg.name,
        pricingStrategy: 'FIXED_PACKAGE',
        serviceType: fixedPkg.serviceType,
        distributionMode: fixedPkg.distributionMode,
        selectedAccountIds: fixedPkg.includedAccountIds,
        paymentScheme: 'FULL',
        totalPriceIdr: fixedPkg.priceIdr,
        payNowIdr: fixedPkg.priceIdr,
      },
      MEDIA_ACCOUNTS,
      CATALOG_PACKAGES,
    ),
    brandName: 'Kopi Mahakam',
    contactWhatsapp: '081234567890',
    paymentScheme: 'FULL',
    invoiceCompanyName: '',
    invoicePoNumber: '',
    targetPublishDate: '',
    initialNotes: '',
  },
  MEDIA_ACCOUNTS,
  CATALOG_PACKAGES,
)
assert.equal(fixedOrder.ok, true)
if (fixedOrder.ok) {
  assert.equal(fixedOrder.order.accountsSnapshot[0]?.appliedUnitPriceIdr, null, 'FIXED_PACKAGE tidak boleh membagi rata harga per akun fiktif')
}

// 5. Verifikasi Rincian Biaya Dasar Kru Visit Produksi (HLP-VS-01 & HLP-VS-02) + Reject Tanggal Lampau
const vs1Pkg = CATALOG_PACKAGES.find((p) => p.sku === 'HLP-VS-01')
assert.ok(vs1Pkg)
const vs1Order = createOrderRecordFromCheckout(
  {
    customer: mockCustomer,
    draft: normalizeOrderDraft(
      {
        sourcePackageId: vs1Pkg.id,
        sourcePackageSku: vs1Pkg.sku,
        sourceName: vs1Pkg.name,
        pricingStrategy: vs1Pkg.pricingStrategy,
        serviceType: vs1Pkg.serviceType,
        distributionMode: vs1Pkg.distributionMode,
        selectedAccountIds: vs1Pkg.includedAccountIds,
        paymentScheme: 'DP',
        totalPriceIdr: vs1Pkg.priceIdr,
        payNowIdr: 0,
      },
      MEDIA_ACCOUNTS,
      CATALOG_PACKAGES,
    ),
    brandName: 'Kopi Mahakam',
    contactWhatsapp: '081234567890',
    paymentScheme: 'DP',
    invoiceCompanyName: '',
    invoicePoNumber: '',
    targetPublishDate: '',
    initialNotes: '',
  },
  MEDIA_ACCOUNTS,
  CATALOG_PACKAGES,
)
assert.equal(vs1Order.ok, true)
if (vs1Order.ok) {
  const sumSnapshot = vs1Order.order.accountsSnapshot.reduce((sum, a) => sum + (a.appliedUnitPriceIdr ?? 0), 0)
  assert.equal(vs1Order.order.visitBaseFeeIdr, 1_600_000)
  assert.equal(vs1Order.order.accountsSubtotalIdr, 1_150_000)
  assert.equal(sumSnapshot, 1_150_000)
  assert.equal(vs1Order.order.visitBaseFeeIdr + sumSnapshot, vs1Order.order.paymentSummary.totalIdr)
}

const pastDateAttempt = createOrderRecordFromCheckout(
  {
    customer: mockCustomer,
    draft: bpnDraft,
    brandName: 'Kopi Mahakam',
    contactWhatsapp: '081234567890',
    paymentScheme: 'FULL',
    invoiceCompanyName: '',
    invoicePoNumber: '',
    targetPublishDate: '2020-01-01',
    initialNotes: '',
  },
  MEDIA_ACCOUNTS,
  CATALOG_PACKAGES,
)
assert.equal(pastDateAttempt.ok, false, 'Checkout dengan tanggal masa lalu wajib ditolak')

const timeWithoutDateAttempt = createOrderRecordFromCheckout(
  {
    customer: mockCustomer,
    draft: bpnDraft,
    brandName: 'Kopi Mahakam',
    contactWhatsapp: '081234567890',
    paymentScheme: 'FULL',
    invoiceCompanyName: '',
    invoicePoNumber: '',
    targetPublishDate: '',
    targetPublishTimeWita: '14:00',
    initialNotes: '',
  },
  MEDIA_ACCOUNTS,
  CATALOG_PACKAGES,
)
assert.equal(timeWithoutDateAttempt.ok, false, 'Jam target tanpa tanggal wajib ditolak')

const badMapsUrlAttempt = resolveCheckoutSchedulePreference('VISIT_PRODUCTION', {
  targetPublishDate: '2026-12-20',
  targetPublishTimeWita: '10:00',
  visitMeetingLocation: 'Outlet Borneo Rasa',
  visitMeetingMapsUrl: 'http://maps.google.com/?q=Samarinda',
})
assert.equal(badMapsUrlAttempt.ok, false, 'URL Maps non-HTTPS wajib ditolak')

const visitWithLocation = createOrderRecordFromCheckout(
  {
    customer: mockCustomer,
    draft: normalizeOrderDraft(
      {
        sourcePackageId: vs1Pkg.id,
        sourcePackageSku: vs1Pkg.sku,
        sourceName: vs1Pkg.name,
        pricingStrategy: vs1Pkg.pricingStrategy,
        serviceType: vs1Pkg.serviceType,
        distributionMode: vs1Pkg.distributionMode,
        selectedAccountIds: vs1Pkg.includedAccountIds,
        paymentScheme: 'FULL',
        totalPriceIdr: vs1Pkg.priceIdr,
        payNowIdr: vs1Pkg.priceIdr,
      },
      MEDIA_ACCOUNTS,
      CATALOG_PACKAGES,
    ),
    brandName: 'Borneo Rasa Culinary',
    contactWhatsapp: '081234567890',
    paymentScheme: 'FULL',
    invoiceCompanyName: '',
    invoicePoNumber: '',
    targetPublishDate: '2026-12-20',
    targetPublishTimeWita: '10:00',
    visitMeetingLocation: 'Outlet Borneo Rasa, Jl. Antasari No. 12, Samarinda',
    visitMeetingMapsUrl: 'https://maps.google.com/?q=Samarinda',
    initialNotes: 'Liputan menu signature pagi hari',
  },
  MEDIA_ACCOUNTS,
  CATALOG_PACKAGES,
)
assert.equal(visitWithLocation.ok, true)
if (visitWithLocation.ok) {
  assert.equal(visitWithLocation.order.schedulePreference.serviceType, 'VISIT_PRODUCTION')
  if (visitWithLocation.order.schedulePreference.serviceType === 'VISIT_PRODUCTION') {
    assert.equal(visitWithLocation.order.schedulePreference.preferredDate, '2026-12-20')
    assert.equal(visitWithLocation.order.schedulePreference.preferredTimeWita, '10:00')
    assert.equal(
      visitWithLocation.order.schedulePreference.meetingLocation,
      'Outlet Borneo Rasa, Jl. Antasari No. 12, Samarinda',
    )
    assert.equal(
      visitWithLocation.order.schedulePreference.meetingMapsUrl,
      'https://maps.google.com/?q=Samarinda',
    )
  }
}
console.log('[PASS] Kalkulasi FULL, FIXED_PACKAGE tanpa pembulatan, rincian Visit Base Fee, jadwal WITA & lokasi Visit terverifikasi.')

// 6. Tahap 2B: Workspace Pascatransaksi (Brief Direct vs Visit, Materi Google Drive/File, Jadwal WITA & Live Chat Admin)
assert.equal(canSubmitOrderBrief(dpOrderRes.order), false, 'Order PENDING_PAYMENT tidak boleh langsung mengirim brief')
const lockedBriefAttempt = applyOrderBriefSubmission(dpOrderRes.order, {
  brief: buildInitialBriefDraft(dpOrderRes.order),
  materials: [],
})
assert.equal(lockedBriefAttempt.ok, false)

const paidVisitOrder = applySimulatedMidtransPayment(visitWithLocation.order, 'QRIS', 'SUCCESS')
assert.equal(paidVisitOrder.status, 'PAID')
assert.equal(canSubmitOrderBrief(paidVisitOrder), true)

const prefilledVisitBrief = buildInitialBriefDraft(paidVisitOrder)
assert.equal(prefilledVisitBrief.serviceType, 'VISIT_PRODUCTION')
if (prefilledVisitBrief.serviceType === 'VISIT_PRODUCTION') {
  assert.equal(prefilledVisitBrief.locationAddress, 'Outlet Borneo Rasa, Jl. Antasari No. 12, Samarinda')
  assert.equal(prefilledVisitBrief.meetingMapsUrl, 'https://maps.google.com/?q=Samarinda')
  assert.equal(prefilledVisitBrief.preferredVisitDate, '2026-12-20')
  assert.equal(prefilledVisitBrief.preferredVisitTimeWita, '10:00')
}

const badDriveMat = createDriveMaterialItem('Materi', 'http://drive.google.com/non-https')
assert.equal(badDriveMat.ok, false, 'Google Drive non-HTTPS wajib ditolak')
const goodDriveMat = createDriveMaterialItem('Folder Foto Produk', 'https://drive.google.com/drive/folders/promo2026')
const localFileMat = createLocalFileMaterialItem('brief-visual.pdf', 1_572_864)
assert.equal(goodDriveMat.ok, true)
assert.equal(localFileMat.ok, true)

const submittedVisit = applyOrderBriefSubmission(paidVisitOrder, {
  brief: prefilledVisitBrief,
  materials: [
    ...(goodDriveMat.ok ? [goodDriveMat.item] : []),
    ...(localFileMat.ok ? [localFileMat.item] : []),
  ],
})
assert.equal(submittedVisit.ok, true)
if (submittedVisit.ok) {
  assert.equal(submittedVisit.order.status, 'BRIEF_SUBMITTED')
  assert.equal(submittedVisit.order.schedules.length, 5)
  assert.equal(submittedVisit.order.materials.length, 2)
  assert.equal(submittedVisit.order.schedules[0]?.status, 'PLANNED')
  assert.ok(submittedVisit.order.schedules[0]?.scheduledAtLabel.includes('10.00 WITA'))

  // Live Chat Admin + Centang 2 Dibaca Admin (readByAdmin) + Unread Counter + Mark Read
  const chatCust = appendCustomerChatMessage(submittedVisit.order, 'Halo Admin, materi Drive sudah diunggah.')
  assert.equal(chatCust.ok, true)
  if (chatCust.ok) {
    const lastCustMsg = chatCust.order.messages[chatCust.order.messages.length - 1]
    assert.equal(lastCustMsg?.readByAdmin, false, 'Pesan baru pelanggan wajib berstatus centang 2 abu (belum dibaca Admin)')

    const adminReadOnly = applyPreviewAdminAction(chatCust.order, {
      type: 'MARK_CUSTOMER_MESSAGES_READ',
    })
    assert.equal(adminReadOnly.ok, true)
    if (adminReadOnly.ok) {
      const custMsgAfterRead = adminReadOnly.order.messages.find((m) => m.id === lastCustMsg?.id)
      assert.equal(custMsgAfterRead?.readByAdmin, true, 'Setelah dibaca Admin wajib berubah menjadi centang 2 nyala')
    }

    const adminReplied = applyPreviewAdminAction(chatCust.order, {
      type: 'REPLY_CHAT',
      text: 'Baik Kak, jadwal Visit dan materi sudah kami terima.',
    })
    assert.equal(adminReplied.ok, true)
    if (adminReplied.ok) {
      const custMsgAfterReply = adminReplied.order.messages.find((m) => m.id === lastCustMsg?.id)
      assert.equal(custMsgAfterReply?.readByAdmin, true, 'Balasan Admin wajib menandai pesan pelanggan sudah terbaca')
      const unreadBefore = adminReplied.order.messages.filter((m) => m.senderRole === 'ADMIN' && !m.readByCustomer).length
      assert.equal(unreadBefore, 1)
      const afterRead = markAdminMessagesRead(adminReplied.order)
      const unreadAfter = afterRead.messages.filter((m) => m.senderRole === 'ADMIN' && !m.readByCustomer).length
      assert.equal(unreadAfter, 0)

      const scheduledOrder = applyPreviewAdminAction(afterRead, {
        type: 'CONFIRM_SCHEDULE',
        date: '2026-12-20',
        timeWita: '10:00',
      })
      assert.equal(scheduledOrder.ok, true)
      if (scheduledOrder.ok) {
        assert.equal(scheduledOrder.order.status, 'SCHEDULED')
        assert.equal(scheduledOrder.order.schedules[0]?.status, 'CONFIRMED')

        const badIgPublish = applyPreviewAdminAction(scheduledOrder.order, {
          type: 'MARK_PUBLISHED',
          instagramUrl: 'https://evil.example.com/post/123',
        })
        assert.equal(badIgPublish.ok, false, 'Tautan tayang non-Instagram wajib ditolak')

        const publishedOrder = applyPreviewAdminAction(scheduledOrder.order, {
          type: 'MARK_PUBLISHED',
          instagramUrl: 'https://www.instagram.com/reel/HallopediaPromo123/',
        })
        assert.equal(publishedOrder.ok, true)
        if (publishedOrder.ok) {
          assert.equal(publishedOrder.order.status, 'PUBLISHED')
          assert.equal(publishedOrder.order.schedules[0]?.status, 'PUBLISHED')
          assert.equal(
            publishedOrder.order.schedules[0]?.publishedPermalink,
            'https://www.instagram.com/reel/HallopediaPromo123/',
          )
        }
      }
    }
  }
}

console.log('[PASS] Workspace Pascatransaksi 2B (Brief Direct/Visit, Materi Drive/File, Live Chat Unread & Jadwal Tayang) terverifikasi.')

// 7. Tahap 2B.1: Kontrak Tambahan (Direct Post, Validasi Error, Revisi Brief pada SCHEDULED, Confirm Flexible Visit & Normalisasi Hidrasi)
const directOrderInit = createOrderRecordFromCheckout(
  {
    customer: mockCustomer,
    draft: bpnDraft,
    brandName: 'Kopi Mahakam',
    contactWhatsapp: '081234567890',
    paymentScheme: 'FULL',
    invoiceCompanyName: '',
    invoicePoNumber: '',
    targetPublishDate: '',
    initialNotes: '',
  },
  MEDIA_ACCOUNTS,
  CATALOG_PACKAGES,
)
assert.equal(directOrderInit.ok, true)
if (!directOrderInit.ok) throw new Error(directOrderInit.error)

const paidDirectOrder = applySimulatedMidtransPayment(directOrderInit.order, 'VA_BCA', 'SUCCESS')
const directDraft = buildInitialBriefDraft(paidDirectOrder)
assert.equal(directDraft.serviceType, 'DIRECT_POST')

if (directDraft.serviceType === 'DIRECT_POST') {
  const shortCaptionRes = applyOrderBriefSubmission(paidDirectOrder, {
    brief: { ...directDraft, caption: 'Hai' },
    materials: [],
  })
  assert.equal(shortCaptionRes.ok, false, 'Caption DIRECT_POST < 5 karakter wajib ditolak')

  const badCtaRes = applyOrderBriefSubmission(paidDirectOrder, {
    brief: { ...directDraft, caption: 'Promo Grand Opening Diskon 30% Pekan Ini', ctaLink: 'http://wa.me/62812' },
    materials: [],
  })
  assert.equal(badCtaRes.ok, false, 'Tautan CTA non-HTTPS wajib ditolak')

  const validDirectRes = applyOrderBriefSubmission(paidDirectOrder, {
    brief: {
      ...directDraft,
      caption: 'Promo Grand Opening Diskon 30% di Samarinda mulai hari ini!',
      mentionHandles: '@hallopedia.id',
      ctaLink: 'https://wa.me/6281234567890',
      preferredPublishDate: '2026-12-22',
      preferredPublishTimeWita: '16:00',
    },
    materials: [...(goodDriveMat.ok ? [goodDriveMat.item] : [])],
  })
  assert.equal(validDirectRes.ok, true)
  if (validDirectRes.ok) {
    assert.equal(validDirectRes.order.status, 'BRIEF_SUBMITTED')
    assert.ok(validDirectRes.order.schedules[0]?.scheduledAtLabel.includes('16.00 WITA'))

    const scheduledDirect = applyPreviewAdminAction(validDirectRes.order, {
      type: 'CONFIRM_SCHEDULE',
    })
    assert.equal(scheduledDirect.ok, true)
    if (scheduledDirect.ok && scheduledDirect.order.brief?.serviceType === 'DIRECT_POST') {
      // Edit caption tanpa mengubah tanggal/jam -> status tetap SCHEDULED dan jadwal tetap CONFIRMED
      const captionEditOnly = applyOrderBriefSubmission(scheduledDirect.order, {
        brief: {
          ...scheduledDirect.order.brief,
          caption: 'Revisi copywriting caption promo tanpa ubah tanggal tayang.',
        },
        materials: scheduledDirect.order.materials,
      })
      assert.equal(captionEditOnly.ok, true)
      if (captionEditOnly.ok) {
        assert.equal(captionEditOnly.order.status, 'SCHEDULED')
        assert.equal(captionEditOnly.order.schedules[0]?.status, 'CONFIRMED')

        // Edit jam WITA -> status kembali BRIEF_SUBMITTED & jadwal menjadi PLANNED untuk konfirmasi ulang Admin
        if (captionEditOnly.order.brief?.serviceType === 'DIRECT_POST') {
          const rescheduledByClient = applyOrderBriefSubmission(captionEditOnly.order, {
            brief: {
              ...captionEditOnly.order.brief,
              preferredPublishTimeWita: '19:00',
            },
            materials: captionEditOnly.order.materials,
          })
          assert.equal(rescheduledByClient.ok, true)
          if (rescheduledByClient.ok) {
            assert.equal(rescheduledByClient.order.status, 'BRIEF_SUBMITTED')
            assert.equal(rescheduledByClient.order.schedules[0]?.status, 'PLANNED')
          }
        }
      }
    }
  }
}

if (prefilledVisitBrief.serviceType === 'VISIT_PRODUCTION') {
  const badPicWa = applyOrderBriefSubmission(paidVisitOrder, {
    brief: { ...prefilledVisitBrief, picPhone: '12345' },
    materials: [],
  })
  assert.equal(badPicWa.ok, false, 'Nomor WhatsApp PIC Visit invalid wajib ditolak')

  const pastVisitDate = applyOrderBriefSubmission(paidVisitOrder, {
    brief: { ...prefilledVisitBrief, preferredVisitDate: '2020-01-01', preferredVisitTimeWita: '09:00' },
    materials: [],
  })
  assert.equal(pastVisitDate.ok, false, 'Tanggal pertemuan Visit di masa lalu wajib ditolak')
}

// Confirm schedule pada Visit order berjadwal fleksibel wajib menjaga meetingLocation & sinkronisasi schedulePreference
const flexVisitCheckout = createOrderRecordFromCheckout(
  {
    customer: mockCustomer,
    draft: normalizeOrderDraft(
      {
        sourcePackageId: vs1Pkg.id,
        sourcePackageSku: vs1Pkg.sku,
        sourceName: vs1Pkg.name,
        pricingStrategy: vs1Pkg.pricingStrategy,
        serviceType: vs1Pkg.serviceType,
        distributionMode: vs1Pkg.distributionMode,
        selectedAccountIds: vs1Pkg.includedAccountIds,
        paymentScheme: 'FULL',
        totalPriceIdr: vs1Pkg.priceIdr,
        payNowIdr: vs1Pkg.priceIdr,
      },
      MEDIA_ACCOUNTS,
      CATALOG_PACKAGES,
    ),
    brandName: 'Kopi Mahakam',
    contactWhatsapp: '081234567890',
    paymentScheme: 'FULL',
    invoiceCompanyName: '',
    invoicePoNumber: '',
    targetPublishDate: '',
    targetPublishTimeWita: '',
    visitMeetingLocation: 'Ruko Mahakam Square Blok B2',
    visitMeetingMapsUrl: '',
    initialNotes: '',
  },
  MEDIA_ACCOUNTS,
  CATALOG_PACKAGES,
)
assert.equal(flexVisitCheckout.ok, true)
if (flexVisitCheckout.ok) {
  const confirmedFlex = applyPreviewAdminAction(
    applySimulatedMidtransPayment(flexVisitCheckout.order, 'QRIS', 'SUCCESS'),
    { type: 'CONFIRM_SCHEDULE' },
  )
  assert.equal(confirmedFlex.ok, true)
  if (confirmedFlex.ok) {
    assert.equal(confirmedFlex.order.schedules[0]?.meetingLocation, 'Ruko Mahakam Square Blok B2')
    assert.ok(confirmedFlex.order.schedulePreference.preferredDate)
    assert.ok(
      confirmedFlex.order.schedulePreference.preferredDate >= getLocalTodayIsoDate(),
      'Fallback tanggal konfirmasi tidak boleh statis di masa lalu',
    )
    assert.equal(confirmedFlex.order.schedulePreference.preferredTimeWita, '19:00')
  }
}

// Normalisasi hidrasi localStorage aman untuk rekaman lama/parsial
const legacyPartialOrder = {
  ...paidDirectOrder,
  schedulePreference: undefined,
  materials: undefined,
  schedules: undefined,
  messages: [{ id: 'm-old', senderRole: 'CUSTOMER', senderName: 'Kopi', text: 'Tes', sentAt: '2026-11-18T10:00:00Z', readByCustomer: true }],
  statusLogs: undefined,
}
const normalizedLegacy = normalizeStoredOrderRecord(legacyPartialOrder)
assert.equal(normalizedLegacy.schedulePreference.serviceType, 'DIRECT_POST')
assert.deepEqual(normalizedLegacy.materials, [])
assert.deepEqual(normalizedLegacy.schedules, [])
assert.equal(normalizedLegacy.messages[0]?.readByAdmin, false)
assert.deepEqual(normalizedLegacy.statusLogs, [])

console.log('[PASS] Remediasi 2B.1 (Direct Post, Revisi Brief SCHEDULED, Flexible Visit & Normalisasi Hidrasi) terverifikasi.')

// 7. Tahap 2C: Dashboard Order Metrics/Filter, Pelunasan Sisa DP, Siklus Invoice, Batal Aman & PWA Shell
if (vs1Order.ok) {
  const dpPaidVisit = applySimulatedMidtransPayment(vs1Order.order, 'QRIS', 'SUCCESS')
  assert.equal(dpPaidVisit.status, 'DP_PAID')
  assert.ok(dpPaidVisit.paymentSummary.remainingIdr > 0)
  assert.equal(canCancelOrder(dpPaidVisit), false, 'Order DP_PAID tidak boleh dapat dibatalkan mandiri')
  assert.equal(applyOrderCancellation(dpPaidVisit).ok, false)

  // Simulasikan brief + konfirmasi jadwal lebih dulu sebelum melunasi sisa DP
  const dpBrief = buildInitialBriefDraft(dpPaidVisit)
  const dpSubmitted =
    dpBrief.serviceType === 'VISIT_PRODUCTION'
      ? applyOrderBriefSubmission(dpPaidVisit, {
          brief: {
            ...dpBrief,
            locationAddress: 'Jl. P. Antasari No. 99, Samarinda',
            picName: 'Budi',
            picPhone: '081234567890',
            preferredVisitDate: '2026-12-28',
            preferredVisitTimeWita: '13:00',
          },
          materials: [],
        })
      : { ok: false }
  assert.equal(dpSubmitted.ok, true)
  if (dpSubmitted.ok) {
    const dpScheduled = applyPreviewAdminAction(dpSubmitted.order, { type: 'CONFIRM_SCHEDULE' })
    assert.equal(dpScheduled.ok, true)
    if (dpScheduled.ok) {
      const settledWhileScheduled = applySimulatedMidtransPayment(dpScheduled.order, 'VA_BCA', 'SUCCESS')
      assert.equal(settledWhileScheduled.status, 'SCHEDULED', 'Pelunasan DP saat SCHEDULED tidak boleh memundurkan status ke PAID')
      assert.equal(settledWhileScheduled.paymentSummary.remainingIdr, 0)
      assert.ok(settledWhileScheduled.messages[settledWhileScheduled.messages.length - 1]?.text.includes('Pelunasan sisa pembayaran DP'))
      const milestones = buildOrderPaymentMilestones(settledWhileScheduled)
      assert.equal(milestones.length, 2)
      assert.equal(milestones[1]?.state, 'DONE')
    }
  }
}

// Siklus Invoice (Approve -> Settle) dan Batal Aman Order Pending
const pendingCancelTarget = createOrderRecordFromCheckout(
  {
    customer: mockCustomer,
    draft: bpnDraft,
    brandName: 'Kopi Mahakam',
    contactWhatsapp: '081234567890',
    paymentScheme: 'FULL',
    invoiceCompanyName: '',
    invoicePoNumber: '',
    targetPublishDate: '',
    initialNotes: '',
  },
  MEDIA_ACCOUNTS,
  CATALOG_PACKAGES,
)
assert.equal(pendingCancelTarget.ok, true)
if (pendingCancelTarget.ok) {
  assert.equal(canCancelOrder(pendingCancelTarget.order), true)
  const cancelledRes = applyOrderCancellation(pendingCancelTarget.order, 'Ingin ubah pilihan akun media')
  assert.equal(cancelledRes.ok, true)
  if (cancelledRes.ok) {
    assert.equal(cancelledRes.order.status, 'CANCELLED')
    assert.equal(canCancelOrder(cancelledRes.order), false)
    const payAfterCancel = applySimulatedMidtransPayment(cancelledRes.order, 'QRIS', 'SUCCESS')
    assert.equal(payAfterCancel.status, 'CANCELLED', 'Pembayaran pada order CANCELLED wajib ditolak')
    assert.equal(
      applyPreviewAdminAction(cancelledRes.order, { type: 'CONFIRM_SCHEDULE' }).ok,
      false,
      'Order CANCELLED tidak boleh dapat dijadwalkan ulang oleh pratinjau admin',
    )
    assert.equal(
      applyPreviewAdminAction(cancelledRes.order, {
        type: 'MARK_PUBLISHED',
        instagramUrl: 'https://www.instagram.com/p/C123456/',
      }).ok,
      false,
      'Order CANCELLED tidak boleh ditandai tayang',
    )
  }
}

const invoiceTarget = createOrderRecordFromCheckout(
  {
    customer: mockCustomer,
    draft: bpnDraft,
    brandName: 'PT Borneo Energi',
    contactWhatsapp: '081234567890',
    paymentScheme: 'INVOICE',
    invoiceCompanyName: 'PT Borneo Energi Kaltim',
    invoicePoNumber: 'PO-2026-089',
    targetPublishDate: '',
    initialNotes: '',
  },
  MEDIA_ACCOUNTS,
  CATALOG_PACKAGES,
)
assert.equal(invoiceTarget.ok, true)
if (invoiceTarget.ok) {
  assert.equal(canCancelOrder(invoiceTarget.order), true)
  const approvedInv = applyPreviewInvoiceAction(invoiceTarget.order, 'APPROVE')
  assert.equal(approvedInv.ok, true)
  if (approvedInv.ok) {
    assert.equal(approvedInv.order.status, 'INVOICE_APPROVED')
    assert.equal(canCancelOrder(approvedInv.order), false)
    const settledInv = applyPreviewInvoiceAction(approvedInv.order, 'SETTLE')
    assert.equal(settledInv.ok, true)
    if (settledInv.ok) {
      assert.equal(settledInv.order.status, 'PAID')
      assert.equal(settledInv.order.paymentSummary.remainingIdr, 0)
      assert.equal(settledInv.order.paymentSummary.scheme, 'INVOICE')
      if (settledInv.order.paymentSummary.scheme === 'INVOICE') {
        assert.equal(settledInv.order.paymentSummary.approvalStatus, 'SETTLED')
      }
      const uniqueLogIds = new Set(settledInv.order.statusLogs.map((l) => l.id))
      const uniqueMsgIds = new Set(settledInv.order.messages.map((m) => m.id))
      assert.equal(uniqueLogIds.size, settledInv.order.statusLogs.length, 'ID statusLogs Invoice wajib unik')
      assert.equal(uniqueMsgIds.size, settledInv.order.messages.length, 'ID messages Invoice wajib unik')
    }
  }
}

// Metrik, filter, search & urutan dashboard
if (vs1Order.ok && pendingCancelTarget.ok && invoiceTarget.ok) {
  const dpHalf = applySimulatedMidtransPayment(vs1Order.order, 'QRIS', 'SUCCESS')
  const cancelledItem = applyOrderCancellation(pendingCancelTarget.order)
  const sampleList = [
    dpHalf,
    ...(cancelledItem.ok ? [cancelledItem.order] : []),
    invoiceTarget.order,
  ]
  const dashMetrics = computeDashboardMetrics(sampleList)
  assert.equal(dashMetrics.totalOrders, 3)
  assert.equal(dashMetrics.cancelledCount, 1)
  assert.equal(dashMetrics.actionPaymentCount, 2, 'Order DP_PAID & WAITING_INVOICE_APPROVAL wajib masuk hitungan aksi pembayaran')
  assert.ok(dashMetrics.outstandingPaymentIdr > 0)

  const dpFiltered = filterAndSearchOrders(sampleList, {
    tab: 'ACTION_PAYMENT',
    query: 'Visit',
    scheme: 'DP',
    unreadOnly: false,
    sortBy: 'HIGHEST_REMAINING',
  })
  assert.equal(dpFiltered.length, 1)
  assert.equal(resolveOrderCardAction(dpFiltered[0]).quickPayLabel, 'LUNASI SISA DP')
}

// Verifikasi file PWA Manifest, Ikon PNG & Push-Ready sw.js + link di nuxt.config.ts
const manifestPath = resolve('public/manifest.webmanifest')
const swPath = resolve('public/sw.js')
const nuxtCfgPath = resolve('nuxt.config.ts')
assert.equal(existsSync(manifestPath), true, 'public/manifest.webmanifest wajib tersedia')
assert.equal(existsSync(swPath), true, 'public/sw.js wajib tersedia')
const manifestJson = JSON.parse(readFileSync(manifestPath, 'utf8'))
assert.equal(manifestJson.display, 'standalone')
assert.equal(manifestJson.theme_color, '#0b0b0b')
assert.ok(Array.isArray(manifestJson.icons) && manifestJson.icons.length >= 3)
for (const iconEntry of manifestJson.icons) {
  const iconFilePath = resolve('public', iconEntry.src.replace(/^\//, ''))
  assert.equal(existsSync(iconFilePath), true, `Ikon PWA ${iconEntry.src} wajib ada di public/`)
  assert.ok(statSync(iconFilePath).size > 200, `Ikon PWA ${iconEntry.src} tidak boleh kosong`)
}
const swSource = readFileSync(swPath, 'utf8')
assert.ok(swSource.includes('showNotification') && swSource.includes('/dashboard/orders'))
const nuxtCfgSource = readFileSync(nuxtCfgPath, 'utf8')
assert.ok(nuxtCfgSource.includes('/manifest.webmanifest') && nuxtCfgSource.includes('theme-color'))

console.log('[PASS] Tahap 2C (Dashboard Metrik/Filter, Pelunasan DP, Siklus Invoice, Batal Aman & PWA Shell) terverifikasi.')
console.log('\nSEMUA PENGECEKAN PORTAL PELANGGAN (2A + 2B + 2B.1 + 2C) LULUS (0 ERROR).')
