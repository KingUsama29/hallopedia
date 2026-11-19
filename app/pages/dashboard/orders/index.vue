<script setup lang="ts">
import { onMounted } from 'vue'
import PortalTopBar from '~/components/portal/PortalTopBar.vue'
import { useCustomerAuth } from '~/composables/useCustomerAuth'
import { useOrderPortal } from '~/composables/useOrderPortal'
import { DISTRIBUTION_MODE_LABELS, PAYMENT_SCHEME_LABELS, SERVICE_TYPE_LABELS, formatIdr } from '~/data/catalog'
import { ORDER_STATUS_LABELS, formatIndonesianFullDateTime, formatShortDateTime } from '~/data/orders'

definePageMeta({
  middleware: 'auth',
})

const { currentCustomer, isAuthHydrated, hydrateAuth } = useCustomerAuth()
const { customerOrders, isOrdersHydrated, hydrateOrders } = useOrderPortal()

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
            Kelola status pembayaran, brief materi, jadwal tayang, dan komunikasi admin untuk setiap kampanye Anda.
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

      <div v-else class="mt-8 space-y-4">
        <article
          v-for="order in customerOrders"
          :key="order.id"
          class="flex flex-col justify-between gap-5 border border-black/15 bg-white p-6 transition-colors hover:border-[#0b0b0b] lg:flex-row lg:items-center"
        >
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2.5 text-[10px] font-bold tracking-[1.4px] uppercase">
              <span class="bg-[#0b0b0b] px-2.5 py-1 text-white tabular-nums">{{ order.orderCode }}</span>
              <span
                class="border px-2.5 py-1"
                :class="order.status === 'PENDING_PAYMENT' || order.status === 'WAITING_INVOICE_APPROVAL' ? 'border-[#ed3541] text-[#ed3541]' : 'border-black/20 bg-[#f6f5f2] text-[#0b0b0b]'"
              >
                {{ ORDER_STATUS_LABELS[order.status] }}
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

          <div class="flex flex-wrap items-center justify-between gap-6 border-t border-black/10 pt-4 lg:border-t-0 lg:pt-0">
            <div class="text-left lg:text-right">
              <div class="text-[10px] font-bold tracking-[1.3px] text-[#525252] uppercase">
                SKEMA {{ PAYMENT_SCHEME_LABELS[order.paymentSummary.scheme] }}
              </div>
              <div class="mt-0.5 text-[20px] font-black tracking-[-0.03em] text-[#0b0b0b] tabular-nums">
                {{ formatIdr(order.paymentSummary.totalIdr) }}
              </div>
              <div v-if="order.paymentSummary.remainingIdr > 0" class="text-[11px] font-semibold text-[#ed3541] tabular-nums">
                Sisa tagihan: {{ formatIdr(order.paymentSummary.remainingIdr) }}
              </div>
            </div>

            <NuxtLink
              :to="`/dashboard/orders/${order.id}`"
              class="inline-flex min-h-[44px] items-center gap-2 bg-[#ed3541] px-5 py-2.5 text-[11px] font-bold tracking-[1.4px] text-white uppercase no-underline transition-colors hover:bg-[#ff4754] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b0b0b]"
            >
              <span>{{ order.status === 'PENDING_PAYMENT' ? 'BAYAR / DETAIL' : 'KELOLA PESANAN' }}</span>
              <span aria-hidden="true">→</span>
            </NuxtLink>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

