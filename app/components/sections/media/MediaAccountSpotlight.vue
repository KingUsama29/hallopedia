<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  formatCompactCount,
  formatIdr,
  formatSyncedTimestamp,
  resolveAccountPlatformLabel,
  sanitizeExternalProfileUrl,
  sanitizeInstagramPermalink,
  sanitizeMediaThumbnailUrl,
  type MediaAccount,
  type MediaRecentPost,
} from '~/data/catalog'

const props = withDefaults(
  defineProps<{
    account: MediaAccount
    indexLabel: string
    variant?: 'spotlight' | 'inline'
  }>(),
  { variant: 'spotlight' },
)

const failedThumbnailIds = ref<Record<string, boolean>>({})

watch(
  () => props.account.id,
  () => {
    failedThumbnailIds.value = {}
  },
)

const isInline = computed(() => props.variant === 'inline')
const platformLabel = computed(() => resolveAccountPlatformLabel(props.account))
const spotlightSafeUrl = computed(() => sanitizeExternalProfileUrl(props.account.profileUrl))

const hasMetrics = computed(
  () =>
    props.account.metrics?.followersCount != null ||
    props.account.metrics?.mediaCount != null,
)

const formattedFollowers = computed(() =>
  props.account.metrics?.followersCount != null
    ? formatCompactCount(props.account.metrics.followersCount)
    : '—',
)

const formattedPostCount = computed(() =>
  props.account.metrics?.mediaCount != null
    ? props.account.metrics.mediaCount.toLocaleString('id-ID')
    : '—',
)

const syncedLabel = computed(() =>
  props.account.metrics?.syncedAt ? formatSyncedTimestamp(props.account.metrics.syncedAt) : null,
)

const visibleRecentPosts = computed(() =>
  (props.account.recentPosts ?? [])
    .slice(0, 3)
    .map((post) => ({
      ...post,
      safePermalink: sanitizeInstagramPermalink(post.permalink),
    }))
    .filter((post): post is MediaRecentPost & { safePermalink: string } => post.safePermalink !== null),
)

function resolveThumbnailUrl(post: MediaRecentPost): string | null {
  if (!post.thumbnailUrl || failedThumbnailIds.value[post.id]) return null
  return sanitizeMediaThumbnailUrl(post.thumbnailUrl)
}

function markThumbnailBroken(postId: string) {
  failedThumbnailIds.value = { ...failedThumbnailIds.value, [postId]: true }
}

function formatMediaTypeTag(mediaType: MediaRecentPost['mediaType']): string {
  if (mediaType === 'VIDEO') return 'REELS'
  if (mediaType === 'CAROUSEL_ALBUM') return 'CAROUSEL'
  return 'POST'
}
</script>

