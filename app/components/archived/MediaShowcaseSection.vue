<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const showcaseVideo = ref<HTMLVideoElement | null>(null)
const showcaseVisual = ref<HTMLElement | null>(null)
const tickerItems = [
  'BERITA DAERAH',
  'INFORMASI LOKAL',
  'JARINGAN MEDIA',
  'CERITA DARI DEKAT',
]
let animationContext: { revert: () => void } | undefined

onMounted(async () => {
  const video = showcaseVideo.value
  const visual = showcaseVisual.value
  if (!video || !visual) return

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches

  if (prefersReducedMotion) return

  const [{ gsap }, { ScrollTrigger }] = await Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger'),
  ])

  gsap.registerPlugin(ScrollTrigger)

  animationContext = gsap.context(() => {
    gsap.fromTo(
      visual,
      {
        clipPath: 'inset(14% 12% 14% 12% round 14px)',
        scale: 0.92,
        autoAlpha: 0.55,
      },
      {
        clipPath: 'inset(0% 0% 0% 0% round 0px)',
        scale: 1,
        autoAlpha: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: visual,
          start: 'top 90%',
          end: 'top 30%',
          scrub: 1.4,
          onEnter: () => void video.play().catch(() => undefined),
          onEnterBack: () => void video.play().catch(() => undefined),
        },
      },
    )
  }, visual)
})

onBeforeUnmount(() => {
  animationContext?.revert()
  showcaseVideo.value?.pause()
})
</script>

<template>
  <section
    class="relative overflow-hidden bg-[#0b0b0b] px-[6%] pt-[clamp(90px,12vw,160px)] text-white
      max-[700px]:px-[5%] max-[700px]:pt-[84px]"
    aria-label="Media showcase Hallopedia"
  >
    <div class="mx-auto w-full max-w-[1600px]">
      <div
        class="flex items-center gap-[10px] text-[10px] tracking-[2px] text-[#999]"
      >
        <span
          class="h-[7px] w-[7px] rounded-full bg-[#ed3541]"
          aria-hidden="true"
        ></span>
        02 / MEDIA SHOWCASE
      </div>

      <figure
        ref="showcaseVisual"
        class="relative m-0 ml-[calc(50%_-_50vw)] mt-[clamp(38px,6vw,78px)] w-screen
          aspect-[16/8.5] overflow-hidden bg-[#171717]
          max-[700px]:mt-[32px] max-[700px]:aspect-[16/9]"
      >
        <video
          ref="showcaseVideo"
          class="absolute inset-0 h-full w-full object-cover"
          src="/images/video1.mp4"
          poster="/images/news1.jpg"
          muted
          loop
          playsinline
          preload="auto"
          aria-hidden="true"
          tabindex="-1"
        ></video>
        <div
          class="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent"
          aria-hidden="true"
        ></div>
        <figcaption
          class="absolute bottom-[clamp(16px,3vw,32px)] left-[clamp(16px,3vw,36px)]
            right-[clamp(16px,3vw,36px)] flex items-end justify-between gap-4
            text-[9px] tracking-[1.5px] text-white/80 max-[700px]:text-[7px]
            max-[700px]:tracking-[1px]"
        >
          <span>H / DOKUMENTASI MEDIA LOKAL</span>
          <span class="text-right text-white max-[700px]:hidden">
            CERITA DARI DEKAT
          </span>
        </figcaption>
      </figure>

      <div
        class="mt-[15px] flex justify-between gap-[18px] text-[9px] tracking-[1.5px]
          text-[#888] max-[700px]:text-[7px] max-[700px]:tracking-[1px]"
      >
        <span>INFORMASI LOKAL. JANGKAUAN DIGITAL.</span>
        <span class="text-[#ed3541]" aria-hidden="true">02 — 09</span>
      </div>

      <div
        class="ml-[-6vw] mt-[clamp(52px,7vw,92px)] w-[calc(100%_+_12vw)]
          overflow-hidden border-t border-[#292929] pb-[28px] pt-[20px]
          max-[700px]:ml-[-5vw] max-[700px]:w-[calc(100%_+_10vw)]
          max-[700px]:pb-[22px] max-[700px]:pt-[16px]"
        aria-hidden="true"
      >
        <div
          class="flex w-max animate-[mediaTickerMove_46s_linear_infinite] motion-reduce:animate-none motion-reduce:translate-x-[-25%] max-[700px]:animate-[mediaTickerMove_62s_linear_infinite]"
        >
          <div
            v-for="sequence in 2"
            :key="sequence"
            class="flex shrink-0 items-center gap-[clamp(18px,3vw,42px)]
              whitespace-nowrap pr-[clamp(18px,3vw,42px)]
              text-[clamp(24px,4vw,56px)] font-extrabold
              tracking-[-0.06em] text-white/55"
          >
            <template v-for="item in tickerItems" :key="item">
              <span>{{ item }}</span>
              <i class="text-[0.34em] not-italic tracking-normal text-[#ed3541]">✳</i>
            </template>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
