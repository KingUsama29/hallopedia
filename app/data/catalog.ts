import {
  CATALOG_PACKAGES, COLLAB_MAX_ACCOUNTS, COLLAB_MIN_ACCOUNTS, MEDIA_ACCOUNTS,
} from './catalog-fixtures.ts'

export { CATALOG_PACKAGES, COLLAB_MAX_ACCOUNTS, COLLAB_MIN_ACCOUNTS, MEDIA_ACCOUNTS }

export type ServiceType = 'DIRECT_POST' | 'VISIT_PRODUCTION'
export type DistributionMode = 'SINGLE_ACCOUNT' | 'COLLAB_POST' | 'SEPARATE_POSTS'
export type RegionalScope = string
export type PaymentScheme = 'FULL' | 'DP' | 'INVOICE'
export type PackagePricingStrategy = 'FIXED_PACKAGE' | 'CUSTOM_PER_ACCOUNT'

export interface MediaAccountPricing {
  directSinglePriceIdr: number
  collabAddOnPriceIdr: number
  separatePostPriceIdr: number
  visitAddOnPriceIdr: number
}

export interface MediaAccount {
  id: string
  name: string
  handle: string
  profileUrl: string
  regionCode: string
  regionLabel: string
  monogram: string
  logoPath?: string
  isActive: boolean
  pricing: MediaAccountPricing
}

export interface RegionGroup {
  code: string
  label: string
  accountIds: string[]
}

export type PackageDeliverableSpec =
  | { serviceType: 'DIRECT_POST'; postFormats: ('FEED' | 'REELS' | 'STORY' | 'CAROUSEL')[]; includesRevision: boolean }
  | { serviceType: 'VISIT_PRODUCTION'; postFormats: ('REELS' | 'STORY' | 'FEED')[]; visitDurationHours: number; includesScriptAndEditing: true }

export interface CatalogPackage {
  id: string
  sku: string
  name: string
  tagline: string
  pricingStrategy: PackagePricingStrategy
  serviceType: ServiceType
  distributionMode: DistributionMode
  regionalScope: RegionalScope
  regionalLabel: string
  includedAccountIds: string[]
  maxAccountsAllowed: number
  priceIdr: number
  priceNote: string
  deliverables: string[]
  spec: PackageDeliverableSpec
  paymentSchemes: PaymentScheme[]
  featured?: boolean
}

export interface ConfiguredOrderDraft {
  sourcePackageId: string | null
  sourcePackageSku: string | null
  sourceName: string
  pricingStrategy: PackagePricingStrategy
  serviceType: ServiceType
  distributionMode: DistributionMode
  selectedAccountIds: string[]
  paymentScheme: PaymentScheme
  totalPriceIdr: number
  payNowIdr: number
}

export const ALL_PAYMENT_SCHEMES: readonly PaymentScheme[] = ['FULL', 'DP', 'INVOICE']
export const VISIT_COLLAB_OR_SINGLE_BASE_FEE_IDR = 1_600_000
export const VISIT_SEPARATE_BASE_FEE_IDR = 2_100_000

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  DIRECT_POST: 'Publikasi Langsung',
  VISIT_PRODUCTION: 'Kunjungan Produksi (Visit)',
}

export const DISTRIBUTION_MODE_LABELS: Record<DistributionMode, string> = {
  SINGLE_ACCOUNT: '1 Akun Satuan',
  COLLAB_POST: 'Collab (Maks. 5 Akun)',
  SEPARATE_POSTS: 'Post Terpisah (Tanpa Collab)',
}

export const REGIONAL_SCOPE_LABELS: Record<string, string> = {
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

export function formatIdr(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

export function formatPaymentSchemes(schemes: readonly PaymentScheme[]): string {
  return schemes.map((scheme) => PAYMENT_SCHEME_LABELS[scheme]).join(' · ')
}

export function sanitizeExternalProfileUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl.trim())
    return parsed.protocol === 'https:' ? parsed.toString() : null
  } catch {
    return null
  }
}

