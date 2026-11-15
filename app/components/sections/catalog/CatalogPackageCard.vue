<script setup lang="ts">
import { computed } from 'vue'
import {
  DISTRIBUTION_MODE_LABELS,
  REGIONAL_SCOPE_LABELS,
  SERVICE_TYPE_LABELS,
  formatIdr,
  formatPaymentSchemes,
  getAccountsByIds,
  type CatalogPackage,
  type MediaAccount,
} from '~/data/catalog'

const props = defineProps<{
  pkg: CatalogPackage
  accounts: readonly MediaAccount[]
}>()

const emit = defineEmits<{
  select: [pkg: CatalogPackage]
}>()

const resolvedAccounts = computed(() =>
  getAccountsByIds(props.pkg.includedAccountIds, props.accounts),
)

const previewAccounts = computed(() => resolvedAccounts.value.slice(0, 6))

const remainingAccountsCount = computed(() =>
  Math.max(0, props.pkg.includedAccountIds.length - 6),
)

const regionalDisplayLabel = computed(
  () =>
    props.pkg.regionalLabel ||
    REGIONAL_SCOPE_LABELS[props.pkg.regionalScope] ||
    props.pkg.regionalScope,
)

const formattedPaymentSchemes = computed(() =>
  formatPaymentSchemes(props.pkg.paymentSchemes),
)
</script>

