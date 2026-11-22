import { nextTick, watch } from 'vue'
import { useCustomerAuth } from '~/composables/useCustomerAuth'
import { useOrderPortal } from '~/composables/useOrderPortal'
import { syncAppBadgeCount, usePwaStatus } from '~/composables/usePwaStatus'

export default defineNuxtPlugin((nuxtApp) => {
  let isBadgeWatcherBound = false

  nuxtApp.hooks.hookOnce('page:finish', () => {
    void nextTick(() => {
      const { hydrateAuth } = useCustomerAuth()
      const { hydrateOrders, totalUnreadMessages } = useOrderPortal()
      const { initPwaClient } = usePwaStatus()

      hydrateAuth()
      hydrateOrders()
      initPwaClient()

      if (!isBadgeWatcherBound) {
        isBadgeWatcherBound = true
        watch(
          totalUnreadMessages,
          (count) => {
            syncAppBadgeCount(count)
          },
          { immediate: true },
        )
      }
    })
  })
})
