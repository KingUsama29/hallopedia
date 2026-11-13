<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  CATALOG_PACKAGES,
  COLLAB_MAX_ACCOUNTS,
  DISTRIBUTION_MODE_LABELS,
  MEDIA_ACCOUNTS,
  PAYMENT_SCHEME_LABELS,
  REGIONAL_SCOPE_LABELS,
  SERVICE_TYPE_LABELS,
  calculateCustomPackagePrice,
  formatIdr,
  getAccountsByIds,
  type CatalogPackage,
  type DistributionMode,
  type PaymentScheme,
  type RegionalScope,
  type ServiceType,
} from '~/data/catalog'

type ServiceFilter = 'ALL' | ServiceType
type ScopeFilter = 'ALL' | 'SINGLE' | RegionalScope

const catalogSection = ref<HTMLElement | null>(null)
const activeServiceFilter = ref<ServiceFilter>('ALL')
const activeScopeFilter = ref<ScopeFilter>('ALL')

// Configurator Drawer State
const isConfiguratorOpen = ref(false)
const configSourceName = ref<string>('Paket Custom Jaringan')
const configServiceType = ref<ServiceType>('DIRECT_POST')
const configDistributionMode = ref<DistributionMode>('COLLAB_POST')
const configSelectedAccountIds = ref<string[]>([
  'hallosamarinda',
  'busamsamarinda',
  'samarindaterkini',
  'samarindaku',
  'samarindamedsos',
])
const configPaymentScheme = ref<PaymentScheme>('DP')
const configNotice = ref<string | null>(null)

let animationContext: { revert: () => void } | undefined

const serviceFilters: { value: ServiceFilter; label: string }[] = [
  { value: 'ALL', label: 'Semua' },
  { value: 'DIRECT_POST', label: 'Publikasi Langsung' },
  { value: 'VISIT_PRODUCTION', label: 'Kunjungan (Visit)' },
]

const scopeFilters: { value: ScopeFilter; label: string }[] = [
  { value: 'ALL', label: 'Semua Wilayah' },
  { value: 'SINGLE', label: '1 Akun' },
  { value: 'SAMARINDA', label: 'Samarinda' },
  { value: 'BALIKPAPAN', label: 'Balikpapan' },
  { value: 'KALTIM', label: 'Kaltim & Kalimantan' },
]

const filteredPackages = computed(() => {
  return CATALOG_PACKAGES.filter((pkg) => {
    const matchService =
      activeServiceFilter.value === 'ALL' ||
      pkg.serviceType === activeServiceFilter.value

    if (!matchService) return false

    if (activeScopeFilter.value === 'ALL') return true
    if (activeScopeFilter.value === 'SINGLE') {
      return pkg.distributionMode === 'SINGLE_ACCOUNT'
    }
    if (activeScopeFilter.value === 'KALTIM') {
      return pkg.regionalScope === 'KALTIM' || pkg.regionalScope === 'KALIMANTAN'
    }
    return pkg.regionalScope === activeScopeFilter.value
  })
})

const configEstimatedPrice = computed(() =>
  calculateCustomPackagePrice({
    serviceType: configServiceType.value,
    distributionMode: configDistributionMode.value,
    accountCount: configSelectedAccountIds.value.length,
  }),
)

const configPayNowAmount = computed(() => {
  if (configPaymentScheme.value === 'DP') {
    return Math.round(configEstimatedPrice.value * 0.5)
  }
  if (configPaymentScheme.value === 'FULL') {
    return configEstimatedPrice.value
  }
  return 0
})

const isCollabAtLimit = computed(
  () =>
    configDistributionMode.value === 'COLLAB_POST' &&
    configSelectedAccountIds.value.length >= COLLAB_MAX_ACCOUNTS,
)

function openPackageConfigurator(pkg: CatalogPackage) {
  configSourceName.value = pkg.name
  configServiceType.value = pkg.serviceType
  configDistributionMode.value = pkg.distributionMode
  configSelectedAccountIds.value = [...pkg.includedAccountIds]
  configPaymentScheme.value = 'DP'
  configNotice.value = null
  isConfiguratorOpen.value = true
}

