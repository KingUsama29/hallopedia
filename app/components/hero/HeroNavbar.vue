<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import NotificationBell from '~/components/portal/NotificationBell.vue'
import { useCatalogData } from '~/composables/useCatalogData'
import { useCustomerAuth } from '~/composables/useCustomerAuth'
import { useModalAccessibility } from '~/composables/useModalAccessibility'

interface NavDestination {
  number: string
  label: string
  description: string
  target: `#${string}`
}

const { accounts } = useCatalogData()
const { currentCustomer, isAuthHydrated, hydrateAuth } = useCustomerAuth()

onMounted(() => {
  hydrateAuth()
})

const navDestinations = computed<readonly NavDestination[]>(() => [
  {
    number: '01',
    label: 'Beranda',
    description: 'Ringkasan jaringan media & headline utama',
    target: '#hero',
  },
  {
    number: '02',
    label: 'Katalog & Harga Iklan',
    description: `Publikasi langsung, visit produksi & konfigurator ${accounts.value.length} akun`,
    target: '#katalog',
  },
  {
    number: '03',
    label: 'Jaringan Media',
    description: 'Cakupan kanal berita dan media sosial Hallopedia',
    target: '#media-network',
  },
  {
    number: '04',
    label: 'FAQ Transaksi',
    description: 'Ketentuan Penuh, DP 50%, Invoice, materi & revisi',
    target: '#faq',
  },
])

const isMenuOpen = ref(false)
const drawerPanelRef = ref<HTMLElement | null>(null)
const closeButtonRef = ref<HTMLButtonElement | null>(null)

function closeMenu() {
  isMenuOpen.value = false
}

const { getLenis, suppressNextFocusRestore } = useModalAccessibility({
  isOpen: isMenuOpen,
  panelRef: drawerPanelRef,
  initialFocusRef: closeButtonRef,
  onClose: closeMenu,
})

async function navigateToSection(target: `#${string}`) {
  suppressNextFocusRestore()
  isMenuOpen.value = false
  await nextTick()

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches
  const lenis = getLenis()
  const targetElement = document.querySelector<HTMLElement>(target)

  if (lenis?.scrollTo) {
    lenis.scrollTo(target, { immediate: prefersReducedMotion })
  } else if (targetElement) {
    targetElement.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    })
  }
}

async function navigateToPortal(path: string) {
  suppressNextFocusRestore()
  isMenuOpen.value = false
  await nextTick()
  await navigateTo(path)
}
</script>

