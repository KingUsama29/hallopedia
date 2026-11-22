<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import CheckoutPaymentModal from '~/components/checkout/CheckoutPaymentModal.vue'
import OrderDashboardSummaryStrip from '~/components/portal/OrderDashboardSummaryStrip.vue'
import PortalTopBar from '~/components/portal/PortalTopBar.vue'
import PwaPortalBanner from '~/components/portal/PwaPortalBanner.vue'
import { useCustomerAuth } from '~/composables/useCustomerAuth'
import { useOrderPortal } from '~/composables/useOrderPortal'
import {
  DISTRIBUTION_MODE_LABELS,
  PAYMENT_SCHEME_LABELS,
  SERVICE_TYPE_LABELS,
  formatIdr,
  type PaymentScheme,
} from '~/data/catalog'
import {
  ORDER_DASHBOARD_TABS,
  computeDashboardMetrics,
  countOrderUnreadAdmin,
  filterAndSearchOrders,
  matchesOrderTab,
  resolveOrderCardAction,
  type OrderDashboardFilter,
  type OrderDashboardSort,
  type OrderDashboardTab,
} from '~/data/order-dashboard'
import {
  ORDER_STATUS_LABELS,
  formatIndonesianFullDateTime,
  formatShortDateTime,
  type PaymentChannel,
} from '~/data/orders'

definePageMeta({
  middleware: 'auth',
})

const { currentCustomer, isAuthHydrated, hydrateAuth } = useCustomerAuth()
const {
  customerOrders,
  isOrdersHydrated,
  hydrateOrders,
  getCustomerOrderById,
  finalizePaymentPreview,
} = useOrderPortal()

const filters = reactive<OrderDashboardFilter>({
  tab: 'ALL',
  query: '',
  scheme: 'ALL',
  unreadOnly: false,
  sortBy: 'NEWEST',
})

const quickPayOrderId = ref<string | null>(null)
const quickPayOrder = computed(() =>
  quickPayOrderId.value ? getCustomerOrderById(quickPayOrderId.value) : null,
)

const metrics = computed(() => computeDashboardMetrics(customerOrders.value))
const filteredOrders = computed(() => filterAndSearchOrders(customerOrders.value, filters))
const hasActiveFilters = computed(
  () =>
    filters.tab !== 'ALL' ||
    filters.query.trim().length > 0 ||
    filters.scheme !== 'ALL' ||
    filters.unreadOnly ||
    filters.sortBy !== 'NEWEST',
)

function countOrdersInTab(tab: OrderDashboardTab): number {
  return customerOrders.value.filter((o) => matchesOrderTab(o, tab)).length
}

function resetFilters() {
  filters.tab = 'ALL'
  filters.query = ''
  filters.scheme = 'ALL'
  filters.unreadOnly = false
  filters.sortBy = 'NEWEST'
}

function handleSummaryTabSelect(tab: OrderDashboardTab) {
  filters.tab = tab
  filters.unreadOnly = false
}

function handleToggleUnread() {
  const nextUnread = !filters.unreadOnly
  filters.unreadOnly = nextUnread
  if (nextUnread) {
    filters.tab = 'ALL'
  }
}

function handleQuickPaymentComplete(payload: {
  orderId: string
  channel: Exclude<PaymentChannel, 'INVOICE'>
  outcome: 'SUCCESS' | 'PENDING'
}) {
  finalizePaymentPreview(payload.orderId, payload.channel, payload.outcome)
  quickPayOrderId.value = null
}

onMounted(async () => {
  hydrateAuth()
  hydrateOrders()
  if (!currentCustomer.value) {
    await navigateTo({ path: '/login', query: { redirect: '/dashboard/orders' } })
  }
})
</script>