<template>
  <article
    data-catalog-card
    class="group relative flex flex-col justify-between border border-black/20 bg-white p-7
      transition-colors duration-300 hover:border-[#0b0b0b] max-[700px]:p-5"
  >
    <!-- Editorial Corner Marks (Active on hover / featured) -->
    <span
      class="pointer-events-none absolute top-0 left-0 h-[10px] w-[10px] border-t-2 border-l-2
        transition-colors duration-300"
      :class="pkg.featured ? 'border-[#ed3541]' : 'border-transparent group-hover:border-[#ed3541]'"
      aria-hidden="true"
    ></span>
    <span
      class="pointer-events-none absolute right-0 bottom-0 h-[10px] w-[10px] border-r-2 border-b-2
        transition-colors duration-300"
      :class="pkg.featured ? 'border-[#ed3541]' : 'border-transparent group-hover:border-[#ed3541]'"
      aria-hidden="true"
    ></span>

    <div>
      <!-- Top Strip: SKU + Service & Distribution Badges -->
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 pb-4">
        <span class="text-[10px] font-semibold tracking-[1.8px] text-[#525252] uppercase">
          {{ pkg.sku }}
        </span>
        <div class="flex flex-wrap items-center gap-1.5">
          <span
            class="px-2 py-0.5 text-[9px] font-semibold tracking-[1.2px] uppercase"
            :class="
              pkg.serviceType === 'VISIT_PRODUCTION'
                ? 'bg-[#ed3541] text-white'
                : 'bg-[#0b0b0b] text-white'
            "
          >
            {{ SERVICE_TYPE_LABELS[pkg.serviceType] }}
          </span>
          <span class="border border-black/20 px-2 py-0.5 text-[9px] tracking-[1px] text-[#444] uppercase">
            {{ DISTRIBUTION_MODE_LABELS[pkg.distributionMode] }}
          </span>
        </div>
      </div>

      <!-- Package Title & Tagline -->
      <div class="mt-5">
        <div class="text-[10px] tracking-[1.5px] text-[#ed3541] uppercase">
          {{ regionalDisplayLabel }}
        </div>
        <h3 class="mt-1.5 text-[clamp(22px,2vw,28px)] font-bold leading-[1.12] tracking-[-0.035em] text-[#0b0b0b]">
          {{ pkg.name }}
        </h3>
        <p class="mt-2.5 text-[13px] leading-[1.6] text-[#555]">
          {{ pkg.tagline }}
        </p>
      </div>

      <!-- Price Block -->
      <div class="mt-6 border-y border-black/10 py-4">
        <div class="flex items-center justify-between gap-2 text-[10px] tracking-[1.5px] text-[#525252] uppercase">
          <span>
            {{ pkg.pricingStrategy === 'FIXED_PACKAGE' ? 'HARGA PAKET TETAP' : 'ESTIMASI HARGA MULAI' }}
          </span>
          <span
            v-if="pkg.pricingStrategy === 'FIXED_PACKAGE'"
            class="border border-black/25 px-1.5 py-0.5 text-[8px] font-bold tracking-[1.2px] text-[#0b0b0b]"
          >
            HARGA TETAP
          </span>
        </div>
        <div class="mt-1 text-[clamp(28px,2.8vw,38px)] font-black tracking-[-0.04em] text-[#0b0b0b]">
          {{ formatIdr(pkg.priceIdr) }}
        </div>
        <div class="mt-1 text-[11px] text-[#525252]">
          {{ pkg.priceNote }}
        </div>
      </div>

      <!-- Included Media Accounts -->
      <div class="mt-5">
        <div class="flex items-center justify-between text-[10px] tracking-[1.5px] text-[#525252] uppercase">
          <span>AKUN JARINGAN ({{ pkg.includedAccountIds.length }})</span>
          <span v-if="pkg.distributionMode === 'COLLAB_POST'" class="text-[#ed3541]">
            MAX 5 COLLAB
          </span>
        </div>

        <div class="mt-3 flex flex-wrap gap-1.5">
          <div
            v-for="account in previewAccounts"
            :key="account.id"
            class="inline-flex items-center gap-1.5 border border-black/15 bg-[#f6f5f2] px-2 py-1"
            :title="`${account.name} (${account.handle})`"
          >
            <img
              v-if="account.logoPath"
              :src="account.logoPath"
              :alt="`Logo ${account.name}`"
              class="h-4 w-4 object-cover"
              loading="lazy"
              decoding="async"
            />
            <span
              v-else
              class="flex h-4 w-4 items-center justify-center bg-[#0b0b0b] text-[8px] font-bold tracking-tight text-white"
              aria-hidden="true"
            >
              {{ account.monogram }}
            </span>
            <span class="text-[10px] font-medium text-[#0b0b0b]">
              {{ account.handle }}
            </span>
          </div>
          <div
            v-if="remainingAccountsCount > 0"
            class="inline-flex items-center border border-black/15 bg-[#0b0b0b] px-2 py-1 text-[10px] font-semibold text-white"
          >
            +{{ remainingAccountsCount }} AKUN LAINNYA
          </div>
        </div>
      </div>

      <!-- Deliverables Checklist -->
      <ul class="mt-5 space-y-2 border-t border-black/10 pt-4 text-[12px] leading-[1.5] text-[#333]">
        <li
          v-for="(item, idx) in pkg.deliverables"
          :key="idx"
          class="flex items-start gap-2.5"
        >
          <span class="mt-[1px] font-bold text-[#ed3541]" aria-hidden="true">+</span>
          <span>{{ item }}</span>
        </li>
      </ul>
    </div>

    <!-- Footer: Payment Schemes & CTA -->
    <div class="mt-7 border-t border-black/15 pt-4">
      <div class="flex items-center justify-between text-[9px] tracking-[1.5px] text-[#525252] uppercase">
        <span>SKEMA BAYAR</span>
        <span class="font-semibold text-[#0b0b0b]">
          {{ formattedPaymentSchemes }}
        </span>
      </div>

      <button
        type="button"
        class="mt-4 flex w-full cursor-pointer items-center justify-between border border-[#0b0b0b]
          bg-transparent px-4 py-3 text-[11px] font-bold tracking-[1.4px] text-[#0b0b0b] uppercase
          transition-colors duration-300 group-hover:bg-[#0b0b0b] group-hover:text-white
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
          focus-visible:outline-[#ed3541] max-[700px]:min-h-[44px]"
        @click="emit('select', pkg)"
      >
        <span>
          {{
            pkg.pricingStrategy === 'FIXED_PACKAGE'
              ? 'PILIH PAKET INI'
              : 'PILIH & SESUAIKAN AKUN'
          }}
        </span>
        <span
          class="transition-transform duration-300 group-hover:translate-x-1"
          :class="pkg.pricingStrategy === 'CUSTOM_PER_ACCOUNT' ? 'group-hover:-translate-y-0.5' : ''"
          aria-hidden="true"
        >
          {{ pkg.pricingStrategy === 'FIXED_PACKAGE' ? '→' : '↗' }}
        </span>
      </button>
    </div>
  </article>
</template>

