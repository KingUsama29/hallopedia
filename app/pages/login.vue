<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import CheckoutDraftPreviewCard from '~/components/checkout/CheckoutDraftPreviewCard.vue'
import PortalTopBar from '~/components/portal/PortalTopBar.vue'
import { useCatalogData } from '~/composables/useCatalogData'
import { useCustomerAuth } from '~/composables/useCustomerAuth'
import { useOrderDraft } from '~/composables/useOrderDraft'

const route = useRoute()
const { accounts, packages } = useCatalogData()
const { orderDraft, hydrateOrderDraft } = useOrderDraft()
const {
  currentCustomer,
  isAuthHydrated,
  hydrateAuth,
  loginCustomer,
  loginPreviewCustomer,
} = useCustomerAuth()

const email = ref('')
const secretInput = ref('')
const errorMessage = ref('')

const safeRedirectPath = computed(() => {
  const raw = route.query.redirect
  return typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//')
    ? raw
    : '/dashboard/orders'
})

const registerLinkLocation = computed(() =>
  route.query.redirect ? { path: '/register', query: { redirect: safeRedirectPath.value } } : '/register',
)

onMounted(async () => {
  hydrateAuth()
  hydrateOrderDraft(accounts.value, packages.value)
  if (currentCustomer.value) {
    await navigateTo(safeRedirectPath.value)
  }
})

async function handleSubmit() {
  errorMessage.value = ''
  const result = loginCustomer({
    email: email.value,
    secretInput: secretInput.value,
  })
  if (!result.ok) {
    errorMessage.value = result.error
    return
  }
  await navigateTo(safeRedirectPath.value)
}

async function handlePreviewQuickLogin() {
  errorMessage.value = ''
  loginPreviewCustomer()
  await navigateTo(safeRedirectPath.value)
}
</script>

<template>
  <div class="min-h-screen bg-[#f6f5f2] text-[#0b0b0b]">
    <PortalTopBar />

    <section class="mx-auto max-w-[1200px] px-[6%] pt-[clamp(48px,7vw,96px)] pb-[112px] max-[700px]:px-[5%]">
      <div class="grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <!-- Form Login -->
        <div class="border border-black/15 bg-white p-7 sm:p-10">
          <div class="flex items-center gap-[10px] text-[10px] font-bold tracking-[2px] text-[#525252] uppercase">
            <span class="h-[7px] w-[7px] rounded-full bg-[#ed3541]" aria-hidden="true"></span>
            AKSES AKUN PELANGGAN
          </div>

          <h1 class="mt-4 mb-2 text-[clamp(30px,4vw,48px)] font-extrabold leading-[1.02] tracking-[-0.04em] text-[#0b0b0b]">
            Masuk ke Portal Pemesanan
          </h1>
          <p class="mt-0 mb-6 text-[13px] leading-[1.6] text-[#525252]">
            Masuk untuk melanjutkan checkout, memantau status pembayaran, serta mengelola brief dan jadwal publikasi pesanan Anda.
          </p>

          <p
            v-if="errorMessage"
            role="alert"
            aria-live="polite"
            class="mb-5 border-l-2 border-[#ed3541] bg-[#0b0b0b] px-4 py-3 text-[12px] text-white"
          >
            {{ errorMessage }}
          </p>

          <form class="space-y-4" @submit.prevent="handleSubmit">
            <div>
              <label for="login-email" class="mb-1.5 block text-[10px] font-bold tracking-[1.4px] text-[#525252] uppercase">
                ALAMAT EMAIL
              </label>
              <input
                id="login-email"
                v-model="email"
                type="email"
                autocomplete="email"
                required
                placeholder="nama@brandanda.id"
                class="min-h-[46px] w-full border border-black/20 bg-white px-3.5 text-[13px] text-[#0b0b0b] placeholder-[#737373] focus:border-[#ed3541] focus:outline-none max-[700px]:text-[16px]"
              />
            </div>

            <div>
              <label for="login-password" class="mb-1.5 block text-[10px] font-bold tracking-[1.4px] text-[#525252] uppercase">
                KATA SANDI
              </label>
              <input
                id="login-password"
                v-model="secretInput"
                type="password"
                autocomplete="current-password"
                required
                placeholder="Minimal 6 karakter"
                class="min-h-[46px] w-full border border-black/20 bg-white px-3.5 text-[13px] text-[#0b0b0b] placeholder-[#737373] focus:border-[#ed3541] focus:outline-none max-[700px]:text-[16px]"
              />
            </div>

            <button
              type="submit"
              class="flex min-h-[48px] w-full cursor-pointer items-center justify-between bg-[#ed3541] px-5 py-3 text-[11px] font-bold tracking-[1.5px] text-white uppercase transition-colors hover:bg-[#ff4754] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b0b0b]"
            >
              <span>MASUK &amp; LANJUTKAN</span>
              <span aria-hidden="true">→</span>
            </button>
          </form>

          <div class="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-black/10 pt-5 text-[12px]">
            <span class="text-[#525252]">
              Belum punya akun?
              <NuxtLink
                :to="registerLinkLocation"
                class="font-bold text-[#0b0b0b] underline decoration-[#ed3541] underline-offset-4 hover:text-[#ed3541] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541]"
              >
                Daftar Sekarang
              </NuxtLink>
            </span>

            <button
              v-if="isAuthHydrated"
              type="button"
              class="min-h-[40px] cursor-pointer border border-black/20 bg-[#f6f5f2] px-3 py-1.5 text-[10px] font-bold tracking-[1.1px] text-[#0b0b0b] uppercase transition-colors hover:border-[#ed3541] hover:text-[#ed3541] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541] max-lg:min-h-[44px]"
              @click="handlePreviewQuickLogin"
            >
              MASUK AKUN UJI PRATINJAU →
            </button>
          </div>
        </div>

        <!-- Konteks Kanan -->
        <div class="space-y-5">
          <CheckoutDraftPreviewCard v-if="orderDraft" :draft="orderDraft" />

          <div v-else class="border border-black/15 bg-white p-6">
            <div class="text-[10px] font-bold tracking-[1.6px] text-[#525252] uppercase">
              ALUR PEMESANAN HALLOPEDIA
            </div>
            <ol class="mt-3 mb-0 list-none space-y-2.5 p-0 text-[13px] leading-[1.55] text-[#333]">
              <li class="flex items-start gap-2.5">
                <span class="font-bold text-[#ed3541] tabular-nums">01</span>
                <span>Pilih paket atau rakit akun media di halaman Katalog.</span>
              </li>
              <li class="flex items-start gap-2.5">
                <span class="font-bold text-[#ed3541] tabular-nums">02</span>
                <span>Masuk atau daftar akun pelanggan untuk mengunci kepemilikan pesanan.</span>
              </li>
              <li class="flex items-start gap-2.5">
                <span class="font-bold text-[#ed3541] tabular-nums">03</span>
                <span>Checkout lewat skema Penuh, DP 50%, atau Invoice resmi.</span>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

