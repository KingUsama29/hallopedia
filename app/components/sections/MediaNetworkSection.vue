<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import MediaAccountSpotlight from '~/components/sections/media/MediaAccountSpotlight.vue'
import { useCatalogData } from '~/composables/useCatalogData'
import {
  formatCompactCount, formatIdr, resolveAccountPlatformLabel, sanitizeExternalProfileUrl, type MediaAccount,
} from '~/data/catalog'

const networkSection = ref<HTMLElement | null>(null)
const activeRegionCode = ref<string>('ALL')
const spotlightAccountId = ref<string | null>(null)
const expandedMobileAccountId = ref<string | null>(null)

const { catalogState, accounts, regionGroups, loadCatalog } = useCatalogData()
const nuxtApp = useNuxtApp()
let animationContext: { revert: () => void } | undefined

const regionFilters = computed(() => [
  { code: 'ALL', label: `Semua Wilayah (${accounts.value.length})` },
  ...regionGroups.value
    .filter((group) => group.accountIds.length > 0)
    .map((group) => ({
      code: group.code,
      label: `${group.label} (${group.accountIds.length})`,
    })),
])

watch(regionFilters, (filters) => {
  if (!filters.some((item) => item.code === activeRegionCode.value)) {
    activeRegionCode.value = 'ALL'
  }
})

const filteredAccounts = computed(() =>
  activeRegionCode.value === 'ALL'
    ? accounts.value
    : accounts.value.filter((account) => account.regionCode === activeRegionCode.value),
)

const activeSpotlight = computed<MediaAccount | null>(() => {
  const list = filteredAccounts.value
  if (!list.length) return null
  return (
    list.find((account) => account.id === spotlightAccountId.value) ??
    list.find((account) => Boolean(account.logoPath || account.metrics?.followersCount != null || account.recentPosts?.length)) ??
    list[0]!
  )
})

const spotlightIndexLabel = computed(() => {
  if (!activeSpotlight.value) return '00'
  const idx = filteredAccounts.value.findIndex((a) => a.id === activeSpotlight.value!.id)
  return String(Math.max(0, idx) + 1).padStart(2, '0')
})

function resolveSafeUrl(account: MediaAccount): string | null {
  return sanitizeExternalProfileUrl(account.profileUrl)
}

function hasRichAccountPreview(account: MediaAccount): boolean {
  return account.metrics?.mediaCount != null || (account.recentPosts?.length ?? 0) > 0
}

function toggleMobilePreview(accountId: string) {
  expandedMobileAccountId.value = expandedMobileAccountId.value === accountId ? null : accountId
}

function formatIndex(index: number): string {
  return String(index + 1).padStart(2, '0')
}

function scrollToCatalog() {
  if (!import.meta.client) return
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const lenis = nuxtApp.$lenis as
    | { scrollTo?: (target: string, opts?: { immediate?: boolean }) => void }
    | undefined

  if (lenis?.scrollTo) {
    lenis.scrollTo('#katalog', { immediate: prefersReducedMotion })
    return
  }

  document.querySelector('#katalog')?.scrollIntoView({
    behavior: prefersReducedMotion ? 'auto' : 'smooth',
  })
}

watch([filteredAccounts, expandedMobileAccountId, () => catalogState.value.status], async () => {
  if (expandedMobileAccountId.value && !filteredAccounts.value.some((a) => a.id === expandedMobileAccountId.value)) {
    expandedMobileAccountId.value = null
  }
  if (!import.meta.client) return
  await nextTick()
  ScrollTrigger.refresh()
})

