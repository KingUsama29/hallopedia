import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import {
  CATALOG_PACKAGES,
  COLLAB_MAX_ACCOUNTS,
  COLLAB_MIN_ACCOUNTS,
  MEDIA_ACCOUNTS,
  buildRegionGroups,
  calculateOrderEstimate,
  calculatePayNowAmount,
  formatCompactCount,
  formatPaymentSchemes,
  formatSyncedTimestamp,
  getAccountUnitDisplayPrice,
  getAccountsByIds,
  isMatchingPackageTemplate,
  isValidConfiguredOrderDraft,
  normalizeOrderDraft,
  resolveAccountPlatformLabel,
  sanitizeExternalProfileUrl,
  sanitizeInstagramPermalink,
  sanitizeMediaThumbnailUrl,
} from '../app/data/catalog.ts'
import {
  ASSISTANT_TEMPLATE_CHIPS,
  buildDraftInquiryPrefill,
  resolveLocalAiReply,
} from '../app/data/assistant-widget.ts'
import {
  FOOTER_NAVIGATION,
  TRANSACTION_FAQ_ITEMS,
} from '../app/data/homepage-faq.ts'

const EXPECTED_INSTAGRAM_URLS = new Set([
  'https://www.instagram.com/hallosamarinda/',
  'https://www.instagram.com/busamsamarinda/',
  'https://www.instagram.com/kaltimku/',
  'https://www.instagram.com/samarindaterkini/',
  'https://www.instagram.com/balikpapanmedsos/',
  'https://www.instagram.com/infobalikpapanku/',
  'https://www.instagram.com/hallobalikpapanku/',
  'https://www.instagram.com/hallopedia.id/',
  'https://www.instagram.com/hallokalimantan/',
  'https://www.instagram.com/samarindamedsos/',
  'https://www.instagram.com/samarindaku/',
  'https://www.instagram.com/samarindapedia/',
])

console.log('=== Verifikasi Integritas Katalog & Kalkulasi Harga Dinamis Hallopedia ===\n')

// 1. Verifikasi 12 Akun Media Baseline, Metadata Wilayah, Pricing, URL Instagram & Aset Logo
assert.equal(MEDIA_ACCOUNTS.length, 12, 'Harus terdapat tepat 12 akun media baseline')
const seenIds = new Set()
const seenHandles = new Set()
const seenUrls = new Set()

