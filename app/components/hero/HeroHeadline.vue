<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import gsap from 'gsap'

const headline = ref<HTMLElement | null>(null)
let headlineContext: { revert: () => void } | undefined

onMounted(() => {
  if (!headline.value) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  headlineContext = gsap.context(() => {
    gsap.fromTo(
      '.headline-animate',
      { autoAlpha: 0, yPercent: 70, scale: 0.985 },
      {
        autoAlpha: 1,
        yPercent: 0,
        scale: 1,
        duration: 3.85,
        stagger: 0.14,
        delay: 0.12,
        ease: 'power3.out',
        clearProps: 'transform,opacity,visibility',
      },
    )
  }, headline.value)
})

onBeforeUnmount(() => headlineContext?.revert())
</script>

<template>
  <section
    ref="headline"
    class="relative z-[2] mt-[clamp(12px,2.5vh,25px)] w-full max-[700px]:mt-[50px]"
    aria-label="Cerita daerah, jangkauan lebih luas"
  >
    <h1
      class="headline-animate m-0 text-center text-[clamp(44px,16.5vh,112px)] font-black leading-[0.82] tracking-[-0.085em] max-[700px]:text-[clamp(43px,11vw,76px)] max-[700px]:tracking-[-0.07em]"
    >
      CERITA
    </h1>

    <div class="flex items-center justify-center gap-[30px] max-[700px]:gap-[10px]">
      <h1
        class="headline-animate m-0 text-[clamp(44px,16.5vh,112px)] font-black leading-[0.82] tracking-[-0.085em] text-[#ed3541] max-[700px]:text-[clamp(43px,11vw,76px)] max-[700px]:tracking-[-0.07em]"
      >
        DAERAH.
      </h1>

      <span
        class="text-[10px] font-normal leading-[1.6] tracking-[1.5px] text-[#aaa] max-[700px]:text-[7px] max-[700px]:tracking-normal"
      >
        INFORMASI DARI DEKAT,<br />
        MENJANGKAU LEBIH LUAS.
      </span>
    </div>

    <h1
      class="headline-animate m-0 text-center text-[clamp(44px,16.5vh,112px)] font-black leading-[0.82] tracking-[-0.085em] max-[700px]:text-[clamp(43px,11vw,76px)] max-[700px]:tracking-[-0.07em]"
    >
      JANGKAUAN
    </h1>

    <h1
      class="headline-animate m-0 text-center text-[clamp(44px,16.5vh,112px)] font-black leading-[0.82] tracking-[-0.085em] max-[700px]:text-[clamp(43px,11vw,76px)] max-[700px]:tracking-[-0.07em]"
    >
      <span class="text-[#ed3541]">LEBIH</span> LUAS.
    </h1>
  </section>
</template>
