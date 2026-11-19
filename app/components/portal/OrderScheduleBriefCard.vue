<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import OrderBriefReadSummary from '~/components/portal/OrderBriefReadSummary.vue'
import OrderMaterialsEditor from '~/components/portal/OrderMaterialsEditor.vue'
import WitaDateTimePicker from '~/components/portal/WitaDateTimePicker.vue'
import { useOrderPortal } from '~/composables/useOrderPortal'
import {
  formatIndonesianFullDateTime,
  getLocalTodayIsoDate,
  sanitizeGoogleDriveOrHttpsUrl,
  type OrderBriefSpec,
  type OrderMaterialItem,
  type OrderRecord,
} from '~/data/orders'
import { buildInitialBriefDraft, canSubmitOrderBrief } from '~/data/order-workspace'

const props = defineProps<{
  order: OrderRecord
}>()

const { saveOrderBrief } = useOrderPortal()

const todayIsoDate = computed(() => getLocalTodayIsoDate())
const canSubmit = computed(() => canSubmitOrderBrief(props.order))

const isEditing = ref(false)
const draftBrief = ref<OrderBriefSpec>(buildInitialBriefDraft(props.order))
const draftMaterials = ref<OrderMaterialItem[]>([...props.order.materials])
const briefError = ref('')
const briefSuccessNotice = ref('')
const briefErrorRef = ref<HTMLElement | null>(null)
const materialsEditorRef = ref<InstanceType<typeof OrderMaterialsEditor> | null>(null)

function syncDraftFromOrder(editing: boolean = !props.order.brief && canSubmit.value) {
  draftBrief.value = buildInitialBriefDraft(props.order)
  draftMaterials.value = [...props.order.materials]
  isEditing.value = editing
}

function toggleEditMode(editing: boolean) {
  briefError.value = ''
  briefSuccessNotice.value = ''
  syncDraftFromOrder(editing)
}

watch(
  [() => props.order.id, () => props.order.brief, () => props.order.status],
  () => syncDraftFromOrder(),
  { immediate: true },
)
watch(() => props.order.id, () => {
  briefError.value = ''
  briefSuccessNotice.value = ''
})

const formattedInitialSchedule = computed(() => {
  const pref = props.order.schedulePreference
  return formatIndonesianFullDateTime(
    pref?.preferredDate ?? props.order.targetPublishDate,
    pref?.preferredTimeWita ?? null,
  )
})

const initialVisitLocation = computed(() =>
  props.order.schedulePreference?.serviceType === 'VISIT_PRODUCTION'
    ? props.order.schedulePreference.meetingLocation.trim()
    : '',
)

const safeInitialVisitMaps = computed(() => {
  if (props.order.schedulePreference?.serviceType !== 'VISIT_PRODUCTION') return null
  const raw = props.order.schedulePreference.meetingMapsUrl
  return raw ? sanitizeGoogleDriveOrHttpsUrl(raw) : null
})

async function showValidationError(message: string) {
  briefError.value = message
  await nextTick()
  briefErrorRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  briefErrorRef.value?.focus({ preventScroll: true })
}

async function handleSubmitBrief() {
  briefError.value = ''
  briefSuccessNotice.value = ''
  const flushed = materialsEditorRef.value?.flushPendingDriveInput()
  if (flushed && !flushed.ok) return showValidationError(flushed.error)
  const result = saveOrderBrief(props.order.id, {
    brief: draftBrief.value,
    materials: flushed ? flushed.nextMaterials : draftMaterials.value,
  })
  if (!result.ok) return showValidationError(result.error)
  isEditing.value = false
  briefSuccessNotice.value = 'Brief & materi kampanye berhasil disimpan ke pesanan Anda.'
}
</script>

