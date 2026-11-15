import { computed } from 'vue'
import {
  CATALOG_PACKAGES,
  MEDIA_ACCOUNTS,
  buildRegionGroups,
  type CatalogPackage,
  type MediaAccount,
  type RegionGroup,
} from '~/data/catalog'

export type AsyncViewState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string }

export interface CatalogPayload {
  accounts: readonly MediaAccount[]
  packages: readonly CatalogPackage[]
  regionGroups: readonly RegionGroup[]
}

export type CatalogFetcher = () => Promise<{
  accounts: readonly MediaAccount[]
  packages: readonly CatalogPackage[]
}>

function buildPayloadFromLists(
  rawAccounts: readonly MediaAccount[],
  rawPackages: readonly CatalogPackage[],
): CatalogPayload {
  const activeAccounts = rawAccounts.filter((account) => account.isActive)
  const activeIds = new Set(activeAccounts.map((account) => account.id))

  // Pastikan setiap paket aktif hanya memaparkan akun aktif yang valid
  const packages = rawPackages.map((pkg) => ({
    ...pkg,
    includedAccountIds: pkg.includedAccountIds.filter((id) =>
      activeIds.has(id),
    ),
  }))

  return {
    accounts: activeAccounts,
    packages,
    regionGroups: buildRegionGroups(activeAccounts),
  }
}

function createLocalCatalogPayload(): CatalogPayload {
  return buildPayloadFromLists(MEDIA_ACCOUNTS, CATALOG_PACKAGES)
}

export function useCatalogData() {
  const catalogState = useState<AsyncViewState<CatalogPayload>>(
    'hallopedia:catalog-data',
    () => ({
      status: 'success',
      data: createLocalCatalogPayload(),
    }),
  )

  const accounts = computed<readonly MediaAccount[]>(() =>
    catalogState.value.status === 'success'
      ? catalogState.value.data.accounts
      : [],
  )

  const packages = computed<readonly CatalogPackage[]>(() =>
    catalogState.value.status === 'success'
      ? catalogState.value.data.packages
      : [],
  )

  const regionGroups = computed<readonly RegionGroup[]>(() =>
    catalogState.value.status === 'success'
      ? catalogState.value.data.regionGroups
      : [],
  )

  async function loadCatalog(fetcher?: CatalogFetcher) {
    catalogState.value = { status: 'loading' }
    try {
      const source = fetcher
        ? await fetcher()
        : { accounts: MEDIA_ACCOUNTS, packages: CATALOG_PACKAGES }
      catalogState.value = {
        status: 'success',
        data: buildPayloadFromLists(source.accounts, source.packages),
      }
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Gagal memuat katalog layanan Hallopedia. Silakan coba lagi.'
      catalogState.value = { status: 'error', message }
    }
  }

  return {
    catalogState,
    accounts,
    packages,
    regionGroups,
    loadCatalog,
  }
}

