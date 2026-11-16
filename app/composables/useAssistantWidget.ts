import { computed } from 'vue'
import {
  formatCurrentClock,
  loadStoredAdminInquiries,
  persistAdminInquiries,
  type AdminInquiryItem,
  type AiChatMessage,
  type AssistantTab,
} from '~/data/assistant-widget'

export type AssistantFocusTarget = 'AI_INPUT' | 'ADMIN_TEXTAREA' | 'TRIGGER' | null

export interface OpenAssistantOptions {
  tab?: AssistantTab
  prefillAi?: string
  prefillAdmin?: string
}

const INITIAL_AI_MESSAGES: AiChatMessage[] = [
  {
    id: 'ai-welcome',
    sender: 'AI',
    text: 'Halo. Tanyakan seputar harga paket, wilayah akun, atau pembayaran — ketik sendiri atau klik template di bawah untuk langsung masuk ke kolom ketik.',
    timeLabel: 'Siap',
  },
]

export function useAssistantWidget() {
  const isOpen = useState<boolean>('hallopedia:assistant:open', () => false)
  const activeTab = useState<AssistantTab>('hallopedia:assistant:tab', () => 'AI_CHAT')
  const aiInput = useState<string>('hallopedia:assistant:ai-input', () => '')
  const adminContact = useState<string>('hallopedia:assistant:admin-contact', () => '')
  const adminMessageInput = useState<string>('hallopedia:assistant:admin-msg', () => '')
  const aiMessages = useState<AiChatMessage[]>('hallopedia:assistant:ai-messages', () => [...INITIAL_AI_MESSAGES])
  const adminInquiries = useState<AdminInquiryItem[]>('hallopedia:assistant:inquiries', () => [])
  const focusRequestCounter = useState<number>('hallopedia:assistant:focus-seq', () => 0)
  const focusRequestTarget = useState<AssistantFocusTarget>('hallopedia:assistant:focus-target', () => null)

  const unreadBadgeCount = computed(() => adminInquiries.value.length)

  function requestFocus(target: Exclude<AssistantFocusTarget, null>) {
    focusRequestTarget.value = target
    focusRequestCounter.value += 1
  }

  function hydrateAdminInquiries() {
    if (!import.meta.client) return
    adminInquiries.value = loadStoredAdminInquiries()
  }

  function openWidget(options: OpenAssistantOptions = {}) {
    if (options.tab) {
      activeTab.value = options.tab
    }
    if (options.prefillAi !== undefined) {
      aiInput.value = options.prefillAi
    }
    if (options.prefillAdmin !== undefined) {
      adminMessageInput.value = options.prefillAdmin
    }
    isOpen.value = true
    requestFocus(activeTab.value === 'ADMIN_CHAT' ? 'ADMIN_TEXTAREA' : 'AI_INPUT')
  }

  function closeWidget(options: { restoreFocus?: boolean } = {}) {
    isOpen.value = false
    if (options.restoreFocus) {
      requestFocus('TRIGGER')
    }
  }

  function toggleWidget() {
    if (isOpen.value) {
      closeWidget({ restoreFocus: true })
      return
    }
    openWidget()
  }

  function appendAdminInquiry(message: string, packageContext: string | null) {
    const entry: AdminInquiryItem = {
      id: `adm-${Date.now()}`,
      contact: adminContact.value.trim() || 'Sesi Pengunjung Web',
      packageContext,
      message,
      createdAtLabel: formatCurrentClock(),
      status: 'WAITING_ADMIN',
    }
    adminInquiries.value = [entry, ...adminInquiries.value]
    persistAdminInquiries(adminInquiries.value)
  }

  return {
    isOpen,
    activeTab,
    aiInput,
    adminContact,
    adminMessageInput,
    aiMessages,
    adminInquiries,
    unreadBadgeCount,
    focusRequestCounter,
    focusRequestTarget,
    requestFocus,
    hydrateAdminInquiries,
    openWidget,
    closeWidget,
    toggleWidget,
    appendAdminInquiry,
  }
}