function openCustomConfigurator() {
  configSourceName.value = 'Paket Custom Hallopedia'
  configServiceType.value = 'DIRECT_POST'
  configDistributionMode.value = 'COLLAB_POST'
  configSelectedAccountIds.value = [
    'hallosamarinda',
    'busamsamarinda',
    'samarindaterkini',
  ]
  configPaymentScheme.value = 'DP'
  configNotice.value = null
  isConfiguratorOpen.value = true
}

function closeConfigurator() {
  isConfiguratorOpen.value = false
}

function setDistributionMode(mode: DistributionMode) {
  configDistributionMode.value = mode
  configNotice.value = null

  if (mode === 'SINGLE_ACCOUNT' && configSelectedAccountIds.value.length > 1) {
    configSelectedAccountIds.value = [configSelectedAccountIds.value[0]!]
    configNotice.value =
      'Mode 1 Akun Satuan aktif: pilihan disesuaikan menjadi 1 akun.'
    return
  }

  if (
    mode === 'COLLAB_POST' &&
    configSelectedAccountIds.value.length > COLLAB_MAX_ACCOUNTS
  ) {
    configSelectedAccountIds.value = configSelectedAccountIds.value.slice(
      0,
      COLLAB_MAX_ACCOUNTS,
    )
    configNotice.value = `Mode Collab maksimal ${COLLAB_MAX_ACCOUNTS} akun. Gunakan "Post Terpisah" untuk lebih dari ${COLLAB_MAX_ACCOUNTS} akun.`
  }
}

function toggleAccountSelection(accountId: string) {
  configNotice.value = null
  const isSelected = configSelectedAccountIds.value.includes(accountId)

  if (configDistributionMode.value === 'SINGLE_ACCOUNT') {
    configSelectedAccountIds.value = [accountId]
    return
  }

  if (isSelected) {
    if (configSelectedAccountIds.value.length === 1) {
      configNotice.value = 'Minimal 1 akun media harus dipilih.'
      return
    }
    configSelectedAccountIds.value = configSelectedAccountIds.value.filter(
      (id) => id !== accountId,
    )
    return
  }

  if (
    configDistributionMode.value === 'COLLAB_POST' &&
    configSelectedAccountIds.value.length >= COLLAB_MAX_ACCOUNTS
  ) {
    configNotice.value = `Batas mode Collab adalah ${COLLAB_MAX_ACCOUNTS} akun. Pindah ke "Post Terpisah" untuk memilih hingga 12 akun.`
    return
  }

  configSelectedAccountIds.value = [...configSelectedAccountIds.value, accountId]
}

function applyRegionalPreset(
  preset: 'SAMARINDA' | 'BALIKPAPAN' | 'KALTIM_ALL' | 'ALL_12',
) {
  configNotice.value = null

  let targetIds: string[] = []
  if (preset === 'SAMARINDA') {
    targetIds = MEDIA_ACCOUNTS.filter((a) => a.region === 'SAMARINDA').map(
      (a) => a.id,
    )
  } else if (preset === 'BALIKPAPAN') {
    targetIds = MEDIA_ACCOUNTS.filter((a) => a.region === 'BALIKPAPAN').map(
      (a) => a.id,
    )
  } else if (preset === 'KALTIM_ALL') {
    targetIds = MEDIA_ACCOUNTS.filter(
      (a) => a.region === 'KALTIM' || a.region === 'KALIMANTAN',
    ).map((a) => a.id)
  } else {
    targetIds = MEDIA_ACCOUNTS.map((a) => a.id)
  }

  if (configDistributionMode.value === 'SINGLE_ACCOUNT') {
    configDistributionMode.value =
      targetIds.length > COLLAB_MAX_ACCOUNTS ? 'SEPARATE_POSTS' : 'COLLAB_POST'
  }

  if (
    configDistributionMode.value === 'COLLAB_POST' &&
    targetIds.length > COLLAB_MAX_ACCOUNTS
  ) {
    configSelectedAccountIds.value = targetIds.slice(0, COLLAB_MAX_ACCOUNTS)
    configNotice.value = `Preset memiliki ${targetIds.length} akun. Dipilih ${COLLAB_MAX_ACCOUNTS} akun pertama untuk mode Collab (ubah ke "Post Terpisah" untuk pilih semua).`
    return
  }

  configSelectedAccountIds.value = targetIds
}

