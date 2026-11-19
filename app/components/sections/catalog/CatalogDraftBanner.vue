<script setup lang="ts">
import { useAssistantWidget } from '~/composables/useAssistantWidget'
import { buildDraftInquiryPrefill } from '~/data/assistant-widget'
import {
  DISTRIBUTION_MODE_LABELS,
  PAYMENT_SCHEME_LABELS,
  formatIdr,
  type ConfiguredOrderDraft,
} from '~/data/catalog'

const props = defineProps<{
  draft: ConfiguredOrderDraft
}>()

const emit = defineEmits<{
  edit: []
  clear: []
}>()

const { openWidget } = useAssistantWidget()

function handleContinueViaAdmin() {
  openWidget({
    tab: 'ADMIN_CHAT',
    prefillAdmin: buildDraftInquiryPrefill(props.draft),
  })
}
</script>

<template>
  <div
    role="status"
    aria-live="polite"
    class="mt-8 flex flex-col justify-between gap-5 border border-[#ed3541] bg-[#0b0b0b] p-5 text-white lg:flex-row lg:items-center"
  >
    <div class="min-w-0">
      <div class="flex items-center gap-2 text-[10px] tracking-[1.8px] text-[#ed3541] uppercase">
        <span class="h-[6px] w-[6px] rounded-full bg-[#ed3541]" aria-hidden="true"></span>
        DRAF PEMESANAN TERSIMPAN
      </div>
      <div class="mt-1 text-[15px] font-bold">
        {{ draft.sourceName }} — {{ draft.selectedAccountIds.length }} Akun
        ({{ DISTRIBUTION_MODE_LABELS[draft.distributionMode] }})
      </div>
      <div class="mt-1 text-[12px] text-[#ccc]">
        Total {{ draft.pricingStrategy === 'FIXED_PACKAGE' ? 'Resmi' : 'Estimasi' }}:
        <strong class="text-white">{{ formatIdr(draft.totalPriceIdr) }}</strong> ·
        Skema: <strong class="text-white">{{ PAYMENT_SCHEME_LABELS[draft.paymentScheme] }}</strong>
        <span v-if="draft.paymentScheme !== 'INVOICE'">
          ({{ formatIdr(draft.payNowIdr) }} dibayar di awal)
        </span>
      </div>
      <div class="mt-1 text-[11px] text-[#a3a3a3]">
        Tersimpan di sesi ini — lanjutkan ke checkout atau ubah konfigurasi kapan saja.
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2.5 shrink-0">
      <NuxtLink
        to="/checkout"
        class="inline-flex min-h-[44px] items-center gap-2 border border-[#ed3541] bg-[#ed3541] px-4 py-2 text-[10px] font-bold tracking-[1.4px] text-white uppercase no-underline transition-colors hover:bg-[#ff4754] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <span>LANJUT KE CHECKOUT</span>
        <span aria-hidden="true">→</span>
      </NuxtLink>
      <button
        type="button"
        class="inline-flex min-h-[44px] cursor-pointer items-center gap-2 border border-white/30 bg-[#141414] px-4 py-2 text-[10px] font-bold tracking-[1.4px] text-white uppercase transition-colors hover:border-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        @click="handleContinueViaAdmin"
      >
        <span>TANYA ADMIN</span>
      </button>
      <button
        type="button"
        class="min-h-[44px] cursor-pointer border border-white/30 bg-[#141414] px-4 py-2 text-[10px] font-bold tracking-[1.4px] text-white uppercase transition-colors hover:border-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        @click="emit('edit')"
      >
        UBAH KONFIGURASI
      </button>
      <button
        type="button"
        class="min-h-[44px] cursor-pointer border border-[#333] px-3 py-2 text-[10px] tracking-[1.4px] text-[#ccc] uppercase transition-colors hover:border-white hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        aria-label="Hapus draf pesanan tersimpan"
        @click="emit('clear')"
      >
        TUTUP ✕
      </button>
    </div>
  </div>
</template>

