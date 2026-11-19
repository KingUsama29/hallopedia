<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue'
import { useModalAccessibility } from '~/composables/useModalAccessibility'
import { handleRadioGroupKeydown } from '~/composables/useRadioGroupNavigation'
import { formatIdr } from '~/data/catalog'
import {
  PAYMENT_CHANNEL_OPTIONS,
  type OrderRecord,
  type PaymentChannel,
} from '~/data/orders'

const props = defineProps<{
  isOpen: boolean
  order: OrderRecord | null
}>()

const emit = defineEmits<{
  close: []
  complete: [payload: { orderId: string; channel: Exclude<PaymentChannel, 'INVOICE'>; outcome: 'SUCCESS' | 'PENDING' }]
}>()

const panelRef = ref<HTMLElement | null>(null)
const closeButtonRef = ref<HTMLButtonElement | null>(null)
const selectedChannel = ref<Exclude<PaymentChannel, 'INVOICE'>>('QRIS')
const channelValues = PAYMENT_CHANNEL_OPTIONS.map((ch) => ch.value)

watch(
  [() => props.isOpen, () => props.order?.id],
  () => {
    const pay = props.order?.paymentSummary
    if (pay && pay.scheme !== 'INVOICE' && pay.lastChannel && pay.lastChannel !== 'INVOICE') {
      selectedChannel.value = pay.lastChannel
      return
    }
    selectedChannel.value = 'QRIS'
  },
  { immediate: true },
)

const { suppressNextFocusRestore } = useModalAccessibility({
  isOpen: toRef(props, 'isOpen'),
  panelRef,
  initialFocusRef: closeButtonRef,
  onClose: () => emit('close'),
})

const amountDueIdr = computed(() => {
  if (!props.order) return 0
  const pay = props.order.paymentSummary
  if (pay.scheme === 'FULL') return pay.remainingIdr
  if (pay.scheme === 'DP') {
    return pay.paidIdr === 0 ? pay.dpAmountIdr : pay.remainingIdr
  }
  return pay.remainingIdr
})

const paymentStageLabel = computed(() => {
  if (!props.order) return ''
  const pay = props.order.paymentSummary
  if (pay.scheme === 'FULL') return 'Pembayaran Penuh (100%)'
  if (pay.scheme === 'DP') {
    return pay.paidIdr === 0 ? 'Pembayaran Awal Uang Muka (DP 50%)' : 'Pelunasan Sisa Tagihan DP'
  }
  return 'Tagihan Invoice'
})