const nuxtApp = useNuxtApp()

function getLenis(): { stop?: () => void; start?: () => void } | undefined {
  return nuxtApp.$lenis as { stop?: () => void; start?: () => void } | undefined
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isConfiguratorOpen.value) {
    closeConfigurator()
  }
}

watch(isConfiguratorOpen, (open) => {
  if (!import.meta.client) return
  document.body.style.overflow = open ? 'hidden' : ''
  const lenis = getLenis()
  if (open) {
    lenis?.stop?.()
  } else {
    lenis?.start?.()
  }
})

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)

  const section = catalogSection.value
  if (!section) return

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches
  if (prefersReducedMotion) return

  gsap.registerPlugin(ScrollTrigger)

  animationContext = gsap.context(() => {
    const headerItems = gsap.utils.toArray<HTMLElement>(
      '[data-catalog-reveal]',
      section,
    )
    const rules = gsap.utils.toArray<HTMLElement>('[data-catalog-rule]', section)
    const cards = gsap.utils.toArray<HTMLElement>('[data-catalog-card]', section)

    const headerTl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top 82%',
        once: true,
      },
    })

    if (rules.length) {
      headerTl.from(rules, {
        scaleX: 0,
        transformOrigin: 'left center',
        duration: 0.75,
        ease: 'power4.out',
        stagger: 0.08,
        force3D: true,
        clearProps: 'transform',
      })
    }

    if (headerItems.length) {
      headerTl.from(
        headerItems,
        {
          y: 20,
          opacity: 0,
          duration: 0.55,
          stagger: 0.06,
          ease: 'power3.out',
          force3D: true,
          clearProps: 'transform,opacity',
        },
        '<0.05',
      )
    }

    if (cards.length) {
      gsap.from(cards, {
        y: 24,
        opacity: 0,
        duration: 0.55,
        stagger: { amount: 0.28, from: 'start' },
        ease: 'power3.out',
        force3D: true,
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: '[data-catalog-grid]',
          start: 'top 86%',
          once: true,
        },
      })
    }
  }, section)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (import.meta.client) {
    document.body.style.overflow = ''
    getLenis()?.start?.()
  }
  animationContext?.revert()
})
</script>

