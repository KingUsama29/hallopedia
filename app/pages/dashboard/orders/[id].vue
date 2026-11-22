<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import CheckoutPaymentModal from '~/components/checkout/CheckoutPaymentModal.vue'
import OrderAdminChatCard from '~/components/portal/OrderAdminChatCard.vue'
import OrderPaymentBillingCard from '~/components/portal/OrderPaymentBillingCard.vue'
import OrderScheduleBriefCard from '~/components/portal/OrderScheduleBriefCard.vue'
import OrderScheduleTimelineCard from '~/components/portal/OrderScheduleTimelineCard.vue'
import PortalTopBar from '~/components/portal/PortalTopBar.vue'
import { useCustomerAuth } from '~/composables/useCustomerAuth'
import { useOrderPortal } from '~/composables/useOrderPortal'
import { DISTRIBUTION_MODE_LABELS, PAYMENT_SCHEME_LABELS, SERVICE_TYPE_LABELS, formatIdr } from '~/data/catalog'
import { ORDER_STATUS_LABELS, formatShortDateTime, type PaymentChannel } from '~/data/orders'

definePageMeta({
  middleware: 'auth',
})

const route = useRoute()
const { currentCustomer, isAuthHydrated, hydrateAuth } = useCustomerAuth()
const { isOrdersHydrated, hydrateOrders, getCustomerOrderById, finalizePaymentPreview } = useOrderPortal()

const isPaymentModalOpen = ref(false)
const chatContainerRef = ref<HTMLElement | null>(null)
const adminChatCardRef = ref<InstanceType<typeof OrderAdminChatCard> | null>(null)
const orderId = computed(() => String(route.params.id ?? ''))
const order = computed(() => (orderId.value ? getCustomerOrderById(orderId.value) : null))

const unreadAdminCount = computed(() =>
  order.value
    ? order.value.messages.filter((m) => m.senderRole === 'ADMIN' && !m.readByCustomer).length
    : 0,
)

const canTriggerPaymentModal = computed(() => {
  if (!order.value) return false
  if (order.value.status === 'CANCELLED') return false
  if (order.value.paymentSummary.scheme === 'INVOICE') return false
  return order.value.paymentSummary.remainingIdr > 0
})

const invoiceStatusLabel = computed(() => {
  if (!order.value || order.value.paymentSummary.scheme !== 'INVOICE') return ''
  if (order.value.paymentSummary.approvalStatus === 'SETTLED') return 'Lunas'
  if (order.value.paymentSummary.approvalStatus === 'APPROVED') return 'Disetujui Admin'
  return 'Menunggu Persetujuan Admin'
})

const visitBaseFeeIdr = computed(() => order.value?.visitBaseFeeIdr ?? 0)
const accountsSubtotalIdr = computed(() => {
  if (!order.value) return 0
  if (typeof order.value.accountsSubtotalIdr === 'number') return order.value.accountsSubtotalIdr
  return Math.max(0, order.value.paymentSummary.totalIdr - visitBaseFeeIdr.value)
})

onMounted(async () => {
  hydrateAuth()
  hydrateOrders()
  if (!currentCustomer.value) {
    await navigateTo({ path: '/login', query: { redirect: route.fullPath } })
  }
})

function handlePaymentComplete(payload: {
  orderId: string
  channel: Exclude<PaymentChannel, 'INVOICE'>
  outcome: 'SUCCESS' | 'PENDING'
}) {
  finalizePaymentPreview(payload.orderId, payload.channel, payload.outcome)
  isPaymentModalOpen.value = false
}

