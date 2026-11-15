import { computed, ref, watch, type Ref } from 'vue'
import {
  ALL_PAYMENT_SCHEMES, COLLAB_MAX_ACCOUNTS, COLLAB_MIN_ACCOUNTS,
  VISIT_COLLAB_OR_SINGLE_BASE_FEE_IDR, VISIT_SEPARATE_BASE_FEE_IDR,
  calculateOrderEstimate, calculatePayNowAmount, formatIdr,
  getAccountUnitDisplayPrice, getAccountsByIds, isMatchingPackageTemplate,
  resolveCollabHostAccountId,
  type CatalogPackage, type ConfiguredOrderDraft, type DistributionMode,
  type MediaAccount, type PackagePricingStrategy, type PaymentScheme,
  type RegionGroup, type ServiceType,
} from '~/data/catalog'

export interface UsePackageConfiguratorOptions {
  accounts: Ref<readonly MediaAccount[]>
  regionGroups: Ref<readonly RegionGroup[]>
  sourcePackage: Ref<CatalogPackage | null>
  initialDraft: Ref<ConfiguredOrderDraft | null | undefined>
}

export const SERVICE_OPTIONS: readonly { value: ServiceType; title: string; subtitle: string }[] = [
  { value: 'DIRECT_POST', title: 'Publikasi Langsung', subtitle: 'Materi dari pengiklan' },
  { value: 'VISIT_PRODUCTION', title: 'Kunjungan (Visit)', subtitle: 'Tim produksi ke lokasi' },
]

