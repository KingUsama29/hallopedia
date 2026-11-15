<script setup lang="ts">
import { ref, toRef } from 'vue'
import { useModalAccessibility } from '~/composables/useModalAccessibility'
import { SERVICE_OPTIONS, usePackageConfigurator } from '~/composables/usePackageConfigurator'
import {
  COLLAB_MAX_ACCOUNTS,
  COLLAB_MIN_ACCOUNTS,
  DISTRIBUTION_MODE_LABELS,
  PAYMENT_SCHEME_LABELS,
  SERVICE_TYPE_LABELS,
  formatIdr,
  type CatalogPackage,
  type ConfiguredOrderDraft,
  type MediaAccount,
  type RegionGroup,
} from '~/data/catalog'

const props = defineProps<{
  isOpen: boolean
  accounts: readonly MediaAccount[]
  regionGroups: readonly RegionGroup[]
  sourcePackage: CatalogPackage | null
  initialDraft?: ConfiguredOrderDraft | null
}>()

const emit = defineEmits<{
  close: []
  proceed: [draft: ConfiguredOrderDraft]
}>()

const drawerPanelRef = ref<HTMLElement | null>(null)
const closeButtonRef = ref<HTMLButtonElement | null>(null)

const {
  sourceName, serviceType, distributionMode, selectedAccountIds, paymentScheme, notice,
  activeAccounts, isFixedMode, lockedSourcePackage, allowedPaymentSchemes, paymentGridColsClass,
  distributionOptions, dynamicRegionalPresets, collabHostAccountId, activeVisitBaseFee,
  estimatedPrice, payNowAmount, isCollabAtLimit, fixedIncludedAccounts, canProceed,
  hydrateFromSource, switchToCustomBuilder, setServiceType, setDistributionMode,
  toggleAccountSelection, applyRegionalPreset, formatAccountRateHint, buildProceedDraft,
} = usePackageConfigurator({
  accounts: toRef(props, 'accounts'),
  regionGroups: toRef(props, 'regionGroups'),
  sourcePackage: toRef(props, 'sourcePackage'),
  initialDraft: toRef(props, 'initialDraft'),
})

useModalAccessibility({
  isOpen: toRef(props, 'isOpen'),
  panelRef: drawerPanelRef,
  initialFocusRef: closeButtonRef,
  onClose: () => emit('close'),
  onBeforeOpen: () => hydrateFromSource(props.sourcePackage, props.initialDraft),
})

