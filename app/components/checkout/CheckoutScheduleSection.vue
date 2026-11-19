<script setup lang="ts">
import WitaDateTimePicker from '~/components/portal/WitaDateTimePicker.vue'
import type { ServiceType } from '~/data/catalog'

defineProps<{
  serviceType: ServiceType
  minDate: string
  targetDate: string
  targetTimeWita: string
  visitLocation: string
  visitMapsUrl: string
  initialNotes: string
}>()

const emit = defineEmits<{
  'update:targetDate': [value: string]
  'update:targetTimeWita': [value: string]
  'update:visitLocation': [value: string]
  'update:visitMapsUrl': [value: string]
  'update:initialNotes': [value: string]
}>()
</script>

<template>
  <div class="space-y-4">
    <div class="border-b border-black/10 pb-2">
      <div class="text-[11px] font-bold tracking-[1.5px] text-[#0b0b0b] uppercase">
        02 · {{ serviceType === 'VISIT_PRODUCTION' ? 'JADWAL & LOKASI PERTEMUAN VISIT (OPSIONAL)' : 'PREFERENSI JADWAL TAYANG & CATATAN (OPSIONAL)' }}
      </div>
      <p class="mt-1 mb-0 text-[11px] leading-[1.5] text-[#525252]">
        <template v-if="serviceType === 'VISIT_PRODUCTION'">
          Tentukan hari, tanggal, jam (WITA), serta alamat tempat ketemuan antara tim pembuat iklan Hallopedia dan pihak Anda — atau kosongkan bila ingin disepakati bersama Admin setelah checkout.
        </template>
        <template v-else>
          Tentukan hari, tanggal, dan jam tayang konten dalam zona waktu WITA — atau kosongkan apabila jadwal tayang masih fleksibel.
        </template>
      </p>
    </div>

    <WitaDateTimePicker
      date-id="checkout-date"
      time-id="checkout-time-wita"
      :date="targetDate"
      :time-wita="targetTimeWita"
      :min-date="minDate"
      :date-label="`TANGGAL TARGET ${serviceType === 'VISIT_PRODUCTION' ? 'PERTEMUAN VISIT' : 'POSTING'}`"
      :time-label="`JAM ${serviceType === 'VISIT_PRODUCTION' ? 'KETEMUAN' : 'TAYANG'} (WITA)`"
      :preview-label="serviceType === 'VISIT_PRODUCTION' ? 'JADWAL PERTEMUAN TIM PRODUKSI & KLIEN' : 'RINGKASAN JADWAL TAYANG'"
      @update:date="emit('update:targetDate', $event)"
      @update:time-wita="emit('update:targetTimeWita', $event)"
    />

    <div
      v-if="serviceType === 'VISIT_PRODUCTION'"
      class="grid gap-4 border-l-2 border-[#0b0b0b] bg-[#f6f5f2] p-4 sm:grid-cols-2"
    >
      <div>
        <label for="checkout-visit-location" class="mb-1.5 block text-[10px] font-bold tracking-[1.3px] text-[#0b0b0b] uppercase">
          LOKASI / ALAMAT PERTEMUAN VISIT
        </label>
        <input
          id="checkout-visit-location"
          :value="visitLocation"
          type="text"
          placeholder="Contoh: Outlet Borneo Rasa, Jl. Antasari No. 12, Samarinda"
          class="min-h-[46px] w-full border border-black/20 bg-white px-3.5 text-[13px] text-[#0b0b0b] focus:border-[#ed3541] focus:outline-none max-[700px]:text-[16px]"
          @input="emit('update:visitLocation', ($event.target as HTMLInputElement).value)"
        />
      </div>

      <div>
        <label for="checkout-visit-maps" class="mb-1.5 block text-[10px] font-bold tracking-[1.3px] text-[#0b0b0b] uppercase">
          TAUTAN GOOGLE MAPS LOKASI (OPSIONAL)
        </label>
        <input
          id="checkout-visit-maps"
          :value="visitMapsUrl"
          type="url"
          placeholder="https://maps.google.com/..."
          class="min-h-[46px] w-full border border-black/20 bg-white px-3.5 text-[13px] text-[#0b0b0b] focus:border-[#ed3541] focus:outline-none max-[700px]:text-[16px]"
          @input="emit('update:visitMapsUrl', ($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>

    <div>
      <label for="checkout-notes" class="mb-1.5 block text-[10px] font-bold tracking-[1.3px] text-[#525252] uppercase">
        CATATAN SINGKAT AWAL
      </label>
      <input
        id="checkout-notes"
        :value="initialNotes"
        type="text"
        placeholder="Contoh: Fokus promo pembukaan cabang & jam ramai pengunjung"
        class="min-h-[46px] w-full border border-black/20 bg-white px-3.5 text-[13px] text-[#0b0b0b] focus:border-[#ed3541] focus:outline-none max-[700px]:text-[16px]"
        @input="emit('update:initialNotes', ($event.target as HTMLInputElement).value)"
      />
    </div>
  </div>
</template>
