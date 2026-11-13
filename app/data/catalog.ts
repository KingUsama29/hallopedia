export type ServiceType = 'DIRECT_POST' | 'VISIT_PRODUCTION'

export type DistributionMode =
  | 'SINGLE_ACCOUNT'
  | 'COLLAB_POST'
  | 'SEPARATE_POSTS'

export type RegionalScope =
  | 'SAMARINDA'
  | 'BALIKPAPAN'
  | 'KALTIM'
  | 'KALIMANTAN'

export type PaymentScheme = 'FULL' | 'DP' | 'INVOICE'

export interface MediaAccount {
  id: string
  name: string
  handle: string
  region: RegionalScope
  monogram: string
  logoPath?: string
}

export type PackageDeliverableSpec =
  | {
      serviceType: 'DIRECT_POST'
      postFormats: ('FEED' | 'REELS' | 'STORY' | 'CAROUSEL')[]
      includesRevision: boolean
    }
  | {
      serviceType: 'VISIT_PRODUCTION'
      postFormats: ('REELS' | 'STORY' | 'FEED')[]
      visitDurationHours: number
      includesScriptAndEditing: true
    }

export interface CatalogPackage {
  id: string
  sku: string
  name: string
  tagline: string
  serviceType: ServiceType
  distributionMode: DistributionMode
  regionalScope: RegionalScope
  includedAccountIds: string[]
  maxAccountsAllowed: number
  priceIdr: number
  priceNote: string
  deliverables: string[]
  spec: PackageDeliverableSpec
  paymentSchemes: PaymentScheme[]
  featured?: boolean
}

export const COLLAB_MAX_ACCOUNTS = 5

export const MEDIA_ACCOUNTS: readonly MediaAccount[] = [
  {
    id: 'hallosamarinda',
    name: 'Hallosamarinda',
    handle: '@hallosamarinda',
    region: 'SAMARINDA',
    monogram: 'HS',
  },
  {
    id: 'busamsamarinda',
    name: 'Busamsamarinda',
    handle: '@busamsamarinda',
    region: 'SAMARINDA',
    monogram: 'BS',
  },
  {
    id: 'samarindaterkini',
    name: 'Samarindaterkini',
    handle: '@samarindaterkini',
    region: 'SAMARINDA',
    monogram: 'ST',
  },
  {
    id: 'samarindaku',
    name: 'Samarindaku',
    handle: '@samarindaku',
    region: 'SAMARINDA',
    monogram: 'SK',
  },
  {
    id: 'samarindamedsos',
    name: 'Samarindamedsos',
    handle: '@samarindamedsos',
    region: 'SAMARINDA',
    monogram: 'SM',
  },
  {
    id: 'samarindapedia',
    name: 'Samarindapedia',
    handle: '@samarindapedia',
    region: 'SAMARINDA',
    monogram: 'SP',
  },
  {
    id: 'balikpapanmedsos',
    name: 'Balikpapanmedsos',
    handle: '@balikpapanmedsos',
    region: 'BALIKPAPAN',
    monogram: 'BM',
  },
  {
    id: 'infobalikpapanku',
    name: 'Infobalikpapanku',
    handle: '@infobalikpapanku',
    region: 'BALIKPAPAN',
    monogram: 'IB',
    logoPath: '/images/infobalikpapanku.jpeg',
  },
  {
    id: 'hallobalikpapan',
    name: 'Hallobalikpapan',
    handle: '@hallobalikpapan',
    region: 'BALIKPAPAN',
    monogram: 'HB',
  },
  {
    id: 'kaltimku',
    name: 'Kaltimku',
    handle: '@kaltimku',
    region: 'KALTIM',
    monogram: 'KT',
    logoPath: '/images/kaltimku.jpg',
  },
  {
    id: 'hallokalimantan',
    name: 'Hallokalimantan',
    handle: '@hallokalimantan',
    region: 'KALIMANTAN',
    monogram: 'HK',
    logoPath: '/images/hallokalimantan.jpg',
  },
  {
    id: 'hallopedia',
    name: 'Hallopedia',
    handle: '@hallopedia',
    region: 'KALIMANTAN',
    monogram: 'HP',
    logoPath: '/images/hallopedia.jpeg',
  },
] as const

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  DIRECT_POST: 'Publikasi Langsung',
  VISIT_PRODUCTION: 'Kunjungan Produksi (Visit)',
}

export const DISTRIBUTION_MODE_LABELS: Record<DistributionMode, string> = {
  SINGLE_ACCOUNT: '1 Akun Satuan',
  COLLAB_POST: 'Collab (Maks. 5 Akun)',
  SEPARATE_POSTS: 'Post Terpisah (Tanpa Collab)',
}

