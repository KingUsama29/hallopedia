import { computed } from 'vue'
import { useCustomerAuth } from '~/composables/useCustomerAuth'
import { useOrderDraft } from '~/composables/useOrderDraft'
import {
  applyOrderCancellation,
  applyPreviewInvoiceAction,
  type InvoicePreviewAction,
} from '~/data/order-dashboard'
import { applyOrderBriefSubmission, normalizeStoredOrderRecord } from '~/data/order-workspace'
import {
  applyPreviewAdminAction,
  appendCustomerChatMessage,
  markAdminMessagesRead,
  type AdminPreviewAction,
} from '~/data/order-chat-preview'
import {
  applySimulatedMidtransPayment,
  createOrderRecordFromCheckout,
  type CheckoutOrderInput,
  type CheckoutOrderResult,
  type OrderBriefSpec,
  type OrderMaterialItem,
  type OrderRecord,
  type PaymentChannel,
} from '~/data/orders'
import type { CatalogPackage, MediaAccount } from '~/data/catalog'

const ORDERS_STORAGE_KEY = 'hallopedia:customer-orders:v1'

function isValidOrderRecord(value: unknown): value is OrderRecord {
  if (!value || typeof value !== 'object') return false
  const c = value as Record<string, unknown>
  return (
    typeof c.id === 'string' &&
    typeof c.orderCode === 'string' &&
    typeof c.customerId === 'string' &&
    typeof c.sourceName === 'string' &&
    (c.serviceType === 'DIRECT_POST' || c.serviceType === 'VISIT_PRODUCTION') &&
    typeof c.status === 'string' &&
    Array.isArray(c.accountsSnapshot) &&
    !!c.paymentSummary &&
    typeof c.paymentSummary === 'object'
  )
}