export function usePackageConfigurator(options: UsePackageConfiguratorOptions) {
  const sourcePackageId = ref<string | null>(null)
  const sourceSku = ref<string | null>(null)
  const sourceName = ref<string>('Paket Custom Hallopedia')
  const activeStrategy = ref<PackagePricingStrategy>('CUSTOM_PER_ACCOUNT')
  const serviceType = ref<ServiceType>('DIRECT_POST')
  const distributionMode = ref<DistributionMode>('COLLAB_POST')
  const selectedAccountIds = ref<string[]>([])
  const paymentScheme = ref<PaymentScheme>('DP')
  const notice = ref<string | null>(null)

  const activeAccounts = computed(() => options.accounts.value.filter((account) => account.isActive))
  const isFixedMode = computed(
    () => activeStrategy.value === 'FIXED_PACKAGE' && options.sourcePackage.value?.pricingStrategy === 'FIXED_PACKAGE',
  )
  const lockedSourcePackage = computed(() => (isFixedMode.value ? options.sourcePackage.value : null))

  const allowedPaymentSchemes = computed<readonly PaymentScheme[]>(() => {
    if (lockedSourcePackage.value) return lockedSourcePackage.value.paymentSchemes
    const pkg = options.sourcePackage.value
    if (pkg && sourcePackageId.value === pkg.id && pkg.paymentSchemes.length > 0) return pkg.paymentSchemes
    return ALL_PAYMENT_SCHEMES
  })

  const paymentGridColsClass = computed(() => {
    const count = allowedPaymentSchemes.value.length
    return count === 1 ? 'grid-cols-1' : count === 2 ? 'grid-cols-2' : 'grid-cols-3'
  })

  const distributionOptions = computed(
    (): { value: DistributionMode; title: string; subtitle: string }[] => [
      { value: 'SINGLE_ACCOUNT', title: '1 Akun', subtitle: 'Fokus 1 akun' },
      { value: 'COLLAB_POST', title: `Collab (Max ${COLLAB_MAX_ACCOUNTS})`, subtitle: `1 post ${COLLAB_MIN_ACCOUNTS}–${COLLAB_MAX_ACCOUNTS} akun` },
      { value: 'SEPARATE_POSTS', title: 'Post Terpisah', subtitle: `Post tiap akun (1–${activeAccounts.value.length})` },
    ],
  )

  const dynamicRegionalPresets = computed(() => {
    const presets = options.regionGroups.value
      .filter((group) => group.accountIds.length > 0)
      .map((group) => ({ code: group.code, label: `${group.label} (${group.accountIds.length})`, accountIds: [...group.accountIds] }))

    if (activeAccounts.value.length > 0) {
      presets.push({
        code: 'ALL_ACCOUNTS',
        label: `Semua ${activeAccounts.value.length} Akun`,
        accountIds: activeAccounts.value.map((account) => account.id),
      })
    }
    return presets
  })

  const collabHostAccountId = computed(() =>
    distributionMode.value === 'COLLAB_POST'
      ? resolveCollabHostAccountId(selectedAccountIds.value, activeAccounts.value)
      : null,
  )

  const activeVisitBaseFee = computed(() => {
    if (serviceType.value !== 'VISIT_PRODUCTION') return 0
    return distributionMode.value === 'SEPARATE_POSTS' ? VISIT_SEPARATE_BASE_FEE_IDR : VISIT_COLLAB_OR_SINGLE_BASE_FEE_IDR
  })

  const estimatedPrice = computed(() =>
    calculateOrderEstimate(
      {
        pricingStrategy: activeStrategy.value,
        serviceType: serviceType.value,
        distributionMode: distributionMode.value,
        selectedAccountIds: selectedAccountIds.value,
      },
      activeAccounts.value,
      lockedSourcePackage.value,
    ),
  )

  const payNowAmount = computed(() => calculatePayNowAmount(estimatedPrice.value, paymentScheme.value))
  const isCollabAtLimit = computed(() => distributionMode.value === 'COLLAB_POST' && selectedAccountIds.value.length >= COLLAB_MAX_ACCOUNTS)
  const fixedIncludedAccounts = computed(() =>
    lockedSourcePackage.value ? getAccountsByIds(lockedSourcePackage.value.includedAccountIds, activeAccounts.value) : [],
  )
  const canProceed = computed(() => (isFixedMode.value ? fixedIncludedAccounts.value.length > 0 : selectedAccountIds.value.length > 0))

  watch(allowedPaymentSchemes, (schemes) => {
    if (!schemes.includes(paymentScheme.value)) paymentScheme.value = schemes[0] ?? 'FULL'
  })

  function resolveDefaultCustomAccountIds(): string[] {
    return activeAccounts.value.slice(0, Math.min(3, activeAccounts.value.length)).map((account) => account.id)
  }

  function resolvePreferredScheme(schemes: readonly PaymentScheme[]): PaymentScheme {
    return schemes.includes('DP') ? 'DP' : (schemes[0] ?? 'FULL')
  }

  function pickCollabPartnerAccount(existingId: string) {
    const existing = activeAccounts.value.find((a) => a.id === existingId)
    const sameRegion = activeAccounts.value.find((a) => a.id !== existingId && a.regionCode === existing?.regionCode)
    return sameRegion ?? activeAccounts.value.find((a) => a.id !== existingId)
  }

  function syncTemplateDrift() {
    if (isFixedMode.value || !sourcePackageId.value) return
    const pkg = options.sourcePackage.value
    if (
      !pkg ||
      !isMatchingPackageTemplate(pkg, {
        serviceType: serviceType.value,
        distributionMode: distributionMode.value,
        selectedAccountIds: selectedAccountIds.value,
      })
    ) {
      sourcePackageId.value = null
      sourceSku.value = null
      sourceName.value = 'Paket Custom Hallopedia'
    }
  }

  function normalizeCollabSelection(showAutoAddNotice: boolean) {
    if (activeAccounts.value.length === 0) {
      selectedAccountIds.value = []
      return
    }
    if (selectedAccountIds.value.length > COLLAB_MAX_ACCOUNTS) {
      selectedAccountIds.value = selectedAccountIds.value.slice(0, COLLAB_MAX_ACCOUNTS)
      notice.value = `Mode Collab maksimal ${COLLAB_MAX_ACCOUNTS} akun. Gunakan "Post Terpisah" untuk lebih dari ${COLLAB_MAX_ACCOUNTS} akun.`
      return
    }
    if (selectedAccountIds.value.length < COLLAB_MIN_ACCOUNTS) {
      const baseId = selectedAccountIds.value[0] ?? activeAccounts.value[0]!.id
      const partner = pickCollabPartnerAccount(baseId)
      if (partner && !selectedAccountIds.value.includes(partner.id)) {
        selectedAccountIds.value = [baseId, partner.id]
        if (showAutoAddNotice) {
          notice.value = `Mode Collab minimal ${COLLAB_MIN_ACCOUNTS} akun. Akun rekan (${partner.handle}) ditambahkan otomatis — silakan sesuaikan.`
        }
      }
    }
  }

  function hydrateFromSource(
    pkg: CatalogPackage | null = options.sourcePackage.value,
    draft: ConfiguredOrderDraft | null | undefined = options.initialDraft.value,
  ) {
    notice.value = null
    const validIds = new Set(activeAccounts.value.map((account) => account.id))

    if (draft) {
      sourcePackageId.value = draft.sourcePackageId ?? pkg?.id ?? null
      sourceSku.value = draft.sourcePackageSku
      sourceName.value = draft.sourceName
      activeStrategy.value =
        draft.pricingStrategy === 'FIXED_PACKAGE' && pkg?.pricingStrategy === 'FIXED_PACKAGE'
          ? 'FIXED_PACKAGE'
          : 'CUSTOM_PER_ACCOUNT'
      serviceType.value = draft.serviceType
      distributionMode.value = draft.distributionMode
      const validDraftIds = draft.selectedAccountIds.filter((id) => validIds.has(id))
      selectedAccountIds.value = validDraftIds.length > 0 ? validDraftIds : resolveDefaultCustomAccountIds()

      if (activeStrategy.value === 'CUSTOM_PER_ACCOUNT' && distributionMode.value === 'COLLAB_POST') {
        normalizeCollabSelection(false)
      }
      syncTemplateDrift()
      const schemes = allowedPaymentSchemes.value
      paymentScheme.value = schemes.includes(draft.paymentScheme) ? draft.paymentScheme : resolvePreferredScheme(schemes)
      return
    }

    if (pkg) {
      sourcePackageId.value = pkg.id
      sourceSku.value = pkg.sku
      sourceName.value = pkg.name
      activeStrategy.value = pkg.pricingStrategy
      serviceType.value = pkg.serviceType
      distributionMode.value = pkg.distributionMode

      const validIncluded = pkg.includedAccountIds.filter((id) => validIds.has(id))
      selectedAccountIds.value = validIncluded.length > 0 ? validIncluded : resolveDefaultCustomAccountIds()
      paymentScheme.value = resolvePreferredScheme(pkg.paymentSchemes)

      if (activeStrategy.value === 'CUSTOM_PER_ACCOUNT' && distributionMode.value === 'COLLAB_POST') {
        normalizeCollabSelection(false)
      }
      return
    }

    sourcePackageId.value = null
    sourceSku.value = null
    sourceName.value = 'Paket Custom Hallopedia'
    activeStrategy.value = 'CUSTOM_PER_ACCOUNT'
    serviceType.value = 'DIRECT_POST'
    distributionMode.value = activeAccounts.value.length >= COLLAB_MIN_ACCOUNTS ? 'COLLAB_POST' : 'SINGLE_ACCOUNT'
    selectedAccountIds.value = resolveDefaultCustomAccountIds()
    paymentScheme.value = resolvePreferredScheme(ALL_PAYMENT_SCHEMES)
  }

  function switchToCustomBuilder() {
    activeStrategy.value = 'CUSTOM_PER_ACCOUNT'
    sourcePackageId.value = null
    sourceSku.value = null
    sourceName.value = 'Paket Custom Hallopedia'
    notice.value = 'Mode custom aktif. Harga kini dihitung dari tarif masing-masing akun media terpilih.'
  }

  function setServiceType(nextType: ServiceType) {
    serviceType.value = nextType
    notice.value = null
    syncTemplateDrift()
  }

  function setDistributionMode(mode: DistributionMode) {
    distributionMode.value = mode
    notice.value = null
    if (mode === 'SINGLE_ACCOUNT' && selectedAccountIds.value.length > 1) {
      selectedAccountIds.value = [selectedAccountIds.value[0]!]
      notice.value = 'Mode 1 Akun Satuan aktif: pilihan disesuaikan menjadi 1 akun.'
    } else if (mode === 'COLLAB_POST') {
      normalizeCollabSelection(true)
    }
    syncTemplateDrift()
  }

  function toggleAccountSelection(accountId: string) {
    notice.value = null
    const isSelected = selectedAccountIds.value.includes(accountId)

    if (distributionMode.value === 'SINGLE_ACCOUNT') {
      selectedAccountIds.value = [accountId]
      syncTemplateDrift()
      return
    }

    if (isSelected) {
      const minRequired = distributionMode.value === 'COLLAB_POST' ? COLLAB_MIN_ACCOUNTS : 1
      if (selectedAccountIds.value.length <= minRequired) {
        notice.value =
          distributionMode.value === 'COLLAB_POST'
            ? `Mode Collab minimal ${COLLAB_MIN_ACCOUNTS} akun. Pindah ke mode "1 Akun" jika hanya membutuhkan 1 akun.`
            : 'Minimal 1 akun media harus dipilih.'
        return
      }
      selectedAccountIds.value = selectedAccountIds.value.filter((id) => id !== accountId)
      syncTemplateDrift()
      return
    }

    if (distributionMode.value === 'COLLAB_POST' && selectedAccountIds.value.length >= COLLAB_MAX_ACCOUNTS) {
      notice.value = `Batas mode Collab adalah ${COLLAB_MAX_ACCOUNTS} akun. Pindah ke "Post Terpisah" untuk memilih hingga ${activeAccounts.value.length} akun.`
      return
    }

    selectedAccountIds.value = [...selectedAccountIds.value, accountId]
    syncTemplateDrift()
  }

  function applyRegionalPreset(targetIds: readonly string[]) {
    notice.value = null
    if (targetIds.length === 0) return

    if (distributionMode.value === 'SINGLE_ACCOUNT') {
      distributionMode.value = targetIds.length > COLLAB_MAX_ACCOUNTS ? 'SEPARATE_POSTS' : 'COLLAB_POST'
    }

    if (distributionMode.value === 'COLLAB_POST' && targetIds.length > COLLAB_MAX_ACCOUNTS) {
      selectedAccountIds.value = targetIds.slice(0, COLLAB_MAX_ACCOUNTS)
      notice.value = `Preset memiliki ${targetIds.length} akun. Dipilih ${COLLAB_MAX_ACCOUNTS} akun pertama untuk mode Collab (ubah ke "Post Terpisah" untuk pilih semua).`
      syncTemplateDrift()
      return
    }

    selectedAccountIds.value = [...targetIds]
    syncTemplateDrift()
  }

  function formatAccountRateHint(account: MediaAccount): string {
    const isSelected = selectedAccountIds.value.includes(account.id)
    const isHost = isSelected && collabHostAccountId.value === account.id
    const unitPrice = getAccountUnitDisplayPrice(account, serviceType.value, distributionMode.value, isHost)
    if (distributionMode.value === 'COLLAB_POST') return isHost ? `${formatIdr(unitPrice)} · HOST` : `+${formatIdr(unitPrice)}`
    if (serviceType.value === 'VISIT_PRODUCTION') {
      return distributionMode.value === 'SEPARATE_POSTS' ? `+${formatIdr(unitPrice)} / akun` : `+${formatIdr(unitPrice)}`
    }
    return distributionMode.value === 'SEPARATE_POSTS' ? `${formatIdr(unitPrice)} / post` : formatIdr(unitPrice)
  }

  function buildProceedDraft(): ConfiguredOrderDraft | null {
    if (isFixedMode.value && fixedIncludedAccounts.value.length === 0) {
      notice.value = 'Paket tetap ini belum memiliki akun media aktif. Silakan beralih ke Konfigurator Custom.'
      return null
    }
    if (!isFixedMode.value && selectedAccountIds.value.length === 0) {
      notice.value = 'Pilih minimal 1 akun media terlebih dahulu.'
      return null
    }
    if (!isFixedMode.value && distributionMode.value === 'COLLAB_POST' && selectedAccountIds.value.length < COLLAB_MIN_ACCOUNTS) {
      notice.value = `Mode Collab membutuhkan minimal ${COLLAB_MIN_ACCOUNTS} akun media.`
      return null
    }

    return {
      sourcePackageId: lockedSourcePackage.value?.id ?? sourcePackageId.value,
      sourcePackageSku: lockedSourcePackage.value?.sku ?? sourceSku.value,
      sourceName: lockedSourcePackage.value?.name ?? sourceName.value,
      pricingStrategy: isFixedMode.value ? 'FIXED_PACKAGE' : 'CUSTOM_PER_ACCOUNT',
      serviceType: lockedSourcePackage.value?.serviceType ?? serviceType.value,
      distributionMode: lockedSourcePackage.value?.distributionMode ?? distributionMode.value,
      selectedAccountIds: lockedSourcePackage.value
        ? fixedIncludedAccounts.value.map((account) => account.id)
        : [...selectedAccountIds.value],
      paymentScheme: paymentScheme.value,
      totalPriceIdr: estimatedPrice.value,
      payNowIdr: payNowAmount.value,
    }
  }

  return {
    sourceName, serviceType, distributionMode, selectedAccountIds, paymentScheme, notice,
    activeAccounts, isFixedMode, lockedSourcePackage, allowedPaymentSchemes, paymentGridColsClass,
    distributionOptions, dynamicRegionalPresets, collabHostAccountId, activeVisitBaseFee,
    estimatedPrice, payNowAmount, isCollabAtLimit, fixedIncludedAccounts, canProceed,
    hydrateFromSource, switchToCustomBuilder, setServiceType, setDistributionMode,
    toggleAccountSelection, applyRegionalPreset, formatAccountRateHint, buildProceedDraft,
  }
}