export const REGIONAL_SCOPE_LABELS: Record<RegionalScope, string> = {
  SAMARINDA: 'Regional Samarinda',
  BALIKPAPAN: 'Regional Balikpapan',
  KALTIM: 'Regional Kaltim',
  KALIMANTAN: 'Jaringan Kalimantan',
}

export const PAYMENT_SCHEME_LABELS: Record<PaymentScheme, string> = {
  FULL: 'Penuh',
  DP: 'DP 50%',
  INVOICE: 'Invoice',
}

export const CATALOG_PACKAGES: readonly CatalogPackage[] = [
  {
    id: 'pkg-single-direct',
    sku: 'HLP-DP-01',
    name: 'Publikasi Satuan (1 Akun Pilihan)',
    tagline:
      'Tayang langsung pada satu akun regional atau tematik pilihan untuk promosi cepat dan terarah.',
    serviceType: 'DIRECT_POST',
    distributionMode: 'SINGLE_ACCOUNT',
    regionalScope: 'SAMARINDA',
    includedAccountIds: ['hallosamarinda'],
    maxAccountsAllowed: 1,
    priceIdr: 350_000,
    priceNote: 'Per 1x publikasi materi siap tayang',
    deliverables: [
      '1x Feed / Reels pada 1 akun pilihan',
      '1x Story 24 jam + tautan swipe / link',
      'Penjadwalan jam tayang prime-time daerah',
    ],
    spec: {
      serviceType: 'DIRECT_POST',
      postFormats: ['FEED', 'REELS', 'STORY'],
      includesRevision: true,
    },
    paymentSchemes: ['FULL', 'DP', 'INVOICE'],
  },
  {
    id: 'pkg-smd-collab',
    sku: 'HLP-DP-02',
    name: 'Samarinda Collab Boost (5 Akun)',
    tagline:
      'Satu konten kolaborasi yang tayang serentak di 5 akun utama Samarinda untuk jangkauan lokal maksimal.',
    serviceType: 'DIRECT_POST',
    distributionMode: 'COLLAB_POST',
    regionalScope: 'SAMARINDA',
    includedAccountIds: [
      'hallosamarinda',
      'busamsamarinda',
      'samarindaterkini',
      'samarindaku',
      'samarindamedsos',
    ],
    maxAccountsAllowed: COLLAB_MAX_ACCOUNTS,
    priceIdr: 1_150_000,
    priceNote: 'Paket kolaborasi hingga 5 akun Samarinda',
    deliverables: [
      '1x Collab Feed / Reels di 5 akun Samarinda',
      'Mirroring Story di masing-masing akun collab',
      'Konsultasi caption & tagar lokal Samarinda',
    ],
    spec: {
      serviceType: 'DIRECT_POST',
      postFormats: ['FEED', 'REELS', 'STORY', 'CAROUSEL'],
      includesRevision: true,
    },
    paymentSchemes: ['FULL', 'DP', 'INVOICE'],
    featured: true,
  },
  {
    id: 'pkg-bpn-cluster',
    sku: 'HLP-DP-03',
    name: 'Klaster Regional Balikpapan (3 Akun)',
    tagline:
      'Menjangkau audiens Balikpapan melalui 3 akun jaringan utama dengan opsi Collab atau Post Terpisah.',
    serviceType: 'DIRECT_POST',
    distributionMode: 'COLLAB_POST',
    regionalScope: 'BALIKPAPAN',
    includedAccountIds: [
      'balikpapanmedsos',
      'infobalikpapanku',
      'hallobalikpapan',
    ],
    maxAccountsAllowed: 3,
    priceIdr: 850_000,
    priceNote: 'Cakupan penuh jaringan Balikpapan',
    deliverables: [
      'Publikasi di 3 akun Balikpapan (Collab / Terpisah)',
      'Story 24 jam di seluruh akun klaster Balikpapan',
      'Laporan tautan tayang setelah publikasi',
    ],
    spec: {
      serviceType: 'DIRECT_POST',
      postFormats: ['FEED', 'REELS', 'STORY'],
      includesRevision: true,
    },
    paymentSchemes: ['FULL', 'DP', 'INVOICE'],
  },
  {
    id: 'pkg-kalimantan-separate',
    sku: 'HLP-DP-04',
    name: 'Dominasi Kalimantan (12 Akun Terpisah)',
    tagline:
      'Publikasi masing-masing tanpa batas collab di seluruh 12 akun jaringan Hallopedia se-Kalimantan.',
    serviceType: 'DIRECT_POST',
    distributionMode: 'SEPARATE_POSTS',
    regionalScope: 'KALIMANTAN',
    includedAccountIds: MEDIA_ACCOUNTS.map((account) => account.id),
    maxAccountsAllowed: MEDIA_ACCOUNTS.length,
    priceIdr: 2_400_000,
    priceNote: '12 post terpisah lintas Samarinda, Balikpapan & Kaltim',
    deliverables: [
      '12x Post terpisah tanpa batas 5 akun collab',
      'Penyesuaian angle caption per wilayah kota',
      'Rekap laporan tayang terstruktur dari admin',
    ],
    spec: {
      serviceType: 'DIRECT_POST',
      postFormats: ['FEED', 'REELS', 'STORY', 'CAROUSEL'],
      includesRevision: true,
    },
    paymentSchemes: ['FULL', 'DP', 'INVOICE'],
  },
  {
    id: 'pkg-visit-regional',
    sku: 'HLP-VS-01',
    name: 'Visit Produksi + Collab Regional (5 Akun)',
    tagline:
      'Tim produksi turun ke lokasi untuk pengambilan video, narasi, editing, dan publikasi collab 5 akun.',
    serviceType: 'VISIT_PRODUCTION',
    distributionMode: 'COLLAB_POST',
    regionalScope: 'SAMARINDA',
    includedAccountIds: [
      'hallosamarinda',
      'busamsamarinda',
      'samarindaterkini',
      'samarindaku',
      'samarindapedia',
    ],
    maxAccountsAllowed: COLLAB_MAX_ACCOUNTS,
    priceIdr: 2_750_000,
    priceNote: 'Termasuk kru lapangan, skrip & editing video',
    deliverables: [
      'Kunjungan tim produksi ke lokasi (durasi s/d 3 jam)',
      'Penyusunan skrip, voice-over/host & editing Reels',
      'Publikasi Collab di 5 akun pilihan wilayah',
    ],
    spec: {
      serviceType: 'VISIT_PRODUCTION',
      postFormats: ['REELS', 'STORY'],
      visitDurationHours: 3,
      includesScriptAndEditing: true,
    },
    paymentSchemes: ['FULL', 'DP', 'INVOICE'],
    featured: true,
  },
  {
    id: 'pkg-visit-kalimantan',
    sku: 'HLP-VS-02',
    name: 'Visit Produksi + Distribusi Kaltim & Kalimantan',
    tagline:
      'Produksi video lapangan menyeluruh dengan distribusi post terpisah di jaringan Kaltim hingga Kalimantan.',
    serviceType: 'VISIT_PRODUCTION',
    distributionMode: 'SEPARATE_POSTS',
    regionalScope: 'KALTIM',
    includedAccountIds: [
      'hallosamarinda',
      'infobalikpapanku',
      'hallobalikpapan',
      'kaltimku',
      'hallokalimantan',
      'hallopedia',
    ],
    maxAccountsAllowed: MEDIA_ACCOUNTS.length,
    priceIdr: 4_500_000,
    priceNote: 'Produksi penuh + post terpisah 6 akun lintas kota',
    deliverables: [
      'Kunjungan produksi lokasi + arahan konsep kreatif',
      'Video master HD + 1x revisi minor penyuntingan',
      'Post terpisah di 6+ akun Kaltim & Kalimantan',
    ],
    spec: {
      serviceType: 'VISIT_PRODUCTION',
      postFormats: ['REELS', 'FEED', 'STORY'],
      visitDurationHours: 4,
      includesScriptAndEditing: true,
    },
    paymentSchemes: ['FULL', 'DP', 'INVOICE'],
  },
] as const

export function formatIdr(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function getAccountsByIds(accountIds: readonly string[]): MediaAccount[] {
  const idSet = new Set(accountIds)
  return MEDIA_ACCOUNTS.filter((account) => idSet.has(account.id))
}

export function calculateCustomPackagePrice(params: {
  serviceType: ServiceType
  distributionMode: DistributionMode
  accountCount: number
}): number {
  const count = Math.max(1, params.accountCount)
  const productionBase = params.serviceType === 'VISIT_PRODUCTION' ? 1_750_000 : 0

  if (params.distributionMode === 'SINGLE_ACCOUNT') {
    return productionBase + 350_000
  }

  if (params.distributionMode === 'COLLAB_POST') {
    const capped = Math.min(count, COLLAB_MAX_ACCOUNTS)
    const mediaCost = 350_000 + Math.max(0, capped - 1) * 200_000
    return productionBase + mediaCost
  }

  // SEPARATE_POSTS: each account gets its own standalone post
  const mediaCost = count * 200_000 + 150_000
  return productionBase + mediaCost
}

