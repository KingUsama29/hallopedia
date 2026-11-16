<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { useAssistantWidget } from '~/composables/useAssistantWidget'
import { useOrderDraft } from '~/composables/useOrderDraft'

const {
  adminContact,
  adminMessageInput,
  adminInquiries,
  focusRequestCounter,
  focusRequestTarget,
  appendAdminInquiry,
} = useAssistantWidget()

const { orderDraft } = useOrderDraft()
const adminTextareaRef = ref<HTMLTextAreaElement | null>(null)

function focusAdminInputIfRequested() {
  if (focusRequestTarget.value !== 'ADMIN_TEXTAREA') return
  nextTick(() => adminTextareaRef.value?.focus())
}

function submitAdminInquiry() {
  const message = adminMessageInput.value.trim()
  if (!message) return
  appendAdminInquiry(message, orderDraft.value ? orderDraft.value.sourceName : null)
  adminMessageInput.value = ''
}

watch(focusRequestCounter, focusAdminInputIfRequested)
onMounted(focusAdminInputIfRequested)
</script>

<template>
  <div
    id="assistant-panel-admin"
    role="tabpanel"
    aria-labelledby="assistant-tab-admin"
    data-lenis-prevent
    class="editorial-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4"
  >
    <p class="mt-0 mb-3 text-[12px] leading-[1.55] text-[#ccc]">
      Punya permintaan khusus atau ingin dibantu Admin langsung? Kirim pertanyaan Anda di sini untuk menunggu jawaban Admin.
    </p>

    <div
      v-if="orderDraft"
      class="mb-3 border border-[#292929] bg-[#141414] px-3 py-2 text-[11px] text-[#ccc]"
    >
      <span class="font-bold text-[#ed3541]">PAKET TERKAIT:</span>
      {{ orderDraft.sourceName }} ({{ orderDraft.selectedAccountIds.length }} akun)
    </div>

    <form class="space-y-2.5" @submit.prevent="submitAdminInquiry">
      <div>
        <label for="floating-admin-contact" class="mb-1 block text-[10px] font-bold tracking-[1.2px] text-[#a3a3a3] uppercase">
          WHATSAPP / EMAIL (OPSIONAL)
        </label>
        <input
          id="floating-admin-contact"
          v-model="adminContact"
          type="text"
          placeholder="Contoh: 0812xxxx atau email Anda"
          class="min-h-[44px] w-full border border-[#292929] bg-[#141414] px-3 text-[13px] text-white placeholder-[#888888] focus:border-[#ed3541] focus:outline-none max-[700px]:text-[16px]"
        />
      </div>

      <div>
        <label for="floating-admin-message" class="mb-1 block text-[10px] font-bold tracking-[1.2px] text-[#a3a3a3] uppercase">
          PESAN UNTUK ADMIN
        </label>
        <textarea
          id="floating-admin-message"
          ref="adminTextareaRef"
          v-model="adminMessageInput"
          rows="3"
          placeholder="Tulis pertanyaan atau detail kampanye Anda untuk Admin..."
          class="w-full resize-none border border-[#292929] bg-[#141414] p-3 text-[13px] text-white placeholder-[#888888] focus:border-[#ed3541] focus:outline-none max-[700px]:text-[16px]"
        ></textarea>
      </div>

      <button
        type="submit"
        :disabled="!adminMessageInput.trim()"
        class="min-h-[44px] w-full cursor-pointer bg-[#ed3541] px-4 text-[11px] font-bold tracking-[1.4px] text-white uppercase transition-colors hover:bg-[#ff4754] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        KIRIM KE ADMIN &amp; TUNGGU BALASAN
      </button>
    </form>

    <div v-if="adminInquiries.length > 0" class="mt-4 border-t border-[#292929] pt-3">
      <div class="mb-2 text-[10px] font-bold tracking-[1.4px] text-[#a3a3a3] uppercase">
        PERTANYAAN TERKIRIM ({{ adminInquiries.length }})
      </div>
      <div class="space-y-2">
        <div
          v-for="item in adminInquiries"
          :key="item.id"
          class="border border-[#292929] bg-[#141414] p-3 text-[12px]"
        >
          <div class="flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase">
            <span class="inline-flex items-center gap-1.5 font-bold text-[#ed3541]">
              <span class="h-[6px] w-[6px] rounded-full bg-[#ed3541]" aria-hidden="true"></span>
              MENUNGGU BALASAN ADMIN
            </span>
            <span class="text-[#a3a3a3]">{{ item.createdAtLabel }}</span>
          </div>
          <p class="mt-1.5 mb-0 leading-[1.5] text-white">{{ item.message }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

