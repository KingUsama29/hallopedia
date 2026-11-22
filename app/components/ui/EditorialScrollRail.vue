<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const progressBarRef = ref<HTMLElement | null>(null)

let lenisInstance:
  | {
      on?: (
        event: string,
        cb: (e: { scroll: number; limit: number; progress: number }) => void,
      ) => void
      off?: (
        event: string,
        cb: (e: { scroll: number; limit: number; progress: number }) => void,
      ) => void
    }
  | undefined

function handleLenisScroll(e: {
  scroll: number
  limit: number
  progress: number
}) {
  const progress = Math.min(1, Math.max(0, e.progress || 0))
  if (progressBarRef.value) {
    progressBarRef.value.style.transform = `scaleX(${progress})`
  }
}

function handleNativeScroll() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight
  const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0
  handleLenisScroll({
    scroll: window.scrollY,
    limit: maxScroll,
    progress,
  })
}

onMounted(() => {
  const nuxtApp = useNuxtApp()
  lenisInstance = nuxtApp.$lenis as typeof lenisInstance

  if (lenisInstance?.on) {
    lenisInstance.on('scroll', handleLenisScroll)
  } else {
    window.addEventListener('scroll', handleNativeScroll, { passive: true })
  }

  handleNativeScroll()
})

onBeforeUnmount(() => {
  if (lenisInstance?.off) {
    lenisInstance.off('scroll', handleLenisScroll)
  } else {
    window.removeEventListener('scroll', handleNativeScroll)
  }
})
</script>

<template>
  <!-- Gaya B: Top Hairline Progress (2px #ed3541, GPU scaleX) -->
  <div
    class="no-print pointer-events-none fixed inset-x-0 top-0 z-50 h-[2px] bg-transparent"
    aria-hidden="true"
  >
    <div
      ref="progressBarRef"
      class="h-full w-full origin-left bg-[#ed3541] will-change-transform"
      style="transform: scaleX(0)"
    ></div>
  </div>
</template>
