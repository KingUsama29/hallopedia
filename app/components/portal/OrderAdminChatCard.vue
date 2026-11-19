<script setup lang="ts">
import { computed, h, nextTick, ref, watch } from 'vue'
import { useOrderPortal } from '~/composables/useOrderPortal'
import type { AdminPreviewAction } from '~/data/order-chat-preview'
import { formatShortDateTime, type OrderRecord } from '~/data/orders'

const props = defineProps<{
  order: OrderRecord
}>()

const { sendOrderChatMessage, markOrderMessagesAsRead, triggerPreviewAdminUpdate } = useOrderPortal()

const isChatOpen = ref(false)
const chatInput = ref('')
const chatError = ref('')
const previewError = ref('')
const previewAdminText = ref('')
const previewPublishedUrl = ref('https://www.instagram.com/p/HallopediaPromo/')
const chatInputRef = ref<HTMLTextAreaElement | null>(null)
const messageLogRef = ref<HTMLElement | null>(null)

const QUICK_ORDER_PROMPTS = [
  'Brief & tautan materi Google Drive sudah saya lengkapi.',
  'Mohon konfirmasi slot jadwal tayang / pertemuan WITA.',
  'Ada penyesuaian kecil pada caption, mohon dicek Admin.',
] as const

const DOUBLE_CHECK_PATHS = [
  'M1.5 6.5L4.8 9.8L11.2 2.2',
  'M6.8 6.5L10.1 9.8L16.5 2.2',
] as const