<template>
  <nav
    class="hero-navbar flex h-[82px] items-center justify-between"
    aria-label="Navigasi utama"
  >
    <a
      href="#hero"
      class="text-[25px] font-black tracking-[-1.5px] text-white no-underline
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ed3541]"
      aria-label="Hallopedia, beranda"
    >
      HALLOPEDIA<span class="text-[#ed3541]">.</span>
    </a>

    <p class="text-[10px] tracking-[2px] text-[#888] max-[700px]:hidden">
      JARINGAN MEDIA DIGITAL
    </p>

    <div class="flex items-center gap-3 sm:gap-4">
      <NotificationBell v-if="isAuthHydrated && currentCustomer" />
      <button
        type="button"
        class="cursor-pointer border-0 bg-transparent text-[11px] tracking-[1px] text-white
          transition-colors duration-200 hover:text-[#ed3541] focus-visible:outline
          focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ed3541]
          max-[700px]:inline-flex max-[700px]:min-h-[44px] max-[700px]:items-center"
        aria-label="Buka menu navigasi"
        :aria-expanded="isMenuOpen"
        aria-controls="hero-nav-drawer"
        @click="isMenuOpen = true"
      >
        MENU <span class="ml-3" aria-hidden="true">☰</span>
      </button>
    </div>

    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200 ease-out motion-reduce:transition-none"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-200 ease-in motion-reduce:transition-none"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isMenuOpen"
          id="hero-nav-drawer"
          class="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="hero-nav-title"
          @click.self="closeMenu"
        >
          <div
            ref="drawerPanelRef"
            data-lenis-prevent
            class="editorial-scrollbar flex h-full w-full max-w-[460px] flex-col justify-between
              overflow-y-auto overscroll-contain border-l border-[#292929] bg-[#0b0b0b] p-7
              text-white max-[700px]:p-5"
          >
            <div>
              <div class="flex items-start justify-between gap-4 border-b border-[#292929] pb-5">
                <div>
                  <div class="flex items-center gap-2 text-[10px] tracking-[2px] text-[#a3a3a3] uppercase">
                    <span class="h-[6px] w-[6px] rounded-full bg-[#ed3541]" aria-hidden="true"></span>
                    NAVIGASI HALAMAN
                  </div>
                  <h2 id="hero-nav-title" class="mt-2 text-[22px] font-bold tracking-[-0.03em]">
                    HALLOPEDIA<span class="text-[#ed3541]">.</span>
                  </h2>
                </div>
                <button
                  ref="closeButtonRef"
                  type="button"
                  class="cursor-pointer border border-[#292929] px-3 py-1.5 text-[10px] tracking-[1.5px]
                    text-[#ccc] uppercase transition-colors hover:border-[#ed3541] hover:text-white
                    focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                    focus-visible:outline-[#ed3541] max-[700px]:inline-flex max-[700px]:min-h-[44px]
                    max-[700px]:items-center"
                  aria-label="Tutup menu navigasi"
                  @click="closeMenu"
                >
                  TUTUP ✕
                </button>
              </div>

              <div class="mt-6">
                <a
                  v-for="item in navDestinations"
                  :key="item.target"
                  :href="item.target"
                  class="group flex items-start justify-between gap-4 border-b border-[#292929] py-3.5
                    no-underline transition-colors hover:border-[#ed3541] focus-visible:outline
                    focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ed3541]"
                  @click.prevent="navigateToSection(item.target)"
                >
                  <div class="flex items-start gap-4">
                    <span class="pt-1 text-[10px] tracking-[1.5px] text-[#ed3541]">
                      {{ item.number }}
                    </span>
                    <div>
                      <div class="text-[20px] font-bold tracking-[-0.03em] text-white transition-colors group-hover:text-[#ed3541]">
                        {{ item.label }}
                      </div>
                      <p class="mt-1 mb-0 text-[12px] leading-[1.5] text-[#a3a3a3]">
                        {{ item.description }}
                      </p>
                    </div>
                  </div>
                  <span
                    class="pt-1 text-base text-[#a3a3a3] transition-transform duration-200
                      group-hover:translate-x-1 group-hover:text-[#ed3541]"
                    aria-hidden="true"
                  >
                    ↗
                  </span>
                </a>
              </div>
            </div>

            <div class="mt-8 border-t border-[#292929] pt-5">
              <div class="mb-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  class="flex min-h-[44px] cursor-pointer items-center justify-between gap-2 border border-[#292929] bg-[#141414] px-3 py-2 text-[10px] font-bold tracking-[1.2px] text-white uppercase transition-colors hover:border-[#ed3541] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541]"
                  @click="navigateToPortal('/dashboard/orders')"
                >
                  <span class="whitespace-nowrap">PESANAN SAYA</span>
                  <span aria-hidden="true">→</span>
                </button>
                <button
                  type="button"
                  class="flex min-h-[44px] min-w-0 cursor-pointer items-center justify-between border border-[#292929] bg-[#141414] px-3 py-2 text-[10px] font-bold tracking-[1.2px] text-[#ccc] uppercase transition-colors hover:border-white hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541]"
                  @click="navigateToPortal(isAuthHydrated && currentCustomer ? '/dashboard/orders' : '/login')"
                >
                  <span class="truncate">{{ isAuthHydrated && currentCustomer ? currentCustomer.brandName : 'MASUK / DAFTAR' }}</span>
                </button>
              </div>
              <div class="text-[10px] tracking-[1.8px] text-[#a3a3a3] uppercase">
                LAYANAN PERIKLANAN DIGITAL
              </div>
              <p class="mt-2 mb-4 text-[12px] leading-[1.6] text-[#ccc]">
                Pilih paket publikasi langsung, kunjungan produksi, atau konfigurasi manual {{ accounts.length }} akun jaringan Kalimantan.
              </p>
              <a
                href="#katalog"
                class="flex w-full items-center justify-between bg-[#ed3541] px-5 py-3.5 text-[11px]
                  font-bold tracking-[1.4px] text-white uppercase no-underline transition-colors
                  duration-200 hover:bg-[#ff4754] focus-visible:outline focus-visible:outline-2
                  focus-visible:outline-offset-2 focus-visible:outline-white max-[700px]:min-h-[44px]"
                @click.prevent="navigateToSection('#katalog')"
              >
                <span>BUKA KATALOG HARGA</span>
                <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </nav>
</template>