<template>
  <div :class="isInline ? 'pt-3' : 'relative border border-[#292929] bg-[#141414] p-7'">
    <template v-if="!isInline">
      <span class="pointer-events-none absolute top-0 left-0 h-3 w-3 border-t-2 border-l-2 border-[#ed3541]" aria-hidden="true"></span>
      <span class="pointer-events-none absolute right-0 bottom-0 h-3 w-3 border-r-2 border-b-2 border-[#ed3541]" aria-hidden="true"></span>

      <div class="flex items-center justify-between border-b border-[#292929] pb-4 text-[10px] tracking-[1.6px] text-[#a3a3a3] uppercase">
        <span>SOROTAN AKUN · {{ indexLabel }}</span>
        <span class="text-[#ed3541]">{{ platformLabel }}</span>
      </div>

      <div class="mt-6 flex items-center gap-4">
        <img
          v-if="account.logoPath"
          :src="account.logoPath"
          :alt="`Logo ${account.name}`"
          class="h-14 w-14 shrink-0 border border-[#292929] object-cover"
          loading="lazy"
          decoding="async"
        />
        <span
          v-else
          class="flex h-14 w-14 shrink-0 items-center justify-center border border-[#292929] bg-[#0b0b0b] text-[15px] font-black tracking-[1px] text-white"
          aria-hidden="true"
        >
          {{ account.monogram }}
        </span>
        <div class="min-w-0">
          <h3 class="truncate text-[24px] font-extrabold leading-tight tracking-[-0.03em] text-white">{{ account.name }}</h3>
          <div class="mt-1 truncate text-[13px] font-semibold text-[#ed3541]">{{ account.handle }}</div>
        </div>
      </div>

      <div class="mt-6 grid grid-cols-2 gap-4 border-y border-[#292929] py-4">
        <div>
          <div class="text-[9px] tracking-[1.4px] text-[#a3a3a3] uppercase">CAKUPAN</div>
          <div class="mt-1 text-[12px] font-semibold text-white">{{ account.regionLabel }}</div>
        </div>
        <div>
          <div class="text-[9px] tracking-[1.4px] text-[#a3a3a3] uppercase">TARIF 1 AKUN MULAI</div>
          <div class="mt-1 text-[12px] font-semibold text-white">{{ formatIdr(account.pricing.directSinglePriceIdr) }}</div>
        </div>
      </div>
    </template>

    <!-- Conditional Verified Metrics (Never Fabricated) -->
    <div v-if="hasMetrics" :class="isInline ? 'pb-3' : 'border-b border-[#292929] py-4'">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <div class="text-[9px] tracking-[1.4px] text-[#a3a3a3] uppercase">FOLLOWERS</div>
          <div class="mt-1 text-[20px] font-extrabold tracking-[-0.03em] text-white tabular-nums">{{ formattedFollowers }}</div>
        </div>
        <div>
          <div class="text-[9px] tracking-[1.4px] text-[#a3a3a3] uppercase">TOTAL POSTINGAN</div>
          <div class="mt-1 text-[20px] font-extrabold tracking-[-0.03em] text-white tabular-nums">{{ formattedPostCount }}</div>
        </div>
      </div>
      <div v-if="syncedLabel" class="mt-2.5 text-[10px] tracking-[0.6px] text-[#a3a3a3]">
        Tersinkronisasi: {{ syncedLabel }}
      </div>
    </div>
    <div
      v-else-if="!isInline"
      class="border-b border-[#292929] py-4"
    >
      <div class="mb-2.5 flex items-center justify-between text-[9px] tracking-[1.4px] text-[#a3a3a3] uppercase">
        <span>RINCIAN TARIF PER MODE TAYANG</span>
        <span class="text-[#ed3541]">TERVERIFIKASI</span>
      </div>
      <div class="grid grid-cols-2 gap-2.5 text-[11px]">
        <div class="border border-[#292929] bg-[#0b0b0b] px-3 py-2">
          <div class="text-[9px] tracking-[1px] text-[#a3a3a3] uppercase">1 AKUN SATUAN</div>
          <div class="mt-0.5 font-bold text-white tabular-nums">{{ formatIdr(account.pricing.directSinglePriceIdr) }}</div>
        </div>
        <div class="border border-[#292929] bg-[#0b0b0b] px-3 py-2">
          <div class="text-[9px] tracking-[1px] text-[#a3a3a3] uppercase">COLLAB ADD-ON</div>
          <div class="mt-0.5 font-bold text-white tabular-nums">+{{ formatIdr(account.pricing.collabAddOnPriceIdr) }}</div>
        </div>
        <div class="border border-[#292929] bg-[#0b0b0b] px-3 py-2">
          <div class="text-[9px] tracking-[1px] text-[#a3a3a3] uppercase">POST TERPISAH</div>
          <div class="mt-0.5 font-bold text-white tabular-nums">{{ formatIdr(account.pricing.separatePostPriceIdr) }}</div>
        </div>
        <div class="border border-[#292929] bg-[#0b0b0b] px-3 py-2">
          <div class="text-[9px] tracking-[1px] text-[#a3a3a3] uppercase">VISIT ADD-ON</div>
          <div class="mt-0.5 font-bold text-white tabular-nums">+{{ formatIdr(account.pricing.visitAddOnPriceIdr) }}</div>
        </div>
      </div>
    </div>

    <!-- Conditional Recent Posts Strip (Max 3 with Graceful CDN Fallback) -->
    <div v-if="visibleRecentPosts.length" :class="isInline ? 'pt-3 border-t border-[#292929]' : 'border-b border-[#292929] py-4'">
      <div class="mb-2.5 flex items-center justify-between text-[9px] tracking-[1.4px] text-[#a3a3a3] uppercase">
        <span>POSTINGAN TERBARU ({{ visibleRecentPosts.length }})</span>
        <span>KLIK KE {{ platformLabel }} ↗</span>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <a
          v-for="post in visibleRecentPosts"
          :key="post.id"
          :href="post.safePermalink"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="`Buka ${formatMediaTypeTag(post.mediaType)} ${platformLabel} ${account.handle} di tab baru`"
          class="group/post relative aspect-square overflow-hidden border border-[#292929] bg-[#0b0b0b] no-underline transition-colors duration-200 hover:border-[#ed3541] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541]"
        >
          <img
            v-if="resolveThumbnailUrl(post)"
            :src="resolveThumbnailUrl(post)!"
            :alt="post.captionExcerpt || `Postingan ${account.name}`"
            class="h-full w-full object-cover transition-transform duration-300 group-hover/post:scale-105 motion-reduce:transform-none"
            loading="lazy"
            decoding="async"
            @error="markThumbnailBroken(post.id)"
          />
          <div v-else class="flex h-full w-full flex-col justify-between p-2 text-left">
            <span class="text-[9px] font-bold tracking-[1.2px] text-[#ed3541] uppercase">{{ formatMediaTypeTag(post.mediaType) }}</span>
            <p class="m-0 line-clamp-3 text-[10px] leading-[1.35] text-[#ccc]">
              {{ post.captionExcerpt || 'Lihat unggahan terbaru di profil resmi.' }}
            </p>
          </div>
          <span
            v-if="resolveThumbnailUrl(post)"
            class="pointer-events-none absolute top-1.5 left-1.5 bg-[#0b0b0b]/85 px-1.5 py-0.5 text-[9px] font-bold tracking-[1px] text-white uppercase"
          >
            {{ formatMediaTypeTag(post.mediaType) }}
          </span>
        </a>
      </div>
    </div>

    <template v-if="!isInline">
      <a
        v-if="spotlightSafeUrl"
        :href="spotlightSafeUrl"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="`Kunjungi profil ${platformLabel} ${account.handle} di tab baru`"
        class="group mt-6 flex w-full items-center justify-between bg-[#ed3541] px-5 py-3.5 text-[11px] font-bold tracking-[1.4px] text-white uppercase no-underline transition-colors duration-200 hover:bg-[#ff4754] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <span>BUKA PROFIL {{ platformLabel }}</span>
        <span class="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true">↗</span>
      </a>

      <p class="mt-4 mb-0 text-[11px] leading-[1.55] text-[#a3a3a3]">
        Arahkan kursor ke daftar kanal di sebelah kanan untuk memindahkan sorotan atau klik langsung untuk membuka profil.
      </p>
    </template>
  </div>
</template>