<template>
  <div class="min-h-screen bg-[#f6f5f2] text-[#0b0b0b]">
    <PortalTopBar />

    <section class="mx-auto max-w-[1400px] px-[6%] py-[clamp(44px,6vw,84px)] max-[700px]:px-[5%]">
      <div class="flex flex-wrap items-end justify-between gap-6 border-b border-black/15 pb-6">
        <div>
          <div class="flex items-center gap-[10px] text-[10px] font-bold tracking-[2px] text-[#525252] uppercase">
            <span class="h-[7px] w-[7px] rounded-full bg-[#ed3541]" aria-hidden="true"></span>
            PORTAL PESANAN PELANGGAN
          </div>
          <h1 class="mt-3 mb-2 text-[clamp(30px,4vw,52px)] font-extrabold leading-[1.02] tracking-[-0.04em] text-[#0b0b0b]">
            Pesanan Iklan Saya
          </h1>
          <p class="m-0 text-[13px] text-[#525252]">
            Pantau tagihan &amp; pelunasan DP 50%, pengiriman brief, jadwal tayang WITA, serta pesan Admin secara terpusat.
          </p>
        </div>

        <NuxtLink
          to="/#katalog"
          class="inline-flex min-h-[44px] items-center gap-2 bg-[#0b0b0b] px-5 py-2.5 text-[11px] font-bold tracking-[1.4px] text-white uppercase no-underline transition-colors hover:bg-[#ed3541] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541]"
        >
          <span>BUAT PESANAN BARU</span>
          <span aria-hidden="true">+</span>
        </NuxtLink>
      </div>

      <PwaPortalBanner />

      <div v-if="!isAuthHydrated || !isOrdersHydrated" class="mt-8 border border-black/15 bg-white p-8 text-[13px] text-[#525252]">
        Memuat daftar pesanan Anda...
      </div>

      <div v-else-if="!customerOrders.length" class="mt-8 border border-black/15 bg-white p-8 sm:p-12">
        <h2 class="mt-0 mb-2 text-[20px] font-bold tracking-[-0.03em]">Belum Ada Pesanan Terdaftar</h2>
        <p class="mt-0 mb-6 max-w-[520px] text-[13px] leading-[1.6] text-[#525252]">
          Setelah Anda melakukan checkout paket iklan di katalog, seluruh riwayat tagihan, brief, dan jadwal tayang akan muncul di sini.
        </p>
        <NuxtLink
          to="/#katalog"
          class="inline-flex min-h-[44px] items-center gap-2 bg-[#ed3541] px-5 py-2.5 text-[11px] font-bold tracking-[1.4px] text-white uppercase no-underline transition-colors hover:bg-[#ff4754]"
        >
          <span>LIHAT PAKET KATALOG</span>
          <span aria-hidden="true">→</span>
        </NuxtLink>
      </div>

      <template v-else>
        <OrderDashboardSummaryStrip
          :metrics="metrics"
          :active-tab="filters.tab"
          :unread-only="filters.unreadOnly"
          @select-tab="handleSummaryTabSelect"
          @toggle-unread="handleToggleUnread"
        />

        <!-- Toolbar Filter Tab, Search, Skema & Urutan -->
        <div class="mt-6 border border-black/15 bg-white p-4 sm:p-5">
          <div class="flex flex-wrap gap-2" role="group" aria-label="Filter status pesanan">
            <button
              v-for="tab in ORDER_DASHBOARD_TABS"
              :key="tab.value"
              type="button"
              :aria-pressed="filters.tab === tab.value"
              class="inline-flex min-h-[40px] cursor-pointer items-center gap-2 border px-3.5 py-2 text-[10px] font-bold tracking-[1.2px] uppercase transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541] max-lg:min-h-[44px]"
              :class="
                filters.tab === tab.value
                  ? 'border-[#0b0b0b] bg-[#0b0b0b] text-white'
                  : 'border-black/15 bg-[#f6f5f2] text-[#0b0b0b] hover:border-[#ed3541]'
              "
              @click="filters.tab = tab.value"
            >
              <span>{{ tab.label }}</span>
              <span
                class="px-1.5 py-0.5 text-[9px] tabular-nums"
                :class="filters.tab === tab.value ? 'bg-[#ed3541] text-white' : 'bg-white text-[#525252]'"
              >
                {{ countOrdersInTab(tab.value) }}
              </span>
            </button>
          </div>

          <div class="mt-4 grid grid-cols-1 gap-3 border-t border-black/10 pt-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_0.8fr_auto]">
            <div class="sm:col-span-2 lg:col-span-1">
              <label for="orders-search-input" class="sr-only">Cari kode order, paket, brand, atau akun media</label>
              <input
                id="orders-search-input"
                v-model="filters.query"
                name="orderSearch"
                type="search"
                placeholder="Cari kode HLP-..., nama paket, brand, atau @akun"
                class="min-h-[44px] w-full border border-black/20 bg-[#f6f5f2] px-3.5 text-[12px] text-[#0b0b0b] focus:border-[#ed3541] focus:bg-white focus:outline-none max-[700px]:text-[16px]"
              />
            </div>

            <div>
              <label for="orders-scheme-filter" class="sr-only">Filter skema pembayaran</label>
              <select
                id="orders-scheme-filter"
                v-model="filters.scheme"
                name="orderScheme"
                class="min-h-[44px] w-full border border-black/20 bg-[#f6f5f2] px-3 text-[12px] font-semibold text-[#0b0b0b] focus:border-[#ed3541] focus:bg-white focus:outline-none max-[700px]:text-[16px]"
              >
                <option value="ALL">Semua Skema Bayar</option>
                <option value="FULL">Pembayaran Penuh (100%)</option>
                <option value="DP">Uang Muka (DP 50%)</option>
                <option value="INVOICE">Invoice Resmi</option>
              </select>
            </div>

            <div>
              <label for="orders-sort-select" class="sr-only">Urutkan pesanan</label>
              <select
                id="orders-sort-select"
                v-model="filters.sortBy"
                name="orderSort"
                class="min-h-[44px] w-full border border-black/20 bg-[#f6f5f2] px-3 text-[12px] font-semibold text-[#0b0b0b] focus:border-[#ed3541] focus:bg-white focus:outline-none max-[700px]:text-[16px]"
              >
                <option value="NEWEST">Urutkan: Terbaru</option>
                <option value="HIGHEST_REMAINING">Sisa Tagihan Terbesar</option>
                <option value="UNREAD_FIRST">Pesan Admin Baru Dulu</option>
              </select>
            </div>

            <button
              v-if="hasActiveFilters"
              type="button"
              class="min-h-[44px] cursor-pointer border border-black/20 bg-white px-4 py-2 text-[10px] font-bold tracking-[1.2px] text-[#ed3541] uppercase transition-colors hover:border-[#ed3541] hover:bg-[#ed3541] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541] sm:col-span-2 lg:col-span-1"
              @click="resetFilters"
            >
              RESET FILTER
            </button>
          </div>
        </div>

        <div v-if="!filteredOrders.length" class="mt-6 border border-black/15 bg-white p-8 text-center">
          <h2 class="mt-0 mb-2 text-[18px] font-bold tracking-[-0.02em]">
            Tidak Ada Pesanan yang Cocok
          </h2>
          <p class="mt-0 mb-5 text-[13px] text-[#525252]">
            Ubah kata kunci pencarian atau pilih tab status lainnya untuk melihat pesanan Anda.
          </p>
          <button
            type="button"
            class="min-h-[44px] cursor-pointer bg-[#0b0b0b] px-5 py-2.5 text-[11px] font-bold tracking-[1.3px] text-white uppercase transition-colors hover:bg-[#ed3541]"
            @click="resetFilters"
          >
            TAMPILKAN SEMUA PESANAN
          </button>
        </div>

        <div v-else class="mt-6 space-y-4">
          <article
            v-for="order in filteredOrders"
            :key="order.id"
            class="flex flex-col justify-between gap-5 border border-black/15 bg-white p-5 transition-colors hover:border-[#0b0b0b] sm:p-6 lg:flex-row lg:items-center"
            :class="order.status === 'CANCELLED' ? 'opacity-80' : ''"
          >
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2 text-[10px] font-bold tracking-[1.3px] uppercase">
                <span class="bg-[#0b0b0b] px-2.5 py-1 text-white tabular-nums">{{ order.orderCode }}</span>
                <span
                  class="border px-2.5 py-1"
                  :class="
                    order.status === 'PENDING_PAYMENT' || order.status === 'WAITING_INVOICE_APPROVAL'
                      ? 'border-[#ed3541] text-[#ed3541]'
                      : order.status === 'CANCELLED'
                        ? 'border-black/20 bg-black/5 text-[#525252]'
                        : 'border-black/20 bg-[#f6f5f2] text-[#0b0b0b]'
                  "
                >
                  {{ ORDER_STATUS_LABELS[order.status] }}
                </span>
                <span
                  v-if="order.brief"
                  class="border border-black/15 bg-[#f6f5f2] px-2 py-1 text-[#0b0b0b]"
                >
                  BRIEF TERKIRIM
                </span>
                <span
                  v-if="countOrderUnreadAdmin(order) > 0"
                  class="bg-[#ed3541] px-2.5 py-1 text-white tabular-nums"
                >
                  {{ countOrderUnreadAdmin(order) }} PESAN BARU
                </span>
                <span class="text-[#525252]">{{ formatShortDateTime(order.createdAt) }}</span>
              </div>

              <h2 class="mt-3 mb-1 text-[20px] font-extrabold tracking-[-0.03em] text-[#0b0b0b]">
                {{ order.sourceName }}
              </h2>
              <p class="m-0 text-[12px] text-[#525252]">
                {{ order.brandName }} · {{ SERVICE_TYPE_LABELS[order.serviceType] }} · {{ DISTRIBUTION_MODE_LABELS[order.distributionMode] }} · {{ order.accountsSnapshot.length }} Akun Media
              </p>
              <p
                v-if="formatIndonesianFullDateTime(order.schedulePreference?.preferredDate ?? order.targetPublishDate, order.schedulePreference?.preferredTimeWita)"
                class="mt-1 mb-0 text-[11px] font-semibold text-[#0b0b0b]"
              >
                {{ order.serviceType === 'VISIT_PRODUCTION' ? 'Jadwal Visit:' : 'Target Tayang:' }}
                {{ formatIndonesianFullDateTime(order.schedulePreference?.preferredDate ?? order.targetPublishDate, order.schedulePreference?.preferredTimeWita) }}
              </p>
            </div>

            <div class="flex flex-col items-stretch justify-between gap-3.5 border-t border-black/10 pt-4 sm:flex-row sm:items-center lg:shrink-0 lg:justify-end lg:gap-6 lg:border-t-0 lg:pt-0">
              <div class="text-left lg:text-right">
                <div class="text-[10px] font-bold tracking-[1.3px] text-[#525252] uppercase">
                  SKEMA {{ PAYMENT_SCHEME_LABELS[order.paymentSummary.scheme] }}
                </div>
                <div class="mt-0.5 text-[20px] font-black tracking-[-0.03em] text-[#0b0b0b] tabular-nums">
                  {{ formatIdr(order.paymentSummary.totalIdr) }}
                </div>
                <div
                  v-if="order.status !== 'CANCELLED' && order.paymentSummary.remainingIdr > 0"
                  class="text-[11px] font-semibold text-[#ed3541] tabular-nums"
                >
                  <template v-if="order.paymentSummary.scheme === 'DP' && order.paymentSummary.paidIdr > 0">
                    DP Terbayar {{ formatIdr(order.paymentSummary.paidIdr) }} · Sisa {{ formatIdr(order.paymentSummary.remainingIdr) }}
                  </template>
                  <template v-else>
                    Sisa tagihan: {{ formatIdr(order.paymentSummary.remainingIdr) }}
                  </template>
                </div>
                <div
                  v-else-if="order.status !== 'CANCELLED' && order.paymentSummary.remainingIdr === 0"
                  class="text-[11px] font-semibold text-[#525252]"
                >
                  Pembayaran Lunas 100%
                </div>
              </div>

              <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <button
                  v-if="resolveOrderCardAction(order).canQuickPay"
                  type="button"
                  class="inline-flex min-h-[44px] cursor-pointer items-center justify-between gap-2 bg-[#ed3541] px-4 py-2.5 text-[11px] font-bold tracking-[1.3px] text-white uppercase transition-colors hover:bg-[#ff4754] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b0b0b] sm:justify-center"
                  @click="quickPayOrderId = order.id"
                >
                  <span>{{ resolveOrderCardAction(order).quickPayLabel }}</span>
                  <span aria-hidden="true">→</span>
                </button>

                <NuxtLink
                  :to="`/dashboard/orders/${order.id}`"
                  class="inline-flex min-h-[44px] items-center justify-between gap-2 px-5 py-2.5 text-[11px] font-bold tracking-[1.4px] uppercase no-underline transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541] sm:justify-center"
                  :class="
                    resolveOrderCardAction(order).canQuickPay
                      ? 'border border-[#0b0b0b] bg-white text-[#0b0b0b] hover:bg-[#0b0b0b] hover:text-white'
                      : 'bg-[#0b0b0b] text-white hover:bg-[#ed3541]'
                  "
                >
                  <span>{{ resolveOrderCardAction(order).primaryLabel }}</span>
                  <span aria-hidden="true">→</span>
                </NuxtLink>
              </div>
            </div>
          </article>
        </div>
      </template>
    </section>

    <CheckoutPaymentModal
      :is-open="Boolean(quickPayOrder)"
      :order="quickPayOrder"
      @close="quickPayOrderId = null"
      @complete="handleQuickPaymentComplete"
    />
  </div>
</template>
