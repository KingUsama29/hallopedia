import { computed } from 'vue'
import { useCustomerAuth } from '~/composables/useCustomerAuth'
import { useOrderDraft } from '~/composables/useOrderDraft'
import {
  applySimulatedMidtransPayment,
  createOrderRecordFromCheckout,
  type CheckoutOrderInput,
  type CheckoutOrderResult,
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
    typeof c.status === 'string' &&
    Array.isArray(c.accountsSnapshot) &&
    !!c.paymentSummary &&
    typeof c.paymentSummary === 'object'
  )
}

function ensureOrderSchedulePreference(order: OrderRecord): OrderRecord {
  if (order.schedulePreference) return order
  return {
    ...order,
    schedulePreference:
      order.serviceType === 'VISIT_PRODUCTION'
        ? {
            serviceType: 'VISIT_PRODUCTION',
            preferredDate: order.targetPublishDate ?? null,
            preferredTimeWita: null,
            meetingLocation: '',
            meetingMapsUrl: null,
          }
        : {
            serviceType: 'DIRECT_POST',
            preferredDate: order.targetPublishDate ?? null,
            preferredTimeWita: null,
          },
  }
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
          allOrders.value = parsed.filter(isValidOrderRecord).map(ensureOrderSchedulePreference)
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

  function finalizePaymentPreview(
    orderId: string,
    channel: Exclude<PaymentChannel, 'INVOICE'>,
    outcome: 'SUCCESS' | 'PENDING',
  ): OrderRecord | null {
    hydrateOrders()
    const customerId = currentCustomer.value?.id
    const idx = allOrders.value.findIndex((o) => o.id === orderId && o.customerId === customerId)
    if (idx === -1) return null

    const updated = applySimulatedMidtransPayment(allOrders.value[idx]!, channel, outcome)
    const nextList = [...allOrders.value]
    nextList[idx] = updated
    allOrders.value = nextList
    persistOrders()
    return updated
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
  }
}

