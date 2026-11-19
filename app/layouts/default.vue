<script setup lang="ts">
import { computed } from 'vue'
import EditorialScrollRail from '~/components/ui/EditorialScrollRail.vue'
import FloatingAssistantWidget from '~/components/ui/FloatingAssistantWidget.vue'

const route = useRoute()
const showFloatingAssistant = computed(
  () =>
    !route.path.startsWith('/dashboard') &&
    route.path !== '/login' &&
    route.path !== '/register' &&
    route.path !== '/checkout',
)
</script>

<template>
  <div>
    <main id="main-content">
      <slot />
    </main>
    <EditorialScrollRail />
    <FloatingAssistantWidget v-if="showFloatingAssistant" />
  </div>
</template>