async function openUnreadAdminChat() {
  adminChatCardRef.value?.openChat({ focusInput: true })
  await nextTick()
  chatContainerRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <div class="min-h-screen bg-[#f6f5f2] text-[#0b0b0b]">
    <PortalTopBar />

    <section class="mx-auto max-w-[1400px] px-[6%] py-[clamp(44px,6vw,84px)] max-[700px]:px-[5%]">
      <div class="no-print mb-6">
        <NuxtLink
          to="/dashboard/orders"
          class="inline-flex min-h-[40px] items-center gap-2 text-[11px] font-bold tracking-[1.4px] text-[#525252] uppercase no-underline hover:text-[#ed3541] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ed3541]"
        >
          <span aria-hidden="true">←</span>
          <span>KEMBALI KE DAFTAR PESANAN</span>
        </NuxtLink>
      </div>

      <div v-if="!isAuthHydrated || !isOrdersHydrated" class="border border-black/15 bg-white p-8 text-[13px] text-[#525252]">
        Memuat rincian pesanan...
      </div>

      <div v-else-if="!order" class="border border-black/15 bg-white p-8 sm:p-12">
        <h1 class="mt-0 mb-2 text-[24px] font-extrabold tracking-[-0.03em]">
          Pesanan Tidak Ditemukan
        </h1>
        <p class="mt-0 mb-6 text-[13px] text-[#525252]">
          Kode pesanan ini tidak ditemukan di akun Anda. Pastikan Anda masuk menggunakan akun yang sama saat checkout.
        </p>
        <NuxtLink
          to="/dashboard/orders"
          class="inline-flex min-h-[44px] items-center bg-[#0b0b0b] px-5 py-2.5 text-[11px] font-bold tracking-[1.4px] text-white uppercase no-underline hover:bg-[#ed3541]"
        >
          LIHAT SEMUA PESANAN
        </NuxtLink>
      </div>

      <template v-else>
        <!-- Header Status Order -->
        <div class="border border-black/15 bg-[#0b0b0b] p-6 text-white sm:p-8 print:border-[#0b0b0b] print:bg-white print:text-[#0b0b0b]">
          <div class="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div class="flex flex-wrap items-center gap-2.5 text-[10px] font-bold tracking-[1.6px] uppercase">
                <span
                  class="px-2.5 py-1 print:border print:border-[#0b0b0b] print:bg-white print:text-[#0b0b0b]"
                  :class="order.status === 'CANCELLED' ? 'bg-[#292929] text-[#ccc]' : 'bg-[#ed3541] text-white'"
                >
                  {{ ORDER_STATUS_LABELS[order.status] }}
                </span>
                <span class="text-[#a3a3a3] print:text-[#525252]">DIBUAT {{ formatShortDateTime(order.createdAt) }}</span>
              </div>
              <h1 class="mt-3 mb-1 text-[clamp(26px,3.6vw,44px)] font-black tracking-[-0.04em] text-white tabular-nums print:text-[#0b0b0b]">
                {{ order.orderCode }}
              </h1>
              <p class="m-0 text-[13px] text-[#ccc] print:text-[#525252]">
                {{ order.sourceName }} · {{ order.brandName }} · {{ SERVICE_TYPE_LABELS[order.serviceType] }}
              </p>
            </div>

            <div class="flex flex-col items-start gap-2 sm:items-end">
              <div class="text-[10px] tracking-[1.5px] text-[#a3a3a3] uppercase print:text-[#525252]">
                TOTAL ({{ PAYMENT_SCHEME_LABELS[order.paymentSummary.scheme] }})
              </div>
              <div class="text-[28px] font-black tracking-[-0.03em] text-white tabular-nums print:text-[#0b0b0b]">
                {{ formatIdr(order.paymentSummary.totalIdr) }}
              </div>
              <button
                v-if="canTriggerPaymentModal"
                type="button"
                class="no-print mt-1 inline-flex min-h-[44px] cursor-pointer items-center gap-2 bg-[#ed3541] px-5 py-2.5 text-[11px] font-bold tracking-[1.4px] text-white uppercase transition-colors hover:bg-[#ff4754] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                @click="isPaymentModalOpen = true"
              >
                <span>{{ order.paymentSummary.paidIdr === 0 ? 'BAYAR SEKARANG' : 'LUNASI SISA TAGIHAN' }}</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>

          <div
            v-if="order.paymentSummary.scheme === 'INVOICE'"
            class="mt-6 border-t border-[#292929] pt-4 text-[12px] text-[#ccc] print:border-black/20 print:text-[#0b0b0b]"
          >
            <strong class="text-[#ed3541] uppercase print:text-[#0b0b0b]">INVOICE INSTANSI:</strong>
            {{ order.paymentSummary.companyName }}
            <span v-if="order.paymentSummary.poNumber"> · PO/Ref: {{ order.paymentSummary.poNumber }}</span>
            · Status: <strong class="text-white print:text-[#0b0b0b]">{{ invoiceStatusLabel }}</strong>
          </div>
          <div
            v-else-if="order.status !== 'CANCELLED' && order.paymentSummary.remainingIdr > 0 && order.paymentSummary.paidIdr > 0"
            class="mt-6 border-t border-[#292929] pt-4 text-[12px] text-[#ccc] print:border-black/20 print:text-[#0b0b0b]"
          >
            Terbayar awal: <strong class="text-white tabular-nums print:text-[#0b0b0b]">{{ formatIdr(order.paymentSummary.paidIdr) }}</strong> ·
            Sisa pelunasan sebelum tayang: <strong class="text-[#ed3541] tabular-nums print:text-[#0b0b0b]">{{ formatIdr(order.paymentSummary.remainingIdr) }}</strong>
          </div>
        </div>

        <!-- Pita Lompat Cepat Saat Ada Pesan Admin Belum Dibaca -->
        <div
          v-if="unreadAdminCount > 0"
          role="status"
          class="no-print mt-6 flex flex-wrap items-center justify-between gap-3 border-l-4 border-[#ed3541] bg-[#0b0b0b] px-5 py-3.5 text-white"
        >
          <div class="text-[12px] leading-[1.5]">
            <span class="mr-2 inline-block bg-[#ed3541] px-2 py-0.5 text-[9px] font-black tracking-[1.2px] uppercase tabular-nums">
              {{ unreadAdminCount }} PESAN BARU
            </span>
            <span>Admin Operasional mengirim balasan atau pembaruan untuk pesanan ini.</span>
          </div>
          <button
            type="button"
            class="min-h-[40px] cursor-pointer bg-white px-4 py-2 text-[10px] font-extrabold tracking-[1.3px] text-[#0b0b0b] uppercase transition-colors hover:bg-[#ed3541] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white max-lg:min-h-[44px]"
            @click="openUnreadAdminChat"
          >
            LIHAT &amp; BUKA CHAT ↓
          </button>
        </div>

        <!-- Grid Rincian Akun, Brief/Jadwal + Live Chat Admin & Riwayat -->
        <div class="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div class="space-y-6">
            <!-- Snapshot Akun Media -->
            <div class="border border-black/15 bg-white p-6">
              <div class="mb-4 flex items-center justify-between border-b border-black/10 pb-3">
                <h2 class="m-0 text-[12px] font-bold tracking-[1.5px] uppercase">
                  AKUN MEDIA TERKUNCI ({{ order.accountsSnapshot.length }})
                </h2>
                <span class="text-[11px] text-[#525252]">{{ DISTRIBUTION_MODE_LABELS[order.distributionMode] }}</span>
              </div>
              <div class="divide-y divide-black/10">
                <div
                  v-for="acc in order.accountsSnapshot"
                  :key="acc.id"
                  class="flex items-center justify-between gap-3 py-2.5 text-[12px]"
                >
                  <div>
                    <div class="font-bold text-[#0b0b0b]">{{ acc.name }}</div>
                    <div class="text-[11px] text-[#525252]">{{ acc.handle }} · {{ acc.regionLabel }}</div>
                  </div>
                  <div class="font-bold text-[#0b0b0b] tabular-nums">
                    {{ acc.appliedUnitPriceIdr !== null ? formatIdr(acc.appliedUnitPriceIdr) : 'PAKET TETAP' }}
                  </div>
                </div>
              </div>
              <div
                v-if="visitBaseFeeIdr > 0"
                class="mt-4 space-y-2 border-t border-black/15 pt-3.5 text-[12px]"
              >
                <div class="flex items-baseline justify-between gap-2 text-[#525252]">
                  <span>Subtotal {{ order.accountsSnapshot.length }} Akun Media</span>
                  <span class="font-semibold text-[#0b0b0b] tabular-nums">{{ formatIdr(accountsSubtotalIdr) }}</span>
                </div>
                <div class="flex items-baseline justify-between gap-2 text-[#525252]">
                  <span>Biaya Kru Liputan &amp; Editing Visit</span>
                  <span class="font-semibold text-[#0b0b0b] tabular-nums">{{ formatIdr(visitBaseFeeIdr) }}</span>
                </div>
                <div class="flex items-baseline justify-between gap-2 border-t border-black/10 pt-2 font-extrabold text-[#0b0b0b]">
                  <span>Total Pesanan</span>
                  <span class="text-[#ed3541] tabular-nums">{{ formatIdr(order.paymentSummary.totalIdr) }}</span>
                </div>
              </div>
              <div
                v-else-if="order.pricingStrategy === 'FIXED_PACKAGE'"
                class="mt-4 flex items-baseline justify-between gap-2 border-t border-black/15 pt-3 text-[12px]"
              >
                <span class="text-[#525252]">Harga Bundel Tetap ({{ order.accountsSnapshot.length }} Akun)</span>
                <span class="font-extrabold text-[#0b0b0b] tabular-nums">{{ formatIdr(order.paymentSummary.totalIdr) }}</span>
              </div>
            </div>

            <!-- Rincian Pembayaran, Pelunasan DP & Bukti Tagihan -->
            <OrderPaymentBillingCard :order="order" @open-payment="isPaymentModalOpen = true" />

            <!-- Jadwal Awal, Brief Kampanye & Lampiran Materi -->
            <OrderScheduleBriefCard :order="order" />

            <!-- Jadwal Eksekusi & Penayangan Per Akun -->
            <OrderScheduleTimelineCard :order="order" />
          </div>

          <div ref="chatContainerRef" class="space-y-6 lg:sticky lg:top-8">
            <!-- Live Chat Admin Terikat Pesanan -->
            <div class="no-print">
              <OrderAdminChatCard ref="adminChatCardRef" :order="order" />
            </div>

            <!-- Riwayat Status Order -->
            <div class="border border-black/15 bg-white p-6">
              <h2 class="mt-0 mb-4 border-b border-black/10 pb-3 text-[12px] font-bold tracking-[1.5px] uppercase">
                RIWAYAT STATUS PESANAN
              </h2>
              <div class="space-y-3">
                <div
                  v-for="log in order.statusLogs"
                  :key="log.id"
                  class="border-l-2 border-[#ed3541] pl-3 text-[12px]"
                >
                  <div class="text-[10px] font-bold tracking-[1.2px] text-[#525252] uppercase">
                    {{ ORDER_STATUS_LABELS[log.status] }} · {{ formatShortDateTime(log.createdAt) }}
                  </div>
                  <p class="mt-1 mb-0 leading-[1.5] text-[#0b0b0b]">{{ log.note }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </section>

    <CheckoutPaymentModal
      :is-open="isPaymentModalOpen"
      :order="order"
      @close="isPaymentModalOpen = false"
      @complete="handlePaymentComplete"
    />
  </div>
</template>

