import { nextTick, onBeforeUnmount, watch, type Ref } from 'vue'

interface ModalAccessibilityOptions {
  isOpen: Ref<boolean>
  panelRef: Ref<HTMLElement | null>
  initialFocusRef: Ref<HTMLElement | null>
  onClose: () => void
  onBeforeOpen?: () => void
}

export interface LenisScrollControl {
  stop?: () => void
  start?: () => void
  scrollTo?: (
    target: string | number | HTMLElement,
    options?: { immediate?: boolean; offset?: number },
  ) => void
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function useModalAccessibility(options: ModalAccessibilityOptions) {
  const nuxtApp = useNuxtApp()
  let lastFocusedElement: HTMLElement | null = null
  let suppressRestoreFocus = false

  function getLenis(): LenisScrollControl | undefined {
    return nuxtApp.$lenis as LenisScrollControl | undefined
  }

  function getFocusableElements(): HTMLElement[] {
    const panel = options.panelRef.value
    if (!panel) return []
    return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!options.isOpen.value) return

    if (event.key === 'Escape') {
      event.preventDefault()
      options.onClose()
      return
    }

    if (event.key !== 'Tab') return

    const focusables = getFocusableElements()
    if (!focusables.length) return

    const first = focusables[0]!
    const last = focusables[focusables.length - 1]!
    const active = document.activeElement as HTMLElement | null

    if (event.shiftKey) {
      if (
        !active ||
        active === first ||
        !options.panelRef.value?.contains(active)
      ) {
        event.preventDefault()
        last.focus()
      }
      return
    }

    if (!active || active === last || !options.panelRef.value?.contains(active)) {
      event.preventDefault()
      first.focus()
    }
  }

  function releaseScrollLock() {
    if (!import.meta.client) return
    window.removeEventListener('keydown', handleKeydown)
    document.body.style.overflow = ''
    getLenis()?.start?.()
  }

  function suppressNextFocusRestore() {
    suppressRestoreFocus = true
  }

  watch(options.isOpen, async (open) => {
    if (!import.meta.client) return

    if (open) {
      suppressRestoreFocus = false
      lastFocusedElement = document.activeElement as HTMLElement | null
      options.onBeforeOpen?.()
      document.body.style.overflow = 'hidden'
      getLenis()?.stop?.()
      window.addEventListener('keydown', handleKeydown)
      await nextTick()
      options.initialFocusRef.value?.focus()
      return
    }

    releaseScrollLock()
    await nextTick()
    if (!suppressRestoreFocus) {
      lastFocusedElement?.focus?.()
    }
    suppressRestoreFocus = false
    lastFocusedElement = null
  })

  onBeforeUnmount(() => {
    releaseScrollLock()
  })

  return {
    getLenis,
    suppressNextFocusRestore,
  }
}

