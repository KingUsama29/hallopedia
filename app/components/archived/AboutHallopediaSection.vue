<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const aboutSection = ref<HTMLElement | null>(null)
const aboutPhoto = ref<HTMLElement | null>(null)
const aboutMedia = [
  {
    id: 'media-network',
    image: '/images/news1.jpg',
    alt: 'Jurnalis dan warga mendokumentasikan sebuah kegiatan di ruang publik',
    caption: 'LIPUTAN BERITA / MEDIA LOKAL',
  },
  {
    id: 'digital-advertising',
    image: '/images/iklan.jpg',
    alt: 'Tim produksi menyiapkan set untuk pembuatan materi iklan',
    caption: 'PRODUKSI MATERI IKLAN',
  },
]
const activeAboutMediaIndex = ref(0)
const activeAboutMedia = computed(() => aboutMedia[activeAboutMediaIndex.value]!)
const titleLines = [
  { key: 'first', text: 'Media lokal.' },
  { key: 'second', text: 'Ruang bagi brand.' },
].map((line) => ({ ...line, characters: Array.from(line.text) }))
let animationContext: { revert: () => void } | undefined

onMounted(async () => {
  const section = aboutSection.value
  const photo = aboutPhoto.value
  if (!section || !photo) return

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
    const firstLine = gsap.utils.toArray<HTMLElement>(
      '[data-about-title-line="first"]',
      section,
    )
    const secondLine = gsap.utils.toArray<HTMLElement>(
      '[data-about-title-line="second"]',
      section,
    )
    const firstCarets = gsap.utils.toArray<HTMLElement>(
      '[data-about-caret-step="first"]',
      section,
    )
    const secondCarets = gsap.utils.toArray<HTMLElement>(
      '[data-about-caret-step="second"]',
      section,
    )
    const roles = gsap.utils.toArray<HTMLElement>('[data-about-role]', section)
    const intro = section.querySelector<HTMLElement>('[data-about-intro]')

    const reveal = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top 74%',
        toggleActions: 'play none none none',
        once: true,
      },
    })

    if (firstCarets.length && secondCarets.length) {
      const typeLine = (
        characters: HTMLElement[],
        carets: HTMLElement[],
        firstPosition: string | number = 0,
      ) => {
        characters.forEach((character, index) => {
          const position = index === 0 ? firstPosition : '+=0.045'
          const currentCaret = carets[index]
          if (currentCaret) {
            reveal.set(currentCaret, { visibility: 'visible' }, position)
          }
          reveal.fromTo(
            character,
            { autoAlpha: 0 },
            { autoAlpha: 1, duration: 0.01, ease: 'none' },
            '<',
          )

          const prevCaret = carets[index - 1]
          if (index > 0 && prevCaret) {
            reveal.set(prevCaret, { visibility: 'hidden' }, '<')
          }
        })
      }

      typeLine(firstLine, firstCarets)
      const lastFirstCaret = firstCarets[firstCarets.length - 1]
      if (lastFirstCaret) {
        reveal.set(lastFirstCaret, { visibility: 'hidden' })
      }
      typeLine(secondLine, secondCarets, '+=0.12')
    }

    if (intro) {
      reveal.from(
        intro,
        { y: 18, autoAlpha: 0, duration: 0.55, ease: 'power2.out' },
        '-=0.4',
      )
    }

    reveal.from(
      roles,
      { y: 18, autoAlpha: 0, duration: 0.5, stagger: 0.12, ease: 'power2.out' },
      '-=0.28',
    )

    gsap.fromTo(
      photo,
      { scale: 1.1, yPercent: 4 },
      {
        scale: 1,
        yPercent: -2,
        ease: 'none',
        scrollTrigger: {
          trigger: photo,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1.1,
        },
      },
    )

  }, section)
})

onBeforeUnmount(() => {
  animationContext?.revert()
})
</script>

