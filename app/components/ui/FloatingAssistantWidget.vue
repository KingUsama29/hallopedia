<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AssistantAdminTab from '~/components/ui/AssistantAdminTab.vue'
import { useAssistantWidget } from '~/composables/useAssistantWidget'
import { useCatalogData } from '~/composables/useCatalogData'
import { useOrderDraft } from '~/composables/useOrderDraft'
import {
  ASSISTANT_TEMPLATE_CHIPS,
  formatCurrentClock,
  resolveLocalAiReply,
  type AssistantTab,
  type AssistantTemplateChip,
} from '~/data/assistant-widget'
import { TRANSACTION_FAQ_ITEMS } from '~/data/homepage-faq'

const {
  isOpen,
  activeTab,
  aiInput,
  adminMessageInput,
  aiMessages,
  unreadBadgeCount,
  focusRequestCounter,
  focusRequestTarget,
  requestFocus,
  hydrateAdminInquiries,
  closeWidget,
  toggleWidget,
} = useAssistantWidget()

const aiInputRef = ref<HTMLInputElement | null>(null)
const triggerButtonRef = ref<HTMLButtonElement | null>(null)
const aiTabButtonRef = ref<HTMLButtonElement | null>(null)
const adminTabButtonRef = ref<HTMLButtonElement | null>(null)
const messageListRef = ref<HTMLElement | null>(null)

const { accounts, packages } = useCatalogData()
const { hydrateOrderDraft } = useOrderDraft()

