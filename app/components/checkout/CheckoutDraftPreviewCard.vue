<script setup lang="ts">
import {
  DISTRIBUTION_MODE_LABELS,
  PAYMENT_SCHEME_LABELS,
  SERVICE_TYPE_LABELS,
  formatIdr,
  type ConfiguredOrderDraft,
} from '~/data/catalog'

defineProps<{
  draft: ConfiguredOrderDraft
}>()
</script>

<template>
  <aside
    class="border border-[#292929] bg-[#141414] p-6 text-white"
    aria-label="Ringkasan paket yang menunggu checkout"
  >
    <div class="flex items-center gap-2 text-[10px] font-bold tracking-[1.8px] text-[#ed3541] uppercase">
      <span class="h-[6px] w-[6px] rounded-full bg-[#ed3541]" aria-hidden="true"></span>
      PAKET MENUNGGU CHECKOUT
    </div>

    <h2 class="mt-3 mb-1 text-[20px] font-extrabold tracking-[-0.03em] text-white">
      {{ draft.sourceName }}
    </h2>
    <p class="m-0 text-[12px] text-[#ccc]">
      {{ SERVICE_TYPE_LABELS[draft.serviceType] }} · {{ DISTRIBUTION_MODE_LABELS[draft.distributionMode] }}
    </p>

    <div class="mt-5 grid grid-cols-2 gap-4 border-y border-[#292929] py-4 text-[12px]">
      <div>
        <div class="text-[9px] tracking-[1.4px] text-[#a3a3a3] uppercase">CAKUPAN MEDIA</div>
        <div class="mt-1 font-bold text-white tabular-nums">{{ draft.selectedAccountIds.length }} Akun Resmi</div>
      </div>
      <div>
        <div class="text-[9px] tracking-[1.4px] text-[#a3a3a3] uppercase">SKEMA TERPILIH</div>
        <div class="mt-1 font-bold text-white">{{ PAYMENT_SCHEME_LABELS[draft.paymentScheme] }}</div>
      </div>
    </div>

    <div class="mt-4 flex items-baseline justify-between">
      <span class="text-[10px] tracking-[1.4px] text-[#a3a3a3] uppercase">TOTAL TAGIHAN</span>
      <span class="text-[22px] font-black tracking-[-0.03em] text-white tabular-nums">
        {{ formatIdr(draft.totalPriceIdr) }}
      </span>
    </div>
    <div
      v-if="draft.paymentScheme === 'DP'"
      class="mt-2 flex items-baseline justify-between border-t border-[#292929] pt-2 text-[12px]"
    >
      <span class="text-[#ccc]">Bayar Awal (DP 50%)</span>
      <span class="font-bold text-[#ed3541] tabular-nums">{{ formatIdr(draft.payNowIdr) }}</span>
    </div>

    <p class="mt-3 mb-0 text-[11px] leading-[1.55] text-[#a3a3a3]">
      Setelah masuk atau mendaftar, pilihan paket Anda otomatis dibawa ke halaman checkout tanpa harus merakit ulang.
    </p>
  </aside>
</template>

