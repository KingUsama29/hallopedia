import { useCustomerAuth } from '~/composables/useCustomerAuth'

export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return

  // Hindari mutasi route/state sebelum initial SSR hydration selesai (ditangani di onMounted halaman)
  if (useNuxtApp().isHydrating) return

  const { currentCustomer, hydrateAuth } = useCustomerAuth()
  hydrateAuth()

  if (!currentCustomer.value) {
    return navigateTo({
      path: '/login',
      query: { redirect: to.fullPath },
    })
  }
})

