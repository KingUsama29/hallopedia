<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import CatalogDraftBanner from '~/components/sections/catalog/CatalogDraftBanner.vue'
import CatalogPackageCard from '~/components/sections/catalog/CatalogPackageCard.vue'
import PackageConfiguratorDrawer from '~/components/sections/catalog/PackageConfiguratorDrawer.vue'
import { useAssistantWidget } from '~/composables/useAssistantWidget'
import { useCatalogData } from '~/composables/useCatalogData'
import { useOrderDraft } from '~/composables/useOrderDraft'
import {
  REGIONAL_SCOPE_LABELS,
  type CatalogPackage,
  type ConfiguredOrderDraft,
  type RegionalScope,
  type ServiceType,
} from '~/data/catalog'

type ServiceFilter = 'ALL' | ServiceType
type ScopeFilter = 'ALL' | 'SINGLE' | RegionalScope

const catalogSection = ref<HTMLElement | null>(null)
const activeServiceFilter = ref<ServiceFilter>('ALL')
const activeScopeFilter = ref<ScopeFilter>('ALL')
const isConfiguratorOpen = ref(false)
const selectedPackage = ref<CatalogPackage | null>(null)
const editingDraft = ref<ConfiguredOrderDraft | null>(null)

const { catalogState, accounts: activeAccounts, packages: activePackages, regionGroups, loadCatalog } = useCatalogData()
const { orderDraft: activeOrderDraft, hydrateOrderDraft, saveOrderDraft, clearOrderDraft } = useOrderDraft()
const { openWidget } = useAssistantWidget()

let animationContext: { revert: () => void } | undefined

const serviceFilters: { value: ServiceFilter; label: string }[] = [
  { value: 'ALL', label: 'Semua' },
  { value: 'DIRECT_POST', label: 'Publikasi Langsung' },
  { value: 'VISIT_PRODUCTION', label: 'Kunjungan (Visit)' },
]

const scopeFilters = computed<{ value: ScopeFilter; label: string }[]>(() => {
  const filters: { value: ScopeFilter; label: string }[] = [{ value: 'ALL', label: 'Semua Wilayah' }]
  if (activePackages.value.some((pkg) => pkg.distributionMode === 'SINGLE_ACCOUNT')) {
    filters.push({ value: 'SINGLE', label: '1 Akun' })
  }
  const seenCodes = new Set<string>()
  for (const pkg of activePackages.value) {
    if (seenCodes.has(pkg.regionalScope)) continue
    seenCodes.add(pkg.regionalScope)
    const rawLabel = pkg.regionalLabel || REGIONAL_SCOPE_LABELS[pkg.regionalScope] || pkg.regionalScope
    filters.push({ value: pkg.regionalScope, label: rawLabel.replace(/^(Regional|Jaringan)\s+/i, '') })
  }
  return filters
})

watch(scopeFilters, (filters) => {
  if (!filters.some((item) => item.value === activeScopeFilter.value)) activeScopeFilter.value = 'ALL'
})

const filteredPackages = computed(() =>
  activePackages.value.filter((pkg) => {
    const matchService = activeServiceFilter.value === 'ALL' || pkg.serviceType === activeServiceFilter.value
    if (!matchService) return false
    if (activeScopeFilter.value === 'ALL') return true
    if (activeScopeFilter.value === 'SINGLE') return pkg.distributionMode === 'SINGLE_ACCOUNT'
    return pkg.regionalScope === activeScopeFilter.value
  }),
)

function openPackageConfigurator(pkg: CatalogPackage) {
  selectedPackage.value = pkg
  editingDraft.value = null
  isConfiguratorOpen.value = true
}

function openCustomConfigurator() {
  selectedPackage.value = null
  editingDraft.value = null
  isConfiguratorOpen.value = true
}

function editActiveDraft() {
  const draft = activeOrderDraft.value
  if (!draft) return
  selectedPackage.value =
    activePackages.value.find(
      (pkg) =>
        (draft.sourcePackageId && pkg.id === draft.sourcePackageId) ||
        (draft.sourcePackageSku && pkg.sku === draft.sourcePackageSku),
    ) ?? null
  editingDraft.value = draft
  isConfiguratorOpen.value = true
}

function closeConfigurator() {
  isConfiguratorOpen.value = false
}

function handleOrderProceed(draft: ConfiguredOrderDraft) {
  saveOrderDraft(draft, activeAccounts.value, activePackages.value)
  editingDraft.value = null
  isConfiguratorOpen.value = false
}

watch([filteredPackages, () => catalogState.value.status], async () => {
  if (!import.meta.client) return
  await nextTick()
  ScrollTrigger.refresh()
})

