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
const { currentCustomer, hydrateAuth, registerCustomer } = useCustomerAuth()

const fullName = ref('')
const brandName = ref('')
const email = ref('')
const whatsappNumber = ref('')
const secretInput = ref('')
const errorMessage = ref('')

const safeRedirectPath = computed(() => {
  const raw = route.query.redirect
  return typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//')
    ? raw
    : '/dashboard/orders'
})

const loginLinkLocation = computed(() =>
  route.query.redirect ? { path: '/login', query: { redirect: safeRedirectPath.value } } : '/login',
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
  const result = registerCustomer({
    fullName: fullName.value,
    brandName: brandName.value,
    email: email.value,
    whatsappNumber: whatsappNumber.value,
    secretInput: secretInput.value,
  })
  if (!result.ok) {
    errorMessage.value = result.error
    return
  }
  await navigateTo(safeRedirectPath.value)
}
</script>

<template>
  <div class="min-h-screen bg-[#f6f5f2] text-[#0b0b0b]">
    <PortalTopBar />

    <section class="mx-auto max-w-[1200px] px-[6%] pt-[clamp(48px,7vw,96px)] pb-[112px] max-[700px]:px-[5%]">
      <div class="grid grid-cols-1 gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <!-- Form Daftar -->
        <div class="border border-black/15 bg-white p-7 sm:p-10">
          <div class="flex items-center gap-[10px] text-[10px] font-bold tracking-[2px] text-[#525252] uppercase">
            <span class="h-[7px] w-[7px] rounded-full bg-[#ed3541]" aria-hidden="true"></span>
            PENDAFTARAN PELANGGAN BARU
          </div>

          <h1 class="mt-4 mb-2 text-[clamp(30px,4vw,48px)] font-extrabold leading-[1.02] tracking-[-0.04em] text-[#0b0b0b]">
            Buat Akun Pengiklan
          </h1>
          <p class="mt-0 mb-6 text-[13px] leading-[1.6] text-[#525252]">
            Akun ini menyimpan riwayat pesanan, akses pengiriman brief/Google Drive, jadwal tayang, serta percakapan langsung dengan Admin.
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
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label for="reg-fullname" class="mb-1.5 block text-[10px] font-bold tracking-[1.4px] text-[#525252] uppercase">
                  NAMA LENGKAP *
                </label>
                <input
                  id="reg-fullname"
                  v-model="fullName"
                  type="text"
                  autocomplete="name"
                  required
                  placeholder="Nama penanggung jawab"
                  class="min-h-[46px] w-full border border-black/20 bg-white px-3.5 text-[13px] text-[#0b0b0b] placeholder-[#737373] focus:border-[#ed3541] focus:outline-none max-[700px]:text-[16px]"
                />
              </div>

              <div>
                <label for="reg-brand" class="mb-1.5 block text-[10px] font-bold tracking-[1.4px] text-[#525252] uppercase">
                  NAMA BRAND / USAHA (OPSIONAL)
                </label>
                <input
                  id="reg-brand"
                  v-model="brandName"
                  type="text"
                  placeholder="Misal: Kopi Mahakam"
                  class="min-h-[46px] w-full border border-black/20 bg-white px-3.5 text-[13px] text-[#0b0b0b] placeholder-[#737373] focus:border-[#ed3541] focus:outline-none max-[700px]:text-[16px]"
                />
              </div>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label for="reg-email" class="mb-1.5 block text-[10px] font-bold tracking-[1.4px] text-[#525252] uppercase">
                  ALAMAT EMAIL *
                </label>
                <input
                  id="reg-email"
                  v-model="email"
                  type="email"
                  autocomplete="email"
                  required
                  placeholder="nama@brandanda.id"
                  class="min-h-[46px] w-full border border-black/20 bg-white px-3.5 text-[13px] text-[#0b0b0b] placeholder-[#737373] focus:border-[#ed3541] focus:outline-none max-[700px]:text-[16px]"
                />
              </div>

              <div>
                <label for="reg-whatsapp" class="mb-1.5 block text-[10px] font-bold tracking-[1.4px] text-[#525252] uppercase">
                  NOMOR WHATSAPP AKTIF *
                </label>
                <input
                  id="reg-whatsapp"
                  v-model="whatsappNumber"
                  type="tel"
                  autocomplete="tel"
                  required
                  placeholder="0812xxxxxxxx"
                  class="min-h-[46px] w-full border border-black/20 bg-white px-3.5 text-[13px] text-[#0b0b0b] placeholder-[#737373] focus:border-[#ed3541] focus:outline-none max-[700px]:text-[16px]"
                />
              </div>
            </div>

            <div>
              <label for="reg-password" class="mb-1.5 block text-[10px] font-bold tracking-[1.4px] text-[#525252] uppercase">
                KATA SANDI *
              </label>
              <input
                id="reg-password"
                v-model="secretInput"
                type="password"
                autocomplete="new-password"
                required
                placeholder="Minimal 6 karakter"
                class="min-h-[46px] w-full border border-black/20 bg-white px-3.5 text-[13px] text-[#0b0b0b] placeholder-[#737373] focus:border-[#ed3541] focus:outline-none max-[700px]:text-[16px]"
              />
            </div>

            <button
              type="submit"
              class="flex min-h-[48px] w-full cursor-pointer items-center justify-between bg-[#ed3541] px-5 py-3 text-[11px] font-bold tracking-[1.5px] text-white uppercase transition-colors hover:bg-[#ff4754] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b0b0b]"
            >
              <span>DAFTAR &amp; LANJUTKAN</span>
              <span aria-hidden="true">→</span>
            </button>
          </form>

          <p class="mt-6 mb-0 border-t border-black/10 pt-5 text-[12px] text-[#525252]">
            Sudah pernah mendaftar?
            <NuxtLink
              :to="loginLinkLocation"
              class="font-bold text-[#0b0b0b] underline decoration-[#ed3541] underline-offset-4 hover:text-[#ed3541] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541]"
            >
              Masuk di sini
            </NuxtLink>
          </p>
        </div>

        <!-- Konteks Kanan -->
        <div class="space-y-5">
          <CheckoutDraftPreviewCard v-if="orderDraft" :draft="orderDraft" />

          <div v-else class="border border-black/15 bg-white p-6">
            <div class="text-[10px] font-bold tracking-[1.6px] text-[#525252] uppercase">
              KEUNTUNGAN AKUN PELANGGAN
            </div>
            <ul class="mt-3 mb-0 list-none space-y-2 p-0 text-[13px] leading-[1.55] text-[#333]">
              <li>+ Lacak status pembayaran Penuh, DP 50%, maupun Invoice.</li>
              <li>+ Kirim brief, file materi, atau link Google Drive per pesanan.</li>
              <li>+ Terhubung langsung ke Live Chat Admin setelah transaksi.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

