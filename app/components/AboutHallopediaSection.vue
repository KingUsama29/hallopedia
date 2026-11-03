<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const aboutSection = ref<HTMLElement | null>(null)
const aboutPhoto = ref<HTMLImageElement | null>(null)
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
    const firstCaret = section.querySelector<HTMLElement>('[data-about-caret="first"]')
    const secondCaret = section.querySelector<HTMLElement>('[data-about-caret="second"]')
    const roles = gsap.utils.toArray<HTMLElement>('[data-about-role]', section)
    const intro = section.querySelector<HTMLElement>('[data-about-intro]')

    const reveal = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top 74%',
        toggleActions: 'play none none reverse',
      },
    })

    if (firstCaret && secondCaret) {
      reveal.set(firstCaret, { visibility: 'visible' })
      reveal.fromTo(
        firstLine,
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 0.01, stagger: 0.055, ease: 'none' },
      )
      reveal.set(firstCaret, { visibility: 'hidden' })
      reveal.set(secondCaret, { visibility: 'visible' })
      reveal.fromTo(
        secondLine,
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 0.01, stagger: 0.055, ease: 'none' },
      )
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
        04 / TENTANG HALLOPEDIA
      </div>

      <div class="mt-[clamp(34px,5vw,64px)] grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
        <h2
          id="about-hallopedia-title"
          aria-label="Media lokal. Ruang bagi brand."
          class="max-w-[1000px] text-[clamp(50px,7vw,112px)] font-extrabold leading-[0.88]
            tracking-[-0.075em] max-[700px]:text-[clamp(36px,9.4vw,66px)]"
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
              class="inline-block"
              >{{ character === ' ' ? '\u00a0' : character }}</span
            >
            <span
              :data-about-caret="line.key"
              class="invisible ml-[0.035em] inline-block h-[0.72em] w-[0.055em]
                translate-y-[0.06em] animate-pulse bg-[#ed3541] align-baseline"
              aria-hidden="true"
            ></span>
          </span>
        </h2>
        <p
          data-about-intro
          class="max-w-[430px] pb-2 text-[15px] leading-[1.7] text-[#555] lg:justify-self-end"
        >
          Hallopedia adalah perusahaan media lokal yang mengelola sejumlah akun media sosial
          berfokus pada berita dan informasi daerah, terutama di Kalimantan. Jaringan ini juga
          membuka ruang periklanan digital bagi bisnis dan brand.
        </p>
      </div>

      <div class="mt-[clamp(46px,7vw,96px)] grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch lg:gap-[7%]">
        <figure class="relative m-0 aspect-[16/9] overflow-hidden bg-[#1a1a1a]">
          <img
            ref="aboutPhoto"
            class="absolute inset-0 h-full w-full object-cover"
            src="/images/news1.jpg"
            alt="Jurnalis dan warga mendokumentasikan sebuah kegiatan di ruang publik"
            loading="lazy"
            decoding="async"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
          <figcaption
            class="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-[clamp(16px,3vw,32px)]
              text-[9px] tracking-[1.5px] text-white/80 max-[700px]:text-[8px]"
          >
            <span>HALLOPEDIA / MEDIA LOKAL</span>
            <span class="text-right">INFORMASI / PERIKLANAN</span>
          </figcaption>
        </figure>

        <div class="flex flex-col justify-center">
          <article data-about-role class="border-t border-black/20 py-6">
            <div class="flex items-start gap-5">
              <span class="pt-1 text-[10px] tracking-[1.5px] text-[#ed3541]">01</span>
              <div>
                <h3 class="text-[clamp(22px,2.6vw,34px)] font-semibold tracking-[-0.045em]">
                  Jaringan media
                </h3>
                <p class="mt-3 max-w-[440px] text-[14px] leading-[1.65] text-[#666]">
                  Menghadirkan berita dan informasi yang dekat dengan kehidupan daerah.
                </p>
              </div>
            </div>
          </article>

          <article data-about-role class="border-t border-black/20 py-6">
            <div class="flex items-start gap-5">
              <span class="pt-1 text-[10px] tracking-[1.5px] text-[#ed3541]">02</span>
              <div>
                <h3 class="text-[clamp(22px,2.6vw,34px)] font-semibold tracking-[-0.045em]">
                  Periklanan digital
                </h3>
                <p class="mt-3 max-w-[440px] text-[14px] leading-[1.65] text-[#666]">
                  Membantu bisnis menyampaikan promosi melalui jaringan media Hallopedia.
                </p>
              </div>
            </div>
          </article>
          <div class="border-t border-black/20"></div>
        </div>
      </div>
    </div>
  </section>
</template>