function handleProceed() {
  const draft = buildProceedDraft()
  if (draft) emit('proceed', draft)
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
        v-if="isOpen"
        class="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-[2px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="configurator-title"
        @click.self="emit('close')"
      >
        <div
          ref="drawerPanelRef"
          data-lenis-prevent
          class="editorial-scrollbar flex h-full w-full max-w-[580px] flex-col justify-between overflow-y-auto overscroll-contain border-l border-[#292929] bg-[#0b0b0b] p-7 text-white max-[700px]:p-5"
        >
          <div>
            <!-- Drawer Header -->
            <div class="flex items-start justify-between gap-4 border-b border-[#292929] pb-5">
              <div>
                <div class="flex items-center gap-2 text-[10px] tracking-[2px] text-[#a3a3a3] uppercase">
                  <span class="h-[6px] w-[6px] rounded-full bg-[#ed3541]" aria-hidden="true"></span>
                  <span>{{ isFixedMode ? `PAKET HARGA TETAP · ${lockedSourcePackage?.sku ?? ''}` : 'KONFIGURATOR ESTIMASI IKLAN' }}</span>
                </div>
                <h3 id="configurator-title" class="mt-2 text-[22px] font-bold tracking-[-0.03em]">
                  {{ lockedSourcePackage?.name ?? sourceName }}
                </h3>
              </div>
              <button
                ref="closeButtonRef"
                type="button"
                class="cursor-pointer border border-[#292929] px-3 py-1.5 text-[10px] tracking-[1.5px] text-[#ccc] uppercase transition-colors hover:border-[#ed3541] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541] max-[700px]:inline-flex max-[700px]:min-h-[44px] max-[700px]:items-center"
                aria-label="Tutup konfigurator"
                @click="emit('close')"
              >
                TUTUP ✕
              </button>
            </div>

            <!-- Validation Notice (A11y Live Region) -->
            <p
              v-if="notice"
              role="alert"
              aria-live="polite"
              class="mt-4 border-l-2 border-[#ed3541] bg-[#171717] px-3 py-2 text-[11px] leading-[1.5] text-[#f5f5f5]"
            >
              {{ notice }}
            </p>

            <!-- MODE A: FIXED PACKAGE READ-ONLY LOCKED SUMMARY -->
            <div v-if="lockedSourcePackage" class="mt-6 space-y-6">
              <div class="border border-[#292929] bg-[#141414] p-5">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <span class="border border-[#ed3541] bg-[#ed3541]/15 px-2.5 py-0.5 text-[9px] font-bold tracking-[1.5px] text-[#ed3541] uppercase">
                    PAKET HARGA TETAP
                  </span>
                  <span class="text-[10px] tracking-[1.2px] text-[#a3a3a3] uppercase">{{ lockedSourcePackage.regionalLabel }}</span>
                </div>

                <p class="mt-3 text-[12px] leading-[1.6] text-[#d4d4d4]">{{ lockedSourcePackage.tagline }}</p>

                <div class="mt-4 grid grid-cols-2 gap-3 border-y border-[#292929] py-3.5 text-[11px]">
                  <div>
                    <div class="text-[9px] tracking-[1.4px] text-[#a3a3a3] uppercase">LAYANAN</div>
                    <div class="mt-1 font-semibold text-white">{{ SERVICE_TYPE_LABELS[lockedSourcePackage.serviceType] }}</div>
                  </div>
                  <div>
                    <div class="text-[9px] tracking-[1.4px] text-[#a3a3a3] uppercase">MODE TAYANG</div>
                    <div class="mt-1 font-semibold text-white">{{ DISTRIBUTION_MODE_LABELS[lockedSourcePackage.distributionMode] }}</div>
                  </div>
                </div>

                <!-- Locked Accounts Preview -->
                <div class="mt-4">
                  <div class="text-[10px] tracking-[1.5px] text-[#a3a3a3] uppercase">
                    AKUN TERMASUK DALAM PAKET ({{ fixedIncludedAccounts.length }})
                  </div>
                  <div v-if="fixedIncludedAccounts.length" class="mt-2.5 flex flex-wrap gap-1.5">
                    <div
                      v-for="account in fixedIncludedAccounts"
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

                <!-- Deliverables -->
                <ul class="mt-4 space-y-1.5 border-t border-[#292929] pt-3.5 text-[12px] text-[#ccc]">
                  <li v-for="(item, idx) in lockedSourcePackage.deliverables" :key="idx" class="flex items-start gap-2">
                    <span class="font-bold text-[#ed3541]" aria-hidden="true">+</span>
                    <span>{{ item }}</span>
                  </li>
                </ul>
              </div>

              <!-- Switch to Custom Link -->
              <button
                type="button"
                class="inline-flex cursor-pointer items-center gap-2 border-b border-white/30 pb-1 text-[11px] font-medium text-[#d4d4d4] transition-colors hover:border-[#ed3541] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ed3541] max-[700px]:min-h-[44px]"
                @click="switchToCustomBuilder"
              >
                <span>Ingin memilih akun sendiri atau ubah layanan? Beralih ke Konfigurator Custom</span>
                <span aria-hidden="true">↗</span>
              </button>
            </div>

            <!-- MODE B: CUSTOM PER-ACCOUNT CONFIGURATOR -->
            <template v-else>
              <!-- 1. Jenis Layanan -->
              <div class="mt-6">
                <div class="text-[10px] tracking-[1.8px] text-[#a3a3a3] uppercase">1. JENIS LAYANAN</div>
                <div class="mt-2.5 grid grid-cols-2 gap-2.5" role="group" aria-label="Pilih jenis layanan">
                  <button
                    v-for="opt in SERVICE_OPTIONS"
                    :key="opt.value"
                    type="button"
                    class="cursor-pointer border px-3 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541] max-[700px]:min-h-[44px]"
                    :class="serviceType === opt.value ? 'border-[#ed3541] bg-[#171717] text-white' : 'border-[#292929] bg-transparent text-[#ccc] hover:border-white/40'"
                    :aria-pressed="serviceType === opt.value"
                    @click="setServiceType(opt.value)"
                  >
                    <div class="text-[11px] font-bold tracking-[1px] uppercase">{{ opt.title }}</div>
                    <div class="mt-1 text-[11px] text-[#a3a3a3]">{{ opt.subtitle }}</div>
                  </button>
                </div>

                <p
                  v-if="serviceType === 'VISIT_PRODUCTION'"
                  class="mt-2.5 border border-[#292929] bg-[#141414] px-3 py-2 text-[11px] text-[#d4d4d4]"
                >
                  Biaya dasar kru lapangan &amp; editing Visit:
                  <strong class="text-white">{{ formatIdr(activeVisitBaseFee) }}</strong> (ditambah tarif tiap akun terpilih).
                </p>
              </div>

              <!-- 2. Mode Posting / Distribusi -->
              <div class="mt-6">
                <div class="text-[10px] tracking-[1.8px] text-[#a3a3a3] uppercase">2. MODE POSTING AKUN</div>
                <div class="mt-2.5 grid gap-2 sm:grid-cols-3" role="group" aria-label="Pilih mode posting">
                  <button
                    v-for="mode in distributionOptions"
                    :key="mode.value"
                    type="button"
                    class="cursor-pointer border px-3 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541] max-[700px]:min-h-[44px]"
                    :class="distributionMode === mode.value ? 'border-[#ed3541] bg-[#171717] text-white' : 'border-[#292929] bg-transparent text-[#ccc] hover:border-white/40'"
                    :aria-pressed="distributionMode === mode.value"
                    @click="setDistributionMode(mode.value)"
                  >
                    <div class="text-[10px] font-bold tracking-[1px] uppercase">{{ mode.title }}</div>
                    <div class="mt-0.5 text-[10px] text-[#a3a3a3]">{{ mode.subtitle }}</div>
                  </button>
                </div>
              </div>

              <!-- 3. Preset Regional & Pilihan Akun Dinamis -->
              <div class="mt-6">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <span class="text-[10px] tracking-[1.8px] text-[#a3a3a3] uppercase">
                    3. PILIH AKUN MEDIA ({{ selectedAccountIds.length }} TERPILIH)
                  </span>
                  <span v-if="distributionMode === 'COLLAB_POST'" class="text-[10px] font-semibold tracking-[1px] text-[#ed3541] uppercase">
                    KUOTA COLLAB: {{ selectedAccountIds.length }}/{{ COLLAB_MAX_ACCOUNTS }} (MIN {{ COLLAB_MIN_ACCOUNTS }})
                  </span>
                </div>

                <div class="mt-2.5 flex flex-wrap gap-1.5" role="group" aria-label="Preset wilayah cepat">
                  <button
                    v-for="preset in dynamicRegionalPresets"
                    :key="preset.code"
                    type="button"
                    class="inline-flex cursor-pointer items-center border border-[#292929] px-2.5 py-1.5 text-[10px] tracking-[1px] text-[#ccc] uppercase transition-colors hover:border-[#ed3541] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541] max-[700px]:min-h-[44px]"
                    @click="applyRegionalPreset(preset.accountIds)"
                  >
                    {{ preset.label }}
                  </button>
                </div>

                <div
                  class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2"
                  role="group"
                  :aria-label="`Daftar ${activeAccounts.length} akun media Hallopedia`"
                >
                  <button
                    v-for="account in activeAccounts"
                    :key="account.id"
                    type="button"
                    role="checkbox"
                    :aria-checked="selectedAccountIds.includes(account.id)"
                    :aria-disabled="isCollabAtLimit && !selectedAccountIds.includes(account.id)"
                    class="flex items-center justify-between border px-3 py-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541] max-[700px]:min-h-[44px]"
                    :class="
                      selectedAccountIds.includes(account.id)
                        ? 'cursor-pointer border-[#ed3541] bg-[#171717] text-white'
                        : isCollabAtLimit
                          ? 'cursor-not-allowed border-[#222] bg-transparent text-[#808080]'
                          : 'cursor-pointer border-[#292929] bg-transparent text-[#ccc] hover:border-white/40'
                    "
                    @click="toggleAccountSelection(account.id)"
                  >
                    <div class="flex min-w-0 items-center gap-2.5">
                      <img
                        v-if="account.logoPath"
                        :src="account.logoPath"
                        :alt="`Logo ${account.name}`"
                        class="h-6 w-6 shrink-0 object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                      <span
                        v-else
                        class="flex h-6 w-6 shrink-0 items-center justify-center border border-[#333] bg-[#141414] text-[9px] font-bold text-white"
                        aria-hidden="true"
                      >
                        {{ account.monogram }}
                      </span>
                      <div class="min-w-0">
                        <div class="truncate text-[11px] font-semibold">{{ account.name }}</div>
                        <div class="truncate text-[9px] tracking-[0.8px] text-[#a3a3a3] uppercase">{{ account.regionLabel }}</div>
                        <div
                          class="mt-0.5 text-[10px] font-bold tracking-[0.2px]"
                          :class="collabHostAccountId === account.id && selectedAccountIds.includes(account.id) ? 'text-[#ed3541]' : selectedAccountIds.includes(account.id) ? 'text-white' : 'text-[#9a9a9a]'"
                        >
                          {{ formatAccountRateHint(account) }}
                        </div>
                      </div>
                    </div>
                    <span
                      class="ml-2 shrink-0 font-bold"
                      :class="selectedAccountIds.includes(account.id) ? 'text-[11px] text-[#ed3541]' : isCollabAtLimit ? 'text-[9px] tracking-[0.8px] text-[#808080]' : 'text-[11px] text-[#a3a3a3]'"
                      aria-hidden="true"
                    >
                      {{ selectedAccountIds.includes(account.id) ? '✓' : isCollabAtLimit ? 'MAKS' : '+' }}
                    </span>
                  </button>
                </div>
              </div>
            </template>

            <!-- 4. Skema Pembayaran -->
            <div class="mt-6">
              <div class="text-[10px] tracking-[1.8px] text-[#a3a3a3] uppercase">
                {{ isFixedMode ? 'PILIHAN SKEMA BAYAR PAKET' : '4. PILIHAN SKEMA BAYAR' }}
              </div>
              <div class="mt-2.5 grid gap-2" :class="paymentGridColsClass" role="group" aria-label="Pilih skema pembayaran">
                <button
                  v-for="scheme in allowedPaymentSchemes"
                  :key="scheme"
                  type="button"
                  class="cursor-pointer border px-3 py-2 text-center text-[10px] font-bold tracking-[1.2px] uppercase transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541] max-[700px]:min-h-[44px]"
                  :class="paymentScheme === scheme ? 'border-[#ed3541] bg-[#ed3541] text-white' : 'border-[#292929] bg-transparent text-[#ccc] hover:border-white/40'"
                  :aria-pressed="paymentScheme === scheme"
                  @click="paymentScheme = scheme"
                >
                  {{ PAYMENT_SCHEME_LABELS[scheme] }}
                </button>
              </div>
            </div>
          </div>

          <!-- Drawer Summary Footer + Primary Action CTA -->
          <div class="mt-8 border-t border-[#292929] pt-5">
            <div class="flex items-baseline justify-between">
              <span class="text-[10px] tracking-[1.5px] text-[#a3a3a3] uppercase">
                {{ isFixedMode ? 'HARGA RESMI PAKET' : 'TOTAL ESTIMASI PAKET' }}
              </span>
              <span class="text-[24px] font-black tracking-[-0.03em] text-white">{{ formatIdr(estimatedPrice) }}</span>
            </div>
            <div class="mt-1 flex items-baseline justify-between text-[12px] text-[#ccc]">
              <span>
                {{ paymentScheme === 'DP' ? 'Bayar Awal (DP 50%)' : paymentScheme === 'FULL' ? 'Bayar Penuh Sekarang' : 'Tagihan Invoice Pascatayang' }}
              </span>
              <span class="font-semibold text-[#ed3541]">
                {{ paymentScheme === 'INVOICE' ? 'Sesuai Kesepakatan' : formatIdr(payNowAmount) }}
              </span>
            </div>

            <button
              type="button"
              :disabled="!canProceed"
              :aria-disabled="!canProceed"
              class="mt-5 flex w-full items-center justify-between px-5 py-4 text-[11px] font-bold tracking-[1.5px] text-white uppercase transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white max-[700px]:min-h-[44px]"
              :class="canProceed ? 'cursor-pointer bg-[#ed3541] hover:bg-[#ff4754]' : 'cursor-not-allowed bg-[#333] text-[#999]'"
              @click="handleProceed"
            >
              <span>SIMPAN DRAF &amp; KONFIRMASI</span>
              <span aria-hidden="true">→</span>
            </button>
            <p class="mt-2.5 mb-0 text-[11px] leading-[1.5] text-[#a3a3a3]">
              Draf disimpan di sesi Anda untuk pengisian brief materi dan checkout pembayaran.
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
