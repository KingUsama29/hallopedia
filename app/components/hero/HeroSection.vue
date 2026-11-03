<script setup lang="ts">
import HeroNavbar from './HeroNavbar.vue'
import HeroHeadline from './HeroHeadline.vue'
import HeroGallery from './HeroGallery.vue'
import HeroAbstract from './HeroAbstract.vue'
</script>

<template>
  <main class="hero">
    <HeroNavbar />
    <div class="hero-label">
      <span class="red-dot" aria-hidden="true"></span>
      MEDIA LOKAL · INFORMASI · PERIKLANAN
    </div>
    <HeroAbstract />
    <HeroHeadline />
    <HeroGallery />
    <div class="hero-bottom">
      <p>
        Mengabarkan berbagai cerita daerah.<br />
        Menghubungkan bisnis dengan lebih banyak audiens.
      </p>
      <div class="bottom-services">
        <span>JARINGAN MEDIA</span>
        <span>PERIKLANAN DIGITAL</span>
      </div>
      <div class="scroll-indicator">
        GULIR UNTUK MENJELAJAHI <span aria-hidden="true">↓</span>
      </div>
    </div>
  </main>
</template>