onMounted(() => {
  hydrateOrderDraft(activeAccounts.value, activePackages.value)
  const section = catalogSection.value
  if (!section || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  gsap.registerPlugin(ScrollTrigger)

  animationContext = gsap.context(() => {
    const headerItems = gsap.utils.toArray<HTMLElement>('[data-catalog-reveal]', section)
    const rules = gsap.utils.toArray<HTMLElement>('[data-catalog-rule]', section)
    const gridStage = section.querySelector<HTMLElement>('[data-catalog-grid-stage]')

    const headerTl = gsap.timeline({
      scrollTrigger: { trigger: section, start: 'top 82%', once: true },
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
        { y: 20, opacity: 0, duration: 0.55, stagger: 0.06, ease: 'power3.out', force3D: true, clearProps: 'transform,opacity' },
        '<0.05',
      )
    }

    if (gridStage) {
      gsap.from(gridStage, {
        y: 20,
        opacity: 0,
        duration: 0.5,
        ease: 'power3.out',
        force3D: true,
        clearProps: 'transform,opacity',
        scrollTrigger: { trigger: gridStage, start: 'top 88%', once: true },
      })
    }
  }, section)
})

onBeforeUnmount(() => {
  animationContext?.revert()
})
</script>

<template>
  <section
    id="katalog"
    ref="catalogSection"
    class="bg-[#f6f5f2] px-[6%] py-[clamp(96px,12vw,160px)] text-[#0b0b0b] max-[700px]:px-[5%] max-[700px]:py-[80px]"
    aria-labelledby="catalog-section-title"
  >
    <div class="mx-auto w-full max-w-[1600px]">
      <!-- Editorial Eyebrow -->
      <div data-catalog-reveal class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-[10px] text-[10px] tracking-[2px] text-[#525252] uppercase">
          <span class="h-[7px] w-[7px] rounded-full bg-[#ed3541]" aria-hidden="true"></span>
          KATALOG &amp; HARGA PERIKLANAN
        </div>
        <span class="text-[10px] tracking-[2px] text-[#595959] uppercase">PENUH · DP · INVOICE</span>
      </div>

      <!-- Display Header with Generous Whitespace -->
      <div class="mt-[clamp(32px,5vw,64px)] grid gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-end lg:gap-16">
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
          <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
            <button
              type="button"
              class="group inline-flex cursor-pointer items-center gap-3 border-b border-[#0b0b0b] pb-1.5 text-[11px] font-bold tracking-[1.5px] text-[#0b0b0b] uppercase transition-colors duration-300 hover:border-[#ed3541] hover:text-[#ed3541] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ed3541] max-[700px]:min-h-[44px]"
              @click="openCustomConfigurator"
            >
              <span>ATUR PAKET CUSTOM ({{ activeAccounts.length }} AKUN)</span>
              <span class="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">+</span>
            </button>
            <button
              type="button"
              class="inline-flex cursor-pointer items-center gap-2 border-b border-black/25 pb-1.5 text-[11px] font-semibold tracking-[1px] text-[#525252] uppercase transition-colors hover:border-[#ed3541] hover:text-[#ed3541] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ed3541] max-[700px]:min-h-[44px]"
              @click="openWidget({ tab: 'AI_CHAT' })"
            >
              <span>BINGUNG PILIH? TANYA AI</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Active Order Draft Summary Banner -->
      <CatalogDraftBanner
        v-if="activeOrderDraft"
        :draft="activeOrderDraft"
        @edit="editActiveDraft"
        @clear="clearOrderDraft"
      />

      <!-- Clean Single-Line Editorial Filter Bar -->
      <div data-catalog-rule class="mt-[clamp(44px,6vw,76px)] border-t border-black/15"></div>

      <div data-catalog-reveal class="flex flex-col gap-5 py-6 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex flex-wrap items-center gap-6" role="group" aria-label="Filter jenis layanan">
          <button
            v-for="filter in serviceFilters"
            :key="filter.value"
            type="button"
            class="cursor-pointer border-b-2 bg-transparent pb-1.5 text-[12px] font-semibold tracking-[0.5px] transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ed3541] max-[700px]:inline-flex max-[700px]:min-h-[44px] max-[700px]:items-center"
            :class="activeServiceFilter === filter.value ? 'border-[#ed3541] text-[#0b0b0b]' : 'border-transparent text-[#555] hover:text-[#0b0b0b]'"
            :aria-pressed="activeServiceFilter === filter.value"
            @click="activeServiceFilter = filter.value"
          >
            {{ filter.label }}
          </button>
        </div>

        <div class="flex flex-wrap items-center gap-2" role="group" aria-label="Filter wilayah">
          <button
            v-for="scope in scopeFilters"
            :key="scope.value"
            type="button"
            class="cursor-pointer px-3 py-1.5 text-[11px] tracking-[0.6px] transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541] max-[700px]:inline-flex max-[700px]:min-h-[44px] max-[700px]:items-center"
            :class="activeScopeFilter === scope.value ? 'bg-[#0b0b0b] font-semibold text-white' : 'bg-transparent text-[#525252] hover:text-[#0b0b0b]'"
            :aria-pressed="activeScopeFilter === scope.value"
            @click="activeScopeFilter = scope.value"
          >
            {{ scope.label }}
          </button>
        </div>
      </div>

      <div data-catalog-rule class="border-t border-black/15"></div>

      <!-- Package Cards Grid Stage (Always mounted for reliable ScrollTrigger reveal) -->
      <div data-catalog-grid-stage>
        <!-- Async Loading Skeleton (Pure Tailwind Editorial) -->
        <div
          v-if="catalogState.status === 'loading'"
          class="mt-[clamp(36px,5vw,60px)] grid gap-7 md:grid-cols-2 xl:grid-cols-3 lg:gap-8"
          aria-busy="true"
          aria-label="Memuat paket katalog iklan"
        >
          <div v-for="idx in 3" :key="idx" class="flex flex-col justify-between border border-black/15 bg-white p-7 max-[700px]:p-5">
            <div>
              <div class="flex items-center justify-between border-b border-black/10 pb-4">
                <div class="h-3 w-20 bg-black/10"></div>
                <div class="h-4 w-28 bg-black/10"></div>
              </div>
              <div class="mt-5 space-y-2.5">
                <div class="h-3 w-28 bg-[#ed3541]/25"></div>
                <div class="h-7 w-4/5 bg-black/15"></div>
                <div class="h-4 w-full bg-black/10"></div>
              </div>
              <div class="mt-6 border-y border-black/10 py-4">
                <div class="h-9 w-40 bg-black/15"></div>
              </div>
            </div>
            <div class="mt-7 h-11 w-full bg-black/15"></div>
          </div>
        </div>

        <!-- Async Error State -->
        <div v-else-if="catalogState.status === 'error'" role="alert" class="mt-12 border border-[#ed3541] bg-white p-8 text-center">
          <p class="text-[14px] font-semibold text-[#0b0b0b]">{{ catalogState.message }}</p>
          <button
            type="button"
            class="mt-4 cursor-pointer border border-[#0b0b0b] bg-[#0b0b0b] px-5 py-2.5 text-[11px] font-semibold tracking-[1.2px] text-white uppercase transition-colors hover:border-[#ed3541] hover:bg-[#ed3541] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541] max-[700px]:min-h-[44px]"
            @click="loadCatalog()"
          >
            MUAT ULANG KATALOG
          </button>
        </div>

        <!-- Package Grid -->
        <TransitionGroup
          v-else-if="filteredPackages.length"
          tag="div"
          data-catalog-grid
          class="mt-[clamp(36px,5vw,60px)] grid gap-7 md:grid-cols-2 xl:grid-cols-3 lg:gap-8"
          enter-active-class="transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none"
          enter-from-class="opacity-0 translate-y-3"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition-opacity duration-150 ease-in motion-reduce:transition-none"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <CatalogPackageCard
            v-for="pkg in filteredPackages"
            :key="pkg.id"
            :pkg="pkg"
            :accounts="activeAccounts"
            @select="openPackageConfigurator"
          />
        </TransitionGroup>

        <!-- Empty Filter State -->
        <div v-else class="mt-12 border border-black/15 bg-white p-10 text-center">
          <p class="text-[14px] text-[#555]">
            Belum ada paket kurasi untuk filter ini. Anda dapat memilih akun secara bebas melalui konfigurator custom.
          </p>
          <button
            type="button"
            class="mt-4 cursor-pointer border border-[#0b0b0b] bg-[#0b0b0b] px-5 py-2.5 text-[11px] font-semibold tracking-[1.2px] text-white uppercase focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541] max-[700px]:min-h-[44px]"
            @click="openCustomConfigurator"
          >
            BUKA KONFIGURATOR CUSTOM +
          </button>
        </div>
      </div>
    </div>

    <!-- Modular Configurator Drawer -->
    <PackageConfiguratorDrawer
      :is-open="isConfiguratorOpen"
      :accounts="activeAccounts"
      :region-groups="regionGroups"
      :source-package="selectedPackage"
      :initial-draft="editingDraft"
      @close="closeConfigurator"
      @proceed="handleOrderProceed"
    />
  </section>
</template>
