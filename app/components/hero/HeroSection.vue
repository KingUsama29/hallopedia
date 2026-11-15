<script setup lang="ts">
import HeroNavbar from './HeroNavbar.vue'
import HeroHeadline from './HeroHeadline.vue'
import HeroGallery from './HeroGallery.vue'
</script>

<template>
  <section id="hero" class="hero" aria-label="Beranda Hallopedia">
    <HeroNavbar />
    <div class="hero-label">
      <span class="red-dot" aria-hidden="true"></span>
      MEDIA LOKAL · INFORMASI · PERIKLANAN
    </div>
    <div class="hero-editorial-corners" aria-hidden="true">
      <span class="editorial-corner editorial-corner-top-left"></span>
      <span class="editorial-corner editorial-corner-top-right"></span>
      <span class="editorial-corner editorial-corner-bottom-right"></span>
      <span class="editorial-corner editorial-corner-bottom-left"></span>
    </div>
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
      <a
        href="#katalog"
        class="scroll-indicator no-underline transition-colors duration-200 hover:text-white
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ed3541]"
      >
        LIHAT KATALOG HARGA <span aria-hidden="true">↓</span>
      </a>
    </div>
  </section>
</template>
