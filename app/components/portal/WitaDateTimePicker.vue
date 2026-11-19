<script setup lang="ts">
import { computed } from 'vue'
import {
  QUICK_WITA_TIME_SLOTS,
  formatIndonesianFullDateTime,
  isScheduleDateTimeInFuture,
} from '~/data/orders'

const props = withDefaults(
  defineProps<{
    date: string
    timeWita: string
    minDate: string
    dateLabel: string
    timeLabel: string
    previewLabel: string
    required?: boolean
    dateId?: string
    timeId?: string
  }>(),
  {
    required: false,
    dateId: 'wita-date-input',
    timeId: 'wita-time-input',
  },
)

const emit = defineEmits<{
  'update:date': [value: string]
  'update:timeWita': [value: string]
}>()

const formattedSchedulePreview = computed(() =>
  formatIndonesianFullDateTime(props.date, props.timeWita),
)

function addOneDayIso(baseIso: string): string {
  const [y, m, d] = baseIso.split('-').map(Number)
  if (!y || !m || !d) return baseIso
  const next = new Date(Date.UTC(y, m - 1, d + 1))
  return next.toISOString().slice(0, 10)
}

const isTodaySelected = computed(() => props.date.trim() === props.minDate)

function isSlotDisabled(slot: string): boolean {
  return isTodaySelected.value && !isScheduleDateTimeInFuture(props.minDate, slot)
}

const hasDisabledTodaySlot = computed(() => QUICK_WITA_TIME_SLOTS.some((slot) => isSlotDisabled(slot)))

function selectQuickTimeSlot(slot: string) {
  if (isSlotDisabled(slot)) return
  if (!props.date.trim()) {
    const safeDate = isScheduleDateTimeInFuture(props.minDate, slot)
      ? props.minDate
      : addOneDayIso(props.minDate)
    emit('update:date', safeDate)
  }
  emit('update:timeWita', slot)
}

function handleDateInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  emit('update:date', value)
  if (!value) {
    emit('update:timeWita', '')
  }
}
</script>

<template>
  <div class="space-y-3">
    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <label :for="dateId" class="mb-1.5 block text-[10px] font-bold tracking-[1.3px] text-[#525252] uppercase">
          {{ dateLabel }}<span v-if="required"> *</span>
        </label>
        <input
          :id="dateId"
          :value="date"
          type="date"
          :min="minDate"
          :required="required"
          class="min-h-[46px] w-full border border-black/20 bg-white px-3.5 text-[13px] text-[#0b0b0b] focus:border-[#ed3541] focus:outline-none max-[700px]:text-[16px]"
          @input="handleDateInput"
        />
      </div>

      <div>
        <div class="mb-1.5 flex items-center justify-between gap-2">
          <label :for="timeId" class="block text-[10px] font-bold tracking-[1.3px] text-[#525252] uppercase">
            {{ timeLabel }}<span v-if="required"> *</span>
          </label>
          <button
            v-if="timeWita"
            type="button"
            class="min-h-[28px] cursor-pointer border-0 bg-transparent px-1.5 py-0 text-[10px] font-bold tracking-[1px] text-[#ed3541] uppercase underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541] max-lg:min-h-[44px] max-lg:px-2"
            @click="emit('update:timeWita', '')"
          >
            RESET JAM
          </button>
        </div>
        <input
          :id="timeId"
          :value="timeWita"
          type="time"
          :required="required"
          class="min-h-[46px] w-full border border-black/20 bg-white px-3.5 text-[13px] text-[#0b0b0b] focus:border-[#ed3541] focus:outline-none max-[700px]:text-[16px]"
          @input="emit('update:timeWita', ($event.target as HTMLInputElement).value)"
        />
        <div class="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Pilih cepat slot jam WITA">
          <button
            v-for="slot in QUICK_WITA_TIME_SLOTS"
            :key="slot"
            type="button"
            :disabled="isSlotDisabled(slot)"
            class="min-h-[34px] cursor-pointer border px-2.5 py-1 text-[10px] font-bold tracking-[0.8px] tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541] max-lg:min-h-[44px]"
            :class="timeWita === slot ? 'border-[#ed3541] bg-[#0b0b0b] text-white' : 'border-black/20 bg-[#f6f5f2] text-[#0b0b0b] hover:border-[#0b0b0b]'"
            :aria-pressed="timeWita === slot"
            @click="selectQuickTimeSlot(slot)"
          >
            {{ slot }} WITA
          </button>
        </div>
        <p v-if="hasDisabledTodaySlot" class="mt-1.5 mb-0 text-[10px] text-[#525252]">
          Slot jam hari ini yang sudah lewat dinonaktifkan; pilih tanggal besok untuk jam tersebut.
        </p>
      </div>
    </div>

    <div
      v-if="formattedSchedulePreview"
      class="border-l-2 border-[#ed3541] bg-[#f6f5f2] px-3.5 py-2.5 text-[12px] leading-[1.5]"
    >
      <div class="text-[9px] font-bold tracking-[1.4px] text-[#525252] uppercase">
        {{ previewLabel }}
      </div>
      <div class="mt-0.5 font-extrabold text-[#0b0b0b]">
        {{ formattedSchedulePreview }}
      </div>
    </div>
  </div>
</template>

