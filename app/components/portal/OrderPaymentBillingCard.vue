<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useOrderPortal } from '~/composables/useOrderPortal'
import { PAYMENT_SCHEME_LABELS, formatIdr } from '~/data/catalog'
import {
  buildOrderPaymentMilestones,
  canCancelOrder,
  type InvoicePreviewAction,
} from '~/data/order-dashboard'
import { formatPaymentChannelLabel, type OrderRecord } from '~/data/orders'

const props = defineProps<{
  order: OrderRecord
}>()

const emit = defineEmits<{
  openPayment: []
}>()

const { cancelCustomerOrder, triggerPreviewInvoiceUpdate } = useOrderPortal()

const isCancelConfirmOpen = ref(false)
const cancelReason = ref('')
const actionError = ref('')
const actionSuccess = ref('')

const milestones = computed(() => buildOrderPaymentMilestones(props.order))
const canCancel = computed(() => canCancelOrder(props.order))
const canPayMidtrans = computed(
  () =>
    props.order.status !== 'CANCELLED' &&
    props.order.paymentSummary.scheme !== 'INVOICE' &&
    props.order.paymentSummary.remainingIdr > 0,
)
const isFullySettledDp = computed(
  () => props.order.paymentSummary.scheme === 'DP' && props.order.paymentSummary.remainingIdr === 0,
)

watch(
  () => props.order.id,
  () => {
    isCancelConfirmOpen.value = false
    cancelReason.value = ''
    actionError.value = ''
    actionSuccess.value = ''
  },
)

function handlePrintReceipt() {
  if (!import.meta.client) return
  window.print()
}

function handleInvoiceAction(action: InvoicePreviewAction) {
  actionError.value = ''
  actionSuccess.value = ''
  const res = triggerPreviewInvoiceUpdate(props.order.id, action)
  if (!res.ok) {
    actionError.value = res.error
    return
  }
  actionSuccess.value =
    action === 'APPROVE'
      ? 'Status Invoice diperbarui menjadi Disetujui Admin.'
      : 'Tagihan Invoice tercatat Lunas 100%.'
}

function handleConfirmCancel() {
  actionError.value = ''
  actionSuccess.value = ''
  const res = cancelCustomerOrder(props.order.id, cancelReason.value)
  if (!res.ok) {
    actionError.value = res.error
    return
  }
  isCancelConfirmOpen.value = false
  cancelReason.value = ''
  actionSuccess.value = 'Pesanan dibatalkan sebelum pembayaran diproses.'
}
</script>