function triggerOutcome(outcome: 'SUCCESS' | 'PENDING') {
  if (!props.order) return
  suppressNextFocusRestore()
  emit('complete', {
    orderId: props.order.id,
    channel: selectedChannel.value,
    outcome,
  })
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200 ease-out motion-reduce:transition-none"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200 ease-in motion-reduce:transition-none"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen && order"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-[2px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-preview-title"
        @click.self="emit('close')"
      >
        <div
          ref="panelRef"
          data-lenis-prevent
          class="editorial-scrollbar max-h-[90dvh] w-full max-w-[520px] overflow-y-auto border border-white/25 bg-[#0b0b0b] p-6 text-white shadow-[0_24px_64px_rgba(0,0,0,0.65)] sm:p-7"
        >
          <div class="flex items-start justify-between gap-4 border-b border-[#292929] pb-4">
            <div>
              <div class="flex items-center gap-2 text-[10px] font-bold tracking-[1.6px] text-[#ed3541] uppercase">
                <span class="h-[6px] w-[6px] rounded-full bg-[#ed3541]" aria-hidden="true"></span>
                PRATINJAU PEMBAYARAN MIDTRANS
              </div>
              <h2 id="payment-preview-title" class="mt-2 mb-0 text-[20px] font-extrabold tracking-[-0.03em] text-white">
                {{ order.orderCode }}
              </h2>
            </div>
            <button
              ref="closeButtonRef"
              type="button"
              class="min-h-[40px] cursor-pointer border border-[#292929] px-3 py-1.5 text-[10px] font-bold tracking-[1.4px] text-[#ccc] uppercase transition-colors hover:border-white hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541]"
              aria-label="Tutup panel pratinjau pembayaran"
              @click="emit('close')"
            >
              TUTUP ✕
            </button>
          </div>

          <div class="mt-5 border border-[#292929] bg-[#141414] p-4">
            <div class="text-[10px] tracking-[1.4px] text-[#a3a3a3] uppercase">{{ paymentStageLabel }}</div>
            <div class="mt-1 text-[28px] font-black tracking-[-0.04em] text-white tabular-nums">
              {{ formatIdr(amountDueIdr) }}
            </div>
            <div class="mt-1 text-[11px] text-[#ccc]">
              {{ order.sourceName }} · {{ order.brandName }}
            </div>
          </div>

          <div class="mt-5">
            <div class="mb-2.5 text-[10px] font-bold tracking-[1.6px] text-[#a3a3a3] uppercase">
              PILIH KANAL PEMBAYARAN
            </div>
            <div
              class="space-y-2"
              role="radiogroup"
              aria-label="Pilih kanal pembayaran"
              @keydown="handleRadioGroupKeydown($event, channelValues, selectedChannel, (v) => (selectedChannel = v))"
            >
              <button
                v-for="ch in PAYMENT_CHANNEL_OPTIONS"
                :key="ch.value"
                type="button"
                role="radio"
                :tabindex="selectedChannel === ch.value ? 0 : -1"
                :aria-checked="selectedChannel === ch.value"
                class="flex w-full cursor-pointer items-center justify-between gap-3 border px-3.5 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541]"
                :class="selectedChannel === ch.value ? 'border-[#ed3541] bg-[#171717] text-white' : 'border-[#292929] bg-transparent text-[#ccc] hover:border-white/40'"
                @click="selectedChannel = ch.value"
              >
                <div>
                  <div class="text-[12px] font-bold text-white">{{ ch.label }}</div>
                  <div class="mt-0.5 text-[11px] text-[#a3a3a3]">{{ ch.hint }}</div>
                </div>
                <span
                  class="flex h-4 w-4 shrink-0 items-center justify-center border"
                  :class="selectedChannel === ch.value ? 'border-[#ed3541] bg-[#ed3541]' : 'border-[#525252]'"
                  aria-hidden="true"
                >
                  <span v-if="selectedChannel === ch.value" class="h-1.5 w-1.5 bg-white"></span>
                </span>
              </button>
            </div>
          </div>

          <p class="mt-4 mb-0 border-l-2 border-[#ed3541] bg-[#141414] px-3 py-2 text-[11px] leading-[1.55] text-[#ccc]">
            Panel ini mempratinjau alur pembayaran Midtrans sebelum integrasi pembayaran langsung aktif. Pilih konfirmasi pembayaran berhasil atau simpan status menunggu pembayaran.
          </p>

          <div class="mt-5 flex flex-col gap-2.5">
            <button
              type="button"
              class="flex min-h-[46px] w-full cursor-pointer items-center justify-between bg-[#ed3541] px-5 py-3 text-[11px] font-bold tracking-[1.4px] text-white uppercase transition-colors hover:bg-[#ff4754] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              @click="triggerOutcome('SUCCESS')"
            >
              <span>KONFIRMASI PEMBAYARAN BERHASIL</span>
              <span aria-hidden="true">→</span>
            </button>
            <button
              type="button"
              class="min-h-[44px] w-full cursor-pointer border border-[#292929] bg-transparent px-4 py-2.5 text-[10px] font-bold tracking-[1.4px] text-[#ccc] uppercase transition-colors hover:border-white hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541]"
              @click="triggerOutcome('PENDING')"
            >
              SIMPAN &amp; BAYAR NANTI (STATUS MENUNGGU)
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

