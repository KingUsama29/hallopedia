<script setup lang="ts">
import { formatIdr } from '~/data/catalog'
import type { DashboardOrderMetrics, OrderDashboardTab } from '~/data/order-dashboard'

defineProps<{
  metrics: DashboardOrderMetrics
  activeTab: OrderDashboardTab
  unreadOnly: boolean
}>()

const emit = defineEmits<{
  selectTab: [tab: OrderDashboardTab]
  toggleUnread: []
}>()
</script>

<template>
  <div
    class="mt-6 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 lg:grid-cols-4"
    role="region"
    aria-label="Ringkasan pesanan pelanggan"
  >
    <button
      type="button"
      class="flex min-h-[108px] min-w-0 cursor-pointer flex-col justify-between overflow-hidden border p-3.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541] sm:min-h-[120px] sm:p-4"
      :class="activeTab === 'ALL' && !unreadOnly ? 'border-[#0b0b0b] bg-white' : 'border-black/15 bg-white hover:border-[#0b0b0b]'"
      :aria-pressed="activeTab === 'ALL' && !unreadOnly"
      @click="emit('selectTab', 'ALL')"
    >
      <div class="flex w-full items-start justify-between gap-2 text-[9px] font-bold leading-[1.35] tracking-[1.3px] text-[#525252] uppercase">
        <span>01 / TOTAL PESANAN</span>
        <span
          class="mt-[2px] h-[6px] w-[6px] shrink-0 rounded-full"
          :class="activeTab === 'ALL' && !unreadOnly ? 'bg-[#ed3541]' : 'bg-black/20'"
          aria-hidden="true"
        ></span>
      </div>
      <div class="mt-2.5 min-w-0">
        <div class="text-[clamp(16px,4.1vw,22px)] font-black leading-[1.1] tracking-[-0.04em] text-[#0b0b0b] tabular-nums sm:text-[clamp(20px,2.1vw,25px)]">
          {{ metrics.totalOrders }}
        </div>
        <div class="mt-1.5 truncate text-[11px] text-[#525252]">
          {{ metrics.activeOrders }} kampanye aktif
        </div>
      </div>
    </button>

    <button
      type="button"
      class="flex min-h-[108px] min-w-0 cursor-pointer flex-col justify-between overflow-hidden border p-3.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541] sm:min-h-[120px] sm:p-4"
      :class="activeTab === 'ACTION_PAYMENT' && !unreadOnly ? 'border-[#ed3541] bg-white' : 'border-black/15 bg-white hover:border-[#0b0b0b]'"
      :aria-pressed="activeTab === 'ACTION_PAYMENT' && !unreadOnly"
      @click="emit('selectTab', 'ACTION_PAYMENT')"
    >
      <div class="flex w-full items-start justify-between gap-2 text-[9px] font-bold leading-[1.35] tracking-[1.3px] text-[#525252] uppercase">
        <span>02 / SISA TAGIHAN &amp; DP</span>
        <span
          class="mt-[2px] h-[6px] w-[6px] shrink-0 rounded-full"
          :class="activeTab === 'ACTION_PAYMENT' && !unreadOnly ? 'bg-[#ed3541]' : 'bg-black/20'"
          aria-hidden="true"
        ></span>
      </div>
      <div class="mt-2.5 min-w-0">
        <div
          class="truncate text-[clamp(16px,4.1vw,22px)] font-black leading-[1.1] tracking-[-0.04em] tabular-nums sm:text-[clamp(20px,2.1vw,25px)]"
          :class="metrics.outstandingPaymentIdr > 0 ? 'text-[#ed3541]' : 'text-[#0b0b0b]'"
          :title="formatIdr(metrics.outstandingPaymentIdr)"
        >
          {{ formatIdr(metrics.outstandingPaymentIdr) }}
        </div>
        <div class="mt-1.5 truncate text-[11px] text-[#525252]">
          {{ metrics.actionPaymentCount }} perlu bayar / DP
        </div>
      </div>
    </button>

    <button
      type="button"
      class="flex min-h-[108px] min-w-0 cursor-pointer flex-col justify-between overflow-hidden border p-3.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541] sm:min-h-[120px] sm:p-4"
      :class="activeTab === 'BRIEF_AND_SCHEDULE' && !unreadOnly ? 'border-[#0b0b0b] bg-white' : 'border-black/15 bg-white hover:border-[#0b0b0b]'"
      :aria-pressed="activeTab === 'BRIEF_AND_SCHEDULE' && !unreadOnly"
      @click="emit('selectTab', 'BRIEF_AND_SCHEDULE')"
    >
      <div class="flex w-full items-start justify-between gap-2 text-[9px] font-bold leading-[1.35] tracking-[1.3px] text-[#525252] uppercase">
        <span>03 / BRIEF &amp; TERJADWAL</span>
        <span
          class="mt-[2px] h-[6px] w-[6px] shrink-0 rounded-full"
          :class="activeTab === 'BRIEF_AND_SCHEDULE' && !unreadOnly ? 'bg-[#ed3541]' : 'bg-black/20'"
          aria-hidden="true"
        ></span>
      </div>
      <div class="mt-2.5 min-w-0">
        <div class="text-[clamp(16px,4.1vw,22px)] font-black leading-[1.1] tracking-[-0.04em] text-[#0b0b0b] tabular-nums sm:text-[clamp(20px,2.1vw,25px)]">
          {{ metrics.activeProcessCount }}
        </div>
        <div class="mt-1.5 truncate text-[11px] text-[#525252]">
          {{ metrics.completedCount }} selesai tayang
        </div>
      </div>
    </button>

    <button
      type="button"
      class="flex min-h-[108px] min-w-0 cursor-pointer flex-col justify-between overflow-hidden border p-3.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541] sm:min-h-[120px] sm:p-4"
      :class="unreadOnly ? 'border-[#ed3541] bg-[#0b0b0b] text-white' : 'border-black/15 bg-white text-[#0b0b0b] hover:border-[#0b0b0b]'"
      :aria-pressed="unreadOnly"
      @click="emit('toggleUnread')"
    >
      <div
        class="flex w-full items-start justify-between gap-2 text-[9px] font-bold leading-[1.35] tracking-[1.3px] uppercase"
        :class="unreadOnly ? 'text-[#ccc]' : 'text-[#525252]'"
      >
        <span>04 / PESAN ADMIN BARU</span>
        <span
          class="mt-[2px] h-[6px] w-[6px] shrink-0 rounded-full"
          :class="unreadOnly ? 'bg-[#ed3541]' : 'bg-black/20'"
          aria-hidden="true"
        ></span>
      </div>
      <div class="mt-2.5 min-w-0">
        <div
          class="text-[clamp(16px,4.1vw,22px)] font-black leading-[1.1] tracking-[-0.04em] tabular-nums sm:text-[clamp(20px,2.1vw,25px)]"
          :class="unreadOnly ? 'text-white' : metrics.unreadAdminMessages > 0 ? 'text-[#ed3541]' : 'text-[#0b0b0b]'"
        >
          {{ metrics.unreadAdminMessages }}
        </div>
        <div class="mt-1.5 truncate text-[11px]" :class="unreadOnly ? 'text-[#ccc]' : 'text-[#525252]'">
          {{ unreadOnly ? 'Filter pesan baru aktif' : 'Saring pesan belum dibaca' }}
        </div>
      </div>
    </button>
  </div>
</template>
