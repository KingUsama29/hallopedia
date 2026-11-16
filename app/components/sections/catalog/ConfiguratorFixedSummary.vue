<script setup lang="ts">
import {
  DISTRIBUTION_MODE_LABELS,
  SERVICE_TYPE_LABELS,
  type CatalogPackage,
  type MediaAccount,
} from '~/data/catalog'

defineProps<{
  pkg: CatalogPackage
  includedAccounts: readonly MediaAccount[]
}>()

const emit = defineEmits<{
  switchToCustom: []
}>()
</script>

<template>
  <div class="space-y-6">
    <div class="border border-[#292929] bg-[#141414] p-5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="border border-[#ed3541] bg-[#ed3541]/15 px-2.5 py-0.5 text-[9px] font-bold tracking-[1.5px] text-[#ed3541] uppercase">
          PAKET HARGA TETAP
        </span>
        <span class="text-[10px] tracking-[1.2px] text-[#a3a3a3] uppercase">{{ pkg.regionalLabel }}</span>
      </div>

      <p class="mt-3 text-[12px] leading-[1.6] text-[#d4d4d4]">{{ pkg.tagline }}</p>

      <div class="mt-4 grid grid-cols-2 gap-3 border-y border-[#292929] py-3.5 text-[11px]">
        <div>
          <div class="text-[9px] tracking-[1.4px] text-[#a3a3a3] uppercase">LAYANAN</div>
          <div class="mt-1 font-semibold text-white">{{ SERVICE_TYPE_LABELS[pkg.serviceType] }}</div>
        </div>
        <div>
          <div class="text-[9px] tracking-[1.4px] text-[#a3a3a3] uppercase">MODE TAYANG</div>
          <div class="mt-1 font-semibold text-white">{{ DISTRIBUTION_MODE_LABELS[pkg.distributionMode] }}</div>
        </div>
      </div>

      <div class="mt-4">
        <div class="text-[10px] tracking-[1.5px] text-[#a3a3a3] uppercase">
          AKUN TERMASUK DALAM PAKET ({{ includedAccounts.length }})
        </div>
        <div v-if="includedAccounts.length" class="mt-2.5 flex flex-wrap gap-1.5">
          <div
            v-for="account in includedAccounts"
            :key="account.id"
            class="inline-flex items-center gap-1.5 border border-[#292929] bg-[#0b0b0b] px-2 py-1"
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
              class="flex h-4 w-4 items-center justify-center bg-[#292929] text-[8px] font-bold text-white"
              aria-hidden="true"
            >
              {{ account.monogram }}
            </span>
            <span class="text-[10px] font-medium text-[#e5e5e5]">{{ account.handle }}</span>
          </div>
        </div>
        <p v-else class="mt-2 text-[11px] text-[#ed3541]">
          Belum ada akun media aktif pada paket ini. Silakan beralih ke Konfigurator Custom.
        </p>
      </div>

      <ul class="mt-4 space-y-1.5 border-t border-[#292929] pt-3.5 text-[12px] text-[#ccc]">
        <li v-for="(item, idx) in pkg.deliverables" :key="idx" class="flex items-start gap-2">
          <span class="font-bold text-[#ed3541]" aria-hidden="true">+</span>
          <span>{{ item }}</span>
        </li>
      </ul>
    </div>

    <button
      type="button"
      class="inline-flex cursor-pointer items-center gap-2 border-b border-white/30 pb-1 text-[11px] font-medium text-[#d4d4d4] transition-colors hover:border-[#ed3541] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ed3541] max-[700px]:min-h-[44px]"
      @click="emit('switchToCustom')"
    >
      <span>Ingin memilih akun sendiri atau ubah layanan? Beralih ke Konfigurator Custom</span>
      <span aria-hidden="true">↗</span>
    </button>
  </div>
</template>

