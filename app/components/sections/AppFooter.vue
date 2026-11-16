<script setup lang="ts">
import { computed } from 'vue'
import { useCatalogData } from '~/composables/useCatalogData'
import {
  FOOTER_NAVIGATION,
  FOOTER_OPERATIONAL_INFO,
} from '~/data/homepage-faq'

const { accounts, regionGroups } = useCatalogData()
const currentYear = computed(() => new Date().getFullYear())
</script>

<template>
  <footer
    id="kontak"
    class="w-full border-t border-[#292929] bg-[#0b0b0b] pt-[76px] pb-[96px] text-white max-[700px]:pt-[56px] max-[700px]:pb-[92px]"
  >
    <div class="mx-auto max-w-[1600px] px-[6%] max-[700px]:px-[5%]">
      <!-- Baris CTA Penutup -->
      <div class="flex flex-wrap items-end justify-between gap-6 border-b border-[#292929] pb-10">
        <div class="max-w-[680px]">
          <div class="mb-3 flex items-center gap-[10px] text-[10px] tracking-[2px] text-[#a3a3a3] uppercase">
            <span class="h-[7px] w-[7px] rounded-full bg-[#ed3541]" aria-hidden="true"></span>
            LAYANAN PEMESANAN PERIKLANAN DIGITAL
          </div>
          <h2 class="text-[clamp(28px,4vw,50px)] font-extrabold leading-[1.02] tracking-[-0.04em] text-white">
            Siap menjadwalkan publikasi atau kunjungan produksi?
          </h2>
        </div>

        <div class="flex flex-wrap gap-3">
          <a
            href="#katalog"
            class="inline-flex min-h-[44px] items-center gap-2 bg-[#ed3541] px-5 py-3 text-[11px] font-bold tracking-[1.4px] text-white uppercase no-underline transition-colors hover:bg-[#ff4754] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <span>BUKA KATALOG HARGA</span>
            <span aria-hidden="true">↑</span>
          </a>
          <a
            href="#media-network"
            class="inline-flex min-h-[44px] items-center gap-2 border border-[#292929] px-5 py-3 text-[11px] font-bold tracking-[1.4px] text-white uppercase no-underline transition-colors hover:border-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541]"
          >
            <span>DIREKTORI {{ accounts.length }} AKUN</span>
            <span aria-hidden="true">↑</span>
          </a>
        </div>
      </div>

      <!-- Kolom Informasi Footer -->
      <div class="grid grid-cols-1 gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.2fr_0.9fr_1fr_1fr]">
        <div class="min-w-0">
          <a
            href="#hero"
            class="inline-block text-[24px] font-black tracking-[-1.4px] text-white no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ed3541]"
          >
            HALLOPEDIA<span class="text-[#ed3541]">.</span>
          </a>
          <p class="mt-3 mb-4 max-w-[340px] text-[13px] leading-[1.65] text-[#a3a3a3]">
            {{ FOOTER_OPERATIONAL_INFO.tagline }}
          </p>
          <div class="text-[11px] tracking-[1.2px] text-[#ccc] uppercase">
            {{ accounts.length }} AKUN AKTIF · {{ regionGroups.length }} KLUSTER WILAYAH
          </div>
        </div>

        <nav class="min-w-0" aria-label="Navigasi footer">
          <div class="mb-4 text-[10px] font-bold tracking-[1.8px] text-[#a3a3a3] uppercase">
            NAVIGASI HALAMAN
          </div>
          <ul class="m-0 list-none space-y-2 p-0">
            <li v-for="item in FOOTER_NAVIGATION" :key="item.target">
              <a
                :href="item.target"
                class="inline-flex min-h-[36px] items-center gap-2.5 text-[13px] text-[#ccc] no-underline transition-colors hover:text-[#ed3541] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541] max-lg:min-h-[44px]"
              >
                <span class="text-[10px] font-bold tracking-[1px] text-[#ed3541] tabular-nums">{{ item.number }}</span>
                <span>{{ item.label }}</span>
              </a>
            </li>
          </ul>
        </nav>

        <div class="min-w-0">
          <div class="mb-4 text-[10px] font-bold tracking-[1.8px] text-[#a3a3a3] uppercase">
            LAYANAN &amp; PEMBAYARAN
          </div>
          <ul class="m-0 list-none space-y-2.5 p-0 text-[13px] leading-[1.6] text-[#ccc]">
            <li>Publikasi Langsung (Feed · Reels · Story)</li>
            <li>Kunjungan Produksi / Visit (Liputan + Edit)</li>
            <li>{{ FOOTER_OPERATIONAL_INFO.paymentSupportLabel }}</li>
            <li>Koordinasi Brief &amp; Live Chat Admin Pascabayar</li>
          </ul>
        </div>

        <div class="min-w-0">
          <div class="mb-4 text-[10px] font-bold tracking-[1.8px] text-[#a3a3a3] uppercase">
            OPERASIONAL &amp; KONTAK
          </div>
          <dl class="m-0 space-y-3 text-[13px]">
            <div>
              <dt class="text-[10px] tracking-[1.2px] text-[#a3a3a3] uppercase">CAKUPAN WILAYAH</dt>
              <dd class="mt-0.5 ml-0 text-[#ccc]">{{ FOOTER_OPERATIONAL_INFO.coverage }}</dd>
            </div>
            <div>
              <dt class="text-[10px] tracking-[1.2px] text-[#a3a3a3] uppercase">JAM LAYANAN ADMIN</dt>
              <dd class="mt-0.5 ml-0 text-[#ccc]">{{ FOOTER_OPERATIONAL_INFO.operatingHours }}</dd>
            </div>
            <div>
              <dt class="text-[10px] tracking-[1.2px] text-[#a3a3a3] uppercase">EMAIL RESMI</dt>
              <dd class="mt-0.5 ml-0">
                <a
                  :href="`mailto:${FOOTER_OPERATIONAL_INFO.contactEmail}`"
                  class="inline-flex min-h-[36px] items-center text-white underline decoration-[#292929] underline-offset-4 transition-colors hover:text-[#ed3541] hover:decoration-[#ed3541] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541] max-lg:min-h-[44px]"
                >
                  {{ FOOTER_OPERATIONAL_INFO.contactEmail }}
                </a>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <!-- Baris Hak Cipta -->
      <div class="flex flex-wrap items-center justify-between gap-4 border-t border-[#292929] pt-6 text-[11px] tracking-[1.2px] text-[#a3a3a3] uppercase">
        <span>© {{ currentYear }} {{ FOOTER_OPERATIONAL_INFO.companyName }}. SELURUH HAK CIPTA DILINDUNGI.</span>
        <span>TRANSAKSI DIGITAL · KATALOG PERIKLANAN KALIMANTAN</span>
      </div>
    </div>
  </footer>
</template>