export function isMatchingPackageTemplate(
  pkg: CatalogPackage,
  state: { serviceType: ServiceType; distributionMode: DistributionMode; selectedAccountIds: readonly string[] },
): boolean {
  if (
    pkg.serviceType !== state.serviceType ||
    pkg.distributionMode !== state.distributionMode ||
    pkg.includedAccountIds.length !== state.selectedAccountIds.length
  ) {
    return false
  }
  const selectedSet = new Set(state.selectedAccountIds)
  return pkg.includedAccountIds.every((id) => selectedSet.has(id))
}

export function getAccountsByIds(
  accountIds: readonly string[],
  accounts: readonly MediaAccount[] = MEDIA_ACCOUNTS,
): MediaAccount[] {
  const accountMap = new Map(accounts.map((account) => [account.id, account]))
  const resolved: MediaAccount[] = []
  for (const id of accountIds) {
    const found = accountMap.get(id)
    if (found) resolved.push(found)
  }
  return resolved
}

export function buildRegionGroups(accounts: readonly MediaAccount[] = MEDIA_ACCOUNTS): RegionGroup[] {
  const groupMap = new Map<string, RegionGroup>()
  for (const account of accounts) {
    if (!account.isActive) continue
    const existing = groupMap.get(account.regionCode)
    if (existing) {
      existing.accountIds.push(account.id)
      continue
    }
    groupMap.set(account.regionCode, {
      code: account.regionCode,
      label: account.regionLabel || REGIONAL_SCOPE_LABELS[account.regionCode] || account.regionCode,
      accountIds: [account.id],
    })
  }
  return Array.from(groupMap.values())
}

export function getAccountUnitDisplayPrice(
  account: MediaAccount,
  serviceType: ServiceType,
  distributionMode: DistributionMode,
  isCollabHost = false,
): number {
  if (distributionMode === 'SINGLE_ACCOUNT') return account.pricing.directSinglePriceIdr
  if (distributionMode === 'COLLAB_POST') {
    return isCollabHost ? account.pricing.directSinglePriceIdr : account.pricing.collabAddOnPriceIdr
  }
  return serviceType === 'VISIT_PRODUCTION' ? account.pricing.visitAddOnPriceIdr : account.pricing.separatePostPriceIdr
}

function resolveCollabBreakdown(selectedAccounts: readonly MediaAccount[]): { hostAccountId: string | null; totalIdr: number } {
  const capped = selectedAccounts.slice(0, COLLAB_MAX_ACCOUNTS)
  if (capped.length === 0) return { hostAccountId: null, totalIdr: 0 }

  let hostIndex = 0
  for (let i = 1; i < capped.length; i++) {
    if (capped[i]!.pricing.directSinglePriceIdr > capped[hostIndex]!.pricing.directSinglePriceIdr) hostIndex = i
  }

  const host = capped[hostIndex]!
  const companionSum = capped.reduce(
    (sum, account, index) => (index === hostIndex ? sum : sum + account.pricing.collabAddOnPriceIdr),
    0,
  )
  return { hostAccountId: host.id, totalIdr: host.pricing.directSinglePriceIdr + companionSum }
}

export function resolveCollabHostAccountId(
  selectedAccountIds: readonly string[],
  accounts: readonly MediaAccount[] = MEDIA_ACCOUNTS,
): string | null {
  const activeAccounts = accounts.filter((account) => account.isActive)
  return resolveCollabBreakdown(getAccountsByIds(selectedAccountIds, activeAccounts)).hostAccountId
}