function ChatDoubleCheck(propsCheck: { read: boolean }) {
  return h(
    'svg',
    {
      viewBox: '0 0 18 12',
      width: '16',
      height: '11',
      fill: 'none',
      'aria-hidden': 'true',
      class: ['transition-colors duration-200', propsCheck.read ? 'text-[#ed3541]' : 'text-[#666666]'],
    },
    DOUBLE_CHECK_PATHS.map((d) =>
      h('path', { d, stroke: 'currentColor', 'stroke-width': '1.9', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
    ),
  )
}

const unreadCount = computed(
  () => props.order.messages.filter((m) => m.senderRole === 'ADMIN' && !m.readByCustomer).length,
)

const unreadByAdminCount = computed(
  () => props.order.messages.filter((m) => m.senderRole === 'CUSTOMER' && !m.readByAdmin).length,
)

const lastMessage = computed(
  () => props.order.messages[props.order.messages.length - 1] ?? null,
)

function scrollLogToBottom() {
  nextTick(() => {
    const el = messageLogRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

watch(
  () => props.order.id,
  () => {
    isChatOpen.value = false
    chatError.value = ''
    previewError.value = ''
  },
)

function openChat(options?: { focusInput?: boolean }) {
  isChatOpen.value = true
  markOrderMessagesAsRead(props.order.id)
  scrollLogToBottom()
  if (options?.focusInput) {
    nextTick(() => chatInputRef.value?.focus())
  }
}

function closeChat() {
  isChatOpen.value = false
}

defineExpose({
  openChat,
})

function handleAcknowledgeUnread() {
  markOrderMessagesAsRead(props.order.id)
}

function applyQuickPrompt(prompt: string) {
  handleAcknowledgeUnread()
  chatInput.value = prompt
  nextTick(() => chatInputRef.value?.focus())
}

function handleSendChat() {
  chatError.value = ''
  handleAcknowledgeUnread()
  const res = sendOrderChatMessage(props.order.id, chatInput.value)
  if (!res.ok) {
    chatError.value = res.error
    return
  }
  chatInput.value = ''
  scrollLogToBottom()
}

function runPreviewAction(action: AdminPreviewAction, resetInput?: boolean) {
  previewError.value = ''
  const res = triggerPreviewAdminUpdate(props.order.id, action)
  if (!res.ok) {
    previewError.value = res.error
    return
  }
  if (resetInput) previewAdminText.value = ''
  if (action.type !== 'MARK_CUSTOMER_MESSAGES_READ') scrollLogToBottom()
}
</script>

<template>
  <div class="border border-black/15 bg-white">
    <header class="border-b border-black/10 bg-[#0b0b0b] px-5 py-4 text-white">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2 text-[10px] font-bold tracking-[1.6px] text-[#ed3541] uppercase">
          <span class="h-[6px] w-[6px] rounded-full bg-[#ed3541]" aria-hidden="true"></span>
          <span>LIVE CHAT ADMIN · {{ order.orderCode }}</span>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            v-if="unreadCount > 0 && isChatOpen"
            type="button"
            class="min-h-[30px] cursor-pointer bg-[#ed3541] px-2.5 py-1 text-[9px] font-black tracking-[1px] text-white uppercase focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white max-lg:min-h-[44px]"
            @click="handleAcknowledgeUnread"
          >
            {{ unreadCount }} PESAN BARU · TANDAI DIBACA
          </button>
          <span
            v-else-if="unreadCount > 0"
            class="bg-[#ed3541] px-2 py-1 text-[9px] font-black tracking-[1px] text-white uppercase tabular-nums"
          >
            {{ unreadCount }} PESAN BARU
          </span>

          <button
            v-if="isChatOpen"
            type="button"
            class="min-h-[30px] cursor-pointer border border-white/25 bg-transparent px-2.5 py-1 text-[9px] font-bold tracking-[1px] text-white uppercase transition-colors hover:border-[#ed3541] hover:text-[#ed3541] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white max-lg:min-h-[44px]"
            @click="closeChat"
          >
            TUTUP CHAT ×
          </button>
        </div>
      </div>
      <h2 class="mt-1.5 mb-0 text-[16px] font-extrabold tracking-[-0.02em] text-white">
        Koordinasi Langsung dengan Admin Operasional
      </h2>
    </header>

    <!-- Ringkasan Tertutup Default (Opsi B: Fokus Visual & Status Unread Deterministik) -->
    <div v-if="!isChatOpen" class="space-y-4 p-4">
      <div v-if="lastMessage" class="border-l-2 border-black/25 bg-[#f6f5f2] px-3.5 py-2.5">
        <div class="flex items-center justify-between gap-2 text-[10px] font-bold tracking-[1px] text-[#525252] uppercase">
          <span class="truncate">{{ lastMessage.senderName }}</span>
          <span class="flex shrink-0 items-center gap-1 tabular-nums">
            <span>{{ formatShortDateTime(lastMessage.sentAt) }}</span>
            <ChatDoubleCheck v-if="lastMessage.senderRole === 'CUSTOMER'" :read="lastMessage.readByAdmin" />
          </span>
        </div>
        <p class="mt-1 mb-0 line-clamp-2 text-[12px] leading-[1.5] text-[#0b0b0b]">
          {{ lastMessage.text }}
        </p>
      </div>
      <p v-else class="m-0 text-[12px] leading-[1.5] text-[#525252]">
        Belum ada percakapan untuk pesanan ini. Buka chat untuk berkoordinasi dengan Admin.
      </p>

      <button
        type="button"
        :aria-expanded="false"
        :aria-controls="`order-admin-chat-panel-${order.id}`"
        class="flex min-h-[46px] w-full cursor-pointer items-center justify-between px-4 py-2.5 text-[11px] font-bold tracking-[1.4px] text-white uppercase transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541]"
        :class="unreadCount > 0 ? 'bg-[#ed3541] hover:bg-[#ff4754]' : 'bg-[#0b0b0b] hover:bg-[#ed3541]'"
        @click="openChat()"
      >
        <span>
          {{ unreadCount > 0 ? `BUKA & BACA PESAN BARU (${unreadCount})` : `BUKA LIVE CHAT ADMIN (${order.messages.length})` }}
        </span>
        <span aria-hidden="true">→</span>
      </button>
    </div>

    <div v-else :id="`order-admin-chat-panel-${order.id}`">
      <!-- Log Percakapan Terikat Pesanan -->
    <div
      ref="messageLogRef"
      role="log"
      aria-live="polite"
      aria-label="Riwayat Live Chat Admin pesanan"
      class="editorial-scrollbar max-h-[340px] space-y-3 overflow-y-auto bg-[#f6f5f2] p-4"
    >
      <div
        v-for="msg in order.messages"
        :key="msg.id"
        class="flex flex-col"
        :class="msg.senderRole === 'CUSTOMER' ? 'items-end' : 'items-start'"
      >
        <div
          class="max-w-[90%] border px-3.5 py-2.5 text-[12px] leading-[1.55] whitespace-pre-line"
          :class="
            msg.senderRole === 'CUSTOMER'
              ? 'border-[#ed3541] bg-[#ed3541] text-white'
              : msg.senderRole === 'ADMIN'
                ? 'border-[#0b0b0b] bg-[#0b0b0b] text-white'
                : 'border-black/15 bg-white text-[#0b0b0b]'
          "
        >
          {{ msg.text }}
        </div>
        <div class="mt-1 flex items-center gap-1.5 text-[10px] text-[#525252]">
          <span class="font-semibold">{{ msg.senderName }}</span>
          <span>· {{ formatShortDateTime(msg.sentAt) }}</span>
          <span
            v-if="msg.senderRole === 'CUSTOMER'"
            class="inline-flex items-center"
            :title="msg.readByAdmin ? 'Sudah dibaca Admin' : 'Terkirim · Belum dibaca Admin'"
          >
            <ChatDoubleCheck :read="msg.readByAdmin" />
            <span class="sr-only">{{ msg.readByAdmin ? 'Sudah dibaca Admin' : 'Belum dibaca Admin' }}</span>
          </span>
          <span
            v-if="msg.senderRole === 'ADMIN' && !msg.readByCustomer"
            class="bg-[#ed3541] px-1 text-[8px] font-black text-white uppercase"
          >
            BARU
          </span>
        </div>
      </div>
    </div>

    <!-- Template Pesan Cepat & Input -->
    <div class="space-y-3 border-t border-black/10 p-4">
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="(prompt, idx) in QUICK_ORDER_PROMPTS"
          :key="idx"
          type="button"
          class="min-h-[32px] cursor-pointer border border-black/20 bg-[#f6f5f2] px-2.5 py-1 text-left text-[10px] font-semibold text-[#0b0b0b] transition-colors hover:border-[#ed3541] hover:text-[#ed3541] max-lg:min-h-[44px]"
          @click="applyQuickPrompt(prompt)"
        >
          {{ prompt }}
        </button>
      </div>

      <p
        v-if="chatError"
        role="alert"
        aria-live="polite"
        class="m-0 border-l-2 border-[#ed3541] bg-[#0b0b0b] px-3 py-2 text-[11px] text-white"
      >
        {{ chatError }}
      </p>

      <form class="space-y-2.5" @submit.prevent="handleSendChat">
        <label for="order-admin-chat-input" class="sr-only">Tulis pesan untuk Admin pesanan ini</label>
        <textarea
          id="order-admin-chat-input"
          ref="chatInputRef"
          v-model="chatInput"
          rows="2"
          placeholder="Tulis pesan koordinasi ke Admin untuk pesanan ini..."
          class="w-full resize-y border border-black/20 bg-white p-3 text-[13px] text-[#0b0b0b] focus:border-[#ed3541] focus:outline-none max-[700px]:text-[16px]"
          @focus="handleAcknowledgeUnread"
        ></textarea>
        <button
          type="submit"
          :disabled="!chatInput.trim()"
          class="flex min-h-[44px] w-full cursor-pointer items-center justify-between bg-[#0b0b0b] px-4 py-2.5 text-[11px] font-bold tracking-[1.4px] text-white uppercase transition-colors hover:bg-[#ed3541] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541]"
        >
          <span>KIRIM PESAN KE ADMIN</span>
          <span aria-hidden="true">→</span>
        </button>
      </form>
    </div>

    <!-- Panel Lipat Pratinjau Respons Admin -->
    <details class="border-t border-black/15 bg-[#f6f5f2] px-4 py-3 text-[11px]">
      <summary class="cursor-pointer font-bold tracking-[1.1px] text-[#525252] uppercase hover:text-[#0b0b0b]">
        PRATINJAU TANGGAPAN ADMIN (UJI ALUR)
      </summary>
      <div class="mt-3 space-y-2.5 border-t border-black/10 pt-3">
        <p
          v-if="previewError"
          role="alert"
          class="m-0 border-l-2 border-[#ed3541] bg-[#0b0b0b] px-3 py-2 text-[11px] text-white"
        >
          {{ previewError }}
        </p>

        <div class="flex gap-2">
          <input
            :id="`preview-admin-reply-${order.id}`"
            v-model="previewAdminText"
            name="previewAdminReply"
            type="text"
            aria-label="Teks balasan admin pratinjau"
            placeholder="Balasan admin (kosong = otomatis)..."
            class="min-h-[40px] min-w-0 flex-1 border border-black/20 bg-white px-2.5 text-[12px] text-[#0b0b0b] max-[700px]:text-[16px]"
          />
          <button
            type="button"
            class="min-h-[40px] shrink-0 cursor-pointer border border-[#0b0b0b] bg-[#0b0b0b] px-3 text-[10px] font-bold tracking-[1px] text-white uppercase hover:bg-[#ed3541] max-lg:min-h-[44px]"
            @click="runPreviewAction({ type: 'REPLY_CHAT', text: previewAdminText }, true)"
          >
            BALAS CHAT
          </button>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            :disabled="unreadByAdminCount === 0"
            class="min-h-[38px] cursor-pointer border border-black/25 bg-white px-3 py-1.5 text-[10px] font-bold tracking-[1px] text-[#0b0b0b] uppercase hover:border-[#ed3541] hover:text-[#ed3541] disabled:cursor-not-allowed disabled:opacity-40 max-lg:min-h-[44px]"
            @click="runPreviewAction({ type: 'MARK_CUSTOMER_MESSAGES_READ' })"
          >
            TANDAI DIBACA ADMIN ({{ unreadByAdminCount }})
          </button>
          <button
            type="button"
            class="min-h-[38px] cursor-pointer border border-black/25 bg-white px-3 py-1.5 text-[10px] font-bold tracking-[1px] text-[#0b0b0b] uppercase hover:border-[#ed3541] hover:text-[#ed3541] max-lg:min-h-[44px]"
            @click="runPreviewAction({ type: 'CONFIRM_SCHEDULE' })"
          >
            KONFIRMASI JADWAL (TERJADWAL)
          </button>
        </div>

        <div class="flex gap-2">
          <input
            :id="`preview-admin-url-${order.id}`"
            v-model="previewPublishedUrl"
            name="previewPublishedUrl"
            type="url"
            aria-label="URL bukti tayang Instagram"
            placeholder="https://www.instagram.com/p/..."
            class="min-h-[40px] min-w-0 flex-1 border border-black/20 bg-white px-2.5 text-[12px] text-[#0b0b0b] max-[700px]:text-[16px]"
          />
          <button
            type="button"
            class="min-h-[40px] shrink-0 cursor-pointer border border-[#ed3541] bg-[#ed3541] px-3 text-[10px] font-bold tracking-[1px] text-white uppercase hover:bg-[#ff4754] max-lg:min-h-[44px]"
            @click="runPreviewAction({ type: 'MARK_PUBLISHED', instagramUrl: previewPublishedUrl })"
          >
            TANDAI TAYANG
          </button>
        </div>
      </div>
    </details>
    </div>
  </div>
</template>

