<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  FAQ_CATEGORY_TABS,
  TRANSACTION_FAQ_ITEMS,
  type FaqCategory,
} from '~/data/homepage-faq'

const faqSection = ref<HTMLElement | null>(null)
const activeCategory = ref<FaqCategory>('ALL')
const openFaqId = ref<string | null>(TRANSACTION_FAQ_ITEMS[0]?.id ?? null)

let animationContext: { revert: () => void } | undefined

const filteredFaqs = computed(() =>
  activeCategory.value === 'ALL'
    ? TRANSACTION_FAQ_ITEMS
    : TRANSACTION_FAQ_ITEMS.filter((item) => item.category === activeCategory.value),
)

watch(filteredFaqs, (list) => {
  if (!list.length) {
    openFaqId.value = null
    return
  }
  if (!list.some((item) => item.id === openFaqId.value)) {
    openFaqId.value = list[0]!.id
  }
})

watch([activeCategory, openFaqId], async () => {
  if (!import.meta.client) return
  await nextTick()
  ScrollTrigger.refresh()
})

function toggleFaq(id: string) {
  openFaqId.value = openFaqId.value === id ? null : id
}

function formatIndex(index: number): string {
  return String(index + 1).padStart(2, '0')
}

onMounted(() => {
  const section = faqSection.value
  if (!section || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  gsap.registerPlugin(ScrollTrigger)

  animationContext = gsap.context(() => {
    const rules = gsap.utils.toArray<HTMLElement>('[data-faq-rule]', section)
    const items = gsap.utils.toArray<HTMLElement>('[data-faq-reveal]', section)

    const tl = gsap.timeline({
      scrollTrigger: { trigger: section, start: 'top 82%', once: true },
    })

    if (rules.length) {
      tl.from(rules, {
        scaleX: 0,
        transformOrigin: 'left center',
        duration: 0.7,
        ease: 'power4.out',
        stagger: 0.08,
        force3D: true,
        clearProps: 'transform',
      })
    }

    if (items.length) {
      tl.from(
        items,
        {
          y: 22,
          autoAlpha: 0,
          duration: 0.7,
          ease: 'power3.out',
          stagger: 0.08,
          force3D: true,
          clearProps: 'transform,opacity,visibility',
        },
        rules.length ? '-=0.45' : 0,
      )
    }
  }, section)
})

onBeforeUnmount(() => {
  animationContext?.revert()
})
</script>

<template>
  <section
    id="faq"
    ref="faqSection"
    class="relative w-full border-t border-black/10 bg-[#f6f5f2] py-[96px] text-[#0b0b0b] max-[700px]:py-[72px]"
    aria-labelledby="faq-heading"
  >
    <div class="mx-auto max-w-[1600px] px-[6%] max-[700px]:px-[5%]">
      <div class="grid grid-cols-1 gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-start lg:gap-12">
        <!-- Kolom Kiri Sticky -->
        <div data-faq-reveal class="min-w-0 lg:sticky lg:top-24">
          <div class="mb-[18px] flex items-center gap-[10px] text-[10px] tracking-[2px] text-[#525252] uppercase">
            <span class="h-[7px] w-[7px] rounded-full bg-[#ed3541]" aria-hidden="true"></span>
            FAQ TRANSAKSI
          </div>
          <div class="mb-4 h-[2px] w-10 bg-[#ed3541]" aria-hidden="true"></div>
          <h2
            id="faq-heading"
            class="text-[clamp(30px,3.8vw,54px)] font-extrabold leading-[1.04] tracking-[-0.04em] text-[#0b0b0b]"
          >
            Ketentuan &amp; Tanya Jawab <span class="text-[#ed3541]">Transaksi</span>
          </h2>
          <p class="mt-4 mb-6 max-w-[400px] text-[14px] leading-[1.65] text-[#525252]">
            Ketentuan pembayaran Penuh, DP 50%, Invoice, format materi, revisi, dan alur penjadwalan iklan di jaringan media PT Hallopedia.
          </p>

          <div class="flex flex-wrap gap-2" role="group" aria-label="Filter kategori FAQ transaksi">
            <button
              v-for="tab in FAQ_CATEGORY_TABS"
              :key="tab.value"
              type="button"
              :aria-pressed="activeCategory === tab.value"
              class="min-h-[44px] cursor-pointer border px-3.5 py-2 text-[10px] font-bold tracking-[1.4px] uppercase transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541]"
              :class="activeCategory === tab.value ? 'border-[#0b0b0b] bg-[#0b0b0b] text-white' : 'border-black/20 bg-white text-[#0b0b0b] hover:border-[#ed3541]'"
              @click="activeCategory = tab.value"
            >
              {{ tab.label }}
            </button>
          </div>
        </div>

        <!-- Kolom Kanan Akordeon -->
        <div data-faq-reveal class="min-w-0">
          <div data-faq-rule class="h-[1px] w-full bg-black/15"></div>

          <article
            v-for="(item, index) in filteredFaqs"
            :key="item.id"
            class="border-b border-black/15"
          >
            <h3 class="m-0">
              <button
                :id="`faq-btn-${item.id}`"
                type="button"
                :aria-expanded="openFaqId === item.id"
                :aria-controls="`faq-panel-${item.id}`"
                class="group flex min-h-[64px] w-full cursor-pointer items-center justify-between gap-4 py-5 text-left transition-colors hover:text-[#ed3541] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ed3541]"
                @click="toggleFaq(item.id)"
              >
                <div class="flex min-w-0 items-baseline gap-4">
                  <span
                    class="shrink-0 text-[11px] font-bold tracking-[1.2px] tabular-nums transition-colors"
                    :class="openFaqId === item.id ? 'text-[#ed3541]' : 'text-[#525252] group-hover:text-[#ed3541]'"
                  >
                    {{ formatIndex(index) }}
                  </span>
                  <div class="min-w-0">
                    <span class="block text-[10px] font-bold tracking-[1.4px] text-[#525252] uppercase">
                      {{ item.categoryLabel }}
                    </span>
                    <span class="mt-1 block text-[17px] font-bold leading-[1.35] tracking-[-0.02em] text-[#0b0b0b] transition-colors group-hover:text-[#ed3541]">
                      {{ item.question }}
                    </span>
                  </div>
                </div>

                <span
                  class="inline-flex h-8 w-8 shrink-0 items-center justify-center border border-black/20 text-[14px] font-bold transition-colors"
                  :class="openFaqId === item.id ? 'border-[#0b0b0b] bg-[#0b0b0b] text-white' : 'bg-white text-[#0b0b0b] group-hover:border-[#ed3541] group-hover:text-[#ed3541]'"
                  aria-hidden="true"
                >
                  {{ openFaqId === item.id ? '−' : '+' }}
                </span>
              </button>
            </h3>

            <div
              v-show="openFaqId === item.id"
              :id="`faq-panel-${item.id}`"
              role="region"
              :aria-labelledby="`faq-btn-${item.id}`"
              class="pb-6 pl-8 text-[14px] leading-[1.7] text-[#333333] sm:pl-9"
            >
              {{ item.answer }}
            </div>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>
