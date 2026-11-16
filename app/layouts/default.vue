<script setup lang="ts">
import EditorialScrollRail from '~/components/ui/EditorialScrollRail.vue'
import FloatingAssistantWidget from '~/components/ui/FloatingAssistantWidget.vue'
</script>

<template>
  <div>
    <main id="main-content">
      <slot />
    </main>
    <EditorialScrollRail />
    <FloatingAssistantWidget />
  </div>
</template>