for (const account of MEDIA_ACCOUNTS) {
  assert.ok(!seenIds.has(account.id), `Duplicate account id: ${account.id}`)
  assert.ok(!seenHandles.has(account.handle), `Duplicate handle: ${account.handle}`)
  assert.ok(!seenUrls.has(account.profileUrl), `Duplicate profileUrl: ${account.profileUrl}`)
  seenIds.add(account.id)
  seenHandles.add(account.handle)
  seenUrls.add(account.profileUrl)
  assert.equal(account.monogram.length, 2, `Monogram ${account.id} harus 2 huruf`)
  assert.ok(account.isActive, `Akun baseline ${account.id} harus aktif`)
  assert.ok(account.regionCode.length > 0 && account.regionLabel.length > 0)
  assert.ok(account.pricing.directSinglePriceIdr > 0)

  const safeUrl = sanitizeExternalProfileUrl(account.profileUrl)
  assert.ok(safeUrl?.startsWith('https://www.instagram.com/'), `URL Instagram tidak valid pada ${account.id}: ${account.profileUrl}`)
  assert.ok(EXPECTED_INSTAGRAM_URLS.has(safeUrl), `URL Instagram ${safeUrl} tidak terdaftar pada 12 akun resmi`)

  if (account.logoPath) {
    const diskPath = resolve('public', account.logoPath.replace(/^\//, ''))
    assert.ok(existsSync(diskPath), `File logo tidak ditemukan di disk: ${diskPath}`)
  }
}

assert.equal(seenUrls.size, EXPECTED_INSTAGRAM_URLS.size, 'Seluruh 12 link Instagram resmi harus terpasang unik')
assert.equal(sanitizeExternalProfileUrl('javascript:alert(1)'), null, 'Skema javascript: harus ditolak')
assert.equal(sanitizeExternalProfileUrl('http://www.instagram.com/hallosamarinda/'), null, 'Skema non-HTTPS harus ditolak')
assert.equal(sanitizeExternalProfileUrl('not a url'), null, 'URL rusak harus ditolak')

const baselineGroups = buildRegionGroups(MEDIA_ACCOUNTS)
assert.equal(baselineGroups.length, 4, 'Harus terbentuk 4 grup wilayah dari akun baseline')
console.log('[PASS] 12 akun media, 4 grup wilayah dinamis, struktur pricing per-akun, dan logo terverifikasi')

// 2. Verifikasi Keselarasan Harga 6 Paket Baseline (CUSTOM_PER_ACCOUNT vs FIXED_PACKAGE)
for (const pkg of CATALOG_PACKAGES) {
  const accounts = getAccountsByIds(pkg.includedAccountIds, MEDIA_ACCOUNTS)
  assert.equal(
    accounts.length,
    pkg.includedAccountIds.length,
    `Paket ${pkg.sku} memiliki ID akun tidak valid`,
  )

  if (pkg.distributionMode === 'COLLAB_POST') {
    assert.ok(
      pkg.includedAccountIds.length <= COLLAB_MAX_ACCOUNTS,
      `Paket Collab ${pkg.sku} melebihi batas ${COLLAB_MAX_ACCOUNTS} akun`,
    )
  }

  const calculatedPrice = calculateOrderEstimate(
    {
      pricingStrategy: pkg.pricingStrategy,
      serviceType: pkg.serviceType,
      distributionMode: pkg.distributionMode,
      selectedAccountIds: pkg.includedAccountIds,
    },
    MEDIA_ACCOUNTS,
    pkg,
  )

  assert.equal(
    calculatedPrice,
    pkg.priceIdr,
    `Mismatch harga pada ${pkg.sku} (${pkg.name}): kartu=${pkg.priceIdr}, kalkulator=${calculatedPrice}`,
  )

  console.log(
    `[PASS] ${pkg.sku} [${pkg.pricingStrategy}] | ${pkg.name} -> Rp ${calculatedPrice.toLocaleString('id-ID')}`,
  )
}

// 3. Verifikasi Batas Collab (2–5 akun), Kurva Monotonik 1–12 Akun & Skema Bayar
assert.equal(COLLAB_MIN_ACCOUNTS, 2, 'Minimal Collab harus 2 akun')
assert.equal(COLLAB_MAX_ACCOUNTS, 5, 'Maksimal Collab harus 5 akun')

const allIds = MEDIA_ACCOUNTS.map((account) => account.id)
const collab5 = calculateOrderEstimate(
  {
    pricingStrategy: 'CUSTOM_PER_ACCOUNT',
    serviceType: 'DIRECT_POST',
    distributionMode: 'COLLAB_POST',
    selectedAccountIds: allIds.slice(0, 5),
  },
  MEDIA_ACCOUNTS,
)
const collab10Attempt = calculateOrderEstimate(
  {
    pricingStrategy: 'CUSTOM_PER_ACCOUNT',
    serviceType: 'DIRECT_POST',
    distributionMode: 'COLLAB_POST',
    selectedAccountIds: allIds.slice(0, 10),
  },
  MEDIA_ACCOUNTS,
)
assert.equal(collab10Attempt, collab5, 'Mode Collab harus membatasi perhitungan di 5 akun')

for (const serviceType of ['DIRECT_POST', 'VISIT_PRODUCTION']) {
  let prevSeparate = 0
  for (let count = 1; count <= 12; count++) {
    const picked = allIds.slice(0, count)
    const separatePrice = calculateOrderEstimate(
      {
        pricingStrategy: 'CUSTOM_PER_ACCOUNT',
        serviceType,
        distributionMode: 'SEPARATE_POSTS',
        selectedAccountIds: picked,
      },
      MEDIA_ACCOUNTS,
    )
    assert.ok(
      separatePrice >= prevSeparate,
      `Harga SEPARATE_POSTS (${serviceType}) turun di count=${count}`,
    )
    prevSeparate = separatePrice

    if (count >= COLLAB_MIN_ACCOUNTS && count <= COLLAB_MAX_ACCOUNTS) {
      const singlePrice = calculateOrderEstimate(
        {
          pricingStrategy: 'CUSTOM_PER_ACCOUNT',
          serviceType,
          distributionMode: 'SINGLE_ACCOUNT',
          selectedAccountIds: [picked[0]],
        },
        MEDIA_ACCOUNTS,
      )
      const collabPrice = calculateOrderEstimate(
        {
          pricingStrategy: 'CUSTOM_PER_ACCOUNT',
          serviceType,
          distributionMode: 'COLLAB_POST',
          selectedAccountIds: picked,
        },
        MEDIA_ACCOUNTS,
      )
      assert.ok(
        collabPrice > singlePrice,
        `COLLAB_POST (${serviceType}) ${count} akun harus lebih tinggi dari 1 Akun Satuan`,
      )
      assert.ok(
        separatePrice > collabPrice,
        `SEPARATE_POSTS (${serviceType}) ${count} akun harus lebih tinggi dari COLLAB_POST`,
      )
    }
  }
}

assert.equal(
  isValidConfiguredOrderDraft({
    sourcePackageId: null,
    sourcePackageSku: null,
    sourceName: 'Paket Custom',
    pricingStrategy: 'CUSTOM_PER_ACCOUNT',
    serviceType: 'DIRECT_POST',
    distributionMode: 'COLLAB_POST',
    selectedAccountIds: ['hallosamarinda'],
    paymentScheme: 'DP',
    totalPriceIdr: 350_000,
    payNowIdr: 175_000,
  }),
  false,
  'Draft COLLAB_POST dengan 1 akun harus ditolak oleh validator draft',
)

assert.equal(calculatePayNowAmount(1_000_000, 'FULL'), 1_000_000)
assert.equal(calculatePayNowAmount(1_000_000, 'DP'), 500_000)
assert.equal(calculatePayNowAmount(1_000_000, 'INVOICE'), 0)

// 4. Verifikasi Skenario Dinamis Admin: Harga Heterogen (Hallosamarinda 500rb, Kaltimku 150rb)
const heterogeneousAccounts = [
  {
    id: 'hallosamarinda',
    name: 'Hallosamarinda',
    handle: '@hallosamarinda',
    profileUrl: 'https://www.instagram.com/hallosamarinda/',
    regionCode: 'SAMARINDA',
    regionLabel: 'Regional Samarinda',
    monogram: 'HS',
    isActive: true,
    pricing: {
      directSinglePriceIdr: 500_000,
      collabAddOnPriceIdr: 250_000,
      separatePostPriceIdr: 450_000,
      visitAddOnPriceIdr: 500_000,
    },
  },
  {
    id: 'kaltimku',
    name: 'Kaltimku',
    handle: '@kaltimku',
    profileUrl: 'https://www.instagram.com/kaltimku/',
    regionCode: 'KALTIM',
    regionLabel: 'Regional Kaltim',
    monogram: 'KT',
    isActive: true,
    pricing: {
      directSinglePriceIdr: 150_000,
      collabAddOnPriceIdr: 100_000,
      separatePostPriceIdr: 150_000,
      visitAddOnPriceIdr: 200_000,
    },
  },
  {
    id: 'hallonikn',
    name: 'Halloikn',
    handle: '@halloikn',
    profileUrl: 'https://www.instagram.com/halloikn/',
    regionCode: 'IKN',
    regionLabel: 'Ibu Kota Nusantara',
    monogram: 'HI',
    isActive: true,
    pricing: {
      directSinglePriceIdr: 275_000,
      collabAddOnPriceIdr: 150_000,
      separatePostPriceIdr: 275_000,
      visitAddOnPriceIdr: 350_000,
    },
  },
]

assert.equal(
  getAccountUnitDisplayPrice(
    heterogeneousAccounts[0],
    'DIRECT_POST',
    'SINGLE_ACCOUNT',
  ),
  500_000,
)
assert.equal(
  getAccountUnitDisplayPrice(
    heterogeneousAccounts[1],
    'DIRECT_POST',
    'SINGLE_ACCOUNT',
  ),
  150_000,
)

const singleSamarinda = calculateOrderEstimate(
  {
    pricingStrategy: 'CUSTOM_PER_ACCOUNT',
    serviceType: 'DIRECT_POST',
    distributionMode: 'SINGLE_ACCOUNT',
    selectedAccountIds: ['hallosamarinda'],
  },
  heterogeneousAccounts,
)
const singleKaltimku = calculateOrderEstimate(
  {
    pricingStrategy: 'CUSTOM_PER_ACCOUNT',
    serviceType: 'DIRECT_POST',
    distributionMode: 'SINGLE_ACCOUNT',
    selectedAccountIds: ['kaltimku'],
  },
  heterogeneousAccounts,
)
assert.equal(singleSamarinda, 500_000, 'Akun satuan Hallosamarinda harus tepat Rp 500.000')
assert.equal(singleKaltimku, 150_000, 'Akun satuan Kaltimku harus tepat Rp 150.000')

// Order-independent Collab: akun termahal sebagai host (500rb) + add-on rekan (100rb) = 600rb
const collabForward = calculateOrderEstimate(
  {
    pricingStrategy: 'CUSTOM_PER_ACCOUNT',
    serviceType: 'DIRECT_POST',
    distributionMode: 'COLLAB_POST',
    selectedAccountIds: ['hallosamarinda', 'kaltimku'],
  },
  heterogeneousAccounts,
)
const collabReversed = calculateOrderEstimate(
  {
    pricingStrategy: 'CUSTOM_PER_ACCOUNT',
    serviceType: 'DIRECT_POST',
    distributionMode: 'COLLAB_POST',
    selectedAccountIds: ['kaltimku', 'hallosamarinda'],
  },
  heterogeneousAccounts,
)
assert.equal(collabForward, 600_000, 'Collab 500rb (host) + 100rb (collab add-on) harus Rp 600.000')
assert.equal(collabReversed, collabForward, 'Urutan klik akun tidak boleh mengubah tarif Collab')

const separateHeterogeneous = calculateOrderEstimate(
  {
    pricingStrategy: 'CUSTOM_PER_ACCOUNT',
    serviceType: 'DIRECT_POST',
    distributionMode: 'SEPARATE_POSTS',
    selectedAccountIds: ['hallosamarinda', 'kaltimku'],
  },
  heterogeneousAccounts,
)
assert.equal(separateHeterogeneous, 600_000, 'Post terpisah harus menjumlahkan 450rb + 150rb = 600rb')

// 5. Verifikasi FIXED_PACKAGE Promo Satuan (Kaltimku Rp 150rb hanya Skema FULL) & Akun Dinamis ke-13
const adminFixedKaltimkuPkg = {
  id: 'pkg-promo-kaltimku',
  sku: 'HLP-PRM-01',
  name: 'Promo Satuan Kaltimku',
  tagline: 'Paket promo satuan khusus Kaltimku dengan harga tetap.',
  pricingStrategy: 'FIXED_PACKAGE',
  serviceType: 'DIRECT_POST',
  distributionMode: 'SINGLE_ACCOUNT',
  regionalScope: 'KALTIM',
  regionalLabel: 'Regional Kaltim',
  includedAccountIds: ['kaltimku'],
  maxAccountsAllowed: 1,
  priceIdr: 150_000,
  priceNote: 'Promo khusus bayar penuh',
  deliverables: ['1x Feed/Reels di @kaltimku'],
  spec: {
    serviceType: 'DIRECT_POST',
    postFormats: ['FEED', 'REELS'],
    includesRevision: false,
  },
  paymentSchemes: ['FULL'],
}

assert.equal(
  calculateOrderEstimate(
    {
      pricingStrategy: 'FIXED_PACKAGE',
      serviceType: 'DIRECT_POST',
      distributionMode: 'SINGLE_ACCOUNT',
      selectedAccountIds: ['hallosamarinda'],
    },
    heterogeneousAccounts,
    adminFixedKaltimkuPkg,
  ),
  150_000,
  'FIXED_PACKAGE wajib mempertahankan harga resmi kartu (tidak tertimpa kalkulator custom)',
)

assert.equal(
  isValidConfiguredOrderDraft(
    {
      sourcePackageId: adminFixedKaltimkuPkg.id,
      sourcePackageSku: adminFixedKaltimkuPkg.sku,
      sourceName: adminFixedKaltimkuPkg.name,
      pricingStrategy: 'FIXED_PACKAGE',
      serviceType: 'DIRECT_POST',
      distributionMode: 'SINGLE_ACCOUNT',
      selectedAccountIds: ['kaltimku'],
      paymentScheme: 'DP',
      totalPriceIdr: 150_000,
      payNowIdr: 75_000,
    },
    heterogeneousAccounts,
    [adminFixedKaltimkuPkg],
  ),
  false,
  'Draft FIXED_PACKAGE harus menolak skema pembayaran DP yang tidak diizinkan paket',
)

const dynamicGroups = buildRegionGroups(heterogeneousAccounts)
assert.ok(
  dynamicGroups.some((g) => g.code === 'IKN' && g.label === 'Ibu Kota Nusantara'),
  'buildRegionGroups harus membentuk wilayah baru dari data API secara dinamis',
)

const draftNewAccount13 = {
  sourcePackageId: null,
  sourcePackageSku: null,
  sourceName: 'Paket Custom IKN',
  pricingStrategy: 'CUSTOM_PER_ACCOUNT',
  serviceType: 'DIRECT_POST',
  distributionMode: 'SINGLE_ACCOUNT',
  selectedAccountIds: ['hallonikn'],
  paymentScheme: 'FULL',
  totalPriceIdr: 275_000,
  payNowIdr: 275_000,
}

assert.equal(
  isValidConfiguredOrderDraft(draftNewAccount13, heterogeneousAccounts, [adminFixedKaltimkuPkg]),
  true,
  'Validator draft wajib menerima ID akun baru ke-13 dari payload API dinamis',
)

const normalizedIkn = normalizeOrderDraft(
  draftNewAccount13,
  heterogeneousAccounts,
  [adminFixedKaltimkuPkg],
)
assert.equal(normalizedIkn.totalPriceIdr, 275_000)

console.log(
  '[PASS] Skenario harga per-akun heterogen (500rb vs 150rb), FIXED_PACKAGE lock & paymentSchemes, serta akun dinamis baru lulus.',
)

// 6. Verifikasi Helper formatPaymentSchemes, isMatchingPackageTemplate & Reset Template Drift
assert.equal(
  formatPaymentSchemes(['FULL', 'DP', 'INVOICE']),
  'Penuh · DP 50% · Invoice',
)

const singleTemplatePkg = CATALOG_PACKAGES.find((p) => p.id === 'pkg-single-direct')
assert.ok(singleTemplatePkg, 'Paket pkg-single-direct harus ada di baseline')
assert.equal(
  isMatchingPackageTemplate(singleTemplatePkg, {
    serviceType: 'DIRECT_POST',
    distributionMode: 'SINGLE_ACCOUNT',
    selectedAccountIds: ['hallosamarinda'],
  }),
  true,
)
assert.equal(
  isMatchingPackageTemplate(singleTemplatePkg, {
    serviceType: 'VISIT_PRODUCTION',
    distributionMode: 'SEPARATE_POSTS',
    selectedAccountIds: ['hallosamarinda', 'hallokaltim'],
  }),
  false,
)

const driftedDraft = normalizeOrderDraft(
  {
    sourcePackageId: singleTemplatePkg.id,
    sourcePackageSku: singleTemplatePkg.sku,
    sourceName: singleTemplatePkg.name,
    pricingStrategy: 'CUSTOM_PER_ACCOUNT',
    serviceType: 'VISIT_PRODUCTION',
    distributionMode: 'SEPARATE_POSTS',
    selectedAccountIds: ['hallosamarinda', 'hallokaltim', 'hallobontang'],
    paymentScheme: 'DP',
    totalPriceIdr: 0,
    payNowIdr: 0,
  },
  MEDIA_ACCOUNTS,
  CATALOG_PACKAGES,
)
assert.equal(driftedDraft.sourcePackageId, null, 'Draft yang berubah dari template wajib mereset sourcePackageId')
assert.equal(driftedDraft.sourcePackageSku, null, 'Draft yang berubah dari template wajib mereset sourcePackageSku')
assert.equal(
  driftedDraft.sourceName,
  'Paket Custom Hallopedia',
  'Draft yang berubah dari template wajib bernama Paket Custom Hallopedia',
)
console.log('[PASS] Deteksi perubahan template (Template Drift) & formatPaymentSchemes terverifikasi.')

// 6.5 Verifikasi Kontrak Metrik & Feed Instagram (01H: Tanpa Data Fiktif + Sanitasi Permalink)
assert.equal(formatCompactCount(950), '950')
assert.equal(formatCompactCount(15_000), '15 rb')
assert.equal(formatCompactCount(128_400), '128,4 rb')
assert.equal(formatCompactCount(1_240_000), '1,2 jt')
assert.equal(formatCompactCount(-5), '0')

assert.equal(
  sanitizeInstagramPermalink('https://www.instagram.com/p/C9xyz123/'),
  'https://www.instagram.com/p/C9xyz123/',
)
assert.equal(
  sanitizeInstagramPermalink('https://instagram.com/reel/C9abc456/'),
  'https://instagram.com/reel/C9abc456/',
)
assert.equal(sanitizeInstagramPermalink('https://evil.example.com/p/123/'), null)
assert.equal(sanitizeInstagramPermalink('http://www.instagram.com/p/123/'), null)
assert.equal(sanitizeInstagramPermalink('javascript:alert(1)'), null)
assert.ok(formatSyncedTimestamp('2026-11-15T12:00:00Z'))
assert.equal(formatSyncedTimestamp('invalid-date'), null)

assert.equal(sanitizeMediaThumbnailUrl('/images/kaltimku.jpg'), '/images/kaltimku.jpg')
assert.equal(
  sanitizeMediaThumbnailUrl('https://scontent-cgk1-1.cdninstagram.com/v/t51.2885-15/123.jpg'),
  'https://scontent-cgk1-1.cdninstagram.com/v/t51.2885-15/123.jpg',
)
assert.equal(
  sanitizeMediaThumbnailUrl('https://abc.supabase.co/storage/v1/object/public/media-previews/p1.jpg'),
  'https://abc.supabase.co/storage/v1/object/public/media-previews/p1.jpg',
)
assert.equal(sanitizeMediaThumbnailUrl('//evil.example.com/pixel.png'), null)
assert.equal(sanitizeMediaThumbnailUrl('https://tracker.evil.com/pixel.png'), null)
assert.equal(sanitizeMediaThumbnailUrl('http://scontent.cdninstagram.com/p.jpg'), null)
assert.equal(sanitizeMediaThumbnailUrl('javascript:alert(1)'), null)

assert.equal(resolveAccountPlatformLabel({}), 'INSTAGRAM')
assert.equal(resolveAccountPlatformLabel({ platform: 'TIKTOK' }), 'TIKTOK')

for (const acc of MEDIA_ACCOUNTS) {
  assert.equal(
    acc.metrics,
    undefined,
    `Baseline ${acc.id} tidak boleh mengarang angka followers fiktif sebelum API backend aktif`,
  )
  assert.equal(
    acc.recentPosts,
    undefined,
    `Baseline ${acc.id} tidak boleh mengarang postingan fiktif sebelum API backend aktif`,
  )
}
console.log('[PASS] Kontrak metrik opsional, allowlist CDN thumbnail, & platform label (01H/01I) terverifikasi.')

// 6.8 Verifikasi Widget Mengambang AI/Admin, Disambiguasi Intent, FAQ, & Navigasi Footer (01K/01L)
assert.ok(ASSISTANT_TEMPLATE_CHIPS.length >= 4, 'Widget AI wajib menyediakan minimal 4 template klik-ke-input')
for (const chip of ASSISTANT_TEMPLATE_CHIPS) {
  assert.ok(chip.promptText.trim().length > 5)
  const chipReply = resolveLocalAiReply(chip.promptText, MEDIA_ACCOUNTS, CATALOG_PACKAGES, TRANSACTION_FAQ_ITEMS)
  assert.ok(chipReply.text.length > 10 && !chipReply.text.includes('undefined') && !chipReply.text.includes('NaN'))
  assert.equal(chipReply.suggestAdminHandoff, false)
}

const priceReply = resolveLocalAiReply('Berapa harga iklan 12 akun?', MEDIA_ACCOUNTS, CATALOG_PACKAGES, TRANSACTION_FAQ_ITEMS)
assert.ok(priceReply.text.includes('Rp') && !priceReply.suggestAdminHandoff)

const collabVsSepReply = resolveLocalAiReply('Apa beda collab dan post terpisah?', MEDIA_ACCOUNTS, CATALOG_PACKAGES, TRANSACTION_FAQ_ITEMS)
assert.equal(collabVsSepReply.suggestAdminHandoff, false)
assert.ok(collabVsSepReply.text.includes('5 akun') && !collabVsSepReply.text.includes('kru liputan'), 'Pertanyaan Collab vs Terpisah tidak boleh nyasar ke Visit')

const dpVsInvoiceReply = resolveLocalAiReply('Apa beda DP 50% dan Invoice?', MEDIA_ACCOUNTS, CATALOG_PACKAGES, TRANSACTION_FAQ_ITEMS)
assert.equal(dpVsInvoiceReply.suggestAdminHandoff, false)
assert.ok(dpVsInvoiceReply.text.includes('Midtrans') && dpVsInvoiceReply.text.includes('Invoice'))

const skuReply = resolveLocalAiReply('Info paket HLP-DP-04 Dominasi Kalimantan', MEDIA_ACCOUNTS, CATALOG_PACKAGES, TRANSACTION_FAQ_ITEMS)
assert.equal(skuReply.suggestAdminHandoff, false)
assert.ok(skuReply.text.includes('2.400.000') && skuReply.text.includes('12 akun'))

const loginReply = resolveLocalAiReply('Apakah saya harus buat akun login sebelum pesan?', MEDIA_ACCOUNTS, CATALOG_PACKAGES, TRANSACTION_FAQ_ITEMS)
assert.equal(loginReply.suggestAdminHandoff, true, 'Kata umum akun login tidak boleh membuang daftar 12 akun media')

const customUnknownReply = resolveLocalAiReply('Bisa barter sponsor acara komunitas offline?', MEDIA_ACCOUNTS, CATALOG_PACKAGES, TRANSACTION_FAQ_ITEMS)
assert.equal(customUnknownReply.suggestAdminHandoff, true, 'Pertanyaan di luar katalog wajib menyarankan handoff ke Admin')

const prefillText = buildDraftInquiryPrefill(driftedDraft)
assert.ok(prefillText.includes(driftedDraft.sourceName) && prefillText.includes('akun'))

const sectionEyebrowFiles = [
  'app/components/sections/CatalogSection.vue',
  'app/components/sections/MediaNetworkSection.vue',
  'app/components/sections/FaqSection.vue',
]
for (const sectionFile of sectionEyebrowFiles) {
  const src = readFileSync(resolve(sectionFile), 'utf8')
  assert.equal(/\b0[1-4]\s*\//.test(src), false, `${sectionFile} tidak boleh memakai penomoran section 0X /`)
}

const widgetSrc = readFileSync(resolve('app/components/ui/FloatingAssistantWidget.vue'), 'utf8')
assert.ok(widgetSrc.includes('role="log"') && widgetSrc.includes('aria-live="polite"'), 'Log chat AI wajib memiliki role=log & aria-live=polite')
assert.ok(widgetSrc.includes('max-h-[72dvh]'), 'Panel widget mengambang wajib memakai 72dvh untuk keyboard mobile')

const faqIds = new Set(TRANSACTION_FAQ_ITEMS.map((item) => item.id))
assert.equal(faqIds.size, TRANSACTION_FAQ_ITEMS.length, 'ID item FAQ wajib unik')
assert.ok(TRANSACTION_FAQ_ITEMS.length >= 6, 'Section FAQ minimal 6 pertanyaan')

const EXPECTED_FOOTER_TARGETS = new Set(['#hero', '#katalog', '#media-network', '#faq'])
assert.equal(FOOTER_NAVIGATION.length, EXPECTED_FOOTER_TARGETS.size)
for (const navItem of FOOTER_NAVIGATION) {
  assert.ok(EXPECTED_FOOTER_TARGETS.has(navItem.target), `Target footer tidak valid: ${navItem.target}`)
}
console.log('[PASS] Widget mengambang AI/Admin, disambiguasi 01L, eyebrow tanpa nomor, FAQ & Footer terverifikasi.')

// 7. Verifikasi Batas Modularitas (< 400 baris) & Kebersihan Copy Produksi di app/
function collectCodeFiles(dirPath) {
  const results = []
  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = join(dirPath, entry.name)
    if (entry.isDirectory()) {
      results.push(...collectCodeFiles(fullPath))
    } else if (entry.name.endsWith('.vue') || entry.name.endsWith('.ts')) {
      results.push(fullPath)
    }
  }
  return results
}

const FORBIDDEN_INTERNAL_JARGON = ['SIAP SINKRONISASI API', 'DUMMY DATA', 'LOREM IPSUM', 'TAHAP 2A', 'TAHAP 2B', '(MODE UI)']
const appRoot = resolve('app')
const codeFiles = collectCodeFiles(appRoot)
for (const filePath of codeFiles) {
  const content = readFileSync(filePath, 'utf8')
  const lineCount = content.split(/\r?\n/).length
  const relPath = relative(process.cwd(), filePath)
  assert.ok(
    lineCount <= 400,
    `File ${relPath} memiliki ${lineCount} baris (melebihi batas modular 400 baris)`,
  )
  if (filePath.endsWith('.vue')) {
    const upper = content.toUpperCase()
    for (const token of FORBIDDEN_INTERNAL_JARGON) {
      assert.equal(
        upper.includes(token),
        false,
        `File UI ${relPath} mengandung teks internal "${token}" yang tidak boleh tampil ke pengguna`,
      )
    }
  }
}
console.log(`[PASS] Seluruh ${codeFiles.length} file di app/ berada di bawah batas 400 baris dan bebas jargon internal.`)

console.log('\nSEMUA PENGECEKAN KATALOG DINAMIS LULUS (0 ERROR).')
