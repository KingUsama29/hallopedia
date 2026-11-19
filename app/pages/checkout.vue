<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import CheckoutOrderSummary from '~/components/checkout/CheckoutOrderSummary.vue'
import CheckoutPaymentModal from '~/components/checkout/CheckoutPaymentModal.vue'
import CheckoutScheduleSection from '~/components/checkout/CheckoutScheduleSection.vue'
import PortalTopBar from '~/components/portal/PortalTopBar.vue'
import { useCatalogData } from '~/composables/useCatalogData'
import { useCustomerAuth } from '~/composables/useCustomerAuth'
import { useOrderDraft } from '~/composables/useOrderDraft'
import { useOrderPortal } from '~/composables/useOrderPortal'
import { handleRadioGroupKeydown } from '~/composables/useRadioGroupNavigation'
import { PAYMENT_SCHEME_LABELS, type PaymentScheme } from '~/data/catalog'
import {
  getLocalTodayIsoDate,
  resolveCheckoutPricing,
  type OrderRecord,
  type PaymentChannel,
} from '~/data/orders'

definePageMeta({
  middleware: 'auth',
})

const { accounts, packages } = useCatalogData()
const { orderDraft, hydrateOrderDraft } = useOrderDraft()
const { currentCustomer, isAuthHydrated, hydrateAuth } = useCustomerAuth()
const {
  hydrateOrders,
  previewDraftCheckoutOrder,
  commitPendingOrderWithPayment,
  submitCheckoutOrder,
} = useOrderPortal()

const brandName = ref('')
const contactWhatsapp = ref('')
const selectedScheme = ref<PaymentScheme>('FULL')
const invoiceCompanyName = ref('')
const invoicePoNumber = ref('')
const targetPublishDate = ref('')
const targetPublishTimeWita = ref('')
const visitMeetingLocation = ref('')
const visitMeetingMapsUrl = ref('')
const initialNotes = ref('')
const formError = ref('')
const formErrorRef = ref<HTMLElement | null>(null)

const stagedPaymentOrder = ref<OrderRecord | null>(null)
const isPaymentModalOpen = ref(false)
const todayIsoDate = computed(() => getLocalTodayIsoDate())

const pricingSummary = computed(() => {
  if (!orderDraft.value) return null
  return resolveCheckoutPricing(
    orderDraft.value,
    accounts.value,
    packages.value,
    selectedScheme.value,
  )
})

watch(
  orderDraft,
  (draft) => {
    if (!draft) return
    const check = resolveCheckoutPricing(draft, accounts.value, packages.value, draft.paymentScheme)
    selectedScheme.value = check.effectiveScheme
  },
  { immediate: true },
)

watch(
  currentCustomer,
  (cust) => {
    if (!cust) return
    if (!brandName.value) brandName.value = cust.brandName
    if (!contactWhatsapp.value) contactWhatsapp.value = cust.whatsappNumber
  },
  { immediate: true },
)

onMounted(async () => {
  hydrateAuth()
  hydrateOrders()
  hydrateOrderDraft(accounts.value, packages.value)

  if (!currentCustomer.value) {
    await navigateTo({ path: '/login', query: { redirect: '/checkout' } })
    return
  }

  brandName.value = currentCustomer.value.brandName
  contactWhatsapp.value = currentCustomer.value.whatsappNumber
})

function schemeSubtitle(scheme: PaymentScheme): string {
  if (scheme === 'FULL') return 'Pelunasan 100% langsung diproses via Midtrans.'
  if (scheme === 'DP') return 'Bayar 50% di awal untuk kunci jadwal; pelunasan sebelum tayang.'
  return 'Tagihan resmi atas nama instansi (menunggu persetujuan admin).'
}

async function setFormError(message: string) {
  formError.value = message
  if (!message || !import.meta.client) return
  await nextTick()
  formErrorRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  formErrorRef.value?.focus({ preventScroll: true })
}

