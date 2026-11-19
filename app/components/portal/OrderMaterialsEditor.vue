<script setup lang="ts">
import { ref } from 'vue'
import { sanitizeGoogleDriveOrHttpsUrl, type OrderMaterialItem } from '~/data/orders'
import { createDriveMaterialItem, createLocalFileMaterialItem } from '~/data/order-workspace'

const props = withDefaults(
  defineProps<{
    materials: readonly OrderMaterialItem[]
    disabled?: boolean
  }>(),
  {
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:materials': [value: OrderMaterialItem[]]
}>()

const driveLabel = ref('')
const driveUrl = ref('')
const materialError = ref('')
const driveUrlInputRef = ref<HTMLInputElement | null>(null)

function handleLabelEnter() {
  if (props.disabled) return
  if (driveUrl.value.trim()) {
    handleAddDriveLink()
    return
  }
  driveUrlInputRef.value?.focus()
}

function handleAddDriveLink() {
  materialError.value = ''
  if (props.disabled) return
  const result = createDriveMaterialItem(driveLabel.value, driveUrl.value)
  if (!result.ok) {
    materialError.value = result.error
    return
  }
  emit('update:materials', [...props.materials, result.item])
  driveLabel.value = ''
  driveUrl.value = ''
}

function flushPendingDriveInput():
  | { ok: true; nextMaterials: OrderMaterialItem[] }
  | { ok: false; error: string } {
  materialError.value = ''
  const rawUrl = driveUrl.value.trim()
  const rawLabel = driveLabel.value.trim()
  if (!rawUrl && !rawLabel) {
    return { ok: true, nextMaterials: [...props.materials] }
  }
  if (!rawUrl && rawLabel) {
    const error =
      'Masukkan tautan Google Drive HTTPS untuk label aset yang Anda tulis, atau hapus teks label.'
    materialError.value = error
    return { ok: false, error }
  }
  const result = createDriveMaterialItem(driveLabel.value, driveUrl.value)
  if (!result.ok) {
    materialError.value = result.error
    return result
  }
  const nextMaterials = [...props.materials, result.item]
  emit('update:materials', nextMaterials)
  driveLabel.value = ''
  driveUrl.value = ''
  return { ok: true, nextMaterials }
}

defineExpose({
  flushPendingDriveInput,
})

function handleFileSelect(event: Event) {
  materialError.value = ''
  if (props.disabled) return
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return

  const nextItems = [...props.materials]
  for (const file of Array.from(files)) {
    const res = createLocalFileMaterialItem(file.name, file.size)
    if (!res.ok) {
      materialError.value = res.error
      continue
    }
    nextItems.push(res.item)
  }
  emit('update:materials', nextItems)
  input.value = ''
}

function removeMaterial(id: string) {
  if (props.disabled) return
  emit(
    'update:materials',
    props.materials.filter((item) => item.id !== id),
  )
}

function resolveSafeHref(raw: string): string | null {
  return sanitizeGoogleDriveOrHttpsUrl(raw)
}
</script>

<template>
  <div class="space-y-4 border border-black/15 bg-[#f6f5f2] p-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="text-[10px] font-bold tracking-[1.4px] text-[#0b0b0b] uppercase">
        MATERI PROMOSI &amp; TAUTAN GOOGLE DRIVE ({{ materials.length }})
      </div>
      <span class="text-[10px] text-[#525252]">Link HTTPS / Foto / Video / PDF</span>
    </div>

    <p
      v-if="materialError"
      role="alert"
      aria-live="polite"
      class="m-0 border-l-2 border-[#ed3541] bg-[#0b0b0b] px-3 py-2 text-[11px] text-white"
    >
      {{ materialError }}
    </p>

    <div class="grid gap-2.5 sm:grid-cols-[0.8fr_1.2fr_auto] sm:items-end">
      <div>
        <label for="material-drive-label" class="mb-1 block text-[10px] font-bold tracking-[1.1px] text-[#525252] uppercase">
          LABEL ASET
        </label>
        <input
          id="material-drive-label"
          v-model="driveLabel"
          :disabled="disabled"
          type="text"
          placeholder="Contoh: Folder Video HD"
          class="min-h-[44px] w-full border border-black/20 bg-white px-3 text-[13px] text-[#0b0b0b] focus:border-[#ed3541] focus:outline-none disabled:opacity-50 max-[700px]:text-[16px]"
          @keydown.enter.prevent="handleLabelEnter"
        />
      </div>

      <div>
        <label for="material-drive-url" class="mb-1 block text-[10px] font-bold tracking-[1.1px] text-[#525252] uppercase">
          TAUTAN GOOGLE DRIVE / LINK HTTPS
        </label>
        <input
          id="material-drive-url"
          ref="driveUrlInputRef"
          v-model="driveUrl"
          :disabled="disabled"
          type="url"
          placeholder="https://drive.google.com/drive/folders/..."
          class="min-h-[44px] w-full border border-black/20 bg-white px-3 text-[13px] text-[#0b0b0b] focus:border-[#ed3541] focus:outline-none disabled:opacity-50 max-[700px]:text-[16px]"
          @keydown.enter.prevent="handleAddDriveLink"
        />
      </div>

      <button
        type="button"
        :disabled="disabled || !driveUrl.trim()"
        class="min-h-[44px] cursor-pointer px-4 py-2 text-[10px] font-bold tracking-[1.2px] text-white uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541]"
        :class="driveUrl.trim() ? 'bg-[#ed3541] hover:bg-[#ff4754]' : 'bg-[#0b0b0b] hover:bg-[#ed3541]'"
        @click="handleAddDriveLink"
      >
        TAMBAH LINK +
      </button>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-3">
      <div>
        <label
          for="material-local-files"
          class="inline-flex min-h-[44px] cursor-pointer items-center gap-2 border border-black/25 bg-white px-3.5 py-2 text-[10px] font-bold tracking-[1.2px] text-[#0b0b0b] uppercase transition-colors hover:border-[#ed3541] hover:text-[#ed3541]"
          :class="disabled ? 'pointer-events-none opacity-45' : ''"
        >
          <span>LAMPIRKAN FILE DARI PERANGKAT</span>
          <span aria-hidden="true">+</span>
        </label>
        <input
          id="material-local-files"
          type="file"
          multiple
          accept="image/*,video/*,.pdf,.zip"
          :disabled="disabled"
          class="sr-only"
          @change="handleFileSelect"
        />
      </div>
      <span class="text-[11px] leading-[1.5] text-[#525252]">
        Nama berkas lokal disimpan sebagai daftar referensi sementara. Untuk file foto/video HD beresolusi penuh, sertakan Tautan Google Drive di atas.
      </span>
    </div>

    <div v-if="materials.length > 0" class="divide-y divide-black/10 border border-black/15 bg-white">
      <div
        v-for="item in materials"
        :key="item.id"
        class="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 text-[12px]"
      >
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <span
              class="px-1.5 py-0.5 text-[9px] font-bold tracking-[1px] uppercase"
              :class="item.kind === 'GOOGLE_DRIVE' ? 'bg-[#0b0b0b] text-white' : 'border border-black/25 text-[#0b0b0b]'"
            >
              {{ item.kind === 'GOOGLE_DRIVE' ? 'GOOGLE DRIVE' : 'BERKAS LOKAL' }}
            </span>
            <span class="font-bold text-[#0b0b0b]">{{ item.label }}</span>
          </div>
          <a
            v-if="item.kind === 'GOOGLE_DRIVE' && resolveSafeHref(item.urlOrFileName)"
            :href="resolveSafeHref(item.urlOrFileName)!"
            target="_blank"
            rel="noopener noreferrer"
            class="mt-1 block truncate text-[11px] font-semibold text-[#ed3541] no-underline hover:underline"
          >
            {{ item.urlOrFileName }} ↗
          </a>
          <div v-else class="mt-1 truncate text-[11px] text-[#525252]">
            {{ item.urlOrFileName }}
          </div>
        </div>

        <button
          v-if="!disabled"
          type="button"
          class="min-h-[36px] cursor-pointer border border-black/20 bg-transparent px-2.5 py-1 text-[10px] font-bold tracking-[1px] text-[#525252] uppercase transition-colors hover:border-[#ed3541] hover:text-[#ed3541] max-lg:min-h-[44px]"
          :aria-label="`Hapus materi ${item.label}`"
          @click="removeMaterial(item.id)"
        >
          HAPUS
        </button>
      </div>
    </div>
  </div>
</template>