<template>
  <section
    id="katalog"
    ref="catalogSection"
    class="bg-[#f6f5f2] px-[6%] py-[clamp(96px,12vw,160px)] text-[#0b0b0b]
      max-[700px]:px-[5%] max-[700px]:py-[80px]"
    aria-labelledby="catalog-section-title"
  >
    <div class="mx-auto w-full max-w-[1600px]">
      <!-- Editorial Eyebrow -->
      <div
        data-catalog-reveal
        class="flex flex-wrap items-center justify-between gap-4"
      >
        <div class="flex items-center gap-[10px] text-[10px] tracking-[2px] text-[#666] uppercase">
          <span class="h-[7px] w-[7px] rounded-full bg-[#ed3541]" aria-hidden="true"></span>
          KATALOG &amp; HARGA PERIKLANAN
        </div>
        <span class="text-[10px] tracking-[2px] text-[#888] uppercase">
          PENUH · DP · INVOICE
        </span>
      </div>

      <!-- Display Header with Generous Whitespace -->
      <div
        class="mt-[clamp(32px,5vw,64px)] grid gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-end lg:gap-16"
      >
        <h2
          id="catalog-section-title"
          data-catalog-reveal
          class="text-[clamp(38px,5.4vw,84px)] font-extrabold leading-[0.9] tracking-[-0.055em]"
        >
          Paket Iklan.<br />
          <span class="text-[#ed3541]">Harga Transparan.</span>
        </h2>

        <div data-catalog-reveal class="flex flex-col items-start gap-6 lg:max-w-[380px] lg:justify-self-end">
          <p class="m-0 text-[14px] leading-[1.7] text-[#555]">
            Pilih <strong>Publikasi Langsung</strong> atau <strong>Kunjungan Produksi</strong>.
            Tersedia paket satuan, <strong>Collab (maks. 5 akun)</strong>, hingga <strong>Post Terpisah</strong> lintas Kalimantan.
          </p>
          <button
            type="button"
            class="group inline-flex cursor-pointer items-center gap-3 border-b border-[#0b0b0b] pb-1.5
              text-[11px] font-bold tracking-[1.5px] text-[#0b0b0b] uppercase transition-colors
              duration-300 hover:border-[#ed3541] hover:text-[#ed3541] focus-visible:outline
              focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ed3541]"
            @click="openCustomConfigurator"
          >
            <span>ATUR PAKET CUSTOM (12 AKUN)</span>
            <span class="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">+</span>
          </button>
        </div>
      </div>

      <!-- Clean Single-Line Editorial Filter Bar -->
      <div data-catalog-rule class="mt-[clamp(44px,6vw,76px)] border-t border-black/15"></div>

      <div
        data-catalog-reveal
        class="flex flex-col gap-5 py-6 lg:flex-row lg:items-center lg:justify-between"
      >
        <!-- Service Type Underline Tabs -->
        <div class="flex flex-wrap items-center gap-6" role="group" aria-label="Filter jenis layanan">
          <button
            v-for="filter in serviceFilters"
            :key="filter.value"
            type="button"
            class="cursor-pointer border-b-2 bg-transparent pb-1.5 text-[12px] font-semibold tracking-[0.5px]
              transition-colors duration-200 focus-visible:outline focus-visible:outline-2
              focus-visible:outline-offset-4 focus-visible:outline-[#ed3541]"
            :class="
              activeServiceFilter === filter.value
                ? 'border-[#ed3541] text-[#0b0b0b]'
                : 'border-transparent text-[#777] hover:text-[#0b0b0b]'
            "
            :aria-pressed="activeServiceFilter === filter.value"
            @click="activeServiceFilter = filter.value"
          >
            {{ filter.label }}
          </button>
        </div>

        <!-- Regional Minimalist Filter -->
        <div class="flex flex-wrap items-center gap-2" role="group" aria-label="Filter wilayah">
          <button
            v-for="scope in scopeFilters"
            :key="scope.value"
            type="button"
            class="cursor-pointer px-3 py-1.5 text-[11px] tracking-[0.6px] transition-colors duration-200
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
              focus-visible:outline-[#ed3541]"
            :class="
              activeScopeFilter === scope.value
                ? 'bg-[#0b0b0b] font-semibold text-white'
                : 'bg-transparent text-[#666] hover:text-[#0b0b0b]'
            "
            :aria-pressed="activeScopeFilter === scope.value"
            @click="activeScopeFilter = scope.value"
          >
            {{ scope.label }}
          </button>
        </div>
      </div>

      <div data-catalog-rule class="border-t border-black/15"></div>

      <!-- Package Cards Grid -->
      <div
        v-if="filteredPackages.length"
        data-catalog-grid
        class="mt-[clamp(36px,5vw,60px)] grid gap-7 md:grid-cols-2 xl:grid-cols-3 lg:gap-8"
      >
        <article
          v-for="pkg in filteredPackages"
          :key="pkg.id"
          data-catalog-card
          class="group relative flex flex-col justify-between border border-black/20 bg-white p-7
            transition-colors duration-300 hover:border-[#0b0b0b] max-[700px]:p-5"
        >
          <!-- Editorial Corner Marks (Active on hover / featured) -->
          <span
            class="pointer-events-none absolute top-0 left-0 h-[10px] w-[10px] border-t-2 border-l-2
              transition-colors duration-300"
            :class="pkg.featured ? 'border-[#ed3541]' : 'border-transparent group-hover:border-[#ed3541]'"
            aria-hidden="true"
          ></span>
          <span
            class="pointer-events-none absolute right-0 bottom-0 h-[10px] w-[10px] border-r-2 border-b-2
              transition-colors duration-300"
            :class="pkg.featured ? 'border-[#ed3541]' : 'border-transparent group-hover:border-[#ed3541]'"
            aria-hidden="true"
          ></span>

          <div>
            <!-- Top Strip: SKU + Service & Distribution Badges -->
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 pb-4">
              <span class="text-[10px] font-semibold tracking-[1.8px] text-[#666] uppercase">
                {{ pkg.sku }}
              </span>
              <div class="flex flex-wrap items-center gap-1.5">
                <span
                  class="px-2 py-0.5 text-[9px] font-semibold tracking-[1.2px] uppercase"
                  :class="
                    pkg.serviceType === 'VISIT_PRODUCTION'
                      ? 'bg-[#ed3541] text-white'
                      : 'bg-[#0b0b0b] text-white'
                  "
                >
                  {{ SERVICE_TYPE_LABELS[pkg.serviceType] }}
                </span>
                <span class="border border-black/20 px-2 py-0.5 text-[9px] tracking-[1px] text-[#444] uppercase">
                  {{ DISTRIBUTION_MODE_LABELS[pkg.distributionMode] }}
                </span>
              </div>
            </div>

            <!-- Package Title & Tagline -->
            <div class="mt-5">
              <div class="text-[10px] tracking-[1.5px] text-[#ed3541] uppercase">
                {{ REGIONAL_SCOPE_LABELS[pkg.regionalScope] }}
              </div>
              <h3 class="mt-1.5 text-[clamp(22px,2vw,28px)] font-bold leading-[1.12] tracking-[-0.035em] text-[#0b0b0b]">
                {{ pkg.name }}
              </h3>
              <p class="mt-2.5 text-[13px] leading-[1.6] text-[#555]">
                {{ pkg.tagline }}
              </p>
            </div>

            <!-- Price Block -->
            <div class="mt-6 border-y border-black/10 py-4">
              <div class="text-[10px] tracking-[1.5px] text-[#666] uppercase">ESTIMASI HARGA MULAI</div>
              <div class="mt-1 text-[clamp(28px,2.8vw,38px)] font-black tracking-[-0.04em] text-[#0b0b0b]">
                {{ formatIdr(pkg.priceIdr) }}
              </div>
              <div class="mt-1 text-[11px] text-[#666]">
                {{ pkg.priceNote }}
              </div>
            </div>

            <!-- Included Media Accounts (4 real logos + monogram editorial) -->
            <div class="mt-5">
              <div class="flex items-center justify-between text-[10px] tracking-[1.5px] text-[#666] uppercase">
                <span>AKUN JARINGAN ({{ pkg.includedAccountIds.length }})</span>
                <span v-if="pkg.distributionMode === 'COLLAB_POST'" class="text-[#ed3541]">
                  MAX 5 COLLAB
                </span>
              </div>

              <div class="mt-3 flex flex-wrap gap-1.5">
                <div
                  v-for="account in getAccountsByIds(pkg.includedAccountIds).slice(0, 6)"
                  :key="account.id"
                  class="inline-flex items-center gap-1.5 border border-black/15 bg-[#f6f5f2] px-2 py-1"
                  :title="`${account.name} (${account.handle})`"
                >
                  <img
                    v-if="account.logoPath"
                    :src="account.logoPath"
                    :alt="`Logo ${account.name}`"
                    class="h-4 w-4 object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  <span
                    v-else
                    class="flex h-4 w-4 items-center justify-center bg-[#0b0b0b] text-[8px] font-bold tracking-tight text-white"
                    aria-hidden="true"
                  >
                    {{ account.monogram }}
                  </span>
                  <span class="text-[10px] font-medium text-[#0b0b0b]">
                    {{ account.handle }}
                  </span>
                </div>
                <div
                  v-if="pkg.includedAccountIds.length > 6"
                  class="inline-flex items-center border border-black/15 bg-[#0b0b0b] px-2 py-1 text-[10px] font-semibold text-white"
                >
                  +{{ pkg.includedAccountIds.length - 6 }} AKUN LAINNYA
                </div>
              </div>
            </div>

            <!-- Deliverables Checklist -->
            <ul class="mt-5 space-y-2 border-t border-black/10 pt-4 text-[12px] leading-[1.5] text-[#333]">
              <li
                v-for="(item, idx) in pkg.deliverables"
                :key="idx"
                class="flex items-start gap-2.5"
              >
                <span class="mt-[1px] font-bold text-[#ed3541]" aria-hidden="true">+</span>
                <span>{{ item }}</span>
              </li>
            </ul>
          </div>

          <!-- Footer: Payment Schemes & CTA -->
          <div class="mt-7 border-t border-black/15 pt-4">
            <div class="flex items-center justify-between text-[9px] tracking-[1.5px] text-[#666] uppercase">
              <span>SKEMA BAYAR</span>
              <span class="font-semibold text-[#0b0b0b]">
                {{ pkg.paymentSchemes.map((s) => PAYMENT_SCHEME_LABELS[s]).join(' · ') }}
              </span>
            </div>

            <button
              type="button"
              class="mt-4 flex w-full cursor-pointer items-center justify-between border border-[#0b0b0b]
                bg-transparent px-4 py-3 text-[11px] font-bold tracking-[1.4px] text-[#0b0b0b] uppercase
                transition-colors duration-300 group-hover:bg-[#0b0b0b] group-hover:text-white
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                focus-visible:outline-[#ed3541]"
              @click="openPackageConfigurator(pkg)"
            >
              <span>PILIH &amp; SESUAIKAN AKUN</span>
              <span class="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-0.5" aria-hidden="true">↗</span>
            </button>
          </div>
        </article>
      </div>

      <!-- Empty Filter State -->
      <div
        v-else
        class="mt-12 border border-black/15 bg-white p-10 text-center"
      >
        <p class="text-[14px] text-[#555]">
          Belum ada paket kurasi untuk filter ini. Anda dapat memilih akun secara bebas melalui konfigurator custom.
        </p>
        <button
          type="button"
          class="mt-4 cursor-pointer border border-[#0b0b0b] bg-[#0b0b0b] px-5 py-2.5 text-[11px] font-semibold tracking-[1.2px] text-white uppercase"
          @click="openCustomConfigurator"
        >
          BUKA KONFIGURATOR CUSTOM +
        </button>
      </div>
    </div>

    <!-- Slide-Over Package Configurator Drawer -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-250 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isConfiguratorOpen"
          class="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="configurator-title"
          @click.self="closeConfigurator"
        >
          <div
            data-lenis-prevent
            class="editorial-scrollbar flex h-full w-full max-w-[580px] flex-col justify-between
              overflow-y-auto overscroll-contain border-l border-[#292929] bg-[#0b0b0b] p-7
              text-white max-[700px]:p-5"
          >
          <div>
            <!-- Drawer Header -->
            <div class="flex items-start justify-between gap-4 border-b border-[#292929] pb-5">
              <div>
                <div class="flex items-center gap-2 text-[10px] tracking-[2px] text-[#aaa] uppercase">
                  <span class="h-[6px] w-[6px] rounded-full bg-[#ed3541]" aria-hidden="true"></span>
                  KONFIGURATOR PAKET (SIMULASI DUMMY)
                </div>
                <h3 id="configurator-title" class="mt-2 text-[22px] font-bold tracking-[-0.03em]">
                  {{ configSourceName }}
                </h3>
              </div>
              <button
                type="button"
                class="cursor-pointer border border-[#292929] px-3 py-1.5 text-[10px] tracking-[1.5px] text-[#aaa] uppercase transition-colors hover:border-[#ed3541] hover:text-white"
                aria-label="Tutup konfigurator"
                @click="closeConfigurator"
              >
                TUTUP ✕
              </button>
            </div>

            <!-- 1. Jenis Layanan -->
            <div class="mt-6">
              <div class="text-[10px] tracking-[1.8px] text-[#888] uppercase">1. JENIS LAYANAN</div>
              <div class="mt-2.5 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  class="cursor-pointer border px-3 py-3 text-left transition-colors"
                  :class="
                    configServiceType === 'DIRECT_POST'
                      ? 'border-[#ed3541] bg-[#171717] text-white'
                      : 'border-[#292929] bg-transparent text-[#aaa] hover:border-white/40'
                  "
                  @click="configServiceType = 'DIRECT_POST'"
                >
                  <div class="text-[11px] font-bold tracking-[1px] uppercase">Publikasi Langsung</div>
                  <div class="mt-1 text-[11px] text-[#888]">Materi dari pengiklan</div>
                </button>
                <button
                  type="button"
                  class="cursor-pointer border px-3 py-3 text-left transition-colors"
                  :class="
                    configServiceType === 'VISIT_PRODUCTION'
                      ? 'border-[#ed3541] bg-[#171717] text-white'
                      : 'border-[#292929] bg-transparent text-[#aaa] hover:border-white/40'
                  "
                  @click="configServiceType = 'VISIT_PRODUCTION'"
                >
                  <div class="text-[11px] font-bold tracking-[1px] uppercase">Kunjungan (Visit)</div>
                  <div class="mt-1 text-[11px] text-[#888]">Tim produksi ke lokasi</div>
                </button>
              </div>
            </div>

            <!-- 2. Mode Posting / Distribusi -->
            <div class="mt-6">
              <div class="text-[10px] tracking-[1.8px] text-[#888] uppercase">2. MODE POSTING AKUN</div>
              <div class="mt-2.5 grid gap-2 sm:grid-cols-3">
                <button
                  v-for="mode in (['SINGLE_ACCOUNT', 'COLLAB_POST', 'SEPARATE_POSTS'] as const)"
                  :key="mode"
                  type="button"
                  class="cursor-pointer border px-3 py-2.5 text-left transition-colors"
                  :class="
                    configDistributionMode === mode
                      ? 'border-[#ed3541] bg-[#171717] text-white'
                      : 'border-[#292929] bg-transparent text-[#aaa] hover:border-white/40'
                  "
                  @click="setDistributionMode(mode)"
                >
                  <div class="text-[10px] font-bold tracking-[1px] uppercase">
                    {{ mode === 'SINGLE_ACCOUNT' ? '1 Akun' : mode === 'COLLAB_POST' ? 'Collab (Max 5)' : 'Post Terpisah' }}
                  </div>
                  <div class="mt-0.5 text-[10px] text-[#888]">
                    {{ mode === 'SINGLE_ACCOUNT' ? 'Fokus 1 akun' : mode === 'COLLAB_POST' ? '1 post 2–5 akun' : 'Tanpa batas collab' }}
                  </div>
                </button>
              </div>
            </div>

            <!-- 3. Preset Regional & Pilihan 12 Akun -->
            <div class="mt-6">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="text-[10px] tracking-[1.8px] text-[#888] uppercase">
                  3. PILIH AKUN MEDIA ({{ configSelectedAccountIds.length }} TERPILIH)
                </span>
                <span
                  v-if="configDistributionMode === 'COLLAB_POST'"
                  class="text-[10px] font-semibold tracking-[1px] text-[#ed3541] uppercase"
                >
                  KUOTA COLLAB: {{ configSelectedAccountIds.length }}/{{ COLLAB_MAX_ACCOUNTS }}
                </span>
              </div>

              <!-- Quick Regional Presets -->
              <div class="mt-2.5 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  class="cursor-pointer border border-[#292929] px-2.5 py-1 text-[10px] tracking-[1px] text-[#ccc] uppercase hover:border-[#ed3541] hover:text-white"
                  @click="applyRegionalPreset('SAMARINDA')"
                >
                  Regional Samarinda (6)
                </button>
                <button
                  type="button"
                  class="cursor-pointer border border-[#292929] px-2.5 py-1 text-[10px] tracking-[1px] text-[#ccc] uppercase hover:border-[#ed3541] hover:text-white"
                  @click="applyRegionalPreset('BALIKPAPAN')"
                >
                  Regional Balikpapan (3)
                </button>
                <button
                  type="button"
                  class="cursor-pointer border border-[#292929] px-2.5 py-1 text-[10px] tracking-[1px] text-[#ccc] uppercase hover:border-[#ed3541] hover:text-white"
                  @click="applyRegionalPreset('KALTIM_ALL')"
                >
                  Kaltim &amp; Kalimantan (3)
                </button>
                <button
                  type="button"
                  class="cursor-pointer border border-[#292929] px-2.5 py-1 text-[10px] tracking-[1px] text-[#ccc] uppercase hover:border-[#ed3541] hover:text-white"
                  @click="applyRegionalPreset('ALL_12')"
                >
                  Semua 12 Akun
                </button>
              </div>

              <!-- Validation Notice -->
              <p
                v-if="configNotice"
                class="mt-3 border-l-2 border-[#ed3541] bg-[#171717] px-3 py-2 text-[11px] leading-[1.5] text-[#f5f5f5]"
              >
                {{ configNotice }}
              </p>

              <!-- 12 Accounts Grid -->
              <div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  v-for="account in MEDIA_ACCOUNTS"
                  :key="account.id"
                  type="button"
                  class="flex cursor-pointer items-center justify-between border px-3 py-2 text-left transition-colors"
                  :class="
                    configSelectedAccountIds.includes(account.id)
                      ? 'border-[#ed3541] bg-[#171717] text-white'
                      : isCollabAtLimit
                        ? 'cursor-not-allowed border-[#222] bg-transparent text-[#555]'
                        : 'border-[#292929] bg-transparent text-[#bbb] hover:border-white/40'
                  "
                  @click="toggleAccountSelection(account.id)"
                >
                  <div class="flex min-w-0 items-center gap-2.5">
                    <img
                      v-if="account.logoPath"
                      :src="account.logoPath"
                      :alt="`Logo ${account.name}`"
                      class="h-6 w-6 shrink-0 object-cover"
                    />
                    <span
                      v-else
                      class="flex h-6 w-6 shrink-0 items-center justify-center border border-[#333] bg-[#141414] text-[9px] font-bold text-white"
                    >
                      {{ account.monogram }}
                    </span>
                    <div class="min-w-0">
                      <div class="truncate text-[11px] font-semibold">{{ account.name }}</div>
                      <div class="text-[9px] tracking-[1px] text-[#777] uppercase">{{ account.region }}</div>
                    </div>
                  </div>
                  <span
                    class="ml-2 text-[11px] font-bold"
                    :class="configSelectedAccountIds.includes(account.id) ? 'text-[#ed3541]' : 'text-[#555]'"
                    aria-hidden="true"
                  >
                    {{ configSelectedAccountIds.includes(account.id) ? '✓' : '+' }}
                  </span>
                </button>
              </div>
            </div>

            <!-- 4. Skema Pembayaran -->
            <div class="mt-6">
              <div class="text-[10px] tracking-[1.8px] text-[#888] uppercase">4. PILIHAN SKEMA BAYAR</div>
              <div class="mt-2.5 grid grid-cols-3 gap-2">
                <button
                  v-for="scheme in (['FULL', 'DP', 'INVOICE'] as const)"
                  :key="scheme"
                  type="button"
                  class="cursor-pointer border px-3 py-2 text-center text-[10px] font-bold tracking-[1.2px] uppercase transition-colors"
                  :class="
                    configPaymentScheme === scheme
                      ? 'border-[#ed3541] bg-[#ed3541] text-white'
                      : 'border-[#292929] bg-transparent text-[#aaa] hover:border-white/40'
                  "
                  @click="configPaymentScheme = scheme"
                >
                  {{ PAYMENT_SCHEME_LABELS[scheme] }}
                </button>
              </div>
            </div>
          </div>

          <!-- Drawer Summary Footer -->
          <div class="mt-8 border-t border-[#292929] pt-5">
            <div class="flex items-baseline justify-between">
              <span class="text-[10px] tracking-[1.5px] text-[#888] uppercase">TOTAL ESTIMASI PAKET</span>
              <span class="text-[24px] font-black tracking-[-0.03em] text-white">
                {{ formatIdr(configEstimatedPrice) }}
              </span>
            </div>
            <div class="mt-1 flex items-baseline justify-between text-[12px] text-[#aaa]">
              <span>
                {{
                  configPaymentScheme === 'DP'
                    ? 'Bayar Awal (DP 50%)'
                    : configPaymentScheme === 'FULL'
                      ? 'Bayar Penuh Sekarang'
                      : 'Tagihan Invoice Pascatayang'
                }}
              </span>
              <span class="font-semibold text-[#ed3541]">
                {{ configPaymentScheme === 'INVOICE' ? 'Sesuai Kesepakatan' : formatIdr(configPayNowAmount) }}
              </span>
            </div>

            <div class="mt-4 border border-[#292929] bg-[#141414] px-3.5 py-2.5 text-[11px] leading-[1.5] text-[#aaa]">
              Pratinjau Katalog: Halaman Checkout Midtrans &amp; unggah brief/materi akan aktif setelah integrasi backend pada tahap berikutnya.
            </div>
          </div>
        </div>
      </div>
      </Transition>
    </Teleport>
  </section>
</template>
