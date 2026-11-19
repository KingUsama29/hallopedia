<script setup lang="ts">
import { computed } from 'vue'
import {
  formatIndonesianFullDateTime,
  sanitizeGoogleDriveOrHttpsUrl,
  type OrderBriefSpec,
  type OrderMaterialItem,
} from '~/data/orders'

const props = defineProps<{
  brief: OrderBriefSpec
  materials: readonly OrderMaterialItem[]
}>()

const formattedBriefSchedule = computed(() => {
  if (props.brief.serviceType === 'DIRECT_POST') {
    return formatIndonesianFullDateTime(
      props.brief.preferredPublishDate,
      props.brief.preferredPublishTimeWita ?? null,
    )
  }
  return formatIndonesianFullDateTime(
    props.brief.preferredVisitDate,
    props.brief.preferredVisitTimeWita ?? null,
  )
})

function safeHttps(raw: string | null | undefined): string | null {
  return raw ? sanitizeGoogleDriveOrHttpsUrl(raw) : null
}
</script>

<template>
  <div class="space-y-4 text-[13px]">
    <template v-if="brief.serviceType === 'DIRECT_POST'">
      <div>
        <div class="text-[10px] font-bold tracking-[1.2px] text-[#525252] uppercase">CAPTION UTAMA</div>
        <p class="mt-1 mb-0 whitespace-pre-line border border-black/10 bg-[#f6f5f2] p-3.5 text-[#0b0b0b]">
          {{ brief.caption }}
        </p>
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <div class="text-[10px] font-bold tracking-[1.2px] text-[#525252] uppercase">TAG / MENTION</div>
          <div class="mt-1 font-semibold text-[#0b0b0b]">{{ brief.mentionHandles || '—' }}</div>
        </div>
        <div>
          <div class="text-[10px] font-bold tracking-[1.2px] text-[#525252] uppercase">TARGET JADWAL TAYANG</div>
          <div class="mt-1 font-bold text-[#0b0b0b]">{{ formattedBriefSchedule || 'Fleksibel bersama Admin' }}</div>
        </div>
      </div>
      <div v-if="safeHttps(brief.ctaLink)">
        <div class="text-[10px] font-bold tracking-[1.2px] text-[#525252] uppercase">TAUTAN CTA</div>
        <a
          :href="safeHttps(brief.ctaLink)!"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-1 inline-block font-semibold text-[#ed3541] no-underline hover:underline"
        >
          {{ brief.ctaLink }} ↗
        </a>
      </div>
      <div v-if="brief.notes">
        <div class="text-[10px] font-bold tracking-[1.2px] text-[#525252] uppercase">CATATAN PENAYANGAN</div>
        <div class="mt-1 text-[#0b0b0b]">{{ brief.notes }}</div>
      </div>
    </template>

    <template v-else-if="brief.serviceType === 'VISIT_PRODUCTION'">
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <div class="text-[10px] font-bold tracking-[1.2px] text-[#525252] uppercase">JADWAL PERTEMUAN VISIT</div>
          <div class="mt-1 font-bold text-[#0b0b0b]">{{ formattedBriefSchedule || brief.preferredVisitSlot }}</div>
        </div>
        <div>
          <div class="text-[10px] font-bold tracking-[1.2px] text-[#525252] uppercase">PIC LOKASI</div>
          <div class="mt-1 font-bold text-[#0b0b0b]">{{ brief.picName }} · {{ brief.picPhone }}</div>
        </div>
      </div>
      <div>
        <div class="text-[10px] font-bold tracking-[1.2px] text-[#525252] uppercase">LOKASI KETEMUAN</div>
        <div class="mt-1 font-semibold text-[#0b0b0b]">{{ brief.locationAddress }}</div>
        <a
          v-if="safeHttps(brief.meetingMapsUrl)"
          :href="safeHttps(brief.meetingMapsUrl)!"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-1 inline-block text-[11px] font-bold text-[#ed3541] no-underline hover:underline"
        >
          BUKA TITIK GOOGLE MAPS ↗
        </a>
      </div>
      <div v-if="brief.keyHighlights">
        <div class="text-[10px] font-bold tracking-[1.2px] text-[#525252] uppercase">POIN PRODUKSI &amp; ARAHAN</div>
        <p class="mt-1 mb-0 whitespace-pre-line border border-black/10 bg-[#f6f5f2] p-3.5 text-[#0b0b0b]">
          {{ brief.keyHighlights }}
        </p>
      </div>
    </template>

    <div class="border-t border-black/10 pt-3">
      <div class="text-[10px] font-bold tracking-[1.2px] text-[#525252] uppercase">
        LAMPIRAN MATERI ({{ materials.length }})
      </div>
      <p v-if="!materials.length" class="mt-1 mb-0 text-[12px] text-[#525252]">
        Belum ada tautan Google Drive atau file terlampir.
      </p>
      <ul v-else class="mt-2 mb-0 list-none space-y-1.5 p-0 text-[12px]">
        <li
          v-for="mat in materials"
          :key="mat.id"
          class="flex items-center justify-between gap-2 border border-black/10 bg-[#f6f5f2] px-3 py-2"
        >
          <span class="font-semibold text-[#0b0b0b]">{{ mat.label }}</span>
          <a
            v-if="mat.kind === 'GOOGLE_DRIVE' && safeHttps(mat.urlOrFileName)"
            :href="safeHttps(mat.urlOrFileName)!"
            target="_blank"
            rel="noopener noreferrer"
            class="text-[11px] font-bold text-[#ed3541] no-underline hover:underline"
          >
            BUKA DRIVE ↗
          </a>
          <span v-else class="text-[11px] text-[#525252]">{{ mat.urlOrFileName }} · referensi berkas lokal</span>
        </li>
      </ul>
    </div>
  </div>
</template>