<template>
  <div class="space-y-6">
    <!-- Ringkasan Kontak & Preferensi Awal dari Checkout -->
    <div class="border border-black/15 bg-white p-6">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-black/10 pb-3">
        <h2 class="m-0 text-[12px] font-bold tracking-[1.5px] uppercase">
          JADWAL, LOKASI &amp; KONTAK KOORDINASI
        </h2>
        <span class="text-[10px] font-bold tracking-[1.2px] text-[#525252] uppercase">
          ZONA WAKTU WITA
        </span>
      </div>

      <dl class="m-0 space-y-3 text-[13px]">
        <div class="grid gap-1 sm:grid-cols-[200px_1fr] sm:items-baseline">
          <dt class="text-[11px] font-bold tracking-[1px] text-[#525252] uppercase">WhatsApp Koordinasi</dt>
          <dd class="m-0 font-bold text-[#0b0b0b] tabular-nums">{{ order.customerWhatsapp }}</dd>
        </div>
        <div class="grid gap-1 sm:grid-cols-[200px_1fr] sm:items-baseline">
          <dt class="text-[11px] font-bold tracking-[1px] text-[#525252] uppercase">
            {{ order.serviceType === 'VISIT_PRODUCTION' ? 'Jadwal Pertemuan Visit' : 'Target Jadwal Posting' }}
          </dt>
          <dd class="m-0 font-bold text-[#0b0b0b]">
            <span v-if="formattedInitialSchedule">{{ formattedInitialSchedule }}</span>
            <span v-else class="font-normal text-[#525252]">Fleksibel (disepakati via brief atau Admin)</span>
          </dd>
        </div>
        <div v-if="order.serviceType === 'VISIT_PRODUCTION'" class="grid gap-1 sm:grid-cols-[200px_1fr] sm:items-baseline">
          <dt class="text-[11px] font-bold tracking-[1px] text-[#525252] uppercase">Lokasi Pertemuan Visit</dt>
          <dd class="m-0 text-[#0b0b0b]">
            <span v-if="initialVisitLocation" class="font-semibold">{{ initialVisitLocation }}</span>
            <span v-else class="text-[#525252]">Dilengkapi pada formulir brief di bawah.</span>
            <a
              v-if="safeInitialVisitMaps"
              :href="safeInitialVisitMaps"
              target="_blank"
              rel="noopener noreferrer"
              class="ml-2 inline-flex items-center gap-1 text-[10px] font-bold tracking-[1px] text-[#ed3541] uppercase no-underline hover:underline"
            >
              GOOGLE MAPS ↗
            </a>
          </dd>
        </div>
        <div v-if="order.initialNotes" class="grid gap-1 border-t border-black/10 pt-3 sm:grid-cols-[200px_1fr] sm:items-baseline">
          <dt class="text-[11px] font-bold tracking-[1px] text-[#525252] uppercase">Catatan Awal</dt>
          <dd class="m-0 text-[#0b0b0b]">{{ order.initialNotes }}</dd>
        </div>
      </dl>
    </div>

    <!-- Workspace Pengiriman Brief & Materi Promosi -->
    <div class="border border-black/15 bg-white p-6">
      <div class="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-black/10 pb-3">
        <div>
          <div class="text-[10px] font-bold tracking-[1.6px] text-[#ed3541] uppercase">
            BRIEF KAMPANYE &amp; LAMPIRAN MATERI
          </div>
          <h2 class="mt-1.5 mb-0 text-[20px] font-extrabold tracking-[-0.03em] text-[#0b0b0b]">
            {{ order.serviceType === 'VISIT_PRODUCTION' ? 'Detail Kunjungan Produksi & Lokasi' : 'Materi Caption, Google Drive & Jadwal Tayang' }}
          </h2>
        </div>

        <button
          v-if="order.brief && canSubmit && !isEditing"
          type="button"
          class="min-h-[40px] cursor-pointer border border-[#0b0b0b] bg-transparent px-3.5 py-2 text-[10px] font-bold tracking-[1.2px] text-[#0b0b0b] uppercase transition-colors hover:bg-[#0b0b0b] hover:text-white max-lg:min-h-[44px]"
          @click="toggleEditMode(true)"
        >
          UBAH BRIEF
        </button>
      </div>

      <p
        v-if="briefSuccessNotice"
        role="status"
        aria-live="polite"
        class="mt-0 mb-4 border-l-2 border-[#0b0b0b] bg-[#f6f5f2] px-4 py-3 text-[12px] font-semibold text-[#0b0b0b]"
      >
        {{ briefSuccessNotice }}
      </p>

      <!-- Mode Ringkasan Brief Tersimpan -->
      <OrderBriefReadSummary
        v-if="order.brief && !isEditing"
        :brief="order.brief"
        :materials="order.materials"
      />

      <!-- Gate Terkunci Saat Status Tidak Mengizinkan Pengiriman Brief -->
      <div
        v-else-if="!canSubmit"
        class="border-l-2 border-[#ed3541] bg-[#0b0b0b] p-5 text-[13px] text-white"
      >
        <div class="text-[10px] font-bold tracking-[1.4px] text-[#ed3541] uppercase">
          {{ order.status === 'PENDING_PAYMENT' ? 'MENUNGGU KONFIRMASI PEMBAYARAN AWAL' : 'PENGIRIMAN BRIEF DITUTUP' }}
        </div>
        <p class="mt-2 mb-0 leading-[1.6] text-[#ccc]">
          <template v-if="order.status === 'PENDING_PAYMENT'">
            Formulir pengiriman brief, tautan Google Drive, dan penguncian jadwal terbuka otomatis setelah pembayaran DP 50% atau Penuh diselesaikan melalui tombol <strong class="text-white">BAYAR SEKARANG</strong> di atas.
          </template>
          <template v-else-if="order.status === 'PUBLISHED'">
            Kampanye telah berstatus <strong class="text-white">SUDAH TAYANG</strong> sehingga formulir brief tidak lagi menerima perubahan baru.
          </template>
          <template v-else>
            Pesanan tidak aktif sehingga pengiriman brief ditutup. Hubungi Admin melalui Live Chat bila memerlukan bantuan.
          </template>
        </p>
      </div>

      <!-- Formulir Kirim / Edit Brief & Materi -->
      <form v-else class="space-y-5" @submit.prevent="handleSubmitBrief">
        <p
          v-if="briefError"
          ref="briefErrorRef"
          tabindex="-1"
          role="alert"
          aria-live="polite"
          class="m-0 border-l-2 border-[#ed3541] bg-[#0b0b0b] px-4 py-3 text-[12px] text-white"
        >
          {{ briefError }}
        </p>

        <template v-if="draftBrief.serviceType === 'DIRECT_POST'">
          <div>
            <label for="brief-caption" class="mb-1.5 block text-[10px] font-bold tracking-[1.3px] text-[#525252] uppercase">
              CAPTION UTAMA PUBLIKASI *
            </label>
            <textarea
              id="brief-caption"
              v-model="draftBrief.caption"
              rows="4"
              required
              placeholder="Tulis teks caption, promo, harga, atau ajakan transaksi yang ingin ditayangkan..."
              class="w-full resize-y border border-black/20 bg-white p-3.5 text-[13px] text-[#0b0b0b] focus:border-[#ed3541] focus:outline-none max-[700px]:text-[16px]"
            ></textarea>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label for="brief-mentions" class="mb-1.5 block text-[10px] font-bold tracking-[1.3px] text-[#525252] uppercase">
                TAG AKUN COLLAB / HASHTAG (OPSIONAL)
              </label>
              <input
                id="brief-mentions"
                v-model="draftBrief.mentionHandles"
                type="text"
                placeholder="Contoh: @borneorasa.id #KulinerSamarinda"
                class="min-h-[46px] w-full border border-black/20 bg-white px-3.5 text-[13px] text-[#0b0b0b] focus:border-[#ed3541] focus:outline-none max-[700px]:text-[16px]"
              />
            </div>
            <div>
              <label for="brief-cta" class="mb-1.5 block text-[10px] font-bold tracking-[1.3px] text-[#525252] uppercase">
                TAUTAN CTA / WHATSAPP TUJUAN (OPSIONAL)
              </label>
              <input
                id="brief-cta"
                v-model="draftBrief.ctaLink"
                type="url"
                placeholder="https://wa.me/62812..."
                class="min-h-[46px] w-full border border-black/20 bg-white px-3.5 text-[13px] text-[#0b0b0b] focus:border-[#ed3541] focus:outline-none max-[700px]:text-[16px]"
              />
            </div>
          </div>

          <WitaDateTimePicker
            date-id="brief-direct-date"
            time-id="brief-direct-time"
            v-model:date="draftBrief.preferredPublishDate"
            :time-wita="draftBrief.preferredPublishTimeWita ?? ''"
            :min-date="todayIsoDate"
            date-label="TANGGAL TAYANG POSTINGAN"
            time-label="JAM TAYANG (WITA)"
            preview-label="TARGET JADWAL TAYANG KONTEN"
            @update:time-wita="draftBrief.preferredPublishTimeWita = $event"
          />

          <div>
            <label for="brief-direct-notes" class="mb-1.5 block text-[10px] font-bold tracking-[1.3px] text-[#525252] uppercase">
              CATATAN TAMBAHAN PENAYANGAN
            </label>
            <input
              id="brief-direct-notes"
              v-model="draftBrief.notes"
              type="text"
              placeholder="Contoh: Utamakan slide pertama foto menu terbaik"
              class="min-h-[46px] w-full border border-black/20 bg-white px-3.5 text-[13px] text-[#0b0b0b] focus:border-[#ed3541] focus:outline-none max-[700px]:text-[16px]"
            />
          </div>
        </template>

        <template v-else-if="draftBrief.serviceType === 'VISIT_PRODUCTION'">
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label for="brief-visit-location" class="mb-1.5 block text-[10px] font-bold tracking-[1.3px] text-[#525252] uppercase">
                ALAMAT / LOKASI PERTEMUAN VISIT *
              </label>
              <input
                id="brief-visit-location"
                v-model="draftBrief.locationAddress"
                type="text"
                required
                placeholder="Contoh: Outlet Borneo Rasa, Jl. Antasari No. 12, Samarinda"
                class="min-h-[46px] w-full border border-black/20 bg-white px-3.5 text-[13px] text-[#0b0b0b] focus:border-[#ed3541] focus:outline-none max-[700px]:text-[16px]"
              />
            </div>
            <div>
              <label for="brief-visit-maps" class="mb-1.5 block text-[10px] font-bold tracking-[1.3px] text-[#525252] uppercase">
                TAUTAN GOOGLE MAPS LOKASI (OPSIONAL)
              </label>
              <input
                id="brief-visit-maps"
                :value="draftBrief.meetingMapsUrl ?? ''"
                type="url"
                placeholder="https://maps.google.com/..."
                class="min-h-[46px] w-full border border-black/20 bg-white px-3.5 text-[13px] text-[#0b0b0b] focus:border-[#ed3541] focus:outline-none max-[700px]:text-[16px]"
                @input="draftBrief.meetingMapsUrl = ($event.target as HTMLInputElement).value"
              />
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label for="brief-pic-name" class="mb-1.5 block text-[10px] font-bold tracking-[1.3px] text-[#525252] uppercase">
                NAMA PIC LOKASI *
              </label>
              <input
                id="brief-pic-name"
                v-model="draftBrief.picName"
                type="text"
                required
                placeholder="Nama perwakilan yang ditemui di lokasi"
                class="min-h-[46px] w-full border border-black/20 bg-white px-3.5 text-[13px] text-[#0b0b0b] focus:border-[#ed3541] focus:outline-none max-[700px]:text-[16px]"
              />
            </div>
            <div>
              <label for="brief-pic-phone" class="mb-1.5 block text-[10px] font-bold tracking-[1.3px] text-[#525252] uppercase">
                WHATSAPP PIC LOKASI *
              </label>
              <input
                id="brief-pic-phone"
                v-model="draftBrief.picPhone"
                type="tel"
                required
                placeholder="0812xxxxxxxx"
                class="min-h-[46px] w-full border border-black/20 bg-white px-3.5 text-[13px] text-[#0b0b0b] focus:border-[#ed3541] focus:outline-none max-[700px]:text-[16px]"
              />
            </div>
          </div>

          <WitaDateTimePicker
            date-id="brief-visit-date"
            time-id="brief-visit-time"
            required
            v-model:date="draftBrief.preferredVisitDate"
            :time-wita="draftBrief.preferredVisitTimeWita ?? ''"
            :min-date="todayIsoDate"
            date-label="TANGGAL PERTEMUAN VISIT"
            time-label="JAM KETEMUAN (WITA)"
            preview-label="JADWAL PERTEMUAN TIM PRODUKSI & KLIEN"
            @update:time-wita="draftBrief.preferredVisitTimeWita = $event"
          />

          <div>
            <label for="brief-visit-highlights" class="mb-1.5 block text-[10px] font-bold tracking-[1.3px] text-[#525252] uppercase">
              ARAHAN VIDEO &amp; POIN PRODUK YANG DISOROT
            </label>
            <textarea
              id="brief-visit-highlights"
              v-model="draftBrief.keyHighlights"
              rows="3"
              placeholder="Contoh: Fokus proses penyajian menu kopi, suasana interior, & promo diskon grand opening"
              class="w-full resize-y border border-black/20 bg-white p-3.5 text-[13px] text-[#0b0b0b] focus:border-[#ed3541] focus:outline-none max-[700px]:text-[16px]"
            ></textarea>
          </div>
        </template>

        <OrderMaterialsEditor ref="materialsEditorRef" v-model:materials="draftMaterials" :disabled="!canSubmit" />

        <div class="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            :disabled="!canSubmit"
            class="flex min-h-[48px] flex-1 cursor-pointer items-center justify-between bg-[#ed3541] px-5 py-3 text-[11px] font-bold tracking-[1.4px] text-white uppercase transition-colors hover:bg-[#ff4754] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b0b0b]"
          >
            <span>{{ order.brief ? 'SIMPAN PERUBAHAN BRIEF & JADWAL' : 'KIRIM BRIEF & JADWAL SEKARANG' }}</span>
            <span aria-hidden="true">→</span>
          </button>

          <button
            v-if="order.brief && isEditing"
            type="button"
            class="min-h-[48px] cursor-pointer border border-black/25 bg-transparent px-4 py-3 text-[11px] font-bold tracking-[1.2px] text-[#0b0b0b] uppercase hover:border-[#0b0b0b]"
            @click="toggleEditMode(false)"
          >
            BATAL
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
