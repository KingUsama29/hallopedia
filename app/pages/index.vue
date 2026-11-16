<script setup lang="ts">
import HeroSection from '~/components/hero/HeroSection.vue'
import CatalogSection from '~/components/sections/CatalogSection.vue'
import MediaNetworkSection from '~/components/sections/MediaNetworkSection.vue'
import FaqSection from '~/components/sections/FaqSection.vue'
import AppFooter from '~/components/sections/AppFooter.vue'
</script>

<template>
  <div id="homepage-root">
    <HeroSection />
    <CatalogSection />
    <MediaNetworkSection />
    <FaqSection />
    <AppFooter />
  </div>
</template>
