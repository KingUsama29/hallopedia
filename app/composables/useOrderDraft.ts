import {
  CATALOG_PACKAGES,
  MEDIA_ACCOUNTS,
  isValidConfiguredOrderDraft,
  normalizeOrderDraft,
  type CatalogPackage,
  type ConfiguredOrderDraft,
  type MediaAccount,
} from '~/data/catalog'

const STORAGE_KEY = 'hallopedia:order-draft:v1'

export function useOrderDraft() {
  const orderDraft = useState<ConfiguredOrderDraft | null>(
    'hallopedia:order-draft',
    () => null,
  )

  function hydrateOrderDraft(
    activeAccounts: readonly MediaAccount[] = MEDIA_ACCOUNTS,
    activePackages: readonly CatalogPackage[] = CATALOG_PACKAGES,
  ) {
    if (!import.meta.client) return
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed: unknown = JSON.parse(raw)
      if (!isValidConfiguredOrderDraft(parsed, activeAccounts, activePackages)) {
        window.sessionStorage.removeItem(STORAGE_KEY)
        return
      }
      orderDraft.value = normalizeOrderDraft(
        parsed,
        activeAccounts,
        activePackages,
      )
    } catch {
      window.sessionStorage.removeItem(STORAGE_KEY)
    }
  }

  function saveOrderDraft(
    draft: ConfiguredOrderDraft,
    activeAccounts: readonly MediaAccount[] = MEDIA_ACCOUNTS,
    activePackages: readonly CatalogPackage[] = CATALOG_PACKAGES,
  ) {
    const normalized = normalizeOrderDraft(
      draft,
      activeAccounts,
      activePackages,
    )
    orderDraft.value = normalized
    if (!import.meta.client) return
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
    } catch {
      // Ignore storage quota / privacy mode restrictions cleanly
    }
  }

  function clearOrderDraft() {
    orderDraft.value = null
    if (!import.meta.client) return
    try {
      window.sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore storage access errors
    }
  }

  return {
    orderDraft,
    hydrateOrderDraft,
    saveOrderDraft,
    clearOrderDraft,
  }
}