export function calculateOrderEstimate(
  params: {
    pricingStrategy?: PackagePricingStrategy
    serviceType: ServiceType
    distributionMode: DistributionMode
    selectedAccountIds: readonly string[]
  },
  accounts: readonly MediaAccount[] = MEDIA_ACCOUNTS,
  sourcePackage: CatalogPackage | null = null,
): number {
  if (params.pricingStrategy === 'FIXED_PACKAGE' && sourcePackage && sourcePackage.pricingStrategy === 'FIXED_PACKAGE') {
    return sourcePackage.priceIdr
  }

  const activeAccounts = accounts.filter((account) => account.isActive)
  const selected = getAccountsByIds(params.selectedAccountIds, activeAccounts)
  if (selected.length === 0) return 0

  if (params.serviceType === 'DIRECT_POST') {
    if (params.distributionMode === 'SINGLE_ACCOUNT') return selected[0]!.pricing.directSinglePriceIdr
    if (params.distributionMode === 'COLLAB_POST') return resolveCollabBreakdown(selected).totalIdr
    return selected.reduce((sum, account) => sum + account.pricing.separatePostPriceIdr, 0)
  }

  if (params.distributionMode === 'SINGLE_ACCOUNT') {
    return VISIT_COLLAB_OR_SINGLE_BASE_FEE_IDR + selected[0]!.pricing.directSinglePriceIdr
  }
  if (params.distributionMode === 'COLLAB_POST') {
    return VISIT_COLLAB_OR_SINGLE_BASE_FEE_IDR + resolveCollabBreakdown(selected).totalIdr
  }
  return VISIT_SEPARATE_BASE_FEE_IDR + selected.reduce((sum, account) => sum + account.pricing.visitAddOnPriceIdr, 0)
}

export function calculatePayNowAmount(totalPriceIdr: number, paymentScheme: PaymentScheme): number {
  if (paymentScheme === 'DP') return Math.round(totalPriceIdr * 0.5)
  if (paymentScheme === 'FULL') return totalPriceIdr
  return 0
}

export function isValidConfiguredOrderDraft(
  value: unknown,
  activeAccounts: readonly MediaAccount[] = MEDIA_ACCOUNTS,
  activePackages: readonly CatalogPackage[] = CATALOG_PACKAGES,
): value is ConfiguredOrderDraft {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>

  const validService = candidate.serviceType === 'DIRECT_POST' || candidate.serviceType === 'VISIT_PRODUCTION'
  const validMode =
    candidate.distributionMode === 'SINGLE_ACCOUNT' ||
    candidate.distributionMode === 'COLLAB_POST' ||
    candidate.distributionMode === 'SEPARATE_POSTS'
  const validScheme = candidate.paymentScheme === 'FULL' || candidate.paymentScheme === 'DP' || candidate.paymentScheme === 'INVOICE'
  const validStrategy =
    candidate.pricingStrategy === undefined ||
    candidate.pricingStrategy === 'FIXED_PACKAGE' ||
    candidate.pricingStrategy === 'CUSTOM_PER_ACCOUNT'

  if (!validService || !validMode || !validScheme || !validStrategy) return false
  if (typeof candidate.sourceName !== 'string' || !candidate.sourceName.trim()) return false
  if (candidate.sourcePackageId !== undefined && candidate.sourcePackageId !== null && typeof candidate.sourcePackageId !== 'string') {
    return false
  }
  if (candidate.sourcePackageSku !== null && typeof candidate.sourcePackageSku !== 'string') return false
  if (!Array.isArray(candidate.selectedAccountIds)) return false

  const validAccountIds = new Set(activeAccounts.filter((account) => account.isActive).map((a) => a.id))
  const accountIds = candidate.selectedAccountIds.filter(
    (id): id is string => typeof id === 'string' && validAccountIds.has(id),
  )
  if (accountIds.length !== candidate.selectedAccountIds.length || accountIds.length === 0) return false
  if (
    candidate.distributionMode === 'COLLAB_POST' &&
    (accountIds.length < COLLAB_MIN_ACCOUNTS || accountIds.length > COLLAB_MAX_ACCOUNTS)
  ) {
    return false
  }

  if (candidate.pricingStrategy === 'FIXED_PACKAGE') {
    const matchedPkg = activePackages.find(
      (pkg) =>
        (candidate.sourcePackageId && pkg.id === candidate.sourcePackageId) ||
        (candidate.sourcePackageSku && pkg.sku === candidate.sourcePackageSku),
    )
    if (!matchedPkg || matchedPkg.pricingStrategy !== 'FIXED_PACKAGE') return false
    if (!matchedPkg.paymentSchemes.includes(candidate.paymentScheme as PaymentScheme)) return false
  }

  return true
}

