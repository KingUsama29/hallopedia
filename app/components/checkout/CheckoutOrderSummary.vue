<script setup lang="ts">
import {
  DISTRIBUTION_MODE_LABELS,
  PAYMENT_SCHEME_LABELS,
  SERVICE_TYPE_LABELS,
  formatIdr,
  type ConfiguredOrderDraft,
  type MediaAccount,
  type PaymentScheme,
} from '~/data/catalog'

defineProps<{
  draft: ConfiguredOrderDraft
  resolvedAccounts: readonly MediaAccount[]
  totalIdr: number
  visitBaseFeeIdr: number
  accountsSubtotalIdr: number
  payNowIdr: number
  remainingIdr: number
  selectedScheme: PaymentScheme
}>()
</script>

<template>
  <aside
    class="border border-[#292929] bg-[#0b0b0b] p-6 text-white lg:sticky lg:top-8"
    aria-label="Ringkasan pesanan dan rincian tagihan"
  >
    <div class="flex items-center justify-between gap-2 border-b border-[#292929] pb-4 text-[10px] tracking-[1.8px] text-[#a3a3a3] uppercase">
      <span class="flex items-center gap-2 font-bold text-[#ed3541]">
        <span class="h-[6px] w-[6px] rounded-full bg-[#ed3541]" aria-hidden="true"></span>
        RINGKASAN PESANAN
      </span>
      <span v-if="draft.sourcePackageSku">{{ draft.sourcePackageSku }}</span>
    </div>

    <h2 class="mt-4 mb-1 text-[22px] font-extrabold leading-[1.15] tracking-[-0.03em] text-white">
      {{ draft.sourceName }}
    </h2>
    <p class="m-0 text-[12px] text-[#ccc]">
      {{ SERVICE_TYPE_LABELS[draft.serviceType] }} · {{ DISTRIBUTION_MODE_LABELS[draft.distributionMode] }}
    </p>

    <div class="mt-5 border-t border-[#292929] pt-4">
      <div class="flex items-center justify-between text-[10px] tracking-[1.4px] text-[#a3a3a3] uppercase">
        <span>AKUN TERPILIH ({{ resolvedAccounts.length }})</span>
        <NuxtLink
          to="/?editDraft=1#katalog"
          class="text-[#ed3541] no-underline hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541]"
        >
          UBAH DI KATALOG
        </NuxtLink>
      </div>

      <div class="mt-3 flex flex-wrap gap-1.5">
        <div
          v-for="account in resolvedAccounts"
          :key="account.id"
          class="inline-flex items-center gap-1.5 border border-[#292929] bg-[#141414] px-2 py-1"
        >
          <img
            v-if="account.logoPath"
            :src="account.logoPath"
            :alt="`Logo ${account.name}`"
            class="h-4 w-4 object-cover"
            loading="lazy"
          />
          <span
            v-else
            class="flex h-4 w-4 items-center justify-center bg-[#292929] text-[8px] font-bold text-white"
            aria-hidden="true"
          >
            {{ account.monogram }}
          </span>
          <span class="text-[10px] font-medium text-[#e5e5e5]">{{ account.handle }}</span>
        </div>
      </div>
    </div>

    <dl class="mt-6 space-y-2.5 border-t border-[#292929] pt-4 text-[12px]">
      <template v-if="visitBaseFeeIdr > 0">
        <div class="flex items-baseline justify-between gap-2">
          <dt class="text-[#a3a3a3]">Subtotal {{ resolvedAccounts.length }} Akun Media</dt>
          <dd class="m-0 font-semibold text-white tabular-nums">{{ formatIdr(accountsSubtotalIdr) }}</dd>
        </div>
        <div class="flex items-baseline justify-between gap-2">
          <dt class="text-[#a3a3a3]">Biaya Kru Liputan &amp; Editing Visit</dt>
          <dd class="m-0 font-semibold text-white tabular-nums">{{ formatIdr(visitBaseFeeIdr) }}</dd>
        </div>
      </template>
      <div class="flex items-baseline justify-between gap-2">
        <dt class="text-[#a3a3a3]">
          Total Harga ({{ draft.pricingStrategy === 'FIXED_PACKAGE' ? `Bundel Tetap ${resolvedAccounts.length} Akun` : visitBaseFeeIdr > 0 ? 'Akun + Visit' : 'Per-Akun' }})
        </dt>
        <dd class="m-0 font-bold text-white tabular-nums">{{ formatIdr(totalIdr) }}</dd>
      </div>
      <div class="flex items-baseline justify-between gap-2">
        <dt class="text-[#a3a3a3]">Skema Pembayaran</dt>
        <dd class="m-0 font-semibold text-white">{{ PAYMENT_SCHEME_LABELS[selectedScheme] }}</dd>
      </div>
      <div class="flex items-baseline justify-between gap-2 border-t border-[#292929] pt-3 text-[13px]">
        <dt class="font-bold text-white">
          {{ selectedScheme === 'INVOICE' ? 'Tagihan Invoice Resmi' : selectedScheme === 'DP' ? 'Bayar Awal (DP 50%)' : 'Bayar Penuh Sekarang' }}
        </dt>
        <dd class="m-0 text-[22px] font-black tracking-[-0.03em] text-[#ed3541] tabular-nums">
          {{ selectedScheme === 'INVOICE' ? formatIdr(totalIdr) : formatIdr(payNowIdr) }}
        </dd>
      </div>
      <div v-if="selectedScheme === 'DP'" class="flex items-baseline justify-between gap-2 text-[11px] text-[#ccc]">
        <dt>Sisa Pelunasan Sebelum Tayang</dt>
        <dd class="m-0 font-semibold text-white tabular-nums">{{ formatIdr(remainingIdr) }}</dd>
      </div>
    </dl>
  </aside>
</template>

