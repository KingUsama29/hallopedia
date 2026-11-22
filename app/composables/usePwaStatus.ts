export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

type BadgeNavigator = Navigator & {
  standalone?: boolean
  setAppBadge?: (contents?: number) => Promise<void>
  clearAppBadge?: () => Promise<void>
}

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null

export function syncAppBadgeCount(unreadCount: number) {
  if (!import.meta.client) return
  const nav = window.navigator as BadgeNavigator
  const safeCount = Math.max(0, Math.floor(unreadCount))
  try {
    if (safeCount > 0 && typeof nav.setAppBadge === 'function') {
      void nav.setAppBadge(safeCount).catch(() => {})
    } else if (safeCount === 0 && typeof nav.clearAppBadge === 'function') {
      void nav.clearAppBadge().catch(() => {})
    }
  } catch {
    // Abaikan jika browser membatasi App Badging API di konteks non-PWA
  }
}

export function usePwaStatus() {
  const isPwaInitialized = useState<boolean>('hallopedia:pwa:init', () => false)
  const swReady = useState<boolean>('hallopedia:pwa:sw-ready', () => false)
  const isStandalone = useState<boolean>('hallopedia:pwa:standalone', () => false)
  const canInstallPrompt = useState<boolean>('hallopedia:pwa:can-install', () => false)
  const supportsBadgeApi = useState<boolean>('hallopedia:pwa:badge-api', () => false)
  const notificationPermission = useState<NotificationPermission | 'unsupported'>(
    'hallopedia:pwa:notif-perm',
    () => 'default',
  )

  function refreshNotificationPermission() {
    if (!import.meta.client) return
    notificationPermission.value =
      'Notification' in window ? window.Notification.permission : 'unsupported'
  }

  function initPwaClient() {
    if (!import.meta.client || isPwaInitialized.value) return
    isPwaInitialized.value = true

    const nav = window.navigator as BadgeNavigator
    isStandalone.value =
      window.matchMedia('(display-mode: standalone)').matches || Boolean(nav.standalone)
    supportsBadgeApi.value = typeof nav.setAppBadge === 'function'
    refreshNotificationPermission()

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault()
      deferredInstallPrompt = event as BeforeInstallPromptEvent
      canInstallPrompt.value = true
    })

    window.addEventListener('appinstalled', () => {
      deferredInstallPrompt = null
      canInstallPrompt.value = false
      isStandalone.value = true
    })

    if ('serviceWorker' in window.navigator) {
      void window.navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then(() => {
          swReady.value = true
        })
        .catch(() => {
          swReady.value = false
        })
    }
  }

  async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!import.meta.client || !deferredInstallPrompt) return 'unavailable'
    try {
      await deferredInstallPrompt.prompt()
      const choice = await deferredInstallPrompt.userChoice
      if (choice.outcome === 'accepted') {
        deferredInstallPrompt = null
        canInstallPrompt.value = false
      }
      return choice.outcome
    } catch {
      return 'unavailable'
    }
  }

  async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
    if (!import.meta.client || !('Notification' in window)) {
      notificationPermission.value = 'unsupported'
      return 'unsupported'
    }
    try {
      const result = await window.Notification.requestPermission()
      notificationPermission.value = result
      return result
    } catch {
      refreshNotificationPermission()
      return notificationPermission.value
    }
  }

  async function sendPreviewBrowserNotification(payload: {
    title: string
    body: string
    orderId?: string
    unreadCount?: number
  }): Promise<boolean> {
    if (!import.meta.client || !('Notification' in window)) return false
    if (window.Notification.permission !== 'granted') return false

    try {
      if ('serviceWorker' in window.navigator && swReady.value) {
        const reg = await window.navigator.serviceWorker.ready
        if (reg.active) {
          reg.active.postMessage({
            type: 'SHOW_PREVIEW_NOTIFICATION',
            payload,
          })
          return true
        }
      }
      const instance = new window.Notification(payload.title, {
        body: payload.body,
        icon: '/icons/icon-192.png',
      })
      instance.onclick = () => {
        window.focus()
        instance.close()
      }
      return true
    } catch {
      return false
    }
  }

  return {
    swReady,
    isStandalone,
    canInstallPrompt,
    supportsBadgeApi,
    notificationPermission,
    initPwaClient,
    refreshNotificationPermission,
    promptInstall,
    requestNotificationPermission,
    sendPreviewBrowserNotification,
  }
}

