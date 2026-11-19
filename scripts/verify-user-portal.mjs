import assert from 'node:assert/strict'
import { CATALOG_PACKAGES, MEDIA_ACCOUNTS, normalizeOrderDraft } from '../app/data/catalog.ts'
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

console.log('\nSEMUA PENGECEKAN PORTAL PELANGGAN (2A) LULUS (0 ERROR).')