function scrollMessagesToBottom() {
  nextTick(() => {
    const el = messageListRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

watch(focusRequestCounter, () => {
  const target = focusRequestTarget.value
  if (!target || target === 'ADMIN_TEXTAREA') return
  nextTick(() => {
    if (target === 'TRIGGER') {
      triggerButtonRef.value?.focus()
      return
    }
    const input = aiInputRef.value
    if (input) {
      input.focus()
      input.setSelectionRange(input.value.length, input.value.length)
    }
    scrollMessagesToBottom()
  })
})

function selectTab(tab: AssistantTab) {
  activeTab.value = tab
  requestFocus(tab === 'AI_CHAT' ? 'AI_INPUT' : 'ADMIN_TEXTAREA')
}

function handleTabKeydown(event: KeyboardEvent) {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
  event.preventDefault()
  const nextTab: AssistantTab = activeTab.value === 'AI_CHAT' ? 'ADMIN_CHAT' : 'AI_CHAT'
  activeTab.value = nextTab
  nextTick(() => {
    const tabBtn = nextTab === 'AI_CHAT' ? aiTabButtonRef.value : adminTabButtonRef.value
    tabBtn?.focus()
  })
}

function applyTemplateToInput(chip: AssistantTemplateChip) {
  aiInput.value = chip.promptText
  requestFocus('AI_INPUT')
}

function submitAiMessage() {
  const question = aiInput.value.trim()
  if (!question) return

  const now = formatCurrentClock()
  const reply = resolveLocalAiReply(question, accounts.value, packages.value, TRANSACTION_FAQ_ITEMS)
  aiMessages.value.push(
    { id: `user-${Date.now()}`, sender: 'USER', text: question, timeLabel: now },
    { id: `ai-${Date.now() + 1}`, sender: 'AI', text: reply.text, timeLabel: now, suggestAdminHandoff: reply.suggestAdminHandoff },
  )
  aiInput.value = ''
  scrollMessagesToBottom()
}

function handoffLastQuestionToAdmin() {
  const lastUserMsg = [...aiMessages.value].reverse().find((m) => m.sender === 'USER')
  if (lastUserMsg && !adminMessageInput.value.trim()) {
    adminMessageInput.value = lastUserMsg.text
  }
  selectTab('ADMIN_CHAT')
}

function handleEscapeKey(event: KeyboardEvent) {
  if (event.key === 'Escape' && isOpen.value) {
    event.preventDefault()
    closeWidget({ restoreFocus: true })
  }
}

onMounted(() => {
  hydrateOrderDraft(accounts.value, packages.value)
  hydrateAdminInquiries()
  window.addEventListener('keydown', handleEscapeKey)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleEscapeKey)
})
</script>

<template>
  <div class="fixed right-4 bottom-4 z-40 sm:right-6 sm:bottom-6">
    <!-- Panel Mengambang Ringkas -->
    <Transition
      enter-active-class="transition duration-200 ease-out motion-reduce:transition-none"
      enter-from-class="translate-y-2 opacity-0"
      leave-active-class="transition duration-150 ease-in motion-reduce:transition-none"
      leave-to-class="translate-y-2 opacity-0"
    >
      <section
        v-if="isOpen"
        id="floating-assistant-panel"
        aria-label="Asisten AI dan Chat Admin Hallopedia"
        class="mb-3 flex max-h-[72dvh] w-[calc(100vw-2rem)] flex-col overflow-hidden border border-white/25 bg-[#0b0b0b] text-white shadow-[0_18px_48px_rgba(0,0,0,0.65)] ring-1 ring-black/50 sm:w-[400px]"
      >
        <!-- Header Widget & Switcher 2 Tab -->
        <header class="shrink-0 border-b border-[#292929] bg-[#141414] px-4 pt-3.5 pb-3">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 text-[10px] font-bold tracking-[1.6px] text-[#a3a3a3] uppercase">
              <span class="h-[6px] w-[6px] rounded-full bg-[#ed3541]" aria-hidden="true"></span>
              BANTUAN CEPAT HALLOPEDIA
            </div>
            <button
              type="button"
              class="inline-flex min-h-[36px] cursor-pointer items-center border border-[#292929] px-2.5 text-[10px] font-bold tracking-[1.2px] text-[#ccc] uppercase transition-colors hover:border-white hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541] max-lg:min-h-[44px]"
              aria-label="Tutup jendela bantuan"
              @click="closeWidget({ restoreFocus: true })"
            >
              TUTUP ✕
            </button>
          </div>

          <div
            class="mt-3 grid grid-cols-2 gap-1.5"
            role="tablist"
            aria-label="Pilih mode bantuan"
            @keydown="handleTabKeydown"
          >
            <button
              id="assistant-tab-ai"
              ref="aiTabButtonRef"
              type="button"
              role="tab"
              aria-controls="assistant-panel-ai"
              :aria-selected="activeTab === 'AI_CHAT'"
              class="min-h-[40px] cursor-pointer border px-3 py-1.5 text-[10px] font-bold tracking-[1.3px] uppercase transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541] max-lg:min-h-[44px]"
              :class="activeTab === 'AI_CHAT' ? 'border-[#ed3541] bg-[#ed3541] text-white' : 'border-[#292929] bg-[#0b0b0b] text-[#ccc] hover:border-white hover:text-white'"
              @click="selectTab('AI_CHAT')"
            >
              AI CHATBOT
            </button>
            <button
              id="assistant-tab-admin"
              ref="adminTabButtonRef"
              type="button"
              role="tab"
              aria-controls="assistant-panel-admin"
              :aria-selected="activeTab === 'ADMIN_CHAT'"
              class="inline-flex min-h-[40px] cursor-pointer items-center justify-center gap-1.5 border px-3 py-1.5 text-[10px] font-bold tracking-[1.3px] uppercase transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541] max-lg:min-h-[44px]"
              :class="activeTab === 'ADMIN_CHAT' ? 'border-[#ed3541] bg-[#ed3541] text-white' : 'border-[#292929] bg-[#0b0b0b] text-[#ccc] hover:border-white hover:text-white'"
              @click="selectTab('ADMIN_CHAT')"
            >
              <span>CHAT ADMIN</span>
              <span
                v-if="unreadBadgeCount > 0"
                class="bg-white px-1.5 py-0.5 text-[9px] font-black text-[#0b0b0b] tabular-nums"
              >
                {{ unreadBadgeCount }}
              </span>
            </button>
          </div>
        </header>

        <!-- Konten Tab 1: AI Chatbot (Ketik Bebas + Template Klik-ke-Input) -->
        <div
          v-if="activeTab === 'AI_CHAT'"
          id="assistant-panel-ai"
          role="tabpanel"
          aria-labelledby="assistant-tab-ai"
          class="flex min-h-0 flex-1 flex-col"
        >
          <div
            ref="messageListRef"
            role="log"
            aria-live="polite"
            aria-label="Riwayat percakapan AI Chatbot"
            data-lenis-prevent
            class="editorial-scrollbar min-h-[180px] flex-1 space-y-3 overflow-y-auto overscroll-contain p-4"
          >
            <div
              v-for="msg in aiMessages"
              :key="msg.id"
              class="flex flex-col"
              :class="msg.sender === 'USER' ? 'items-end' : 'items-start'"
            >
              <div
                class="max-w-[88%] border px-3.5 py-2.5 text-[12px] leading-[1.55] whitespace-pre-line"
                :class="msg.sender === 'USER' ? 'border-[#ed3541] bg-[#ed3541] text-white' : 'border-[#292929] bg-[#141414] text-[#e5e5e5]'"
              >
                {{ msg.text }}
              </div>
              <div class="mt-1 flex items-center gap-2 text-[10px] text-[#a3a3a3]">
                <span>{{ msg.sender === 'USER' ? 'Anda' : 'Asisten AI' }} · {{ msg.timeLabel }}</span>
                <button
                  v-if="msg.suggestAdminHandoff"
                  type="button"
                  class="cursor-pointer border-0 bg-transparent p-0 text-[10px] font-bold tracking-[0.8px] text-[#ed3541] uppercase underline underline-offset-2 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541]"
                  @click="handoffLastQuestionToAdmin"
                >
                  Tanya Admin →
                </button>
              </div>
            </div>
          </div>

          <!-- Template Mengambang: klik langsung isi kotak input -->
          <div class="shrink-0 border-t border-[#292929] bg-[#111111] px-3 pt-2.5 pb-2">
            <div class="mb-1.5 text-[9px] font-bold tracking-[1.4px] text-[#a3a3a3] uppercase">
              KLIK TEMPLATE UNTUK ISI PERTANYAAN:
            </div>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="chip in ASSISTANT_TEMPLATE_CHIPS"
                :key="chip.id"
                type="button"
                class="min-h-[34px] cursor-pointer border border-[#292929] bg-[#171717] px-2.5 py-1 text-[10px] font-medium text-[#e5e5e5] transition-colors hover:border-[#ed3541] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541] max-lg:min-h-[40px]"
                @click="applyTemplateToInput(chip)"
              >
                {{ chip.label }}
              </button>
            </div>
          </div>

          <!-- Form Ketik Pesan Sendiri -->
          <form
            class="flex shrink-0 items-center gap-2 border-t border-[#292929] bg-[#0b0b0b] p-3"
            @submit.prevent="submitAiMessage"
          >
            <label for="floating-ai-input" class="sr-only">Pertanyaan untuk AI Chatbot</label>
            <input
              id="floating-ai-input"
              ref="aiInputRef"
              v-model="aiInput"
              type="text"
              placeholder="Ketik pertanyaan Anda..."
              class="min-h-[44px] min-w-0 flex-1 border border-[#292929] bg-[#141414] px-3 text-[13px] text-white placeholder-[#888888] focus:border-[#ed3541] focus:outline-none max-[700px]:text-[16px]"
            />
            <button
              type="submit"
              :disabled="!aiInput.trim()"
              class="min-h-[44px] shrink-0 cursor-pointer bg-[#ed3541] px-4 text-[10px] font-bold tracking-[1.4px] text-white uppercase transition-colors hover:bg-[#ff4754] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              KIRIM
            </button>
          </form>
        </div>

        <!-- Konten Tab 2: Chat Langsung Admin & Tunggu Balasan -->
        <AssistantAdminTab v-else />
      </section>
    </Transition>

    <!-- Tombol Pemicu Mengambang (Kontras Tinggi di Section Gelap & Terang) -->
    <div class="flex justify-end">
      <button
        ref="triggerButtonRef"
        type="button"
        :aria-expanded="isOpen"
        aria-controls="floating-assistant-panel"
        class="inline-flex min-h-[48px] cursor-pointer items-center gap-2.5 border border-white/35 border-l-[3px] border-l-[#ed3541] bg-[#141414] px-4 py-2.5 text-[11px] font-bold tracking-[1.4px] text-white uppercase shadow-[0_12px_32px_rgba(0,0,0,0.55)] ring-1 ring-black/40 transition-colors hover:border-[#ed3541] hover:bg-[#1b1b1b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541]"
        @click="toggleWidget"
      >
        <span class="h-[7px] w-[7px] rounded-full bg-[#ed3541]" aria-hidden="true"></span>
        <span>{{ isOpen ? 'TUTUP BANTUAN' : 'TANYA AI / ADMIN' }}</span>
        <span
          v-if="!isOpen && unreadBadgeCount > 0"
          class="bg-[#ed3541] px-1.5 py-0.5 text-[10px] font-black text-white tabular-nums"
        >
          {{ unreadBadgeCount }}
        </span>
      </button>
    </div>
  </div>
</template>