<template>
  <section class="border border-black/15 bg-white p-6" aria-labelledby="billing-card-title">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 pb-3">
      <div>
        <div class="text-[9px] font-bold tracking-[1.6px] text-[#525252] uppercase">
          SKEMA {{ PAYMENT_SCHEME_LABELS[order.paymentSummary.scheme] }}
        </div>
        <h2 id="billing-card-title" class="mt-1 mb-0 text-[14px] font-extrabold tracking-[-0.02em] text-[#0b0b0b] uppercase">
          RINCIAN PEMBAYARAN, TERMIN &amp; BUKTI TAGIHAN
        </h2>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <span
          v-if="isFullySettledDp"
          class="bg-[#0b0b0b] px-2.5 py-1 text-[9px] font-bold tracking-[1.2px] text-white uppercase"
        >
          DP + PELUNASAN 100%
        </span>
        <button
          type="button"
          class="no-print min-h-[40px] cursor-pointer border border-black/20 bg-[#f6f5f2] px-3.5 py-2 text-[10px] font-bold tracking-[1.2px] text-[#0b0b0b] uppercase transition-colors hover:border-[#0b0b0b] hover:bg-[#0b0b0b] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541] max-lg:min-h-[44px]"
          @click="handlePrintReceipt"
        >
          CETAK BUKTI PESANAN
        </button>
      </div>
    </div>

    <div class="mt-4 grid grid-cols-1 gap-3 border border-black/10 bg-[#f6f5f2] p-4 sm:grid-cols-3 sm:divide-x sm:divide-black/10">
      <div class="min-w-0">
        <div class="text-[9px] font-bold tracking-[1.4px] text-[#525252] uppercase">TOTAL NILAI PAKET</div>
        <div class="mt-1 truncate text-[clamp(15px,2vw,17px)] font-black text-[#0b0b0b] tabular-nums">
          {{ formatIdr(order.paymentSummary.totalIdr) }}
        </div>
      </div>
      <div class="min-w-0 sm:pl-3">
        <div class="text-[9px] font-bold tracking-[1.4px] text-[#525252] uppercase">SUDAH TERBAYAR</div>
        <div class="mt-1 truncate text-[clamp(15px,2vw,17px)] font-black text-[#0b0b0b] tabular-nums">
          {{ formatIdr(order.paymentSummary.paidIdr) }}
        </div>
      </div>
      <div class="min-w-0 sm:pl-3">
        <div class="text-[9px] font-bold tracking-[1.4px] text-[#525252] uppercase">SISA TAGIHAN</div>
        <div
          class="mt-1 truncate text-[clamp(15px,2vw,17px)] font-black tabular-nums"
          :class="order.paymentSummary.remainingIdr > 0 && order.status !== 'CANCELLED' ? 'text-[#ed3541]' : 'text-[#0b0b0b]'"
        >
          {{ formatIdr(order.status === 'CANCELLED' ? 0 : order.paymentSummary.remainingIdr) }}
        </div>
      </div>
    </div>

    <p
      v-if="order.paymentSummary.scheme !== 'INVOICE' && order.paymentSummary.lastChannel"
      class="mt-3 mb-0 text-[11px] text-[#525252]"
    >
      Kanal transaksi terakhir: <strong class="text-[#0b0b0b]">{{ formatPaymentChannelLabel(order.paymentSummary.lastChannel) }}</strong>
    </p>

    <!-- Daftar Tahap / Milestone Pembayaran -->
    <div class="mt-4 space-y-2.5">
      <div
        v-for="item in milestones"
        :key="item.id"
        class="flex flex-col items-start justify-between gap-2.5 border px-4 py-3 text-[12px] sm:flex-row sm:items-center sm:gap-3"
        :class="
          item.state === 'ACTIVE'
            ? 'border-l-4 border-[#ed3541] border-t-black/15 border-r-black/15 border-b-black/15 bg-white'
            : item.state === 'DONE'
              ? 'border-l-4 border-[#0b0b0b] border-t-black/10 border-r-black/10 border-b-black/10 bg-[#f6f5f2]'
              : 'border-black/10 bg-white opacity-80'
        "
      >
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-black tracking-[1.2px] text-[#ed3541] tabular-nums">{{ item.stepNumber }}</span>
            <span class="font-bold text-[#0b0b0b]">{{ item.title }}</span>
          </div>
          <div class="mt-0.5 text-[11px] text-[#525252]">{{ item.detailLabel }}</div>
        </div>

        <div class="flex flex-wrap items-center gap-2 sm:block sm:shrink-0 sm:text-right">
          <div class="font-extrabold text-[#0b0b0b] tabular-nums">{{ item.amountLabel }}</div>
          <span
            class="inline-block px-2 py-0.5 text-[9px] font-bold tracking-[1.1px] uppercase sm:mt-1"
            :class="
              item.state === 'DONE'
                ? 'bg-[#0b0b0b] text-white'
                : item.state === 'ACTIVE'
                  ? 'bg-[#ed3541] text-white'
                  : 'border border-black/15 bg-[#f6f5f2] text-[#525252]'
            "
          >
            {{ item.state === 'DONE' ? 'SELESAI' : item.state === 'ACTIVE' ? 'AKTIF' : item.state === 'CANCELLED' ? 'BATAL' : 'MENUNGGU' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Aksi Pelunasan DP / Midtrans -->
    <div v-if="canPayMidtrans" class="no-print mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-4">
      <div class="text-[11px] text-[#525252]">
        <template v-if="order.paymentSummary.paidIdr > 0">
          Pelunasan sisa DP disarankan sebelum jadwal tayang dikonfirmasi final.
        </template>
        <template v-else>
          Selesaikan pembayaran agar formulir brief &amp; penjadwalan segera terbuka.
        </template>
      </div>
      <button
        type="button"
        class="min-h-[44px] cursor-pointer bg-[#ed3541] px-5 py-2.5 text-[11px] font-bold tracking-[1.4px] text-white uppercase transition-colors hover:bg-[#ff4754] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b0b0b]"
        @click="emit('openPayment')"
      >
        {{ order.paymentSummary.paidIdr > 0 ? `LUNASI SISA DP (${formatIdr(order.paymentSummary.remainingIdr)}) →` : 'BAYAR SEKARANG →' }}
      </button>
    </div>

    <!-- Kontrol Pratinjau Verifikasi Admin untuk Skema Invoice (Terlipat Default) -->
    <details
      v-if="order.paymentSummary.scheme === 'INVOICE' && order.status !== 'CANCELLED' && order.paymentSummary.approvalStatus !== 'SETTLED'"
      class="no-print mt-4 border border-black/15 bg-[#f6f5f2] px-4 py-3 text-[11px]"
    >
      <summary class="cursor-pointer font-bold tracking-[1.2px] text-[#525252] uppercase hover:text-[#0b0b0b]">
        PRATINJAU VERIFIKASI ADMIN INVOICE (UJI ALUR)
      </summary>
      <div class="mt-3 flex flex-wrap gap-2.5 border-t border-black/10 pt-3">
        <button
          v-if="order.paymentSummary.approvalStatus === 'PENDING_REVIEW'"
          type="button"
          class="min-h-[44px] cursor-pointer border border-[#0b0b0b] bg-[#0b0b0b] px-4 py-2 text-[10px] font-bold tracking-[1.3px] text-white uppercase transition-colors hover:border-[#ed3541] hover:bg-[#ed3541] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541]"
          @click="handleInvoiceAction('APPROVE')"
        >
          SETUJUI INVOICE
        </button>
        <button
          type="button"
          class="min-h-[44px] cursor-pointer border border-[#ed3541] bg-white px-4 py-2 text-[10px] font-bold tracking-[1.3px] text-[#ed3541] uppercase transition-colors hover:bg-[#ed3541] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541]"
          @click="handleInvoiceAction('SETTLE')"
        >
          TANDAI INVOICE LUNAS
        </button>
      </div>
    </details>

    <!-- Pembatalan Aman Khusus Order Pending Belum Dibayar -->
    <div v-if="canCancel" class="no-print mt-4 border-t border-black/10 pt-4">
      <div v-if="!isCancelConfirmOpen" class="flex flex-wrap items-center justify-between gap-3">
        <span class="text-[11px] text-[#525252]">
          Berubah rencana? Pesanan yang belum dibayar dapat dibatalkan kapan saja.
        </span>
        <button
          type="button"
          class="min-h-[44px] cursor-pointer border border-black/20 bg-white px-4 py-2 text-[10px] font-bold tracking-[1.3px] text-[#525252] uppercase transition-colors hover:border-[#ed3541] hover:text-[#ed3541] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541]"
          @click="isCancelConfirmOpen = true"
        >
          BATALKAN PESANAN
        </button>
      </div>

      <div v-else class="border border-[#ed3541]/40 bg-[#f6f5f2] p-4">
        <label for="cancel-reason-input" class="block text-[10px] font-bold tracking-[1.3px] text-[#0b0b0b] uppercase">
          KONFIRMASI PEMBATALAN PESANAN {{ order.orderCode }}
        </label>
        <input
          id="cancel-reason-input"
          v-model="cancelReason"
          name="cancelReason"
          type="text"
          maxlength="240"
          placeholder="Alasan pembatalan (opsional, misal ganti paket lain)"
          class="mt-2 min-h-[44px] w-full border border-black/20 bg-white px-3 text-[12px] text-[#0b0b0b] focus:border-[#ed3541] focus:outline-none max-[700px]:text-[16px]"
        />
        <div class="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            class="min-h-[44px] cursor-pointer bg-[#ed3541] px-4 py-2 text-[10px] font-bold tracking-[1.3px] text-white uppercase transition-colors hover:bg-[#ff4754] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b0b0b]"
            @click="handleConfirmCancel"
          >
            KONFIRMASI BATALKAN
          </button>
          <button
            type="button"
            class="min-h-[44px] cursor-pointer border border-black/20 bg-white px-4 py-2 text-[10px] font-bold tracking-[1.3px] text-[#0b0b0b] uppercase transition-colors hover:border-[#0b0b0b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541]"
            @click="isCancelConfirmOpen = false"
          >
            KEMBALI
          </button>
        </div>
      </div>
    </div>

    <p v-if="actionError" role="alert" class="mt-3 mb-0 border-l-2 border-[#ed3541] bg-[#0b0b0b] px-3 py-2 text-[12px] font-semibold text-white">
      {{ actionError }}
    </p>
    <p v-if="actionSuccess" role="status" class="mt-3 mb-0 border-l-2 border-[#0b0b0b] bg-[#f6f5f2] px-3 py-2 text-[12px] font-semibold text-[#0b0b0b]">
      {{ actionSuccess }}
    </p>
  </section>
</template>