async function handleCheckoutSubmit() {
  formError.value = ''
  if (!currentCustomer.value || !orderDraft.value) return

  const payload = {
    customer: currentCustomer.value,
    draft: orderDraft.value,
    brandName: brandName.value,
    contactWhatsapp: contactWhatsapp.value,
    paymentScheme: selectedScheme.value,
    invoiceCompanyName: invoiceCompanyName.value,
    invoicePoNumber: invoicePoNumber.value,
    targetPublishDate: targetPublishDate.value,
    targetPublishTimeWita: targetPublishTimeWita.value,
    visitMeetingLocation: visitMeetingLocation.value,
    visitMeetingMapsUrl: visitMeetingMapsUrl.value,
    initialNotes: initialNotes.value,
  }

  if (selectedScheme.value === 'INVOICE') {
    const result = submitCheckoutOrder(payload, accounts.value, packages.value)
    if (!result.ok) {
      await setFormError(result.error)
      return
    }
    await navigateTo(`/dashboard/orders/${result.order.id}`)
    return
  }

  const previewResult = previewDraftCheckoutOrder(payload, accounts.value, packages.value)
  if (!previewResult.ok) {
    await setFormError(previewResult.error)
    return
  }

  stagedPaymentOrder.value = previewResult.order
  isPaymentModalOpen.value = true
}

function handleClosePaymentModal() {
  isPaymentModalOpen.value = false
  stagedPaymentOrder.value = null
}

async function handlePaymentComplete(payload: {
  orderId: string
  channel: Exclude<PaymentChannel, 'INVOICE'>
  outcome: 'SUCCESS' | 'PENDING'
}) {
  if (!stagedPaymentOrder.value) return
  const committed = commitPendingOrderWithPayment(
    stagedPaymentOrder.value,
    payload.channel,
    payload.outcome,
  )
  isPaymentModalOpen.value = false
  stagedPaymentOrder.value = null
  await navigateTo(`/dashboard/orders/${committed.id}`)
}
</script>