export function useOrderPortal() {
  const allOrders = useState<OrderRecord[]>('hallopedia:orders:list', () => [])
  const isOrdersHydrated = useState<boolean>('hallopedia:orders:hydrated', () => false)

  const { currentCustomer } = useCustomerAuth()
  const { clearOrderDraft } = useOrderDraft()

  const customerOrders = computed<OrderRecord[]>(() => {
    const customerId = currentCustomer.value?.id
    if (!customerId) return []
    return allOrders.value.filter((order) => order.customerId === customerId)
  })

  const totalUnreadMessages = computed(() =>
    customerOrders.value.reduce(
      (sum, order) => sum + order.messages.filter((m) => m.senderRole === 'ADMIN' && !m.readByCustomer).length,
      0,
    ),
  )

  function persistOrders() {
    if (!import.meta.client) return
    try {
      window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(allOrders.value))
    } catch {
      // Abaikan jika browser membatasi localStorage
    }
  }

  function hydrateOrders() {
    if (!import.meta.client || isOrdersHydrated.value) return
    try {
      const raw = window.localStorage.getItem(ORDERS_STORAGE_KEY)
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          allOrders.value = parsed.filter(isValidOrderRecord).map(normalizeStoredOrderRecord)
        }
      }
    } catch {
      allOrders.value = []
    } finally {
      isOrdersHydrated.value = true
    }
  }

  function getCustomerOrderById(orderId: string): OrderRecord | null {
    hydrateOrders()
    const customerId = currentCustomer.value?.id
    if (!customerId) return null
    return allOrders.value.find((order) => order.id === orderId && order.customerId === customerId) ?? null
  }

  function previewDraftCheckoutOrder(
    input: CheckoutOrderInput,
    activeAccounts: readonly MediaAccount[],
    activePackages: readonly CatalogPackage[],
  ): CheckoutOrderResult {
    return createOrderRecordFromCheckout(input, activeAccounts, activePackages)
  }

  function commitPendingOrderWithPayment(
    pendingOrder: OrderRecord,
    channel: Exclude<PaymentChannel, 'INVOICE'>,
    outcome: 'SUCCESS' | 'PENDING',
  ): OrderRecord {
    hydrateOrders()
    const finalized = applySimulatedMidtransPayment(pendingOrder, channel, outcome)
    allOrders.value = [finalized, ...allOrders.value]
    persistOrders()
    clearOrderDraft()
    return finalized
  }

  function submitCheckoutOrder(
    input: CheckoutOrderInput,
    activeAccounts: readonly MediaAccount[],
    activePackages: readonly CatalogPackage[],
  ): CheckoutOrderResult {
    hydrateOrders()
    const result = createOrderRecordFromCheckout(input, activeAccounts, activePackages)
    if (!result.ok) return result

    allOrders.value = [result.order, ...allOrders.value]
    persistOrders()
    clearOrderDraft()
    return result
  }

  function updateCustomerOrder(
    orderId: string,
    transform: (existing: OrderRecord) => OrderRecord | null,
  ): OrderRecord | null {
    hydrateOrders()
    const customerId = currentCustomer.value?.id
    const idx = allOrders.value.findIndex((o) => o.id === orderId && o.customerId === customerId)
    if (idx === -1) return null

    const current = allOrders.value[idx]!
    const nextOrder = transform(current)
    if (!nextOrder || nextOrder === current) return current

    const nextList = [...allOrders.value]
    nextList[idx] = nextOrder
    allOrders.value = nextList
    persistOrders()
    return nextOrder
  }

  function finalizePaymentPreview(
    orderId: string,
    channel: Exclude<PaymentChannel, 'INVOICE'>,
    outcome: 'SUCCESS' | 'PENDING',
  ): OrderRecord | null {
    return updateCustomerOrder(orderId, (existing) =>
      applySimulatedMidtransPayment(existing, channel, outcome),
    )
  }

  function saveOrderBrief(
    orderId: string,
    payload: { brief: OrderBriefSpec; materials: readonly OrderMaterialItem[] },
  ): { ok: true; order: OrderRecord } | { ok: false; error: string } {
    const target = getCustomerOrderById(orderId)
    if (!target) return { ok: false, error: 'Pesanan tidak ditemukan pada akun aktif.' }
    const result = applyOrderBriefSubmission(target, payload)
    if (!result.ok) return result
    updateCustomerOrder(orderId, () => result.order)
    return result
  }

  function sendOrderChatMessage(
    orderId: string,
    text: string,
  ): { ok: true; order: OrderRecord } | { ok: false; error: string } {
    const target = getCustomerOrderById(orderId)
    if (!target) return { ok: false, error: 'Pesanan tidak ditemukan pada akun aktif.' }
    const result = appendCustomerChatMessage(target, text)
    if (!result.ok) return result
    updateCustomerOrder(orderId, () => result.order)
    return result
  }

  function markOrderMessagesAsRead(orderId: string): OrderRecord | null {
    return updateCustomerOrder(orderId, (existing) => markAdminMessagesRead(existing))
  }

  function triggerPreviewAdminUpdate(
    orderId: string,
    action: AdminPreviewAction,
  ): { ok: true; order: OrderRecord } | { ok: false; error: string } {
    const target = getCustomerOrderById(orderId)
    if (!target) return { ok: false, error: 'Pesanan tidak ditemukan pada akun aktif.' }
    const result = applyPreviewAdminAction(target, action)
    if (!result.ok) return result
    updateCustomerOrder(orderId, () => result.order)
    return result
  }

  function cancelCustomerOrder(
    orderId: string,
    reason?: string,
  ): { ok: true; order: OrderRecord } | { ok: false; error: string } {
    const target = getCustomerOrderById(orderId)
    if (!target) return { ok: false, error: 'Pesanan tidak ditemukan pada akun aktif.' }
    const result = applyOrderCancellation(target, reason)
    if (!result.ok) return result
    updateCustomerOrder(orderId, () => result.order)
    return result
  }

  function triggerPreviewInvoiceUpdate(
    orderId: string,
    action: InvoicePreviewAction,
  ): { ok: true; order: OrderRecord } | { ok: false; error: string } {
    const target = getCustomerOrderById(orderId)
    if (!target) return { ok: false, error: 'Pesanan tidak ditemukan pada akun aktif.' }
    const result = applyPreviewInvoiceAction(target, action)
    if (!result.ok) return result
    updateCustomerOrder(orderId, () => result.order)
    return result
  }

  return {
    customerOrders,
    isOrdersHydrated,
    totalUnreadMessages,
    hydrateOrders,
    getCustomerOrderById,
    previewDraftCheckoutOrder,
    commitPendingOrderWithPayment,
    submitCheckoutOrder,
    finalizePaymentPreview,
    saveOrderBrief,
    sendOrderChatMessage,
    markOrderMessagesAsRead,
    triggerPreviewAdminUpdate,
    cancelCustomerOrder,
    triggerPreviewInvoiceUpdate,
  }
}

