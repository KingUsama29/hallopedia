
<script setup lang="ts">
const photos = [
  {
    src: '/images/news1.jpg',
    alt: 'Dokumentasi berita lokal',
    label: '01 / INFORMASI',
    className: 'photo-one',
  },
  {
    src: '/images/news2.jpg',
    alt: 'Aktivitas masyarakat',
    label: '02 / PERISTIWA',
    className: 'photo-two',
  },
  {
    src: '/images/news3.jpg',
    alt: 'Suasana daerah',
    label: '03 / DAERAH',
    className: 'photo-three',
  },
]
</script>

<template>
  <div class="contents" aria-label="Galeri dokumentasi">
    <figure
      v-for="photo in photos"
      :key="photo.src"
      class="photo absolute z-[3] m-0 w-[165px] max-[700px]:w-[105px]"
      :class="photo.className"
    >
      <img
        :src="photo.src"
        :alt="photo.alt"
        class="photo-float block h-[115px] w-full object-cover grayscale-[25%] max-[700px]:h-[75px]"
      />

      <figcaption
        class="mt-[7px] block text-[8px] tracking-[1.5px] text-[#aaa]"
      >
        {{ photo.label }}
      </figcaption>
    </figure>
  </div>
</template>


