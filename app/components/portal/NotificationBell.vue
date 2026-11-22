<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { useCustomerAuth } from '~/composables/useCustomerAuth'
import { useOrderPortal } from '~/composables/useOrderPortal'
import { usePwaStatus } from '~/composables/usePwaStatus'
import { countOrderUnreadAdmin } from '~/data/order-dashboard'
import { formatShortDateTime } from '~/data/orders'

interface UnreadOrderNotification {
  orderId: string
  orderCode: string
  sourceName: string
  unreadCount: number
  latestText: string
  latestSentAt: string
}

const route = useRoute()
const panelId = `notif-popover-${useId()}`
const { hydrateAuth } = useCustomerAuth()
const { customerOrders, totalUnreadMessages, hydrateOrders } = useOrderPortal()
const { notificationPermission, refreshNotificationPermission, requestNotificationPermission } =
  usePwaStatus()

const isOpen = ref(false)
const triggerRef = ref<HTMLButtonElement | null>(null)
const closeButtonRef = ref<HTMLButtonElement | null>(null)
const popoverTopPx = ref(78)
const popoverRightPx = ref(16)

const unreadNotifications = computed<UnreadOrderNotification[]>(() => {
  const items: UnreadOrderNotification[] = []
  for (const order of customerOrders.value) {
    const unreadCount = countOrderUnreadAdmin(order)
    if (unreadCount === 0) continue
    const unreadMsgs = order.messages.filter((m) => m.senderRole === 'ADMIN' && !m.readByCustomer)
    const latest = unreadMsgs[unreadMsgs.length - 1]!
    items.push({
      orderId: order.id,
      orderCode: order.orderCode,
      sourceName: order.sourceName,
      unreadCount,
      latestText: latest.text,
      latestSentAt: latest.sentAt,
    })
  }
  return items.sort((a, b) => Date.parse(b.latestSentAt) - Date.parse(a.latestSentAt))
})

function updatePopoverAnchor() {
  if (!import.meta.client || !triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()
  const vw = window.innerWidth
  const margin = 16
  const panelWidth = Math.min(360, Math.max(240, vw - margin * 2))
  const rawRight = Math.round(vw - rect.right)
  const maxRight = Math.max(margin, vw - panelWidth - margin)
  popoverTopPx.value = Math.max(12, Math.round(rect.bottom + 8))
  popoverRightPx.value = Math.min(Math.max(margin, rawRight), maxRight)
}

function closePopover(restoreFocus: boolean = false) {
  if (!isOpen.value) return
  isOpen.value = false
  if (restoreFocus) {
    nextTick(() => triggerRef.value?.focus())
  }
}

async function openPopover() {
  hydrateOrders()
  updatePopoverAnchor()
  isOpen.value = true
  await nextTick()
  closeButtonRef.value?.focus()
}

function togglePopover() {
  if (isOpen.value) {
    closePopover(true)
  } else {
    void openPopover()
  }
}

async function openNotificationOrder(orderId: string) {
  closePopover(false)
  await navigateTo(`/dashboard/orders/${orderId}`)
}

async function openAllOrders() {
  closePopover(false)
  await navigateTo('/dashboard/orders')
}

function handleWindowKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isOpen.value) {
    event.preventDefault()
    closePopover(true)
  }
}

function handleWindowResize() {
  if (isOpen.value) updatePopoverAnchor()
}

watch(
  () => route.fullPath,
  () => closePopover(false),
)

onMounted(() => {
  hydrateAuth()
  hydrateOrders()
  refreshNotificationPermission()
  window.addEventListener('keydown', handleWindowKeydown)
  window.addEventListener('resize', handleWindowResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleWindowKeydown)
  window.removeEventListener('resize', handleWindowResize)
})
</script>