<template>
  <div class="min-h-screen bg-[#f6f5f2] text-[#0b0b0b]">
    <PortalTopBar />

    <section class="mx-auto max-w-[1400px] px-[6%] pt-[clamp(44px,6vw,84px)] pb-[112px] max-[700px]:px-[5%]">
      <div class="mb-8 border-b border-black/15 pb-6">
        <div class="flex items-center gap-[10px] text-[10px] font-bold tracking-[2px] text-[#525252] uppercase">
          <span class="h-[7px] w-[7px] rounded-full bg-[#ed3541]" aria-hidden="true"></span>
          KONFIRMASI &amp; PEMBAYARAN
        </div>
        <h1 class="mt-3 mb-2 text-[clamp(30px,4.2vw,52px)] font-extrabold leading-[1.02] tracking-[-0.04em] text-[#0b0b0b]">
          Checkout Layanan Iklan
        </h1>
        <p class="m-0 max-w-[660px] text-[13px] leading-[1.6] text-[#525252]">
          Verifikasi rincian paket dan metode pembayaran Anda. Pengiriman brief lengkap, caption, serta materi Google Drive akan dilakukan setelah pesanan dibuat.
        </p>
      </div>

      <!-- Loading Auth Hydration State -->
      <div v-if="!isAuthHydrated || !currentCustomer" class="border border-black/15 bg-white p-8 text-[13px] text-[#525252]" aria-busy="true">
        Memuat data checkout Anda...
      </div>

      <!-- Empty Draft State -->
      <div v-else-if="!orderDraft || !pricingSummary" class="border border-black/15 bg-white p-8 sm:p-12">
        <h2 class="mt-0 mb-2 text-[22px] font-bold tracking-[-0.03em] text-[#0b0b0b]">
          Belum Ada Paket Iklan yang Dipilih
        </h2>
        <p class="mt-0 mb-6 max-w-[520px] text-[13px] leading-[1.65] text-[#525252]">
          Silakan pilih paket kurasi atau atur komposisi akun custom dari katalog terlebih dahulu sebelum melanjutkan checkout.
        </p>
        <div class="flex flex-wrap gap-3">
          <NuxtLink
            to="/#katalog"
            class="inline-flex min-h-[46px] items-center gap-2 bg-[#ed3541] px-5 py-3 text-[11px] font-bold tracking-[1.4px] text-white uppercase no-underline transition-colors hover:bg-[#ff4754] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b0b0b]"
          >
            <span>PILIH PAKET DI KATALOG</span>
            <span aria-hidden="true">→</span>
          </NuxtLink>
          <NuxtLink
            to="/dashboard/orders"
            class="inline-flex min-h-[46px] items-center border border-black/25 px-5 py-3 text-[11px] font-bold tracking-[1.4px] text-[#0b0b0b] uppercase no-underline transition-colors hover:border-[#0b0b0b]"
          >
            PESANAN SAYA
          </NuxtLink>
        </div>
      </div>

      <!-- Checkout Grid -->
      <div v-else class="grid grid-cols-1 gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-start">
        <form class="space-y-6 border border-black/15 bg-white p-6 sm:p-8" @submit.prevent="handleCheckoutSubmit">
          <p
            v-if="formError"
            ref="formErrorRef"
            tabindex="-1"
            role="alert"
            aria-live="polite"
            class="m-0 border-l-2 border-[#ed3541] bg-[#0b0b0b] px-4 py-3 text-[12px] text-white focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#ed3541]"
          >
            {{ formError }}
          </p>

          <!-- 1. Identitas Pemesan -->
          <div>
            <div class="mb-4 border-b border-black/10 pb-2 text-[11px] font-bold tracking-[1.5px] text-[#0b0b0b] uppercase">
              01 · KONFIRMASI KONTAK &amp; BRAND
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label for="checkout-brand" class="mb-1.5 block text-[10px] font-bold tracking-[1.3px] text-[#525252] uppercase">
                  NAMA BRAND / PENGIKLAN *
                </label>
                <input
                  id="checkout-brand"
                  v-model="brandName"
                  type="text"
                  required
                  placeholder="Nama brand atau usaha Anda"
                  class="min-h-[46px] w-full border border-black/20 bg-white px-3.5 text-[13px] text-[#0b0b0b] focus:border-[#ed3541] focus:outline-none max-[700px]:text-[16px]"
                />
              </div>
              <div>
                <label for="checkout-wa" class="mb-1.5 block text-[10px] font-bold tracking-[1.3px] text-[#525252] uppercase">
                  WHATSAPP KOORDINASI *
                </label>
                <input
                  id="checkout-wa"
                  v-model="contactWhatsapp"
                  type="tel"
                  required
                  placeholder="0812xxxxxxxx"
                  class="min-h-[46px] w-full border border-black/20 bg-white px-3.5 text-[13px] text-[#0b0b0b] focus:border-[#ed3541] focus:outline-none max-[700px]:text-[16px]"
                />
              </div>
            </div>
            <p v-if="currentCustomer" class="mt-2 mb-0 text-[11px] text-[#525252]">
              Terdaftar atas nama <strong>{{ currentCustomer.fullName }}</strong> ({{ currentCustomer.email }}).
            </p>
          </div>

          <!-- 2. Jadwal Target, Lokasi Visit & Catatan -->
          <CheckoutScheduleSection
            v-model:target-date="targetPublishDate"
            v-model:target-time-wita="targetPublishTimeWita"
            v-model:visit-location="visitMeetingLocation"
            v-model:visit-maps-url="visitMeetingMapsUrl"
            v-model:initial-notes="initialNotes"
            :service-type="orderDraft.serviceType"
            :min-date="todayIsoDate"
          />

          <!-- 3. Skema Pembayaran -->
          <div>
            <div class="mb-4 border-b border-black/10 pb-2 text-[11px] font-bold tracking-[1.5px] text-[#0b0b0b] uppercase">
              03 · PILIH SKEMA PEMBAYARAN
            </div>
            <div
              class="grid gap-2.5 sm:grid-cols-3"
              role="radiogroup"
              aria-label="Pilih skema pembayaran"
              @keydown="handleRadioGroupKeydown($event, pricingSummary.allowedSchemes, selectedScheme, (s) => (selectedScheme = s))"
            >
              <button
                v-for="scheme in pricingSummary.allowedSchemes"
                :key="scheme"
                type="button"
                role="radio"
                :tabindex="selectedScheme === scheme ? 0 : -1"
                :aria-checked="selectedScheme === scheme"
                class="min-h-[44px] cursor-pointer border p-3.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541]"
                :class="selectedScheme === scheme ? 'border-[#ed3541] bg-[#0b0b0b] text-white' : 'border-black/20 bg-[#f6f5f2] text-[#0b0b0b] hover:border-[#0b0b0b]'"
                @click="selectedScheme = scheme"
              >
                <div class="text-[11px] font-bold tracking-[1px] uppercase">{{ PAYMENT_SCHEME_LABELS[scheme] }}</div>
                <div class="mt-1 text-[11px] leading-[1.45]" :class="selectedScheme === scheme ? 'text-[#ccc]' : 'text-[#525252]'">
                  {{ schemeSubtitle(scheme) }}
                </div>
              </button>
            </div>

            <!-- Kolom Wajib Invoice Resmi -->
            <div
              v-if="selectedScheme === 'INVOICE'"
              class="mt-4 space-y-3 border-l-2 border-[#ed3541] bg-[#f6f5f2] p-4"
            >
              <div class="text-[10px] font-bold tracking-[1.4px] text-[#ed3541] uppercase">
                DATA PENGAJUAN INVOICE RESMI
              </div>
              <div class="grid gap-3 sm:grid-cols-2">
                <div>
                  <label for="invoice-company" class="mb-1 block text-[10px] font-bold tracking-[1.2px] text-[#525252] uppercase">
                    NAMA PERUSAHAAN / INSTANSI *
                  </label>
                  <input
                    id="invoice-company"
                    v-model="invoiceCompanyName"
                    type="text"
                    required
                    placeholder="Contoh: PT Kaltim Sejahtera"
                    class="min-h-[44px] w-full border border-black/25 bg-white px-3 text-[13px] text-[#0b0b0b] focus:border-[#ed3541] focus:outline-none max-[700px]:text-[16px]"
                  />
                </div>
                <div>
                  <label for="invoice-po" class="mb-1 block text-[10px] font-bold tracking-[1.2px] text-[#525252] uppercase">
                    NOMOR PO / CATATAN TERMIN (OPSIONAL)
                  </label>
                  <input
                    id="invoice-po"
                    v-model="invoicePoNumber"
                    type="text"
                    placeholder="PO-2026-001 atau jatuh tempo 14 hari"
                    class="min-h-[44px] w-full border border-black/25 bg-white px-3 text-[13px] text-[#0b0b0b] focus:border-[#ed3541] focus:outline-none max-[700px]:text-[16px]"
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            class="flex min-h-[50px] w-full cursor-pointer items-center justify-between bg-[#ed3541] px-6 py-3.5 text-[11px] font-bold tracking-[1.6px] text-white uppercase transition-colors hover:bg-[#ff4754] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b0b0b]"
          >
            <span>
              {{ selectedScheme === 'INVOICE' ? 'AJUKAN INVOICE & BUAT PESANAN' : 'BUAT PESANAN & LANJUT KE PEMBAYARAN' }}
            </span>
            <span aria-hidden="true">→</span>
          </button>
        </form>

        <CheckoutOrderSummary
          :draft="orderDraft"
          :resolved-accounts="pricingSummary.resolvedAccounts"
          :total-idr="pricingSummary.totalIdr"
          :visit-base-fee-idr="pricingSummary.visitBaseFeeIdr"
          :accounts-subtotal-idr="pricingSummary.accountsSubtotalIdr"
          :pay-now-idr="pricingSummary.payNowIdr"
          :remaining-idr="pricingSummary.remainingIdr"
          :selected-scheme="selectedScheme"
        />
      </div>
    </section>

    <CheckoutPaymentModal
      :is-open="isPaymentModalOpen"
      :order="stagedPaymentOrder"
      @close="handleClosePaymentModal"
      @complete="handlePaymentComplete"
    />
  </div>
</template>

