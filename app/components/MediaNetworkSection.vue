<script setup lang="ts">
import { computed, ref } from 'vue'

const mediaPaths = [
  {
    id: 'local-info',
    number: '01',
    title: 'Informasi daerah',
    description: 'Membawa kabar dan isu sekitar lebih dekat ke audiens lokal.',
    image: '/images/news3.jpg',
    alt: 'Suasana kegiatan masyarakat di ruang publik',
    label: 'CERITA DARI DAERAH',
  },
  {
    id: 'field-coverage',
    number: '02',
    title: 'Liputan lapangan',
    description: 'Merekam aktivitas dan cerita yang lahir langsung dari lapangan.',
    image: '/images/news1.jpg',
    alt: 'Jurnalis dan warga meliput kegiatan di lapangan',
    label: 'DARI LAPANGAN',
  },
  {
    id: 'digital-promotion',
    number: '03',
    title: 'Promosi digital',
    description: 'Membuka ruang bagi bisnis untuk menjangkau audiens melalui media Hallopedia.',
    image: '/images/news2.jpg',
    alt: 'Konten berita lokal ditampilkan melalui layar ponsel',
    label: 'RUANG UNTUK BRAND LOKAL',
  },
]

const activeMediaIndex = ref(0)
const activeMedia = computed(() => mediaPaths[activeMediaIndex.value]!)
</script>

<template>
  <section
    class="bg-[#0b0b0b] px-[6%] py-[clamp(88px,12vw,160px)] text-white
      max-[700px]:px-[5%] max-[700px]:py-[84px]"
    aria-labelledby="media-network-title"
  >
    <div class="mx-auto w-full max-w-[1600px]">
      <div class="flex items-center gap-[10px] text-[10px] tracking-[2px] text-[#999]">
        <span class="h-[7px] w-[7px] rounded-full bg-[#ed3541]" aria-hidden="true"></span>
        03 / JARINGAN MEDIA
      </div>

      <div class="mt-[clamp(34px,5vw,64px)] grid gap-8 lg:grid-cols-[1.4fr_0.6fr] lg:items-end">
        <h2
          id="media-network-title"
          class="max-w-[1050px] text-[clamp(48px,8.5vw,132px)] font-extrabold leading-[0.88]
            tracking-[-0.075em]"
        >
          Cerita lokal,<br />
          <span class="text-[#ed3541]">tetap dekat.</span>
        </h2>
        <p class="max-w-[360px] pb-2 text-[15px] leading-[1.65] text-[#b4b4b4] lg:justify-self-end">
          Hallopedia mengelola jaringan media sosial yang berfokus pada berita dan informasi daerah,
          terutama di Kalimantan.
        </p>
      </div>

      <div class="mt-[clamp(46px,7vw,96px)] grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-[7%]">
        <nav
          class="flex flex-col lg:order-1"
          aria-label="Jelajahi jaringan media Hallopedia"
        >
          <button
            v-for="(item, index) in mediaPaths"
            :key="item.id"
            type="button"
            class="group flex w-full items-start gap-4 border-t border-white/25 py-5 text-left
              transition-colors duration-300 hover:text-[#ed3541] focus-visible:outline
              focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ed3541]
              max-[700px]:py-4"
            :aria-pressed="activeMediaIndex === index"
            @click="activeMediaIndex = index"
          >
            <span
              class="pt-1 text-[10px] tracking-[1.5px]"
              :class="activeMediaIndex === index ? 'text-[#ed3541]' : 'text-[#888]'"
            >
              {{ item.number }}
            </span>
            <span class="flex-1">
              <span class="block text-[clamp(20px,2.3vw,32px)] font-semibold tracking-[-0.045em]">
                {{ item.title }}
              </span>
              <span
                class="mt-2 block max-w-[360px] text-[13px] leading-[1.55] text-[#aaa]"
                :class="activeMediaIndex === index ? 'opacity-100' : 'opacity-75'"
              >
                {{ item.description }}
              </span>
            </span>
            <span
              class="pt-1 text-lg transition-transform duration-300 group-hover:translate-x-1"
              :class="activeMediaIndex === index ? 'text-[#ed3541]' : 'text-[#aaa]'"
              aria-hidden="true"
            >
              ↗
            </span>
          </button>
          <div class="border-t border-white/25"></div>
        </nav>

        <div class="relative min-w-0 overflow-hidden bg-[#d8d6cf] lg:order-2">
          <Transition
            mode="out-in"
            enter-active-class="transition duration-500 ease-out"
            enter-from-class="translate-y-3 opacity-0"
            enter-to-class="translate-y-0 opacity-100"
            leave-active-class="transition duration-200 ease-in"
            leave-from-class="translate-y-0 opacity-100"
            leave-to-class="-translate-y-2 opacity-0"
          >
            <figure :key="activeMedia.id" class="relative m-0 aspect-[16/10] max-[700px]:aspect-[4/3]">
              <img
                class="absolute inset-0 h-full w-full object-cover"
                :src="activeMedia.image"
                :alt="activeMedia.alt"
                loading="lazy"
                decoding="async"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
              <figcaption
                class="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-[clamp(16px,3vw,34px)]
                  text-[9px] tracking-[1.5px] text-white max-[700px]:text-[8px]"
              >
                <span>HALLOPEDIA / KALIMANTAN</span>
                <span class="text-right">{{ activeMedia.label }}</span>
              </figcaption>
            </figure>
          </Transition>
        </div>
      </div>
    </div>
  </section>
</template>