<template>
  <div class="inline-flex shrink-0 items-center">
    <button
      ref="triggerRef"
      type="button"
      :aria-expanded="isOpen"
      :aria-controls="panelId"
      :aria-label="
        totalUnreadMessages > 0
          ? `Notifikasi pesan Admin, ${totalUnreadMessages} belum dibaca`
          : 'Notifikasi pesan Admin'
      "
      class="relative inline-flex min-h-[44px] min-w-[42px] cursor-pointer items-center justify-center border border-[#292929] bg-[#141414] text-[#ccc] transition-colors hover:border-[#ed3541] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541] sm:min-w-[44px]"
      :class="isOpen ? 'border-[#ed3541] text-white' : ''"
      @click="togglePopover"
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
        <path
          d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <span
        v-if="totalUnreadMessages > 0"
        class="absolute -top-1.5 -right-1.5 inline-flex min-w-[18px] items-center justify-center bg-[#ed3541] px-1 py-0.5 text-[9px] leading-none font-black text-white tabular-nums"
      >
        {{ totalUnreadMessages > 99 ? '99+' : totalUnreadMessages }}
      </span>
    </button>

    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-150 ease-out motion-reduce:transition-none"
        enter-from-class="-translate-y-1 opacity-0"
        leave-active-class="transition duration-100 ease-in motion-reduce:transition-none"
        leave-to-class="-translate-y-1 opacity-0"
      >
        <div
          v-if="isOpen"
          class="fixed inset-0 z-50 bg-black/40"
          @click.self="closePopover(true)"
        >
          <section
            :id="panelId"
            role="dialog"
            aria-label="Notifikasi pesan Admin"
            :style="{ top: `${popoverTopPx}px`, right: `${popoverRightPx}px` }"
            class="fixed z-50 w-[min(360px,calc(100vw-2rem))] border border-[#292929] bg-[#0b0b0b] text-white shadow-[0_18px_48px_rgba(0,0,0,0.65)]"
          >
            <header class="flex items-center justify-between gap-3 border-b border-[#292929] px-4 py-3">
              <div class="flex items-center gap-2 text-[10px] font-bold tracking-[1.6px] uppercase">
                <span class="h-[6px] w-[6px] rounded-full bg-[#ed3541]" aria-hidden="true"></span>
                <span>NOTIFIKASI ADMIN</span>
                <span
                  v-if="totalUnreadMessages > 0"
                  class="bg-[#ed3541] px-1.5 py-0.5 text-[9px] font-black text-white tabular-nums"
                >
                  {{ totalUnreadMessages }} BARU
                </span>
              </div>
              <button
                ref="closeButtonRef"
                type="button"
                aria-label="Tutup panel notifikasi"
                class="min-h-[32px] cursor-pointer border border-[#292929] bg-transparent px-2.5 py-1 text-[9px] font-bold tracking-[1.2px] text-[#ccc] uppercase transition-colors hover:border-[#ed3541] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541] max-lg:min-h-[44px]"
                @click="closePopover(true)"
              >
                TUTUP ✕
              </button>
            </header>

            <div class="editorial-scrollbar max-h-[320px] divide-y divide-[#292929] overflow-y-auto">
              <div v-if="unreadNotifications.length === 0" class="px-4 py-6 text-center">
                <p class="m-0 text-[12px] leading-[1.6] text-[#a3a3a3]">
                  Belum ada pesan baru dari Admin saat ini.
                </p>
              </div>

              <button
                v-for="item in unreadNotifications"
                :key="item.orderId"
                type="button"
                class="block w-full cursor-pointer border-0 bg-transparent px-4 py-3.5 text-left transition-colors hover:bg-[#141414] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ed3541]"
                @click="openNotificationOrder(item.orderId)"
              >
                <div class="flex items-center justify-between gap-2 text-[10px] font-bold tracking-[1px] uppercase">
                  <span class="text-white tabular-nums">{{ item.orderCode }}</span>
                  <span class="bg-[#ed3541] px-1.5 py-0.5 text-[8px] font-black text-white tabular-nums">
                    {{ item.unreadCount }} PESAN BARU
                  </span>
                </div>
                <div class="mt-1 truncate text-[11px] font-semibold text-[#ccc]">
                  {{ item.sourceName }}
                </div>
                <p class="mt-1 mb-0 line-clamp-2 text-[12px] leading-[1.45] text-[#e5e5e5]">
                  {{ item.latestText }}
                </p>
                <div class="mt-1.5 text-[10px] text-[#a3a3a3]">
                  {{ formatShortDateTime(item.latestSentAt) }}
                </div>
              </button>
            </div>

            <footer class="divide-y divide-[#292929] border-t border-[#292929] bg-[#141414]">
              <button
                v-if="notificationPermission === 'default'"
                type="button"
                class="flex min-h-[40px] w-full cursor-pointer items-center justify-between border-0 bg-transparent px-4 py-2 text-[10px] font-bold tracking-[1.2px] text-[#ed3541] uppercase transition-colors hover:bg-[#171717] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ed3541] max-lg:min-h-[44px]"
                @click="requestNotificationPermission"
              >
                <span>AKTIFKAN NOTIFIKASI BROWSER</span>
                <span aria-hidden="true">+</span>
              </button>
              <button
                type="button"
                class="flex min-h-[40px] w-full cursor-pointer items-center justify-between border-0 bg-transparent px-4 py-2 text-[10px] font-bold tracking-[1.4px] text-white uppercase transition-colors hover:text-[#ed3541] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ed3541] max-lg:min-h-[44px]"
                @click="openAllOrders"
              >
                <span>LIHAT SEMUA PESANAN</span>
                <span aria-hidden="true">→</span>
              </button>
            </footer>
          </section>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