export function normalizeOrderDraft(
  draft: ConfiguredOrderDraft,
  activeAccounts: readonly MediaAccount[] = MEDIA_ACCOUNTS,
  activePackages: readonly CatalogPackage[] = CATALOG_PACKAGES,
): ConfiguredOrderDraft {
  const validAccounts = activeAccounts.filter((account) => account.isActive)
  const matchedPackage =
    activePackages.find(
      (pkg) =>
        (draft.sourcePackageId && pkg.id === draft.sourcePackageId) ||
        (draft.sourcePackageSku && pkg.sku === draft.sourcePackageSku),
    ) ?? null

  if (draft.pricingStrategy === 'FIXED_PACKAGE' && matchedPackage && matchedPackage.pricingStrategy === 'FIXED_PACKAGE') {
    const allowedSchemes = matchedPackage.paymentSchemes
    const paymentScheme = allowedSchemes.includes(draft.paymentScheme) ? draft.paymentScheme : (allowedSchemes[0] ?? 'FULL')
    const validIds = new Set(validAccounts.map((a) => a.id))
    const selectedAccountIds = matchedPackage.includedAccountIds.filter((id) => validIds.has(id))
    const totalPriceIdr = matchedPackage.priceIdr
    return {
      sourcePackageId: matchedPackage.id,
      sourcePackageSku: matchedPackage.sku,
      sourceName: matchedPackage.name,
      pricingStrategy: 'FIXED_PACKAGE',
      serviceType: matchedPackage.serviceType,
      distributionMode: matchedPackage.distributionMode,
      selectedAccountIds,
      paymentScheme,
      totalPriceIdr,
      payNowIdr: calculatePayNowAmount(totalPriceIdr, paymentScheme),
    }
  }

  const validIds = new Set(validAccounts.map((a) => a.id))
  let normalizedIds = Array.from(new Set(draft.selectedAccountIds)).filter((id) => validIds.has(id))

  if (draft.distributionMode === 'SINGLE_ACCOUNT' && normalizedIds.length > 1) {
    normalizedIds = [normalizedIds[0]!]
  } else if (draft.distributionMode === 'COLLAB_POST' && normalizedIds.length > COLLAB_MAX_ACCOUNTS) {
    normalizedIds = normalizedIds.slice(0, COLLAB_MAX_ACCOUNTS)
  }

  const totalPriceIdr = calculateOrderEstimate(
    {
      pricingStrategy: 'CUSTOM_PER_ACCOUNT',
      serviceType: draft.serviceType,
      distributionMode: draft.distributionMode,
      selectedAccountIds: normalizedIds,
    },
    validAccounts,
  )

  const stillMatchesTemplate =
    matchedPackage !== null &&
    isMatchingPackageTemplate(matchedPackage, {
      serviceType: draft.serviceType,
      distributionMode: draft.distributionMode,
      selectedAccountIds: normalizedIds,
    })

  return {
    sourcePackageId: stillMatchesTemplate ? matchedPackage.id : null,
    sourcePackageSku: stillMatchesTemplate ? matchedPackage.sku : null,
    sourceName: stillMatchesTemplate ? matchedPackage.name : 'Paket Custom Hallopedia',
    pricingStrategy: 'CUSTOM_PER_ACCOUNT',
    serviceType: draft.serviceType,
    distributionMode: draft.distributionMode,
    selectedAccountIds: normalizedIds,
    paymentScheme: draft.paymentScheme,
    totalPriceIdr,
    payNowIdr: calculatePayNowAmount(totalPriceIdr, draft.paymentScheme),
  }
}