onMounted(() => {
  const section = networkSection.value
  if (!section || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  gsap.registerPlugin(ScrollTrigger)

  animationContext = gsap.context(() => {
    const rules = gsap.utils.toArray<HTMLElement>('[data-network-rule]', section)
    const headerItems = gsap.utils.toArray<HTMLElement>('[data-network-reveal]', section)
    const rowsStage = section.querySelector<HTMLElement>('[data-network-stage]')

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

    if (rowsStage) {
      gsap.from(rowsStage, {
        y: 20,
        opacity: 0,
        duration: 0.5,
        ease: 'power3.out',
        force3D: true,
        clearProps: 'transform,opacity',
        scrollTrigger: { trigger: rowsStage, start: 'top 88%', once: true },
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
    id="media-network"
    ref="networkSection"
    class="bg-[#0b0b0b] px-[6%] py-[clamp(96px,12vw,160px)] text-white max-[700px]:px-[5%] max-[700px]:py-[80px]"
    aria-labelledby="media-network-title"
  >
    <div class="mx-auto w-full max-w-[1600px]">
      <!-- Editorial Eyebrow -->
      <div data-network-reveal class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-[10px] text-[10px] tracking-[2px] text-[#a3a3a3] uppercase">
          <span class="h-[7px] w-[7px] animate-pulse rounded-full bg-[#ed3541] motion-reduce:animate-none" aria-hidden="true"></span>
          JARINGAN MEDIA SOSIAL
        </div>
        <span v-if="catalogState.status === 'success'" class="text-[10px] tracking-[2px] text-[#a3a3a3] uppercase">
          {{ accounts.length }} AKUN MEDIA · {{ regionGroups.length }} WILAYAH
        </span>
        <span v-else-if="catalogState.status === 'loading'" class="text-[10px] tracking-[2px] text-[#a3a3a3] uppercase">
          MEMUAT JARINGAN MEDIA
        </span>
        <span v-else-if="catalogState.status === 'error'" class="text-[10px] tracking-[2px] text-[#ed3541] uppercase">
          KONEKSI TERGANGGU
        </span>
      </div>

      <!-- Display Header -->
      <div class="mt-[clamp(32px,5vw,64px)] grid gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-end lg:gap-16">
        <h2 id="media-network-title" data-network-reveal class="text-[clamp(38px,5.4vw,84px)] font-extrabold leading-[0.9] tracking-[-0.055em]">
          Jaringan Media.<br />
          <span class="text-[#ed3541]">Lokal &amp; Terbuka.</span>
        </h2>

        <div data-network-reveal class="flex flex-col items-start gap-6 lg:max-w-[380px] lg:justify-self-end">
          <p class="m-0 text-[14px] leading-[1.7] text-[#ccc]">
            Tinjau langsung profil, gaya konten, dan audiens tiap akun Instagram resmi Hallopedia sebelum memilih paket promosi.
          </p>
          <a href="#katalog" class="group inline-flex items-center gap-3 border-b border-white/40 pb-1.5 text-[11px] font-bold tracking-[1.5px] text-white uppercase no-underline transition-colors duration-300 hover:border-[#ed3541] hover:text-[#ed3541] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ed3541] max-lg:min-h-[44px]" @click.prevent="scrollToCatalog">
            <span>KEMBALI KE KATALOG HARGA</span>
            <span class="transition-transform duration-300 group-hover:-translate-y-0.5" aria-hidden="true">↑</span>
          </a>
        </div>
      </div>

      <!-- Regional Filter Bar (Rendered only when catalog loaded) -->
      <div data-network-rule class="mt-[clamp(44px,6vw,76px)] border-t border-[#292929]"></div>

      <template v-if="catalogState.status === 'success' && regionGroups.length > 0">
        <div data-network-reveal class="flex flex-wrap items-center justify-between gap-4 py-5">
          <div class="flex flex-wrap items-center gap-2" role="group" aria-label="Filter jaringan akun per wilayah">
            <button
              v-for="filter in regionFilters" :key="filter.code" type="button"
              class="cursor-pointer px-3.5 py-2 text-[11px] tracking-[0.7px] transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541] max-lg:inline-flex max-lg:min-h-[44px] max-lg:items-center"
              :class="activeRegionCode === filter.code ? 'bg-[#ed3541] font-bold text-white' : 'border border-[#292929] bg-transparent text-[#ccc] hover:border-white/40 hover:text-white'"
              :aria-pressed="activeRegionCode === filter.code" @click="activeRegionCode = filter.code"
            >
              {{ filter.label }}
            </button>
          </div>

          <span class="text-[10px] tracking-[1.6px] text-[#a3a3a3] uppercase">MENAMPILKAN {{ filteredAccounts.length }} AKUN</span>
        </div>

        <div data-network-rule class="border-t border-[#292929]"></div>
      </template>

      <!-- Async Stage -->
      <div data-network-stage class="mt-[clamp(32px,4vw,52px)]">
        <!-- Loading State -->
        <div v-if="catalogState.status === 'loading'" class="space-y-3" aria-busy="true" aria-label="Memuat jaringan media">
          <div v-for="idx in 6" :key="idx" class="h-16 border border-[#292929] bg-[#141414]"></div>
        </div>

        <!-- Error State -->
        <div v-else-if="catalogState.status === 'error'" role="alert" class="border border-[#ed3541] bg-[#141414] p-8 text-center">
          <p class="text-[14px] font-semibold text-white">{{ catalogState.message }}</p>
          <button
            type="button"
            class="mt-4 cursor-pointer border border-[#ed3541] bg-[#ed3541] px-5 py-2.5 text-[11px] font-semibold tracking-[1.2px] text-white uppercase focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white max-lg:min-h-[44px]"
            @click="loadCatalog(undefined, { force: true })"
          >
            MUAT ULANG JARINGAN MEDIA
          </button>
        </div>

        <!-- Asymmetric Two-Plane Directory -->
        <div v-else-if="filteredAccounts.length" class="grid gap-10 lg:grid-cols-[0.38fr_0.62fr] lg:items-start lg:gap-12">
          <!-- Sticky Channel Spotlight (Desktop Interactive Inspector) -->
          <aside class="hidden lg:sticky lg:top-28 lg:block" aria-label="Pratinjau akun media terpilih">
            <Transition
              mode="out-in"
              enter-active-class="transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none"
              enter-from-class="opacity-0 translate-y-1.5"
              enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition-opacity duration-150 ease-in motion-reduce:transition-none"
              leave-from-class="opacity-100"
              leave-to-class="opacity-0"
            >
              <MediaAccountSpotlight
                v-if="activeSpotlight"
                :key="activeSpotlight.id"
                :account="activeSpotlight"
                :index-label="spotlightIndexLabel"
              />
            </Transition>
          </aside>

          <!-- Kinetic Editorial Channel List -->
          <TransitionGroup
            tag="div" class="border-b border-[#292929]"
            enter-active-class="transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none"
            enter-from-class="opacity-0 translate-y-2" enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition-opacity duration-150 ease-in motion-reduce:transition-none"
            leave-from-class="opacity-100" leave-to-class="opacity-0"
          >
            <article
              v-for="(account, index) in filteredAccounts" :key="account.id"
              class="border-t border-[#292929] transition-colors duration-200 hover:bg-[#141414]"
            >
              <div class="flex items-center justify-between gap-2">
                <component
                  :is="resolveSafeUrl(account) ? 'a' : 'div'"
                  :href="resolveSafeUrl(account) ?? undefined" :target="resolveSafeUrl(account) ? '_blank' : undefined"
                  :rel="resolveSafeUrl(account) ? 'noopener noreferrer' : undefined"
                  :aria-label="resolveSafeUrl(account) ? `Buka ${resolveAccountPlatformLabel(account)} ${account.name} (${account.handle}) di tab baru` : undefined"
                  class="group relative flex min-h-[68px] min-w-0 flex-1 items-center justify-between gap-4 px-3 py-4 text-white no-underline focus-visible:bg-[#141414] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ed3541] sm:px-5"
                  @mouseenter="spotlightAccountId = account.id" @focusin="spotlightAccountId = account.id"
                >
                  <span class="pointer-events-none absolute inset-x-0 bottom-0 h-[1px] origin-left scale-x-0 bg-[#ed3541] transition-transform duration-300 group-hover:scale-x-100 motion-reduce:transition-none" aria-hidden="true"></span>

                  <div class="flex min-w-0 items-center gap-3.5 sm:gap-5">
                    <span class="w-6 shrink-0 text-[11px] font-bold tracking-[1px] tabular-nums transition-colors duration-200" :class="activeSpotlight?.id === account.id ? 'text-[#ed3541]' : 'text-[#a3a3a3] group-hover:text-[#ed3541]'">
                      {{ formatIndex(index) }}
                    </span>

                    <img
                      v-if="account.logoPath" :src="account.logoPath" :alt="`Logo ${account.name}`"
                      class="h-9 w-9 shrink-0 border border-[#292929] object-cover" loading="lazy" decoding="async"
                    />
                    <span v-else class="relative flex h-9 w-9 shrink-0 items-center justify-center border border-[#383838] bg-[#141414] text-[10px] font-bold tracking-[0.5px] text-white" aria-hidden="true">
                      <span class="absolute top-0 right-0 h-[3px] w-[3px] bg-[#ed3541]"></span>
                      {{ account.monogram }}
                    </span>

                    <div class="min-w-0">
                      <div class="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                        <span class="truncate text-[15px] font-bold tracking-[-0.02em] text-white transition-colors group-hover:text-[#ed3541]">{{ account.name }}</span>
                        <span class="truncate text-[12px] text-[#a3a3a3]">{{ account.handle }}</span>
                      </div>
                      <div class="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] tracking-[1px] text-[#a3a3a3] uppercase">
                        <span>{{ account.regionLabel }}</span>
                        <span class="text-[#525252]" aria-hidden="true">·</span>
                        <span>MULAI {{ formatIdr(account.pricing.directSinglePriceIdr) }}</span>
                        <template v-if="account.metrics?.followersCount != null">
                          <span class="text-[#525252]" aria-hidden="true">·</span>
                          <span class="text-[#ccc]">{{ formatCompactCount(account.metrics.followersCount) }} FOLLOWERS</span>
                        </template>
                      </div>
                    </div>
                  </div>

                  <div class="flex shrink-0 items-center gap-2 text-[10px] font-bold tracking-[1.4px] uppercase">
                    <span class="hidden text-[#ccc] transition-colors group-hover:text-white sm:inline">{{ resolveAccountPlatformLabel(account) }}</span>
                    <span class="inline-flex h-8 w-8 items-center justify-center border border-[#292929] text-[13px] text-[#ccc] transition-all duration-200 group-hover:border-[#ed3541] group-hover:bg-[#ed3541] group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true">↗</span>
                  </div>
                </component>

                <button
                  v-if="hasRichAccountPreview(account)"
                  type="button"
                  :aria-expanded="expandedMobileAccountId === account.id"
                  :aria-controls="`mobile-preview-${account.id}`"
                  class="mr-3 inline-flex min-h-[44px] shrink-0 cursor-pointer items-center border border-[#292929] px-2.5 text-[10px] font-bold tracking-[1.2px] text-[#ccc] uppercase transition-colors hover:border-[#ed3541] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541] lg:hidden"
                  @click="toggleMobilePreview(account.id)"
                >
                  {{ expandedMobileAccountId === account.id ? 'TUTUP' : 'DETAIL' }}
                </button>
              </div>

              <div
                v-if="hasRichAccountPreview(account) && expandedMobileAccountId === account.id"
                :id="`mobile-preview-${account.id}`"
                class="border-t border-[#292929]/70 px-3 pb-4 lg:hidden sm:px-5"
              >
                <MediaAccountSpotlight :account="account" :index-label="formatIndex(index)" variant="inline" />
              </div>
            </article>
          </TransitionGroup>
        </div>

        <!-- Empty State -->
        <div v-else class="border border-[#292929] bg-[#141414] p-10 text-center">
          <p class="text-[14px] text-[#ccc]">Belum ada akun aktif pada wilayah terpilih.</p>
        </div>
      </div>
    </div>
  </section>
</template>
