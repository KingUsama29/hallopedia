<script setup lang="ts">
import { computed } from 'vue'
import {
  formatIndonesianFullDateTime,
  sanitizeGoogleDriveOrHttpsUrl,
  type OrderRecord,
} from '~/data/orders'

const props = defineProps<{
  order: OrderRecord
}>()

const formattedSchedule = computed(() => {
  const pref = props.order.schedulePreference
  return formatIndonesianFullDateTime(
    pref?.preferredDate ?? props.order.targetPublishDate,
    pref?.preferredTimeWita ?? null,
  )
})

const visitLocation = computed(() =>
  props.order.schedulePreference?.serviceType === 'VISIT_PRODUCTION'
    ? props.order.schedulePreference.meetingLocation.trim()
    : '',
)

const safeVisitMapsUrl = computed(() => {
  if (props.order.schedulePreference?.serviceType !== 'VISIT_PRODUCTION') return null
  const raw = props.order.schedulePreference.meetingMapsUrl
  return raw ? sanitizeGoogleDriveOrHttpsUrl(raw) : null
})
</script>

<template>
  <div class="space-y-6">
    <!-- Jadwal, Lokasi Visit & Kontak Koordinasi -->
    <div class="border border-black/15 bg-white p-6">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-black/10 pb-3">
        <h2 class="m-0 text-[12px] font-bold tracking-[1.5px] uppercase">
          JADWAL, LOKASI &amp; KONTAK KOORDINASI
        </h2>
        <span class="text-[10px] font-bold tracking-[1.2px] text-[#525252] uppercase">
          ZONA WAKTU WITA
        </span>
      </div>

      <dl class="m-0 space-y-4 text-[13px]">
        <div class="grid gap-1 sm:grid-cols-[200px_1fr] sm:items-baseline">
          <dt class="text-[11px] font-bold tracking-[1px] text-[#525252] uppercase">
            WhatsApp Koordinasi
          </dt>
          <dd class="m-0 font-bold text-[#0b0b0b] tabular-nums">
            {{ order.customerWhatsapp }}
          </dd>
        </div>

        <div class="grid gap-1 sm:grid-cols-[200px_1fr] sm:items-baseline">
          <dt class="text-[11px] font-bold tracking-[1px] text-[#525252] uppercase">
            {{ order.serviceType === 'VISIT_PRODUCTION' ? 'Jadwal Pertemuan Visit' : 'Target Jadwal Posting' }}
          </dt>
          <dd class="m-0 font-bold text-[#0b0b0b]">
            <span v-if="formattedSchedule">{{ formattedSchedule }}</span>
            <span v-else class="font-normal text-[#525252]">
              Fleksibel (disepakati bersama Admin saat koordinasi)
            </span>
          </dd>
        </div>

        <div
          v-if="order.serviceType === 'VISIT_PRODUCTION'"
          class="grid gap-1 sm:grid-cols-[200px_1fr] sm:items-baseline"
        >
          <dt class="text-[11px] font-bold tracking-[1px] text-[#525252] uppercase">
            Lokasi Pertemuan Visit
          </dt>
          <dd class="m-0 text-[#0b0b0b]">
            <div v-if="visitLocation" class="font-semibold">{{ visitLocation }}</div>
            <div v-else class="text-[#525252]">
              Menunggu konfirmasi alamat lokasi pertemuan bersama tim produksi.
            </div>
            <a
              v-if="safeVisitMapsUrl"
              :href="safeVisitMapsUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="mt-1.5 inline-flex min-h-[32px] items-center gap-1.5 text-[10px] font-bold tracking-[1.2px] text-[#ed3541] uppercase no-underline hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541]"
            >
              <span>BUKA TITIK GOOGLE MAPS</span>
              <span aria-hidden="true">↗</span>
            </a>
          </dd>
        </div>

        <div
          v-if="order.initialNotes"
          class="grid gap-1 border-t border-black/10 pt-3 sm:grid-cols-[200px_1fr] sm:items-baseline"
        >
          <dt class="text-[11px] font-bold tracking-[1px] text-[#525252] uppercase">
            Catatan Singkat Awal
          </dt>
          <dd class="m-0 leading-[1.55] text-[#0b0b0b]">
            {{ order.initialNotes }}
          </dd>
        </div>
      </dl>
    </div>

    <!-- Koordinasi Brief, Materi & Admin -->
    <div class="border border-black/15 bg-white p-6">
      <div class="text-[10px] font-bold tracking-[1.6px] text-[#ed3541] uppercase">
        KOORDINASI BRIEF, JADWAL &amp; ADMIN
      </div>
      <h2 class="mt-2 mb-2 text-[20px] font-extrabold tracking-[-0.03em] text-[#0b0b0b]">
        Pengiriman Brief, Tautan Drive &amp; Chat Admin
      </h2>
      <p class="m-0 text-[13px] leading-[1.6] text-[#525252]">
        Pesanan <strong class="text-[#0b0b0b]">{{ order.orderCode }}</strong> beserta preferensi jadwal di atas telah tercatat di sistem. Panel unggah materi/Google Drive, penetapan slot tayang atau jadwal kunjungan final, dan Live Chat Admin terikat langsung pada halaman pesanan ini.
      </p>
    </div>
  </div>
</template>

