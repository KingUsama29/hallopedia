<script setup lang="ts">
import { computed } from 'vue'
import type { ServiceType } from '~/data/catalog'
import {
  QUICK_WITA_TIME_SLOTS,
  formatIndonesianFullDateTime,
  isScheduleDateTimeInFuture,
} from '~/data/orders'

const props = defineProps<{
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

const formattedSchedulePreview = computed(() =>
  formatIndonesianFullDateTime(props.targetDate, props.targetTimeWita),
)

function addOneDayIso(baseIso: string): string {
  const [y, m, d] = baseIso.split('-').map(Number)
  if (!y || !m || !d) return baseIso
  const next = new Date(Date.UTC(y, m - 1, d + 1))
  return next.toISOString().slice(0, 10)
}

function selectQuickTimeSlot(slot: string) {
  if (!props.targetDate.trim()) {
    const safeDate = isScheduleDateTimeInFuture(props.minDate, slot)
      ? props.minDate
      : addOneDayIso(props.minDate)
    emit('update:targetDate', safeDate)
  }
  emit('update:targetTimeWita', slot)
}

function handleDateInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  emit('update:targetDate', value)
  if (!value) {
    emit('update:targetTimeWita', '')
  }
}

function handleTimeInput(event: Event) {
  emit('update:targetTimeWita', (event.target as HTMLInputElement).value)
}
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

    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <label for="checkout-date" class="mb-1.5 block text-[10px] font-bold tracking-[1.3px] text-[#525252] uppercase">
          TANGGAL TARGET {{ serviceType === 'VISIT_PRODUCTION' ? 'PERTEMUAN VISIT' : 'POSTING' }}
        </label>
        <input
          id="checkout-date"
          :value="targetDate"
          type="date"
          :min="minDate"
          class="min-h-[46px] w-full border border-black/20 bg-white px-3.5 text-[13px] text-[#0b0b0b] focus:border-[#ed3541] focus:outline-none max-[700px]:text-[16px]"
          @input="handleDateInput"
        />
      </div>

      <div>
        <div class="mb-1.5 flex items-center justify-between gap-2">
          <label for="checkout-time-wita" class="block text-[10px] font-bold tracking-[1.3px] text-[#525252] uppercase">
            JAM {{ serviceType === 'VISIT_PRODUCTION' ? 'KETEMUAN' : 'TAYANG' }} (WITA)
          </label>
          <button
            v-if="targetTimeWita"
            type="button"
            class="cursor-pointer border-0 bg-transparent p-0 text-[10px] font-bold tracking-[1px] text-[#ed3541] uppercase underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541]"
            @click="emit('update:targetTimeWita', '')"
          >
            RESET JAM
          </button>
        </div>
        <input
          id="checkout-time-wita"
          :value="targetTimeWita"
          type="time"
          class="min-h-[46px] w-full border border-black/20 bg-white px-3.5 text-[13px] text-[#0b0b0b] focus:border-[#ed3541] focus:outline-none max-[700px]:text-[16px]"
          @input="handleTimeInput"
        />
        <div class="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Pilih cepat slot jam WITA">
          <button
            v-for="slot in QUICK_WITA_TIME_SLOTS"
            :key="slot"
            type="button"
            class="min-h-[32px] cursor-pointer border px-2.5 py-1 text-[10px] font-bold tracking-[0.8px] tabular-nums transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541] max-lg:min-h-[38px]"
            :class="targetTimeWita === slot ? 'border-[#ed3541] bg-[#0b0b0b] text-white' : 'border-black/20 bg-[#f6f5f2] text-[#0b0b0b] hover:border-[#0b0b0b]'"
            :aria-pressed="targetTimeWita === slot"
            @click="selectQuickTimeSlot(slot)"
          >
            {{ slot }} WITA
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="formattedSchedulePreview"
      class="border-l-2 border-[#ed3541] bg-[#f6f5f2] px-3.5 py-2.5 text-[12px] leading-[1.5]"
    >
      <div class="text-[9px] font-bold tracking-[1.4px] text-[#525252] uppercase">
        {{ serviceType === 'VISIT_PRODUCTION' ? 'JADWAL PERTEMUAN TIM PRODUKSI & KLIEN' : 'RINGKASAN JADWAL TAYANG' }}
      </div>
      <div class="mt-0.5 font-extrabold text-[#0b0b0b]">
        {{ formattedSchedulePreview }}
      </div>
    </div>

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

