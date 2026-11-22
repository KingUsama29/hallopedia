<script setup lang="ts">
import { onMounted } from 'vue'
import NotificationBell from '~/components/portal/NotificationBell.vue'
import { useCustomerAuth } from '~/composables/useCustomerAuth'

const route = useRoute()
const { currentCustomer, isAuthHydrated, hydrateAuth, logoutCustomer } = useCustomerAuth()

onMounted(() => {
  hydrateAuth()
})

async function handleLogout() {
  logoutCustomer()
  if (route.path.startsWith('/checkout') || route.path.startsWith('/dashboard')) {
    await navigateTo('/login')
  }
}
</script>

<template>
  <header class="no-print w-full border-b border-[#292929] bg-[#0b0b0b] text-white">
    <div class="mx-auto flex min-h-[72px] max-w-[1600px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-[6%] py-3 max-[700px]:px-[5%]">
      <div class="flex items-center gap-6">
        <NuxtLink
          to="/"
          class="text-[20px] font-black tracking-[-1.4px] text-white no-underline sm:text-[22px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ed3541]"
          aria-label="Hallopedia, kembali ke beranda"
        >
          HALLOPEDIA<span class="text-[#ed3541]">.</span>
        </NuxtLink>

        <span class="hidden border-l border-[#292929] pl-6 text-[10px] tracking-[1.8px] text-[#a3a3a3] uppercase lg:inline-block">
          PORTAL PEMESANAN PELANGGAN
        </span>
      </div>

      <nav class="flex items-center gap-2 sm:gap-5" aria-label="Navigasi portal pelanggan">
        <NuxtLink
          to="/#katalog"
          class="hidden min-h-[44px] items-center text-[11px] font-semibold tracking-[1.1px] text-[#ccc] uppercase no-underline transition-colors hover:text-[#ed3541] sm:inline-flex focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ed3541]"
        >
          KATALOG
        </NuxtLink>

        <template v-if="isAuthHydrated && currentCustomer">
          <NuxtLink
            to="/dashboard/orders"
            class="inline-flex min-h-[44px] items-center whitespace-nowrap text-[10px] font-bold tracking-[1.1px] uppercase no-underline transition-colors sm:text-[11px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ed3541]"
            :class="route.path.startsWith('/dashboard') ? 'text-[#ed3541]' : 'text-white hover:text-[#ed3541]'"
          >
            PESANAN SAYA
          </NuxtLink>

          <NotificationBell />

          <span class="hidden border-l border-[#292929] pl-4 text-[11px] text-[#a3a3a3] md:inline">
            {{ currentCustomer.brandName }}
          </span>

          <button
            type="button"
            class="min-h-[38px] shrink-0 cursor-pointer border border-[#292929] bg-[#141414] px-2.5 py-1.5 text-[10px] font-bold tracking-[1.2px] text-[#ccc] uppercase transition-colors hover:border-[#ed3541] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541] sm:px-3 max-lg:min-h-[44px]"
            @click="handleLogout"
          >
            KELUAR
          </button>
        </template>

        <template v-else-if="isAuthHydrated">
          <NuxtLink
            to="/login"
            class="inline-flex min-h-[44px] items-center whitespace-nowrap text-[10px] font-bold tracking-[1.2px] uppercase no-underline transition-colors sm:text-[11px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ed3541]"
            :class="route.path === '/login' ? 'text-[#ed3541]' : 'text-white hover:text-[#ed3541]'"
          >
            MASUK
          </NuxtLink>
          <NuxtLink
            to="/register"
            class="inline-flex min-h-[40px] shrink-0 items-center whitespace-nowrap border border-[#ed3541] bg-[#ed3541] px-3 py-1.5 text-[10px] font-bold tracking-[1.2px] text-white uppercase no-underline transition-colors hover:bg-[#ff4754] sm:px-3.5 sm:tracking-[1.3px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white max-lg:min-h-[44px]"
          >
            DAFTAR AKUN
          </NuxtLink>
        </template>
      </nav>
    </div>
  </header>
</template>

