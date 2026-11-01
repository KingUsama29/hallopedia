
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const hero = ref<HTMLElement | null>(null)
let ctx: gsap.Context | undefined

onMounted(() => {
  if (!hero.value) return

  gsap.registerPlugin(ScrollTrigger)

  ctx = gsap.context(() => {
    gsap.to('.hero-image', {
      yPercent: 15,
      scale: 1.08,
      ease: 'none',
      scrollTrigger: {
        trigger: hero.value,
        start: 'top top',
        end: 'bottom top',
        scrub: 1
      }
    })

    const tl = gsap.timeline({
      defaults: {
        ease: 'power3.out'
      }
    })

    tl.from('.hero-eyebrow', {
      y: 25,
      opacity: 0,
      duration: 0.6
    })

    .from('.hero-title', {
      y: 45,
      opacity: 0,
      duration: 0.9
    })

    .from('.hero-description', {
      y: 25,
      opacity: 0,
      duration: 0.7
    })

    .from('.hero-buttons', {
      y: 20,
      opacity: 0,
      duration: 0.6
    })
  }, hero.value)
})

onUnmounted(() => {
  ctx?.revert()
})
</script>

<template>
  <main class="bg-[#080808] text-white">
    <section
      ref="hero"
      class="relative isolate flex min-h-screen
             items-center overflow-hidden"
    >
      <img
        src="/images/mahakam/bridge.webp"
        alt="Jembatan Mahakam di Samarinda"
        class="hero-image absolute inset-0 -z-20
               h-full w-full object-cover"
      />

      <div
        class="absolute inset-0 -z-10
               bg-gradient-to-r from-black
               via-black/65 to-black/10"
      />

      <div
        class="absolute inset-0 -z-10
               bg-gradient-to-t from-black/70
               via-transparent to-black/25"
      />

      <header
        class="absolute inset-x-0 top-0 z-20
               flex items-center justify-between
               px-6 py-6 md:px-12"
      >
        <a href="/" class="text-2xl font-black tracking-tight">
          HALLO<span class="text-[#FF1825]">PEDIA</span>
          <span class="mt-1 block text-[9px] font-medium
                       tracking-[0.3em] text-white/70">
            DIGITAL MEDIA NETWORK
          </span>
        </a>

        <a
          href="#media"
          class="rounded-full border border-white/30
                 px-5 py-2.5 text-sm transition
                 hover:border-[#FF1825] hover:bg-[#FF1825]"
        >
          Explore Media ↗
        </a>
      </header>

      <div
        class="hero-copy mx-auto w-full max-w-7xl
               px-6 pb-20 pt-32 md:px-12"
      >
        <p class="hero-eyebrow mb-6 flex items-center gap-3
                  text-xs font-semibold tracking-[0.25em]
                  text-[#FF515A] md:text-sm">
          <span class="h-px w-10 bg-[#FF1825]" />
          FROM KALIMANTAN TO EVERYWHERE
        </p>

        <h1 class="hero-title max-w-5xl text-5xl font-black
                   leading-[0.98] tracking-tight
                   md:text-7xl lg:text-8xl">
          Your Story.<br />
          Our Media.<br />
          <span class="text-[#FF1825]">Greater Reach.</span>
        </h1>

        <p class="hero-description mt-7 max-w-xl text-base leading-7
                  text-white/75 md:text-lg">
          Satu pintu untuk menjangkau audiens melalui
          jaringan media digital Hallopedia.
        </p>

        <div class="hero-buttons mt-9 flex flex-wrap gap-4">
          <a
            href="#media"
            class="rounded-full bg-[#FF1825] px-7 py-4
                   font-semibold transition
                   hover:bg-white hover:text-black"
          >
            Explore Our Media ↗
          </a>

          <a
            href="#media"
            class="rounded-full border border-white/40
                   px-7 py-4 font-semibold transition
                   hover:bg-white/10"
          >
            Discover Hallopedia
          </a>
        </div>
      </div>

      <div
        class="absolute bottom-7 right-8 hidden items-center
               gap-3 text-xs tracking-widest text-white/60
               md:flex"
      >
        SCROLL TO EXPLORE
        <span class="h-10 w-px bg-[#FF1825]" />
      </div>
    </section>

    <section
      id="media"
      class="flex min-h-[65vh] items-center
             bg-[#F4F2EF] px-6 py-24 text-[#111111]
             md:px-12"
    >
      <div class="mx-auto w-full max-w-7xl">
        <p class="mb-4 text-sm font-semibold
                  tracking-[0.2em] text-[#E21B2D]">
          THE MEDIA NETWORK
        </p>

        <h2 class="max-w-3xl text-4xl font-black
                   leading-tight md:text-6xl">
          One Network.<br />
          Multiple Stories.
        </h2>

        <p class="mt-6 max-w-xl leading-7 text-black/65">
          Temukan jaringan media Hallopedia dan pilih
          kanal yang sesuai dengan kebutuhan promosi bisnis lo.
        </p>
      </div>
    </section>
  </main>
</template>
