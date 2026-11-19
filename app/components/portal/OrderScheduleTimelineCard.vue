<script setup lang="ts">
import { computed } from 'vue'
import { sanitizeInstagramPermalink } from '~/data/catalog'
import {
  formatIndonesianFullDateTime,
  sanitizeGoogleDriveOrHttpsUrl,
  type OrderRecord,
  type PublicationScheduleItem,
} from '~/data/orders'

const props = defineProps<{
  order: OrderRecord
}>()

const visitMeetingSummary = computed(() => {
  if (props.order.serviceType !== 'VISIT_PRODUCTION') return null
  const brief = props.order.brief?.serviceType === 'VISIT_PRODUCTION' ? props.order.brief : null
  const pref = props.order.schedulePreference?.serviceType === 'VISIT_PRODUCTION'
    ? props.order.schedulePreference
    : null
  const confirmedRow =
    (props.order.status === 'SCHEDULED' || props.order.status === 'PUBLISHED') && props.order.schedules[0]
      ? props.order.schedules[0]
      : null

  const date = confirmedRow?.scheduledDate || brief?.preferredVisitDate || pref?.preferredDate || props.order.targetPublishDate
  const time = confirmedRow?.scheduledTimeWita ?? brief?.preferredVisitTimeWita ?? pref?.preferredTimeWita ?? null
  const formatted = formatIndonesianFullDateTime(date, time)
  const location = confirmedRow?.meetingLocation || brief?.locationAddress || pref?.meetingLocation || ''
  const rawMaps = brief?.meetingMapsUrl ?? pref?.meetingMapsUrl ?? null
  const safeMaps = rawMaps ? sanitizeGoogleDriveOrHttpsUrl(rawMaps) : null

  return {
    formatted,
    location,
    safeMaps,
    picName: brief?.picName || props.order.customerName,
    picPhone: brief?.picPhone || props.order.customerWhatsapp,
  }
})

const scheduleRows = computed<PublicationScheduleItem[]>(() => {
  if (props.order.schedules.length > 0) return props.order.schedules
  const fallbackLabel =
    formatIndonesianFullDateTime(
      props.order.schedulePreference?.preferredDate ?? props.order.targetPublishDate,
      props.order.schedulePreference?.preferredTimeWita ?? null,
    ) ?? 'Menunggu pengiriman brief & penjadwalan Admin'

  return props.order.accountsSnapshot.map((acc) => ({
    id: `fallback-${acc.id}`,
    accountId: acc.id,
    accountHandle: acc.handle,
    scheduledAtLabel: fallbackLabel,
    status: 'PLANNED',
    publishedPermalink: null,
  }))
})

function statusBadgeLabel(status: PublicationScheduleItem['status']): string {
  if (status === 'PUBLISHED') return 'SUDAH TAYANG'
  if (status === 'CONFIRMED') return 'TERJADWAL'
  return 'DIRENCANAKAN'
}

function safePermalink(url: string | null): string | null {
  return url ? sanitizeInstagramPermalink(url) : null
}
</script>

<template>
  <div class="border border-black/15 bg-white p-6">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-black/10 pb-3">
      <h2 class="m-0 text-[12px] font-bold tracking-[1.5px] uppercase">
        JADWAL EKSEKUSI &amp; PUBLIKASI ({{ scheduleRows.length }} AKUN)
      </h2>
      <span class="text-[10px] font-bold tracking-[1.2px] text-[#525252] uppercase">
        {{ order.status === 'PUBLISHED' ? 'KAMPANYE TAYANG' : order.status === 'SCHEDULED' ? 'JADWAL TERKUNCI' : 'ANTREAN JADWAL WITA' }}
      </span>
    </div>

    <!-- Sorotan Pertemuan Lapangan Visit Produksi -->
    <div
      v-if="visitMeetingSummary"
      class="mb-5 border border-[#292929] bg-[#0b0b0b] p-4 text-white"
    >
      <div class="flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold tracking-[1.4px] uppercase">
        <span class="text-[#ed3541]">PERTEMUAN TIM PRODUKSI &amp; KLIEN</span>
        <span class="border border-white/25 px-2 py-0.5 text-white">
          {{ order.status === 'SCHEDULED' || order.status === 'PUBLISHED' ? 'TERKONFIRMASI' : order.brief ? 'MENUNGGU KONFIRMASI' : 'MENUNGGU BRIEF' }}
        </span>
      </div>

      <div class="mt-2.5 text-[15px] font-extrabold text-white">
        {{ visitMeetingSummary.formatted ?? 'Jadwal pertemuan Visit belum ditentukan' }}
      </div>
      <div class="mt-1 text-[12px] text-[#ccc]">
        {{ visitMeetingSummary.location || 'Alamat lokasi pertemuan belum dilengkapi' }}
      </div>
      <div class="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#a3a3a3]">
        <span>PIC: <strong class="text-white">{{ visitMeetingSummary.picName }}</strong> ({{ visitMeetingSummary.picPhone }})</span>
        <a
          v-if="visitMeetingSummary.safeMaps"
          :href="visitMeetingSummary.safeMaps"
          target="_blank"
          rel="noopener noreferrer"
          class="font-bold text-[#ed3541] uppercase no-underline hover:underline"
        >
          BUKA GOOGLE MAPS ↗
        </a>
      </div>
    </div>

    <!-- Daftar Slot Tayang Per Akun Media -->
    <div class="divide-y divide-black/10">
      <div
        v-for="item in scheduleRows"
        :key="item.id"
        class="flex flex-wrap items-center justify-between gap-3 py-3 text-[12px]"
      >
        <div class="min-w-0">
          <div class="font-bold text-[#0b0b0b]">{{ item.accountHandle }}</div>
          <div class="mt-0.5 text-[11px] text-[#525252]">{{ item.scheduledAtLabel }}</div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <span
            class="border px-2 py-0.5 text-[9px] font-bold tracking-[1.1px] uppercase"
            :class="
              item.status === 'PUBLISHED'
                ? 'border-[#ed3541] bg-[#ed3541] text-white'
                : item.status === 'CONFIRMED'
                  ? 'border-[#0b0b0b] bg-[#0b0b0b] text-white'
                  : 'border-black/20 bg-[#f6f5f2] text-[#525252]'
            "
          >
            {{ statusBadgeLabel(item.status) }}
          </span>
          <a
            v-if="safePermalink(item.publishedPermalink)"
            :href="safePermalink(item.publishedPermalink)!"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex min-h-[32px] items-center text-[10px] font-bold tracking-[1px] text-[#ed3541] uppercase no-underline hover:underline"
          >
            LIHAT TAYANGAN ↗
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