<template>
  <section
    ref="aboutSection"
    id="tentang"
    class="bg-white px-[6%] py-[clamp(88px,12vw,160px)] text-[#0b0b0b]
      max-[700px]:px-[5%] max-[700px]:py-[84px]"
    aria-labelledby="about-hallopedia-title"
  >
    <div class="mx-auto w-full max-w-[1600px]">
      <div class="flex items-center gap-[10px] text-[10px] tracking-[2px] text-[#707070]">
        <span class="h-[7px] w-[7px] rounded-full bg-[#ed3541]" aria-hidden="true"></span>
        03 / TENTANG HALLOPEDIA
      </div>

      <div class="mt-[clamp(34px,5vw,64px)]">
        <h2
          id="about-hallopedia-title"
          aria-label="Media lokal. Ruang bagi brand."
          class="w-full max-w-[1000px] text-[clamp(42px,5.5vw,88px)] font-extrabold leading-[0.88]
            tracking-[-0.085em] lg:max-w-[54%] max-[700px]:text-[clamp(28px,8.5vw,50px)]"
        >
          <span
            v-for="line in titleLines"
            :key="line.key"
            class="block whitespace-nowrap"
            :class="line.key === 'second' ? 'text-[#ed3541]' : ''"
          >
            <span
              v-for="(character, index) in line.characters"
              :key="`${line.key}-${index}`"
              :data-about-title-line="line.key"
              class="relative inline-block"
            >
              {{ character === ' ' ? '\u00a0' : character }}
              <span
                :data-about-caret-step="line.key"
                class="invisible about-type-caret absolute left-full top-1/2 ml-[0.035em]
                  h-[0.72em] w-[0.055em] -translate-y-1/2 bg-[#ed3541]"
                aria-hidden="true"
              ></span>
            </span>
          </span>
        </h2>
        <p
          data-about-intro
          class="mt-[clamp(24px,3.5vw,42px)] max-w-[820px] text-[15px] leading-[1.7] text-[#555]"
        >
          Hallopedia adalah perusahaan media lokal yang mengelola sejumlah akun media sosial
          berfokus pada berita dan informasi daerah, terutama di Kalimantan. Jaringan ini juga
          membuka ruang periklanan digital bagi bisnis dan brand.
        </p>
      </div>

      <div
        class="mt-[clamp(46px,7vw,96px)] grid gap-8
          lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch lg:gap-[7%]"
      >
        <figure class="relative m-0 aspect-[16/9] overflow-hidden bg-[#1a1a1a]">
          <div ref="aboutPhoto" class="absolute inset-0">
            <Transition
              mode="out-in"
              enter-active-class="transition-opacity duration-300 ease-out"
              enter-from-class="opacity-0"
              enter-to-class="opacity-100"
              leave-active-class="transition-opacity duration-200 ease-in"
              leave-from-class="opacity-100"
              leave-to-class="opacity-0"
            >
              <img
                :key="activeAboutMedia.id"
                class="absolute inset-0 h-full w-full object-cover"
                :src="activeAboutMedia.image"
                :alt="activeAboutMedia.alt"
                loading="lazy"
                decoding="async"
              />
            </Transition>
          </div>
          <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
          <figcaption
            class="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-[clamp(16px,3vw,32px)]
              text-[9px] tracking-[1.5px] text-white/80 max-[700px]:text-[8px]"
          >
            <span>HALLOPEDIA / MEDIA LOKAL</span>
            <span class="text-right">{{ activeAboutMedia.caption }}</span>
          </figcaption>
        </figure>

        <div class="flex flex-col justify-center">
          <button
            data-about-role
            type="button"
            class="group w-full border-t border-black/20 py-6 text-left transition-colors
              duration-300 hover:text-[#ed3541] focus-visible:outline focus-visible:outline-2
              focus-visible:outline-offset-2 focus-visible:outline-[#ed3541]"
            :aria-pressed="activeAboutMediaIndex === 0"
            @click="activeAboutMediaIndex = 0"
          >
            <div class="flex items-start gap-5">
              <span
                class="pt-1 text-[10px] tracking-[1.5px]"
                :class="activeAboutMediaIndex === 0 ? 'text-[#ed3541]' : 'text-[#777]'"
              >
                01
              </span>
              <span class="flex-1">
                <span class="block text-[clamp(22px,2.6vw,34px)] font-semibold tracking-[-0.045em]">
                  Jaringan media
                </span>
                <span class="mt-3 block max-w-[440px] text-[14px] leading-[1.65] text-[#666]">
                  Menghadirkan berita dan informasi yang dekat dengan kehidupan daerah.
                </span>
              </span>
              <span class="pt-1 text-lg font-light text-[#ed3541]" aria-hidden="true">+</span>
            </div>
          </button>

          <button
            data-about-role
            type="button"
            class="group w-full border-t border-black/20 py-6 text-left transition-colors
              duration-300 hover:text-[#ed3541] focus-visible:outline focus-visible:outline-2
              focus-visible:outline-offset-2 focus-visible:outline-[#ed3541]"
            :aria-pressed="activeAboutMediaIndex === 1"
            @click="activeAboutMediaIndex = 1"
          >
            <div class="flex items-start gap-5">
              <span
                class="pt-1 text-[10px] tracking-[1.5px]"
                :class="activeAboutMediaIndex === 1 ? 'text-[#ed3541]' : 'text-[#777]'"
              >
                02
              </span>
              <span class="flex-1">
                <span class="block text-[clamp(22px,2.6vw,34px)] font-semibold tracking-[-0.045em]">
                  Periklanan digital
                </span>
                <span class="mt-3 block max-w-[440px] text-[14px] leading-[1.65] text-[#666]">
                  Membantu bisnis menyampaikan promosi melalui jaringan media Hallopedia.
                </span>
              </span>
              <span class="pt-1 text-lg font-light text-[#ed3541]" aria-hidden="true">+</span>
            </div>
          </button>
          <div class="border-t border-black/20"></div>
        </div>
      </div>
    </div>
  </section>
</template>
